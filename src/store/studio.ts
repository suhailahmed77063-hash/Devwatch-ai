"use client";

import { create } from "zustand";
import type { Device, SectionStyles, Theme, WebsiteSchema } from "@/types/website";
import { applyPatch, cloneDoc } from "@/lib/website/ops";
import type { Operation } from "@/types/website";
import { streamPost } from "@/lib/client/api";

export type Selection =
  | { type: "section"; pageIndex: number; sectionIndex: number }
  | { type: "none" };

export interface StudioProjectMeta {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
  version: number;
}

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export type StudioModal =
  | "generate"
  | "assets"
  | "templates"
  | "versions"
  | "seo"
  | "export"
  | "publish"
  | "domains"
  | "members"
  | "settings";

export interface ChatMessage {
  role: "user" | "assistant" | "error";
  content: string;
}

interface StudioState {
  project: StudioProjectMeta | null;
  doc: WebsiteSchema | null;
  activePage: number;
  selection: Selection;
  device: Device;
  zoom: number;
  aiBusy: boolean;
  aiStage: string | null;
  saveStatus: SaveStatus;
  modal: StudioModal | null;
  messages: ChatMessage[];

  past: string[];
  future: string[];

  init: (project: StudioProjectMeta, doc: WebsiteSchema | null) => void;
  setPage: (i: number) => void;
  selectSection: (pageIndex: number, sectionIndex: number) => void;
  clearSelection: () => void;
  setDevice: (d: Device) => void;
  setZoom: (z: number) => void;
  setSaveStatus: (s: SaveStatus) => void;
  openModal: (m: StudioModal) => void;
  closeModal: () => void;
  addMessage: (m: ChatMessage) => void;
  clearMessages: () => void;

  commit: (next: WebsiteSchema) => void;
  undo: () => void;
  redo: () => void;
  replaceDoc: (next: WebsiteSchema) => void;

  updateTheme: (patch: Partial<Theme>) => void;
  updateSection: (
    pageIndex: number,
    sectionIndex: number,
    changes: {
      styles?: Partial<SectionStyles>;
      props?: Record<string, unknown>;
      responsive?: Partial<Record<Device, Partial<SectionStyles>>>;
      animation?: Partial<WebsiteSchema["pages"][number]["sections"][number]["animation"]>;
    }
  ) => void;
  applyOps: (ops: Operation[]) => void;

  /** Send a prompt: full-site generation when the project has no site yet, otherwise an AI edit. */
  runPrompt: (text: string) => Promise<void>;
  /** Force full-site generation (regenerate). */
  runGenerate: (text: string, fillImages?: boolean) => Promise<void>;
}

const docKey = (d: WebsiteSchema) => JSON.stringify(d);

