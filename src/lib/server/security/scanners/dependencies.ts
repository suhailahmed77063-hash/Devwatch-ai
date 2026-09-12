/**
 * Security Agent — dependency scanner.
 *
 * Parses manifests (package.json / requirements.txt / go.mod), resolves the
 * installed versions, and queries the OSV.dev API for known vulnerabilities.
 * A small offline advisory set keeps the scanner useful when the network is
 * unavailable (tests, air-gapped installs). CVE/GHSA identifiers and fixed
 * versions feed the UI and remediation plan.
 */

import type { RawFinding, DependencyRef } from "../types";
import { inRange } from "../utils";
import { logger } from "../../logger";

interface Pkg {
  name: string;
  version: string;
  ecosystem: string;
  manifestPath: string;
}

interface Advisory {
  id: string; // GHSA or CVE id
  aliases?: string[]; // CVEs
  summary?: string;
  severity: RawFinding["severity"];
  fixed?: string;
  range: string; // OSV-style range expression
  cwe?: string;
}

/** Offline fallback advisories for a handful of high-profile npm packages. */
const KNOWN_ADVISORIES: Record<string, Advisory[]> = {
  lodash: [
    {
      id: "GHSA-p6mc-mrg8-x3x2",
      aliases: ["CVE-2020-8203"],
      summary: "Prototype pollution in zipObjectDeep",
      severity: "high",
      fixed: "4.17.19",
      range: ">=4.0.0 <4.17.19",
      cwe: "CWE-1321",
    },
  ],
  "node-fetch": [
    {
      id: "GHSA-r683-j2x4-v87g",
      aliases: ["CVE-2022-0235"],
      summary: "Exposure of sensitive information to an unauthorized actor",
      severity: "medium",
      fixed: "2.6.7",
      range: ">=2.0.0 <2.6.7",
      cwe: "CWE-200",
    },
  ],
  "minimist": [
    {
      id: "GHSA-v2x2-ae82-vwgx",
      aliases: ["CVE-2021-44906"],
      summary: "Prototype pollution via constructor args",
      severity: "critical",
      fixed: "1.2.6",
      range: "<1.2.6",
      cwe: "CWE-1321",
    },
  ],
  "axios": [
    {
      id: "GHSA-42xw-5xwc-wj2c",
      aliases: ["CVE-2023-45857"],
      summary: "XSRF token disclosure to third-party host",
      severity: "high",
      fixed: "1.6.0",
      range: ">=0.8.1 <1.6.0",
      cwe: "CWE-200",
    },
  ],
  "tar": [
    {
      id: "GHSA-5955-3w4h-w6gv",
      aliases: ["CVE-2021-37701"],
      summary: "Symlink arbitrary file write on extract",
      severity: "high",
      fixed: "6.1.9",
      range: ">=6.0.0 <6.1.9",
      cwe: "CWE-59",
    },
  ],
};

const OSV_QUERY_URL = "https://api.osv.dev/v1/query";
const OSV_TIMEOUT_MS = 8_000;

/** Extract installed packages from manifests. */
export function parseDependencies(files: Record<string, string>): Pkg[] {
  const pkgs: Pkg[] = [];

  const pkgJson = files["package.json"];
  if (pkgJson) {
    try {
      const parsed = JSON.parse(pkgJson) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const add = (deps: Record<string, string> | undefined, section: string) => {
        for (const [name, range] of Object.entries(deps ?? {})) {
          // Resolve the installed version when a lockfile sibling exists.
          const installed = resolveInstalled(files, name) ?? stripRange(range);
          pkgs.push({ name, version: installed, ecosystem: "npm", manifestPath: `package.json#${section}` });
        }
      };
      add(parsed.dependencies, "dependencies");
      add(parsed.devDependencies, "devDependencies");
    } catch {
      // malformed manifest — skip silently, other scanners still run
    }
  }

  const reqs = files["requirements.txt"];
  if (reqs) {
    for (const line of reqs.split("\n")) {
      const m = line.match(/^([A-Za-z0-9_.-]+)(?:[=<>!~]+)([A-Za-z0-9_.-]+)/);
      if (m) pkgs.push({ name: m[1], version: m[2], ecosystem: "pypi", manifestPath: "requirements.txt" });
    }
  }

  const goMod = files["go.mod"];
  if (goMod) {
    for (const line of goMod.split("\n")) {
      const m = line.match(/^\s*([\w./-]+)\s+v([A-Za-z0-9_.-]+)/);
      if (m) pkgs.push({ name: m[1], version: m[2], ecosystem: "go", manifestPath: "go.mod" });
    }
  }

  return pkgs;
}

function stripRange(range: string): string {
  // Best-effort literal resolution: "1.2.3" stays, "^1.2.3" -> "1.2.3".
  return range.replace(/^[~^>=<*\s]+/, "") || "0.0.0";
}

function resolveInstalled(files: Record<string, string>, name: string): string | null {
  // A simplified package-lock would be a huge JSON blob; instead scan for the
  // common "node_modules/<name>" version markers cheaply.
  const lock = files["package-lock.json"];
  if (!lock) return null;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`node_modules/${esc}"[^}]*?"version":\\s*"([^"]+)"`, "s");
  const m = lock.match(re);
  return m ? m[1] : null;
}

