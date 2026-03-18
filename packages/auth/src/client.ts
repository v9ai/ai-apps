"use client";

import { createAuthClient as _create } from "better-auth/react";

type AuthClient = ReturnType<typeof _create>;

export function createAuthClient(baseURL?: string): AuthClient {
  return _create({
    baseURL: baseURL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  });
}
