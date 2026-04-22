import {
  neon,
  type NeonQueryFunction,
  type NeonQueryFunctionInTransaction,
  type NeonQueryInTransaction,
  type NeonQueryPromise,
  type HTTPQueryOptions,
} from "@neondatabase/serverless";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * =============================================================================
 * RLS session-variable driver (Approach A — per-query transaction wrapper)
 * =============================================================================
 *
 * Problem
 * -------
 * The Neon HTTP driver (tagged-template `neon()` client) is stateless: each
 * call is an independent HTTPS request that opens its own Postgres session,
 * runs the SQL, and tears the session down. That means you cannot pre-issue
 * `SET app.current_user_id = …` once-per-request and have subsequent queries
 * see it — every query lands on a brand-new session.
 *
 * PostgreSQL RLS policies that read `current_setting('app.current_user_id')`
 * therefore see an empty string no matter what we do out-of-band.
 *
 * Approach A (taken): wrap every query in a 1-shot transaction
 * ------------------------------------------------------------
 * We intercept each tagged-template (and ordinary-function) call on the
 * exported `sql` and, if an AsyncLocalStorage user context is active, rewrite
 * the single query into a `sql.transaction([...])` of:
 *
 *   [ SELECT set_config('app.current_user_id',    $uuid,  true),
 *     SELECT set_config('app.current_user_email', $email, true),
 *     <the original user query> ]
 *
 * `set_config(name, value, is_local => true)` is the functional equivalent of
 * `SET LOCAL` and is scoped to the surrounding transaction, so subsequent
 * RLS policy evaluation inside the same transaction sees the right value.
 *
 * If the AsyncLocalStorage store is empty (background jobs, scripts, CLIs),
 * the wrapper passes the call straight through — existing non-HTTP paths are
 * unaffected.
 *
 * Approach B (rejected for now): WebSocket `Pool`
 * -----------------------------------------------
 * Checking out a long-lived WebSocket `Pool` client per request and issuing
 * `SET app.current_user_id = …` once at checkout would avoid the per-query
 * transaction wrap, but it needs `ws` at runtime, changes the serialization
 * story on Vercel's Edge runtime, and is materially higher blast radius for
 * this stack (which exclusively uses the HTTP client today). Approach A
 * adds one extra round-trip per query, which is acceptable — Neon HTTP is
 * already ~2-5 ms p50 within the same region.
 *
 * The entry point that populates `userContext` is the GraphQL context factory
 * in `app/api/graphql/route.ts`.
 * =============================================================================
 */

/**
 * Per-request user context. Set by the GraphQL route (and can be set by any
 * other entry point that wants RLS enforcement). While a value is present on
 * the call stack, every `sql\`…\`` invocation routed through this module
 * transparently upgrades to a SET_CONFIG-prefixed transaction so PostgreSQL
 * RLS policies can read `current_setting('app.current_user_id')`.
 */
export const userContext = new AsyncLocalStorage<{
  userId: string;
  userEmail?: string;
}>();

/**
 * The raw Neon HTTP client. Exposed as `rawSql` so callers with a legitimate
 * reason to bypass the RLS prelude (infra scripts, migrations, the
 * `verify-rls-session-var` test) can opt out. Prefer `sql` for everything
 * inside a user request.
 */
export const rawSql: NeonQueryFunction<false, false> = neon(
  process.env.NEON_DATABASE_URL!,
);

type AnyArgs = unknown[];

/**
 * Build the prelude statements using the provided in-transaction `sql`. We
 * must build them on the transaction-scoped client, not the outer HTTP client,
 * so they share the same batched request.
 *
 * Order matters:
 *
 *   1. `SET LOCAL ROLE app_authenticated` — switches the in-transaction role
 *      to the NOBYPASSRLS role so that FORCE ROW LEVEL SECURITY actually
 *      applies to subsequent statements. Without this, `neondb_owner`'s
 *      `rolbypassrls=true` silently neuters every policy.
 *
 *      NOTE: this role must exist on the target database before it is used.
 *      Applied via `drizzle/0006_create_app_authenticated_role.sql`. Until
 *      that migration runs on a branch, the `SET LOCAL ROLE` call will raise
 *      a runtime error — that is intentional and surfaces a missing-role
 *      rather than silently bypassing RLS.
 *
 *   2. `SELECT set_config('app.current_user_id', …, true)` — the UUID the
 *      policies compare with.
 *
 *   3. `SELECT set_config('app.current_user_email', …, true)` — the email
 *      the share-policies compare with.
 *
 * A SQL identifier literal is used for the role rather than parameter
 * binding, because `SET LOCAL ROLE $1` is a syntax error — Postgres forbids
 * parameters in utility statements. The role name is a compile-time constant
 * in this file (not user-provided), so there is no injection surface.
 */