export const useStudio = create<StudioState>((set, get) => ({
  project: null,
  doc: null,
  activePage: 0,
  selection: { type: "none" },
  device: "desktop",
  zoom: 100,
  aiBusy: false,
  aiStage: null,
  saveStatus: "saved",
  modal: null,
  messages: [],
  past: [],
  future: [],

  init: (project, doc) =>
    set({
      project,
      doc,
      activePage: doc ? Math.max(0, doc.pages.findIndex((p) => p.slug === "/")) : 0,
      selection: { type: "none" },
      past: [],
      future: [],
      saveStatus: "saved",
      zoom: 100,
      device: "desktop",
      messages: [],
      aiBusy: false,
      aiStage: null,
      modal: null,
    }),

  setPage: (i) => set({ activePage: i, selection: { type: "none" } }),
  selectSection: (pageIndex, sectionIndex) => set({ selection: { type: "section", pageIndex, sectionIndex } }),
  clearSelection: () => set({ selection: { type: "none" } }),
  setDevice: (device) => set({ device }),
  setZoom: (zoom) => set({ zoom: Math.min(150, Math.max(50, zoom)) }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  clearMessages: () => set({ messages: [] }),

  commit: (next) =>
    set((s) => {
      if (!s.doc) return { doc: next };
      return {
        doc: next,
        past: [...s.past, docKey(s.doc)].slice(-40),
        future: [],
        saveStatus: "dirty",
        selection: clampSelection(s.selection, next),
      };
    }),

  undo: () =>
    set((s) => {
      if (!s.past.length || !s.doc) return s;
      const prev = s.past[s.past.length - 1];
      return {
        doc: JSON.parse(prev) as WebsiteSchema,
        past: s.past.slice(0, -1),
        future: [docKey(s.doc), ...s.future].slice(0, 40),
        saveStatus: "dirty",
        selection: { type: "none" },
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length || !s.doc) return s;
      const [nextKey, ...rest] = s.future;
      return {
        doc: JSON.parse(nextKey) as WebsiteSchema,
        past: [...s.past, docKey(s.doc)].slice(-40),
        future: rest,
        saveStatus: "dirty",
        selection: { type: "none" },
      };
    }),

  replaceDoc: (next) =>
    set((s) => ({
      doc: next,
      past: [],
      future: [],
      saveStatus: "saved", // AI pipeline already persisted the version server-side
      selection: clampSelection(s.selection, next),
      activePage: Math.max(0, next.pages.findIndex((p) => p.slug === "/")),
    })),

  updateTheme: (patch) => {
    const { doc } = get();
    if (!doc) return;
    get().commit({ ...cloneDoc(doc), theme: { ...doc.theme, ...patch } });
  },

  updateSection: (pageIndex, sectionIndex, changes) => {
    const { doc } = get();
    if (!doc) return;
    const next = cloneDoc(doc);
    const sec = next.pages[pageIndex]?.sections?.[sectionIndex];
    if (!sec) return;
    if (changes.styles) sec.styles = { ...sec.styles, ...changes.styles };
    if (changes.props) sec.props = { ...sec.props, ...changes.props };
    if (changes.animation) sec.animation = { ...sec.animation, ...changes.animation };
    if (changes.responsive) {
      sec.responsive = { ...(sec.responsive ?? {}) };
      for (const [bp, st] of Object.entries(changes.responsive)) {
        sec.responsive[bp as Device] = { ...(sec.responsive[bp as Device] ?? {}), ...(st ?? {}) };
      }
    }
    get().commit(next);
  },

  applyOps: (ops) => {
    const { doc } = get();
    if (!doc) return;
    try {
      get().commit(applyPatch(doc, ops));
    } catch {
      throw new Error("Patch could not be applied");
    }
  },

  runPrompt: async (text) => {
    const hasDoc = Boolean(get().doc);
    return run({ text, endpoint: hasDoc ? "chat" : "generate", body: (p: string) => (hasDoc ? { message: p } : { prompt: p, fillImages: true }) });
  },

  runGenerate: async (text, fillImages = false) => {
    return run({ text, endpoint: "generate", body: (p: string) => ({ prompt: p, fillImages }) });
  },
}));

async function run(opts: {
  text: string;
  endpoint: "generate" | "chat";
  body: (prompt: string) => Record<string, unknown>;
}) {
  const { project, aiBusy } = useStudio.getState();
  if (!project || aiBusy || !opts.text.trim()) return;
  const prompt = opts.text.trim();
  useStudio.setState({ aiBusy: true, aiStage: "Analyzing request…" });
  useStudio.getState().addMessage({ role: "user", content: prompt });

  const onEvent = (event: string, data: unknown) => {
    const d = data as { label?: string; reply?: string; doc?: WebsiteSchema; summary?: string; message?: string };
    switch (event) {
      case "stage":
        useStudio.setState({ aiStage: d.label ?? null });
        break;
      case "site":
        if (d.doc) useStudio.getState().replaceDoc(d.doc);
        if (d.summary) useStudio.getState().addMessage({ role: "assistant", content: d.summary });
        break;
      case "reply":
        if (d.reply) useStudio.getState().addMessage({ role: "assistant", content: d.reply });
        break;
      case "doc":
        if (d.doc) useStudio.getState().replaceDoc(d.doc);
        break;
      case "error":
        useStudio.getState().addMessage({ role: "error", content: d.message ?? "Something went wrong." });
        break;
    }
  };

  await streamPost(`/api/projects/${project.id}/${opts.endpoint}`, opts.body(prompt), {
    onEvent,
    onError: (e) => useStudio.getState().addMessage({ role: "error", content: e.message }),
  });
  useStudio.setState({ aiBusy: false, aiStage: null });
}

function clampSelection(sel: Selection, doc: WebsiteSchema): Selection {
  if (sel.type === "none") return sel;
  const page = doc.pages[sel.pageIndex];
  if (!page) return { type: "none" };
  const sectionIndex = Math.min(sel.sectionIndex, Math.max(0, page.sections.length - 1));
  return { type: "section", pageIndex: sel.pageIndex, sectionIndex };
}
