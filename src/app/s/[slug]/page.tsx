import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** WebForge-hosted published sites live at /s/:slug (or {slug}.webforge.app). */
export default async function PublishedSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  if (!db) {
    notFound();
  }
  const project = await db.project.findUnique({
    where: { slug },
    select: {
      id: true,
      deployments: {
        where: { status: "READY", isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { artifact: true },
      },
    },
  });
  const artifact = project?.deployments[0]?.artifact as { index?: string } | null | undefined;
  if (!artifact?.index) {
    notFound();
  }

  return <div dangerouslySetInnerHTML={{ __html: artifact.index }} />;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const project = db
    ? await db.project.findUnique({ where: { slug }, select: { name: true, deployments: { where: { status: "READY", isPublished: true }, orderBy: { createdAt: "desc" }, take: 1, select: { artifact: true } } } })
    : null;
  const artifact = project?.deployments[0]?.artifact as { index?: string } | null | undefined;
  const title = artifact?.index?.match(/<title>([^<]*)<\/title>/i)?.[1];
  const desc = artifact?.index?.match(/name="description" content="([^"]*)"/i)?.[1];
  return {
    title: title ?? project?.name ?? slug,
    description: desc ?? undefined,
  };
}
