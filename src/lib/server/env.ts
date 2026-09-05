/** Strip surrounding quotes from env values (common in .env files) */
function stripQuotes(v: string): string {
  const trimmed = v.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Required env var — throws a clear config error when missing. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  return stripQuotes(v);
}

/** Optional env var. */
export function optEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? stripQuotes(v) : undefined;
}

export function isConfigured(name: string): boolean {
  return Boolean(optEnv(name));
}
