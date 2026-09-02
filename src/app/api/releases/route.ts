import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { releases, organizations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createReleaseAnalysis } from "@/lib/release-engine";

// GET /api/releases - List all releases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
      // Get first org as default
      const org = await db.select().from(organizations).limit(1);
      if (!org[0]) {
        return NextResponse.json({ releases: [] });
      }
      const orgReleases = await db
        .select()
        .from(releases)
        .where(eq(releases.orgId, org[0].id))
        .orderBy(desc(releases.createdAt));
      return NextResponse.json({ releases: orgReleases, orgId: org[0].id });
    }

    const orgReleases = await db
      .select()
      .from(releases)
      .where(eq(releases.orgId, orgId))
      .orderBy(desc(releases.createdAt));

    return NextResponse.json({ releases: orgReleases, orgId });
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json({ error: "Failed to fetch releases" }, { status: 500 });
  }
}

// POST /api/releases - Create a new release and analyze it
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, repoId, projectId, version, title, description, targetBranch, targetCommitSha } = body;

    if (!orgId || !version) {
      return NextResponse.json(
        { error: "orgId and version are required" },
        { status: 400 }
      );
    }

    // Get previous release for comparison
    const previousRelease = await db
      .select()
      .from(releases)
      .where(eq(releases.orgId, orgId))
      .orderBy(desc(releases.createdAt))
      .limit(1);

    // Create release
    const [newRelease] = await db
      .insert(releases)
      .values({
        orgId,
        repoId: repoId || null,
        projectId: projectId || null,
        version,
        title: title || `Release ${version}`,
        description: description || "",
        status: "draft",
        previousVersion: previousRelease[0]?.version || null,
        targetBranch: targetBranch || "main",
        targetCommitSha: targetCommitSha || null,
      })
      .returning();

    // Run full release analysis
    const analysis = await createReleaseAnalysis(newRelease.id, orgId, repoId);

    return NextResponse.json({
      release: newRelease,
      analysis,
    });
  } catch (error) {
    console.error("Error creating release:", error);
    return NextResponse.json({ error: "Failed to create release" }, { status: 500 });
  }
}
