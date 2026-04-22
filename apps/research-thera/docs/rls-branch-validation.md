# RLS Branch Validation — Results

> **Neon project:** `wandering-dew-31821015`, db `neondb`
> **Branch:** `rls-consolidation-20260422`, id `br-wandering-bird-a4h7ihom`
> **Parent branch:** `br-bold-tooth-a4aknoiu` (main)
> **Date validated:** 2026-04-22
> **Executed by:** lead (Neon MCP tools available at parent scope)

## Status

- `drizzle/0004_consolidate_user_id_to_uuid.sql` — **applied on branch.** Zero email-form `user_id` remaining across 26 user-scoped tables. Zero email-form `created_by` on `notes`, `note_shares`, `family_member_shares`. 0 orphans.
- `drizzle/0005_enable_row_level_security.sql` — **applied on branch.** RLS + FORCE RLS + `user_isolation` policies on 32 tables. Two helper functions installed: `app_current_user_id()`, `app_current_user_email()`.
- Main Neon branch — **unchanged.**

## Critical finding during validation — `rolbypassrls`

`neondb_owner` (the role the app connects as via `NEON_DATABASE_URL`) has `rolbypassrls = true`. Postgres RLS precedence:

> A role with BYPASSRLS always bypasses row security policies, even with FORCE ROW LEVEL SECURITY on the table.

So `FORCE ROW LEVEL SECURITY` alone is **not sufficient** — the app role must also be `NOBYPASSRLS`. `ALTER ROLE neondb_owner NOBYPASSRLS` fails ("permission denied") because the role is Neon-managed.

### Mitigation — new `app_authenticated` role

Created on the branch:

```sql
CREATE ROLE app_authenticated NOBYPASSRLS NOSUPERUSER LOGIN PASSWORD '…';
GRANT USAGE ON SCHEMA public, neon_auth TO app_authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA neon_auth TO app_authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_authenticated;
GRANT app_authenticated TO neondb_owner;
```

**Production deploy requires one of:**

