/**
 * AI Security Agent — API route helpers.
 */

import { NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/security-agent/auth";

export function agentErrorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  console.error("[security-agent] route error:", err);
  const message = err instanceof Error ? err.message : "Internal error";
  return NextResponse.json({ error: message }, { status: 500 });
}
