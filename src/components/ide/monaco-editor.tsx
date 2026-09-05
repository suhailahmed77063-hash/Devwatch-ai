"use client";

import { useRef, useCallback } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Save, FileCode2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  path: string;
  content: string;
  saved: boolean;
  language?: string;
}

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    prisma: "prisma",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    env: "plaintext",
    txt: "plaintext",
  };
  return langMap[ext] || "plaintext";
}

export function MonacoEditor({
  tabs,
  activePath,
  onSelect,
  onClose,
  onChange,
  onSave,
  saving,
  onDirtyAll,
}: {
  tabs: Tab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
  onChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
  saving: string | null;
  onDirtyAll: () => void;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const active = tabs.find((t) => t.path === activePath) ?? null;

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Define dark theme
    monaco.editor.defineTheme("aiforge-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "keyword", foreground: "c084fc" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "f59e0b" },
        { token: "type", foreground: "60a5fa" },
        { token: "function", foreground: "f472b6" },
        { token: "variable", foreground: "e5e7eb" },
        { token: "operator", foreground: "9ca3af" },
      ],
      colors: {
        "editor.background": "#0a0a0c",
        "editor.foreground": "#e5e7eb",
        "editor.lineHighlightBackground": "#ffffff08",
        "editor.selectionBackground": "#e11d4830",
        "editor.inactiveSelectionBackground": "#e11d4815",
        "editorCursor.foreground": "#e11d48",
        "editorWhitespace.foreground": "#ffffff15",
        "editorIndentGuide.background": "#ffffff10",
        "editorLineNumber.foreground": "#4b5563",
        "editorLineNumber.activeForeground": "#9ca3af",
        "editor.selectionHighlightBackground": "#e11d4815",
        "editorBracketMatch.background": "#e11d4820",
        "editorBracketMatch.border": "#e11d4850",
      },
    });
    monaco.editor.setTheme("aiforge-dark");

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (active) onSave(active.path);
    });
  }, [active, onSave]);

  const handleChange: OnChange = useCallback(
    (value) => {
      if (active && value !== undefined) {
        onChange(active.path, value);
      }
    },
    [active, onChange]
  );

  if (!active) {
    return (
      <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0c]">
        <div className="h-9 shrink-0 border-b border-white/5 flex items-center gap-2 px-3 text-[11px] text-zinc-600">
          <FileCode2 className="w-3.5 h-3.5" /> No file open
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-acc/15 flex items-center justify-center mb-4">
            <FileCode2 className="w-6 h-6 text-acc-soft" />
          </div>
          <p className="text-sm text-zinc-400 font-medium">Open a file from the explorer</p>
          <p className="text-xs text-zinc-600 mt-1.5 max-w-xs">
            AI generates code here. Edit, save, and watch it work in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0c]">
      {/* Tab bar */}
      <div className="h-9 shrink-0 border-b border-white/5 flex items-center gap-0.5 px-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.path}
            onClick={() => onSelect(t.path)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-t-lg border-b-2 transition",
              t.path === active.path
                ? "text-white border-acc bg-white/[.04]"
                : "text-zinc-500 border-transparent hover:text-zinc-300"
            )}
          >
            <FileCode2 className="w-3 h-3" />
            <span className="max-w-[140px] truncate">{t.path.split("/").pop()}</span>
            {!t.saved && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
            <span
              role="button"
              className="ml-0.5 p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.path);
              }}
            >
              <X className="w-3 h-3" />
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onDirtyAll}
          className="shrink-0 flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded"
          title="Save all (Ctrl+S)"
        >
          <Save className="w-3 h-3" /> Save all
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          key={active.path}
          height="100%"
          language={getLanguage(active.path)}
          value={active.content}
          theme="aiforge-dark"
          onMount={handleMount}
          onChange={handleChange}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
            padding: { top: 8 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="h-6 shrink-0 px-3 bg-[#0b0b0d] border-t border-white/5 flex items-center gap-3 text-[10px] text-zinc-600">
        <span className="truncate">{active.path}</span>
        <span className="flex-1" />
        <span>{getLanguage(active.path)}</span>
        <span>UTF-8</span>
        <span className={cn("flex items-center gap-1", !active.saved && "text-amber-400")}>
          {active.saved ? "Saved" : "Modified"}
        </span>
        {saving === active.path && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
    </div>
  );
}
