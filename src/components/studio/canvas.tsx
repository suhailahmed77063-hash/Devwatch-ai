"use client";

import { Monitor, Smartphone, Tablet, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { SitePageView } from "@/components/preview/renderer";

const WIDTHS = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;
const DEVICES = [
  { id: "desktop", icon: Monitor, label: "Desktop preview" },
  { id: "tablet", icon: Tablet, label: "Tablet preview" },
  { id: "mobile", icon: Smartphone, label: "Mobile preview" },
] as const;

export function PreviewCanvas() {
  const doc = useStudio((s) => s.doc);
  const project = useStudio((s) => s.project);
  const selectedGlobal = false;
  const activePage = useStudio((s) => s.activePage);
  const device = useStudio((s) => s.device);
  const zoom = useStudio((s) => s.zoom);
  const selection = useStudio((s) => s.selection);
  const setPage = useStudio((s) => s.setPage);
  const setDevice = useStudio((s) => s.setDevice);
  const setZoom = useStudio((s) => s.setZoom);
  const selectSection = useStudio((s) => s.selectSection);
  const clearSelection = useStudio((s) => s.clearSelection);
  const openGenerate = useStudio((s) => s.openModal);

  if (!doc) {
    return (
      <div className="flex-1 min-w-0 flex flex-col bg-[#08080a]">
        <Toolbar
          device={device}
          setDevice={setDevice}
          zoom={zoom}
          setZoom={setZoom}
          onGenerate={() => openGenerate("generate")}
        />
        <div className="flex-1 overflow-auto">
          <EmptyPrompt projectName={project?.name ?? ""} />
        </div>
      </div>
    );
  }

  const page = doc.pages[activePage] ?? doc.pages[0];
  const selectedId =
    selection.type === "section" && selection.pageIndex === activePage
      ? doc.pages[selection.pageIndex]?.sections[selection.sectionIndex]?.id ?? null
      : selection.type === "section"
        ? null
        : null;

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#08080a]">
      <Toolbar device={device} setDevice={setDevice} zoom={zoom} setZoom={setZoom} onGenerate={() => openGenerate("generate")} />

      {/* page tabs */}
      <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto shrink-0">
        {doc.pages.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setPage(i)}
            className={cn(
              "shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition",
              i === activePage ? "wf-tab-btn active" : "text-zinc-500 border-white/10 hover:text-white"
            )}
          >
            {p.name}
          </button>
        ))}
        <span className="text-[11px] text-zinc-700 self-center px-2">·</span>
        <span className="text-[11px] text-zinc-700 self-center">{page.sections.length} sections</span>
      </div>

      {/* stage */}
      <div
        className="flex-1 overflow-auto p-4 md:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) clearSelection();
        }}
      >
        <div className="mx-auto transition-all duration-300" style={{ width: WIDTHS[device], maxWidth: 1100 }}>
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0c]">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/[.04] border-b border-white/5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <div className="ml-2 flex-1 bg-white/5 rounded-md px-3 py-1 text-[10px] text-zinc-500 truncate">
                {project?.slug}.webforge.app
              </div>
            </div>
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left", width: `${10000 / zoom}%` }}>
              <SitePageView
                doc={doc}
                ctx={{
                  doc,
                  device,
                  pageIndex: activePage,
                  editing: true,
                  selectedSectionId: selectedId,
                  onSelectSection: (pi, si) => selectSection(pi, si),
                  onNavigate: (slug) => {
                    const idx = doc.pages.findIndex((p) => p.slug === slug || p.slug === (slug === "#" ? "/" : slug));
                    if (idx >= 0) setPage(idx);
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toolbar({
  device,
  setDevice,
  zoom,
  setZoom,
  onGenerate,
}: {
  device: string;
  setDevice: (d: "desktop" | "tablet" | "mobile") => void;
  zoom: number;
  setZoom: (z: number) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="h-11 shrink-0 flex items-center justify-center gap-3 border-b border-white/5 px-3">
      <div className="flex items-center glass rounded-xl p-1">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            className={cn("device-btn p-1.5 rounded-lg text-zinc-400", device === d.id && "active")}
            aria-label={d.label}
            onClick={() => setDevice(d.id)}
          >
            <d.icon className="w-4 h-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 glass rounded-xl px-2 py-1">
        <button aria-label="Zoom out" className="p-1 text-zinc-400 hover:text-white" onClick={() => setZoom(zoom - 10)}>
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] w-10 text-center text-zinc-300">{zoom}%</span>
        <button aria-label="Zoom in" className="p-1 text-zinc-400 hover:text-white" onClick={() => setZoom(zoom + 10)}>
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button aria-label="Reset zoom" className="p-1 text-zinc-400 hover:text-white" onClick={() => setZoom(100)}>
          <Maximize className="w-3.5 h-3.5" />
        </button>
      </div>
      <button
        onClick={onGenerate}
        className="glass px-3 py-1.5 rounded-xl text-[11px] font-semibold text-acc-soft hover:text-white flex items-center gap-1.5"
      >
        ✨ Regenerate
      </button>
    </div>
  );
}

function EmptyPrompt({ projectName }: { projectName: string }) {
  const doc = useStudio((s) => s.doc);
  const busy = useStudio((s) => s.aiBusy);
  const stage = useStudio((s) => s.aiStage);
  const sendChat = useStudio((s) => s.runPrompt);

  if (!doc) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center text-center p-10">
        <div className="w-14 h-14 rounded-2xl btn-acc flex items-center justify-center mb-5">
          <SparklesIcon />
        </div>
        <h3 className="font-display font-bold text-2xl text-white">Start building {projectName}</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm leading-relaxed">
          Describe the website you want and the AI will generate it — structure, copy and design. Everything here is
          editable afterwards.
        </p>
        <PromptBox busy={busy} stage={stage} onRun={sendChat} />
      </div>
    );
  }
  return null;
}

export function PromptBox({
  busy,
  stage,
  onRun,
}: {
  busy: boolean;
  stage: string | null;
  onRun: (prompt: string) => void;
}) {
  return (
    <div className="mt-8 w-full max-w-2xl glow-wrap">
      <div className="glow-inner bg-[#0c0c0f] border border-white/10 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("prompt") as HTMLTextAreaElement;
            const value = input?.value.trim();
            if (value) onRun(value);
            if (input) input.value = "";
          }}
        >
          <textarea
            name="prompt"
            rows={3}
            placeholder="Create a modern SaaS website for an AI startup with pricing, testimonials and a contact section…"
            className="w-full bg-transparent resize-none outline-none text-sm text-zinc-100 placeholder-zinc-600 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <span className="text-[11px] text-zinc-600">{busy ? (stage ?? "Working…") : "Structured schema → deterministic renderer"}</span>
            <button
              type="submit"
              disabled={busy}
              className="btn-acc text-white text-sm font-semibold px-5 py-2 rounded-xl flex items-center gap-2 disabled:opacity-60"
            >
              <SparklesIcon /> {busy ? "Generating…" : "Generate Website"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.9 2.4L22 18l-2.1.6L19 21l-.9-2.4L16 18l2.1-.6L19 15z" />
    </svg>
  );
}
