/**
 * Provider abstractions — business logic never talks to a vendor SDK
 * directly. Swap providers by adding an adapter here.
 */

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  system?: string;
  user?: string;
  messages?: ChatTurn[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** request strict JSON output when the provider supports it */
  json?: boolean;
}

export interface LLMUsage {
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface LLMResult {
  text: string;
  usage: LLMUsage;
}

export interface LLMProvider {
  readonly id: string;
  complete(req: LLMRequest): Promise<LLMResult>;
  /** token-streaming completion */
  stream(req: LLMRequest): AsyncGenerator<{ type: "delta"; text: string } | { type: "error"; message: string }, LLMResult, unknown>;
}

export interface ImageRequest {
  prompt: string;
  model?: string;
  n?: number;
  size?: "1024x1024" | "1024x1792" | "1792x1024" | "512x512";
}

export interface ImageResult {
  /** public or storable URL of the generated image */
  url: string;
  width?: number;
  height?: number;
  provider: string;
}

export interface ImageProvider {
  readonly id: string;
  generate(req: ImageRequest): Promise<ImageResult[]>;
}

export function isImageProvider(obj: unknown): obj is ImageProvider {
  return Boolean(obj && typeof obj === "object" && "generate" in obj);
}
