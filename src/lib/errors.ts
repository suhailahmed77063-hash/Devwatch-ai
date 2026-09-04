export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "USAGE_LIMIT"
  | "UPGRADE_REQUIRED"
  | "AI_PROVIDER_ERROR"
  | "PAYMENT_REQUIRED"
  | "CONFIG_ERROR"
  | "INTERNAL";

export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  /** message safe to show end users */
  readonly publicMessage: string;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(opts: { status: number; code: ErrorCode; message: string; publicMessage?: string; details?: unknown; cause?: unknown }) {
    super(opts.message);
    this.name = new.target.name;
    this.status = opts.status;
    this.code = opts.code;
    this.publicMessage = opts.publicMessage ?? opts.message;
    this.details = opts.details;
    this.cause = opts.cause;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must be signed in.", publicMessage = "Please sign in to continue.") {
    super({ status: 401, code: "UNAUTHORIZED", message, publicMessage });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this.", publicMessage = message) {
    super({ status: 403, code: "FORBIDDEN", message, publicMessage });
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", publicMessage?: string) {
    super({ status: 404, code: "NOT_FOUND", message: `${resource} not found`, publicMessage: publicMessage ?? `The requested ${resource.toLowerCase()} could not be found.` });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super({ status: 400, code: "VALIDATION_ERROR", message, publicMessage: message, details });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, publicMessage?: string) {
    super({ status: 409, code: "CONFLICT", message, publicMessage: publicMessage ?? message });
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please slow down.", publicMessage = message) {
    super({ status: 429, code: "RATE_LIMITED", message, publicMessage });
  }
}

export class UsageLimitError extends AppError {
  constructor(message = "Your monthly AI generation limit has been reached.", publicMessage = message) {
    super({ status: 429, code: "USAGE_LIMIT", message, publicMessage, details: { upgrade: true } });
  }
}

export class UpgradeRequiredError extends AppError {
  constructor(message: string, publicMessage = message) {
    super({ status: 402, code: "UPGRADE_REQUIRED", message, publicMessage });
  }
}

export class AiProviderError extends AppError {
  constructor(message = "The AI provider could not complete the request.", publicMessage = "The AI service is temporarily unavailable. Please try again in a moment.", details?: unknown, cause?: unknown) {
    super({ status: 502, code: "AI_PROVIDER_ERROR", message, publicMessage, details, cause });
  }
}

export class ConfigError extends AppError {
  constructor(message: string, publicMessage?: string) {
    super({ status: 503, code: "CONFIG_ERROR", message, publicMessage: publicMessage ?? "This feature is not configured yet. See setup instructions in the README.", details: { config: true } });
  }
}

/** Map any thrown value to a safe AppError. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const cause = e instanceof Error ? e : new Error(String(e));
  return new AppError({
    status: 500,
    code: "INTERNAL",
    message: cause.message,
    publicMessage: "Something went wrong on our side. Please try again.",
    cause,
  });
}

export function errorPayload(e: unknown): { error: { code: ErrorCode; message: string } } {
  const app = toAppError(e);
  return { error: { code: app.code, message: app.publicMessage } };
}
