"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Globe, Image as ImageIcon, Trash2, Plus, UploadCloud, Copy, RefreshCw, Download,
  Loader2, CircleCheck, CircleAlert, ExternalLink, Users, ShieldCheck, Hammer, Rocket, History,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/client/api";
import { cn, timeAgo } from "@/lib/utils";
import { useStudio } from "@/store/studio";
import { updateProjectAction } from "@/lib/actions/projects";
import { loadTemplateIntoProjectAction } from "@/lib/actions/projects";
import { restoreVersionAction, listVersionsAction } from "@/lib/actions/versions";
import { TEMPLATE_METAS } from "@/lib/templates/catalog";
import { addDomainAction, verifyDomainAction, removeDomainAction, listDomainsAction } from "@/lib/actions/domains";
import { inviteMemberAction, listMembersAction, removeMemberAction, updateMemberRoleAction } from "@/lib/actions/members";

interface ModalShellProps {
  title: string;
  icon?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}

function Shell({ title, icon, wide, children }: ModalShellProps) {
  const close = useStudio((s) => s.closeModal);
  const open = useStudio((s) => s.modal) !== null;
  return (
    <Modal open={open} onClose={close} title={title} wide={wide}>
      {children}
    </Modal>
  );
}

export function StudioModals() {
  const modal = useStudio((s) => s.modal);
  if (!modal) return null;
  switch (modal) {
    case "generate": return <GenerateModal />;
    case "settings": return <SettingsModal />;
    case "assets": return <AssetsModal />;
    case "templates": return <TemplatesModal />;
    case "versions": return <VersionsModal />;
    case "seo": return <SeoModal />;
    case "export": return <ExportModal />;
    case "publish": return <PublishModal />;
    case "domains": return <DomainsModal />;
    case "members": return <MembersModal />;
  }
  return null;
}

function GenerateModal() {
  const project = useStudio((s) => s.project)!;
  const hasDoc = Boolean(useStudio((s) => s.doc));
  const busy = useStudio((s) => s.aiBusy);
  const runGenerate = useStudio((s) => s.runGenerate);
  const close = useStudio((s) => s.closeModal);
  const [prompt, setPrompt] = useState("");
  return (
    <Shell title={hasDoc ? "Regenerate website" : "Generate website"} icon={<Sparkles className="w-4 h-4 text-acc-soft" />}>
      <p className="text-sm text-zinc-500 leading-relaxed">
        {hasDoc
          ? "The AI will build a brand-new version from your prompt. Your current version stays in history so you can always restore it."
          : "Describe the website you want — the AI plans the sitemap, writes the copy, designs the theme and saves a version."}
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!prompt.trim() || busy) return;
          close();
          void runGenerate(prompt, true);
        }}
      >
        <Textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Create a modern SaaS website for an AI startup — dark theme, pricing, testimonials, FAQ…"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={busy || !prompt.trim()}>
            {busy ? <Loader2 className="w-4 h-4 spin-slow" /> : <Sparkles className="w-4 h-4" />}
            {hasDoc ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </form>
    </Shell>
  );
}

function SettingsModal() {
  const project = useStudio((s) => s.project)!;
  const close = useStudio((s) => s.closeModal);
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Project settings">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await updateProjectAction({ projectId: project.id, name, description: desc || undefined });
          setBusy(false);
          if (!res.ok) {
            toast(res.error ?? "Could not save", "error");
            return;
          }
          toast("Settings saved");
          close();
          router.refresh();
        }}
      >
        <Field label="Project name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Subdomain">
          <Input value={`${project.slug}.webforge.app`} disabled />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this project about?" />
        </Field>
        <div className="flex items-center justify-between">
          <StatusPill tone="zinc">{project.role.toLowerCase()} · {project.plan.toLowerCase()} plan</StatusPill>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="submit" disabled={busy}>Save</Button>
          </div>
        </div>
      </form>
    </Shell>
  );
}

interface AssetRow {
  id: string;
  name: string;
  url: string | null;
  kind: string;
  isAiGenerated: boolean;
  createdAt: string;
}