1. Point the app at a new connection string whose user is `app_authenticated` (e.g. `NEON_APP_DATABASE_URL`) and keep `NEON_DATABASE_URL` as the migrations/DDL role. Update `src/db/neon.ts` to pick the `app_authenticated` URL for GraphQL traffic.
2. Have the driver wrapper issue `SET LOCAL ROLE app_authenticated` as the first statement of every transaction (Team A's `makeSql()` already batches statements; adding `SET LOCAL ROLE …` is a one-liner).

Option 1 is cleaner but requires exposing a password for the new role. Option 2 works with the current single connection.

## Validation results

All queries ran on branch `br-wandering-bird-a4h7ihom`, as `app_authenticated` (NOBYPASSRLS), inside `mcp__Neon__run_sql_transaction` calls.

### Test 1 — No session variable set

```sql
SET LOCAL ROLE app_authenticated;
SELECT COUNT(*) FROM goals;           -- 0
SELECT COUNT(*) FROM family_members;   -- 0
SELECT COUNT(*) FROM notes;            -- 0
```

**Result: 0/0/0 rows.** RLS denies by default. ✅

### Test 2 — Vadim session (`88de14cf-ff9d-4f5b-942d-e7f85b0c1e0c`)

| Table | Observed | Expected | Pass? |
|---|---|---|---|
| goals | 13 | 13 | ✅ |
| family_members | 5 | 5 | ✅ |
| journal_entries | 27 | 27 | ✅ |
| issues | 24 | 24 | ✅ |
| generation_jobs | 101 | 101 | ✅ |
| notes | 1 | 1 | ✅ |
| user_settings | 0 | 0 (no row) | ✅ |

### Test 3 — Elena session (`cf51801f-6d58-4ddb-ba12-527831b4de1b`)

| Table | Observed | Expected | Pass? |
|---|---|---|---|
| goals | 0 | 0 | ✅ |
| family_members | 1 | 1 (shared) | ✅ |
| journal_entries | 0 | 0 | ✅ |
| issues | 0 | 0 | ✅ |
| generation_jobs | 0 | 0 | ✅ |
| notes | 1 | 1 (shared) | ✅ |
| user_settings | 1 | 1 (her own row, DOB 1989-03-05) | ✅ |

Elena sees only rows explicitly shared to her. The shared note (id=4) and shared family_member (id=2) are owned by Vadim — the policy routes her through the share tables, not the owner column.

### Test 4 — IDOR attempt (Elena filtering by Vadim's UUID)

```sql
SELECT COUNT(*) FROM goals WHERE user_id = '88de14cf-…';   -- 0
```

**Result: 0.** RLS hides rows at the row level before the WHERE clause sees them. ✅

### Test 5 — Cross-user WRITE (WITH CHECK)

Elena attempting to insert a goal tagged with Vadim's UUID:

```sql
INSERT INTO goals (user_id, slug, title, ...) VALUES ('88de14cf-…', ...);
```

**Result:** `ERROR: new row violates row-level security policy for table "goals"`. ✅

### Test 6 — Own-user WRITE

Elena inserting with her own UUID → **SUCCESS** (row id=16, deleted after probe).

## Per-request contract for the app

Every GraphQL request handler must emit the following as the first transaction:

```sql
SET LOCAL ROLE app_authenticated;
SELECT set_config('app.current_user_id',    '<ctx.userId>',    true);
SELECT set_config('app.current_user_email', '<ctx.userEmail>', true);
-- ... user queries ...
```

Team A's `src/db/neon.ts` already wraps every query through `userContext.run()` with the two `set_config` calls. Adding `SET LOCAL ROLE app_authenticated` as the first batched statement completes the contract.

## Tables covered (32)

Owner-only (policy = `user_id = app_current_user_id()`):
`affirmations, audio_assets, behavior_observations, contact_feedbacks, contacts, conversations, deep_issue_analyses, discussion_guides, family_member_characteristics, generation_jobs, goals, habit_logs, habits, issue_contacts, issue_links, issue_screenshots, issues, journal_analyses, journal_entries, relationships, stories, tag_language_rules, teacher_feedbacks, user_settings` (24)

Owner-plus-share:
`family_members` (via `family_member_shares.email`), `notes` (via `note_shares.email` + `visibility='PUBLIC'`). (2)

Share tables (owner OR recipient email):
`note_shares, family_member_shares`. (2)

Child tables gated through parent:
`notes_research, notes_claims, text_segments, conversation_messages`. (4)

**Intentionally NOT covered** (gated in app layer via parent goal/note):
`therapy_research, therapeutic_questions, recommended_books, claim_cards`.

## Pre-promotion checklist

Before applying 0004 + 0005 to `main`:

- [ ] Decide role strategy: new `NEON_APP_DATABASE_URL` for `app_authenticated`, or `SET LOCAL ROLE` in driver wrapper.
- [ ] Apply Team C's resolver auth fixes (18 findings in `docs/resolver-auth-audit.md`) — some are critical (mass PII tampering via `updateFamilyMember`, full IDOR on claim-card subsystem).
- [ ] Ensure every background worker / script / workflow that writes to user-scoped tables either wraps in `userContext.run(...)` or connects as the DDL role (not `app_authenticated`).
- [ ] Smoke-test the app against the branch by temporarily pointing `NEON_DATABASE_URL` at the branch URL.
- [ ] Back up main: Neon time-travel restore point before 0004 runs.
- [ ] Apply 0004, then 0005, in a single deploy.
- [ ] Create `app_authenticated` role on main with the same GRANTs.

## Rollback

- On the Neon branch: delete the branch.
- On main (if promoted): run the DOWN block at the bottom of `drizzle/0005_enable_row_level_security.sql` (commented-out for idempotency).
- 0004 is not trivially reversible; we keep no email↔UUID snapshot. `neon_auth."user"` has both, and the app code no longer depends on the legacy format, so rollback is not expected.
