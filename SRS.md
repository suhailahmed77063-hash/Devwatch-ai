# DevWatch AI — Software Requirements Specification (SRS)

## 1. Overview

**DevWatch AI** is an AI-powered Engineering Intelligence Platform that monitors development teams, analyzes Git activity, detects security risks, and provides AI-powered insights for engineering managers and DevOps teams.

**Live URL:** https://devwatch-ai.vercel.app  
**GitHub:** https://github.com/suhailahmed77063-hash/Devwatch-ai  
**Stack:** Next.js 16, TypeScript, Drizzle ORM, Neon PostgreSQL, NextAuth v5, OpenRouter AI

---

## 2. Authentication & User Management

### 2.1 Login Methods

| Method | How it Works |
|--------|-------------|
| **GitHub OAuth** | Click "Continue with GitHub" → Authorize → Auto-creates user in DB → Redirect to Dashboard |
| **Email/Password** | Sign up at `/signup` → Login at `/login` → JWT session created |

### 2.2 Signup Process
1. Go to `/signup`
2. Enter Name, Email, Password
3. Password hashed with bcrypt (12 rounds)
4. User created in `users` table
5. Redirect to `/login`

### 2.3 Login Process
1. Go to `/login`
2. Enter Email + Password OR click "Continue with GitHub"
3. NextAuth validates credentials or GitHub OAuth
4. JWT session token set as cookie (`authjs.session-token`)
5. Middleware allows access to dashboard routes

### 2.4 Logout
1. Click user avatar (top-right corner)
2. Click "Sign Out"
3. Session destroyed → Redirect to `/login`

### 2.5 User Profile
- Displayed in header dropdown (top-right)
- Shows avatar/initials, name, email
- Settings link for account management

---

## 3. Adding GitHub Repositories

### 3.1 Method 1: Automatic Sync (Recommended)

**Step 1:** Generate GitHub Personal Access Token
```
GitHub → Settings → Developer settings → Personal access tokens → Generate new token
Scopes: repo, read:org, admin:repo_hook
```

**Step 2:** Use the Sync API
```bash
POST https://devwatch-ai.vercel.app/api/integrations/github/sync
Body: { "githubToken": "ghp_xxxx" }
```

**What happens automatically:**
- All your repos are fetched from GitHub
- Repos added to `repositories` table
- Recent commits imported (last 30 per repo)
- Recent PRs imported (last 20 per repo)
- Developers auto-created from commit authors
- Webhooks auto-created on each repo

### 3.2 Method 2: Manual Add

**Step 1:** Call the API
```bash
POST https://devwatch-ai.vercel.app/api/repositories
Body: { 
  "name": "my-repo", 
  "fullName": "username/my-repo",
  "githubToken": "ghp_xxxx" 
}
```

**Step 2:** Repo appears in Dashboard → Repositories

### 3.3 Method 3: Via UI
1. Go to Integrations page
2. Follow the GitHub setup guide
3. Enter your Personal Access Token
4. Repos sync automatically

---

## 4. Adding Developers

Developers are **automatically added** when:
- A GitHub repo is synced (commit authors become developers)
- A user signs up via GitHub OAuth
- A webhook event contains a new author

**Manual addition:** Developers are created automatically — no manual process needed.

---

## 5. Webhooks (Real-Time Updates)

### 5.1 Setup
When repos are synced via the GitHub Sync API, webhooks are **automatically created** on each repo.

### 5.2 Events Tracked
| Event | What Happens |
|-------|-------------|
| `push` | Commits imported, activity logged |
| `pull_request` | PR created/updated/merged in database |
| `pull_request_review` | Review saved |
| `check_run` / `check_suite` | CI status tracked, alerts for failures |

### 5.3 Webhook URL
```
https://devwatch-ai.vercel.app/api/webhooks/github
```

### 5.4 Webhook Secret
```
63327746c8e6b920f9bf67c35aa6518093661b2bf633a2138482fe7b5cace69c
```
(GITHUB_WEBHOOK_SECRET environment variable)

---

## 6. Security Scanning

### 6.1 How to Run a Scan
```bash
POST https://devwatch-ai.vercel.app/api/security/scan
Body: { "githubToken": "ghp_xxxx" }
```

### 6.2 What Gets Scanned
- **Hardcoded secrets** — API keys, passwords, tokens, AWS keys, JWT tokens
- **Code vulnerabilities** — eval(), innerHTML, SQL injection, command injection
- **Code quality** — console.log, empty catch blocks, TODO comments
- **Dependencies** — Known CVEs in npm packages

