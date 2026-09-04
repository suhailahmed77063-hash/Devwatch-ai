"use client";

import { useMemo } from "react";
import type { Extension } from "@codemirror/state";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { Save, X, FileCode2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpenTab } from "./workspace-types";

function langFor(path: string): Extension[] {
  if (/\.(ts|tsx|mts|cts)$/.test(path)) return [javascript({ typescript: true, jsx: path.endsWith("x") })];
  if (/\.(js|jsx|mjs|cjs)$/.test(path)) return [javascript({ jsx: path.endsWith("x") })];
  if (/\.json$/.test(path)) return [json()];
  if (/\.(html|htm)$/.test(path)) return [html()];
  if (/\.css$/.test(path)) return [css()];
  return [];
}

export function EditorPane({
  tabs,
  activePath,
  onSelect,
  onClose,
  onChange,
  onSave,
  saving,
  onDirtyAll,
}: {
  tabs: OpenTab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
  saving: string | null;
  onDirtyAll: () => void;
}) {
  const active = tabs.find((t) => t.path === activePath) ?? null;
  const extensions = useMemo(() => (active ? langFor(active.path) : []), [active?.path]);

  if (!active) {
    return (
      <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0c]">
        <div className="h-9 shrink-0 border-b border-white/5 flex items-center gap-2 px-3 text-[11px] text-zinc-600">
          <FileCode2 className="w-3.5 h-3.5" /> No file open
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-12 h-12 rounded-2xl btn-acc flex items-center justify-center mb-3">
            <FileCode2 className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">Open a file from the explorer</p>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs">Your generated application lives here — inspect, edit and save. The AI writes and fixes these files for you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0c]">
      <div className="h-9 shrink-0 border-b border-white/5 flex items-center gap-0.5 px-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.path}
            onClick={() => onSelect(t.path)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-t-lg border-b-2 transition",
              t.path === active.path ? "text-white border-acc bg-white/[.04]" : "text-zinc-500 border-transparent hover:text-zinc-300"
            )}
          >
            <FileCode2 className="w-3 h-3" />
            <span className="max-w-[160px] truncate">{t.path.split("/").pop()}</span>
            {!t.saved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-label="Unsaved" />}
            <span
              role="button"
              tabIndex={0}
              aria-label={`Close ${t.path}`}
              className="ml-0.5 p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.path);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onClose(t.path);
                }
              }}
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => onDirtyAll()}
          className="shrink-0 flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded"
          title="Save all open files"
        >
          <Save className="w-3 h-3" /> Save all
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <CodeMirror
          value={active.content}
          height="100%"
          style={{ height: "100%" }}
          theme="dark"
          extensions={extensions}
          onChange={(value) => onChange(active.path, value)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            autocompletion: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
          }}
        />
        <div className="absolute bottom-0 inset-x-0 h-7 px-3 bg-[#0b0b0d] border-t border-white/5 flex items-center gap-2 text-[10px] text-zinc-600">
          <span className="truncate">{active.path}</span>
          <span className="flex-1" />
          <span className={cn("flex items-center gap-1", !active.saved && "text-amber-400")}>
            {active.saved ? "Saved" : "Unsaved changes"}
          </span>
          {saving === active.path && <Loader2 className="w-3 h-3 spin-slow" />}
        </div>
      </div>
    </div>
  );
}