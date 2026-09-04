"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

const CHIPS = [
  { label: "+ Add section", prompt: "Add a pricing section with three tiers" },
  { label: "🎨 Change colors", prompt: "Change the site accent color to a deep blue" },
  { label: "📱 Make responsive", prompt: "Audit the layout for mobile and fix spacing and overflow" },
  { label: "✨ Add animation", prompt: "Add smooth staggered fade-in animations to every section" },
  { label: "🔍 Improve SEO", prompt: "Improve SEO: stronger titles and meta descriptions for every page" },
  { label: "🖼 Generate images", prompt: "Replace empty gallery items with on-brand images" },
];

export function ChatPanel() {
  const project = useStudio((s) => s.project);
  const doc = useStudio((s) => s.doc);
  const messages = useStudio((s) => s.messages);
  const busy = useStudio((s) => s.aiBusy);
  const stage = useStudio((s) => s.aiStage);
  const runPrompt = useStudio((s) => s.runPrompt);
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, busy, stage]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    setDraft("");
    void runPrompt(text);
  };

  return (
    <div className="w-[320px] shrink-0 border-r border-white/5 bg-panel flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2.5">
        <span className="relative w-8 h-8 rounded-xl btn-acc flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-panel" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">AI Assistant</div>
          <div className="text-[10px] text-emerald-400 truncate">
            {busy ? stage ?? "Working…" : doc ? "Online — ready to edit" : "Online — describe your site to start"}
          </div>
        </div>
      </div>

      <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-[12px] text-zinc-500 leading-relaxed">
            👋 Hi, I&apos;m your AI copilot. {doc ? "Tell me what to change — colors, sections, copy, layout." : "Describe the website you want to build."}
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="btn-acc rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] text-white max-w-[85%] whitespace-pre-wrap break-words">
                  {m.content}
                </div>
              </div>
            );
          }
          if (m.role === "error") {
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <CircleAlert className="w-3.5 h-3.5 text-red-400" />
                </span>
                <div className="glass rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] text-red-300 max-w-[85%] break-words">{m.content}</div>
              </div>
            );
          }
          return (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-7 h-7 rounded-lg btn-acc flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </span>
              <div className="glass rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] text-zinc-200 max-w-[85%] whitespace-pre-wrap break-words leading-relaxed">
                {m.content}
              </div>
            </div>
          );
        })}
        {busy && messages[messages.length - 1]?.role !== "assistant" && messages[messages.length - 1]?.role !== "error" && (
          <div className="flex items-start gap-2.5">
            <span className="w-7 h-7 rounded-lg btn-acc flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </span>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-acc-soft" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-acc-soft" />
              <span className="typing-dot w-1.5 h-1.5 rounded-full bg-acc-soft" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-white/5">
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {CHIPS.map((c) => (
            <button key={c.label} onClick={() => send(c.prompt)} disabled={busy} className="chip glass rounded-full px-2.5 py-1 text-[11px] text-zinc-400 disabled:opacity-50">
              {c.label}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={doc ? "Ask AI… e.g. “Make the navbar sticky”" : "Describe your website…"}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none focus:border-acc/60 placeholder-zinc-600 max-h-28 text-zinc-100"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button type="submit" aria-label="Send" disabled={busy} className={cn("btn-acc p-2.5 rounded-xl text-white shrink-0", busy && "opacity-60")}>
            <Send className="w-4 h-4" />
          </button>
        </form>
        {project && project.plan === "FREE" && (
          <p className="text-[10px] text-zinc-600 mt-2">Free plan: 3 AI generations / month — upgrade for unlimited.</p>
        )}
      </div>
    </div>
  );
}
