import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: "free" | "basic" | "pro";
  isAdmin: boolean;
  createdAt: string;
  tiktokUsername: string | null;
  tiktokUsernameChangesThisWeek: number;
  tiktokVerified: boolean;
  tiktokProfilePicture: string | null;
  tiktokDisplayName: string | null;
  tiktokFollowerCount: number | null;
  tiktokLinkedAt: string | null;
  hasTiktokOAuth: boolean;
  roleId: string | null;
  hasStripe: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    tiktok?: {
      username: string;
      profilePicture?: string;
      displayName?: string;
      followerCount?: number;
    }
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "creatools_token";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function authFetch(path: string, token: string | null, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
  return json;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  const fetchMe = useCallback(async (token: string) => {
    try {
      const data = await authFetch("/auth/me", token) as { user: AuthUser };
      setState({ user: data.user, token, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    // Handle TikTok OAuth redirect — token arrives as ?tiktok_token=...
    const params = new URLSearchParams(window.location.search);
    const tiktokToken = params.get("tiktok_token");
    if (tiktokToken) {
      localStorage.setItem(TOKEN_KEY, tiktokToken);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      void fetchMe(tiktokToken);
      return;
    }
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) void fetchMe(saved);
    else setState((s) => ({ ...s, loading: false }));
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch("/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, token: data.token, loading: false });
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    name: string,
    tiktok?: { username: string; profilePicture?: string; displayName?: string; followerCount?: number }
  ) => {
    const data = await authFetch("/auth/register", null, {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        name,
        ...(tiktok ? {
          tiktokUsername: tiktok.username,
          tiktokProfilePicture: tiktok.profilePicture,
          tiktokDisplayName: tiktok.displayName,
          tiktokFollowerCount: tiktok.followerCount,
        } : {}),
      }),
    }) as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, token: data.token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await fetchMe(token);
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
