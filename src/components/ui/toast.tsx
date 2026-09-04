"use client";

import * as React from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let listeners: Array<() => void> = [];
let toasts: ToastItem[] = [];
let nextId = 1;

function notify() {
  for (const l of listeners) l();
}

export function toast(message: string, kind: ToastKind = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3400);
}

export function useToasts() {
  const [, force] = React.useState(0);
  React.useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return toasts;
}

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const COLORS = {
  success: "text-emerald-400 border-emerald-500/30",
  error: "text-red-400 border-red-500/40",
  info: "text-acc-soft border-acc/40",
};

export function Toaster() {
  const items = useToasts();
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {items.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className={`toast glass rounded-xl px-4 py-3 text-sm flex items-center gap-2.5 pointer-events-auto ${COLORS[t.kind]}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-zinc-200 max-w-[320px]">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ToastClose({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-zinc-500 hover:text-white">
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
