import type { z } from "zod";
import { AiProviderError } from "@/lib/errors";
import { logger } from "../logger";
import type { LLMProvider, LLMRequest } from "@/providers/ai/types";
import { parseJsonLoose } from "./json";

export interface StructuredOptions<S extends z.ZodTypeAny> {
  schema: S;
  /** human label of the object being generated (for logs/repair) */
  label: string;
  request: Omit<LLMRequest, "json">;
}

/**
 * Ask the model for one JSON object, validate it with the provided Zod
 * schema, and if the first attempt fails ask the model to repair the output
 * once using the exact validation error. Token usage is returned for metering.
 */
export async function structured<S extends z.ZodTypeAny>(
  getProvider: () => LLMProvider,
  opts: StructuredOptions<S>
): Promise<{ data: z.infer<S>; tokensIn: number; tokensOut: number; model: string; repaired: boolean }> {
  const provider = getProvider();

  const attempt = async (messages: { role: "system" | "user"; content: string }[]) => {
    return provider.complete({ ...opts.request, messages, json: true });
  };

  let res = await attempt(buildMessages(opts.request, ""));
  let parsed = parseJsonLoose<z.infer<S>>(res.text);
  let repaired = false;

  if (!parsed.ok) {
    logger.warn("ai.structured.parse_failed", { label: opts.label });
    // one automatic repair pass: ask the model to fix malformed JSON
    const fix = await attempt(buildMessages(opts.request, ""));
    const fixed = parseJsonLoose<z.infer<S>>(fix.text);
    if (fixed.ok) {
      parsed = fixed;
      res = fix;
      repaired = true;
    }
  }

  if (!parsed.ok) {
    throw new AiProviderError(`Model returned invalid JSON for ${opts.label}`);
  }

  const check = opts.schema.safeParse(parsed.data);
  if (!check.success) {
    const detail = check.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join(".")} ${i.message}`)
      .join("; ");
    // repair attempt with the actual validation error as feedback
    const fix = await attempt(
      buildMessages(
        opts.request,
        `\n\nThe JSON you returned failed validation. Fix ONLY the JSON, keep everything else.\nValidation errors: ${detail}\nReturn the complete corrected JSON object.`
      )
    );
    const fixed = parseJsonLoose<z.infer<S>>(fix.text);
    const check2 = fixed.ok ? opts.schema.safeParse(fixed.data) : { success: false as const };
    if (fixed.ok && check2.success) {
      return {
        data: check2.data,
        tokensIn: res.usage.tokensIn + fix.usage.tokensIn,
        tokensOut: res.usage.tokensOut + fix.usage.tokensOut,
        model: fix.usage.model || res.usage.model,
        repaired: true,
      };
    }
    throw new AiProviderError(
      `AI output failed validation for ${opts.label}${detail ? ` (${detail})` : ""}`,
      "The AI returned something that didn't validate. Please rephrase or try again."
    );
  }
  return { data: check.data, tokensIn: res.usage.tokensIn, tokensOut: res.usage.tokensOut, model: res.usage.model, repaired };
}

function buildMessages(req: { system?: string; user?: string }, extra: string): { role: "system" | "user"; content: string }[] {
  return [
    { role: "system", content: req.system ?? "You are a helpful assistant that returns valid JSON." },
    { role: "user", content: `${req.user ?? ""}\n${extra}`.trim() },
  ];
}
