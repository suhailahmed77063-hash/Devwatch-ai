"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Bot,
  Settings,
  Link2,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Network,
  Crosshair,
  History,
} from "lucide-react";
import { useState } from "react";

const navItems = [
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
  { label: "AI Manager", href: "/ai-manager", icon: Bot },
  { label: "Releases", href: "/releases", icon: Rocket },
  { label: "Incidents", href: "/incidents", icon: Shield },
  { label: "Engineering Map", href: "/engineering-map", icon: Network },
  { label: "Root Causes", href: "/root-causes", icon: Crosshair },
  { label: "Integrations", href: "/integrations", icon: Link2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="DevWatch AI" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-heading text-base font-semibold">DevWatch AI</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <img src="/logo.png" alt="DevWatch AI" className="h-8 w-8 rounded-lg object-contain" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
