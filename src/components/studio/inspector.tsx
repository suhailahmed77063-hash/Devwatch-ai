"use client";

import { useState } from "react";
import { X, MousePointerClick, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { Switch } from "@/components/ui/switch";
import { SECTION_DEFS } from "@/lib/website/sections";

type UpdateChanges = Parameters<ReturnType<typeof useStudio.getState>["updateSection"]>[2];

type Tab = "design" | "layout" | "typography" | "colors" | "spacing" | "animations";
const TABS: { id: Tab; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "layout", label: "Layout" },
  { id: "typography", label: "Typography" },
  { id: "colors", label: "Colors" },
  { id: "spacing", label: "Spacing" },
  { id: "animations", label: "Animations" },
];

const ACCENTS = ["#e11d48", "#dc143c", "#f97316", "#8b5cf6", "#3b82f6", "#10b981", "#eab308", "#ffffff"];

export function InspectorPanel() {
  const selection = useStudio((s) => s.selection);
  const doc = useStudio((s) => s.doc);
  const clearSelection = useStudio((s) => s.clearSelection);
  const [tab, setTab] = useState<Tab>("design");

  const sel = selection.type === "section" ? selection : null;
  const section = sel && doc ? doc.pages[sel.pageIndex]?.sections[sel.sectionIndex] : null;
  const sectionDef = section ? SECTION_DEFS[section.type] : null;

  return (
    <div className="w-[290px] shrink-0 border-l border-white/5 bg-panel flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <MousePointerClick className="w-4 h-4 text-acc-soft" /> Inspector
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] glass rounded-full px-2.5 py-1 text-zinc-400">
            {section ? sectionDef?.label ?? section.type : "Whole site"}
          </span>
          {section && (
            <button onClick={clearSelection} aria-label="Clear selection" className="p-1 rounded text-zinc-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pt-3 flex gap-1.5 overflow-x-auto pb-1 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "wf-tab-btn shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400",
              tab === t.id && "active"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {section ? (
          <SectionControls key={section.id} sectionIndex={sel!.sectionIndex} tab={tab} section={section} pageIndex={sel!.pageIndex} />
        ) : (
          <SiteControls tab={tab} />
        )}
      </div>
    </div>
  );
}

function SectionControls({
  pageIndex,
  sectionIndex,
  section,
  tab,
}: {
  pageIndex: number;
  sectionIndex: number;
  section: NonNullable<ReturnType<typeof useStudio.getState>["doc"]>["pages"][number]["sections"][number];
  tab: Tab;
}) {
  const updateSection = useStudio((s) => s.updateSection);
  const st = section.styles ?? {};
  const p = (section.props ?? {}) as { fs?: number; fw?: number; size?: string };
  const bgMode = st.background?.mode ?? "none";

  const set = (changes: UpdateChanges) => updateSection(pageIndex, sectionIndex, changes);

  switch (tab) {
    case "design":
      return (
        <>
          <Group label="Section background">
            <div className="grid grid-cols-3 gap-2">
              {(["none", "glass", "glow"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => set({ styles: { background: { mode: m } } })}
                  className={cn("glass rounded-lg py-2 text-[10px] text-zinc-300 capitalize", bgMode === m && "border-acc/60 text-acc-soft")}
                >
                  {m === "none" ? "None" : m}
                </button>
              ))}
            </div>
          </Group>
          <Row label="Border radius" value={`${st.radius ?? 0}px`}>
            <input type="range" min={0} max={32} value={st.radius ?? 0} className="w-full" onChange={(e) => set({ styles: { radius: +e.target.value } })} />
          </Row>
          <ToggleRow
            label="Accent shadow"
            value={Boolean(st.shadow)}
            onChange={(v) => set({ styles: { shadow: v } })}
          />
          <Row label="Opacity" value={`${Math.round((st.opacity ?? 1) * 100)}%`}>
            <input
              type="range"
              min={20}
              max={100}
              value={Math.round((st.opacity ?? 1) * 100)}
              className="w-full"
              onChange={(e) => set({ styles: { opacity: +e.target.value / 100 } })}
            />
          </Row>
          {bgMode === "solid" && (
            <Group label="Background color">
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    className={cn("swatch", st.background?.color === c && "on")}
                    style={{ background: c }}
                    aria-label={c}
                    onClick={() => set({ styles: { background: { mode: "solid", color: c } } })}
                  />
                ))}
              </div>
            </Group>
          )}
        </>
      );
    case "layout":
      return (
        <>
          <Group label="Alignment">
            <div className="grid grid-cols-3 gap-2">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => set({ styles: { textAlign: a } })}
                  className={cn("glass rounded-lg py-2 text-[10px] text-zinc-300 capitalize", (st.textAlign ?? "left") === a && "border-acc/60 text-acc-soft")}
                >
                  {a}
                </button>
              ))}
            </div>
          </Group>
          <Row label="Container width" value={`${st.maxWidth ?? 94}%`}>
            <input type="range" min={60} max={100} value={st.maxWidth ?? 94} className="w-full" onChange={(e) => set({ styles: { maxWidth: +e.target.value } })} />
          </Row>
          <Row label="Column gap" value={`${st.gap ?? 14}px`}>
            <input type="range" min={0} max={48} value={st.gap ?? 14} className="w-full" onChange={(e) => set({ styles: { gap: +e.target.value } })} />
          </Row>
          <p className="text-[10px] text-zinc-600 leading-relaxed">Base styles apply to every breakpoint. Open a device view to check the result.</p>
        </>
      );
    case "typography":
      return (
        <>
          <Row label="Title size" value={`${p.fs ?? 30}px`}>
            <input type="range" min={18} max={64} value={p.fs ?? 30} className="w-full" onChange={(e) => set({ props: { fs: +e.target.value } })} />
          </Row>
          <Group label="Title weight">
            <div className="grid grid-cols-4 gap-2">
              {[400, 500, 600, 700, 800].slice(0, 4).map((w) => (
                <button
                  key={w}
                  onClick={() => set({ props: { fw: w } })}
                  className={cn("glass rounded-lg py-2 text-[11px] text-zinc-300", (p.fw ?? 700) === w && "border-acc/60 text-acc-soft")}
                  style={{ fontWeight: w }}
                >
                  {w}
                </button>
              ))}
            </div>
          </Group>
        </>
      );
    case "colors":
      return <SwatchGroup value={useStudio.getState().doc!.theme.primaryColor} onChange={(c) => useStudio.getState().updateTheme({ primaryColor: c })} hint="Accent color applies site-wide. Use the background color picker in Design for a custom section tint." />;
    case "spacing":
      return (
        <>
          <Row label="Vertical padding" value={`${st.paddingY ?? 44}px`}>
            <input type="range" min={0} max={160} value={st.paddingY ?? 44} className="w-full" onChange={(e) => set({ styles: { paddingY: +e.target.value } })} />
          </Row>
          <Row label="Horizontal padding" value={`${st.paddingX ?? 0}px`}>
            <input type="range" min={0} max={96} value={st.paddingX ?? 0} className="w-full" onChange={(e) => set({ styles: { paddingX: +e.target.value } })} />
          </Row>
        </>
      );
    case "animations":
      return <AnimControls enabled={section.animation.effect !== "none"} duration={section.animation.durationSec} delay={section.animation.delayMs} set={set} />;
  }
}

