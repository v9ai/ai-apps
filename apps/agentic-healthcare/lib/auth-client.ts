"use client";

import { createAuthClient } from "@ai-apps/auth/client";

export const authClient = createAuthClient(
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
);
export const { signIn, signUp, signOut, useSession } = authClient;
