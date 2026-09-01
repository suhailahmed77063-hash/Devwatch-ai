// Auth configuration for DevWatch AI
// In production, integrate with NextAuth/Auth.js or similar

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "viewer" | "readonly";
  orgId?: string;
  githubToken?: string;
}

// Simple session store (replace with proper session management in production)
const sessions = new Map<string, AuthUser>();

export function createSession(userId: string, user: AuthUser): string {
  const token = crypto.randomUUID();
  sessions.set(token, user);
  return token;
}

export function getSession(token: string): AuthUser | null {
  return sessions.get(token) || null;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

// Demo authentication
export function authenticateDemo(email: string, password: string): AuthUser | null {
  if (email === "admin@devwatch.ai" && password === "admin123") {
    return {
      id: "demo-admin",
      email: "admin@devwatch.ai",
      name: "Admin User",
      role: "super_admin",
      orgId: "00000000-0000-0000-0000-000000000001",
    };
  }
  return null;
}
