"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, Hammer } from "lucide-react";

export function LandingNav() {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated";
  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-x-0 border-t-0">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
        <a href="#" className="flex items-center gap-2.5 font-display font-bold text-lg tracking-tight text-white">
          <span className="w-8 h-8 rounded-xl btn-acc flex items-center justify-center">
            <Hammer className="w-4 h-4 text-white" />
          </span>
          WebForge <span className="grad-text">AI</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="nav-link hover:text-white transition">Features</a>
          <a href="#templates" className="nav-link hover:text-white transition">Templates</a>
          <a href="#pricing" className="nav-link hover:text-white transition">Pricing</a>
          <a href="#community" className="nav-link hover:text-white transition">Community</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href={signedIn ? "/projects" : "/login"} className="text-sm text-zinc-300 hover:text-white transition px-3 py-2">
            {signedIn ? "Dashboard" : "Login"}
          </Link>
          <Link
            href={signedIn ? "/projects" : "/login?next=/projects"}
            className="btn-acc text-sm font-semibold text-white px-4 py-2 rounded-xl flex items-center gap-2"
          >
            Start Building <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
