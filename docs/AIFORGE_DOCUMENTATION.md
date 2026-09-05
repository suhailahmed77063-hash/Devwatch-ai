# AIForge - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Authentication](#authentication)
6. [AI Website Builder](#ai-website-builder)
7. [AI App Builder](#ai-app-builder)
8. [Studio Editor](#studio-editor)
9. [Deployment](#deployment)
10. [Credit System](#credit-system)
11. [API Reference](#api-reference)
12. [Environment Variables](#environment-variables)
13. [Database Schema](#database-schema)
14. [Deployment Guide](#deployment-guide)
15. [Troubleshooting](#troubleshooting)

---

## Overview

AIForge is a full-stack AI-powered website and application builder SaaS platform. It enables users to create production-ready websites and web applications using natural language prompts, with automated testing, fixing, and deployment.

### Key Capabilities

- **AI Website Generation**: Create multi-page websites from text prompts
- **AI App Builder**: Generate full-stack TypeScript applications
- **Visual Editor**: Real-time website editing with live preview
- **Code Editor**: In-browser code editing with syntax highlighting
- **Automated QA**: Type checking, linting, testing, security scanning
- **One-Click Deploy**: Automatic deployment to production
- **Credit System**: Free and Pro plan management

---

## Features

### 🤖 AI Website Builder

| Feature | Description |
|---------|-------------|
| Prompt-to-Website | Describe your idea, AI generates complete website |
| Multi-Page Support | Generate multiple pages (home, about, pricing, etc.) |
| Section Types | Hero, Features, Pricing, Testimonials, FAQ, Contact, CTA |
| SEO Optimization | Auto-generated meta tags, Open Graph, JSON-LD |
| Responsive Design | Mobile, tablet, desktop breakpoints |
| Dark/Light Themes | Customizable color schemes |
| AI Image Generation | Optional AI-generated images for galleries |

### 🛠️ AI App Builder

| Feature | Description |
|---------|-------------|
| Full-Stack Generation | Backend (Express) + Frontend (React) + Database (Prisma) |
| Authentication | JWT-based auth with login/register |
| Database Schema | Auto-generated Prisma schema |
| API Routes | REST endpoints with validation |
| React Components | UI components with Tailwind CSS |
| Unit Tests | Vitest test generation |
| Auto-Fix Loop | AI fixes failing tests (up to 3 attempts) |
| Auto-Deploy | Automatic deployment after successful generation |

### 🎨 Visual Editor (Studio)

| Feature | Description |
|---------|-------------|
| Live Preview | Real-time website preview |
| Section Inspector | Edit section properties (text, colors, layout) |
| Drag & Drop | Reorder sections (planned) |
| Undo/Redo | Full history with keyboard shortcuts |
| Device Preview | Desktop, tablet, mobile views |
| Chat Panel | AI assistant for modifications |

### 💻 Code Editor

| Feature | Description |
|---------|-------------|
| Syntax Highlighting | TypeScript, JavaScript, JSON, HTML, CSS |
| File Explorer | Browse and manage generated files |
| Inline Editing | Edit files directly in browser |
| Save Changes | Manual save with Ctrl+S |
| Create/Rename/Delete | Full file management |

### 🚀 Deployment

| Feature | Description |
|---------|-------------|
| One-Click Publish | Deploy with single button |
| Auto-Deploy | Automatic deployment after generation |
| Custom Domains | Bring your own domain (Pro) |
| SSL/CDN | Automatic HTTPS and edge caching |
| Deployment History | View past deployments |
| Rollback | Restore previous versions |

### 🔐 Authentication & Security

| Feature | Description |
|---------|-------------|
| Email/Password | Traditional authentication |
| Google OAuth | Sign in with Google |
| GitHub OAuth | Sign in with GitHub |
| JWT Tokens | Secure session management |
| Password Hashing | bcrypt encryption |
| Rate Limiting | API abuse prevention |
| Input Validation | Zod schema validation |

### 💳 Billing & Credits

| Feature | Description |
|---------|-------------|
| Free Plan | 3 websites + 1 app + 1 published site/month |
| Pro Plan | Unlimited generations, 10 published sites |
| Stripe Integration | Subscription management |
| Credit Tracking | Real-time usage monitoring |
| Usage Dashboard | View remaining credits |

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Code Editor**: CodeMirror
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **API**: Express.js (generated apps)
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 6
- **Authentication**: NextAuth 5
- **AI Provider**: OpenAI API

### DevOps
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions
- **Database**: Neon PostgreSQL
- **Object Storage**: AWS S3 (optional)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (or Neon)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/aiforge.git
cd aiforge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Authentication
AUTH_SECRET="your-random-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AI Provider
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"  # Optional: for compatible providers

# App Configuration
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Deployment (optional)
DEPLOYMENT_PROVIDER="webforge"  # webforge | s3 | disk
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
```

---

## Authentication

### Email/Password Registration

```typescript
// POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Login

```typescript
// POST /api/auth/login
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### OAuth Login

1. **Google**: Click "Sign in with Google" → Redirect to Google → Callback
2. **GitHub**: Click "Sign in with GitHub" → Redirect to GitHub → Callback

### JWT Token

After login, JWT token is stored in httpOnly cookie:
```
authjs.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## AI Website Builder

### Creating a Website

1. Navigate to Projects → Create New Project
2. Switch to "Website" mode in Studio
3. Enter your prompt in the chat panel
4. AI generates complete website

### Example Prompts

```
"Build a landing page for a coffee subscription startup called BrewBox"
"Create a SaaS pricing page with 3 tiers"
"Make a restaurant website with menu, reservations, and contact"
"Design a portfolio for a freelance designer"
```

### Generated Sections

| Section | Description |
|---------|-------------|
| Hero | Main banner with headline and CTA |
| Features | Grid of feature cards |
| Pricing | Pricing table with tiers |
| Testimonials | Customer reviews |
| FAQ | Accordion FAQ section |
| Contact | Contact form or info |
| CTA | Call-to-action banner |
| Gallery | Image grid |
| Stats | Statistics display |
| Steps | How-it-works steps |

### SEO Features

- Auto-generated `<title>` and `<meta description>`
- Open Graph tags for social sharing
- JSON-LD structured data
- Canonical URLs
- Sitemap.xml generation
- Robots.txt generation

---

## AI App Builder

### Creating an App

1. Navigate to Projects → Create New Project
2. Switch to "App" mode in Studio
3. Enter your prompt
4. AI generates complete full-stack application

### Example Prompts

```
"Build a todo app with user authentication and PostgreSQL database"
"Create a blog platform with posts, comments, and user profiles"
"Make an e-commerce store with cart, checkout, and order history"
"Design a project management tool with tasks, teams, and deadlines"
```

### Generated Files Structure

```
project/
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # Express server
│   ├── routes/
│   │   ├── auth.ts        # Authentication routes
│   │   └── todos.ts       # Feature routes
│   ├── middleware/
│   │   └── auth.ts        # JWT middleware
│   ├── lib/
│   │   ├── db.ts          # Prisma client
│   │   └── auth.ts        # Auth utilities
│   ├── App.tsx            # React root component
│   ├── pages/
│   │   ├── Login.tsx      # Login page
│   │   ├── Register.tsx   # Register page
│   │   └── Dashboard.tsx  # Main dashboard
│   ├── components/
│   │   ├── TodoList.tsx   # Feature components
│   │   └── TodoItem.tsx
│   └── __tests__/
│       └── smoke.test.ts  # Unit tests
└── index.html             # HTML entry point
```

### Automated QA Pipeline

| Step | Tool | Description |
|------|------|-------------|
| 1. Install | npm | Install dependencies |
| 2. Type Check | tsc --noEmit | TypeScript validation |
| 3. Lint | tsc --noUnusedLocals | Code quality |
| 4. Unit Tests | vitest run | Test execution |
| 5. Build | tsc | Production build |
| 6. Security | Custom scanner | Vulnerability check |
| 7. Runtime | Node.js | Health check |

### Auto-Fix Loop

When QA fails, AI automatically:
1. Analyzes failure output
2. Reads relevant files
3. Generates fixes
4. Applies changes
5. Re-runs QA
6. Repeats up to 3 times

---

## Studio Editor

### Website Mode

- **Chat Panel**: Chat with AI to modify website
- **Preview Canvas**: Real-time website preview
- **Inspector Panel**: Edit section properties
- **Device Toggle**: Desktop/Tablet/Mobile views

### App Mode

- **File Explorer**: Browse generated files
- **Code Editor**: Edit files with syntax highlighting
- **Activity Log**: View AI actions and plan
- **QA Panel**: Run tests and view results
- **Checkpoints**: Restore previous versions

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save current file |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+Y | Redo (alternative) |

---

## Deployment

### Auto-Deploy

After successful app generation, AIForge automatically:
1. Validates project schema
2. Builds static artifact
3. Deploys to WebForge hosting
4. Returns live URL

### Manual Deploy

1. Click "Publish" button in Studio
2. Confirmation dialog appears
3. Deployment starts automatically
4. Live URL provided when ready

### Deployment Providers

| Provider | Description |
|----------|-------------|
| webforge | Default hosting (stored in DB) |
| s3 | AWS S3 + CloudFront |
| disk | Local file system |

### Custom Domains (Pro)

1. Go to Project Settings → Domains
2. Enter your domain (e.g., mysite.com)
3. Add DNS records:
   ```
   Type: CNAME
   Name: @
   Value: your-slug.webforge.app
   ```
4. Wait for verification
5. SSL certificate auto-provisioned

---

## Credit System

### Free Plan

| Resource | Monthly Limit |
|----------|---------------|
| Website Generations | 3 |
| App Generations | 1 |
| Published Sites | 1 |
| Team Members | 1 |
| Custom Domains | 0 |

### Pro Plan ($24/month)

| Resource | Monthly Limit |
|----------|---------------|
| Website Generations | Unlimited |
| App Generations | Unlimited |
| Published Sites | 10 |
| Team Members | 1 |
| Custom Domains | 10 |
| AI Images | ✓ |
| Advanced SEO | ✓ |
| Code Export | ✓ |

### Enterprise Plan (Custom)

| Resource | Monthly Limit |
|----------|---------------|
| Website Generations | Unlimited |
| App Generations | Unlimited |
| Published Sites | Unlimited |
| Team Members | Unlimited |
| Custom Domains | Unlimited |
| AI Images | ✓ |
| Advanced SEO | ✓ |
| Code Export | ✓ |
| Audit Logs | ✓ |
| Dedicated AI | ✓ |

### Checking Credits

```typescript
// GET /api/credits
Response:
{
  "plan": "FREE",
  "usage": {
    "month": "2026-09",
    "aiGenerations": { "used": 2, "limit": 3, "unlimited": false },
    "appGenerations": { "used": 0, "limit": 1, "unlimited": false },
    "published": { "used": 1, "limit": 1, "unlimited": false }
  }
}
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| GET | /api/auth/session | Get current session |

### Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List user projects |
| POST | /api/projects | Create new project |
| GET | /api/projects/:id | Get project details |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |

### AI Generation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/projects/:id/generate | Generate website |
| POST | /api/projects/:id/app-agent | Generate app |
| POST | /api/projects/:id/app-agent/cancel | Cancel generation |

### App Builder Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/:id/app-files | List files |
| GET | /api/projects/:id/app-files?path= | Get file content |
| POST | /api/projects/:id/app-files | Create/rename/delete file |
| PUT | /api/projects/:id/app-files | Save file |
| GET | /api/projects/:id/app-runs | List QA runs |
| POST | /api/projects/:id/app-runs | Run QA pipeline |
| GET | /api/projects/:id/app-checkpoints | List checkpoints |
| POST | /api/projects/:id/app-checkpoints | Restore checkpoint |

### Deployment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/:id/deployments | List deployments |
| POST | /api/projects/:id/deployments | Create deployment |
| GET | /api/projects/:id/deployments/:id/verify | Verify deployment |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/credits | Get credit usage |
| GET | /api/me | Get current user |
| POST | /api/webhooks/stripe | Stripe webhooks |

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host/db |
| AUTH_SECRET | NextAuth secret key | random-64-char-string |
| OPENAI_API_KEY | OpenAI API key | sk-... |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| OPENAI_BASE_URL | Custom AI endpoint | https://api.openai.com/v1 |
| AI_CHAT_MODEL | Chat model name | gpt-4o-mini |
| AI_GENERATION_MODEL | Generation model | gpt-4o |
| AI_AGENT_MODEL | Agent model | gpt-4o-mini |
| APP_URL | Application URL | http://localhost:3000 |
| GOOGLE_CLIENT_ID | Google OAuth client ID | - |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | - |
| GITHUB_CLIENT_ID | GitHub OAuth client ID | - |
| GITHUB_CLIENT_SECRET | GitHub OAuth secret | - |
| STRIPE_SECRET_KEY | Stripe secret key | - |
| STRIPE_PRICE_PRO_MONTHLY | Pro plan price ID | - |
| DEPLOYMENT_PROVIDER | Deployment provider | webforge |

---

## Database Schema

### Core Models

```
User
├── id, name, email, passwordHash
├── plan (FREE, PRO, ENTERPRISE)
├── stripeCustomerId
└── createdAt, updatedAt

Project
├── id, name, slug, description
├── framework, status
├── ownerId → User
├── currentSchema (JSON)
├── currentVersionId → ProjectVersion
└── createdAt, updatedAt

ProjectVersion
├── id, projectId, version
├── schema (JSON), message
├── createdById → User
└── createdAt

AppFile
├── id, projectId, path, content
├── size
└── createdAt, updatedAt

AppRun
├── id, projectId, kind, status
├── steps (JSON), summary
├── durationMs
└── startedAt, finishedAt

AppCheckpoint
├── id, projectId, version
├── message, files (JSON)
├── commitHash
└── createdAt

Deployment
├── id, projectId, status
├── provider, url
├── artifact (JSON)
├── isPublished
└── createdAt, updatedAt
```

### Authentication Models

```
Account (OAuth providers)
Session (Active sessions)
VerificationToken (Email verification)
```

### Billing Models

```
Subscription
├── id, userId, plan, status
├── stripeSubscriptionId
└── currentPeriodEnd

Usage
├── id, userId, kind, month
├── used, meta
└── createdAt, updatedAt
```

---

## Deployment Guide

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Deploy
   vercel --prod
   ```

2. **Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required variables

3. **Database Setup**
   - Create Neon PostgreSQL database
   - Copy connection string to DATABASE_URL
   - Run migrations on first deploy

4. **Custom Domain** (Optional)
   - Go to Project Settings → Domains
   - Add your domain
   - Configure DNS records

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/dbname
      - AUTH_SECRET=your-secret
      - OPENAI_API_KEY=sk-...
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=dbname
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## Troubleshooting

### Common Issues

#### "AI service is temporarily unavailable"

**Cause**: OpenAI API error (usually 400 or 500)

**Solution**:
1. Check OPENAI_API_KEY is valid
2. Verify model availability (gpt-4o, gpt-4o-mini)
3. Check API quota/limits
4. Review Vercel function logs

#### "DATABASE_URL is not configured"

**Cause**: Missing database connection

**Solution**:
1. Create Neon PostgreSQL database
2. Add DATABASE_URL to Vercel env vars
3. Redeploy application

#### "Unauthorized" error

**Cause**: Not logged in or session expired

**Solution**:
1. Clear browser cookies
2. Login again
3. Check AUTH_SECRET is set

#### Generation fails midway

**Cause**: Timeout or API limit

**Solution**:
1. Check Vercel function timeout (max 300s)
2. Review AI provider limits
3. Try smaller prompt
4. Check generation logs in database

#### Files not generating

**Cause**: Token limit reached

**Solution**:
1. Use shorter, more specific prompts
2. Break complex requests into steps
3. Check max_tokens configuration

### Debug Mode

```env
# Enable detailed logging
NODE_ENV=development

# Check Vercel logs
vercel logs aiforge-alpha.vercel.app

# Check function logs
vercel inspect aiforge-alpha.vercel.app --logs
```

### Health Check

```bash
# Check application health
curl https://aiforge-alpha.vercel.app/api/health

# Expected response:
{
  "app": "webforge-ai",
  "status": "ok",
  "time": "2026-09-05T10:00:00.000Z",
  "version": "1.0.0",
  "checks": {
    "database": "reachable",
    "ai": "configured",
    "storage": "local"
  }
}
```

---

## Support

- **Documentation**: https://github.com/your-username/aiforge/docs
- **Issues**: https://github.com/your-username/aiforge/issues
- **Email**: support@aiforge.app

---

## License

MIT License - see LICENSE file for details.

---

*Last updated: September 5, 2026*
