"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Bot, User, Send, GitBranch, Shield, AlertTriangle, FolderKanban, GitPullRequest, Users } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { icon: GitBranch, label: "What changed this week?", question: "What changed this week?" },
  { icon: AlertTriangle, label: "Which PRs are risky?", question: "Which PRs are risky?" },
  { icon: Shield, label: "Are there security problems?", question: "Are there security problems?" },
  { icon: GitPullRequest, label: "Review PR #6 from ai-multimodal", question: "Review PR #6 from ai-multimodal" },
  { icon: FolderKanban, label: "Show me project status", question: "Show me project status" },
  { icon: Users, label: "Summarize the team", question: "Summarize the team's work" },
];

function formatResponse(text: string) {
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) return `<h2 class="text-lg font-bold mt-4 mb-2">${line.substring(3)}</h2>`;
      if (line.startsWith("**") && line.endsWith("**")) return `<p class="font-semibold mt-2 mb-1">${line.replace(/\*\*/g, "")}</p>`;
      if (line.startsWith("- ")) return `<li class="ml-4 text-sm">${line.substring(2)}</li>`;
      if (line.startsWith("| ")) {
        const cells = line.split("|").filter(Boolean).map((c) => c.trim());
        if (cells.every((c) => c.match(/^[-]+$/))) return "";
        return `<div class="grid grid-cols-${cells.length} gap-2 text-xs py-1 border-b border-border/50">${cells.map((c) => `<span>${c}</span>`).join("")}</div>`;
      }
      if (line.match(/^\d+\./)) return `<li class="ml-4 text-sm list-decimal">${line.replace(/^\d+\.\s*/, "")}</li>`;
      return `<p class="text-sm">${line}</p>`;
    })
    .join("\n");
}

export default function AIManagerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      // Check if user wants a code review
      const reviewMatch = text.match(/review\s+(?:pr\s*)?#?(\d+)\s+(?:from|in|of|on)\s+(\S+)/i)
        || text.match(/review\s+(\S+)\s+#?(\d+)/i)
        || text.match(/(?:pr|pull request)\s+#?(\d+)\s+(?:from|in|of|on)\s+(\S+)/i);

      let data;

      if (reviewMatch) {
        const prNumber = parseInt(reviewMatch[1]);
        const repoName = reviewMatch[2].toLowerCase();

        // Find repo ID from name
        const reposRes = await fetch("/api/repositories");
        const reposData = await reposRes.json();
        const repo = reposData.repos?.find((r: { name: string; fullName: string }) =>
          r.name.toLowerCase() === repoName || r.fullName?.toLowerCase().includes(repoName)
        );

        if (repo) {
          // Call the code review API
          const reviewRes = await fetch("/api/ai/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repoId: repo.id,
              prNumber: prNumber,
              githubToken: "",
            }),
          });
          const reviewData = await reviewRes.json();
          data = { response: reviewData.review || "Review completed but no results returned." };
        } else {
          data = { response: `Repository \"${repoName}\" not found. Available repos: ${reposData.repos?.map((r: { name: string }) => r.name).join(", ") || "none"}` };
        }
      } else {
        // Regular chat
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        data = await response.json();
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response || "Sorry, I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "⚠️ Failed to get response. Please check your AI API configuration and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold">AI Engineering Manager</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions about your engineering team and projects
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border bg-card p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">AI Engineering Manager</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Ask me anything about your team&apos;s engineering activity, project status, security findings, or priorities.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SUGGESTED_QUESTIONS.map((sq) => (
                <button
                  key={sq.label}
                  onClick={() => sendMessage(sq.question)}
                  className="flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted"
                >
                  <sq.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{sq.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: formatResponse(msg.content),
                      }}
                    />
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-xl bg-muted px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about your engineering team..."
            className="flex-1 rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isTyping}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Answers are grounded in your actual project data. AI responses are for informational purposes.
        </p>
      </div>
    </div>
  );
}