/** Query OSV.dev for the package. Returns null on network failure. */
async function osvQuery(pkg: Pkg): Promise<Advisory[] | null> {
  try {
    const res = await fetch(OSV_QUERY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: pkg.version,
        package: { name: pkg.name, ecosystem: pkg.ecosystem === "npm" ? "npm" : pkg.ecosystem },
      }),
      signal: AbortSignal.timeout(OSV_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      vulns?: {
        id: string;
        aliases?: string[];
        summary?: string;
        database_specific?: { severity?: string };
        severity?: { type: string; score: string }[];
        affected?: { ranges?: { type: string; events: { introduced?: string; fixed?: string }[] }[] }[];
      }[];
    };
    const out: Advisory[] = [];
    for (const v of data.vulns ?? []) {
      // Derive a simple range expression from OSV events.
      let range = "";
      let fixed: string | undefined;
      for (const a of v.affected ?? []) {
        for (const r of a.ranges ?? []) {
          const introduced = r.events.find((e) => e.introduced)?.introduced ?? "0";
          fixed = r.events.find((e) => e.fixed)?.fixed ?? fixed;
          range = range ? `${range} ` : "";
          range += fixed ? `>=${introduced} <${fixed}` : `>=${introduced}`;
        }
      }
      const cvss = v.severity?.find((s) => s.type === "CVSS_V3")?.score;
      out.push({
        id: v.id,
        aliases: v.aliases,
        summary: v.summary,
        severity: severityFromScore(cvss) ?? "medium",
        fixed,
        range: range || ">=0",
        cwe: cweFromOsv(v) ?? undefined,
      });
    }
    return out;
  } catch (e) {
    logger.warn("security.osv.query_failed", { pkg: pkg.name, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

function severityFromScore(cvss?: string): RawFinding["severity"] | null {
  if (!cvss) return null;
  const base = parseFloat(cvss);
  if (Number.isNaN(base)) return null;
  if (base >= 9) return "critical";
  if (base >= 7) return "high";
  if (base >= 4) return "medium";
  return "low";
}

function cweFromOsv(v: { aliases?: string[]; id: string }): string | undefined {
  // OSV often exposes CWEs in aliases of GitHub advisories (GHSA-...-CWE-...)
  const cwe = (v.aliases ?? []).find((a) => a.startsWith("CWE-"));
  return cwe ?? undefined;
}

/**
 * Scan dependencies for known vulnerabilities. Uses OSV when reachable and
 * falls back to the offline advisory set otherwise.
 */
export async function runDependencyScanner(files: Record<string, string>): Promise<RawFinding[]> {
  const pkgs = parseDependencies(files);
  if (!pkgs.length) return [];

  const useOsv = process.env.SECURITY_DISABLE_OSV !== "1";
  const findings: RawFinding[] = [];

  // Batch: query OSV once for the npm ecosystem when possible.
  const byName = new Map<string, Pkg[]>();
  for (const p of pkgs) {
    const list = byName.get(p.name) ?? [];
    list.push(p);
    byName.set(p.name, list);
  }

  for (const [name, instances] of byName) {
    const pkg = instances[0];
    let advisories: Advisory[] | null = useOsv ? await osvQuery(pkg) : null;
    if (advisories === null) {
      advisories = KNOWN_ADVISORIES[name] ?? [];
    }

    for (const adv of advisories) {
      const vulnerable = instances.some((i) => inRange(i.version, adv.range));
      if (!vulnerable) continue;
      const inst = instances.find((i) => inRange(i.version, adv.range))!;
      const ref: DependencyRef = {
        name,
        version: inst.version,
        ecosystem: inst.ecosystem,
        cve: adv.aliases?.find((a) => a.startsWith("CVE-")),
        ghsa: adv.id.startsWith("GHSA-") ? adv.id : undefined,
        summary: adv.summary,
        fixedVersion: adv.fixed,
      };
      findings.push({
        ruleId: `dep.vulnerable-${name}`,
        title: `Vulnerable dependency: ${name}@${inst.version}`,
        category: "dependency",
        severity: adv.severity,
        confidence: 95,
        cwe: adv.cwe,
        cve: ref.cve,
        filePath: inst.manifestPath.split("#")[0],
        rootCause: `${name} ${inst.version} is inside the affected range ${adv.range}`,
        evidence: [
          {
            file: inst.manifestPath.split("#")[0],
            excerpt: `${name}: "${inst.version}" — affected ${adv.range}${adv.fixed ? `, fixed in ${adv.fixed}` : ""}`,
          },
        ],
        impact: adv.summary ?? `Known vulnerability ${adv.id} affects this dependency version.`,
        // recommendation intentionally left to the remediation agent
        components: [ref],
        attackPath: [
          { label: "Dependency resolved", detail: `${name}@${inst.version} installed via ${inst.manifestPath}` },
          { label: "Vulnerable code path", detail: adv.summary ?? `Affected range ${adv.range}` },
          { label: "Exploit vector", detail: "Depends on how the app invokes the vulnerable API" },
          { label: "Impact", detail: `Known issue ${adv.id}${ref.cve ? ` (${ref.cve})` : ""}` },
        ],
      });
    }
  }

  return findings;
}
