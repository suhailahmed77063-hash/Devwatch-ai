/**
 * Utilities to recover structured JSON from LLM text output: strip code
 * fences, locate the outermost JSON object/array, and attempt simple repairs
 * for truncated output.
 */

export function extractJson(text: string): string {
  let t = text.trim();
  // strip markdown fences
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  t = t.trim();
  const start = Math.min(
    t.indexOf("{"),
    t.indexOf("[") === -1 ? t.length : t.indexOf("[")
  );
  if (start === -1 || start === t.length) return t;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return t.slice(start, i + 1);
    }
  }
  return t.slice(start);
}

/** Repair common truncation issues: unclosed strings, brackets, trailing commas. */
export function repairJsonText(text: string): string {
  let t = extractJson(text);
  if (t.length === 0) return t;
  // Remove trailing commas before } or ]
  t = t.replace(/,\s*([}\]])/g, "$1");
  // Unescape stray newlines inside strings are handled by JSON.parse; skip.
  // Close unclosed string values at the end: `"key": "value` → `"key": "value"`
  t = t.replace(/:\s*"([^"]*)$/m, ': "$1"');
  // Balance brackets
  let open = 0;
  let inStr2 = false;
  let esc2 = false;
  for (const ch of t) {
    if (inStr2) {
      if (esc2) esc2 = false;
      else if (ch === "\\") esc2 = true;
      else if (ch === '"') inStr2 = false;
      continue;
    }
    if (ch === '"') inStr2 = true;
    else if (ch === "{" || ch === "[") open++;
    else if (ch === "}" || ch === "]") open--;
  }
  if (open > 0) {
    const closer = t.trimStart().startsWith("[") ? "]" : "}";
    t += closer.repeat(open);
  }
  return t;
}

export function parseJsonLoose<T>(text: string): { ok: true; data: T } | { ok: false; error: string } {
  const attempts = [text, extractJson(text), repairJsonText(text)];
  for (const attempt of attempts) {
    try {
      return { ok: true, data: JSON.parse(attempt) as T };
    } catch {
      // next attempt
    }
  }
  return { ok: false, error: "Could not parse JSON from model output" };
}
