/**
 * AI Security Agent — Remediation Agent.
 *
 * Generates a fix plan (problem → root cause → strategy → patch → verification
 * plan) for a finding. With an AI provider it produces a unified diff per
 * affected file; without one it emits deterministic patches for classes the
 * platform can fix mechanically (committed secrets, known-vulnerable deps).
 * Patches are proposals only — never merged automatically.
 */

import type { RawFinding, Remediation } from "./types";
import { chatJson, aiConfigured } from "./llm";
import { redactSecrets } from "./utils";

const SYSTEM = `You are the remediation stage of an application-security agent.
Given one investigated finding and the affected source, produce a minimal, correct fix.

Rules:
- Keep changes minimal and targeted; never refactor beyond the fix.
- Preserve the file's language, imports and style.
- oldContent/newContent must be FULL file contents (unified diff is computed server-side).
- Never include real secret values in your output — use environment-variable references.
- Respond with JSON only, exactly this shape:
{
  "problem": string,
  "rootCause": string,
  "fixStrategy": string,
  "files": [{ "path": string, "oldContent": string, "newContent": string }],
  "verificationPlan": string,
  "explanation": string
}`;

function fallbackRemediation(finding: RawFinding, files: Record<string, string>): Remediation {
  const filesEdits: Remediation["files"] = [];

  if (finding.ruleId.startsWith("secret.") && finding.evidence?.[0]) {
    const ev = finding.evidence[0];
    const filePath = ev.file || finding.filePath || "";
    const old = files[filePath] ?? "";
    if (old) {
      const lines = old.replace(/\r\n/g, "\n").split("\n");
      const idx = (ev.line ?? finding.lineStart ?? 1) - 1;
      if (lines[idx]) {
        const keyPart = lines[idx].split(/[=:]/)[0] ?? "SECRET";
        lines[idx] = `${keyPart}= process.env.${keyPart.trim().replace(/[^A-Za-z0-9_]/g, "_").toUpperCase() || "SECRET_VALUE"}`;
        filesEdits.push({ path: filePath, oldContent: old, newContent: lines.join("\n") });
      }
    }
  }

  if (finding.category === "dependency" && finding.components?.[0]?.fixedVersion) {
    const dep = finding.components[0];
    const manifest = files["package.json"] ?? "";
    if (manifest) {
      try {
        const pkg = JSON.parse(manifest) as Record<string, Record<string, string>>;
        for (const section of ["dependencies", "devDependencies"] as const) {
          if (pkg[section]?.[dep.name]) pkg[section][dep.name] = `^${dep.fixedVersion}`;
        }
        filesEdits.push({
          path: "package.json",
          oldContent: manifest,
          newContent: `${JSON.stringify(pkg, null, 2)}\n`,
        });
      } catch {
        // leave empty
      }
    }
  }

  return {
    problem: finding.title,
    rootCause: finding.rootCause ?? "Vulnerable pattern present in the codebase.",
    fixStrategy:
      finding.ruleId.startsWith("secret.")
        ? "Revoke the credential, move the value to an environment variable / secrets manager, and purge it from history."
        : finding.category === "dependency"
          ? `Upgrade ${finding.components?.[0]?.name ?? "the dependency"} to the patched version and re-run the security scan.`
          : "Apply the minimal code change that closes the vulnerable path, then re-scan.",
    files: filesEdits,
    verificationPlan:
      finding.ruleId.startsWith("secret.")
        ? "1) Rotate the credential at the provider. 2) Confirm the new code reads it from the environment. 3) Re-run the Security Agent scan — the secret finding must no longer appear."
        : finding.category === "dependency"
          ? "1) Run the package manager install. 2) Re-run the Security Agent scan. 3) Run the project's test suite."
          : "1) Apply the patch. 2) Run the project's tests. 3) Re-run sandbox validation — it must no longer reproduce.",
    explanation:
      "Deterministic remediation (AI provider unavailable): this class has a mechanical fix template. " +
      "Review the diff, apply it in your workflow, then use Run Verification.",
  };
}

export async function generateRemediation(opts: {
  finding: RawFinding;
  files: Record<string, string>;
  investigation?: { verdict: string; analysis: string };
}): Promise<Remediation> {
  if (!aiConfigured()) return fallbackRemediation(opts.finding, opts.files);

  const filePath = opts.finding.filePath ?? "";
  const fileContent = opts.files?.[filePath] ?? "";
  const dep = opts.finding.components?.[0];

  const user = [
    `Finding: ${opts.finding.ruleId} — ${opts.finding.title}`,
    opts.finding.cwe ? `CWE: ${opts.finding.cwe}` : "",
    opts.finding.cve ? `CVE: ${opts.finding.cve}` : "",
    `Location: ${filePath}:${opts.finding.lineStart ?? "?"}`,
    opts.finding.snippet ? `Matched line: ${opts.finding.snippet}` : "",
    opts.investigation ? `Investigation: verdict=${opts.investigation.verdict}\n${opts.investigation.analysis.slice(0, 1200)}` : "",
    dep ? `Dependency: ${dep.name}@${dep.version ?? "?"} — fixed in ${dep.fixedVersion ?? "unknown"}` : "",
    "",
    fileContent ? `--- FILE ${filePath} ---\n${redactSecrets(fileContent.slice(0, 5000))}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await chatJson<Partial<Remediation>>({ system: SYSTEM, user, maxTokens: 2400 });

    const files: Remediation["files"] = Array.isArray(raw.files)
      ? raw.files
          .filter((f) => f && typeof f.path === "string" && typeof f.newContent === "string")
          .slice(0, 5)
          .map((f) => ({
            path: String(f.path),
            oldContent: typeof f.oldContent === "string" ? f.oldContent : opts.files?.[String(f.path)] ?? "",
            newContent: String(f.newContent),
          }))
      : [];

    const withDiffs = files.filter((f) => f.newContent !== f.oldContent);
    if (!withDiffs.length) throw new Error("empty patch");

    return {
      problem: redactSecrets(String(raw.problem ?? opts.finding.title).slice(0, 600)),
      rootCause: redactSecrets(String(raw.rootCause ?? "").slice(0, 800)),
      fixStrategy: redactSecrets(String(raw.fixStrategy ?? "").slice(0, 800)),
      files: withDiffs,
      verificationPlan: redactSecrets(String(raw.verificationPlan ?? "").slice(0, 1200)),
      explanation: redactSecrets(String(raw.explanation ?? "").slice(0, 2000)),
    };
  } catch {
    return fallbackRemediation(opts.finding, opts.files);
  }
}
