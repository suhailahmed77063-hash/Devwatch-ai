"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("app error", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-ink text-zinc-100 font-body antialiased min-h-screen flex flex-col items-center justify-center p-8">
        <Logo />
        <h1 className="font-display font-bold text-2xl mt-8">Something went wrong</h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm text-center leading-relaxed">
          An unexpected error occurred while rendering this page. Your work is safe — try again.
        </p>
        {error.digest ? <p className="text-[11px] text-zinc-700 mt-2">Reference: {error.digest}</p> : null}
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="w-4 h-4" /> Try again
        </Button>
      </body>
    </html>
  );
}
