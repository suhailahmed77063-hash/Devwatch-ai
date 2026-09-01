"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean | null;
  createdAt: Date | null;
  repoName: string | null;
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case "critical":
      return { color: "text-red-500", badge: "destructive" as const, icon: <Shield className="h-4 w-4" /> };
    case "high":
      return { color: "text-orange-500", badge: "secondary" as const, icon: <AlertTriangle className="h-4 w-4" /> };
    case "medium":
      return { color: "text-yellow-500", badge: "secondary" as const, icon: <Bell className="h-4 w-4" /> };
    default:
      return { color: "text-blue-500", badge: "outline" as const, icon: <CheckCircle className="h-4 w-4" /> };
  }
}

function formatTime(date: Date | null) {
  if (!date) return "Unknown";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default function AlertsClient({ alerts: initialAlerts }: { alerts: Alert[] }) {
  const [filter, setFilter] = useState("all");
  const [readState, setReadState] = useState<Record<string, boolean>>(
    Object.fromEntries(initialAlerts.map((a) => [a.id, a.isRead ?? false]))
  );

  const filtered = filter === "all"
    ? initialAlerts
    : filter === "unread"
    ? initialAlerts.filter((a) => !readState[a.id])
    : initialAlerts.filter((a) => a.severity === filter);

  const unreadCount = initialAlerts.filter((a) => !readState[a.id]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "unread", "critical", "high", "medium", "informational"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No alerts to display.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const config = getSeverityConfig(alert.severity);
            const isRead = readState[alert.id];

            return (
              <Card
                key={alert.id}
                className={`transition-opacity ${isRead ? "opacity-60" : ""}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{alert.title}</h3>
                        <Badge variant={config.badge}>
                          {alert.severity}
                        </Badge>
                        {!isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(alert.createdAt)}
                        </span>
                        {alert.repoName && <span>{alert.repoName}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setReadState((prev) => ({
                          ...prev,
                          [alert.id]: !prev[alert.id],
                        }))
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title={isRead ? "Mark as unread" : "Mark as read"}
                    >
                      {isRead ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
