/**
 * AI Security Agent — controlled LLM access.
 *
 * Uses the same OpenAI-compatible provider the rest of DevWatch configures
 * (AI_API_KEY / AI_BASE_URL / AI_MODEL). The model never executes anything:
 * it only returns JSON that we validate before use. When no key is
 * configured, callers fall back to deterministic analysis.
 */

const API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
const BASE_URL =
  process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || "https://api.openai.com/v1";
const MODEL =
  process.env.AI_AGENT_MODEL || process.env.AI_CHAT_MODEL || process.env.AI_MODEL || "gpt-4o";

export function aiConfigured(): boolean {
  return Boolean(API_KEY);
}

/** Chat-completion that must return a JSON object; throws on failure. */
export async function chatJson<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  if (!API_KEY) throw new Error("AI provider not configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 1600,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI provider error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty response");
    return JSON.parse(content) as T;
  } finally {
    clearTimeout(timer);
  }
}
