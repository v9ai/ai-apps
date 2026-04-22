# RLS + `user_id` Consolidation — Migration Plan

> **Status:** DESIGN COMPLETE — NOT YET APPLIED TO PRODUCTION
> **Neon project:** `wandering-dew-31821015`, db `neondb`, region us-east-1
> **Intended branch:** `rls-consolidation-20260422` (NOT YET CREATED — see
> "Phase 1 Blocker" below)
> **Owner:** backend-dev (team) — human review required before promotion

---

## TL;DR

Three artefacts are ready for review:

1. `drizzle/0004_consolidate_user_id_to_uuid.sql` — replaces legacy email-form
   `user_id` / `created_by` values with the authoritative UUID from
   `neon_auth."user"` across 26 user-scoped tables.
2. `drizzle/0005_enable_row_level_security.sql` — enables RLS on every
   user-scoped table + 4 child tables + 2 share tables, wired to two session
   variables `app.current_user_id` and `app.current_user_email`.
3. Code changes in 7 resolvers + 3 helper modules that flip the WHERE-clause
   identity from `ctx.userEmail` to `ctx.userId`.

Nothing was applied to the `main` Neon branch. The migration SQL is written
to run against a child branch named `rls-consolidation-20260422`.

---

## Phase 1 Blocker — Neon branch creation

**Blocker:** the agent environment used to produce this plan does not expose
the `mcp__Neon__*` MCP tools, and no `NEON_API_KEY` is present in
`.env.local`. `neonctl` is installed but requires an interactive browser
OAuth flow that the agent cannot complete (`ERROR: Authentication timed out
after 60 seconds`).

**Action for a human reviewer (takes ~2 minutes):**

```
# Option A — MCP console (recommended):
mcp__Neon__create_branch({
  projectId: "wandering-dew-31821015",
  name: "rls-consolidation-20260422",
  parentBranchId: "<main branch id>"
})

# Option B — neonctl (after interactive login):
neonctl auth
neonctl branches create \
  --project-id wandering-dew-31821015 \
  --name rls-consolidation-20260422
```

Record the resulting `branchId` — referenced as `$BRANCH_ID` below.

---

## Tables touched (26 user-scoped + 6 related)

| # | Table | Migration 0004 | Migration 0005 | Notes |
|--:|---|:-:|:-:|---|
|  1 | affirmations                | UPDATE user_id       | RLS owner-only | |
|  2 | audio_assets                | UPDATE user_id       | RLS owner-only | |
|  3 | behavior_observations       | UPDATE user_id       | RLS owner-only | |
|  4 | contact_feedbacks           | UPDATE user_id       | RLS owner-only | |
|  5 | contacts                    | UPDATE user_id       | RLS owner-only | |
|  6 | conversations               | UPDATE user_id       | RLS owner-only | |
|  7 | deep_issue_analyses         | UPDATE user_id       | RLS owner-only | |
|  8 | discussion_guides           | UPDATE user_id       | RLS owner-only | |
|  9 | family_member_characteristics| UPDATE user_id      | RLS owner-only | |
| 10 | family_members              | UPDATE user_id       | RLS owner + share viewer | reads share table |
| 11 | generation_jobs             | UPDATE user_id       | RLS owner-only | |
| 12 | goals                       | UPDATE user_id       | RLS owner-only | |
| 13 | habit_logs                  | UPDATE user_id       | RLS owner-only | |
| 14 | habits                      | UPDATE user_id       | RLS owner-only | |
| 15 | issue_contacts              | UPDATE user_id       | RLS owner-only | |
| 16 | issue_links                 | UPDATE user_id       | RLS owner-only | |
| 17 | issue_screenshots           | UPDATE user_id       | RLS owner-only | |
| 18 | issues                      | UPDATE user_id       | RLS owner-only | |
| 19 | journal_analyses            | UPDATE user_id       | RLS owner-only | |
| 20 | journal_entries             | UPDATE user_id       | RLS owner-only | |
| 21 | notes                       | UPDATE user_id + created_by | RLS owner + share viewer + PUBLIC | |
| 22 | relationships               | UPDATE user_id       | RLS owner-only | |
| 23 | stories                     | UPDATE user_id       | RLS owner-only | user_id may be NULL on legacy rows |
| 24 | tag_language_rules          | UPDATE user_id       | RLS owner-only | |
| 25 | teacher_feedbacks           | UPDATE user_id       | RLS owner-only | |
| 26 | user_settings               | UPDATE user_id       | RLS owner-only | |
| 27 | note_shares                 | UPDATE created_by    | RLS owner + recipient-by-email | no user_id col |
| 28 | family_member_shares        | UPDATE created_by    | RLS owner + recipient-by-email | no user_id col |
| 29 | notes_research              | — (no user col)      | RLS via notes.user_id | join-scoped |
| 30 | notes_claims                | — (no user col)      | RLS via notes.user_id | join-scoped |
| 31 | text_segments               | — (no user col)      | RLS via goals.user_id | join-scoped |
| 32 | conversation_messages       | — (no user col)      | RLS via conversations.user_id | join-scoped |

