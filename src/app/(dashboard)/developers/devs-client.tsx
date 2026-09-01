"use client";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";

interface Developer {
  id: string;
  name: string | null;
  email: string | null;
  githubUsername: string | null;
  avatarUrl: string | null;
}

export default function DevsClient({ developers }: { developers: Developer[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Developers</h1>
        <p className="text-sm text-muted-foreground">Engineering team activity and contribution metrics</p>
      </div>

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-700 dark:text-yellow-400">
        ℹ️ <strong>Activity metrics are informational.</strong> These represent engineering activity, not performance or productivity judgments.
      </div>

      {developers.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No developers tracked yet.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {developers.map((dev) => (
            <Link key={dev.id} href={`/developers/${dev.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {(dev.name || dev.githubUsername || "?").split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-semibold">{dev.name}</h3>
                      <p className="text-xs text-muted-foreground">@{dev.githubUsername || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{dev.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
