# DevWatch AI

**AI-powered Engineering Intelligence Platform**

DevWatch AI continuously monitors your development team and codebase, analyzes Git activity, detects security risks, tracks project progress, and provides AI-powered reports and alerts.

## Features

- 📊 **Main Dashboard** - Real-time engineering metrics with trend analysis
- 🔗 **GitHub Integration** - OAuth, webhooks, and API monitoring
- 🤖 **AI Code Analysis** - Security and code quality analysis on every PR
- 🛡️ **Security Scanning** - Deterministic secret scanning, SAST, dependency checks
- 🎯 **PR Risk Scoring** - 0-100 risk scores for every pull request
- 💬 **AI Engineering Manager** - ChatGPT-style interface grounded in your project data
- 📁 **Project Tracking** - Features, tasks, milestones, and sprint progress
- 👥 **Developer Profiles** - Activity metrics with appropriate context
- 🔔 **Smart Alerts** - Configurable notification system
- 📋 **Automated Reports** - Daily and weekly engineering reports
- 🌙 **Dark/Light Mode** - Professional theming
- 🔒 **Role-based Access Control** - Organization-level data isolation

## Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Auth**: NextAuth/Auth.js with GitHub OAuth + Credentials
- **AI**: Configurable AI provider (OpenAI, Claude, etc.)
- **GitHub**: Octokit, GitHub Webhooks

## Getting Started

### Prerequisites

- Node.js 18+
- A Neon PostgreSQL database
- GitHub OAuth App (optional)

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd devwatch-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URL and other secrets.

4. Set up the database:
   ```bash
   npx drizzle-kit push
   ```

5. (Optional) Seed demo data:
   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

### Demo Mode

For demo purposes, you can sign in with:
- Email: `admin@devwatch.ai`
- Password: `admin123`

Or seed the database with demo data using the seed API endpoint.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `AUTH_SECRET` | NextAuth secret (min 32 chars) | Yes |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | Optional |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | Optional |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook signature secret | Optional |
| `AI_API_KEY` | AI provider API key | Optional |
| `AI_BASE_URL` | AI provider base URL | Optional |
| `AI_MODEL` | AI model name | Optional |

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (dashboard)/         # Dashboard layout and pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── repositories/    # Repository monitoring
│   │   ├── pull-requests/   # PR tracking with risk scores
│   │   ├── commits/         # Commit history
│   │   ├── security/        # Security findings
│   │   ├── vulnerabilities/ # Dependency vulnerabilities
│   │   ├── developers/      # Developer profiles
│   │   ├── projects/        # Project management
│   │   ├── alerts/          # Alert system
│   │   ├── reports/         # Automated reports
│   │   ├── ai-manager/      # AI Engineering Manager
│   │   ├── settings/        # Configuration
│   │   └── integrations/    # Service integrations
│   ├── api/
│   │   ├── webhooks/github/ # GitHub webhook handler
│   │   ├── ai/chat/         # AI chat endpoint
│   │   └── seed/            # Demo data seeder
│   └── layout.tsx
├── components/
│   ├── layout/              # Layout components (sidebar)
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── db/
│   │   ├── index.ts         # Database connection
│   │   ├── schema.ts        # Drizzle schema (20+ tables)
│   │   └── seed.ts          # Demo data seeder
│   ├── auth.ts              # NextAuth configuration
│   ├── github.ts            # GitHub API service
│   ├── ai.ts                # AI analysis service
│   ├── security.ts          # Security scanning
│   ├── types.ts             # Shared types
│   └── utils.ts             # Utility functions
└── types/                   # TypeScript types
```

## Database Schema

The application includes 20+ database tables with proper relationships, indexes, and UUIDs:

- `users`, `organizations`, `organization_members`
- `repositories`, `developers`, `projects`
- `milestones`, `tasks`, `project_repositories`
- `commits`, `commit_files`
- `pull_requests`, `pull_request_reviews`
- `code_findings`, `security_findings`, `vulnerabilities`
- `ci_runs`, `alerts`, `reports`
- `ai_analysis`, `activity_events`
- `integrations`, `webhook_events`

## Webhook Architecture

```
GitHub Event
→ Validate Signature (HMAC SHA-256)
→ Idempotency Check (duplicate detection)
→ Store Raw Event
→ Process Event (push/PR/review/CI/security)
→ Save Results to Database
→ Generate Alert if Necessary
→ Update Dashboard Metrics
```

## Security Features

- ✅ Webhook signature validation
- ✅ Organization-level data isolation
- ✅ Server-side API secrets (never exposed to frontend)
- ✅ Role-based access control
- ✅ Input validation with Zod
- ✅ Deterministic security scanning
- ✅ Audit logging
- ✅ No code sent to external AI providers without authorization

## Privacy

DevWatch AI is an engineering monitoring tool, not employee surveillance. Activity metrics represent engineering activity, not performance or productivity judgments. The system provides factual engineering activity and project signals with appropriate context.

## License

MIT