### Tables intentionally NOT covered in 0005

`therapy_research`, `therapeutic_questions`, `recommended_books`,
`claim_cards`. None of these carry a `user_id` column; they are owned via
`goal_id` / `note_id` joins the resolvers already perform. If defence-in-depth
is wanted later, add an RLS policy that walks the join.

### Expected row counts before/after

The `_rls_before_counts` and `_rls_after_counts` temp tables in 0004 emit a
before/after report at the end of the migration:

```
 table_name | total_rows_before | email_rows_before | email_rows_after_orphaned | rows_converted
```

`email_rows_after_orphaned > 0` ⇒ orphans (emails not in `neon_auth.user`).
These are **flagged, not deleted** — see "Orphans" below.

---

## Files changed in code

### New files

| Path | Purpose |
|---|---|
| `drizzle/0004_consolidate_user_id_to_uuid.sql`      | UUID backfill |
| `drizzle/0005_enable_row_level_security.sql`        | RLS policies |
| `docs/rls-migration-plan.md`                        | This document |

### Modified files (resolver layer — 7 files)

| Path | Change |
|---|---|
| `schema/resolvers/Mutation/deleteNote.ts`                | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/deleteGoal.ts`                | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/deleteFamilyMember.ts`        | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/setTagLanguage.ts`            | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Query/tagLanguage.ts`                  | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/generateDiscussionGuide.ts`   | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/generateJournalAnalysis.ts`   | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/generateTherapeuticQuestions.ts` | `ctx.userEmail` → `ctx.userId` |
| `schema/resolvers/Mutation/generateOpenAIAudio.ts`       | `ctx.userEmail` → `ctx.userId`; LangGraph `user_email` payload key retained for Python compat (the VALUE is now the UUID) |

### Modified files (helper layer — 3 files)

| Path | Change |
|---|---|
| `src/db/index.ts`  | `deleteNote(noteId, userEmail)` / `deleteGoal(goalId, userEmail)` params renamed to `userId` |
| `src/lib/ro.ts`    | `isRoGoal` / `resolveGoalLanguage` accept `{ userId }`; legacy `userEmail` kept as deprecated alias so Team 1's 5 resolvers still compile unchanged |
| `src/db/neon.ts`   | Added `withUser(userId, userEmail, build)` helper that opens one transaction and runs `SET LOCAL app.current_user_id` + `SET LOCAL app.current_user_email` ahead of the caller's statements. Not yet wired into resolvers — see driver decision below. |

### Files intentionally NOT modified (Team 1 ownership)

Per task constraints, the 5 resolvers Team 1 is fixing were left alone:

- `schema/resolvers/Mutation/generateAudio.ts`
- `schema/resolvers/Mutation/checkNoteClaims.ts`
- `schema/resolvers/Query/generationJob.ts`
- `schema/resolvers/Query/recommendedBooks.ts`
- `schema/resolvers/Query/therapeuticQuestions.ts`

Two of these (`generateAudio`, `checkNoteClaims`) still contain
`${userEmail}` in their WHERE clauses. Once Team 1 ships, they should make
the same `ctx.userEmail` → `ctx.userId` flip. `src/lib/ro.ts` accepts both
names specifically so Team 1 can land their fix without blocking on us.

---

## Driver approach — decision and reasoning

**Decision:** Stage RLS (0005) behind a separate rollout after the driver
rewrite; keep 0004 + the resolver rename as the first release.

### Why

The Neon serverless HTTP driver (`neon()` in `src/db/neon.ts`) is **stateless
per request**. `SET LOCAL` only holds across statements *inside the same
transaction*. The driver exposes `sql.transaction([...])` which runs an
**array of pre-built queries** as a single transaction — you cannot call
`await` mid-transaction while the SET LOCAL stays active.

Research-thera has:

- 13 resolvers with `${userEmail}` (mine) + 68 with `${userId}` (other teams)
- Many resolvers do `Promise.all([...])` over multiple SQL calls
- Several resolvers interleave SQL with LLM calls (`generateObject(...)`)

Three options were considered:

| Option | Feasibility | Cost | Risk |
|---|---|---|---|
| A. Rewrite every resolver to collect statements into a `transaction([...])` array | Intractable for resolvers that mix SQL + LLM awaits — you cannot know the next SQL until the LLM returns | ≫ 2h | High (semantic rewrite of 81 sites) |
| B. Switch from `@neondatabase/serverless` HTTP to `Pool` WebSocket driver, get one client per request, keep a transaction open for the request's lifetime | Lower semantic disruption; mostly mechanical | ~1 day | Medium — changes behaviour under load, needs pool tuning |
| C. Ship 0004 + resolver rename now; ship 0005 (RLS) in a separate release after the driver rewrite | Minimal disruption today; gains the `user_id` consistency + UUID-based WHERE clauses immediately | ~0 | Low |

We picked **C**. Rationale explicitly matches the task hard-constraint:
> "If it means rewriting 81 call sites, stop and report a scoped-rollout
>  plan instead."

The `withUser` helper in `src/db/neon.ts` is a hook-point for Option B when
the team is ready. It currently compiles but is not imported by any
resolver. Enabling RLS without that helper wired in would cause every query
to return zero rows (effective hard lockout).

---

## Rollout order

### Release N+1 — 0004 + resolver rename (safe; this PR)

1. Merge the code changes (resolvers + `src/lib/ro.ts` + `src/db/neon.ts`).
2. Apply `0004_consolidate_user_id_to_uuid.sql` to the Neon branch.
3. Run the validation queries (included at the bottom of 0004) on the
   branch. Confirm `email_rows_after_orphaned = 0` for every table, or
   review the orphan list.
4. Promote the branch to `main` (see "How to promote" below).
5. Deploy the application. Users continue to see their own data — the
   resolver WHERE clauses now match against UUIDs and the DB rows have been
   backfilled to UUIDs.

### Release N+2 — 0005 + driver rewrite (separate PR)

1. Port `src/db/neon.ts` + hot-path resolvers to the WebSocket `Pool`
   driver, or use `neonSql.transaction([...])` with inlined statement
   arrays — whichever the next spike concludes is lower-risk.
2. Wire `withUser(ctx.userId, ctx.userEmail, …)` at the top of every
   resolver.
3. On a fresh Neon branch, apply `0005_enable_row_level_security.sql` and
   run the 2-user sanity script (see "Cross-user sanity test" below).
4. Shadow-deploy: ship the Pool driver + resolver rewrite first, verify
   production stays green for 24h, THEN apply 0005 to `main`.

---

## Pre-promotion checklist (human reviewer)

Run these on the Neon branch BEFORE promoting to `main`:

- [ ] Branch created: `rls-consolidation-20260422` off `main`
- [ ] `0004_consolidate_user_id_to_uuid.sql` applied successfully
- [ ] SELECT `_rls_before_counts._rls_after_counts` report reviewed — every
      row should show `rows_converted ≥ 0` and `email_rows_after_orphaned`
      is either 0 or the listed orphans are expected (e.g. test fixtures,
      stale seed data)
- [ ] Orphan report sampled — for any row still in email form, confirm it
      is safe to leave untouched (or open a follow-up ticket to clean up
      manually). **DO NOT DELETE** without explicit owner sign-off.
- [ ] Spot-check 3 random users: log in as each via the application pointed
      at the branch URL, confirm their goals/notes/journal entries still
      appear
- [ ] `pnpm build` passes locally (note: pre-existing `lib/r2-uploader.ts`
      type error is unrelated to these changes — it was present on `main`
      before 0004)
- [ ] No regressions in CI against the branch URL
- [ ] Reviewer signs off in the PR

For Release N+2 (0005), additionally:

- [ ] Driver rewrite PR merged and deployed for 24h
- [ ] `withUser` helper used in every resolver touching user-scoped tables
- [ ] 2-user cross-session sanity script run on branch — user A cannot read
      user B's rows in notes, goals, family_members, journal_entries, habits
- [ ] Rollback rehearsed — the DOWN section at the bottom of 0005 tested on
      a throwaway branch

---

## Cross-user sanity test (run on branch, for Release N+2)

```sql
-- Replace with two real user UUIDs from neon_auth."user"
\set user_a '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set user_b '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''

