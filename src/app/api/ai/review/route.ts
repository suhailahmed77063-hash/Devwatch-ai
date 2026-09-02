import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { repositories, pullRequests, codeFindings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { githubToken: requestToken, repoId, prNumber, prId } = await request.json();

    // Use provided token or fall back to env variable
    const githubToken = requestToken || process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json({ error: "GitHub token is required. Please set GITHUB_TOKEN environment variable or provide it in the request." }, { status: 400 });
    }

    let repo;
    let pr;

    // Get repo and PR info
    if (repoId && prNumber) {
      const repoResult = await db.select().from(repositories).where(eq(repositories.id, repoId)).limit(1);
      repo = repoResult[0];
      const prResult = await db.select().from(pullRequests).where(eq(pullRequests.number, prNumber)).limit(1);
      pr = prResult[0];
    } else if (prId) {
      const prResult = await db.select().from(pullRequests).where(eq(pullRequests.id, prId)).limit(1);
      pr = prResult[0];
      if (pr) {
        const repoResult = await db.select().from(repositories).where(eq(repositories.id, pr.repoId)).limit(1);
        repo = repoResult[0];
      }
    }

    if (!repo || !pr) {
      return NextResponse.json({ error: "Repository or PR not found" }, { status: 404 });
    }

    // Fetch PR diff from GitHub
    const diffRes = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls/${pr.number}`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3.diff",
        },
      }
    );

    const diff = await diffRes.text();

    // Fetch PR files for context
    const filesRes = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls/${pr.number}/files`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    const files = await filesRes.json();

    // Build review prompt
    const fileSummary = Array.isArray(files)
      ? files.map((f: { filename: string; status: string; additions: number; deletions: number }) =>
          `${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`
        ).join("\n")
      : "No files";

    const reviewPrompt = `Review this pull request for bugs, security issues, performance problems, and code quality.

PR #${pr.number}: ${pr.title}
${pr.body || "No description"}

Files changed:
${fileSummary}

Code diff:
\`\`\`diff
${diff.substring(0, 8000)}
\`\`\`

Please provide:
1. **Bug Risk** — Any logic errors, edge cases, null pointer issues
2. **Security Issues** — XSS, SQL injection, secrets, auth flaws
3. **Performance** — N+1 queries, memory leaks, inefficient algorithms
4. **Code Quality** — Naming, structure, duplication, best practices
5. **Overall Assessment** — Is this PR safe to merge? What should be checked?

Be specific with file names and line numbers where possible.`;

    // Send to AI
    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o";

    let review;

    if (apiKey) {
      try {
        const aiRes = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a senior code reviewer. Analyze the code diff and provide actionable feedback. Be concise and specific." },
              { role: "user", content: reviewPrompt },
            ],
            temperature: 0.2,
            max_tokens: 2048,
          }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          review = data.choices?.[0]?.message?.content || "No review generated.";
        } else {
          review = generateFallbackReview(pr, files, diff);
        }
      } catch {
        review = generateFallbackReview(pr, files, diff);
      }
    } else {
      review = generateFallbackReview(pr, files, diff);
    }

    // Store review as code findings
    if (Array.isArray(files)) {
      for (const file of files.slice(0, 10)) {
        try {
          await db.insert(codeFindings).values({
            prId: pr.id,
            repoId: repo.id,
            type: "code_quality",
            severity: "informational",
            file: file.filename,
            message: `AI Review for PR #${pr.number}`,
            explanation: review.substring(0, 500),
            source: "ai-review",
            confidence: 80,
          });
        } catch {
          // Skip duplicates
        }
      }
    }

    return NextResponse.json({
      review,
      pr: {
        number: pr.number,
        title: pr.title,
        repo: repo.name,
      },
      stats: {
        filesChanged: Array.isArray(files) ? files.length : 0,
        additions: pr.additions || 0,
        deletions: pr.deletions || 0,
      },
    });
  } catch (error) {
    console.error("Code review error:", error);
    return NextResponse.json({ error: "Review failed" }, { status: 500 });
  }
}

function generateFallbackReview(pr: { title: string; number: number; body?: string | null }, files: unknown, diff: string): string {
  const fileList = Array.isArray(files)
    ? files.map((f: { filename: string; status: string; additions: number; deletions: number }) =>
        `- ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`
      ).join("\n")
    : "No files available";

  // Analyze diff for patterns
  const issues: string[] = [];
  const diffLines = diff.split("\n");

  for (const line of diffLines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (/eval\s*\(/.test(line)) issues.push("⚠️ `eval()` usage detected — potential code injection");
      if (/innerHTML\s*=/.test(line)) issues.push("⚠️ `innerHTML` assignment — potential XSS vulnerability");
      if (/console\.log/.test(line)) issues.push("ℹ️ `console.log` found — remove before production");
      if (/password\s*[:=]\s*["']/.test(line)) issues.push("🔴 Hardcoded password detected — security risk");
      if (/api[_-]?key\s*[:=]\s*["']/.test(line)) issues.push("🔴 Hardcoded API key — security risk");
      if (/TODO|FIXME|HACK/.test(line)) issues.push("ℹ️ Unresolved TODO/FIXME comment");
    }
  }

  return `## Code Review: PR #${pr.number} — ${pr.title}

### Files Changed
${fileList}

### Analysis
${issues.length > 0 ? issues.join("\n") : "No obvious issues detected in the diff patterns."}

### Recommendations
1. Ensure all user inputs are validated and sanitized
2. Check for proper error handling in async operations
3. Verify authentication/authorization checks where applicable
4. Review for any hardcoded secrets or credentials
5. Run existing test suite before merging

*Note: This is a pattern-based review. For full AI-powered review, ensure AI_API_KEY is configured.*`;
}
