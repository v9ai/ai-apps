import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { toNextJsHandler } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuth(db: any, schema?: Record<string, unknown>, options?: { trustedOrigins?: string[]; baseURL?: string }) {
  const origins: string[] = [...(options?.trustedOrigins ?? [])];

  // Auto-trust well-known env vars
  for (const key of ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_BETTER_AUTH_URL"]) {
    const val = process.env[key];
    if (val && !origins.includes(val)) origins.push(val);
  }

  // Auto-trust Vercel preview/production URLs
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    const full = `https://${vercelUrl}`;
    if (!origins.includes(full)) origins.push(full);
  }
  const vercelProjectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProjectUrl) {
    const full = `https://${vercelProjectUrl}`;
    if (!origins.includes(full)) origins.push(full);
  }

  const baseURL = options?.baseURL
    || process.env.BETTER_AUTH_URL
    || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

  return betterAuth({
    baseURL,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true },
    plugins: [nextCookies()],
    trustedOrigins: origins.length > 0 ? origins : undefined,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createNextHandler(auth: any) {
  return toNextJsHandler(auth);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWithAuth(auth: any, loginPath = "/auth/login") {
  return async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect(loginPath);
    return { userId: session.user.id, user: session.user };
  };
}

export { toNextJsHandler };
export { getSessionCookie } from "better-auth/cookies";
