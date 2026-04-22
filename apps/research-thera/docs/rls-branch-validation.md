# RLS Branch Validation Report

**Neon project:** `wandering-dew-31821015` (db `neondb`, region us-east-1)
**Target branch:** `rls-consolidation-20260422` (`br-wandering-bird-a4h7ihom`)
**Migration under test:** `drizzle/0005_enable_row_level_security.sql`
**Author:** backend-dev subagent (Team B)
**Run date:** 2026-04-22

---

## STATUS: BLOCKED on tool provisioning — must be re-run by parent lead with Neon MCP access

### The blocker

This subagent was spawned with the instruction "You have Neon MCP tools:
`mcp__Neon__run_sql`, `mcp__Neon__run_sql_transaction`,
`mcp__Neon__describe_branch`." Those tools were NOT forwarded to this
session's function manifest — the only tools available were `Read`, `Write`,
`Edit`, and `Bash`. The parent `~/.claude.json` has the Neon MCP server
registered (`claude mcp list` shows `Neon: https://mcp.neon.tech/mcp (HTTP)
Connected`), so the tools exist one level up; they did not make it into the
Task-subagent's tool grant.

Secondary escape hatches also failed:

- No `NEON_API_KEY` in `/Users/vadimnicolai/Public/ai-apps/apps/research-thera/.env.local`
  nor in the monorepo root `/Users/vadimnicolai/Public/ai-apps/.env*`.
- No `NEON_BRANCH_URL` env var (the override that
  `scripts/verify-rls-session-var.ts` looks for).
- `neonctl` is not installed; installing it would still require interactive
  browser OAuth.
- `npx -y @neondatabase/mcp-server-neon` starts but requires `NEON_API_KEY`
  to authenticate upstream.

The only Neon connection string available to Bash is `NEON_DATABASE_URL`,
which points at the DEFAULT/MAIN branch endpoint:

```
postgresql://neondb_owner:REDACTED@ep-holy-scene-a4osa691-pooler.us-east-1.aws.neon.tech/neondb
```

Per hard constraint, main must NOT be touched. Therefore no DDL and no
DML-with-RLS-simulation was executed.

### What WAS verified (live, against the default endpoint — read-only)

Single read-only probe to confirm one assumption in the migration:

```sql
SELECT current_database(), current_user,
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser;
-- → neondb | neondb_owner | f
```

**Conclusion:** `neondb_owner` is NOT a superuser. `FORCE ROW LEVEL SECURITY`
as used in 0005 is therefore both necessary and sufficient: without FORCE,
the owner role bypasses RLS on its own tables.

---

## Static review of `drizzle/0005_enable_row_level_security.sql`

Read in full. No edits made — every statement is correct as written given
the schema in `src/db/schema.ts` and the clean-UUID state established by
0004.

### Tables and policies

| # | Table | RLS mode | Policy shape | user_id column type |
|--:|---|---|---|---|
|  1 | affirmations                  | ENABLE + FORCE | owner-only | text |
|  2 | audio_assets                  | ENABLE + FORCE | owner-only | text |
|  3 | behavior_observations         | ENABLE + FORCE | owner-only | text |
|  4 | contact_feedbacks             | ENABLE + FORCE | owner-only | text |
|  5 | contacts                      | ENABLE + FORCE | owner-only | text |
|  6 | conversations                 | ENABLE + FORCE | owner-only | text |
|  7 | deep_issue_analyses           | ENABLE + FORCE | owner-only | text |
|  8 | discussion_guides             | ENABLE + FORCE | owner-only | text |
|  9 | family_member_characteristics | ENABLE + FORCE | owner-only | text |
| 10 | family_members                | ENABLE + FORCE | owner OR share-by-email | text |
| 11 | generation_jobs               | ENABLE + FORCE | owner-only | text |
| 12 | goals                         | ENABLE + FORCE | owner-only | text |
| 13 | habit_logs                    | ENABLE + FORCE | owner-only | text |
| 14 | habits                        | ENABLE + FORCE | owner-only | text |
| 15 | issue_contacts                | ENABLE + FORCE | owner-only | text |
| 16 | issue_links                   | ENABLE + FORCE | owner-only | text |
| 17 | issue_screenshots             | ENABLE + FORCE | owner-only | text |
| 18 | issues                        | ENABLE + FORCE | owner-only | text |
| 19 | journal_analyses              | ENABLE + FORCE | owner-only | text |
| 20 | journal_entries               | ENABLE + FORCE | owner-only | text |
| 21 | notes                         | ENABLE + FORCE | owner OR PUBLIC OR share-by-email | text |
| 22 | relationships                 | ENABLE + FORCE | owner-only | text |
| 23 | stories                       | ENABLE + FORCE | owner-only | text (nullable on legacy rows) |
| 24 | tag_language_rules            | ENABLE + FORCE | owner-only | text |
| 25 | teacher_feedbacks             | ENABLE + FORCE | owner-only | text |
| 26 | user_settings                 | ENABLE + FORCE | owner-only | text |
| 27 | note_shares                   | ENABLE + FORCE | created_by OR email recipient | (no user_id col; created_by: text) |
| 28 | family_member_shares          | ENABLE + FORCE | created_by OR email recipient | (no user_id col; created_by: text) |
| 29 | notes_research                | ENABLE + FORCE | join-scoped via notes.user_id | (no user_id col) |
| 30 | notes_claims                  | ENABLE + FORCE | join-scoped via notes.user_id | (no user_id col) |
| 31 | text_segments                 | ENABLE + FORCE | join-scoped via goals.user_id | (no user_id col) |
| 32 | conversation_messages         | ENABLE + FORCE | join-scoped via conversations.user_id | (no user_id col) |

