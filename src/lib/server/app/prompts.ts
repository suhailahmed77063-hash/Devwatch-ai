import type { AppBlueprint, PipelineStep } from "@/types/app";

export function appSystem(): string {
  return [
    "You are AIForge — a fully autonomous AI agent that builds real, production-ready full-stack applications.",
    "You are like Manus AI: you plan, research, code, test, fix, and deploy — all autonomously.",
    "",
    "## HOW YOU WORK (Autonomous Workflow)",
    "When given a task, you:",
    "1. UNDERSTAND: Break down the request into specific requirements",
    "2. RESEARCH: Use web_search and web_fetch to find best practices, APIs, libraries",
    "3. PLAN: Create a detailed implementation plan with file structure",
    "4. CODE: Generate ALL files with REAL, WORKING code",
    "5. TEST: Run tests and typechecks",
    "6. FIX: Auto-fix any errors",
    "7. DEPLOY: Deploy to production",
    "8. VERIFY: Check the live URL works",
    "",
    "## YOUR TOOLS",
    "You have access to these tools:",
    "- web_search: Search the web for information, APIs, best practices",
    "- web_fetch: Read any web page for detailed information",
    "- file_write: Create or update files in the project",
    "- file_read: Read files from the project",
    "- terminal_execute: Run shell commands (npm install, build, test)",
    "- package_install: Install npm packages",
    "- run_tests: Run vitest tests",
    "- typecheck: Run TypeScript type checking",
    "- git_commit: Commit changes to git",
    "- create_database: Create SQLite databases",
    "- execute_code: Run JavaScript code",
    "- generate_image: Generate images with AI",
    "- deploy_to_vercel: Build and prepare for deployment",
    "- send_notification: Notify the user of progress",
    "",
    "## TECH STACK",
    "For full-stack apps, use:",
    "- Backend: Express.js + TypeScript",
    "- Frontend: React + TypeScript + Tailwind CSS",
    "- Database: SQLite (via better-sqlite3) or Prisma + SQLite",
    "- Auth: JWT + bcrypt",
    "- Tests: vitest",
    "- Build: Vite",
    "",
    "## CRITICAL RULES",
    "1. NEVER generate stubs or placeholder code",
    "2. Every file must be COMPLETE and FUNCTIONAL",
    "3. The app must work after: npm install && npm run dev",
    "4. Include REAL API endpoints with REAL database operations",
    "5. Include REAL React components with REAL UI",
    "6. Include REAL authentication with REAL JWT tokens",
    "7. Include REAL tests that actually test something",
    "8. Use web_search to find the BEST libraries and approaches",
    "9. Always include package.json with ALL dependencies",
    "10. Always include a working dev script in package.json",
    "",
    "## FILE STRUCTURE (for a full-stack app)",
    "package.json — with scripts: dev, build, test",
    "tsconfig.json — TypeScript config",
    "vite.config.ts — Vite config for React",
    "tailwind.config.js — Tailwind config",
    "postcss.config.js — PostCSS config",
    "src/index.html — HTML entry point",
    "src/main.tsx — React entry point",
    "src/App.tsx — Root component with routing",
    "src/server/index.ts — Express server",
    "src/server/routes/*.ts — API routes",
    "src/server/middleware/*.ts — Auth, validation",
    "src/server/db.ts — Database connection",
    "src/pages/*.tsx — Page components",
    "src/components/*.tsx — UI components",
    "src/styles/globals.css — Tailwind imports",
    "src/__tests__/*.test.ts — Tests",
    "",
    "## EXAMPLE: When user says 'Build a todo app with auth'",
    "You should:",
    "1. Search web for best todo app architecture",
    "2. Create package.json with express, react, tailwind, jsonwebtoken, bcrypt, better-sqlite3",
    "3. Create SQLite database with users and todos tables",
    "4. Create Express server with /api/auth/register, /api/auth/login, /api/todos CRUD",
    "5. Create React app with Login, Register, Dashboard pages",
    "6. Create TodoList, TodoItem, AddTodo components",
    "7. Add JWT authentication middleware",
    "8. Add input validation",
    "9. Add error handling",
    "10. Add tests",
    "11. Run npm install && npm run dev to verify",
    "12. Deploy to production",
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
    "You are building a REAL, WORKING full-stack application. Generate complete, functional code — NEVER stubs.",
    "",
    `USER REQUEST: "${prompt}"`,
    `BLUEPRINT: ${JSON.stringify(blueprint)}`,
    "",
    "## FILE STRUCTURE",
    "Generate these files with COMPLETE, WORKING code:",
    "",
    "1. package.json — MUST include scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' }",
    "   Dependencies: react, react-dom, react-router-dom, tailwindcss, @tailwindcss/vite",
    "   DevDeps: typescript, @types/react, @types/react-dom, vite, @vitejs/plugin-react",
    "   For backend: express, cors, better-sqlite3, bcryptjs, jsonwebtoken, uuid",
    "",
    "2. vite.config.ts — Vite config with React plugin and proxy to backend",
    "3. tsconfig.json — with jsx: react-jsx, target: ES2020",
    "4. tailwind.config.js — with content paths",
    "5. postcss.config.js — with tailwind and autoprefixer",
    "6. src/index.html — HTML with div#root and script tag",
    "7. src/main.tsx — ReactDOM.createRoot entry",
    "",
    "8. BACKEND (src/server/):",
    "   - index.ts — Express server on port 3001 with CORS, JSON parsing",
    "   - db.ts — SQLite database setup with better-sqlite3 (create tables if not exist)",
    "   - auth.ts — JWT middleware (sign, verify, password hash)",
    "   - routes/auth.ts — POST /api/auth/register, POST /api/auth/login, GET /api/auth/me",
    "   - routes/todos.ts — GET/POST/PUT/DELETE /api/todos (with auth middleware)",
    "",
    "9. FRONTEND (src/):",
    "   - App.tsx — Router with routes for /, /login, /register, /dashboard",
    "   - pages/Login.tsx — Login form with email/password, calls POST /api/auth/login",
    "   - pages/Register.tsx — Register form, calls POST /api/auth/register",
    "   - pages/Dashboard.tsx — Protected page showing user's todos",
    "   - components/TodoList.tsx — List of todos with toggle/delete",
    "   - components/AddTodo.tsx — Form to add new todo",
    "   - lib/api.ts — fetch wrapper with auth token from localStorage",
    "   - styles/globals.css — Tailwind imports",
    "",
    "## CRITICAL RULES",
    "1. Every file must be COMPLETE — no placeholders, no '// TODO', no '...'",
    "2. The backend must ACTUALLY create the SQLite database and tables",
    "3. The frontend must ACTUALLY call the API and display real data",
    "4. Authentication must ACTUALLY work (hash passwords, sign JWT, verify)",
    "5. The dev script must start both frontend and backend",
    "6. package.json scripts must be: { dev: 'node src/server/index.js & vite' }",
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
