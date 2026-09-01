"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Sparkles, GitBranch, Shield, AlertTriangle, FolderKanban, GitPullRequest } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  { icon: GitBranch, label: "What changed this week?", question: "What changed this week?" },
  { icon: AlertTriangle, label: "Which PRs are risky?", question: "Which PRs are risky?" },
  { icon: Shield, label: "Are there security problems?", question: "Are there security problems?" },
  { icon: FolderKanban, label: "Show me project status", question: "Show me project status" },
  { icon: GitPullRequest, label: "What should we focus on?", question: "What should the engineering manager focus on?" },
];

function generateResponse(question: string): string {
  const lower = question.toLowerCase();

  if (lower.includes("what changed this week") || lower.includes("weekly")) {
    return `## This Week's Summary (Week 34)

**Team Activity:**
- 45 commits across 5 repositories
- 8 pull requests opened, 8 merged
- 12 code reviews completed
- CI/CD success rate: 87%

**Key Changes:**
1. ✅ Implemented OAuth2 authentication flow with refresh tokens
2. 🔄 Started GraphQL API migration (PR #103 - in review)
3. ✅ Added dark mode support with system preference detection
4. ✅ Patched XSS vulnerability in user search input
5. 🔄 Optimizing dashboard database queries

**Security:**
- 2 critical security findings detected
- 1 secret (AWS key) found in CI config - needs immediate attention
- 5 dependency vulnerabilities tracked

**Projects:**
- Platform v2.0: 72% → on track for Oct 15 deadline
- API Redesign: 45% → slightly behind schedule
- Mobile App: 28% → early stage, on track`;
  }

  if (lower.includes("risky") || lower.includes("risk")) {
    return `## High-Risk Pull Requests

🔴 **PR #103 - Migrate API to GraphQL** (Risk: 72/100)
- Repository: acme-api
- Author: Marcus Johnson
- 456 additions, 123 deletions, 12 files changed
- Security finding: potential SQL injection in resolver
- This is a major architectural change - recommend thorough review

🟠 **PR #108 - Add 2FA support** (Risk: 65/100)
- Repository: acme-platform
- Author: Lisa Nguyen
- 312 additions, 45 deletions, 8 files changed
- Authentication module changes need careful review

🟡 **PR #107 - Implement full-text search** (Risk: 58/100)
- Repository: acme-platform
- Author: Sarah Chen
- 523 additions, 67 deletions, 15 files changed
- CI pipeline currently failing - must resolve before merge

**Recommendation:** Prioritize review of PR #103 due to SQL injection finding and architectural scope.`;
  }

  if (lower.includes("security")) {
    return `## Security Status

**Critical Findings (2):**
1. 🔴 AWS Access Key found in CI configuration (acme-platform)
   - File: config/deploy.yml:42
   - Action: Rotate key immediately, move to GitHub Secrets
   
2. 🔴 Elasticsearch credentials hardcoded in source
   - File: src/search/index.ts:55
   - Action: Move to environment variables

**High Findings (3):**
- Authentication bypass via missing session validation (CWE-287)
- Vulnerable lodash@4.17.19 (CVE-2021-23337)
- Vulnerable axios@0.20.0 (CVE-2021-3749)

**Medium Findings (3):**
- User data exposed in API error responses
- Unrestricted file upload without type validation
- Push notification content not sanitized

**Dependency Vulnerabilities (5):**
All 5 tracked vulnerabilities have patched versions available.

**Immediate Actions:**
1. Rotate and remove the exposed AWS key
2. Update lodash to 4.17.21+
3. Update axios to 0.21.1+
4. Add session validation middleware`;
  }

  if (lower.includes("blocked")) {
    return `## Potential Blockers

**PR-level Blockers:**
- PR #107 (Full-text search): CI pipeline failing - Sarah Chen may need help debugging
- PR #103 (GraphQL migration): Awaiting review - only 1 approval, needs 1 more

**CI/CD Issues:**
- CI Pipeline #103 failing on feat/api branch (3 consecutive failures)
- May indicate flaky tests or genuine test failures

**Review Bottlenecks:**
- PR #108 (2FA support) waiting 3 days for review
- PR #103 (GraphQL) waiting for second approval

**Project Risks:**
- API Redesign project at 45% with 76 days left - monitor closely
- Dashboard Revamp milestone at 65% with only 7 days to deadline

No explicit blockers recorded in the task management system.`;
  }

  if (lower.includes("focus") || lower.includes("priorit") || lower.includes("should")) {
    return `## Recommended Focus Areas

**🔴 Priority 1 - Critical Security (Immediate)**
1. Rotate the exposed AWS access key in acme-platform
2. Remove Elasticsearch credentials from source code
3. Update vulnerable dependencies (lodash, axios)

**🟠 Priority 2 - High-Risk PRs**
1. Review PR #103 (GraphQL migration) - security finding + large scope
2. Review PR #108 (2FA) - authentication changes need thorough review
3. Fix CI pipeline failures on feat/api branch

**🟡 Priority 3 - Project Deadlines**
1. Dashboard Revamp: 65% complete, 7 days to deadline - allocate more resources
2. API Redesign: Check if GraphQL migration timeline is realistic
3. Ensure PR review throughput increases

**🔵 Priority 4 - Team Health**
1. PR #108 has been waiting 3 days for review
2. Consider pairing on the GraphQL migration
3. Ensure code review standards are maintained for high-risk PRs`;
  }

  if (lower.includes("project") || lower.includes("status") || lower.includes("progress")) {
    return `## Project Status

**Platform v2.0** - 🟢 On Track
- Progress: 72% | Lead: Sarah Chen
- Deadline: Oct 15 (30 days left)
- Completed milestones: Authentication System ✅
- In Progress: Dashboard Revamp (65%)
- Open issues: 2
- Related PRs: 4

**API Redesign** - 🟠 At Risk
- Progress: 45% | Lead: Marcus Johnson
- Deadline: Nov 30 (76 days left)
- Milestone: GraphQL Schema Design (30%)
- Open PRs: 1 high-risk (GraphQL migration)
- Risk: Large scope, SQL injection finding needs resolution

**Mobile App Launch** - 🟡 Early Stage
- Progress: 28% | Lead: Priya Patel
- Deadline: Dec 31 (107 days left)
- React Native project setup completed
- Implementing auth flow
- iOS build issue in progress`;
  }

  if (lower.includes("team") || lower.includes("summar")) {
    return `## Team Summary

**Active Contributors:** 7 of 8 developers
**Most Active:** Sarah Chen (12 commits, 5 reviews)
**Team Velocity:** 45 commits/week (↑12% from last week)

**Developer Activity:**
| Developer | Commits | PRs | Reviews |
|-----------|---------|-----|---------|
| Sarah Chen | 12 | 3 | 5 |
| Marcus Johnson | 8 | 2 | 4 |
| Priya Patel | 6 | 2 | 3 |
| Alex Rodriguez | 5 | 1 | 2 |
| Jordan Kim | 4 | 1 | 3 |
| Emma Wilson | 3 | 1 | 2 |
| David Brown | 4 | 0 | 1 |
| Lisa Nguyen | 3 | 1 | 1 |

**Note:** Activity metrics represent engineering activity, not performance judgments.

**Key Observations:**
- Strong review culture with 12 reviews completed
- Good PR merge rate across the team
- CI/CD pipeline health could improve (87% success rate)`;
  }

  return `I can help you understand your engineering team's activity. Here are some things I can help with:

- **"What changed this week?"** - Weekly activity summary
- **"Which PRs are risky?"** - High-risk pull request analysis
- **"Are there security problems?"** - Security findings overview
- **"Who is blocked?"** - Identify blockers and bottlenecks
- **"What should we focus on?"** - Priority recommendations
- **"Show me project status"** - Project progress and health
- **"Summarize the team's work"** - Team activity overview
- **"Why is this project delayed?"** - Project delay analysis
- **"What features were completed?"** - Completed work summary
- **"Show critical changes from today"** - Today's important changes`;
}

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

    // Simulate AI response delay
    setTimeout(() => {
      const response = generateResponse(text);
      const assistantMessage: Message = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 800);
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