function SiteControls({ tab }: { tab: Tab }) {
  const doc = useStudio((s) => s.doc);
  const updateTheme = useStudio((s) => s.updateTheme);
  const commit = useStudio((s) => s.commit);
  if (!doc) return <p className="text-xs text-zinc-600">Generate a website first — then the whole site&apos;s theme is editable here.</p>;

  switch (tab) {
    case "colors":
      return <SwatchGroup value={doc.theme.primaryColor} onChange={(c) => updateTheme({ primaryColor: c })} hint="Nothing selected — changes apply to the whole site." />;
    case "design":
      return (
        <>
          <Group label="Heading font">
            <div className="grid grid-cols-2 gap-2">
              {["Space Grotesk", "Inter"].map((f) => (
                <button
                  key={f}
                  onClick={() => updateTheme({ headingFont: f as never })}
                  className={cn("glass rounded-lg py-2 text-[11px] text-zinc-300", doc.theme.headingFont === f && "border-acc/60 text-acc-soft")}
                >
                  {f}
                </button>
              ))}
            </div>
          </Group>
          <Group label="Body font">
            <div className="grid grid-cols-2 gap-2">
              {["Inter", "Space Grotesk"].map((f) => (
                <button
                  key={f}
                  onClick={() => updateTheme({ bodyFont: f as never })}
                  className={cn("glass rounded-lg py-2 text-[11px] text-zinc-300", doc.theme.bodyFont === f && "border-acc/60 text-acc-soft")}
                >
                  {f}
                </button>
              ))}
            </div>
          </Group>
          <Row label="Global radius" value={`${doc.theme.radius}px`}>
            <input type="range" min={0} max={24} value={doc.theme.radius} className="w-full" onChange={(e) => updateTheme({ radius: +e.target.value })} />
          </Row>
          <ToggleRow
            label="Navbar visible"
            value={doc.globalComponents.navbar.enabled}
            onChange={(v) => {
              const next = JSON.parse(JSON.stringify(doc)) as typeof doc;
              next.globalComponents.navbar.enabled = v;
              commit(next);
            }}
          />
          <ToggleRow
            label="Sticky navbar"
            value={doc.globalComponents.navbar.sticky}
            onChange={(v) => {
              const next = JSON.parse(JSON.stringify(doc)) as typeof doc;
              next.globalComponents.navbar.sticky = v;
              commit(next);
            }}
          />
          <ToggleRow
            label="Footer visible"
            value={doc.globalComponents.footer.enabled}
            onChange={(v) => {
              const next = JSON.parse(JSON.stringify(doc)) as typeof doc;
              next.globalComponents.footer.enabled = v;
              commit(next);
            }}
          />
        </>
      );
    case "typography":
      return <p className="text-xs text-zinc-600">Select a section to tune its type. Whole-site fonts live under Design.</p>;
    case "layout":
      return <p className="text-xs text-zinc-600">Select a section to adjust its layout.</p>;
    case "spacing":
      return <p className="text-xs text-zinc-600">Select a section to tune its spacing.</p>;
    case "animations":
      return <p className="text-xs text-zinc-600">Select a section to configure its entrance animation.</p>;
  }
}

