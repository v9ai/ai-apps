import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Default Neon HTTP client. Each tagged-template call is a one-shot stateless
 * HTTP request — you CANNOT carry `SET LOCAL` state across awaits when using
 * this directly. For RLS-gated paths, use `withUser(...)` below which wraps
 * the work in a single transaction and sets the session variables first.
 */
export const sql = neon(process.env.NEON_DATABASE_URL!);

/**
 * Per-user session-variable runner, intended for use once PostgreSQL RLS is
 * enabled (migration 0005). The helper executes all supplied statements
 * inside a single transaction with:
 *
 *   SET LOCAL app.current_user_id    = <userId>
 *   SET LOCAL app.current_user_email = <userEmail ?? ''>
 *
 * applied first. Because the Neon HTTP driver's `.transaction([...])` API
 * requires the SQL statements to be constructed up front, the caller must
 * pass an array of tagged-template expressions.
 *
 * Example:
 *   const [rows] = await withUser(userId, userEmail, (tx) => [
 *     tx`SELECT * FROM notes WHERE id = ${id}`,
 *   ]);
 *
 * Usage caveat:
 *   - This is NOT a drop-in replacement for the current `sql\`…\`` pattern.
 *     Resolvers that do multiple awaits / Promise.all must be restructured
 *     to collect their statements into a single array, OR the application
 *     must switch to the WebSocket `Pool` driver which lets you keep a
 *     session alive. See docs/rls-migration-plan.md §"Driver approach".
 *   - Until RLS (0005) is enabled, this helper is equivalent to running the
 *     same statements without the SET LOCAL prelude.
 */
export async function withUser<T>(
  userId: string,
  userEmail: string | undefined,
  build: (tx: NeonQueryFunction<false, false>) => Parameters<typeof sql.transaction>[0],
): Promise<T> {
  if (!userId) throw new Error("withUser: userId is required");

  // The neon() client's transaction() accepts an array of queries built with
  // the same client — we pass `sql` through so the caller can use the tagged
  // template literal pattern they already know.
  const statements = build(sql as unknown as NeonQueryFunction<false, false>);
  const prelude = [
    sql`SELECT set_config('app.current_user_id',    ${userId},              true)`,
    sql`SELECT set_config('app.current_user_email', ${userEmail ?? ""}, true)`,
  ];

  // set_config(..., is_local => true) mirrors SET LOCAL and is scoped to the
  // surrounding transaction — neonSql.transaction wraps the array in BEGIN/COMMIT.
  const results = (await sql.transaction([...prelude, ...statements])) as unknown[];
  // Drop the two prelude result rows and return the remainder typed as T.
  return results.slice(prelude.length) as unknown as T;
}
