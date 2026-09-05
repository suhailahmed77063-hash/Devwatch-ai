/**
 * GitHub Service — clone, commit, push, create PR, list repos.
 *
 * Uses the GitHub REST API (https://api.github.com).
 * Requires a Personal Access Token or OAuth token with repo scope.
 */

import { logger } from "../logger";

const GITHUB_API = "https://api.github.com";

export interface GitHubConfig {
  token: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
  created_at: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  created_at: string;
  head: { ref: string; sha: string };
  base: { ref: string };
}

// ── API Helper ────────────────────────────────────────────────────────────────

async function githubFetch(config: GitHubConfig, path: string, options: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "Authorization": `Bearer ${config.token}`,
      "User-Agent": "AIForge/1.0",
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error("github.api_error", { path, status: res.status, body: body.slice(0, 500) });
    throw new Error(`GitHub API error ${res.status}: ${body.slice(0, 200)}`);
  }

  return res;
}

// ── User Info ─────────────────────────────────────────────────────────────────

export async function getCurrentUser(config: GitHubConfig) {
  const res = await githubFetch(config, "/user");
  return res.json() as Promise<{
    login: string;
    id: number;
    avatar_url: string;
    name: string | null;
    email: string | null;
  }>;
}

// ── Repositories ──────────────────────────────────────────────────────────────

export async function listRepos(config: GitHubConfig, page = 1, perPage = 30): Promise<GitHubRepo[]> {
  const res = await githubFetch(config, `/user/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`);
  return res.json() as Promise<GitHubRepo[]>;
}

export async function getRepo(config: GitHubConfig, owner: string, repo: string): Promise<GitHubRepo> {
  const res = await githubFetch(config, `/repos/${owner}/${repo}`);
  return res.json() as Promise<GitHubRepo>;
}

export async function createRepo(
  config: GitHubConfig,
  name: string,
  opts?: { description?: string; private?: boolean; auto_init?: boolean }
): Promise<GitHubRepo> {
  const res = await githubFetch(config, "/user/repos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      description: opts?.description ?? "",
      private: opts?.private ?? false,
      auto_init: opts?.auto_init ?? false,
    }),
  });
  return res.json() as Promise<GitHubRepo>;
}

// ── File Operations ───────────────────────────────────────────────────────────

export async function getFileContents(
  config: GitHubConfig, owner: string, repo: string, path: string, ref?: string
): Promise<GitHubFile | null> {
  try {
    const refParam = ref ? `?ref=${ref}` : "";
    const res = await githubFetch(config, `/repos/${owner}/${repo}/contents/${path}${refParam}`);
    const data = await res.json() as any;
    if (data.encoding === "base64") {
      return { path: data.path, content: Buffer.from(data.content, "base64").toString("utf8"), sha: data.sha, size: data.size };
    }
    return { path: data.path, content: data.content ?? "", sha: data.sha, size: data.size ?? 0 };
  } catch (e) {
    if ((e as Error).message.includes("404")) return null;
    throw e;
  }
}

export async function listRepoContents(
  config: GitHubConfig, owner: string, repo: string, path = "", ref?: string
): Promise<{ name: string; path: string; type: string; size: number; sha: string }[]> {
  const refParam = ref ? `?ref=${ref}` : "";
  const res = await githubFetch(config, `/repos/${owner}/${repo}/contents/${path}${refParam}`);
  return res.json() as Promise<any[]>;
}

export async function createOrUpdateFiles(
  config: GitHubConfig,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  message: string,
  branch: string,
  baseSha?: string
): Promise<GitHubCommit> {
  // Get the latest commit SHA for the branch
  let latestSha = baseSha;
  if (!latestSha) {
    const refRes = await githubFetch(config, `/repos/${owner}/${repo}/git/ref/heads/${branch}`);
    const refData = await refRes.json() as any;
    latestSha = refData.object.sha;
  }

  // Get the tree SHA
  const commitRes = await githubFetch(config, `/repos/${owner}/${repo}/git/commits/${latestSha}`);
  const commitData = await commitRes.json() as any;
  const baseTree = commitData.tree.sha;

  // Create blobs for each file
  const tree: { path: string; mode: string; type: string; sha: string }[] = [];
  for (const file of files) {
    const blobRes = await githubFetch(config, `/repos/${owner}/${repo}/git/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: Buffer.from(file.content).toString("base64"), encoding: "base64" }),
    });
    const blobData = await blobRes.json() as any;
    tree.push({ path: file.path, mode: "100644", type: "blob", sha: blobData.sha });
  }

  // Create tree
  const treeRes = await githubFetch(config, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  const treeData = await treeRes.json() as any;

  // Create commit
  const newCommitRes = await githubFetch(config, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, tree: treeData.sha, parents: [latestSha] }),
  });
  const newCommitData = await newCommitRes.json() as any;

  // Update ref
  await githubFetch(config, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: newCommitData.sha, force: true }),
  });

  return {
    sha: newCommitData.sha,
    message,
    author: newCommitData.author?.name ?? "AIForge",
    date: newCommitData.author?.date ?? new Date().toISOString(),
    url: newCommitData.html_url ?? "",
  };
}

// ── Branches ──────────────────────────────────────────────────────────────────

export async function listBranches(config: GitHubConfig, owner: string, repo: string) {
  const res = await githubFetch(config, `/repos/${owner}/${repo}/branches`);
  return res.json() as Promise<{ name: string; commit: { sha: string } }[]>;
}

export async function createBranch(
  config: GitHubConfig, owner: string, repo: string, name: string, fromBranch = "main"
) {
  // Get source branch SHA
  const refRes = await githubFetch(config, `/repos/${owner}/${repo}/git/ref/heads/${fromBranch}`);
  const refData = await refRes.json() as any;

  // Create new ref
  const res = await githubFetch(config, `/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${name}`, sha: refData.object.sha }),
  });
  return res.json() as Promise<any>;
}

// ── Pull Requests ─────────────────────────────────────────────────────────────

export async function listPullRequests(config: GitHubConfig, owner: string, repo: string, state = "open") {
  const res = await githubFetch(config, `/repos/${owner}/${repo}/pulls?state=${state}`);
  return res.json() as Promise<GitHubPR[]>;
}

export async function createPullRequest(
  config: GitHubConfig,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
): Promise<GitHubPR> {
  const res = await githubFetch(config, `/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, head, base, body }),
  });
  return res.json() as Promise<GitHubPR>;
}

// ── Import a Repo ─────────────────────────────────────────────────────────────

export async function cloneRepoToFiles(
  config: GitHubConfig, owner: string, repo: string, branch = "main"
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};

  async function walk(dir: string) {
    const items = await listRepoContents(config, owner, repo, dir, branch);
    for (const item of items) {
      if (item.type === "file" && !item.path.startsWith("node_modules/") && !item.path.startsWith(".git/")) {
        const file = await getFileContents(config, owner, repo, item.path, branch);
        if (file) files[item.path] = file.content;
      } else if (item.type === "dir" && !item.name.startsWith(".") && item.name !== "node_modules") {
        await walk(item.path);
      }
    }
  }

  await walk("");
  return files;
}

// ── Token Validation ──────────────────────────────────────────────────────────

export async function validateToken(config: GitHubConfig): Promise<boolean> {
  try {
    const res = await githubFetch(config, "/user");
    return res.ok;
  } catch {
    return false;
  }
}
