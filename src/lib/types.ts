// Shared types for DevWatch AI

export interface DashboardStats {
  totalDevelopers: number;
  activeDevelopers: number;
  commitsThisWeek: number;
  pullRequests: number;
  prsAwaitingReview: number;
  mergedPrs: number;
  failedCIBuilds: number;
  securityIssues: number;
  vulnerabilityCount: number;
  projectProgress: number;
  healthScore: number;
  previousWeek: {
    commits: number;
    pullRequests: number;
    securityIssues: number;
    mergedPrs: number;
  };
}

export interface TrendData {
  date: string;
  commits: number;
  prs: number;
  reviews: number;
}

export interface SecurityTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ProjectProgress {
  id: string;
  name: string;
  progress: number;
  tasks: { total: number; done: number };
  risk: "low" | "medium" | "high" | "critical";
}

export interface PRWithDetails {
  id: string;
  number: number;
  title: string;
  state: string;
  branch: string;
  baseBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  riskScore: number | null;
  ciStatus: string | null;
  author: string;
  repo: string;
  createdAt: Date;
  mergedAt: Date | null;
}

export interface DeveloperActivity {
  id: string;
  name: string;
  githubUsername: string;
  avatarUrl: string | null;
  commits: number;
  pullRequests: number;
  reviews: number;
  prMergeRate: number;
  ciFailures: number;
}

export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  createdAt: Date;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export type TimeRange = "day" | "week" | "month" | "quarter";

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
