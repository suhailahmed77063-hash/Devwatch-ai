import { cn } from "@/lib/utils";
import Link from "next/link";
import { Hammer } from "lucide-react";

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-display font-bold tracking-tight text-white">
      <span className={cn("rounded-xl btn-acc flex items-center justify-center", small ? "w-7 h-7 rounded-lg" : "w-8 h-8")}>
        <Hammer className={cn("text-white", small ? "w-3.5 h-3.5" : "w-4 h-4")} />
      </span>
      {!small && (
        <span className="text-lg">
          WebForge <span className="grad-text">AI</span>
        </span>
      )}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn("inline-block w-4 h-4 rounded-full border-2 border-white/20 border-t-acc-soft spin-slow", className)} />
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "red" | "amber" | "zinc" | "rose";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    red: "text-red-400 bg-red-500/10 border-red-500/25",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    zinc: "text-zinc-400 bg-white/5 border-white/10",
    rose: "text-acc-soft bg-acc/10 border-acc/25",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, desc, children }: { icon?: React.ReactNode; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-10 min-h-[320px]">
      {icon && <div className="w-12 h-12 rounded-2xl btn-acc flex items-center justify-center mb-4">{icon}</div>}
      <h3 className="font-display font-bold text-xl text-white">{title}</h3>
      {desc && <p className="text-sm text-zinc-500 mt-2 max-w-xs leading-relaxed">{desc}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return <div className={cn("skel rounded-lg", className)} />;
}