BEGIN;
SELECT set_config('app.current_user_id', :user_a, true);
SELECT count(*) AS a_sees_own_goals  FROM goals;           -- expect > 0
SELECT count(*) AS a_sees_b_goals    FROM goals WHERE user_id = :user_b;  -- expect 0
COMMIT;

BEGIN;
SELECT set_config('app.current_user_id', :user_b, true);
SELECT count(*) AS b_sees_own_goals  FROM goals;           -- expect > 0
SELECT count(*) AS b_sees_a_goals    FROM goals WHERE user_id = :user_a;  -- expect 0
COMMIT;

-- Shares (family_members)
BEGIN;
SELECT set_config('app.current_user_id',    :user_a, true);
SELECT set_config('app.current_user_email', '<user_a_email>', true);
SELECT count(*) FROM family_members;                        -- owned + shared
COMMIT;
```

Expected: each user sees their own rows only, except for explicit shares.

---

## Rollback

### If 0004 goes wrong on the branch

The branch is disposable. Delete it:
```
mcp__Neon__delete_branch({ projectId: "wandering-dew-31821015", branchId: "$BRANCH_ID" })
```
…and create a fresh branch for the retry. `main` was never touched.

### If 0004 is on main and needs to be reversed

There is no automatic reverse — the backfill replaces email with UUID and
the original emails are only still recoverable via `neon_auth."user".email`
(where `id::text = goals.user_id`). The *down* sequence is therefore:

```sql
BEGIN;
-- Reconstruct email from the UUID via neon_auth.user
UPDATE goals g
  SET user_id = u.email
  FROM neon_auth."user" u
  WHERE g.user_id = u.id::text;