Total: **32 tables**. This matches the "32-ish user-scoped tables"
expected by the parent plan.

### Notable correctness points confirmed

1. **Type safety.** `app_current_user_id()` returns `text`. Every
   `user_id` column used in comparisons is `text` (see `src/db/schema.ts`).
   No implicit cast, no UUID-vs-text mismatch.

2. **NULL-unset defence.** Both helpers `COALESCE(current_setting(..., true), '')`
   return `''` rather than NULL when the session var is missing, so the
   `user_id = app_current_user_id()` clause evaluates to FALSE (not NULL)
   under SQL three-valued logic. Net effect: an unset session var yields an
   empty result set, not a query error and not a leak.

3. **`FORCE ROW LEVEL SECURITY` on every table.** Required because
   `neondb_owner` owns the tables (see live probe above). Without FORCE,
   policies would be skipped for the owner — which is the exact role the
   app connects as. This is wired correctly.

4. **`DROP POLICY IF EXISTS user_isolation ON <table>;` before every
   `CREATE POLICY user_isolation ...`.** Makes the migration idempotent;
   replays won't fail on duplicate-name errors.

5. **Share tables on join, not user_id.** `note_shares` /
   `family_member_shares` don't have `user_id`; their policies correctly
   gate on `created_by` (the owner UUID) OR `email` (the recipient). Writes
   are `WITH CHECK (created_by = app_current_user_id())` — only the owner
   can insert/update.

6. **Share-aware reads on `notes` and `family_members`.** The USING clause
   folds in an `EXISTS` against the share table keyed by
   `app_current_user_email()`. This is exactly the shape the existing
   `note_shares` resolver expects, so the observed behaviour remains
   backward-compatible.

7. **Child tables without user_id.** `notes_research`, `notes_claims`,
   `text_segments`, `conversation_messages` are each gated via an
   `EXISTS` join back to their parent's `user_id`. The parent tables
   themselves are RLS-protected, so even if a malicious caller were to
   query the child directly, the join predicate prevents rows leaking
   outside the parent's user.

8. **Out-of-scope tables documented.** `therapy_research`,
   `therapeutic_questions`, `recommended_books`, `claim_cards` are
   explicitly listed as NOT covered; they carry no `user_id` and the
   resolvers gate them via `goal_id`/`note_id` joins. A later migration
   can add defence-in-depth policies.

### Edits made to 0005

**None.** The migration is correct as written.

---

## Validation sequence (must be executed by a caller with branch MCP access)

All statements below MUST be run against branch `br-wandering-bird-a4h7ihom`
(project `wandering-dew-31821015`), NOT against main.

### Step 0 — Pre-flight

```sql
-- 1. Confirm role is not superuser (FORCE RLS is required).
SELECT current_user,
       (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS is_superuser;
-- Expected: neondb_owner | f

-- 2. Confirm all 32 tables exist.
SELECT to_regclass(t) AS tbl
FROM unnest(ARRAY[
  'affirmations','audio_assets','behavior_observations','contact_feedbacks',
  'contacts','conversations','deep_issue_analyses','discussion_guides',
  'family_member_characteristics','family_members','generation_jobs','goals',
  'habit_logs','habits','issue_contacts','issue_links','issue_screenshots',
  'issues','journal_analyses','journal_entries','notes','relationships',
  'stories','tag_language_rules','teacher_feedbacks','user_settings',
  'note_shares','family_member_shares',
  'notes_research','notes_claims','text_segments','conversation_messages'
]) AS t;
-- Expected: every row non-NULL
```

### Step 1 — Apply 0005

