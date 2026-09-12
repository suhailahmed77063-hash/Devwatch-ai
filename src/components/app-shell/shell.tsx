"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Hammer, FolderKanban, Settings, LogOut, ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Shell({ children, userName }: { children: React.ReactNode; userName?: string | null }) {
  const pathname = usePathname();
  const links = [
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/security/agent", label: "Security Agent", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="h-14 shrink-0 glass border-x-0 border-t-0 flex items-center gap-3 px-4 z-40">
        <Link href="/projects" className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight text-white">
          <span className="w-8 h-8 rounded-xl btn-acc flex items-center justify-center">
            <Hammer className="w-4 h-4 text-white" />
          </span>
          WebForge <span className="grad-text hidden sm:inline">AI</span>
        </Link>
        <nav className="ml-6 flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl border transition",
                  active ? "side-item active" : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
                )}
              >
                <l.icon className="w-4 h-4" /> {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <a href="/" className="text-xs text-zinc-500 hover:text-white transition hidden sm:block">
          ← Landing
        </a>
        <div className="relative group">
          <button className="glass rounded-xl px-2 py-1.5 flex items-center gap-2 text-sm text-zinc-200">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white btn-acc">
              {(userName ?? "U").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden md:inline max-w-[140px] truncate">{userName ?? "Account"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>
          <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50 min-w-[180px]">
            <div className="glass bg-panel rounded-xl p-1.5 text-sm">
              <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5">
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
