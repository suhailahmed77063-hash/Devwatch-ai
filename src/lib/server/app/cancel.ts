const cancelled = new Map<string, boolean>();

export function cancelAppRun(runId: string): void {
  cancelled.set(runId, true);
}

export function isCancelled(runId: string): boolean {
  return cancelled.get(runId) === true;
}

export function clearCancel(runId: string): void {
  cancelled.delete(runId);
}

/** Throw when the run was cancelled (checked between stages/steps). */
export function assertNotCancelled(runId: string): void {
  if (isCancelled(runId)) {
    const err = new Error("Run cancelled by the user");
    (err as { cancelled?: boolean }).cancelled = true;
    throw err;
  }
}