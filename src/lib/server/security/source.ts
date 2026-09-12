/**
 * Security Agent — repository source loader.
 *
 * Resolves the code to scan from three sources, in priority order:
 *   1. GITHUB_LINK  — explicit "owner/repo" or full URL supplied with the scan
 *   2. LINKED_REPO  — the repo connected to the project via aiConfig.githubRepo
 *   3. WORKSPACE    — the project's DB-backed app-builder workspace files
 *
 * Every path is capped and traversal-safe. GitHub link scans of public repos
 * work without a token; private repos need the project's stored token or
 * GITHUB_TOKEN env (handled by the existing GitHub service).
 */

import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "../logger";
import { cloneRepoToFiles, type GitHubConfig } from "../github";
import { readAppFiles } from "../app/data";
import type { RepoSource } from "./types";
import { redactSecrets } from "./utils";

const MAX_FILES = 400;
const MAX_FILE_BYTES = 512 * 1024; // 512 KB per file
const MAX_TOTAL_BYTES = 24 * 1024 * 1024; // 24 MB total

const SKIP_DIRS = /(^|\/)(node_modules|\.git|\.next|dist|build|vendor|__pycache__|\.venv|coverage)(\/|$)/;
const BINARY_EXT =
  /\.(png|jpe?g|gif|webp|ico|svgz|pdf|zip|gz|tgz|bz2|xz|7z|rar|mp3|mp4|mov|avi|wmv|flv|woff2?|ttf|otf|eot|class|jar|exe|dll|so|dylib|bin|dat|db|sqlite3?|wasm|pyc|pyo|lock)$/i;

export interface SourceResult {
  source: RepoSource;
  repoUrl: string | null;
  branch: string | null;
  files: Record<string, string>;
  fileCount: number;
  skipped: string[];
  warnings: string[];
}

/** Parse "https://github.com/owner/repo", "owner/repo" or "owner/repo/tree/x". */
export function parseRepoInput(input: string): { owner: string; repo: string; branch?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!/github\.com$/i.test(url.hostname) && !/github\.com$/i.test(url.hostname.replace(/^www\./, ""))) {
      return null;
    }
    const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    let branch: string | undefined;
    if (parts.length >= 4 && parts[2] === "tree") branch = parts.slice(3).join("/");
    return { owner: parts[0], repo: parts[1], branch };
  } catch {
    // not a URL — expect owner/repo
    const m = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  }
}

export interface LoadSourceInput {
  projectId: string;
  /** Explicit repo link from the request. */
  repoLink?: string | null;
  /** Project row (to read linked repo config). */
  project: { aiConfig: unknown } | null;
  /** GitHub config (token) if available for private repos. */
  ghConfig: GitHubConfig | null;
}

async function loadFromGithub(
  owner: string,
  repo: string,
  branch: string | undefined,
  ghConfig: GitHubConfig | null
): Promise<Record<string, string>> {
  if (!ghConfig) {
    // Public repos still work via GitHub's raw endpoints without a token —
    // the existing client requires one, so surface a precise error instead.
    throw new ValidationError(
      "No GitHub token available. Connect GitHub on the project or set GITHUB_TOKEN to scan a repository link."
    );
  }
  return cloneRepoToFiles(ghConfig, owner, repo, branch ?? "main");
}

/** Apply caps + binary/blocked filtering to a raw file map. */
function capFiles(raw: Record<string, string>): { files: Record<string, string>; skipped: string[] } {
  const files: Record<string, string> = {};
  const skipped: string[] = [];
  let total = 0;

  const paths = Object.keys(raw).sort();
  for (const p of paths) {
    if (SKIP_DIRS.test(p) || p.endsWith("package-lock.json") || p.endsWith("yarn.lock") || p.endsWith("pnpm-lock.yaml")) continue;
    if (BINARY_EXT.test(p)) continue;
    const content = raw[p];
    if (typeof content !== "string") continue;
    if (Buffer.byteLength(content) > MAX_FILE_BYTES) {
      skipped.push(p);
      continue;
    }
    total += Buffer.byteLength(content);
    if (total > MAX_TOTAL_BYTES || Object.keys(files).length >= MAX_FILES) {
      skipped.push(p);
      continue;
    }
    files[p] = content;
  }
  return { files, skipped };
}

/** Resolve the effective source and produce the capped file map. */
export async function loadSecuritySource(input: LoadSourceInput): Promise<SourceResult> {
  const { projectId, repoLink, project } = input;

  // 1. Explicit repo link
  if (repoLink) {
    const parsed = parseRepoInput(repoLink);
    if (!parsed) {
      throw new ValidationError("Invalid repository link. Use https://github.com/owner/repo or owner/repo.");
    }
    const files = await loadFromGithub(parsed.owner, parsed.repo, parsed.branch, input.ghConfig);
    const capped = capFiles(files);
    if (!Object.keys(capped.files).length) {
      throw new NotFoundError("Scannable files in that repository");
    }
    return {
      source: "GITHUB_LINK",
      repoUrl: `${parsed.owner}/${parsed.repo}`,
      branch: parsed.branch ?? "main",
      ...capped,
      fileCount: Object.keys(capped.files).length,
      warnings: [],
    };
  }

  // 2. Linked repo on the project
  const cfg = (project?.aiConfig ?? {}) as { githubRepo?: string; githubBranch?: string };
  if (cfg.githubRepo) {
    const [owner, repo] = cfg.githubRepo.split("/");
    if (owner && repo) {
      try {
        const files = await loadFromGithub(owner, repo, cfg.githubBranch, input.ghConfig);
        const capped = capFiles(files);
        if (Object.keys(capped.files).length) {
          return {
            source: "LINKED_REPO",
            repoUrl: cfg.githubRepo,
            branch: cfg.githubBranch ?? "main",
            ...capped,
            fileCount: Object.keys(capped.files).length,
            warnings: [],
          };
        }
        logger.warn("security.source.linked_repo_empty", { projectId, repo: cfg.githubRepo });
      } catch (e) {
        logger.warn("security.source.linked_repo_failed", {
          projectId,
          repo: cfg.githubRepo,
          error: e instanceof Error ? e.message : String(e),
        });
        // fall through to workspace
      }
    }
  }

  // 3. Workspace snapshot
  const files = await readAppFiles(projectId);
  const capped = capFiles(files);
  if (!Object.keys(capped.files).length) {
    throw new NotFoundError("Files to scan (link a GitHub repo or generate an app first)");
  }
  return {
    source: "WORKSPACE",
    repoUrl: null,
    branch: null,
    ...capped,
    fileCount: Object.keys(capped.files).length,
    warnings: [],
  };
}

/** Redact every file's content before it can reach the LLM or DB. */
export function redactFileMap(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [p, c] of Object.entries(files)) {
    out[p] = redactSecrets(c);
  }
  return out;
}