export const RLS_APP_ROLE = "app_authenticated";

function buildPrelude(
  txn: NeonQueryFunctionInTransaction<false, false>,
  store: { userId: string; userEmail?: string },
): NeonQueryInTransaction[] {
  return [
    txn(`SET LOCAL ROLE ${RLS_APP_ROLE}`, []),
    txn`SELECT set_config('app.current_user_id',    ${store.userId},            true)`,
    txn`SELECT set_config('app.current_user_email', ${store.userEmail ?? ""},   true)`,
  ];
}

/**
 * Given the already-constructed `NeonQueryPromise` produced by the raw client,
 * pull off its `parameterizedQuery` and re-run it inside a transaction that
 * sets `app.current_user_id` / `app.current_user_email` first. Returns a
 * NeonQueryPromise-shaped object: a Promise that resolves to only the user's
 * query result, with `.parameterizedQuery` preserved for downstream
 * `sql.transaction([...])` callers that re-project it.
 */
function runWithSessionVars<T>(
  store: { userId: string; userEmail?: string },
  built: NeonQueryPromise<false, false, unknown>,
): NeonQueryPromise<false, false, T> {
  const txResult = rawSql
    .transaction((txn) => {
      const prelude = buildPrelude(txn, store);
      // The driver's .transaction(fn) contract requires us to hand back a
      // fresh NeonQueryInTransaction built off `txn`. The `built` promise we
      // received was constructed off the outer (non-transactional) client, so
      // we re-submit its parameterizedQuery through `txn`.
      const { query, params } = built.parameterizedQuery;
      const userQuery = txn(query, params);
      return [...prelude, userQuery];
    })
    .then((results) => {
      // results === [setRoleRows, setConfig1Rows, setConfig2Rows, userRows]
      return (results as unknown[])[3] as T;
    });

  // Expose .parameterizedQuery so that a caller doing
  //   sql.transaction([sql`SELECT ...`])
  // can still re-project this query when the outer `sql.transaction` strips
  // and rebuilds the batch with its own set_config prelude.
  const out = txResult as Promise<T> & {
    parameterizedQuery: NeonQueryPromise<false, false, unknown>["parameterizedQuery"];
    opts?: NeonQueryPromise<false, false, unknown>["opts"];
  };
  out.parameterizedQuery = built.parameterizedQuery;
  out.opts = built.opts;
  return out as unknown as NeonQueryPromise<false, false, T>;
}

/**
 * The public `sql`. Behaves identically to `neon()`'s tagged-template client,
 * except:
 *
 *   - When called inside an active `userContext.run({ userId, … }, fn)` scope,
 *     the query is wrapped in a `BEGIN ... COMMIT` that first sets
 *     `app.current_user_id` / `app.current_user_email` via `set_config(…, true)`.
 *   - Outside any `userContext` scope, behaves as a pass-through to the raw
 *     HTTP client.
 *
 * Supports both call styles:
 *   - sql`SELECT ${x}`               (tagged-template)
 *   - sql("SELECT $1", [x])          (ordinary function with $N placeholders)
 *   - sql.transaction([…])           (array-of-queries transaction)
 *   - sql.transaction((txn) => [ … ])(function-form transaction)
 */
