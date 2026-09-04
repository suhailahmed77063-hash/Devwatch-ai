"use client";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } };
      if (body?.error?.message) message = body.error.message;
      code = body?.error?.code;
    } catch {
      // non-json body
    }
    throw new ApiClientError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface SseHandlers {
  onEvent: (event: string, data: unknown) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

/** POST and consume a Server-Sent-Event stream. Events arrive as parsed JSON. */
export async function streamPost(url: string, body: unknown, handlers: SseHandlers, opts?: { signal?: AbortSignal }): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body ?? {}),
      signal: opts?.signal,
    });
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        if (j?.error?.message) message = j.error.message;
      } catch {
        // ignore
      }
      throw new ApiClientError(message, res.status);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      handlers.onError?.(new Error("Streaming is not supported by this browser."));
      return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        let event = "message";
        let data = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (data) {
          try {
            handlers.onEvent(event, JSON.parse(data));
          } catch {
            handlers.onEvent(event, data);
          }
        }
      }
    }
    handlers.onDone?.();
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}