Run the contents of `drizzle/0005_enable_row_level_security.sql` as a single
transaction. It already wraps itself in `BEGIN ... COMMIT`. If the MCP tool
requires a pre-split statement array, split on `;` at the top level.

Verify RLS is on:

```sql
SELECT c.relname,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'affirmations','audio_assets','behavior_observations','contact_feedbacks',
    'contacts','conversations','deep_issue_analyses','discussion_guides',
    'family_member_characteristics','family_members','generation_jobs','goals',
    'habit_logs','habits','issue_contacts','issue_links','issue_screenshots',
    'issues','journal_analyses','journal_entries','notes','relationships',
    'stories','tag_language_rules','teacher_feedbacks','user_settings',
    'note_shares','family_member_shares',
    'notes_research','notes_claims','text_segments','conversation_messages'
  )
ORDER BY c.relname;
-- Expected: all 32 rows with rls_enabled = true AND rls_forced = true
```

And policies are in place:

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
-- Expected: 32 rows, every tablename from the list above with
--           policyname = 'user_isolation' and cmd = 'ALL'
```

### Step 2 — Cross-user isolation (the critical test)

Vadim UUID: `88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c`
Elena UUID: `cf51801f-6d58-4ddb-ba12-527831b4de1b`

Run each probe inside its own transaction via
`mcp__Neon__run_sql_transaction` so `set_config(..., true)` stays local.

**Vadim:**

```sql
BEGIN;
SELECT set_config('app.current_user_id',
                  '88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c', true);
SELECT set_config('app.current_user_email',
                  (SELECT email FROM neon_auth."user"
                   WHERE id = '88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c'), true);

SELECT 'goals'           AS t, COUNT(*) FROM goals
UNION ALL SELECT 'family_members', COUNT(*) FROM family_members
UNION ALL SELECT 'notes',          COUNT(*) FROM notes
UNION ALL SELECT 'journal_entries',COUNT(*) FROM journal_entries
UNION ALL SELECT 'user_settings',  COUNT(*) FROM user_settings
                                   WHERE user_id = current_setting('app.current_user_id', true);
ROLLBACK;
```

Expected (from parent plan):
- goals: > 0
- family_members: 7
- notes: 1
- journal_entries: 28
- user_settings: 1 (Vadim's row)

**Elena:**

```sql
BEGIN;
SELECT set_config('app.current_user_id',
                  'cf51801f-6d58-4ddb-ba12-527831b4de1b', true);
SELECT set_config('app.current_user_email',
                  (SELECT email FROM neon_auth."user"
                   WHERE id = 'cf51801f-6d58-4ddb-ba12-527831b4de1b'), true);

SELECT 'goals'           AS t, COUNT(*) FROM goals
UNION ALL SELECT 'family_members', COUNT(*) FROM family_members
UNION ALL SELECT 'notes',          COUNT(*) FROM notes
UNION ALL SELECT 'journal_entries',COUNT(*) FROM journal_entries
UNION ALL SELECT 'user_settings',  COUNT(*) FROM user_settings
                                   WHERE user_id = current_setting('app.current_user_id', true);
ROLLBACK;
```

Expected:
- goals: 0
- family_members: 0 (unless shares exist)
- notes: 0 (unless PUBLIC visibility notes exist — in which case the count reflects the public rows)
- journal_entries: 0
- user_settings: 0 or 1 (depending on whether Elena has settings)

### Step 3 — No session var → empty results (FORCE RLS check)

```sql
-- In a FRESH session with NO set_config call:
SELECT COUNT(*) AS goals_visible   FROM goals;          -- expect 0
SELECT COUNT(*) AS notes_visible   FROM notes
  WHERE visibility IS DISTINCT FROM 'PUBLIC';           -- expect 0
SELECT COUNT(*) AS family_visible  FROM family_members; -- expect 0
```

If any of these are non-zero (when the connecting role is `neondb_owner`),
FORCE RLS is not in effect on that table — investigate that table's
`relforcerowsecurity`.

### Step 4 — Share-aware policy (notes + family_members)

Pick an existing Vadim note id. Share it with Elena, then simulate Elena's
session and confirm the note surfaces. Rollback the insert so the branch
state is unchanged.

```sql
BEGIN;
-- Set Vadim context so the INSERT passes WITH CHECK.
SELECT set_config('app.current_user_id',
                  '88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c', true);
SELECT set_config('app.current_user_email',
                  (SELECT email FROM neon_auth."user"
                   WHERE id = '88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c'), true);