### 6.3 Results
- Findings saved to `security_findings` table
- Visible on Security page
- Visible on Repository detail page
- Alerts generated for critical findings

---

## 7. AI Code Review

### 7.1 How to Request a Review

**Method 1: AI Manager (Natural Language)**
```
Go to /ai-manager → Type: "Review PR #6 from ai-multimodal"
```

**Method 2: API Call**
```bash
POST https://devwatch-ai.vercel.app/api/ai/review
Body: {
  "repoId": "repo-uuid",
  "prNumber": 6,
  "githubToken": "ghp_xxxx"   // optional if GITHUB_TOKEN env var set
}
```

### 7.2 What Gets Reviewed
- **All code files** fetched from GitHub (up to 50 files)
- Each line scanned for 12+ security patterns
- Dependencies checked for known vulnerabilities
- Results include: file, line number, severity, fix recommendation

### 7.3 Review Output
```
## Code Review: PR #6 — razor payement
**Files Scanned:** 47
**Scan Duration:** 7s

### Summary
- 🔴 Critical: 0
- 🟠 High: 0
- 🟡 Medium: 0
- 🔵 Low: 4

### Dependency Vulnerabilities
- 🔴 axios@^1.13.5: SSRF (CVE-2023-45857)

### Files with Issues
- `app/api/ai-multi-model/route.js` — 2 issue(s)
```

### 7.4 Review History
- All reviews saved to `ai_analysis` table
- Viewable on Releases page

---

## 8. AI Engineering Manager (Chat)

### 8.1 Access
Go to `/ai-manager` → Ask questions in natural language

### 8.2 Supported Questions

| Question | What You Get |
|----------|-------------|
| "What changed this week?" | Commit count, PR count, security findings |
| "Which PRs are risky?" | PRs with risk score > 60 |
| "Are there security problems?" | Critical/high findings breakdown |
| "Who is blocked?" | PRs with failing CI, high risk scores |
| "What should we focus on?" | Priority recommendations |
| "Summarize the team's work" | Full team activity overview |
| "Review PR #6 from ai-multimodal" | Real code review of that PR |
| "Is the latest release safe to deploy?" | Release readiness score |
| "Why is this release blocked?" | Deployment gate reasons |
| "What are the biggest risks?" | Release risk analysis |
| "What caused the last deployment failure?" | Rollback recommendation |

### 8.3 How It Works
1. User asks a question
2. System fetches real data from database (repos, commits, PRs, security, releases)
3. Data sent to AI (OpenRouter API) with system prompt
4. AI generates response grounded in actual data
5. Response displayed in chat interface

---

## 9. Release Readiness & Deployment Guardian

### 9.1 Create a Release
```bash
POST https://devwatch-ai.vercel.app/api/releases
Body: {
  "orgId": "org-uuid",
  "version": "v2.4.0",
  "title": "Release v2.4.0"
}
```

### 9.2 What Gets Analyzed
- Open Pull Requests
- Recent commits
- CI/CD status
- Test results
- Security vulnerabilities
- Code findings
- Dependency vulnerabilities
- Previous deployment failures

### 9.3 Release Score (0-100)
| Score | Status | Meaning |
|-------|--------|---------|
| 90-100 | 🟢 Ready to Deploy | All checks pass |
| 70-89 | 🟡 Deploy with Caution | Some warnings |
| 50-69 | 🟠 Needs Attention | Issues to address |
| 0-49 | 🔴 Not Ready | Critical blockers |

### 9.4 Deployment Gate
Blocks deployment if:
- Critical security vulnerability found
- CI pipeline failing
- Test pass rate < 80%

### 9.5 Deploy a Release
```bash
POST https://devwatch-ai.vercel.app/api/releases/deploy
Body: {
  "releaseId": "release-uuid",
  "environment": "production",
  "provider": "vercel"
}
```

### 9.6 Rollback Recommendations
If deployment fails, AI generates:
- Most likely cause
- Related commit/PR
- Recommended rollback version
- Investigation steps

---

## 10. Dashboard Pages

