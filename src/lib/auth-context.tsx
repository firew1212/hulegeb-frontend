"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { isApiError, refreshAccessToken } from "@/lib/api";
import { getMe } from "@/lib/auth-api";
import { clearAuthTokens, hasAccessToken } from "@/lib/auth-tokens";
import type { AuthUser } from "@/types/auth";

export type AuthStatus =
  | "initializing"
  | "authenticated"
  | "unauthenticated"
  | "expired"
  | "error";

type SessionError = "network" | "server";

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  error: SessionError | null;
};

type AuthContextValue = AuthState & {
  refreshSession: () => Promise<void>;
  setAuthenticatedUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getSessionError(error: unknown): SessionError {
  return isApiError(error) && (error.status === 0 || error.status === 408)
    ? "network"
    : "server";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "initializing",
    user: null,
    error: null,
  });
  const initRef = useRef(false);

  const refreshSession = useCallback(async () => {
    if (!hasAccessToken()) {
      try {
        await refreshAccessToken();
      } catch (err) {
        if (isApiError(err) && err.status === 401) {
          setState({ status: "unauthenticated", user: null, error: null });
        } else {
          const error = getSessionError(err);
          setState((prev) =>
            prev.status === "authenticated" && prev.user
              ? { ...prev, error }
              : { status: "error", user: null, error },
          );
        }
        return;
      }
    }
    setState((prev) =>
      prev.status === "authenticated" && prev.user
        ? prev
        : { ...prev, status: "initializing", error: null },
    );
    try {
      const user = await getMe();
      setState({ status: "authenticated", user, error: null });
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        clearAuthTokens();
        setState({ status: "expired", user: null, error: null });
      } else {
        const error = getSessionError(err);
        setState((prev) =>
          prev.status === "authenticated" && prev.user
            ? { ...prev, error }
            : { status: "error", user: null, error },
        );
      }
    }
  }, []);

  const setAuthenticatedUser = useCallback((user: AuthUser) => {
    setState({ status: "authenticated", user, error: null });
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    const { logoutUser } = await import("@/lib/auth-api");
    try {
      await logoutUser();
    } catch (error) {
      clearAuthTokens();
      setState({ status: "unauthenticated", user: null, error: null });
      throw error;
    }
    clearAuthTokens();
    setState({ status: "unauthenticated", user: null, error: null });
  }, []);

  const value: AuthContextValue = {
    ...state,
    refreshSession,
    setAuthenticatedUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