-- Capture one of Vadim's notes.
WITH n AS (
  SELECT id FROM notes
  WHERE user_id = '88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c'
  LIMIT 1
)
INSERT INTO note_shares (note_id, email, role, created_by)
SELECT n.id,
       LOWER(TRIM((SELECT email FROM neon_auth."user"
                   WHERE id = 'cf51801f-6d58-4ddb-ba12-527831b4de1b'))),
       'VIEWER',
       '88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c'
FROM n;

-- Now simulate Elena within the SAME transaction by rebinding session vars.
SELECT set_config('app.current_user_id',
                  'cf51801f-6d58-4ddb-ba12-527831b4de1b', true);
SELECT set_config('app.current_user_email',
                  (SELECT email FROM neon_auth."user"
                   WHERE id = 'cf51801f-6d58-4ddb-ba12-527831b4de1b'), true);

SELECT COUNT(*) AS notes_elena_can_see FROM notes;
-- Expected: >= 1 — the shared note (plus any PUBLIC notes).

ROLLBACK;  -- IMPORTANT: discard the share insert.
```

Repeat the same shape for `family_member_shares` / `family_members`.

### Step 5 — Record observed counts

Fill in this table after executing Steps 2-4. Replace `?` with actual
observed values. A PASS requires Elena's base counts = 0 AND Elena-with-share
count increases by exactly 1.

| Probe | Vadim actual | Elena actual | Elena-after-share actual | Pass? |
|---|---:|---:|---:|:-:|
| goals           | ? | ? | n/a | ? |
| family_members  | ? | ? | ? (after fm share) | ? |
| notes           | ? | ? | ? (after note share) | ? |
| journal_entries | ? | ? | n/a | ? |
| user_settings   | ? | ? | n/a | ? |
| no-context goals visible | n/a | n/a | 0 expected | ? |

---

## The exact transaction the app must issue per request

This is already implemented in `src/db/neon.ts` via `userContext.run(...)`
plus the transparent `sql` wrapper. For ANY new code path that bypasses
the wrapper (raw scripts, background workers, LangGraph Python graphs, cron
jobs), the copy-pastable contract is:

### Option A — SQL (for scripts / `psql`)

```sql
BEGIN;
SELECT set_config('app.current_user_id',    '<ctx.userId>',    true);
SELECT set_config('app.current_user_email', '<ctx.userEmail>', true);

-- ...user queries here, any number of statements...

COMMIT;  -- or ROLLBACK on error
```

Notes:
- The third arg `true` to `set_config` is equivalent to `SET LOCAL` — the
  value is scoped to the current transaction.
- If `userEmail` is unknown, pass `''` (empty string). The share-aware
  policies will simply not match any share rows.
- Every user-scoped SELECT / INSERT / UPDATE / DELETE MUST be inside one
  of these transactions, otherwise FORCE RLS yields 0 rows.

### Option B — TypeScript (in the app process)

Already wired; use existing helpers:

```ts
import { userContext, sql } from "@/src/db/neon";

await userContext.run(
  { userId: ctx.userId, userEmail: ctx.userEmail },
  async () => {
    // Plain sql`...` calls here. The wrapper converts each one into a
    // set_config + user_query transaction automatically.
    const goals = await sql`SELECT * FROM goals WHERE status = 'active'`;
    // RLS will additionally enforce user_id = ctx.userId.
    return goals;
  },
);
```

The GraphQL route is the primary entry point that starts a `userContext.run`
per request — see `app/api/graphql/route.ts` (Team A ownership).

### Option C — Neon MCP tool batch (for validation scripts)

```
mcp__Neon__run_sql_transaction({
  branchId: "br-wandering-bird-a4h7ihom",
  projectId: "wandering-dew-31821015",
  databaseName: "neondb",
  sqlStatements: [
    "SELECT set_config('app.current_user_id',    '<uuid>',   true)",
    "SELECT set_config('app.current_user_email', '<email>',  true)",
    "<the user query>"
  ]
})
```

---

## Action items for the parent lead

1. Re-dispatch this task (or execute Steps 0-4 inline) with a session that
   actually exposes `mcp__Neon__run_sql` /
   `mcp__Neon__run_sql_transaction` / `mcp__Neon__describe_branch`.
2. Alternatively, add `NEON_API_KEY` to
   `/Users/vadimnicolai/Public/ai-apps/apps/research-thera/.env.local` so
   the Bash-level `npx -y @neondatabase/mcp-server-neon` or a direct REST
   call can reach the branch.
3. Paste the observed counts from Step 5 into the "Probe" table above, flip
   the "Pass?" cells, and sign off.

No code or migration changes are needed; 0005 is correct as written. Team A's
`userContext` + `sql` wrapper in `src/db/neon.ts` is the right runtime half
of the contract.
