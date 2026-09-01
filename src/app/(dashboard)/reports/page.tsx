import { db } from "@/lib/db";
import { reports, commits, pullRequests, securityFindings, vulnerabilities, projects, ciRuns } from "@/lib/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";
import ReportsClient from "./reports-client";

export default async function ReportsPage() {
  // Fetch real reports from DB
  const dbReports = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(10);

  // Generate live stats for latest report
  const totalCommits = await db.select({ count: count() }).from(commits);
  const totalPRs = await db.select({ count: count() }).from(pullRequests);
  const openPRs = await db.select({ count: count() }).from(pullRequests).where(eq(pullRequests.state, "open"));
  const mergedPRs = await db.select({ count: count() }).from(pullRequests).where(eq(pullRequests.state, "merged"));
  const criticalFindings = await db.select({ count: count() }).from(securityFindings).where(eq(securityFindings.severity, "critical"));
  const highFindings = await db.select({ count: count() }).from(securityFindings).where(eq(securityFindings.severity, "high"));
  const totalVulns = await db.select({ count: count() }).from(vulnerabilities);
  const activeProjects = await db.select().from(projects).limit(5);

  const ciSuccess = await db.select({ count: count() }).from(ciRuns).where(eq(ciRuns.status, "success"));
  const ciTotal = await db.select({ count: count() }).from(ciRuns);
  const ciRate = ciTotal[0]?.count > 0 ? Math.round((ciSuccess[0]?.count / ciTotal[0]?.count) * 100) : 0;

  const latestReport = {
    title: "Live Engineering Report",
    period: `Generated ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    teamActivity: {
      commits: totalCommits[0]?.count ?? 0,
      prsOpened: openPRs[0]?.count ?? 0,
      prsMerged: mergedPRs[0]?.count ?? 0,
      ciSuccessRate: ciRate,
    },
    security: {
      critical: criticalFindings[0]?.count ?? 0,
      high: highFindings[0]?.count ?? 0,
      vulnerabilities: totalVulns[0]?.count ?? 0,
    },
    projects: activeProjects.map((p) => ({
      name: p.name,
      progress: p.progress ?? 0,
      status: (p.progress ?? 0) >= 50 ? "on_track" : "at_risk",
    })),
  };

  return (
    <ReportsClient
      reports={dbReports}
      latestReport={latestReport}
    />
  );
}
