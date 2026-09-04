import { toAppError } from "@/lib/errors";

export type ActionResult = { ok: boolean; error?: string; message?: string };

/** Convert any thrown error into a safe, user-facing message. */
export function toastError(e: unknown): string {
  return toAppError(e).publicMessage;
}
