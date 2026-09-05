"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal as TerminalIcon, Play, Square, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/client/api";

interface TerminalLine {
  type: "input" | "output" | "error" | "info";
  content: string;
  timestamp: number;
}

export function IntegratedTerminal({
  projectId,
  onCommand,
}: {
  projectId: string;
  onCommand?: (cmd: string) => void;
}) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "info", content: "AIForge Terminal — Ready", timestamp: Date.now() },
    { type: "info", content: 'Type commands or let the AI agent run them automatically.', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setLines((prev) => [...prev, { type, content, timestamp: Date.now() }]);
  }, []);

  const runCommand = useCallback(
    async (cmd: string) => {
      if (!cmd.trim()) return;
      setRunning(true);
      addLine("input", `$ ${cmd}`);
      setHistory((prev) => [...prev, cmd]);
      setHistoryIdx(-1);
      onCommand?.(cmd);

      try {
        const res = await apiFetch<{
          exitCode: number;
          stdout: string;
          stderr: string;
          durationMs: number;
        }>(`/api/projects/${projectId}/sandbox`, {
          method: "POST",
          body: JSON.stringify({ action: "execute", command: cmd, timeoutMs: 60000 }),
        });

        if (res.stdout) addLine("output", res.stdout);
        if (res.stderr) addLine("error", res.stderr);
        if (res.exitCode !== 0) {
          addLine("error", `Exit code: ${res.exitCode} (${(res.durationMs / 1000).toFixed(1)}s)`);
        } else {
          addLine("info", `✓ Done (${(res.durationMs / 1000).toFixed(1)}s)`);
        }
      } catch (e) {
        addLine("error", `Error: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setRunning(false);
      }
    },
    [projectId, addLine, onCommand]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = historyIdx + 1;
      if (newIdx < history.length) {
        setHistoryIdx(newIdx);
        setInput(history[history.length - 1 - newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = historyIdx - 1;
      if (newIdx >= 0) {
        setHistoryIdx(newIdx);
        setInput(history[history.length - 1 - newIdx]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]">
      {/* Header */}
      <div className="h-8 shrink-0 border-b border-white/5 flex items-center gap-2 px-3">
        <TerminalIcon className="w-3.5 h-3.5 text-acc-soft" />
        <span className="text-[11px] font-semibold text-zinc-300">Terminal</span>
        <div className="flex-1" />
        <button
          onClick={() => setLines([])}
          className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white"
          title="Clear terminal"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Output */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 font-mono text-[11px]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words leading-relaxed",
              line.type === "input" && "text-acc-soft font-semibold",
              line.type === "output" && "text-zinc-300",
              line.type === "error" && "text-red-400",
              line.type === "info" && "text-zinc-500"
            )}
          >
            {line.content}
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-2 text-acc-soft">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Running...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/5 p-2">
        <div className="flex items-center gap-2">
          <span className="text-acc-soft font-mono text-[11px]">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={running}
            placeholder="Enter command..."
            className="flex-1 bg-transparent font-mono text-[11px] text-zinc-200 outline-none placeholder-zinc-600 disabled:opacity-50"
            autoFocus
          />
          <button
            type="submit"
            disabled={running || !input.trim()}
            className="p-1.5 rounded-lg bg-acc/20 text-acc-soft hover:bg-acc/30 disabled:opacity-30"
          >
            {running ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
      </form>
    </div>
  );
}
