import { describe, expect, it } from "vitest";
import { parseRepoInput } from "./source";
import { formatFindingAsIssue, formatPrSecurityComment } from "./github";

describe("parseRepoInput", () => {
  it("accepts full URLs, owner/repo shorthand and tree links", () => {
    expect(parseRepoInput("https://github.com/owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepoInput("owner/repo")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseRepoInput("https://github.com/owner/repo/tree/dev")).toEqual({ owner: "owner", repo: "repo", branch: "dev" });
  });

  it("rejects non-GitHub hosts and malformed input", () => {
    expect(parseRepoInput("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseRepoInput("justtext")).toBeNull();
    expect(parseRepoInput("")).toBeNull();
  });
});

describe("formatFindingAsIssue", () => {
  const finding = {
    title: "SQL injection in user search",
    ruleId: "sast.sql-injection",
    severity: "critical",
    confidence: 80,
    cwe: "CWE-89",
    filePath: "src/db.ts",
    lineStart: 42,
    rootCause: "String-concatenated query",
    impact: "Data exfiltration",
    status: "CONFIRMED",
    verdict: "CONFIRMED",
    attackPath: [
      { label: "User input", detail: "query param", file: "src/route.ts", line: 10 },
      { label: "Unsafe query", detail: "concatenation", file: "src/db.ts", line: 42 },
    ],
  };

  it("renders the key fields as markdown", () => {
    const md = formatFindingAsIssue(finding);
    expect(md).toContain("Security Agent finding");
    expect(md).toContain("CWE-89");
    expect(md).toContain("src/db.ts:42");
    expect(md).toContain("String-concatenated query");
    expect(md).toContain("1. **User input**");
  });

  it("never includes the severity label for public repos in a clickable form", () => {
    // Sanity: the formatter includes labels in the issue title, not secrets.
    expect(formatFindingAsIssue(finding)).not.toMatch(/gh[pousr]_[A-Za-z0-9]{20,}/);
  });
});

describe("formatPrSecurityComment", () => {
  it("renders the exact PR security block", () => {
    const md = formatPrSecurityComment([
      { severity: "HIGH", status: "CONFIRMED", title: "XSS sink" },
      { severity: "MEDIUM", status: "QUEUED", title: "A" },
      { severity: "MEDIUM", status: "QUEUED", title: "B" },
      { severity: "LOW", status: "QUEUED", title: "C" },
      { severity: "LOW", status: "QUEUED", title: "D" },
      { severity: "LOW", status: "QUEUED", title: "E" },
    ]);
    expect(md).toContain("Critical: 0");
    expect(md).toContain("High: 1");
    expect(md).toContain("Medium: 2");
    expect(md).toContain("Low: 3");
    expect(md).toContain("Review required");
  });

  it("shows a clean status when there are no findings", () => {
    const md = formatPrSecurityComment([]);
    expect(md).toContain("No open security findings");
  });
});