| Page | URL | Data Source |
|------|-----|-------------|
| Dashboard | `/dashboard` | Real DB: commits, PRs, security, alerts |
| Repositories | `/repositories` | Real DB: all synced repos |
| Repository Detail | `/repositories/[id]` | Real DB: commits, PRs, CI, vulnerabilities |
| Pull Requests | `/pull-requests` | Real DB: all PRs with risk scores |
| PR Detail | `/pull-requests/[id]` | Real DB: reviews, code findings, security |
| Commits | `/commits` | Real DB: all commits from GitHub |
| Security | `/security` | Real DB: security scan results |
| Vulnerabilities | `/vulnerabilities` | Real DB: dependency vulnerabilities |
| Developers | `/developers` | Real DB: GitHub contributors |
| Developer Detail | `/developers/[id]` | Real DB: commits, PRs, stats |
| Projects | `/projects` | Real DB: project data |
| Alerts | `/alerts` | Real DB: CI failures, high-risk PRs |
| Reports | `/reports` | Real DB: weekly reports |
| AI Manager | `/ai-manager` | Real DB + AI API |
| Releases | `/releases` | Real DB: release readiness |
| Release History | `/releases/history` | Real DB: all releases |
| Integrations | `/integrations` | Setup guides |
| Settings | `/settings` | User settings |

---

## 11. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth JWT secret (min 32 chars) |
| `AUTH_URL` | ✅ | Production URL (https://domain.vercel.app) |
| `NEXTAUTH_URL` | ✅ | Same as AUTH_URL |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App Client Secret |
| `GITHUB_WEBHOOK_SECRET` | ⚪ | For webhook signature validation |
| `AI_API_KEY` | ✅ | OpenRouter API key |
| `AI_BASE_URL` | ✅ | https://openrouter.ai/api/v1 |
| `AI_MODEL` | ✅ | minimax/minimax-m3:free |
| `GITHUB_TOKEN` | ⚪ | For code review feature |

---

## 12. GitHub OAuth App Setup

1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - Application name: `DevWatch AI`
   - Homepage URL: `https://devwatch-ai.vercel.app`
   - Authorization callback URL: `https://devwatch-ai.vercel.app/api/auth/callback/github`
4. Click "Register application"
5. Copy Client ID
6. Generate Client Secret
7. Add both to Vercel environment variables

---

## 13. Database Schema

### Core Tables
- `users` — User accounts (email, password hash, GitHub ID)
- `organizations` — Team/org grouping
- `repositories` — GitHub repos (name, fullName, webhookId)
- `developers` — GitHub contributors (username, avatar)
- `commits` — Git commits (sha, message, additions, deletions)
- `pull_requests` — PRs (number, title, state, riskScore)
- `pull_request_reviews` — PR reviews
- `code_findings` — Code analysis results
- `security_findings` — Security scan results
- `vulnerabilities` — Dependency vulnerabilities
- `ci_runs` — CI/CD pipeline runs
- `alerts` — System alerts
- `projects` — Project tracking
- `tasks` — Task management
- `milestones` — Project milestones

### Release Management Tables
- `releases` — Release versions with readiness scores
- `release_commits` — Commits in a release
- `release_pull_requests` — PRs in a release
- `release_checks` — Deployment checklist items
- `release_risks` — Identified risks
- `deployment_events` — Deployment tracking
- `deployment_environments` — Environment config
- `rollback_recommendations` — AI rollback suggestions
- `deployment_gate_config` — Gate conditions
- `release_notifications` — Release alerts

---

## 14. Deployment

### 14.1 Vercel Deployment
1. Push code to GitHub
2. Import repo in Vercel
3. Add all environment variables
4. Deploy

### 14.2 Auto-Deploy
- Every `git push` to `main` triggers automatic deployment
- Vercel builds and deploys in ~60 seconds

### 14.3 Manual Redeploy
1. Vercel → Deployments
2. Click latest deployment → "..." → "Redeploy"

---

## 15. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |
| `/api/auth/signup` | POST | Create new user |
| `/api/ai/chat` | POST | AI chat with engineering data |
| `/api/ai/review` | POST | AI code review |
| `/api/repositories` | GET/POST | List/add repos |
| `/api/integrations/github/sync` | POST | Sync repos from GitHub |
| `/api/security/scan` | POST | Scan repos for vulnerabilities |
| `/api/releases` | GET/POST | List/create releases |
| `/api/releases/[id]` | GET/PATCH | Release details/update |
| `/api/releases/deploy` | GET/POST/PATCH | Deployment tracking |
| `/api/releases/notifications` | GET/PATCH | Release notifications |
| `/api/webhooks/github` | POST | GitHub webhook receiver |

---

## 16. Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| Language | TypeScript |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | NextAuth v5 (GitHub + Credentials) |
| AI | OpenRouter API (minimax/minimax-m3:free) |
| Hosting | Vercel |
| UI | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Charts | Recharts |

---

*Document generated by DevWatch AI — September 2026*
