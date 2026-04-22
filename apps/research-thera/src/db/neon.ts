import { neon } from "@neondatabase/serverless";

/**
 * Neon serverless HTTP client. Tagged-template SQL with `.transaction(...)`
 * support. No RLS session-variable plumbing — user isolation is enforced at
 * the app layer via `WHERE user_id = ${ctx.userEmail}` filters in resolvers.
 */
export const sql = neon(process.env.NEON_DATABASE_URL!);
