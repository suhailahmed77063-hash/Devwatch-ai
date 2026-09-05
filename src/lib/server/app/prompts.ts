import type { AppBlueprint, PipelineStep } from "@/types/app";

export function appSystem(): string {
  return [
    "You are the WebForge AI — a production-grade autonomous coding agent.",
    "You build real, working full-stack applications from natural language prompts.",
    "",
    "## CAPABILITIES",
    "You can build ANY type of web application:",
    "- SaaS dashboards, admin panels, CRM, ERP systems",
    "- E-commerce stores, booking platforms, marketplaces",
    "- Social networks, chat apps, collaboration tools",
    "- REST APIs, GraphQL servers, microservices",
    "- Landing pages, portfolios, blogs",
    "- AI tools, chatbots, automation platforms",
    "- Any web application the user describes",
    "",
    "## TECH STACK (adapt to project needs)",
    "- Backend: Express.js + TypeScript",
    "- Frontend: React + TypeScript + Tailwind CSS",
    "- Database: Prisma ORM + SQLite (portable, no setup needed)",
    "- Auth: JWT + bcrypt",
    "- Tests: vitest",
    "",
    "## RULES",
    "1. Generate REAL, WORKING code — never stubs or placeholders",
    "2. Every file must be complete and functional",
    "3. Always include package.json with ALL dependencies",
    "4. Always include tsconfig.json",
    "5. Include health check at GET /api/health",
    "6. Include vitest tests under src/__tests__/",
    "7. Use TypeScript strict mode",
    "8. Proper error handling everywhere",
    "9. Input validation with Zod",
    "10. Environment variables for config (never hardcode secrets)",
    "",
    "## FILE STRUCTURE",
    "For a full-stack app, generate:",
    "- package.json, tsconfig.json",
    "- prisma/schema.prisma",
    "- src/server.ts (Express backend)",
    "- src/routes/*.ts (API routes)",
    "- src/middleware/*.ts (auth, validation)",
    "- src/lib/*.ts (db, auth, utils)",
    "- src/App.tsx (React root)",
    "- src/pages/*.tsx (page components)",
    "- src/components/*.tsx (UI components)",
    "- src/__tests__/*.test.ts (tests)",
    "- index.html",
    "",
  ].join("\n");
}

export function buildBlueprintPrompt(prompt: string): string {
  return [
    "The user wants to build an application. Analyze their request and create a detailed engineering blueprint.",
    "",
    `USER REQUEST: "${prompt}"`,
    "",
    "Create a comprehensive blueprint with:",
    "- name: catchy product name (2-3 words)",
    "- description: one sentence describing the app",
    "- stack: technology stack (e.g. 'React + Express + Prisma + Tailwind')",
    "- modules: all capabilities needed (auth, payments, dashboard, admin, real-time, etc.)",
    "- dataModels: all database entities with typed fields",
    "- apiRoutes: ALL REST endpoints with method, path, description, auth requirement",
    "- envRequirements: every environment variable needed",
    "- pages: ALL UI routes/components needed",
    "- testPlan: concrete tests to write (5-8 tests)",
    "",
    "IMPORTANT: Be thorough! Include EVERY feature the user mentioned. Don't skip anything.",
    "If they asked for auth → include register, login, logout, forgot password, profile",
    "If they asked for payments → include subscription, billing, invoice history",
    "If they asked for dashboard → include stats, charts, recent activity, settings",
    "If they asked for admin → include user management, analytics, system settings",
    "",
    "Return the blueprint as a single JSON object.",
  ].join("\n");
}

