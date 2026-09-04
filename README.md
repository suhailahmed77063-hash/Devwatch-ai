# aiforge 🚀

**AI-powered website & application builder.** Describe an idea in plain language — WebForge AI generates a complete, production-ready website (structured schema + renderer) or a full application (real code workspace, automated QA, security scan, production-readiness checks, one-click deploy).

> Dark/crimson SaaS design · Next.js 15 (App Router) · TypeScript · Tailwind v4 · shadcn-style UI · Prisma + PostgreSQL · Auth.js · OpenAI-compatible AI provider abstraction · Stripe · S3-compatible storage · Vercel-ready

---

## 🌐 Live links

| Where | URL |
|---|---|
| **Local preview (this machine)** | `http://localhost:58290` (dev server; pin with `npm run dev -- -p <port>`) |
| **Vercel deployment** | **Add yours after deploy:** `https://<your-project>.vercel.app` — see [Deploy to Vercel](#-deploy-to-vercel) |
| GitHub repo | `https://github.com/<your-user>/<your-repo>` — see [Push to GitHub](#-push-to-github) |
| Health check | `/api/health` (also runs as a Vercel Cron every 6h) |

---

## ✨ Features

**Website builder**
- Natural-language → structured website schema (pages, sections, theme, SEO) — never raw HTML as source of truth
- Live schema renderer preview (desktop / tablet / mobile, zoom, section selection)
- Visual inspector: design, layout, typography, colors, spacing, animations — real undo/redo history
- AI chat that *patches* the schema (ADD_SECTION, UPDATE_STYLE, UPDATE_THEME, …) via SSE streaming stages
- DB-backed templates, asset management (upload / AI images / CDN), real SEO checks + honest score
- Version history, restore, duplicate, compare · team invites with roles · custom domains · Stripe subscriptions (Free/Pro/Enterprise) with usage metering

**AI App Builder (Lovable-style)**
- Prompt → blueprint (modules, data models, API routes, env requirements) → real source files in a DB-backed workspace
- Code workspace: file tree, CodeMirror editor (TS/TSX/JSON/HTML/CSS), env vars (secrets encrypted), snapshots with restore, git commits per AI change
- **Automated QA pipeline** running real commands in a sandbox: `npm install → tsc --noEmit → strict lint → vitest run → production build → security scan → runtime (node dist/index.js)`
- **AI fix loop** (max 3 attempts) — analyzes failures, patches files, re-runs tests
- **Production readiness report** — real weighted checks (build/tests/security/env/db/auth/errors/SEO/a11y); critical failures **block** deployment
- "Test & Fix Everything" master pipeline · cancel support · activity log with live SSE events

---

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, Server Components, Route Handlers, Server Actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + custom design system (`src/app/globals.css`) |
| UI | shadcn-style primitives (`src/components/ui`), Lucide icons, Framer Motion |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`) |
| DB | PostgreSQL + Prisma 6 ORM (all models + enums + migrations) |
| Auth | Auth.js v5 (NextAuth beta) — email/password (bcrypt), Google & GitHub OAuth |
| AI | Provider abstraction (`src/providers/ai`) — any OpenAI-compatible endpoint (OpenAI, OpenRouter, Groq, Together, Azure, Ollama) |
| Storage | S3-compatible (AWS S3 / R2 / MinIO) with `local` fallback for dev |
| Billing | Stripe (checkout, customer portal, webhooks, subscriptions) |
| Testing | Vitest (unit + integration), `tsc --noEmit`, `next build` |
| Deployment | Vercel-ready (`vercel.json`), static publish pipeline built-in |

---

## 📁 Project structure (all files)

```
├── .env.example / .env.local        # env templates (copy .env.example → .env.local)
├── vercel.json                      # Vercel build + headers + cron
├── vitest.config.ts                 # test runner config
├── docker-compose.yml               # local Postgres (+ Redis) stack
├── prisma/
│   ├── schema.prisma                # ALL models: User, Account, Session, Subscription, Usage,
│   │                                #   Project, ProjectVersion, Page, Section, Component, Asset,
│   │                                #   AIConversation, AIMessage, Generation, Deployment,
│   │                                #   DeploymentLog, CustomDomain, EnvironmentVariable,
│   │                                #   Template, TemplateVersion, ProjectCollaborator,
│   │                                #   Invitation, ApiKey, WebhookEvent, AuditLog,
│   │                                #   AppFile, AppRun, AppCheckpoint
│   └── migrations/                  # SQL migrations (apply with prisma migrate deploy)
├── scripts/verify-sandbox.ts        # E2E proof of the QA pipeline without a DB
├── src/
│   ├── app/                         # All routes (marketing, auth, dashboard, studio, s/[slug], api/*)
│   │   ├── page.tsx                 # Landing page (approved design)
│   │   ├── (auth)/                  # login, signup, forgot/reset password, verify email
│   │   ├── (main)/                  # projects, settings, invite accept (app shell)
│   │   ├── studio/[id]/             # The editor: Website mode + App mode
│   │   ├── s/[slug]/                # Public published sites
│   │   └── api/                     # REST + SSE + webhooks + health
│   ├── components/
│   │   ├── ui/                      # button, input, switch, modal, toast, misc
│   │   ├── landing/                 # nav, hero, sections (faithful port)
│   │   ├── auth/                    # login/signup forms (server actions)
│   │   ├── studio/                  # topbar, canvas, chat, inspector, modals, studio-client
│   │   ├── preview/                 # schema renderer (the live site renderer)
│   │   └── app-builder/             # workspace, editor (CodeMirror), panels, types
│   ├── lib/
│   │   ├── server/                  # db, auth, session, usage, billing, deploy, assets,
│   │   │   │                        #   ai/ (config, structured, json repair), agents/,
│   │   │   │                        #   app/ (agent, runner, security, review, blueprint, …),
│   │   │   │                        #   data/, sse, rate-limit, crypto, email, audit, logger
│   │   ├── website/                 # website schema, zod validation, section catalog, ops
│   │   ├── seo/                     # real SEO checks engine
│   │   ├── templates/               # DB-backed template catalog
│   │   ├── actions/                 # server actions (auth, projects, studio, versions, …)
│   │   ├── client/                  # api fetch + SSE client, env
│   │   └── errors.ts, utils.ts, constants.ts
│   ├── providers/                   # ai/ (LLM, image), storage/ (S3/local), deployment/
│   ├── store/studio.ts              # zustand editor store with undo/redo
│   └── types/                       # website.ts, app.ts, next-auth.d.ts
```

---

## 🔧 Step 1 — Local setup

### 1.1 Requirements
- **Node.js 20+** (verified on Node 24) and npm
- **PostgreSQL 14+** — easiest via Docker (Docker Desktop) or any local Postgres
- (Optional) AI provider key, Stripe keys, S3 credentials, Google/GitHub OAuth apps

### 1.2 Install & configure
```bash
# 1) install dependencies (postinstall runs prisma generate)
npm install

# 2) create your env file (NEVER commit it)
cp .env.example .env.local
#    → open .env.local and set the values below

# 3) start Postgres (docker)
docker compose up -d

# 4) create tables (two options — pick ONE)
npx prisma migrate deploy     # (recommended, uses migrations/)
# OR
npx prisma db push            # (fast dev-only)

# 5) run the dev server
npm run dev                   # → http://localhost:3000
# if port 3000 is busy: npm run dev -- -p 58290
```

### 1.3 What to fill in `.env.local`

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Everything DB | `postgresql://webforge:webforge@localhost:5432/webforge?schema=public` matches docker-compose |
| `AUTH_SECRET` | Login/sessions | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` / `NEXTAUTH_URL` | Auth | `http://localhost:3000` (or your port) |
| `OPENAI_API_KEY` | AI generation/chat/app builder | Any OpenAI-compatible key; `AI_PROVIDER="openai"`; swap `OPENAI_BASE_URL` for OpenRouter/Groq/etc. |
| `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | OAuth login (optional) | Create apps at console.cloud.google.com / github.com/settings/developers |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, prices | Billing (optional) | Stripe dashboard; webhook URL: `https://<your-domain>/api/webhooks/stripe` |
| `S3_*` | Uploads (optional) | Leave `STORAGE_PROVIDER="local"` for dev |
| `REDIS_URL` | Rate-limit/queue (optional) | Leave empty — in-memory fallback |

> ⚠️ Without `DATABASE_URL` the app still runs — marketing pages work, DB flows show clear "not configured" messages. **No fake data anywhere.**

---

## ✅ Step 2 — Verify everything before you ship

```bash
npm run typecheck      # tsc --noEmit            → 0 errors
npm test               # vitest run              → 23 tests passing
npm run build          # next build              → all routes compile
npx tsx scripts/verify-sandbox.ts   # real QA pipeline E2E (no DB needed) → readiness 100/100
curl http://localhost:3000/api/health           # → {"status":"ok",...}
```

---

## 📦 Step 3 — Push all code to GitHub

```bash
# 1) make sure you're on main with everything staged
git status
git add -A
git commit -m "feat: WebForge AI — production-ready AI website & app builder"

# 2) your remote (already configured here):
#    origin = https://github.com/<your-user>/<your-repo>.git
git push -u origin main

# 3) (optional) create a fresh repo instead:
#    gh repo create webforge-ai --public --source . --push
```

> The existing `origin` in this checkout points to `suhailahmed77063-hash/Devwatch-ai.git`.
> It now contains the WebForge AI app (the old project's files were replaced). To publish
> under a new repo name, create a repo on github.com and `git remote set-url origin <new-url>`.

---

## ☁️ Step 4 — Deploy to Vercel

### Option A — Dashboard (recommended, no CLI)
1. Go to **vercel.com → Add New → Project**
2. Import your GitHub repo (WebForge AI)
3. Framework preset: **Next.js** (auto-detected from `vercel.json`)
4. Add environment variables in **Settings → Environment Variables** (same values as `.env.local`):
   `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` (`https://<your-project>.vercel.app`), `OPENAI_API_KEY`, … (add Stripe/S3 as needed)
5. **Deploy** → you get `https://<your-project>.vercel.app`
6. In the **Studio → Publish** flow, use the same domain for canonical URLs.

### Option B — CLI
```bash
npx vercel login                 # opens browser
npx vercel link                  # link the project
npx vercel env add DATABASE_URL production   # repeat per variable
npx vercel --prod                # build + deploy → prints your live URL
```

### Option C — temporary deploy without login (quick preview link)
```bash
npx vercel deploy --temporary --yes
```
This uploads and builds without an account; the generated link can be claimed later from your dashboard.

> **Postgres on Vercel:** Vercel has no built-in Postgres anymore (Neon/Vercel Postgres are separate). Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or Railway — copy their `DATABASE_URL` into Vercel env vars. Then run `npx prisma migrate deploy` against that URL (from your machine or a one-off build step).

---

## 🧪 Testing

| Command | What it verifies |
|---|---|
| `npm run typecheck` | Strict TypeScript across the whole app |
| `npm test` | 23 unit tests: blueprint/path safety, security scanner, production readiness |
| `npm run build` | Full production compile of all 26 routes |
| `npx tsx scripts/verify-sandbox.ts` | Real end-to-end QA chain on a generated app (install → typecheck → lint → tests → build → security → runtime → readiness) |

## 🔒 Security notes

- Passwords hashed with bcrypt · sessions via Auth.js secure cookies · CSRF/origin checks on mutating APIs
- Rate limiting on auth + AI endpoints · server-side authorization on every project route (never trust the client)
- Secrets never in frontend code; env vars encrypted at rest; `.env*` gitignored
- AI sandbox: path traversal blocked, file-type allowlist, 8 MB / 400-file caps, lockfiles & `node_modules` protected
- Automated security scan (hardcoded secrets, SQLi, XSS, plaintext passwords, unguarded routes, …)

## 📄 License

Private / commercial — contact the owner for licensing.