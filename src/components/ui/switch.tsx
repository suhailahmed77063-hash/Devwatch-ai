"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer",
        checked ? "bg-gradient-to-br from-acc to-[#9f1230]" : "bg-white/10"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
          checked ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}
