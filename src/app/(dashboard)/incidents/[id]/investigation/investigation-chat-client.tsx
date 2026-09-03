"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Bot, User, Zap } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const suggestedQuestions = [
  "What caused this incident?",
  "What changed before the incident?",
  "Which PR is most likely responsible?",
  "What APIs are affected?",
  "Has this happened before?",
  "What should I check first?",
  "Should we consider rollback?",
  "Show me the evidence",
  "Which files should I investigate?",
  "What changed between the last stable release and this release?",
];

export function InvestigationChatClient({ params }: Props) {
  const { id } = use(params);
  const [incident, setIncident] = useState<any>(null);
  const [chatHistory, setChatHistory] = useState<{ role: string; message: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/incidents/${id}`).then((r) => r.json()).then((d) => setIncident(d?.incident));
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  async function sendMessage(msg?: string) {
    const message = msg || chatInput.trim();
    if (!message) return;
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", message }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setChatHistory((prev) => [...prev, { role: "assistant", message: data.response || "No response." }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "assistant", message: "Failed to get response. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/incidents/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4" /> Investigation Copilot
            </h1>
            {incident && (
              <p className="text-xs text-muted-foreground">{incident.title} — {incident.severity?.toUpperCase()}</p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Zap className="h-12 w-12 text-primary mb-4" />
            <h2 className="text-lg font-semibold">AI Investigation Copilot</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Ask questions about this incident. The AI will analyze your actual DevWatch AI data
              — deployments, PRs, commits, timeline, and root causes.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6 max-w-lg">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left rounded-lg border p-3 text-sm hover:bg-muted hover:border-primary/50 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`rounded-xl px-4 py-3 text-sm max-w-2xl ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}>
              <div className="whitespace-pre-wrap">{msg.message}</div>
            </div>
            {msg.role === "user" && (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-xl bg-muted px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">Analyzing incident data...</div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about this incident..."
            className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !chatInput.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
