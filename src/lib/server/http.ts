import { NextResponse } from "next/server";
import { toAppError, type ErrorCode } from "@/lib/errors";
import { logger, logContext, withLogContext, requestIdFromHeaders } from "./logger";

export function jsonOk(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(e: unknown): NextResponse {
  const app = toAppError(e);
  const body = { error: { code: app.code, message: app.publicMessage, status: app.status } };
  const status = app.status === 402 ? 402 : app.status; // keep 402 for upgrade-required
  if (app.status >= 500 && process.env.NODE_ENV !== "production") {
    body.error.message = `${app.publicMessage} (${app.code})`;
  }
  return NextResponse.json(body, { status });
}

/** Wrap a route handler with request-id logging context. */
export function withRequest<T extends unknown[], R>(handler: (...args: T) => Promise<R> | R) {
  return async (...args: T): Promise<R> => {
    const result = handler(...args);
    return withLogContext({}, () => result) as Promise<R>;
  };
}

export function requestContext(headers: Headers, userId?: string) {
  const requestId = requestIdFromHeaders(headers);
  return { requestId, userId };
}

export function logRequest(headers: Headers, method: string, path: string, userId?: string) {
  const requestId = requestIdFromHeaders(headers);
  logger.info("http.request", { requestId, method, path, userId });
  void logContext;
}
