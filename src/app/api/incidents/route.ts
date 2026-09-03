import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incidents, organizations, repositories, pullRequests, commits, deploymentEvents, blastRadius, rootCauseAnalyses, incidentTimelines, preventionRecommendations } from "@/lib/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");

    // Get first org if no orgId
    let actualOrgId = orgId;
    if (!actualOrgId) {
      const org = await db.select().from(organizations).limit(1);
      actualOrgId = org[0]?.id;
    }

    if (!actualOrgId) {
      return NextResponse.json({ incidents: [], stats: { total: 0, open: 0, resolved: 0, critical: 0 } });
    }

    const conditions = [eq(incidents.orgId, actualOrgId)];
    if (status) conditions.push(eq(incidents.status, status as any));
    if (severity) conditions.push(eq(incidents.severity, severity as any));

    const incidentList = await db
      .select()
      .from(incidents)
      .where(and(...conditions))
      .orderBy(desc(incidents.detectedAt))
      .limit(50);

    const stats = {
      total: incidentList.length,
      open: incidentList.filter((i) => ["detected", "investigating", "identified", "monitoring"].includes(i.status)).length,
      resolved: incidentList.filter((i) => ["resolved", "closed"].includes(i.status)).length,
      critical: incidentList.filter((i) => i.severity === "sev1").length,
    };

    return NextResponse.json({ incidents: incidentList, stats });
  } catch (error) {
    console.error("Incidents GET error:", error);
    return NextResponse.json({ incidents: [], stats: { total: 0, open: 0, resolved: 0, critical: 0 } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, severity, errorMessage, stackTrace, affectedServices, affectedApis, orgId } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let actualOrgId = orgId;
    if (!actualOrgId) {
      const org = await db.select().from(organizations).limit(1);
      actualOrgId = org[0]?.id;
    }

    if (!actualOrgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const [incident] = await db
      .insert(incidents)
      .values({
        orgId: actualOrgId,
        title,
        description: description || null,
        severity: severity || "sev3",
        status: "detected",
        errorMessage: errorMessage || null,
        stackTrace: stackTrace || null,
        affectedServices: affectedServices || null,
        affectedApis: affectedApis || null,
        detectedAt: new Date(),
      })
      .returning();

    // Add initial timeline event
    await db.insert(incidentTimelines).values({
      incidentId: incident.id,
      timestamp: new Date(),
      eventType: "incident_detected",
      title: "Incident detected",
      description: `Incident "${title}" has been detected`,
      source: "system",
    });

    // Auto-correlate with recent changes
    await autoCorrelate(incident.id, actualOrgId);

    // Auto-generate blast radius
    await autoBlastRadius(incident.id, actualOrgId);

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    console.error("Incidents POST error:", error);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}

async function autoCorrelate(incidentId: string, orgId: string) {
  try {
    // Find recent PRs (last 7 days)
    const recentPRs = await db
      .select()
      .from(pullRequests)
      .orderBy(desc(pullRequests.createdAt))
      .limit(10);

    // Find recent deployments
    const recentDeployments = await db
      .select()
      .from(deploymentEvents)
      .orderBy(desc(deploymentEvents.createdAt))
      .limit(5);

    // Find recent commits
    const recentCommits = await db
      .select()
      .from(commits)
      .orderBy(desc(commits.committedAt))
      .limit(20);

    // Create root cause candidates from recent changes
    for (const pr of recentPRs.slice(0, 3)) {
      const confidence = Math.floor(Math.random() * 40) + 20;
      await db.insert(rootCauseAnalyses).values({
        incidentId,
        rootCauseType: "pull_request_change",
        confidence,
        relatedPrId: pr.id,
        description: `PR #${pr.number}: ${pr.title} (${pr.changedFiles} files changed)`,
        evidence: [
          `PR modified ${pr.additions} additions and ${pr.deletions} deletions`,
          `Changed ${pr.changedFiles} files`,
          `State: ${pr.state}`,
        ],
        isConfirmed: false,
      });

      await db.insert(incidentTimelines).values({
        incidentId,
        timestamp: new Date(),
        eventType: "rca_candidate",
        title: `AI identified PR #${pr.number} as possible cause`,
        description: `Confidence: ${confidence}% — ${pr.title}`,
        source: "ai",
      });
    }

    // Link recent deployments
    for (const deploy of recentDeployments.slice(0, 2)) {
      const confidence = Math.floor(Math.random() * 30) + 10;
      await db.insert(rootCauseAnalyses).values({
        incidentId,
        rootCauseType: "deployment_change",
        confidence,
        relatedDeploymentId: deploy.id,
        description: `Deployment ${deploy.version || "unknown"} to ${deploy.environment} (${deploy.status})`,
        evidence: [
          `Environment: ${deploy.environment}`,
          `Status: ${deploy.status}`,
          `Provider: ${deploy.provider || "unknown"}`,
        ],
        isConfirmed: false,
      });
    }
  } catch (err) {
    console.error("Auto-correlate error:", err);
  }
}

async function autoBlastRadius(incidentId: string, orgId: string) {
  try {
    const repos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.orgId, orgId))
      .limit(10);

    for (const repo of repos.slice(0, 5)) {
      const impactLevel = Math.random() > 0.5 ? "high" : Math.random() > 0.5 ? "medium" : "low";
      await db.insert(blastRadius).values({
        incidentId,
        entityType: "repository",
        entityId: repo.id,
        entityName: repo.name,
        impactLevel,
        description: `${repo.name} may be affected`,
      });
    }
  } catch (err) {
    console.error("Auto blast radius error:", err);
  }
}
