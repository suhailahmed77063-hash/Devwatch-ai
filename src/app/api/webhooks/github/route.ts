import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  webhookEvents,
  commits,
  pullRequests,
  pullRequestReviews,
  alerts,
  activityEvents,
  ciRuns,
  repositories,
  organizations,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Get actual org ID from database
async function getOrgId(): Promise<string> {
  const org = await db.select().from(organizations).limit(1);
  if (org[0]) return org[0].id;
  // Create default org if none exists
  const users = await db.select().from(require("@/lib/db/schema").users).limit(1);
  if (users[0]) {
    const [newOrg] = await db.insert(organizations).values({
      name: "Default",
      slug: "default",
      ownerId: users[0].id,
    }).returning();
    return newOrg.id;
  }
  throw new Error("No user found");
}

// Get repo ID from GitHub full name
async function getRepoId(fullName: string): Promise<string | null> {
  const repo = await db.select().from(repositories).where(eq(repositories.fullName, fullName)).limit(1);
  return repo[0]?.id || null;
}

// ── Signature Validation ────────────────────────────────────────────────────

function validateSignature(
  payload: string | Buffer,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const crypto = require("crypto");
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ── Event Processing ────────────────────────────────────────────────────────

async function processPushEvent(payload: any) {
  const orgId = await getOrgId();
  const repoFullName = payload.repository?.full_name;
  const repoId = repoFullName ? await getRepoId(repoFullName) : null;
  const branch = payload.ref?.replace("refs/heads/", "");

  for (const commitData of payload.commits || []) {
    try {
      await db.insert(commits).values({
        repoId: repoId || orgId,
        sha: commitData.id,
        message: commitData.message,
        branch,
        authorName: commitData.author?.name || commitData.author?.username,
        authorEmail: commitData.author?.email,
        additions: (commitData.added || []).length,
        deletions: (commitData.removed || []).length,
        filesChanged:
          (commitData.added || []).length +
          (commitData.removed || []).length +
          (commitData.modified || []).length,
        committedAt: new Date(commitData.timestamp || Date.now()),
      });
    } catch {
      // Duplicate commit - ignore
    }
  }

  try {
    await db.insert(activityEvents).values({
      orgId,
      repoId: repoId || undefined,
      eventType: "push",
      payload: {
        repo: repoFullName,
        branch,
        commitCount: (payload.commits || []).length,
        pusher: payload.pusher?.name,
      },
      githubEventId: payload.after,
      processedAt: new Date(),
    });
  } catch (e) {
    console.error("Error saving activity event:", e);
  }
}

async function processPullRequestEvent(payload: any) {
  const action = payload.action;
  const pr = payload.pull_request;

  if (!pr) return;

  const orgId = await getOrgId();
  const repoFullName = payload.repository?.full_name;
  const repoId = repoFullName ? await getRepoId(repoFullName) : null;

  try {
    const existing = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.githubId, String(pr.id)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pullRequests)
        .set({
          state: pr.state,
          title: pr.title,
          body: pr.body,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.changed_files || 0,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
          updatedAt: new Date(),
        })
        .where(eq(pullRequests.githubId, String(pr.id)));
    } else {
      await db.insert(pullRequests).values({
        repoId: repoId || orgId,
        githubId: String(pr.id),
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        branch: pr.head?.ref,
        baseBranch: pr.base?.ref || "main",
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
        changedFiles: pr.changed_files || 0,
        ciStatus: "pending",
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      });
    }

    if (action === "opened") {
      const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
      if (totalChanges > 300 || (pr.changed_files || 0) > 10) {
        await db.insert(alerts).values({
          orgId,
          type: "high_risk_pr",
          title: "High-Risk PR Opened",
          message: `PR #${pr.number} '${pr.title}' may need careful review (${totalChanges} lines changed, ${pr.changed_files} files)`,
          severity: "high",
        });
      }
    }
  } catch (e) {
    console.error("Error processing PR event:", e);
  }
}

async function processPullRequestReviewEvent(payload: any) {
  const review = payload.review;
  const pr = payload.pull_request;

  if (!review || !pr) return;

  try {
    // Find the PR in our database
    const existingPR = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.githubId, String(pr.id)))
      .limit(1);

    if (existingPR[0]) {
      await db.insert(pullRequestReviews).values({
        prId: existingPR[0].id,
        githubId: String(review.id),
        state: review.state,
        body: review.body,
        submittedAt: review.submitted_at ? new Date(review.submitted_at) : new Date(),
      });
    }
  } catch {
    // Duplicate review - ignore
  }
}

async function processCheckRunEvent(payload: any) {
  const checkRun = payload.check_run || payload.check_suite;
  if (!checkRun) return;

  const orgId = await getOrgId();
  const repoFullName = payload.repository?.full_name;
  const repoId = repoFullName ? await getRepoId(repoFullName) : null;

  const status = checkRun.conclusion || checkRun.status;
  const isFailure = status === "failure";

  if (isFailure) {
    await db.insert(alerts).values({
      orgId,
      type: "ci_failure",
      title: "CI Pipeline Failing",
      message: `Check ${checkRun.name || "run"} failed with conclusion: ${status}`,
      severity: "medium",
    });
  }

  await db.insert(ciRuns).values({
    repoId: repoId || orgId,
    githubRunId: checkRun.id,
    name: checkRun.name,
    branch: checkRun.check_suite?.head_branch,
    status: isFailure ? "failure" : "success",
    conclusion: status,
    url: checkRun.html_url,
    completedAt: new Date(),
  });
}

// ── Webhook Endpoint ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const eventType = request.headers.get("x-github-event");
  const deliveryId = request.headers.get("x-github-delivery");

  // Validate signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret && !validateSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Idempotency check
  if (deliveryId) {
    const existing = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.githubEventId, deliveryId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ status: "already processed" }, { status: 200 });
    }

    await db.insert(webhookEvents).values({
      githubEventId: deliveryId,
      eventType: eventType || "unknown",
      payload: JSON.parse(body),
      processed: false,
    });
  }

  try {
    const payload = JSON.parse(body);

    switch (eventType) {
      case "push":
        await processPushEvent(payload);
        break;
      case "pull_request":
        await processPullRequestEvent(payload);
        break;
      case "pull_request_review":
        await processPullRequestReviewEvent(payload);
        break;
      case "check_run":
      case "check_suite":
        await processCheckRunEvent(payload);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    if (deliveryId) {
      await db
        .update(webhookEvents)
        .set({ processed: true })
        .where(eq(webhookEvents.githubEventId, deliveryId));
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);

    if (deliveryId) {
      await db
        .update(webhookEvents)
        .set({
          processed: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(webhookEvents.githubEventId, deliveryId));
    }

    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "DevWatch AI GitHub Webhook Endpoint",
  });
}