function makeSql(): NeonQueryFunction<false, false> {
  // The callable itself. We proxy every invocation through `rawSql` so we get
  // a fully-built NeonQueryPromise to read back its parameterizedQuery.
  const fn = ((...args: AnyArgs) => {
    // Forward the call to the raw client — this constructs a NeonQueryPromise
    // and eagerly fires the HTTP request on the raw client. If a userContext
    // is active, we immediately throw that work away and resubmit under a
    // transaction. (The wasted request is harmless: worst case one extra
    // round-trip, and we always await the transaction result below.)
    const built = (rawSql as unknown as (...a: AnyArgs) => NeonQueryPromise<false, false, unknown>)(
      ...args,
    );
    const store = userContext.getStore();
    if (!store?.userId) return built;
    return runWithSessionVars(store, built);
  }) as NeonQueryFunction<false, false>;

  // Preserve `.transaction(...)` surface. Two overloads:
  //   A) sql.transaction([q1, q2, ...])
  //   B) sql.transaction((txn) => [q1, q2, ...])
  // In both cases, if userContext is active we inject the two set_config
  // queries at the head of the array.
  fn.transaction = ((
    queriesOrFn:
      | NeonQueryPromise<false, false>[]
      | ((txn: NeonQueryFunctionInTransaction<false, false>) => NeonQueryInTransaction[]),
    opts?: HTTPQueryOptions<false, false>,
  ) => {
    const store = userContext.getStore();

    if (typeof queriesOrFn === "function") {
      const userBuilder = queriesOrFn;
      const wrappedBuilder = (
        txn: NeonQueryFunctionInTransaction<false, false>,
      ): NeonQueryInTransaction[] => {
        const userQueries = userBuilder(txn);
        if (!store?.userId) return userQueries;
        return [...buildPrelude(txn, store), ...userQueries];
      };
      const result = rawSql.transaction(wrappedBuilder, opts);
      if (!store?.userId) return result;
      // Strip the three prelude rows from the result
      // (SET LOCAL ROLE + two set_config()).
      return result.then((rows) => (rows as unknown[]).slice(3)) as ReturnType<
        typeof rawSql.transaction
      >;
    }

    // Array form.
    if (!store?.userId) {
      return rawSql.transaction(queriesOrFn, opts);
    }
    const wrappedBuilder = (
      txn: NeonQueryFunctionInTransaction<false, false>,
    ): NeonQueryInTransaction[] => {
      // Re-project each pre-built NeonQueryPromise through `txn` so they share
      // the transaction client.
      const reprojected: NeonQueryInTransaction[] = queriesOrFn.map((q) => {
        const { query, params } = q.parameterizedQuery;
        return txn(query, params);
      });
      return [...buildPrelude(txn, store), ...reprojected];
    };
    const result = rawSql.transaction(wrappedBuilder, opts);
    return result.then((rows) => (rows as unknown[]).slice(3)) as ReturnType<
      typeof rawSql.transaction
    >;
  }) as NeonQueryFunction<false, false>["transaction"];

  return fn;
}

/**
 * Default client. Every resolver/route in the app imports `sql` from here;
 * routing all of them through this wrapper is what makes RLS session-variable
 * enforcement transparent.
 */
export const sql = makeSql();

/**
 * Back-compat helper retained from the prior iteration. Lets callers that
 * already use `withUser(...)` keep working unchanged. New code should prefer
 * running inside `userContext.run(...)` and using plain `sql\`…\`` — that's
 * the transparent path.
 *
 * Executes all supplied statements inside a single transaction with:
 *
 *   SET LOCAL app.current_user_id    = <userId>
 *   SET LOCAL app.current_user_email = <userEmail ?? ''>
 *
 * applied first.
 */
export async function withUser<T>(
  userId: string,
  userEmail: string | undefined,
  build: (
    tx: NeonQueryFunction<false, false>,
  ) => NeonQueryPromise<false, false, unknown>[],
): Promise<T> {
  if (!userId) throw new Error("withUser: userId is required");

  // Use rawSql (not the wrapped sql) so we don't double-wrap the transaction.
  const statements = build(rawSql as unknown as NeonQueryFunction<false, false>);
  const prelude = [
    rawSql`SELECT set_config('app.current_user_id',    ${userId},            true)`,
    rawSql`SELECT set_config('app.current_user_email', ${userEmail ?? ""},   true)`,
  ];

  const results = (await rawSql.transaction([
    ...prelude,
    ...statements,
  ])) as unknown[];
  return results.slice(prelude.length) as unknown as T;
}
