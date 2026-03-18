import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { toNextJsHandler } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuth(db: any) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    plugins: [nextCookies()],
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
