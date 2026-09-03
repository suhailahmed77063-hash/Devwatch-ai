import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  incidents,
  incidentTimelines,
  rootCauseAnalyses,
  blastRadius,
  pullRequests,
  commits,
  deploymentEvents,
  repositories,
  organizations,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const incidentResult = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
    if (!incidentResult[0]) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }
    const incident = incidentResult[0];

    const timeline = await db.select().from(incidentTimelines).where(eq(incidentTimelines.incidentId, id)).orderBy(incidentTimelines.timestamp);
    const rootCauses = await db.select().from(rootCauseAnalyses).where(eq(rootCauseAnalyses.incidentId, id)).orderBy(desc(rootCauseAnalyses.confidence));
    const blast = await db.select().from(blastRadius).where(eq(blastRadius.incidentId, id));

    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o";

    const systemPrompt = `You are an AI Incident Investigation Copilot for DevWatch AI. Analyze the following production incident and answer the engineer's questions using ONLY the data provided. Never hallucinate information.

INCIDENT DATA:
- Title: ${incident.title}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Error Rate: ${incident.errorRate || "Unknown"}
- Error Message: ${incident.errorMessage || "None captured"}
- Stack Trace: ${incident.stackTrace ? incident.stackTrace.substring(0, 500) : "None captured"}
- Affected Services: ${JSON.stringify(incident.affectedServices || [])}
- Affected APIs: ${JSON.stringify(incident.affectedApis || [])}
- Detected: ${incident.detectedAt}

TIMELINE:
${timeline.map((t) => `- ${new Date(t.timestamp).toLocaleString()}: [${t.eventType}] ${t.title}`).join("\n") || "No timeline events"}

ROOT CAUSE CANDIDATES:
${rootCauses.map((r, i) => `${i + 1}. [${r.rootCauseType}] Confidence: ${r.confidence}% — ${r.description}\n   Evidence: ${JSON.stringify(r.evidence || [])}`).join("\n") || "No root causes identified yet"}

BLAST RADIUS:
${blast.map((b) => `- ${b.entityName} (${b.entityType}): ${b.impactLevel}`).join("\n") || "Blast radius not calculated"}

Answer questions about what caused this incident, what changed, which PRs are likely responsible, what APIs are affected, and what should be checked. Always reference specific data.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const fallback = generateInvestigationFallback(message, incident, rootCauses, timeline);
      return NextResponse.json({ response: fallback });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Unable to generate response.";

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("Investigation chat error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}

function generateInvestigationFallback(
  message: string,
  incident: any,
  rootCauses: any[],
  timeline: any[]
): string {
  const lower = message.toLowerCase();

  if (lower.includes("caused") || lower.includes("root cause") || lower.includes("what happened")) {
    if (rootCauses.length === 0) {
      return `No root cause analysis available yet for "${incident.title}". Run an AI investigation to analyze recent deployments, PRs, and commits that may have triggered this incident.`;
    }
    const top = rootCauses[0];
    return `Most likely cause (Confidence: ${top.confidence}%):\n\n${top.description}\n\nEvidence:\n${(top.evidence as string[])?.map((e) => `• ${e}`).join("\n") || "• No detailed evidence available"}\n\nLabel: ${top.confidence > 70 ? "Likely Cause" : top.confidence > 40 ? "Possible Cause" : "Low-confidence Candidate"}`;
  }

  if (lower.includes("changed") || lower.includes("before") || lower.includes("timeline")) {
    if (timeline.length === 0) return "No timeline events recorded for this incident.";
    return `Incident Timeline:\n${timeline.map((t) => `${new Date(t.timestamp).toLocaleTimeString()} — ${t.title}`).join("\n")}`;
  }

  if (lower.includes("pr") || lower.includes("pull request") || lower.includes("commit")) {
    const prCauses = rootCauses.filter((r) => r.rootCauseType === "pull_request_change");
    if (prCauses.length === 0) return "No PR-related root causes identified.";
    return `Related PRs (sorted by confidence):\n${prCauses.map((r) => `• ${r.description} — Confidence: ${r.confidence}%`).join("\n")}`;
  }

  if (lower.includes("api") || lower.includes("affected") || lower.includes("service")) {
    const apis = incident.affectedApis || [];
    const services = incident.affectedServices || [];
    return `Affected APIs: ${apis.length > 0 ? apis.join(", ") : "Not identified yet"}\nAffected Services: ${services.length > 0 ? services.join(", ") : "Not identified yet"}`;
  }

  if (lower.includes("rollback")) {
    return `To consider rollback:\n1. Check if the incident started after a specific deployment\n2. Review the root cause candidates above\n3. If a deployment is identified, rollback to the previous version\n4. Verify the issue is resolved after rollback\n\nNote: This is AI-assisted guidance, not a confirmed recommendation.`;
  }

  return `I can help investigate this incident. Try asking:\n• "What caused this incident?"\n• "What changed before the incident?"\n• "Which PR is most likely responsible?"\n• "Show me the timeline"\n• "What APIs are affected?"\n• "Should we rollback?"\n• "Show me the evidence"`;
}
