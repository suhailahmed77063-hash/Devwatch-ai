import { db } from "@/lib/db";
import { developers, repositories, commits, pullRequests, securityFindings, vulnerabilities, projects, alerts, ciRuns } from "@/lib/db/schema";
import { count, sql, eq, gte } from "drizzle-orm";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  // Fetch real data from database
  const [
    totalDevelopers,
    totalRepos,
    totalCommits,
    totalPRs,
    openPRs,
    mergedPRs,
    totalSecurityIssues,
    totalVulnerabilities,
    totalProjects,
    recentAlerts,
    ciRunsData,
  ] = await Promise.all([
    db.select({ count: count() }).from(developers),
    db.select({ count: count() }).from(repositories),
    db.select({ count: count() }).from(commits),
    db.select({ count: count() }).from(pullRequests),
    db.select({ count: count() }).from(pullRequests).where(eq(pullRequests.state, "open")),
    db.select({ count: count() }).from(pullRequests).where(eq(pullRequests.state, "merged")),
    db.select({ count: count() }).from(securityFindings),
    db.select({ count: count() }).from(vulnerabilities),
    db.select({ count: count() }).from(projects),
    db.select().from(alerts).orderBy(sql`${alerts.createdAt} desc`).limit(4),
    db.select({ status: ciRuns.status, count: count() }).from(ciRuns).groupBy(ciRuns.status),
  ]);

  const stats = {
    totalDevelopers: totalDevelopers[0]?.count ?? 0,
    totalRepos: totalRepos[0]?.count ?? 0,
    totalCommits: totalCommits[0]?.count ?? 0,
    totalPRs: totalPRs[0]?.count ?? 0,
    openPRs: openPRs[0]?.count ?? 0,
    mergedPRs: mergedPRs[0]?.count ?? 0,
    securityIssues: totalSecurityIssues[0]?.count ?? 0,
    vulnerabilities: totalVulnerabilities[0]?.count ?? 0,
    projects: totalProjects[0]?.count ?? 0,
  };

  const ciStats = {
    success: ciRunsData.find(r => r.status === "success")?.count ?? 0,
    failure: ciRunsData.find(r => r.status === "failure")?.count ?? 0,
  };

  return (
    <DashboardClient
      stats={stats}
      alerts={recentAlerts}
      ciStats={ciStats}
    />
  );
}
