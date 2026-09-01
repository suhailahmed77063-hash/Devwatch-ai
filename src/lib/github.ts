import { Octokit } from "octokit";

export function createOctokit(accessToken?: string) {
  return new Octokit({
    auth: accessToken || process.env.GITHUB_CLIENT_ID
      ? `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`
      : undefined,
  });
}

export async function fetchRepository(owner: string, repo: string, token?: string) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data;
}

export async function fetchPullRequests(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all",
  token?: string,
  page = 1,
  perPage = 30
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    state,
    page,
    per_page: perPage,
    sort: "created",
    direction: "desc",
  });
  return data;
}

export async function fetchCommits(
  owner: string,
  repo: string,
  since?: string,
  token?: string,
  page = 1,
  perPage = 30
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    since,
    page,
    per_page: perPage,
  });
  return data;
}

export async function fetchPRFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });
  return data;
}

export async function fetchPRReviews(
  owner: string,
  repo: string,
  pullNumber: number,
  token?: string
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
}

export async function fetchCIRuns(
  owner: string,
  repo: string,
  token?: string,
  branch?: string
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    branch,
    per_page: 30,
  });
  return data.workflow_runs;
}

export async function fetchIssues(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all",
  token?: string
) {
  const octokit = createOctokit(token);
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state,
    per_page: 50,
  });
  return data.filter((i) => !i.pull_request); // Exclude PRs
}

export function parseWebhookPayload(eventType: string, payload: any) {
  switch (eventType) {
    case "push":
      return {
        type: "push" as const,
        repo: payload.repository?.full_name,
        branch: payload.ref?.replace("refs/heads/", ""),
        commits: payload.commits?.map((c: any) => ({
          sha: c.id,
          message: c.message,
          author: c.author?.name || c.author?.username,
          email: c.author?.email,
          added: c.added || [],
          removed: c.removed || [],
          modified: c.modified || [],
        })) || [],
      };

    case "pull_request":
      return {
        type: "pull_request" as const,
        action: payload.action,
        pr: {
          number: payload.pull_request?.number,
          title: payload.pull_request?.title,
          body: payload.pull_request?.body,
          state: payload.pull_request?.state,
          branch: payload.pull_request?.head?.ref,
          baseBranch: payload.pull_request?.base?.ref,
          author: payload.pull_request?.user?.login,
          additions: payload.pull_request?.additions || 0,
          deletions: payload.pull_request?.deletions || 0,
          changedFiles: payload.pull_request?.changed_files || 0,
        },
      };

    case "pull_request_review":
      return {
        type: "pull_request_review" as const,
        action: payload.action,
        review: {
          prNumber: payload.pull_request?.number,
          state: payload.review?.state,
          author: payload.review?.user?.login,
          body: payload.review?.body,
        },
      };

    case "check_run":
    case "check_suite":
      return {
        type: "ci" as const,
        status: payload.check_run?.status || payload.check_suite?.conclusion,
        conclusion: payload.check_run?.conclusion || payload.check_suite?.conclusion,
        name: payload.check_run?.name,
      };

    case "security_alert":
      return {
        type: "security" as const,
        alert: payload.alert,
      };

    default:
      return { type: "unknown" as const };
  }
}

export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const expectedSignature = "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
