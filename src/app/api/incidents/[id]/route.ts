import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  incidents,
  incidentTimelines,
  rootCauseAnalyses,
  blastRadius,
  preventionRecommendations,
  pullRequests,
  commits,
  deploymentEvents,
  repositories,
  organizations,
} from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const incidentResult = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id))
      .limit(1);

    if (!incidentResult[0]) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const incident = incidentResult[0];

    const timeline = await db
      .select()
      .from(incidentTimelines)
      .where(eq(incidentTimelines.incidentId, id))
      .orderBy(incidentTimelines.timestamp);

    const rootCauses = await db
      .select()
      .from(rootCauseAnalyses)
      .where(eq(rootCauseAnalyses.incidentId, id))
      .orderBy(desc(rootCauseAnalyses.confidence));

    const blast = await db
      .select()
      .from(blastRadius)
      .where(eq(blastRadius.incidentId, id));

    const prevRecs = await db
      .select()
      .from(preventionRecommendations)
      .where(eq(preventionRecommendations.incidentId, id))
      .orderBy(prevRecs => prevRecs.priority);

    // Fetch related PRs
    const relatedPRs = [];
    for (const rca of rootCauses.filter((r) => r.relatedPrId)) {
      const pr = await db
        .select()
        .from(pullRequests)
        .where(eq(pullRequests.id, rca.relatedPrId!))
        .limit(1);
      if (pr[0]) relatedPRs.push(pr[0]);
    }

    // Fetch related deployments
    const relatedDeployments = [];
    for (const rca of rootCauses.filter((r) => r.relatedDeploymentId)) {
      const dep = await db
        .select()
        .from(deploymentEvents)
        .where(eq(deploymentEvents.id, rca.relatedDeploymentId!))
        .limit(1);
      if (dep[0]) relatedDeployments.push(dep[0]);
    }

    // Similar incidents
    const similarIncidents = await db
      .select()
      .from(incidents)
      .where(
        and(
          eq(incidents.orgId, incident.orgId),
          eq(incidents.severity, incident.severity)
        )
      )
      .orderBy(desc(incidents.detectedAt))
      .limit(5);

    return NextResponse.json({
      incident,
      timeline,
      rootCauses,
      blastRadius: blast,
      preventionRecommendations: prevRecs,
      relatedPRs,
      relatedDeployments,
      similarIncidents: similarIncidents.filter((s) => s.id !== id),
    });
  } catch (error) {
    console.error("Incident detail error:", error);
    return NextResponse.json({ error: "Failed to load incident" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, severity } = body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) {
      updates.status = status;
      if (status === "acknowledged") updates.acknowledgedAt = new Date();
      if (status === "identified") updates.identifiedAt = new Date();
      if (status === "resolved") updates.resolvedAt = new Date();
      if (status === "closed") updates.closedAt = new Date();
    }
    if (severity) updates.severity = severity;

    const [updated] = await db
      .update(incidents)
      .set(updates)
      .where(eq(incidents.id, id))
      .returning();

    // Add timeline event
    if (status) {
      await db.insert(incidentTimelines).values({
        incidentId: id,
        timestamp: new Date(),
        eventType: `status_change_${status}`,
        title: `Incident status changed to ${status}`,
        description: `Status updated to ${status}`,
        source: "user",
      });
    }

    return NextResponse.json({ incident: updated });
  } catch (error) {
    console.error("Incident PATCH error:", error);
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