-- Repeat for every table in 0004.
COMMIT;
```

This is safe AS LONG AS no new rows were inserted with the UUID-only schema
between apply and rollback — there's no way to know the original email for
a row created after the UUID flip. Practically: if you roll back more than
a few minutes after apply, you lose per-user attribution on any row
inserted in the window.

### If 0005 (RLS) is on main and needs to be reversed

Use the commented DOWN block at the bottom of
`0005_enable_row_level_security.sql`. Disabling RLS is a single
`ALTER TABLE … DISABLE ROW LEVEL SECURITY` per table plus dropping the
`app_current_user_id` / `app_current_user_email` helper functions. No data
changes.

---

## Orphans — how to investigate

An orphan is a row where `user_id LIKE '%@%'` AFTER the backfill — i.e. the
email is not present in `neon_auth."user"`. Likely causes:

1. User account deleted from Neon Auth but their data still exists in
   `public.*`. Owner decision needed: delete the data, move to a
   "deleted-users" tenant, or manually assign to an admin UUID.
2. Seed / test fixtures. Safe to leave alone on staging; remove before any
   production promotion.
3. Typo / case-drift in a legacy email. Check with `LOWER(TRIM(...))`
   equality. If matched, update manually.

0004 emits a `SELECT … LIMIT 50` for `notes`, `goals`, `family_members` at
the end. Expand the list to all 26 tables for an exhaustive audit if the
spot-check returns results.

---

## How to promote (branch → main)

Once the pre-promotion checklist is green:

```
# Generate a migration handoff record
mcp__Neon__prepare_database_migration({
  projectId: "wandering-dew-31821015",
  branchId:  "$BRANCH_ID",
  targetBranchId: "<main branch id>",
  migrationSql: <contents of 0004_consolidate_user_id_to_uuid.sql>
})

# Review the preview output, then:
mcp__Neon__complete_database_migration({
  projectId: "wandering-dew-31821015",
  migrationId: "<id returned by prepare>"
})
```

Do NOT run `mcp__Neon__run_sql` with the migration SQL directly against
`main` — the prepare/complete dance gives you a reviewable diff + an
audit trail.

Keep the child branch alive for 24-48h post-promotion in case of rollback.

---

## What is explicitly out of scope for this PR

- RLS enablement (0005). Written but not applied. Needs driver rewrite.
- Team 1's 5 resolvers. Untouched by agreement.
- The 68 `user_id` resolvers already using `ctx.userId`. No change needed
  — they already query the right column; their values are UUIDs going in
  and UUIDs coming out after 0004.
- Backend Python graphs in `backend/`. They receive `user_email` as a
  payload key and use it as `user_id` in SQL. After 0004, the value held
  in that key is a UUID; the graphs continue to work because the key name
  is opaque to Postgres. Renaming the payload key to `user_id` is a
  follow-up refactor.
- `.env.local` `NEON_API_KEY`. Would let the agent drive Neon branch
  management directly in the future. Adding it is an ops task, not a code
  change.
