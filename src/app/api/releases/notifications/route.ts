import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { releaseNotifications, organizations } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/releases/notifications - List release notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const org = await db.select().from(organizations).limit(1);
      targetOrgId = org[0]?.id;
    }

    if (!targetOrgId) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await db
      .select()
      .from(releaseNotifications)
      .where(eq(releaseNotifications.orgId, targetOrgId))
      .orderBy(desc(releaseNotifications.createdAt))
      .limit(50);

    return NextResponse.json({ notifications, orgId: targetOrgId });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/releases/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      await db
        .update(releaseNotifications)
        .set({ isRead: true })
        .where(eq(releaseNotifications.isRead, false));
    } else if (notificationIds && Array.isArray(notificationIds)) {
      for (const id of notificationIds) {
        await db
          .update(releaseNotifications)
          .set({ isRead: true })
          .where(eq(releaseNotifications.id, id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
