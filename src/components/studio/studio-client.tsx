"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Hammer, Undo2, Redo2, Save, Rocket, Users, MessageSquare,
  SlidersHorizontal, Loader2, CircleCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { toast } from "@/components/ui/toast";
import { saveProjectDocAction } from "@/lib/actions/studio";
import type { WebsiteSchema } from "@/types/website";
import { ChatPanel } from "./chat-panel";
import { PreviewCanvas } from "./canvas";
import { InspectorPanel } from "./inspector";
import { StudioModals } from "./modals";
import { AppWorkspace } from "@/components/app-builder/workspace";

interface ProjectMeta {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
  version: number;
}

export function StudioClient({
  project,
  initialDoc,
  initialPrompt,
}: {
  project: ProjectMeta;
  initialDoc: WebsiteSchema | null;
  initialPrompt: string | null;
}) {
  const init = useStudio((s) => s.init);
  const projectId = project.id;
  const [chatOpen, setChatOpen] = useState(false);
  const [inspOpen, setInspOpen] = useState(false);
  const [appMode, setAppMode] = useState(false);
  const bootRef = useRef(false);

  // Boot the store once per project.
  useEffect(() => {
    bootRef.current = false;
    init(project, initialDoc);
    setChatOpen(false);
    setInspOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Auto-run an initial generation when the project was created with a prompt.
  useEffect(() => {
    if (bootRef.current) return;
    if (initialPrompt && !initialDoc) {
      bootRef.current = true;
      const runGenerate = useStudio.getState().runGenerate;
      void runGenerate(initialPrompt, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const canEdit = ["OWNER", "ADMIN", "EDITOR"].includes(project.role);

  return (
    <div className="h-screen w-full overflow-hidden bg-ink text-zinc-200 flex flex-col">
      <style>{DRAWER_CSS}</style>
      <TopBar
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
        inspOpen={inspOpen}
        onToggleInsp={() => setInspOpen((v) => !v)}
        appMode={appMode}
        onToggleAppMode={() => setAppMode((v) => !v)}
      />
      {appMode ? (
        <AppWorkspace projectId={project.id} canEdit={canEdit} />
      ) : (
        <>
          <div className="flex-1 flex min-h-0">
            <div className={cn("wf-chat flex", chatOpen && "open")}>
              <ChatPanel />
            </div>
            <PreviewCanvas />
            <div className={cn("wf-insp flex", inspOpen && "open")}>
              <InspectorPanel />
            </div>
          </div>
          {chatOpen && (
            <button
              aria-label="Close AI panel"
              className="wf-shade-chat fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setChatOpen(false)}
            />
          )}
          {inspOpen && (
            <button
              aria-label="Close inspector"
              className="wf-shade-insp fixed inset-0 z-40 bg-black/70 xl:hidden"
              onClick={() => setInspOpen(false)}
            />
          )}
          <StatusBar />
        </>
      )}
      <StudioModals />
    </div>
  );
}

const DRAWER_CSS = `
  @media (max-width: 1023px) {
    .wf-chat { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%);
      transition: transform .3s cubic-bezier(.2,.7,.3,1); z-index: 60; box-shadow: 24px 0 60px rgba(0,0,0,.5); }
    .wf-chat.open { transform: none !important; }
  }
  @media (min-width: 1024px) { .wf-chat { position: static; transform: none !important; } }
  @media (max-width: 1279px) {
    .wf-insp { position: fixed; right: 0; top: 0; bottom: 0; transform: translateX(100%);
      transition: transform .3s cubic-bezier(.2,.7,.3,1); z-index: 60; box-shadow: -24px 0 60px rgba(0,0,0,.5); }
    .wf-insp.open { transform: none !important; }
  }
  @media (min-width: 1280px) { .wf-insp { position: static; transform: none !important; } }
`;

function TopBar({
  chatOpen,
  onToggleChat,
  inspOpen,
  onToggleInsp,
  appMode,
  onToggleAppMode,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
  inspOpen: boolean;
  onToggleInsp: () => void;
  appMode: boolean;
  onToggleAppMode: () => void;
}) {
  const project = useStudio((s) => s.project);
  const saveStatus = useStudio((s) => s.saveStatus);
  const doc = useStudio((s) => s.doc);
  const aiBusy = useStudio((s) => s.aiBusy);
  const past = useStudio((s) => s.past);
  const future = useStudio((s) => s.future);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const openModal = useStudio((s) => s.openModal);
  const [saving, setSaving] = useState(false);

  const canEdit = project ? ["OWNER", "ADMIN", "EDITOR"].includes(project.role) : false;
  const version = project?.version ?? 0;

  const save = async (createVersion = false) => {
    const state = useStudio.getState();
    if (appMode) return;
    if (!state.doc || !state.project || saving || aiBusy) return;
    setSaving(true);
    state.setSaveStatus("saving");
    const res = await saveProjectDocAction({
      projectId: state.project.id,
      doc: state.doc,
      message: createVersion ? `Saved from studio (${state.doc.metadata.name})` : undefined,
      createVersion,
    });
    setSaving(false);
    if (!res.ok) {
      state.setSaveStatus("error");
      toast(res.error ?? "Could not save", "error");
      return;
    }
    state.setSaveStatus("saved");
    if (createVersion) toast(`Saved as version ${res.version ?? "…"}`, "success");
  };

  // Keyboard shortcuts (ignore while the user is typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save(true);
      } else if (!typing && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (!typing && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, aiBusy, doc]);

  return (
    <header className="h-14 shrink-0 z-30 flex items-center gap-2 px-3 border-b border-white/5 glass border-x-0 border-t-0">
      <Link
        href="/projects"
        aria-label="Back to projects"
        className="p-2 -ml-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>

      <button
        aria-label={chatOpen ? "Hide AI assistant" : "Show AI assistant"}
        onClick={onToggleChat}
        className={cn("lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5", chatOpen && "text-acc-soft")}
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      <span className="w-8 h-8 rounded-xl btn-acc hidden sm:flex items-center justify-center">
        <Hammer className="w-4 h-4 text-white" />
      </span>

      <div className="min-w-0 ml-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-[260px]">
            {project?.name ?? "Studio"}
          </span>
          {saveStatus === "dirty" && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-label="Unsaved changes" />}
          {saveStatus === "saving" && <Loader2 className="w-3 h-3 text-zinc-400 spin-slow shrink-0" />}
          {saveStatus === "saved" && <CircleCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden sm:block" />}
          {saveStatus === "error" && <span className="text-[10px] font-semibold text-red-400 shrink-0">Save failed</span>}
        </div>
        <div className="text-[10px] text-zinc-500 truncate max-w-[220px] sm:max-w-[300px]">
          {project?.slug}.webforge.app · v{version} · {project?.role.toLowerCase()}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5 glass rounded-xl p-1" role="tablist" aria-label="Editor mode">
        <button
          role="tab"
          aria-selected={!appMode}
          onClick={() => appMode && onToggleAppMode()}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition",
            !appMode ? "bg-acc/20 text-white border border-acc/40" : "text-zinc-400 hover:text-white"
          )}
        >
          Website
        </button>
        <button
          role="tab"
          aria-selected={appMode}
          onClick={() => !appMode && onToggleAppMode()}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition",
            appMode ? "bg-acc/20 text-white border border-acc/40" : "text-zinc-400 hover:text-white"
          )}
        >
          App
        </button>
      </div>

      <div className="flex items-center gap-1 glass rounded-xl p-1">
        <button
          onClick={undo}
          disabled={!past.length || aiBusy}
          aria-label="Undo (Ctrl+Z)"
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!future.length || aiBusy}
          aria-label="Redo (Ctrl+Shift+Z)"
          title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={() => openModal("members")}
        disabled={!canEdit || appMode}
        aria-label="Team and access"
        className="hidden md:flex items-center gap-2 glass rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white transition disabled:opacity-40"
      >
        <Users className="w-3.5 h-3.5" /> Share
      </button>

      <button
        onClick={() => void save(true)}
        disabled={appMode || !doc || !canEdit || saving || aiBusy || saveStatus === "saving"}
        className="flex items-center gap-2 glass rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white transition disabled:opacity-40"
        title="Save as new version (Ctrl+S)"
      >
        {saving || saveStatus === "saving" ? <Loader2 className="w-3.5 h-3.5 spin-slow" /> : <Save className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{saving ? "Saving…" : saveStatus === "saved" ? "Saved" : "Save"}</span>
      </button>

      <button
        onClick={() => openModal("publish")}
        disabled={aiBusy || appMode}
        title={appMode ? "Deploy your app from the Automated QA panel" : undefined}
        className="btn-acc flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        <Rocket className="w-3.5 h-3.5" /> {appMode ? "QA" : "Publish"}
      </button>

      <button
        aria-label={inspOpen ? "Hide inspector" : "Show inspector"}
        onClick={onToggleInsp}
        className={cn("xl:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5", inspOpen && "text-acc-soft")}
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>
    </header>
  );
}

function StatusBar() {
  const doc = useStudio((s) => s.doc);
  const device = useStudio((s) => s.device);
  const zoom = useStudio((s) => s.zoom);
  const saveStatus = useStudio((s) => s.saveStatus);
  const aiBusy = useStudio((s) => s.aiBusy);
  const aiStage = useStudio((s) => s.aiStage);
  const selection = useStudio((s) => s.selection);
  const activePage = useStudio((s) => s.activePage);

  const page = doc?.pages[activePage];
  const sections = page?.sections.length ?? 0;

  return (
    <footer className="h-8 shrink-0 z-30 flex items-center gap-4 px-3 border-t border-white/5 bg-panel text-[11px] text-zinc-500 overflow-hidden">
      <span className="flex items-center gap-1.5 shrink-0">
        <span className={cn("w-1.5 h-1.5 rounded-full", saveStatus === "error" ? "bg-red-500" : saveStatus === "dirty" ? "bg-amber-400" : "bg-emerald-400")} />
        {saveStatus === "saved" ? "All changes saved" : saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed" : "Unsaved changes"}
      </span>
      {aiBusy && (
        <span className="flex items-center gap-1.5 shrink-0 text-acc-soft">
          <Loader2 className="w-3 h-3 spin-slow" /> {aiStage ?? "Working…"}
        </span>
      )}
      <span className="flex-1" />
      <span className="hidden sm:inline shrink-0">
        {doc ? `${doc.pages.length} page${doc.pages.length === 1 ? "" : "s"} · ${sections} section${sections === 1 ? "" : "s"}` : "No site yet"}
      </span>
      <span className="hidden md:inline shrink-0 capitalize">{device}</span>
      <span className="shrink-0">{zoom}%</span>
    </footer>
  );
}
