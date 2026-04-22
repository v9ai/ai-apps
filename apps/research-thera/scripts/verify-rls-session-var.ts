/**
 * scripts/verify-rls-session-var.ts
 *
 * Smoke-tests the AsyncLocalStorage-based RLS session-variable plumbing in
 * `src/db/neon.ts`. Verifies that `app.current_user_id` and
 * `app.current_user_email` are actually visible to SQL executed from within a
 * `userContext.run(…)` scope — and that they are NOT visible outside one.
 *
 * Run against the Neon RLS branch (NOT production). The branch id used during
 * development is `br-wandering-bird-a4h7ihom` (`rls-consolidation-20260422`)
 * on project `wandering-dew-31821015`.
 *
 * Usage:
 *
 *   # Reuse whatever NEON_DATABASE_URL is in .env.local:
 *   pnpm tsx --env-file=.env.local scripts/verify-rls-session-var.ts
 *
 *   # Or point at the RLS branch explicitly:
 *   NEON_BRANCH_URL="postgres://<role>:<pw>@<host>/<db>?sslmode=require" \
 *     pnpm tsx --env-file=.env.local scripts/verify-rls-session-var.ts
 *
 * NOTE: `--env-file` is required (rather than `dotenv/config` at the top of the
 * script) because `src/db/neon.ts` calls `neon(process.env.NEON_DATABASE_URL)`
 * eagerly at module load, which runs before any import-body `loadEnv()` can
 * populate the env.
 *
 * Exit code is 0 on success, 1 on any assertion failure.
 */

// Load env vars before anything that might read them. Prefer `.env.local`
// (Next.js convention) and fall back to `.env`. We load both with override=false
// so whichever was exported in the shell still wins.
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

// Allow overriding NEON_DATABASE_URL with NEON_BRANCH_URL before importing the
// client so the branch connection string takes effect.
if (process.env.NEON_BRANCH_URL) {
  process.env.NEON_DATABASE_URL = process.env.NEON_BRANCH_URL;
}

import { sql, userContext } from "../src/db/neon";

const FAKE_UUID = "00000000-0000-4000-8000-000000000abc";
const FAKE_EMAIL = "verify@rls.test";

function assertEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    // eslint-disable-next-line no-console
    console.error(
      `FAIL  ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
    );
    process.exitCode = 1;
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`PASS  ${label} (${JSON.stringify(actual)})`);
}

async function readUserId(): Promise<string> {
  const rows = (await sql`
    SELECT current_setting('app.current_user_id', true) AS v
  `) as Array<{ v: string | null }>;
  return rows[0]?.v ?? "";
}

async function readUserEmail(): Promise<string> {
  const rows = (await sql`
    SELECT current_setting('app.current_user_email', true) AS v
  `) as Array<{ v: string | null }>;
  return rows[0]?.v ?? "";
}

async function main(): Promise<void> {
  if (!process.env.NEON_DATABASE_URL) {
    throw new Error(
      "NEON_DATABASE_URL (or NEON_BRANCH_URL) is required to run this check.",
    );
  }

  // 1. Outside any userContext.run(...) the session variables are empty.
  //    (current_setting(..., missing_ok=true) returns '' when unset.)
  const outsideUserId = await readUserId();
  assertEq(outsideUserId, "", "outside scope: app.current_user_id is empty");

  // 2. Inside userContext.run(...) the wrapper prepends set_config() and the
  //    query sees the injected value.
  await userContext.run(
    { userId: FAKE_UUID, userEmail: FAKE_EMAIL },
    async () => {
      const insideUserId = await readUserId();
      assertEq(insideUserId, FAKE_UUID, "inside scope: app.current_user_id");
      const insideUserEmail = await readUserEmail();
      assertEq(insideUserEmail, FAKE_EMAIL, "inside scope: app.current_user_email");
    },
  );

  // 3. After exiting the scope, the next query is back on a fresh session and
  //    the setting is empty again.
  const afterUserId = await readUserId();
  assertEq(afterUserId, "", "after scope: app.current_user_id is empty again");

  // 4. The transparent wrapper should still work for ordinary-function form
  //    (sql(queryString, params)) — that is how `src/db/index.ts` issues most
  //    of its queries.
  await userContext.run(
    { userId: FAKE_UUID, userEmail: FAKE_EMAIL },
    async () => {
      const rows = (await sql(
        "SELECT current_setting('app.current_user_id', true) AS v",
        [],
      )) as Array<{ v: string | null }>;
      assertEq(
        rows[0]?.v ?? "",
        FAKE_UUID,
        "inside scope: ordinary-function form also carries session var",
      );
    },
  );

  // 5. sql.transaction([...]) should also carry the session vars through to
  //    every statement in the batch.
  await userContext.run(
    { userId: FAKE_UUID, userEmail: FAKE_EMAIL },
    async () => {
      const [[r1], [r2]] = (await sql.transaction([
        sql`SELECT current_setting('app.current_user_id', true) AS v`,
        sql`SELECT current_setting('app.current_user_email', true) AS v`,
      ])) as Array<Array<{ v: string | null }>>;
      assertEq(r1?.v ?? "", FAKE_UUID, "transaction array form: user id");
      assertEq(r2?.v ?? "", FAKE_EMAIL, "transaction array form: user email");
    },
  );

  if (process.exitCode && process.exitCode !== 0) {
    // eslint-disable-next-line no-console
    console.error("\nFAILED");
  } else {
    // eslint-disable-next-line no-console
    console.log("\nOK — all session-variable checks passed.");
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
