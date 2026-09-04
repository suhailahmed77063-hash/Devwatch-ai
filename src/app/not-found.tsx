import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <Logo />
      <h1 className="font-display font-bold text-5xl mt-10">
        4<span className="grad-text">0</span>4
      </h1>
      <p className="text-zinc-500 mt-3">That page doesn&apos;t exist — or it moved.</p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
        Back to home
      </Link>
    </div>
  );
}
