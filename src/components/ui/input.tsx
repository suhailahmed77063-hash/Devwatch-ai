import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-acc/60 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-acc/60 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs text-zinc-500 block", className)} {...props} />;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-zinc-600">{hint}</p> : null}
    </div>
  );
}
