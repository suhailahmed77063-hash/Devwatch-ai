import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deploymentEvents, releases } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateRollbackRecommendation, createReleaseNotification } from "@/lib/release-engine";

// POST /api/releases/deploy - Start a deployment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { releaseId, environment, provider, commitSha, version } = body;

    if (!releaseId || !environment) {
      return NextResponse.json(
        { error: "releaseId and environment are required" },
        { status: 400 }
      );
    }

    // Verify release exists and is ready
    const release = await db.select().from(releases).where(eq(releases.id, releaseId)).limit(1);
    if (!release[0]) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    if (release[0].status === "blocked") {
      return NextResponse.json(
        { error: "Release is blocked. Resolve issues before deploying." },
        { status: 400 }
      );
    }

    // Create deployment event
    const [deployment] = await db
      .insert(deploymentEvents)
      .values({
        releaseId,
        environment,
        provider: provider || "other",
        status: "in_progress",
        commitSha: commitSha || release[0].targetCommitSha,
        version: version || release[0].version,
        startedAt: new Date(),
      })
      .returning();

    // Update release status
    await db
      .update(releases)
      .set({ status: "deploying", updatedAt: new Date() })
      .where(eq(releases.id, releaseId));

    return NextResponse.json({ deployment, message: "Deployment started" });
  } catch (error) {
    console.error("Error starting deployment:", error);
    return NextResponse.json({ error: "Failed to start deployment" }, { status: 500 });
  }
}

// PATCH /api/releases/deploy - Update deployment status (success/failure)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { deploymentId, status, logs, error: deployError } = body;

    if (!deploymentId || !status) {
      return NextResponse.json(
        { error: "deploymentId and status are required" },
        { status: 400 }
      );
    }

    const deployment = await db
      .select()
      .from(deploymentEvents)
      .where(eq(deploymentEvents.id, deploymentId))
      .limit(1);

    if (!deployment[0]) {
      return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      status,
      logs: logs || deployment[0].logs,
    };

    if (status === "success" || status === "failed" || status === "cancelled") {
      updateData.completedAt = new Date();
      if (deployment[0].startedAt) {
        updateData.duration = Math.round(
          (Date.now() - deployment[0].startedAt.getTime()) / 1000
        );
      }
    }

    if (status === "failed" && deployError) {
      updateData.error = deployError;

      // Generate rollback recommendation
      await generateRollbackRecommendation(
        deployment[0].releaseId,
        deploymentId,
        deployError
      );

      // Create notification
      const release = await db
        .select()
        .from(releases)
        .where(eq(releases.id, deployment[0].releaseId))
        .limit(1);

      if (release[0]) {
        await createReleaseNotification(
          release[0].orgId,
          "deployment_failure",
          `Deployment Failed: ${release[0].version}`,
          `Deployment of ${release[0].version} to ${deployment[0].environment} failed. Error: ${deployError.substring(0, 200)}`,
          "critical",
          deployment[0].releaseId
        );
      }

      // Update release status
      await db
        .update(releases)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(releases.id, deployment[0].releaseId));
    }

    if (status === "success") {
      // Update release as deployed
      await db
        .update(releases)
        .set({
          status: "deployed",
          deployedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(releases.id, deployment[0].releaseId));

      // Create success notification
      const release = await db
        .select()
        .from(releases)
        .where(eq(releases.id, deployment[0].releaseId))
        .limit(1);

      if (release[0]) {
        await createReleaseNotification(
          release[0].orgId,
          "deployment_success",
          `Deployment Successful: ${release[0].version}`,
          `${release[0].version} has been successfully deployed to ${deployment[0].environment}.`,
          "informational",
          deployment[0].releaseId
        );
      }
    }

    await db
      .update(deploymentEvents)
      .set(updateData)
      .where(eq(deploymentEvents.id, deploymentId));

    const updated = await db
      .select()
      .from(deploymentEvents)
      .where(eq(deploymentEvents.id, deploymentId))
      .limit(1);

    return NextResponse.json({ deployment: updated[0] });
  } catch (error) {
    console.error("Error updating deployment:", error);
    return NextResponse.json({ error: "Failed to update deployment" }, { status: 500 });
  }
}

// GET /api/releases/deploy - List deployments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get("releaseId");

    if (!releaseId) {
      const allDeployments = await db
        .select()
        .from(deploymentEvents)
        .orderBy(desc(deploymentEvents.createdAt))
        .limit(50);
      return NextResponse.json({ deployments: allDeployments });
    }

    const deployments = await db
      .select()
      .from(deploymentEvents)
      .where(eq(deploymentEvents.releaseId, releaseId))
      .orderBy(desc(deploymentEvents.createdAt));

    return NextResponse.json({ deployments });
  } catch (error) {
    console.error("Error fetching deployments:", error);
    return NextResponse.json({ error: "Failed to fetch deployments" }, { status: 500 });
  }
}
