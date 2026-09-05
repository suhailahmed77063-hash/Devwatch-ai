/**
 * Model Router
 * 
 * Automatically routes AI requests to the right model:
 * - Simple tasks (autocomplete, naming, short edits) → fast/cheap model
 * - Complex tasks (architecture, debugging, security) → strong reasoning model
 * 
 * Tracks usage per model for cost optimization.
 */

import { logger } from "../logger";

// ── Model Definitions ──────────────────────────────────────────────────────

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: "fast" | "balanced" | "strong";
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
  supportsJsonMode: boolean;
}

// Free models available via OpenRouter
export const MODELS: Record<string, ModelConfig> = {
  // Fast tier - free, quick responses
  "openrouter/free": {
    id: "openrouter/free",
    name: "OpenRouter Free Router",
    provider: "openrouter",
    tier: "fast",
    maxTokens: 4096,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsJsonMode: false,
  },
  "deepseek/deepseek-chat-v3-0324:free": {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek V3",
    provider: "openrouter",
    tier: "fast",
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsJsonMode: true,
  },
  // Balanced tier
  "google/gemini-2.5-flash-preview-05-20:free": {
    id: "google/gemini-2.5-flash-preview-05-20:free",
    name: "Gemini 2.5 Flash",
    provider: "openrouter",
    tier: "balanced",
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsJsonMode: true,
  },
  // Strong tier
  "deepseek/deepseek-r1-0528:free": {
    id: "deepseek/deepseek-r1-0528:free",
    name: "DeepSeek R1",
    provider: "openrouter",
    tier: "strong",
    maxTokens: 8192,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    supportsJsonMode: false,
  },
};

// ── Task Classification ────────────────────────────────────────────────────

export type TaskType =
  | "blueprint"      // Planning architecture
  | "codegen"        // Generating source files
  | "fix"            // Fixing errors
  | "edit"           // Making changes
  | "explain"        // Explaining code
  | "test"           // Writing tests
  | "deploy"         // Deployment config
  | "security"       // Security analysis
  | "review";        // Code review

const TASK_MODEL_MAP: Record<TaskType, "fast" | "balanced" | "strong"> = {
  blueprint: "strong",      // Architecture needs reasoning
  codegen: "balanced",      // Code generation needs good quality
  fix: "balanced",          // Bug fixing needs understanding
  edit: "fast",             // Simple edits are straightforward
  explain: "fast",          // Explanations are simple
  test: "balanced",         // Tests need accuracy
  deploy: "balanced",       // Deployment needs correctness
  security: "strong",       // Security needs careful analysis
  review: "strong",         // Code review needs deep understanding
};

// ── Router ─────────────────────────────────────────────────────────────────

const usageStats = new Map<string, { calls: number; tokensIn: number; tokensOut: number }>();

/**
 * Select the best model for a task type
 */
export function selectModel(taskType: TaskType, availableModels?: string[]): {
  model: ModelConfig;
  reason: string;
} {
  const preferredTier = TASK_MODEL_MAP[taskType];
  
  // Get available models in preferred tier
  let candidates = Object.values(MODELS).filter((m) => m.tier === preferredTier);
  
  // Filter by available models if provided
  if (availableModels && availableModels.length > 0) {
    const available = new Set(availableModels);
    candidates = candidates.filter((m) => available.has(m.id));
  }
  
  // If no candidates in preferred tier, fall back to any tier
  if (candidates.length === 0) {
    candidates = Object.values(MODELS);
  }
  
  // Pick the model with least usage (load balancing)
  const sorted = candidates.sort((a, b) => {
    const usageA = usageStats.get(a.id)?.calls ?? 0;
    const usageB = usageStats.get(b.id)?.calls ?? 0;
    return usageA - usageB;
  });
  
  const selected = sorted[0] ?? MODELS["openrouter/free"];
  
  return {
    model: selected,
    reason: `Task "${taskType}" → tier "${preferredTier}" → model "${selected.name}"`,
  };
}

/**
 * Get optimal max_tokens for a task type
 */
export function getOptimalMaxTokens(taskType: TaskType): number {
  const limits: Record<TaskType, number> = {
    blueprint: 4096,
    codegen: 16000,
    fix: 8192,
    edit: 4096,
    explain: 2048,
    test: 4096,
    deploy: 2048,
    security: 4096,
    review: 4096,
  };
  return limits[taskType] || 4096;
}

/**
 * Record model usage for tracking
 */
export function recordModelUsage(modelId: string, tokensIn: number, tokensOut: number): void {
  const stats = usageStats.get(modelId) ?? { calls: 0, tokensIn: 0, tokensOut: 0 };
  stats.calls++;
  stats.tokensIn += tokensIn;
  stats.tokensOut += tokensOut;
  usageStats.set(modelId, stats);
}

/**
 * Get usage statistics
 */
export function getUsageStats(): Record<string, { calls: number; tokensIn: number; tokensOut: number; cost: number }> {
  const result: Record<string, { calls: number; tokensIn: number; tokensOut: number; cost: number }> = {};
  
  for (const [modelId, stats] of usageStats) {
    const model = MODELS[modelId];
    const cost = model
      ? (stats.tokensIn * model.costPer1kInput + stats.tokensOut * model.costPer1kOutput) / 1000
      : 0;
    result[modelId] = { ...stats, cost };
  }
  
  return result;
}

/**
 * Classify a prompt into a task type
 */
export function classifyTask(prompt: string): TaskType {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("plan") || lower.includes("architecture") || lower.includes("design")) {
    return "blueprint";
  }
  if (lower.includes("fix") || lower.includes("bug") || lower.includes("error") || lower.includes("broken")) {
    return "fix";
  }
  if (lower.includes("test") || lower.includes("spec")) {
    return "test";
  }
  if (lower.includes("deploy") || lower.includes("production") || lower.includes("live")) {
    return "deploy";
  }
  if (lower.includes("security") || lower.includes("vulnerability") || lower.includes("auth")) {
    return "security";
  }
  if (lower.includes("review") || lower.includes("audit") || lower.includes("check")) {
    return "review";
  }
  if (lower.includes("explain") || lower.includes("what does") || lower.includes("how")) {
    return "explain";
  }
  if (lower.includes("edit") || lower.includes("change") || lower.includes("update") || lower.includes("modify")) {
    return "edit";
  }
  
  // Default to code generation
  return "codegen";
}

export function logRouting(taskType: TaskType, modelId: string, reason: string): void {
  logger.info("model.route", { taskType, modelId, reason });
}
