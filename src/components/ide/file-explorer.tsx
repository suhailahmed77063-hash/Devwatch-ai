"use client";

import { useState, useMemo } from "react";
import {
  FileCode2, Folder, FolderOpen, ChevronRight, Plus, Trash2, Pencil,
  RefreshCw, Search, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FileItem {
  path: string;
  size: number;
  updatedAt?: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  file?: FileItem;
}

function buildTree(files: FileItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const f of files) {
    const parts = f.path.split("/");
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isDir = i < parts.length - 1;
      let node = level.find((n) => n.name === part && n.isDir === isDir);
      if (!node) {
        node = { name: part, path: acc, isDir, children: [] };
        level.push(node);
      }
      if (!isDir) {
        node.file = f;
      }
      level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) =>
    nodes.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  const sortRec = (nodes: TreeNode[]) => {
    sort(nodes);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(root);
  return root;
}

function getFileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, string> = {
    ts: "🟦", tsx: "🟦", js: "🟨", jsx: "🟨",
    json: "📋", html: "🌐", css: "🎨", prisma: "💎",
    md: "📝", yaml: "⚙️", yml: "⚙️", sql: "🗃️",
    gitignore: "🔒", env: "🔐", txt: "📄",
  };
  return iconMap[ext] || "📄";
}

export function FileExplorer({
  files,
  activePath,
  onOpen,
  onNewFile,
  onDelete,
  onRefresh,
  loading,
}: {
  files: FileItem[];
  activePath: string | null;
  onOpen: (path: string) => void;
  onNewFile: () => void;
  onDelete: (path: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}) {
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set(["src"]));
  const [search, setSearch] = useState("");
  const tree = useMemo(() => buildTree(files), [files]);

  const toggle = (path: string) =>
    setOpenDirs((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const filteredTree = useMemo(() => {
    if (!search) return tree;
    const needle = search.toLowerCase();
    const filter = (nodes: TreeNode[]): TreeNode[] =>
      nodes
        .filter((n) => n.name.toLowerCase().includes(needle) || n.path.toLowerCase().includes(needle))
        .map((n) => ({ ...n, children: n.isDir ? filter(n.children) : [] }));
    return filter(tree);
  }, [tree, search]);

  const render = (nodes: TreeNode[], depth: number) =>
    nodes.map((n) =>
      n.isDir ? (
        <div key={n.path}>
          <button
            className="w-full flex items-center gap-1.5 text-[11.5px] text-zinc-400 hover:text-zinc-200 px-1.5 py-[3px] rounded transition text-left group"
            style={{ paddingLeft: 6 + depth * 14 }}
            onClick={() => toggle(n.path)}
          >
            <ChevronRight
              className={cn("w-3 h-3 transition-transform", openDirs.has(n.path) && "rotate-90")}
            />
            {openDirs.has(n.path) ? (
              <FolderOpen className="w-3.5 h-3.5 text-acc-soft" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span className="truncate">{n.name}</span>
          </button>
          {openDirs.has(n.path) && render(n.children, depth + 1)}
        </div>
      ) : (
        <button
          key={n.path}
          className={cn(
            "w-full flex items-center gap-1.5 text-[11.5px] px-1.5 py-[3px] rounded transition text-left group",
            n.path === activePath ? "bg-acc/15 text-white" : "text-zinc-400 hover:text-zinc-200"
          )}
          style={{ paddingLeft: 22 + depth * 14 }}
          onClick={() => onOpen(n.path)}
          title={n.path}
        >
          <span className="text-[10px] shrink-0">{getFileIcon(n.name)}</span>
          <span className="truncate flex-1">{n.name}</span>
          <span className="hidden group-hover:flex items-center gap-1 text-zinc-500">
            <button
              aria-label={`Delete ${n.name}`}
              className="p-0.5 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(n.path);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        </button>
      )
    );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-zinc-300 flex-1">Files</span>
        <span className="text-[10px] text-zinc-600">{files.length}</span>
        <button
          onClick={onRefresh}
          className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>
        <button
          onClick={onNewFile}
          className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white"
          title="New file"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-white/5 border border-white/10 rounded-md pl-6 pr-2 py-1 text-[11px] outline-none focus:border-acc/50 text-zinc-300 placeholder-zinc-600"
          />
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 py-1">
        {filteredTree.length === 0 ? (
          <p className="text-[11px] text-zinc-600 px-3 py-4 text-center">
            {search ? "No files match" : "No files yet"}
          </p>
        ) : (
          render(filteredTree, 0)
        )}
      </div>
    </div>
  );
}