export function buildAppFilesPrompt(blueprint: AppBlueprint, prompt: string): string {
  return [
    "Implement the COMPLETE application described by this blueprint as real TypeScript files.",
    "",
    `USER REQUEST: "${prompt}"`,
    `BLUEPRINT: ${JSON.stringify(blueprint)}`,
    "",
    "Generate EVERY file needed for a working application. Include:",
    "",
    "1. CONFIG FILES:",
    "   - package.json (ALL dependencies: express, cors, bcrypt, jsonwebtoken, prisma, react, react-dom, tailwindcss, etc.)",
    "   - tsconfig.json (with jsx: react-jsx for React apps)",
    "   - tailwind.config.js (if using Tailwind)",
    "",
    "2. BACKEND (Express + Prisma):",
    "   - src/server.ts — Express app with all middleware and routes",
    "   - src/routes/*.ts — ALL route handlers (auth, users, projects, etc.)",
    "   - src/middleware/*.ts — Auth middleware, validation, error handling",
    "   - src/lib/db.ts — Prisma client singleton",
    "   - src/lib/auth.ts — JWT sign/verify, password hashing",
    "   - src/lib/validators.ts — Zod schemas for request validation",
    "   - prisma/schema.prisma — Complete database schema",
    "",
    "3. FRONTEND (React + Tailwind):",
    "   - src/App.tsx — Root component with React Router",
    "   - src/pages/*.tsx — ALL page components (Login, Dashboard, Settings, etc.)",
    "   - src/components/*.tsx — Reusable UI components (Button, Card, Modal, etc.)",
    "   - src/lib/api.ts — API client with fetch wrapper",
    "   - src/hooks/*.ts — Custom hooks (useAuth, useApi, etc.)",
    "   - src/styles/globals.css — Tailwind imports + custom styles",
    "   - index.html — HTML entry point",
    "",
    "4. FOR EACH FEATURE THE USER MENTIONED:",
    "   - Authentication → register/login forms, JWT tokens, protected routes",
    "   - Dashboard → stats cards, charts, activity feed, quick actions",
    "   - CRUD → list view, create/edit forms, delete confirmation",
    "   - Payments → Stripe checkout, subscription management, invoices",
    "   - Real-time → WebSocket connection, live updates",
    "   - Admin → user management, system settings, analytics",
    "",
    "5. DEPENDENCIES (in package.json):",
    "   - Backend: express, cors, bcrypt, jsonwebtoken, zod, dotenv",
    "   - Database: @prisma/client, prisma (devDep)",
    "   - Frontend: react, react-dom, react-router-dom, tailwindcss",
    "   - Dev: typescript, tsx, vitest, @types/node, @types/react",
    "",
    "CRITICAL: Generate ALL files. Do NOT skip any file needed for the app to work.",
    "The app must be runnable after npm install && npm run dev.",
    "",
  ].join("\n");
}

export function buildAgentPlanPrompt(opts: { files: Record<string, string>; lastRun: string; message: string; history: string }): string {
  const index = fileIndex(opts.files);
  return [
    "The user is asking you to modify their application. Analyze the request and create a plan with file operations.",
    "",
    `USER REQUEST: "${opts.message}"`,
    opts.history ? `RECENT CONVERSATION:\n${opts.history}` : "",
    "",
    `CURRENT WORKSPACE FILES (${index.length}):\n${index.join("\n")}`,
    opts.lastRun ? `LAST QA RUN:\n${opts.lastRun}` : "",
    "",
    "Create a plan with:",
    "- summary: what you're changing and why (1-2 sentences)",
    "- steps: 3-6 human-readable steps for the UI",
    "- operations: array of file operations (create/edit/delete/rename)",
    "- runTests: true (unless trivial comment-only change)",
    "",
    "Editing rules:",
    "- Prefer small, surgical edits over rewriting entire files",
    "- When editing, provide the COMPLETE new file content",
    "- Never change package.json scripts unless required",
    "- Match existing code style",
    "- Create new files in appropriate directories for new features",
    "",
  ].join("\n");
}

export function buildFixPrompt(opts: { files: Record<string, string>; failingSteps: PipelineStep[]; attempt: number; maxAttempts: number }): string {
  const index = fileIndex(opts.files);
  const fails = opts.failingSteps.map((s) => `### ${s.label} — ${s.status}\n${s.output ?? "(no output)"}`).join("\n\n");
  return [
    `The QA pipeline failed (attempt ${opts.attempt}/${opts.maxAttempts}). Analyze the failure and produce a fix.`,
    "",
    `FAILING STEPS:\n${fails}`,
    "",
    `WORKSPACE FILES (${index.length}):\n${index.join("\n")}`,
    "",
    "Rules:",
    "- Fix the root cause, not the symptom",
    "- Provide only the files you change",
    "- If a test is wrong, fix the test",
    "- If you can't determine a fix, set continue: false",
    "",
    "Return JSON: { summary, operations, continue }",
  ].join("\n");
}

/** Compact index of the workspace for LLM context: path :: N chars (content head for small files). */
export function fileIndex(files: Record<string, string>, maxChars = 140): string[] {
  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, c]) => {
      const size = c.length;
      if (size <= maxChars) return `${p} :: ${c.replace(/\n/g, " ").slice(0, maxChars)}`;
      return `${p} :: ${size} chars`;
    });
}

export function compactHistory(rows: { role: string; content: string }[], max = 2400): string {
  return rows
    .slice(-6)
    .map((r) => `${r.role.toUpperCase()}: ${r.content.slice(0, 400)}`)
    .join("\n")
    .slice(-max);
}

export function clampPrompt(prompt: string, max = 3000): string {
  const p = prompt.trim();
  return p.length > max ? p.slice(0, max) : p;
}
