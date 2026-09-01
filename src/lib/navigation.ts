import {
  LayoutDashboard,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Shield,
  AlertTriangle,
  Users,
  FolderKanban,
  Bell,
  FileBarChart,
  MessageSquare,
  Link2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: { label: string; href: string }[];
  roles?: Role[];
}

export const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Repositories", href: "/repositories", icon: GitBranch },
  { label: "Pull Requests", href: "/pull-requests", icon: GitPullRequest },
  { label: "Commits", href: "/commits", icon: GitCommit },
  { label: "Security", href: "/security", icon: Shield },
  { label: "Vulnerabilities", href: "/vulnerabilities", icon: AlertTriangle },
  { label: "Developers", href: "/developers", icon: Users },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "AI Manager", href: "/ai-manager", icon: MessageSquare },
  { label: "Integrations", href: "/integrations", icon: Link2 },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["super_admin", "admin"] },
];
