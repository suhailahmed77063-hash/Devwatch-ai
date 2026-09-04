export interface SseEvent {
  type: string;
  [k: string]: unknown;
}

export function createSseStream(run: (push: (e: SseEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (e: SseEvent) => {
        try {
          controller.enqueue(encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
        } catch {
          // controller already closed
        }
      };
      try {
        await run(push);
      } finally {
        try {
          controller.close();
        } catch {
          // ignore close errors
        }
      }
    },
    cancel() {
      // client navigated away
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
