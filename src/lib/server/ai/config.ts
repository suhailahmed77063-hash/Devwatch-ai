import { ConfigError } from "@/lib/errors";
import type { Project } from "@prisma/client";
import { OpenAICompatibleProvider, OpenAIImageProvider } from "@/providers/ai/openai-compatible";
import type { ImageProvider, LLMProvider } from "@/providers/ai/types";
import { optEnv } from "../env";

export interface AiSettings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  generationModel: string;
  agentModel: string;
  imageModel: string;
}

export function resolveAiSettings(project?: Pick<Project, "aiConfig"> | null): AiSettings {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const apiKey = optEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new ConfigError(
      "AI provider is not configured: set OPENAI_API_KEY in .env.local (any OpenAI-compatible endpoint works via OPENAI_BASE_URL).",
      "AI is not configured. Please add OPENAI_API_KEY to your Vercel environment variables. You can use OpenAI, Anthropic (via OpenRouter), or any OpenAI-compatible API."
    );
  }
  const baseUrl = optEnv("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";

  // Per-project AI overrides (Enterprise): model names come from the project,
  // credentials still come from the server environment — never the client.
  const raw = (project?.aiConfig as { model?: string; chatModel?: string; baseUrl?: string } | null) ?? null;

  return {
    provider,
    apiKey,
    baseUrl: raw?.baseUrl ?? baseUrl,
    chatModel: raw?.chatModel ?? process.env.AI_CHAT_MODEL ?? "gpt-4o-mini",
    generationModel: raw?.model ?? process.env.AI_GENERATION_MODEL ?? "gpt-4o",
    // Coding agent benefits from a coder-tuned model; falls back to chatModel.
    agentModel: process.env.AI_AGENT_MODEL ?? process.env.AI_CHAT_MODEL ?? "gpt-4o-mini",
    imageModel: process.env.AI_IMAGE_MODEL ?? "gpt-image-1",
  };
}

let cached: LLMProvider | null = null;

/** Get the configured LLM provider (throws ConfigError when not configured). */
export function getLLM(project?: Pick<Project, "aiConfig"> | null): LLMProvider {
  const s = resolveAiSettings(project);
  if (s.provider !== "openai" && s.provider !== "openai-compatible") {
    throw new ConfigError(`AI provider "${s.provider}" is not implemented yet. Use provider=openai with OPENAI_BASE_URL for compatible endpoints.`);
  }
  // Cache only when using the global config (no per-project overrides).
  if (!project?.aiConfig && cached) return cached;
  const llm = new OpenAICompatibleProvider({
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    chatModel: s.chatModel,
  });
  if (!project?.aiConfig) cached = llm;
  return llm;
}

/** LLM provider for the app-builder coding agent (dedicated model override,
 * with rate-limit failover to the chat model). */
export function getAgentLLM(project?: Pick<Project, "aiConfig"> | null): LLMProvider {
  const s = resolveAiSettings(project);
  return new OpenAICompatibleProvider({
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    chatModel: s.agentModel,
    fallbackModel: s.chatModel,
  });
}

export function getImageProvider(project?: Pick<Project, "aiConfig"> | null): ImageProvider | null {
  const key = optEnv("OPENAI_API_KEY");
  if (!key) return null;
  const s = resolveAiSettings(project);
  return new OpenAIImageProvider({ apiKey: key, baseUrl: s.baseUrl, chatModel: s.chatModel, imageModel: s.imageModel });
}

export function aiConfigured(): boolean {
  return Boolean(optEnv("OPENAI_API_KEY"));
}
