/**
 * Security Agent — scanner aggregation entry point.
 *
 * Scanner branch of the agent architecture:
 *   Scanner ─┬─ SAST
 *            ├─ Dependency Scanner
 *            ├─ Secret Scanner
 *            └─ Configuration Scanner
 *
 * Each module is independently callable and tested.
 */

import type { RawFinding } from "../types";
import { runSast } from "./sast";
import { runSecretScanner } from "./secrets";
import { runDependencyScanner } from "./dependencies";
import { runConfigScanner } from "./configuration";

export { runSast, SAST_RULES } from "./sast";
export { runSecretScanner } from "./secrets";
export { runDependencyScanner, parseDependencies } from "./dependencies";
export { runConfigScanner } from "./configuration";
export type { RawFinding } from "../types";

/** Run every scanner and merge the results. Dependencies scan is async (OSV). */
export async function runAllScanners(files: Record<string, string>): Promise<RawFinding[]> {
  const [sast, secrets, deps, config] = await Promise.all([
    Promise.resolve(runSast(files)),
    Promise.resolve(runSecretScanner(files)),
    runDependencyScanner(files),
    Promise.resolve(runConfigScanner(files)),
  ]);
  return [...sast, ...secrets, ...deps, ...config];
}
