"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] modal-backdrop flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          "modal-card glass bg-panel rounded-2xl w-full max-h-[86vh] overflow-y-auto",
          wide ? "max-w-4xl" : "max-w-lg",
          className
        )}
      >
        {title ? (
          <div className="flex items-center justify-between sticky top-0 bg-panel/95 backdrop-blur z-10 px-6 py-4 border-b border-white/5">
            <h3 className="font-display font-bold text-lg">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
