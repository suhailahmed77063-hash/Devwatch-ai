import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrThrow } from "@/lib/server/session";
import { assertAccess } from "@/lib/server/access";
import { requireDb } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { logger } from "@/lib/server/logger";
import { logAudit } from "@/lib/server/audit";
import {
  getCurrentUser, listRepos, createRepo, cloneRepoToFiles,
  createOrUpdateFiles, listBranches, createBranch,
  listPullRequests, createPullRequest, validateToken,
  type GitHubConfig,
} from "@/lib/server/github";
import { readAppFiles, applyFileOps } from "@/lib/server/app/data";
import { encryptSecret, decryptSecret } from "@/lib/server/crypto";

export const dynamic = "force-dynamic";

function getGitHubToken(): GitHubConfig | null {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (!token) return null;
  return { token };
}

/**
 * POST /api/projects/:id/github
 *
 * Actions:
 *   status    — Check if GitHub is connected
 *   connect   — Store GitHub token for the project
 *   repos     — List user's GitHub repositories
 *   import    — Import files from a GitHub repo
 *   export    — Export project files to a GitHub repo
 *   commit    — Commit changes to connected repo
 *   branches  — List branches in connected repo
 *   pr        — Create a pull request
 *   create-repo — Create a new GitHub repository
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    const { projectId } = await assertAccess(id, user.id, "EDITOR");
    const body = await req.json();
    const action = body.action as string;
    const db = requireDb();

    // ── Status ──
    if (action === "status") {
      const project = await db.project.findUnique({ where: { id: projectId }, select: { aiConfig: true } });
      const config = (project?.aiConfig as any) ?? {};
      const connected = !!(config.githubToken || process.env.GITHUB_TOKEN);
      const repo = config.githubRepo ?? null;
      return NextResponse.json({ connected, repo, hasGlobalToken: !!process.env.GITHUB_TOKEN });
    }

    // ── Connect (store token) ──
    if (action === "connect") {
      const tokenSchema = z.object({ token: z.string().min(1) });
      const parsed = tokenSchema.parse(body);

      // Validate token
      const valid = await validateToken({ token: parsed.token });
      if (!valid) return NextResponse.json({ error: "Invalid GitHub token" }, { status: 400 });

      const githubUser = await getCurrentUser({ token: parsed.token });

      // Store encrypted token in project config
      const project = await db.project.findUnique({ where: { id: projectId }, select: { aiConfig: true } });
      const existing = (project?.aiConfig as any) ?? {};
      await db.project.update({
        where: { id: projectId },
        data: { aiConfig: { ...existing, githubToken: encryptSecret(parsed.token), githubUser: githubUser.login } as any },
      });

      await logAudit({ actorId: user.id, projectId, action: "github.connect", entity: "Project", entityId: projectId, meta: { user: githubUser.login } });

      return NextResponse.json({ success: true, user: githubUser });
    }

    // ── Disconnect ──
    if (action === "disconnect") {
      const project = await db.project.findUnique({ where: { id: projectId }, select: { aiConfig: true } });
      const existing = (project?.aiConfig as any) ?? {};
      const { githubToken, githubRepo, ...rest } = existing;
      await db.project.update({ where: { id: projectId }, data: { aiConfig: rest } });
      return NextResponse.json({ success: true });
    }

    // Get config (project token or global)
    const project = await db.project.findUnique({ where: { id: projectId }, select: { aiConfig: true } });
    const config = (project?.aiConfig as any) ?? {};
    let ghConfig: GitHubConfig;
    if (config.githubToken) {
      ghConfig = { token: decryptSecret(config.githubToken) };
    } else if (process.env.GITHUB_TOKEN) {
      ghConfig = { token: process.env.GITHUB_TOKEN };
    } else {
      return NextResponse.json({ error: "GitHub not connected. Please connect first." }, { status: 400 });
    }

    // ── List repos ──
    if (action === "repos") {
      const repos = await listRepos(ghConfig, body.page ?? 1);
      return NextResponse.json({ repos });
    }

    // ── Import from GitHub ──
    if (action === "import") {
      const importSchema = z.object({ owner: z.string(), repo: z.string(), branch: z.string().optional() });
      const parsed = importSchema.parse(body);
      const files = await cloneRepoToFiles(ghConfig, parsed.owner, parsed.repo, parsed.branch ?? "main");

      // Apply imported files
      const ops = Object.entries(files).map(([path, content]) => ({ kind: "edit" as const, path, content }));
      const { validateOps } = await import("@/lib/server/app/blueprint");
      const validated = validateOps(ops);
      const labels = await applyFileOps(projectId, validated, user.id);

      // Link repo to project
      await db.project.update({
        where: { id: projectId },
        data: { aiConfig: { ...config, githubRepo: `${parsed.owner}/${parsed.repo}`, githubBranch: parsed.branch ?? "main" } as any },
      });

      await logAudit({ actorId: user.id, projectId, action: "github.import", entity: "Project", entityId: projectId, meta: { repo: `${parsed.owner}/${parsed.repo}`, files: labels.length } });

      return NextResponse.json({ success: true, files: labels.length, labels });
    }

    // ── Export to GitHub ──
    if (action === "export") {
      const exportSchema = z.object({ owner: z.string(), repo: z.string(), branch: z.string().optional(), message: z.string().optional() });
      const parsed = exportSchema.parse(body);

      const files = await readAppFiles(projectId);
      const fileEntries = Object.entries(files).map(([path, content]) => ({ path, content }));
      const branch = parsed.branch ?? "main";

      const commit = await createOrUpdateFiles(ghConfig, parsed.owner, parsed.repo, fileEntries, parsed.message ?? "Export from AIForge", branch);

      // Link repo to project
      await db.project.update({
        where: { id: projectId },
        data: { aiConfig: { ...config, githubRepo: `${parsed.owner}/${parsed.repo}`, githubBranch: branch } as any },
      });

      await logAudit({ actorId: user.id, projectId, action: "github.export", entity: "Project", entityId: projectId, meta: { repo: `${parsed.owner}/${parsed.repo}`, files: fileEntries.length, sha: commit.sha } });

      return NextResponse.json({ success: true, commit });
    }

    // ── Commit to linked repo ──
    if (action === "commit") {
      const commitSchema = z.object({ message: z.string().min(1), branch: z.string().optional() });
      const parsed = commitSchema.parse(body);
      const repoFullName = config.githubRepo;
      if (!repoFullName) return NextResponse.json({ error: "No repo linked. Export first." }, { status: 400 });

      const [owner, repo] = repoFullName.split("/");
      const branch = parsed.branch ?? config.githubBranch ?? "main";

      const files = await readAppFiles(projectId);
      const fileEntries = Object.entries(files).map(([path, content]) => ({ path, content }));
      const commit = await createOrUpdateFiles(ghConfig, owner, repo, fileEntries, parsed.message, branch);

      await logAudit({ actorId: user.id, projectId, action: "github.commit", entity: "Project", entityId: projectId, meta: { repo: repoFullName, sha: commit.sha, message: parsed.message } });

      return NextResponse.json({ success: true, commit });
    }

    // ── List branches ──
    if (action === "branches") {
      const repoFullName = config.githubRepo;
      if (!repoFullName) return NextResponse.json({ error: "No repo linked" }, { status: 400 });
      const [owner, repo] = repoFullName.split("/");
      const branches = await listBranches(ghConfig, owner, repo);
      return NextResponse.json({ branches });
    }

    // ── Create branch ──
    if (action === "create-branch") {
      const branchSchema = z.object({ name: z.string(), from: z.string().optional() });
      const parsed = branchSchema.parse(body);
      const repoFullName = config.githubRepo;
      if (!repoFullName) return NextResponse.json({ error: "No repo linked" }, { status: 400 });
      const [owner, repo] = repoFullName.split("/");
      await createBranch(ghConfig, owner, repo, parsed.name, parsed.from ?? config.githubBranch ?? "main");
      return NextResponse.json({ success: true });
    }

    // ── List PRs ──
    if (action === "prs") {
      const repoFullName = config.githubRepo;
      if (!repoFullName) return NextResponse.json({ error: "No repo linked" }, { status: 400 });
      const [owner, repo] = repoFullName.split("/");
      const prs = await listPullRequests(ghConfig, owner, repo, body.state ?? "open");
      return NextResponse.json({ prs });
    }

    // ── Create PR ──
    if (action === "create-pr") {
      const prSchema = z.object({ title: z.string().min(1), head: z.string(), base: z.string(), body: z.string().optional() });
      const parsed = prSchema.parse(body);
      const repoFullName = config.githubRepo;
      if (!repoFullName) return NextResponse.json({ error: "No repo linked" }, { status: 400 });
      const [owner, repo] = repoFullName.split("/");
      const pr = await createPullRequest(ghConfig, owner, repo, parsed.title, parsed.head, parsed.base, parsed.body);

      await logAudit({ actorId: user.id, projectId, action: "github.pr", entity: "Project", entityId: projectId, meta: { repo: repoFullName, pr: pr.number } });

      return NextResponse.json({ success: true, pr });
    }

    // ── Create repo ──
    if (action === "create-repo") {
      const repoSchema = z.object({ name: z.string().min(1), description: z.string().optional(), private: z.boolean().optional() });
      const parsed = repoSchema.parse(body);
      const repo = await createRepo(ghConfig, parsed.name, { description: parsed.description, private: parsed.private });

      // Link to project
      await db.project.update({
        where: { id: projectId },
        data: { aiConfig: { ...config, githubRepo: repo.full_name, githubBranch: repo.default_branch } as any },
      });

      await logAudit({ actorId: user.id, projectId, action: "github.create_repo", entity: "Project", entityId: projectId, meta: { repo: repo.full_name } });

      return NextResponse.json({ success: true, repo });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    logger.error("github.route.error", { error: (e as Error).message });
    return jsonError(e);
  }
}

/** GET — return GitHub connection status */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUserOrThrow();
    const { id } = await params;
    await assertAccess(id, user.id, "VIEWER");
    const db = requireDb();
    const project = await db.project.findUnique({ where: { id }, select: { aiConfig: true } });
    const config = (project?.aiConfig as any) ?? {};

    return NextResponse.json({
      connected: !!(config.githubToken || process.env.GITHUB_TOKEN),
      repo: config.githubRepo ?? null,
      branch: config.githubBranch ?? "main",
      user: config.githubUser ?? null,
      hasGlobalToken: !!process.env.GITHUB_TOKEN,
    });
  } catch (e) {
    return jsonError(e);
  }
}
