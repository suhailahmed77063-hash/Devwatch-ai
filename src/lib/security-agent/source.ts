/**
 * AI Security Agent — repository source loading.
 *
 * Uses the existing Octokit GitHub client to pull a capped set of source,
 * manifest and configuration files for scanning. Accepts either a pasted
 * repo link (github.com/owner/repo) or a linked repository row, using the
 * actor's GitHub token for private repos (falls back to the app token).
 */

import { createOctokit } from "@/lib/github";
import type { Octokit } from "octokit";

export interface RepoSource {
  owner: string;
  repo: string;
  branch: string;
  files: Record<string, string>;
  fileCount: number;
  truncated: boolean;
}

const MAX_FILES = 250;
const MAX_FILE_BYTES = 200 * 1024; // skip blobs > 200 KB

const INCLUDE_PATH = /(?:^|\/)(?!.+\/)(?:[^/]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|rb|go|java|php|cs|sql|env|ya?ml|yml|json|toml|ini|cfg|conf|sh|md|txt)$|dockerfile$|dockerfile\.dev$|\.env(?:\.|$)|nginx[^/]*$)/i;

// Directories that are noise for security analysis.
const EXCLUDE_DIR = /(?:^|\/)(?:node_modules|\.git|dist|build|out|\.next|vendor|coverage|__pycache__|\.venv|venv)(?:\/|$)/i;

/** Parse "https://github.com/owner/repo(/tree/branch)" or "owner/repo". */
export function parseRepoLink(link: string): { owner: string; repo: string; branch?: string } | null {
  const cleaned = link.trim().replace(/\.git$/, "");
  const url = cleaned.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:\/tree\/([^/\s#?]+))?/i);
  if (url) return { owner: url[1], repo: url[2], branch: url[3] };
  const short = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2] };
  return null;
}

export async function loadRepoSource(opts: {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
}): Promise<RepoSource> {
  const octokit: Octokit = createOctokit(opts.token);

  // Resolve the default branch when none given.
  let branch = opts.branch;
  if (!branch) {
    const info = await octokit.rest.repos.get({ owner: opts.owner, repo: opts.repo });
    branch = info.data.default_branch || "main";
  }

  // Recursive tree — one API call for the whole repo listing.
  const tree = await octokit.rest.git.getTree({
    owner: opts.owner,
    repo: opts.repo,
    tree_sha: branch,
    recursive: "true",
  });

  const candidates = (tree.data.tree || [])
    .filter((t) => t.type === "blob" && typeof t.path === "string")
    .filter((t) => !EXCLUDE_DIR.test(t.path) && INCLUDE_PATH.test(t.path))
    .filter((t) => !t.size || t.size <= MAX_FILE_BYTES)
    .slice(0, MAX_FILES);

  const files: Record<string, string> = {};
  let truncated = tree.data.truncated ?? false;

  // Fetch contents in small concurrent batches (capped, rate-limit friendly).
  const BATCH = 8;
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (t) => {
        const res = await octokit.rest.repos.getContent({
          owner: opts.owner,
          repo: opts.repo,
          path: t.path,
          ref: branch,
        });
        if (!("content" in res.data) || res.data.type !== "file") return null;
        const buff = Buffer.from(res.data.content, "base64");
        if (buff.byteLength > MAX_FILE_BYTES) return null;
        return { path: t.path, text: buff.toString("utf8") };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) files[r.value.path] = r.value.text;
    }
  }

  if (candidates.length >= MAX_FILES) truncated = true;

  return {
    owner: opts.owner,
    repo: opts.repo,
    branch,
    files,
    fileCount: Object.keys(files).length,
    truncated,
  };
}
