import { AiProviderError, ConfigError } from "@/lib/errors";
import { logger } from "@/lib/server/logger";
import type { ChatTurn, ImageProvider, ImageRequest, ImageResult, LLMProvider, LLMRequest, LLMResult } from "./types";

export interface OpenAICompatConfig {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  imageModel?: string;
  /** optional headers, e.g. x-api-key for Anthropic-compatible gateways */
  extraHeaders?: Record<string, string>;
}

function messagesOf(req: LLMRequest): ChatTurn[] {
  const msgs: ChatTurn[] = [];
  if (req.system) msgs.push({ role: "system", content: req.system });
  if (req.messages) msgs.push(...req.messages);
  if (req.user) msgs.push({ role: "user", content: req.user });
  return msgs;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly id = "openai-compatible";
  constructor(private cfg: OpenAICompatConfig) {}

  private endpoint() {
    return `${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  private async raw(req: LLMRequest, stream: boolean): Promise<Response> {
    let res: Response;
    try {
      res = await fetch(this.endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.cfg.apiKey}`,
          ...(this.cfg.extraHeaders ?? {}),
        },
        body: JSON.stringify({
          model: req.model ?? this.cfg.chatModel,
          messages: messagesOf(req),
          temperature: req.temperature ?? 0.4,
          max_tokens: req.maxTokens ?? 4096,
          stream,
          ...(req.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      throw new AiProviderError("Network error while calling AI provider", "The AI service could not be reached. Please try again.", undefined, e);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("ai.provider.http_error", { status: res.status, body: body.slice(0, 500) });
      if (res.status === 401 || res.status === 403) {
        throw new ConfigError(
          "AI provider authentication failed. Check the AI provider API key.",
          "The AI provider key is invalid. Add a valid key to your .env.local (OPENAI_API_KEY)."
        );
      }
      throw new AiProviderError(
        `AI provider returned ${res.status}`,
        "The AI service returned an error. Please try again in a moment."
      );
    }
    return res;
  }

  async complete(req: LLMRequest): Promise<LLMResult> {
    const res = await this.raw(req, false);
    const data = (await res.json()) as {
      choices: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      text,
      usage: {
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
        model: data.model ?? req.model ?? this.cfg.chatModel,
      },
    };
  }

  async *stream(req: LLMRequest): AsyncGenerator<
    { type: "delta"; text: string } | { type: "error"; message: string },
    LLMResult,
    unknown
  > {
    const res = await this.raw(req, true);
    const reader = res.body?.getReader();
    if (!reader) throw new AiProviderError("Provider returned no stream");
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let tokensIn = 0;
    let tokensOut = 0;
    let model = req.model ?? this.cfg.chatModel;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
              usage?: { prompt_tokens?: number; completion_tokens?: number };
              model?: string;
            };
            if (json.model) model = json.model;
            if (json.usage) {
              tokensIn = json.usage.prompt_tokens ?? tokensIn;
              tokensOut = json.usage.completion_tokens ?? tokensOut;
            }
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              full += delta;
              yield { type: "delta", text: delta };
            }
          } catch {
            // partial JSON line — ignore
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return { text: full, usage: { tokensIn, tokensOut, model } };
  }
}

/** OpenAI Images-compatible image provider. */
export class OpenAIImageProvider implements ImageProvider {
  readonly id = "openai-image";
  constructor(private cfg: OpenAICompatConfig) {}

  private endpoint() {
    return `${this.cfg.baseUrl.replace(/\/$/, "")}/images/generations`;
  }

  async generate(req: ImageRequest): Promise<ImageResult[]> {
    const model = req.model ?? this.cfg.imageModel ?? "gpt-image-1";
    const res = await fetch(this.endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.cfg.apiKey}`,
        ...(this.cfg.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        prompt: req.prompt,
        n: req.n ?? 1,
        size: req.size ?? "1024x1024",
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("ai.image.http_error", { status: res.status, body: body.slice(0, 300) });
      throw new AiProviderError("Image provider request failed", "The AI image service returned an error. Please try again.");
    }
    const data = (await res.json()) as { data?: { url?: string; b64_json?: string }[] };
    const out: ImageResult[] = [];
    for (const item of data.data ?? []) {
      if (item.url) out.push({ url: item.url, provider: this.id });
    }
    return out;
  }
}