function AnimControls({ enabled, duration, delay, set }: { enabled: boolean; duration: number; delay: number; set: (c: UpdateChanges) => void }) {
  const [nonce, setNonce] = useState(0);
  return (
    <>
      <ToggleRow
        label="Entrance animation"
        value={enabled}
        onChange={(v) => set({ animation: { effect: v ? "fadeUp" : "none" } })}
      />
      <Row label="Duration" value={`${duration.toFixed(1)}s`}>
        <input type="range" min={2} max={30} value={Math.round(duration * 10)} className="w-full" onChange={(e) => set({ animation: { durationSec: +e.target.value / 10 } })} />
      </Row>
      <Row label="Delay" value={`${delay}ms`}>
        <input type="range" min={0} max={1200} step={50} value={delay} className="w-full" onChange={(e) => set({ animation: { delayMs: +e.target.value } })} />
      </Row>
      <button
        className="w-full glass rounded-xl py-2 text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-2"
        onClick={() => setNonce((n) => n + 1)}
      >
        <Play className="w-3.5 h-3.5" /> Replay animation {nonce > 0 ? "✓" : ""}
      </button>
    </>
  );
}

function SwatchGroup({ value, onChange, hint }: { value: string; onChange: (c: string) => void; hint?: string }) {
  return (
    <>
      <Group label="Primary accent">
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((c) => (
            <button key={c} className={cn("swatch", value.toLowerCase() === c && "on")} style={{ background: c }} aria-label={c} onClick={() => onChange(c)} />
          ))}
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-8 h-8 rounded cursor-pointer border border-white/10 bg-transparent"
          aria-label="Custom accent color"
        />
      </Group>
      {hint && <p className="text-[10px] text-zinc-600 leading-relaxed">{hint}</p>}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 flex justify-between mb-2">
        <span>{label}</span>
        <span className="text-zinc-300">{value}</span>
      </label>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <Switch checked={value} onChange={onChange} label={label} />
    </div>
  );
}

