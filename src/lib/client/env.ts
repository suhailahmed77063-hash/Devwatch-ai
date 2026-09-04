"use client";

export function optEnvNextPublic(name: string): string | undefined {
  return process.env[name];
}
