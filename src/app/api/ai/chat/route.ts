import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/ai";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { message, orgId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get actual org ID from database
    let actualOrgId = orgId;
    if (!actualOrgId) {
      const org = await db.select().from(organizations).limit(1);
      actualOrgId = org[0]?.id;
    }

    if (!actualOrgId) {
      return NextResponse.json(
        { response: "No organization found. Please connect your GitHub account first via the Integrations page." }
      );
    }

    const response = await generateAIResponse(message, actualOrgId);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
