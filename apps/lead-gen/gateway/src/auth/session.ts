/**
 * Direct Better-Auth session lookup over Neon HTTP. No Vercel calls.
 *
 * Reads the `better-auth.session_token` cookie, joins `session` ⨝ `user` by
 * `session.user_id`, and returns `{ userId, userEmail, isAdmin }`. Returns
 * null when there is no valid, unexpired session.
 */

import { eq } from "drizzle-orm";
import type { GatewayDb } from "../db/client";
import { session, user } from "../db/schema";

const ADMIN_EMAILS = new Set<string>(["nicolai.vadim@gmail.com"]);
const COOKIE_NAME = "better-auth.session_token";

export interface SessionUser {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
}

export async function validateSession(
  req: Request,
  db: GatewayDb,
): Promise<SessionUser | null> {
  const token = parseCookie(req.headers.get("cookie"), COOKIE_NAME);
  if (!token) return null;

  // Better Auth signs the cookie value as `<token>.<signature>`. The bare
  // token is what the DB stores. Split on the first `.` and use the prefix.
  const rawToken = token.split(".", 1)[0] ?? token;

  const rows = await db
    .select({
      userId: session.userId,
      expiresAt: session.expiresAt,
      email: user.email,
    })
    .from(session)
    .innerJoin(user, eq(user.id, session.userId))
    .where(eq(session.token, rawToken))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  return {
    userId: row.userId,
    userEmail: row.email,
    isAdmin: ADMIN_EMAILS.has(row.email),
  };
}

function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(/;\s*/);
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    if (p.slice(0, eq) === name) {
      return decodeURIComponent(p.slice(eq + 1));
    }
  }
  return null;
}
