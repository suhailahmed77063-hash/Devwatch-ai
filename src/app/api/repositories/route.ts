export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { repositories, organizations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/repositories - List all repos
export async function GET() {
  try {
    const repos = await db
      .select()
      .from(repositories)
      .orderBy(desc(repositories.updatedAt));
    return NextResponse.json({ repos, count: repos.length });
  } catch (error) {
    console.error("Error fetching repos:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}

// POST /api/repositories - Add a repo manually
export async function POST(request: NextRequest) {
  try {
    const { name, fullName, description, defaultBranch, githubToken } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
    }

    // Get the first org (or create one)
    let org = await db.select().from(organizations).limit(1);
    if (!org[0]) {
      // Need a user first
      const users = await db.select().from(require("@/lib/db/schema").users).limit(1);
      if (!users[0]) {
        return NextResponse.json({ error: "No user found. Please login first." }, { status: 400 });
      }
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: "Default",
          slug: "default",
          ownerId: users[0].id,
        })
        .returning();
      org = [newOrg];
    }

    const orgId = org[0].id;

    // If githubToken provided, fetch repo info from GitHub
    let repoData = {
      name: name,
      fullName: fullName || name,
      description: description || "",
      defaultBranch: defaultBranch || "main",
      githubId: `manual-${Date.now()}`,
    };

    if (githubToken && fullName) {
      try {
        const res = await fetch(`https://api.github.com/repos/${fullName}`, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (res.ok) {
          const ghRepo = await res.json();
          repoData = {
            name: ghRepo.name,
            fullName: ghRepo.full_name,
            description: ghRepo.description || "",
            defaultBranch: ghRepo.default_branch || "main",
            githubId: String(ghRepo.id),
          };
        }
      } catch {
        // Use provided data
      }
    }

    // Check if repo already exists
    const existing = await db
      .select()
      .from(repositories)
      .where(eq(repositories.githubId, repoData.githubId))
      .limit(1);

    if (existing[0]) {
      return NextResponse.json({ repo: existing[0], message: "Repository already exists" });
    }

    const [newRepo] = await db
      .insert(repositories)
      .values({
        orgId,
        githubId: repoData.githubId,
        name: repoData.name,
        fullName: repoData.fullName,
        description: repoData.description,
        defaultBranch: repoData.defaultBranch,
        isActive: true,
        lastSyncedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ repo: newRepo, message: "Repository added successfully" });
  } catch (error) {
    console.error("Error adding repo:", error);
    return NextResponse.json({ error: "Failed to add repository" }, { status: 500 });
  }
}
