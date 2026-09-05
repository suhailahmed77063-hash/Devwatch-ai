"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban, Plus, Search, MoreHorizontal, Archive, Trash2, Copy, ExternalLink, Pencil, Globe,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { timeAgo, cn } from "@/lib/utils";
import { archiveProjectAction, deleteProjectAction, duplicateProjectAction, restoreProjectAction, updateProjectAction } from "@/lib/actions/projects";
import type { ProjectListItem } from "@/lib/server/data/projects";
import { CreditsBanner } from "@/components/ui/credits-banner";

type Item = ProjectListItem & { role: string };

const STATUS_TONE = { DRAFT: "zinc", GENERATING: "amber", READY: "green", ARCHIVED: "zinc" } as const;

export function ProjectsClient({ initial, showArchived }: { initial: Item[]; showArchived?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<Item | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;
    if (!showArchived) list = list.filter((i) => i.status !== "ARCHIVED");
    if (needle) {
      list = list.filter((i) => i.name.toLowerCase().includes(needle) || i.slug.toLowerCase().includes(needle));
    }
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [items, q, showArchived]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string; message?: string; projectId?: string }>, msg: string, navigate?: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      toast(res.error ?? msg, "error");
      return;
    }
    toast(res.message ?? msg);
    setMenuFor(null);
    if (navigate) {
      router.push(navigate);
      return;
    }
    router.refresh();
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <CreditsBanner />
      <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-white">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">{filtered.length} project{filtered.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </Link>
      </div>

      <div className="relative mt-6 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="pl-10" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {filtered.map((p) => (
          <div key={p.id} className="group glass rounded-2xl p-5 card-hover relative">
            <div className="flex items-start justify-between">
              <span className="w-11 h-11 rounded-xl bg-acc/15 border border-acc/25 text-acc-soft flex items-center justify-center">
                <FolderKanban className="w-5 h-5" />
              </span>
              <div className="relative">
                <button onClick={() => setMenuFor(menuFor === p.id ? null : p.id)} aria-label="Project menu" className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuFor === p.id && (
                  <div className="absolute right-0 top-full mt-1 z-30 glass bg-panel rounded-xl p-1.5 min-w-[190px] text-sm">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5" onClick={() => { setRenaming(p); setNameDraft(p.name); setMenuFor(null); }}>
                      <Pencil className="w-4 h-4" /> Rename
                    </button>
                    <Link href={`/studio/${p.id}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5">
                      <ExternalLink className="w-4 h-4" /> Open studio
                    </Link>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5" disabled={busy} onClick={() => run(() => duplicateProjectAction(p.id), "Project duplicated")}>
                      <Copy className="w-4 h-4" /> Duplicate
                    </button>
                    {p.status === "ARCHIVED" ? (
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:bg-white/5" disabled={busy} onClick={() => run(() => restoreProjectAction(p.id), "Project restored")}>
                        <Archive className="w-4 h-4" /> Unarchive
                      </button>
                    ) : (
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-300 hover:bg-amber-500/10" disabled={busy} onClick={() => run(() => archiveProjectAction(p.id), "Project archived")}>
                        <Archive className="w-4 h-4" /> Archive
                      </button>
                    )}
                    {p.role === "OWNER" && (
                      <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10" onClick={() => { setConfirmDelete(p); setMenuFor(null); }}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Link href={`/studio/${p.id}`} className="block mt-4">
              <h3 className="font-display font-semibold text-lg text-white truncate hover:text-acc-soft transition">{p.name}</h3>
              <p className="text-xs text-zinc-600 truncate mt-0.5">{p.slug}.webforge.app</p>
              {p.description ? <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">{p.description}</p> : null}
            </Link>

            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <StatusPill tone={STATUS_TONE[p.status] ?? "zinc"}>{p.status.toLowerCase()}</StatusPill>
              {p.pageCount > 0 && <span className="text-[11px] text-zinc-600">{p.pageCount} page{p.pageCount === 1 ? "" : "s"}</span>}
              {p.role !== "OWNER" && <StatusPill tone="rose">{p.role}</StatusPill>}
              <span className="text-[11px] text-zinc-600 ml-auto">{timeAgo(p.updatedAt)}</span>
            </div>
            {p.publishedUrl ? (
              <a href={p.publishedUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:underline">
                <Globe className="w-3 h-3" /> {p.publishedUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl mt-6 p-12 text-center">
          <p className="text-zinc-500 text-sm">No projects {q ? "match your search" : "yet"}.</p>
          <Link href="/projects/new" className="btn-acc text-white text-sm font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 mt-5">
            <Plus className="w-4 h-4" /> Create your first project
          </Link>
        </div>
      )}

      {/* rename modal */}
      <Modal open={Boolean(renaming)} onClose={() => setRenaming(null)} title="Rename project">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!renaming) return;
            await run(() => updateProjectAction({ projectId: renaming.id, name: nameDraft }), "Project renamed");
            setRenaming(null);
          }}
          className="space-y-4"
        >
          <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} required maxLength={80} autoFocus />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type="submit" disabled={busy}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* delete confirm */}
      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Delete project?">
        <p className="text-sm text-zinc-400 leading-relaxed">
          <b className="text-white">{confirmDelete?.name}</b> and all its versions, assets and deployments will be permanently deleted.
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!confirmDelete) return;
              await run(() => deleteProjectAction(confirmDelete.id), "Project deleted");
              setConfirmDelete(null);
            }}
          >
            <Trash2 className="w-4 h-4" /> Delete forever
          </Button>
        </div>
      </Modal>
    </div>
  );
}
