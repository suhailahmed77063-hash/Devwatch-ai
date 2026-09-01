"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Role, User } from "@/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

const roleNames: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  viewer: "Viewer",
  readonly: "Read Only",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: Role) => {
    setUser({
      id: "USR001",
      name: roleNames[role],
      email: "admin@devwatch.ai",
      role,
    });
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
