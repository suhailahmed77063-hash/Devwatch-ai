import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  releases,
  releaseChecks,
  releaseRisks,
  releaseCommits,
  releasePullRequests,
  deploymentEvents,
  rollbackRecommendations,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createReleaseAnalysis } from "@/lib/release-engine";

// GET /api/releases/[id] - Get release details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const release = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
    if (!release[0]) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const checks = await db.select().from(releaseChecks).where(eq(releaseChecks.releaseId, id));
    const risks = await db.select().from(releaseRisks).where(eq(releaseRisks.releaseId, id));
    const commitsList = await db.select().from(releaseCommits).where(eq(releaseCommits.releaseId, id));
    const prs = await db.select().from(releasePullRequests).where(eq(releasePullRequests.releaseId, id));
    const deployments = await db.select().from(deploymentEvents).where(eq(deploymentEvents.releaseId, id)).orderBy(desc(deploymentEvents.createdAt));
    const rollbacks = await db.select().from(rollbackRecommendations).where(eq(rollbackRecommendations.releaseId, id as string));

    return NextResponse.json({
      release: release[0],
      checks,
      risks,
      commits: commitsList,
      pullRequests: prs,
      deployments,
      rollbacks,
    });
  } catch (error) {
    console.error("Error fetching release:", error);
    return NextResponse.json({ error: "Failed to fetch release" }, { status: 500 });
  }
}

// PATCH /api/releases/[id] - Update release (re-analyze)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const release = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
    if (!release[0]) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // If action is "re-analyze", run the analysis again
    if (body.action === "re-analyze") {
      const analysis = await createReleaseAnalysis(id, release[0].orgId, release[0].repoId || undefined);
      return NextResponse.json({ release: release[0], analysis });
    }

    // Otherwise, update fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status) updateData.status = body.status;
    if (body.title) updateData.title = body.title;
    if (body.description) updateData.description = body.description;

    await db.update(releases).set(updateData).where(eq(releases.id, id));

    const updated = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
    return NextResponse.json({ release: updated[0] });
  } catch (error) {
    console.error("Error updating release:", error);
    return NextResponse.json({ error: "Failed to update release" }, { status: 500 });
  }
}
