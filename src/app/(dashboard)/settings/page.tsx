"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Shield, User, Key, Moon, Sun, Monitor } from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";

const notificationPreferences = [
  { id: "critical_security", label: "Critical Security Vulnerabilities", description: "Get alerted when critical security issues are detected", defaultEnabled: true },
  { id: "secret_detected", label: "Secrets Detected", description: "Alert when secrets are found in code", defaultEnabled: true },
  { id: "high_risk_pr", label: "High-Risk Pull Requests", description: "Notify when PRs with high risk scores are opened", defaultEnabled: true },
  { id: "ci_failure", label: "CI Pipeline Failures", description: "Alert when CI/CD pipelines fail", defaultEnabled: true },
  { id: "pr_stale", label: "Stale Pull Requests", description: "Notify when PRs have been waiting too long for review", defaultEnabled: false },
  { id: "milestone_at_risk", label: "Milestone at Risk", description: "Alert when project milestones are in danger", defaultEnabled: true },
  { id: "dependency_vulnerability", label: "Dependency Vulnerabilities", description: "Notify about new dependency vulnerabilities", defaultEnabled: false },
  { id: "weekly_report", label: "Weekly Report", description: "Receive weekly engineering report summary", defaultEnabled: true },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(notificationPreferences.map((n) => [n.id, n.defaultEnabled]))
  );

  const toggleNotification = (id: string) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your DevWatch AI preferences
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-4 w-4" /> Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                  theme === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notification Preferences
          </CardTitle>
          <CardDescription>Configure which alerts trigger notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notificationPreferences.map((pref) => (
              <div key={pref.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.description}</p>
                </div>
                <button
                  onClick={() => toggleNotification(pref.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications[pref.id] ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications[pref.id] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" /> Organization
          </CardTitle>
          <CardDescription>Organization settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Name</label>
              <input
                type="text"
                defaultValue="Acme Engineering"
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GitHub Organization</label>
              <input
                type="text"
                defaultValue="acme-corp"
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-4 w-4" /> AI Configuration
          </CardTitle>
          <CardDescription>Configure AI analysis settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Provider API Key</label>
              <input
                type="password"
                placeholder="sk-..."
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely server-side and never exposed to the frontend.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Model</label>
              <select className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">AI Sensitivity</label>
              <select className="w-full rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50">
                <option value="high">High - More findings, may have false positives</option>
                <option value="medium" selected>Medium - Balanced (Recommended)</option>
                <option value="low">Low - Fewer findings, higher confidence</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" /> Privacy & Security
          </CardTitle>
          <CardDescription>Data handling and privacy settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <p className="font-medium text-green-700 dark:text-green-400">✓ Code Analysis Privacy</p>
              <p className="text-muted-foreground">
                Code diffs are processed by AI only when explicitly authorized.
                No source code is sent to external providers without your configuration.
              </p>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <p className="font-medium text-green-700 dark:text-green-400">✓ Data Isolation</p>
              <p className="text-muted-foreground">
                Your data is isolated at the organization level. No data is shared between organizations.
              </p>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <p className="font-medium text-green-700 dark:text-green-400">✓ Audit Logs</p>
              <p className="text-muted-foreground">
                All administrative actions and data access are logged for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
