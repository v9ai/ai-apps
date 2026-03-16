"use client";

import { authClient } from "@/lib/auth/client";
import { ADMIN_EMAIL } from "@/lib/constants";

export interface User {
  id: string;
  email?: string;
  name?: string | null;
  emailVerified?: boolean;
}

export interface Session {
  user: User;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get current authentication state
 */
export function useAuth(): AuthContext {
  const { data: session, isPending } = authClient.useSession();

  // Dev bypass: if ADMIN_EMAIL is set in dev, use it immediately
  const devEmail =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_ADMIN_EMAIL
      : undefined;

  if (isPending) {
    if (devEmail) {
      const devUser = { id: "dev-local", email: devEmail, name: "Dev", emailVerified: true };
      return {
        user: devUser,
        session: { user: devUser },
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    }
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      loading: true,
      error: null,
    };
  }

  const user = session?.user;
  const mappedUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      }
    : devEmail
      ? { id: "dev-local", email: devEmail, name: "Dev", emailVerified: true }
      : null;

  return {
    user: mappedUser,
    session: mappedUser ? { user: mappedUser } : null,
    isAuthenticated: !!session || !!devEmail,
    loading: false,
    error: null,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { data: session, isPending } = authClient.useSession();
  return {
    isAuthenticated: !!session,
    loading: isPending,
  };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  const { data: session, isPending } = authClient.useSession();
  return {
    isAdmin: !!session && session.user.email === ADMIN_EMAIL,
    loading: isPending,
  };
}