function AssetsModal() {
  const project = useStudio((s) => s.project)!;
  const role = project.role;
  const doc = useStudio((s) => s.doc);
  const activePage = useStudio((s) => s.activePage);
  const applyOps = useStudio((s) => s.applyOps);
  const close = useStudio((s) => s.closeModal);
  const [assets, setAssets] = useState<AssetRow[] | null>(null);
  const [tab, setTab] = useState<"library" | "ai">("library");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const canEdit = role === "OWNER" || role === "ADMIN" || role === "EDITOR";

  const load = async () => {
    try {
      const res = await apiFetch<{ assets: AssetRow[] }>(`/api/projects/${project.id}/assets`);
      setAssets(res.assets);
    } catch (e) {
      setAssets([]);
      if (e instanceof ApiClientError && e.status !== 401) toast(e.message, "error");
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", files[0]);
    try {
      const res = await fetch(`/api/projects/${project.id}/assets`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error?.message ?? "Upload failed");
      toast("Asset uploaded");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ url: string; id: string }>(`/api/projects/${project.id}/assets/generate-images`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      toast("Image generated and saved to your assets");
      setPrompt("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Generation failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/api/projects/${project.id}/assets?assetId=${id}`, { method: "DELETE" });
      setAssets((a) => a?.filter((x) => x.id !== id) ?? a);
      toast("Asset deleted");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const insert = (url: string) => {
    if (!doc) return;
    const name = prompt || "AI asset";
    try {
      applyOps([
        { op: "ADD_ASSET", asset: { url, name, kind: "image", generated: true } },
        {
          op: "ADD_SECTION",
          pageIndex: activePage,
          type: "gallery",
          props: { title: "Featured", accentWord: "visuals", sub: "", items: [{ image: url, title: name, desc: "" }] },
        },
      ]);
      toast("Added to the current page");
      close();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not insert asset", "error");
    }
  };

  return (
    <Shell title="Assets" icon={<ImageIcon className="w-4 h-4 text-acc-soft" />} wide>
      <div className="flex gap-1.5 mb-4">
        {(["library", "ai"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("wf-tab-btn px-3 py-1.5 rounded-lg text-xs border border-white/10 text-zinc-400", tab === t && "active")}
          >
            {t === "library" ? "Library" : "AI image generator"}
          </button>
        ))}
      </div>

      {tab === "ai" ? (
        <div className="glass rounded-xl p-4">
          <p className="text-[11px] text-zinc-500 mb-2">Describe the image — generated results are saved straight to this project&apos;s library.</p>
          <div className="flex gap-2">
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A hero illustration of a rocket leaving Earth, dark navy, crimson glow" />
            <Button onClick={generateImage} disabled={busy || !canEdit}>
              {busy ? <Loader2 className="w-4 h-4 spin-slow" /> : <Sparkles className="w-4 h-4" />} Generate
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500">{assets?.length ?? 0} asset{(assets?.length ?? 0) === 1 ? "" : "s"}</p>
          <label className="btn-acc text-white text-xs font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2 cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5" /> Upload
            <input type="file" accept="image/*" className="hidden" disabled={!canEdit} onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
      )}

      {assets === null && <div className="grid grid-cols-3 gap-4"><div className="skel h-28 rounded-xl" /><div className="skel h-28 rounded-xl" /><div className="skel h-28 rounded-xl" /></div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
        {assets?.map((a) => (
          <div key={a.id} className="glass rounded-xl overflow-hidden group">
            <div className="relative h-28 bg-black/30">
              {a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">◼</div>
              )}
              {a.isAiGenerated && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-wider bg-acc text-white px-1.5 py-0.5 rounded">AI</span>}
            </div>
            <div className="px-3 py-2">
              <p className="text-[11px] font-semibold text-white truncate" title={a.name}>{a.name}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <button className="text-[10px] text-acc-soft hover:underline" onClick={() => a.url && insert(a.url)} disabled={!canEdit || !a.url}>
                  + Insert on page
                </button>
                <button className="ml-auto text-zinc-600 hover:text-red-400 p-0.5" aria-label="Delete asset" onClick={() => remove(a.id)} disabled={!canEdit}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {assets !== null && assets.length === 0 && (
        <p className="text-center text-xs text-zinc-600 py-8">
          No assets yet — upload an image or use the AI image generator.
        </p>
      )}
    </Shell>
  );
}

function TemplatesModal() {
  const project = useStudio((s) => s.project)!;
  const close = useStudio((s) => s.closeModal);
  const replaceDoc = useStudio((s) => s.replaceDoc);
  const addMessage = useStudio((s) => s.addMessage);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const useTemplate = async (slug: string) => {
    setBusySlug(slug);
    const res = await loadTemplateIntoProjectAction(project.id, slug);
    setBusySlug(null);
    if (!res.ok || !res.doc) {
      toast(res.error ?? "Could not load template", "error");
      return;
    }
    replaceDoc(res.doc);
    const meta = TEMPLATE_METAS.find((t) => t.slug === slug);
    addMessage({ role: "assistant", content: `Loaded the ${meta?.name ?? slug} template into this project (new version saved). Tell me what to adjust — colors, copy, sections — and I'll handle it.` });
    toast("Template loaded");
    close();
  };

  return (
    <Shell title="Template gallery" icon={<Hammer className="w-4 h-4 text-acc-soft" />} wide>
      <p className="text-xs text-zinc-500 mb-4">Starting fresh applies the template as a new version — your current one stays in history.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATE_METAS.map((t) => (
          <button key={t.slug} onClick={() => useTemplate(t.slug)} disabled={Boolean(busySlug)} className="group glass rounded-xl overflow-hidden text-left card-hover">
            <div className="h-24 bg-[#101013] flex items-center justify-center">
              {t.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.coverImage} alt={t.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500" />
              ) : (
                <span className="font-display text-lg font-bold" style={{ color: t.accent }}>{t.name}</span>
              )}
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-[10px] text-zinc-500">{t.category}</div>
              </div>
              {busySlug === t.slug ? <Loader2 className="w-4 h-4 spin-slow text-acc-soft" /> : <Plus className="w-4 h-4 text-acc-soft" />}
            </div>
          </button>
        ))}
      </div>
    </Shell>
  );
}

interface VersionRow {
  id: string;
  version: number;
  message: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string | null } | null;
}

function VersionsModal() {
  const project = useStudio((s) => s.project)!;
  const router = useRouter();
  const close = useStudio((s) => s.closeModal);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await listVersionsAction(project.id);
      setVersions(res.map((v) => ({ ...v, createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt) })));
    } catch {
      setVersions([]);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restore = async (id: string) => {
    if (!window.confirm("Restore this version? It will be saved as a new version so nothing is lost.")) return;
    setBusyId(id);
    const res = await restoreVersionAction(project.id, id);
    setBusyId(null);
    if (!res.ok) {
      toast(res.error ?? "Could not restore", "error");
      return;
    }
    toast(`Version restored`);
    close();
    router.refresh();
  };

  return (
    <Shell title="Version history" icon={<History className="w-4 h-4 text-acc-soft" />} wide>
      {versions === null && <div className="space-y-2"><div className="skel h-12 rounded-xl" /><div className="skel h-12 rounded-xl" /></div>}
      <div className="space-y-2">
        {versions?.map((v) => (
          <div key={v.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-acc/15 border border-acc/25 text-acc-soft flex items-center justify-center text-[11px] font-bold font-display shrink-0">
              {v.version}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{v.message ?? `Version ${v.version}`}</div>
              <div className="text-[11px] text-zinc-600">
                {timeAgo(v.createdAt)} · {v.createdBy?.name ?? v.createdBy?.email ?? "WebForge AI"}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => restore(v.id)} disabled={busyId === v.id}>
              {busyId === v.id ? <Loader2 className="w-3.5 h-3.5 spin-slow" /> : <RefreshCw className="w-3.5 h-3.5" />} Restore
            </Button>
          </div>
        ))}
      </div>
    </Shell>
  );
}

interface SeoCheck {
  id: string;
  label: string;
  ok: boolean;
  weight: number;
  detail?: string;
}

function SeoModal() {
  const project = useStudio((s) => s.project)!;
  const busy = useStudio((s) => s.aiBusy);
  const runPrompt = useStudio((s) => s.runPrompt);
  const close = useStudio((s) => s.closeModal);
  const [report, setReport] = useState<{ score: number; checks: SeoCheck[] } | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setState("loading");
    try {
      const res = await apiFetch<{ score: number; checks: SeoCheck[] }>(`/api/projects/${project.id}/seo`);
      setReport(res);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the SEO report");
      setState("error");
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const improve = async () => {
    close();
    await runPrompt("Improve SEO: tighten every page's title and meta description and add schema.org structured data where missing.");
  };

  return (
    <Shell title="SEO report" icon={<ShieldCheck className="w-4 h-4 text-acc-soft" />} wide>
      {state === "loading" && <div className="skel h-40 rounded-xl" />}
      {state === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-400"><CircleAlert className="w-4 h-4" /> {error}</div>
      )}
      {report && (
        <>
          <div className="glass rounded-xl p-5 flex items-center gap-5">
            <div className="text-center">
              <div className={cn("font-display font-bold text-5xl", report.score >= 80 ? "text-emerald-400" : report.score >= 50 ? "text-amber-400" : "text-red-400")}>
                {report.score}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">/ 100</div>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${report.score}%`, background: report.score >= 80 ? "linear-gradient(90deg,#10b981,#34d399)" : "linear-gradient(90deg,#f59e0b,#e11d48)" }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-2">
                Score is computed from {report.checks.length} real checks against this site&apos;s schema — content, accessibility, metadata and links.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {report.checks.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5 text-[13px]">
                {c.ok ? (
                  <CircleCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <CircleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={cn(c.ok ? "text-zinc-300" : "text-zinc-200")}>{c.label}</span>
                  {!c.ok && c.detail ? <div className="text-[11px] text-zinc-500">{c.detail}</div> : null}
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-5" onClick={improve} disabled={busy}>
            <Sparkles className="w-4 h-4" /> {busy ? "Running…" : "Improve SEO with AI"}
          </Button>
        </>
      )}
    </Shell>
  );
}

function ExportModal() {
  const project = useStudio((s) => s.project)!;
  const [files, setFiles] = useState<{ path: string; bytes: number }[] | null>(null);
  useEffect(() => {
    apiFetch<{ files: { path: string; bytes: number }[]; totalBytes: number }>(`/api/projects/${project.id}/code`)
      .then((res) => setFiles(res.files))
      .catch(() => setFiles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell title="Code export" icon={<Download className="w-4 h-4 text-acc-soft" />} wide>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Download a ready-to-host static build of this project — standalone HTML pages, robots.txt, sitemap.xml and the
        structured <code className="text-acc-soft">webforge.schema.json</code> that powers the site.
      </p>
      <div className="glass rounded-xl mt-4 max-h-64 overflow-auto font-mono text-xs">
        {files === null && <div className="p-3 text-zinc-600">Loading file tree…</div>}
        {files?.map((f) => (
          <div key={f.path} className="flex justify-between px-3 py-1.5 border-b border-white/5 last:border-0">
            <span className="text-zinc-300">{f.path}</span>
            <span className="text-zinc-600">{(f.bytes / 1024).toFixed(1)} KB</span>
          </div>
        ))}
      </div>
      <a
        href={`/api/projects/${project.id}/export`}
        className="btn-acc text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 mt-5"
      >
        <Download className="w-4 h-4" /> Download .zip
      </a>
      <p className="text-[11px] text-zinc-600 mt-2">Code export is included with Pro.</p>
    </Shell>
  );
}

interface DeploymentRow {
  id: string;
  status: string;
  url: string | null;
  version: number | null;
  commitLabel: string | null;
  durationMs: number | null;
  createdAt: string;
  logs: { id: string; level: string; message: string; createdAt: string }[];
}

function PublishModal() {
  const project = useStudio((s) => s.project)!;
  const role = project.role;
  const close = useStudio((s) => s.closeModal);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<DeploymentRow | null>(null);
  const [history, setHistory] = useState<DeploymentRow[]>([]);

  const canEdit = role === "OWNER" || role === "ADMIN" || role === "EDITOR";

  const loadHistory = async () => {
    try {
      const res = await apiFetch<{ deployments: DeploymentRow[] }>(`/api/projects/${project.id}/deployments`);
      setHistory(res.deployments);
      setLatest(res.deployments[0] ?? null);
    } catch {
      /* no deployments yet */
    }
  };
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const publish = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ deployment: DeploymentRow }>(`/api/projects/${project.id}/deployments`, {
        method: "POST",
        body: JSON.stringify({ message: "Manual publish" }),
      });
      setLatest(res.deployment);
      toast(res.deployment.status === "READY" ? "Your website is live 🎉" : "Deployment failed — see logs below.", res.deployment.status === "READY" ? "success" : "error");
      loadHistory();
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Deployment failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const viewUrl = latest?.url?.replace(/^https?:\/\//, "");
  const localUrl = `/${window.location.origin.includes("localhost") ? `s/${project.slug}` : `s/${project.slug}`}`;

  return (
    <Shell title="Publish" icon={<Rocket className="w-4 h-4 text-acc-soft" />} wide>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Publishing validates the schema, builds a static artifact and deploys it — real build steps with real logs, no simulation.
      </p>

      <div className="grid gap-3 mt-4">
        {latest ? (
          <div className="glass rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone={latest.status === "READY" ? "green" : latest.status === "FAILED" ? "red" : "amber"}>{latest.status.toLowerCase()}</StatusPill>
              {latest.durationMs != null && <span className="text-[11px] text-zinc-500">{(latest.durationMs / 1000).toFixed(1)}s build</span>}
              {latest.version != null && <span className="text-[11px] text-zinc-500">version {latest.version}</span>}
              {latest.commitLabel && <span className="text-[11px] text-zinc-500">{latest.commitLabel}</span>}
            </div>
            {latest.url && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="text-sm text-emerald-400 flex-1 min-w-0 truncate">{latest.url}</code>
                <a href={latest.url} target="_blank" rel="noreferrer" className="text-xs text-acc-soft hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Visit
                </a>
                <a href={localUrl} className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1">
                  <Globe className="w-3 h-3" /> local /s/{project.slug}
                </a>
              </div>
            )}
            <div className="mt-3 border-t border-white/5 pt-3 space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
              {latest.logs.map((l) => (
                <div key={l.id} className={cn("flex gap-2", l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-300" : "text-zinc-500")}>
                  <span className="shrink-0 text-zinc-700">›</span>
                  <span className="whitespace-pre-wrap break-words">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">No deployments yet for this project.</p>
        )}

        {canEdit && (
          <Button onClick={publish} disabled={busy} size="lg" className="w-full">
            {busy ? <Loader2 className="w-4 h-4 spin-slow" /> : <Rocket className="w-4 h-4" />}
            {busy ? "Building & deploying…" : latest ? "Deploy new version" : "Publish website"}
          </Button>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <h4 className="text-[11px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Deployment history</h4>
          <div className="space-y-1.5">
            {history.map((d) => (
              <div key={d.id} className="glass rounded-lg px-3 py-2 flex items-center gap-3">
                <StatusPill tone={d.status === "READY" ? "green" : d.status === "FAILED" ? "red" : "amber"}>{d.status.toLowerCase()}</StatusPill>
                <span className="text-xs text-zinc-400 flex-1 truncate">{d.commitLabel ?? "Publish"}{d.version ? ` · v${d.version}` : ""}</span>
                <span className="text-[11px] text-zinc-600">{timeAgo(d.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function DomainsModal() {
  const project = useStudio((s) => s.project)!;
  const [domains, setDomains] = useState<Awaited<ReturnType<typeof listDomainsAction>> | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setDomains(await listDomainsAction(project.id));
    } catch {
      setDomains([]);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async () => {
    setBusy(true);
    const res = await addDomainAction({ projectId: project.id, domain: domainInput });
    setBusy(false);
    if (!res.ok) {
      toast(res.error ?? "Could not add domain", "error");
      return;
    }
    setDomainInput("");
    toast("Domain added");
    load();
  };
  const verify = async (id: string) => {
    const res = await verifyDomainAction(id, project.id);
    toast(res.message ?? (res.ok ? "Domain verified" : "Verification failed"), res.ok ? "success" : "info");
    load();
  };
  const remove = async (id: string) => {
    const res = await removeDomainAction(id, project.id);
    toast(res.message ?? "Removed", res.ok ? "success" : "error");
    load();
  };

  return (
    <Shell title="Custom domains" icon={<Globe className="w-4 h-4 text-acc-soft" />}>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Serve your published site from your own domain. Add it, point the DNS records below to{" "}
        <code className="text-acc-soft">{project.slug}.webforge.app</code>, then verify.
      </p>
      <div className="flex gap-2 mt-4">
        <Input value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="mywebsite.com" />
        <Button onClick={add} disabled={busy || !domainInput.trim()}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <div className="space-y-2 mt-4">
        {domains === null && <div className="skel h-12 rounded-xl" />}
        {domains?.map((d) => (
          <div key={d.id} className="glass rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-white flex-1">{d.domain}</span>
              <StatusPill tone={d.status === "ACTIVE" ? "green" : d.status === "FAILED" ? "red" : "amber"}>{d.status.toLowerCase()}</StatusPill>
            </div>
            {d.status !== "ACTIVE" && (
              <div className="mt-2 text-[11px] text-zinc-500">
                DNS: add a <b className="text-zinc-300">CNAME</b> record pointing <code className="text-acc-soft">@{d.domain}</code> →{" "}
                <code className="text-acc-soft">{d.dnsTarget}</code>
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <button className="text-[11px] text-acc-soft hover:underline" onClick={() => verify(d.id)}>Verify now</button>
              <button className="text-[11px] text-zinc-500 hover:text-red-400 hover:underline" onClick={() => remove(d.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  pending: boolean;
}

function MembersModal() {
  const project = useStudio((s) => s.project)!;
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("EDITOR");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setMembers(await listMembersAction(project.id));
    } catch {
      setMembers([]);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invite = async () => {
    setBusy(true);
    const res = await inviteMemberAction({ projectId: project.id, email, role: role as "EDITOR" });
    setBusy(false);
    if (!res.ok) {
      toast(res.error ?? "Could not invite", "error");
      return;
    }
    setEmail("");
    toast(res.message ?? "Invitation sent");
    load();
  };

  return (
    <Shell title="Team & access" icon={<Users className="w-4 h-4 text-acc-soft" />}>
      <p className="text-sm text-zinc-400 leading-relaxed">Project members can open the studio and edit together. Roles are enforced server-side.</p>
      <div className="flex gap-2 mt-4">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" type="email" />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-panel border border-white/10 rounded-xl px-2 text-xs text-zinc-300 outline-none"
          aria-label="Role"
        >
          <option value="EDITOR">Editor</option>
          <option value="ADMIN">Admin</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <Button onClick={invite} disabled={busy || !email.trim()}>
          <Plus className="w-4 h-4" /> Invite
        </Button>
      </div>
      <div className="space-y-2 mt-4">
        {members === null && <div className="skel h-10 rounded-xl" />}
        {members?.map((m) => (
          <div key={m.id} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg btn-acc flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{m.name ?? m.email}</div>
              <div className="text-[11px] text-zinc-600 truncate">{m.pending ? "invitation pending" : m.email}</div>
            </div>
            {!m.pending && m.role !== "OWNER" ? (
              <select
                value={m.role}
                onChange={async (e) => {
                  const res = await updateMemberRoleAction({ projectId: project.id, userId: m.id, role: e.target.value as "EDITOR" });
                  if (!res.ok) toast(res.error ?? "Could not update", "error");
                  load();
                }}
                className="bg-panel border border-white/10 rounded-lg px-2 text-[11px] text-zinc-300 outline-none"
                aria-label="Member role"
              >
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
                <option value="VIEWER">Viewer</option>
              </select>
            ) : (
              <StatusPill tone="rose">{m.role.toLowerCase()}</StatusPill>
            )}
            {!m.pending && m.role !== "OWNER" && (
              <button aria-label="Remove member" className="p-1 text-zinc-600 hover:text-red-400" onClick={async () => { await removeMemberAction({ projectId: project.id, userId: m.id }); load(); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {m.pending && <span className="text-[10px] text-zinc-600">pending</span>}
          </div>
        ))}
      </div>
    </Shell>
  );
}

