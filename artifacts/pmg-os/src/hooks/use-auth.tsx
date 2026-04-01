import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  avatarUrl?: string | null;
  department?: string | null;
  title?: string | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Login failed" }));
        throw new Error(err.error || "Login failed");
      }
      return res.json() as Promise<User>;
    },
    onSuccess: (user) => {
      setLoginError(null);
      qc.setQueryData(["auth", "me"], user);
    },
    onError: (err: Error) => {
      setLoginError(err.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      qc.setQueryData(["auth", "me"], null);
      qc.clear();
    },
  });

  const login = useCallback(async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  const logout = useCallback(async () => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const isAuthenticated = !!user && !error;

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, isAuthenticated, login, logout, loginError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
