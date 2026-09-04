import { AsyncLocalStorage } from "node:async_hooks";

export interface LogContext {
  requestId?: string;
  userId?: string;
  projectId?: string;
  [k: string]: unknown;
}

const store = new AsyncLocalStorage<LogContext>();

export function withLogContext<T>(ctx: LogContext, fn: () => Promise<T> | T): Promise<T> | T {
  return store.run(ctx, fn);
}

export function logContext(): LogContext {
  return store.getStore() ?? {};
}

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  const conf = (process.env.LOG_LEVEL ?? "info") as Level;
  const order: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  if (order[level] < order[conf]) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...logContext(),
    ...(meta ?? {}),
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};

export function requestIdFromHeaders(headers: Headers): string {
  const existing = headers.get("x-request-id");
  if (existing) return existing;
  return `req_${Math.random().toString(36).slice(2, 12)}`;
}
