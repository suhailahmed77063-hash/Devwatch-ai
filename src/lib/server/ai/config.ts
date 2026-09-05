import { ConfigError } from "@/lib/errors";
import type { Project } from "@prisma/client";
import { OpenAICompatibleProvider, OpenAIImageProvider } from "@/providers/ai/openai-compatible";
import type { ImageProvider, LLMProvider } from "@/providers/ai/types";
import { optEnv } from "../env";
import { selectModel, getOptimalMaxTokens, recordModelUsage, classifyTask, logRouting, type TaskType } from "./router";

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
  const provider = process.env.AI_PROVIDER ?? "openrouter";
  const apiKey = optEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new ConfigError(
      "AI provider is not configured: set OPENAI_API_KEY in .env.local",
      "AI is not configured. Add OPENAI_API_KEY to your Vercel environment variables."
    );
  }
  const baseUrl = optEnv("OPENAI_BASE_URL") ?? "https://openrouter.ai/api/v1";
  const raw = (project?.aiConfig as { model?: string; chatModel?: string; baseUrl?: string } | null) ?? null;

  return {
    provider,
    apiKey,
    baseUrl: raw?.baseUrl ?? baseUrl,
    chatModel: raw?.chatModel ?? process.env.AI_CHAT_MODEL ?? "openrouter/free",
    generationModel: raw?.model ?? process.env.AI_GENERATION_MODEL ?? "openrouter/free",
    agentModel: process.env.AI_AGENT_MODEL ?? process.env.AI_CHAT_MODEL ?? "openrouter/free",
    imageModel: process.env.AI_IMAGE_MODEL ?? "gpt-image-1",
  };
}

let cached: LLMProvider | null = null;

/** Get the configured LLM provider */
export function getLLM(project?: Pick<Project, "aiConfig"> | null): LLMProvider {
  const s = resolveAiSettings(project);
  if (s.provider !== "openai" && s.provider !== "openai-compatible" && s.provider !== "openrouter") {
    throw new ConfigError(`AI provider "${s.provider}" is not implemented yet.`);
  }
  if (!project?.aiConfig && cached) return cached;
  const llm = new OpenAICompatibleProvider({
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    chatModel: s.chatModel,
  });
  if (!project?.aiConfig) cached = llm;
  return llm;
}

/** LLM provider for the app-builder coding agent */
export function getAgentLLM(project?: Pick<Project, "aiConfig"> | null): LLMProvider {
  const s = resolveAiSettings(project);
  return new OpenAICompatibleProvider({
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    chatModel: s.agentModel,
    fallbackModel: s.chatModel,
  });
}

/** Get LLM for a specific task type (with automatic model selection) */
export function getLLMForTask(taskType: TaskType, project?: Pick<Project, "aiConfig"> | null): {
  provider: LLMProvider;
  maxTokens: number;
  modelId: string;
} {
  const s = resolveAiSettings(project);
  const { model, reason } = selectModel(taskType);
  const maxTokens = getOptimalMaxTokens(taskType);
  
  logRouting(taskType, model.id, reason);
  
  const provider = new OpenAICompatibleProvider({
    apiKey: s.apiKey,
    baseUrl: s.baseUrl,
    chatModel: model.id,
    fallbackModel: s.chatModel,
  });
  
  return { provider, maxTokens, modelId: model.id };
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
