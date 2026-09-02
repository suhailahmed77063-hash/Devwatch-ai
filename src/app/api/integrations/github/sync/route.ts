import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  repositories,
  developers,
  organizations,
  organizationMembers,
  commits,
  pullRequests,
  securityFindings,
  ciRuns,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// POST /api/integrations/github/sync - Sync repos from GitHub
export async function POST(request: NextRequest) {
  try {
    const { githubToken } = await request.json();

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token is required" }, { status: 400 });
    }

    // 1. Get GitHub user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Invalid GitHub token" }, { status: 401 });
    }

    const githubUser = await userRes.json();

    // 2. Get or create organization
    let org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, githubUser.login))
      .limit(1);

    if (!org[0]) {
      // Find the user in our DB
      const dbUser = await db
        .select()
        .from(require("@/lib/db/schema").users)
        .where(eq(require("@/lib/db/schema").users.githubId, String(githubUser.id)))
        .limit(1);

      const userId = dbUser[0]?.id;

      if (!userId) {
        return NextResponse.json({ error: "User not found in database. Please login first." }, { status: 400 });
      }

      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: githubUser.name || githubUser.login,
          slug: githubUser.login,
          description: `GitHub organization for ${githubUser.login}`,
          githubOrg: githubUser.login,
          ownerId: userId,
        })
        .returning();

      org = [newOrg];

      // Add user as member
      await db.insert(organizationMembers).values({
        orgId: newOrg.id,
        userId,
        role: "super_admin",
      });
    }

    const orgId = org[0].id;

    // 3. Fetch repos from GitHub
    const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const githubRepos = await reposRes.json();

    if (!Array.isArray(githubRepos)) {
      return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
    }

    // 4. Sync each repo
    const syncedRepos = [];

    for (const repo of githubRepos) {
      // Check if repo already exists
      const existing = await db
        .select()
        .from(repositories)
        .where(eq(repositories.githubId, String(repo.id)))
        .limit(1);

      if (existing[0]) {
        // Update
        await db
          .update(repositories)
          .set({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            defaultBranch: repo.default_branch,
            isPrivate: repo.private,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(repositories.githubId, String(repo.id)));

        syncedRepos.push({ ...existing[0], action: "updated" });
      } else {
        // Insert
        const [newRepo] = await db
          .insert(repositories)
          .values({
            orgId,
            githubId: String(repo.id),
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            defaultBranch: repo.default_branch,
            isPrivate: repo.private,
            isActive: true,
            lastSyncedAt: new Date(),
          })
          .returning();

        syncedRepos.push({ ...newRepo, action: "created" });
      }
    }

    // 5. Fetch recent commits, PRs, and CI for each repo
    let totalCommits = 0;
    let totalPRs = 0;

    for (const repoData of syncedRepos) {
      try {
        // Fetch commits
        const commitsRes = await fetch(
          `https://api.github.com/repos/${repoData.fullName}/commits?per_page=30`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (commitsRes.ok) {
          const repoCommits = await commitsRes.json();
          if (Array.isArray(repoCommits)) {
            for (const c of repoCommits) {
              try {
                // Find or create developer
                let dev = null;
                if (c.author?.login) {
                  const existingDev = await db
                    .select()
                    .from(developers)
                    .where(eq(developers.githubUsername, c.author.login))
                    .limit(1);

                  if (existingDev[0]) {
                    dev = existingDev[0];
                  } else {
                    const [newDev] = await db
                      .insert(developers)
                      .values({
                        orgId,
                        githubId: String(c.author.id || ""),
                        githubUsername: c.author.login,
                        name: c.commit.author?.name || c.author.login,
                        avatarUrl: c.author.avatar_url,
                        email: c.commit.author?.email,
                      })
                      .returning();
                    dev = newDev;
                  }
                }

                // Insert commit (skip if duplicate)
                try {
                  await db.insert(commits).values({
                    repoId: repoData.id,
                    developerId: dev?.id || null,
                    sha: c.sha,
                    message: c.commit.message?.substring(0, 500),
                    branch: null,
                    authorName: c.commit.author?.name,
                    authorEmail: c.commit.author?.email,
                    additions: null,
                    deletions: null,
                    filesChanged: null,
                    verified: c.commit.verification?.verified || false,
                    committedAt: new Date(c.commit.author.date),
                  });
                  totalCommits++;
                } catch {
                  // Duplicate commit, skip
                }
              } catch {
                // Skip this commit
              }
            }
          }
        }

        // Fetch pull requests (recent)
        const prsRes = await fetch(
          `https://api.github.com/repos/${repoData.fullName}/pulls?state=all&per_page=20&sort=updated`,
          {
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (prsRes.ok) {
          const repoPRs = await prsRes.json();
          if (Array.isArray(repoPRs)) {
            for (const pr of repoPRs) {
              try {
                // Find developer
                let dev = null;
                if (pr.user?.login) {
                  const existingDev = await db
                    .select()
                    .from(developers)
                    .where(eq(developers.githubUsername, pr.user.login))
                    .limit(1);
                  dev = existingDev[0] || null;
                }

                const stateMap: Record<string, string> = {
                  open: "open",
                  closed: "closed",
                  merged: "merged",
                };

                try {
                  await db.insert(pullRequests).values({
                    repoId: repoData.id,
                    developerId: dev?.id || null,
                    githubId: String(pr.id),
                    number: pr.number,
                    title: pr.title,
                    body: pr.body?.substring(0, 2000),
                    state: (stateMap[pr.state] || "open") as "open" | "closed" | "merged" | "draft",
                    branch: pr.head?.ref,
                    baseBranch: pr.base?.ref || "main",
                    additions: pr.additions || 0,
                    deletions: pr.deletions || 0,
                    changedFiles: pr.changed_files || 0,
                    ciStatus: pr.merged_at ? "success" : pr.draft ? "pending" : "success",
                    mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
                    closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
                    createdAt: new Date(pr.created_at),
                  });
                  totalPRs++;
                } catch {
                  // Duplicate PR, skip
                }
              } catch {
                // Skip this PR
              }
            }
          }
        }
      } catch {
        // Skip repo sync errors
      }
    }

    // 6. Setup webhooks for active repos
    const webhookResults = [];
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

    for (const repoData of syncedRepos) {
      if (repoData.action === "created" || !repoData.webhookId) {
        try {
          const webhookRes = await fetch(
            `https://api.github.com/repos/${repoData.fullName}/hooks`,
            {
              method: "POST",
              headers: {
                Authorization: `token ${githubToken}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: "web",
                active: true,
                events: ["push", "pull_request", "pull_request_review", "check_run"],
                config: {
                  url: `${process.env.AUTH_URL || "https://devwatch-ai.vercel.app"}/api/webhooks/github`,
                  content_type: "json",
                  secret: webhookSecret,
                },
              }),
            }
          );

          if (webhookRes.ok) {
            const webhook = await webhookRes.json();
            await db
              .update(repositories)
              .set({ webhookId: webhook.id })
              .where(eq(repositories.id, repoData.id));

            webhookResults.push({ repo: repoData.name, status: "created", webhookId: webhook.id });
          } else {
            webhookResults.push({ repo: repoData.name, status: "failed" });
          }
        } catch {
          webhookResults.push({ repo: repoData.name, status: "error" });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedRepos.length} repositories`,
      stats: {
        repositories: syncedRepos.length,
        commits: totalCommits,
        pullRequests: totalPRs,
        webhooks: webhookResults.length,
      },
      repos: syncedRepos.map((r) => ({
        name: r.name,
        fullName: r.fullName,
        action: r.action,
      })),
      webhooks: webhookResults,
    });
  } catch (error) {
    console.error("GitHub sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
