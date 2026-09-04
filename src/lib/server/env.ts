/** Required env var — throws a clear config error when missing. */
export function env(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  }
  return v;
}

/** Optional env var. */
export function optEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v : undefined;
}

export function isConfigured(name: string): boolean {
  return Boolean(optEnv(name));
}
