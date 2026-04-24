# Migrations cleanup plan (Team H triage)

Status: read-only audit, **no DB or filesystem changes were made**. This document is the proposed cleanup; all destructive steps require explicit approval before execution.

- Database: Neon `twilight-pond-00008257` / `neondb`
- Disk migrations directory: `apps/lead-gen/migrations/` (97 `.sql` files + `meta/_journal.json`)
- Drizzle hash algorithm: `sha256(file_content_utf8).hex` — confirmed in `node_modules/.pnpm/drizzle-orm@0.45.1*/node_modules/drizzle-orm/migrator.js:23`

---

## Counts at a glance

| Classification | Count | Meaning |
|---|---:|---|
| `applied-journaled` | 17 | In `_journal.json` (idx 0–16) AND DDL effects present in DB. Healthy. |
| `applied-silent` | 27 | DDL effects present in DB but file is NOT in journal — was applied via raw SQL / `drizzle-kit push` / hand. Needs to be back-registered. |
| `needs-application` | 7 | Valid Postgres syntax, DDL effects MISSING from DB. Wanted in schema; must be applied. |
| `dead-skip` | 46 | SQLite-flavor leftovers (backticks / `datetime('now')` / `AUTOINCREMENT` / `INSERT OR IGNORE`). Never executed against Neon. Safe to delete. |
| `broken-syntax` | 0 | None. |
| `unknown` | 0 | None. |
| **Total** | **97** | |

The journal idx ends at 16; `__drizzle_migrations` has 12 rows but only 11 are intact (id=11 is corrupt: stores tag string in the `hash` column).

---

## 1. Summary table

`sha256` is truncated to first 12 chars for readability — full hashes are in **section 4 (registration SQL)**.

| File | sha256 | Class | Action | Evidence |
|---|---|---|---|---|
| `0000_baseline.sql` | `9229d307d69d…` | applied-journaled | keep | in `_journal.json` + DDL effects present |
| `0000_bouncy_enchantress.sql` | `7223a82ed895…` | dead-skip | git rm | SQLite-flavor (backticks, `INTEGER PRIMARY KEY AUTOINCREMENT`, `datetime('now')`) — never applied to PG |
| `0001_lively_wallop.sql` | `2887719711fc…` | applied-journaled | keep | journal + DB |
| `0001_nebulous_lady_mastermind.sql` | `617a5d204ef5…` | dead-skip | git rm | SQLite-flavor backticks |
| `0002_add_role_tagging_columns.sql` | `8b0bac622058…` | dead-skip | git rm | adds `jobs.role_frontend_react` etc — column NOT in DB |
| `0002_ordinary_molten_man.sql` | `3cca9b4f4fdf…` | applied-journaled | keep | journal + DB |
| `0003_add_application_tracking_fields.sql` | `49986ae72a8d…` | dead-skip | git rm | SQLite flavor; `applications.notes` came in via baseline |
| `0003_reflective_black_bolt.sql` | `27ea88924ad8…` | dead-skip | git rm | SQLite backticks |
| `0003_wealthy_ghost_rider.sql` | `a3a2d3078713…` | applied-journaled | keep | journal + DB |
| `0004_backfill_is_remote_eu.sql` | `c40e2d06af72…` | dead-skip | git rm | SQLite-only `UPDATE`, `is_remote_eu` already populated |
| `0004_nifty_northstar.sql` | `a0e9bd39660c…` | dead-skip | git rm | SQLite backticks |
| `0004_vengeful_vermin.sql` | `d2ba061813ac…` | applied-journaled | keep | journal + DB |
| `0005_add_jobs_indexes.sql` | `24534b6ee1eb…` | dead-skip | git rm | SQLite backticks; `idx_jobs_posted_at_created_at` already exists |
| `0005_flashy_mathemanic.sql` | `6ada295bcbd1…` | applied-journaled | keep | journal + DB |
| `0006_perpetual_edwin_jarvis.sql` | `6059936c7e17…` | applied-journaled | keep | journal + DB |
| `0006_reported_jobs.sql` | `d5aeee5aeb06…` | dead-skip | git rm | SQLite backticks; `job_report_events` came in via baseline |
| `0007_add_jobs_unique_constraint.sql` | `eb6c6e350a19…` | dead-skip | git rm | SQLite backticks |
| `0007_outgoing_susan_delgado.sql` | `2f8ef6e9a230…` | applied-journaled | keep | journal + DB |
| `0008_add_application_tracks.sql` | `484bcdc4bd2c…` | dead-skip | git rm | SQLite backticks |
| `0008_normal_odin.sql` | `d87ded919284…` | applied-journaled | keep | journal + DB |
| `0009_add_ai_interview_prep.sql` | `bdae724f3cc4…` | dead-skip | git rm | SQLite backticks |
| `0009_blue_fantastic_four.sql` | `b03389b29c9b…` | applied-silent | register | `company_similarities`, `extracted_entities`, `feature_drift` tables exist |
| `0009_spicy_chat.sql` | `78233c2619b1…` | applied-journaled | keep | journal + DB |
| `0010_amused_moonstone.sql` | `0ed8323274f0…` | applied-journaled | keep | journal + DB |
| `0011_add_resumes_skill_profile.sql` | `4322fc006b80…` | dead-skip | git rm | SQLite backticks |
| `0011_bizarre_greymalkin.sql` | `c12130f75556…` | applied-journaled | keep | journal + DB |
| `0012_add_contacts.sql` | `7d48c30be8ae…` | dead-skip | git rm | SQLite backticks; contacts came via baseline |
| `0012_aspiring_mysterio.sql` | `462ca947302b…` | applied-journaled | keep | journal + DB |
| `0013_add_consecutive_errors_to_job_sources.sql` | `92466093dbb6…` | dead-skip | git rm | SQLite-only `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `0013_misty_bloodstorm.sql` | `9332e764b8cb…` | applied-journaled | keep | journal + DB (DB row corrupt; see §4) |
| `0014_add_remotive_arbeitnow_sources.sql` | `17a234ea76b2…` | dead-skip | git rm | SQLite-only `INSERT OR IGNORE` |
| `0014_parched_lake.sql` | `cff36c6993df…` | applied-journaled | keep | journal + DB |
| `0015_absurd_makkari.sql` | `542e8b92d65c…` | applied-journaled | keep | journal + DB |
| `0015_add_remoteok_himalayas_jobicy_sources.sql` | `6cb3f630e4cd…` | dead-skip | git rm | SQLite-only `INSERT OR IGNORE` |
| `0016_add_bounced_emails_to_contacts.sql` | `f2f496e4fbe5…` | dead-skip | git rm | SQLite backticks; `bounced_emails` came via baseline |
| `0016_ambiguous_liz_osborn.sql` | `ae43f0915244…` | applied-journaled | keep | journal + DB |
| `0017_add_job_description_to_applications.sql` | `9968c24de224…` | dead-skip | git rm | SQLite backticks |
| `0018_job_sources_unique_constraint.sql` | `ef6d54845cf3…` | dead-skip | git rm | SQLite-only flavor; index already exists in DB |
| `0019_add_company_linkedin_job_board_url.sql` | `35e33ab3561b…` | dead-skip | git rm | SQLite backticks; column not in DB and not in current schema |
| `0020_add_ai_interview_questions_to_applications.sql` | `5f397c8556d8…` | dead-skip | git rm | SQLite-only; column came in via baseline |
| `0021_restore_classification_columns.sql` | `572821b1ddb6…` | dead-skip | git rm | SQLite backticks |
| `0022_add_study_topics.sql` | `0d8e75119336…` | dead-skip | git rm | `study_topics` table NEVER existed in PG; SQLite-only |
| `0023_seed_react_hooks.sql` | `4ff7e6a4d19b…` | dead-skip | git rm | seeds non-existent `study_topics` |
| `0024_add_study_concept_explanations.sql` | `e639bd5bedf8…` | dead-skip | git rm | `study_topics` non-existent |
| `0025_add_contact_emails.sql` | `c58cd39a0e17…` | dead-skip | git rm | SQLite-flavor; `contact_emails` came via baseline |
| `0026_add_opportunities.sql` | `961f8a36296b…` | dead-skip | git rm | SQLite backticks; `opportunities` table came via baseline |
| `0027_add_ai_agentic_coding.sql` | `d59e4aa2108f…` | dead-skip | git rm | `applications.ai_agentic_coding` NOT in DB |
| `0028_add_ai_native_company_classification.sql` | `bbb39309d969…` | dead-skip | git rm | replaced by `companies.ai_tier` (came via baseline w/ different shape) |
| `0029_seed_react_auth_jwt.sql` | `a88007f9230a…` | dead-skip | git rm | seeds non-existent `study_topics` |
| `0030_add_is_hidden_to_companies.sql` | `0ebe18c70cd1…` | dead-skip | git rm | `companies.is_hidden` NOT in DB (and 0036 attempted to remove) |
| `0031_add_ai_deep_research.sql` | `aa0f99ef5033…` | dead-skip | git rm | `applications.ai_deep_research` NOT in DB |
| `0031_add_deep_analysis.sql` | `6ad60d543f15…` | dead-skip | git rm | SQLite-flavor; `companies.deep_analysis` already present via baseline |
| `0032_add_crm_tables.sql` | `7a636a274599…` | dead-skip | git rm | duplicates baseline CRM ALTERs |
| `0032_add_learning_teams.sql` | `df8ecee6bdb2…` | dead-skip | git rm | `learning_sessions` NOT in DB |
| `0032_knowledge_squad_columns.sql` | `c706ba840c99…` | dead-skip | git rm | `jobs.salary_min` already in DB via baseline |
| `0033_add_email_scheduling_columns.sql` | `f232fd160fb3…` | dead-skip | git rm | columns already exist via baseline |
| `0034_add_received_emails.sql` | `cdd51f30c02b…` | dead-skip | git rm | SQLite backticks; `received_emails` came via baseline |
| `0035_add_crm_port_columns.sql` | `eaf142b2d4c4…` | dead-skip | git rm | columns already present via baseline |
| `0036_remove_is_hidden_companies.sql` | `87c504928862…` | dead-skip | git rm | `is_hidden` never existed in PG |
| `0037_add_better_auth_tables.sql` | `2ab953fec71f…` | dead-skip | git rm | `user`/`account`/`session`/`verification` came via baseline |
| `0038_add_pipeline_tables_neon.sql` | `c08055635d59…` | dead-skip | git rm | `greenhouse_boards`/`ats_boards` NOT in DB |
| `0039_remove_jobs_tables.sql` | `f87581a01f10…` | dead-skip | git rm | `job_report_events` STILL exists in DB; never executed |
| `0040_remove_ats.sql` | `1eb949294eef…` | dead-skip | git rm | `ats_boards` never existed in PG |
| `0041_add_github_handle_index.sql` | `1700fdc6d707…` | dead-skip | git rm | `idx_contacts_github_handle` already present in DB |
| `0042_add_contact_ml_fields.sql` | `d73d367bb3e6…` | applied-silent | register | `contacts.seniority`, ML cols all present |
| `0043_add_reminders_and_touch_score.sql` | `7b3c4f8d1499…` | applied-silent | register | `contacts.next_touch_score` present |
| `0044_add_authenticity_fields.sql` | `b2afd61d921f…` | applied-silent | register | `contacts.authenticity_score` present |
| `0044_generic_reminders_table.sql` | `5dcc37461164…` | applied-silent | register | `reminders` table renamed; `contact_reminders` gone; `entity_type` col present |
| `0045_add_voyager_api_tables.sql` | `760fdba85313…` | needs-application | apply | `voyager_sessions`/`voyager_job_counts` MISSING; `linkedin_posts.voyager_urn` MISSING |
| `0046_add_webhook_events.sql` | `941d6fa30fc4…` | applied-silent | register | `webhook_events` table present |
| `0047_add_forwarding_alias.sql` | `e19b89cb5a37…` | applied-silent | register | `contacts.forwarding_alias` present |
| `0048_add_competitor_analysis.sql` | `5e0334af3339…` | applied-silent | register | `competitor_analyses`, `competitors`, `competitor_features`, `competitor_pricing_tiers`, `competitor_integrations` all present |
| `0049_add_rls_tenant.sql` | `606cc82b2f20…` | applied-silent | register | `companies.tenant_id` etc present, 27 RLS policies present |
| `0050_add_products.sql` | `4aef03c80ff1…` | applied-silent | register | `products` table present, FK to `competitor_analyses` present |
| `0050_rls_app_role.sql` | `877810bae77c…` | applied-silent | register | `app_tenant` role present in `pg_roles` |
| `0051_add_product_highlights.sql` | `a67898422a4d…` | applied-silent | register | `products.highlights` present |
| `0052_add_contact_lora_fields.sql` | `a6f61adcc5ba…` | applied-silent | register | `contacts.lora_tier` present |
| `0053_add_product_icp.sql` | `f8c4855149f4…` | applied-silent | register | `products.icp_analysis` + `icp_analyzed_at` present |
| `0054_add_contact_papers.sql` | `cfe279c8e4b0…` | applied-silent | register | `contacts.papers` + `papers_enriched_at` present |
| `0055_add_contact_linkedin_profile.sql` | `09b7bc2c1037…` | applied-silent | register | `contacts.linkedin_profile` present |
| `0056_add_contact_openalex_profile.sql` | `e7b26efc3c9a…` | applied-silent | register | `contacts.openalex_profile` present |
| `0057_add_product_intel_columns.sql` | `cf2313a0ebbe…` | applied-silent | register | `products.{pricing,gtm,intel}_analysis` all present |
| `0058_add_product_intel_runs.sql` | `204ed343f68e…` | applied-silent | register | `product_intel_runs` table present (text PK) |
| `0059_public_intel_reads.sql` | `feccaf9a5b3d…` | applied-silent | register | `products.slug` + `public_read` policy present |
| `0060_add_product_published_at.sql` | `2f278559daae…` | applied-silent | register | `products.published_at` present |
| `0061_product_intel_run_secrets.sql` | `382d090980d8…` | applied-silent | register | `product_intel_run_secrets` table + nullable `webhook_secret` |
| `0062_add_competitor_deep_analysis.sql` | `d751c5b403f2…` | needs-application | apply | `competitor_changelog`, `competitor_funding_events`, `competitor_positioning_snapshots`, `competitor_feature_parity` all MISSING |
| `0063_add_product_intel_runs_progress.sql` | `3c1dd1f5077b…` | needs-application | apply | `product_intel_runs.progress` MISSING |
| `0064_add_product_positioning_analysis.sql` | `f684f67cbc1f…` | applied-silent | register | `products.positioning_analysis` present |
| `0065_add_freshness_tracking.sql` | `3ece7588bbb7…` | applied-silent | register | `products.freshness_snapshot` + `competitors.last_url_hash` present |
| `0066_add_product_intel_runs_total_cost.sql` | `f3d97c9e0041…` | needs-application | apply | `product_intel_runs.total_cost_usd` + `idx_intel_runs_cost` MISSING |
| `0067_add_product_signals.sql` | `87a5fde6a8b5…` | applied-silent | register | `company_product_signals` + `uq_company_product_signals_pair` present |
| `0068_seed_ingestible_email_templates.sql` | `93491bfa2cf0…` | applied-silent | register | 9 outreach rows in `email_templates` (ingestible/archreview/onboardingtutor × day0/4/13) |
| `0069_add_contact_gh_match.sql` | `a664310083bc…` | applied-silent | register | `contacts.gh_match_score` present |
| `0070_add_product_intel_runs_schema_version.sql` | `e1eb06ac61d5…` | needs-application | apply | `product_intel_runs.schema_version` MISSING |
| `0071_add_outreach_product_awareness.sql` | `42a92e194549…` | needs-application | apply | `email_campaigns.product_id`, `contact_persona_scores` table MISSING — **prefix collision with 0071_intent_signals_product_aware.sql** |
| `0071_intent_signals_product_aware.sql` | `8a279a3d301c…` | needs-application | apply | `intent_signals.competitor_id`, `intent_signal_products` table MISSING — **prefix collision** |

### State of `drizzle.__drizzle_migrations`

| id | hash | tag (mapped) | status |
|---:|---|---|---|
| 1 | `9229d307…` | `0000_baseline` | OK |
| 2 | `28877197…` | `0001_lively_wallop` | OK |
| 3 | `3cca9b4f…` | `0002_ordinary_molten_man` | OK |
| 4 | `a3a2d307…` | `0003_wealthy_ghost_rider` | OK |
| 5 | `d2ba0618…` | `0004_vengeful_vermin` | OK |
| 6 | `6ada295b…` | `0005_flashy_mathemanic` | OK |
| 7 | `6059936c…` | `0006_perpetual_edwin_jarvis` | OK |
| 8 | `2f8ef6e9…` | `0007_outgoing_susan_delgado` | OK |
| **9** | **(missing)** | should be `0008_normal_odin` | **GAP** |
| 10 | `b03389b2…` | hash for `0009_blue_fantastic_four` (NOT a journaled file) | **WRONG ROW** |
| 11 | `"0013_misty_bloodstorm"` (literal) | should be `0009_spicy_chat` or similar | **CORRUPT** (tag string in hash column) |
| 12 | `542e8b92…` | `0015_absurd_makkari` | OK |
| 13 | `ae43f091…` | `0016_ambiguous_liz_osborn` | OK |

Effective journal coverage in DB: 9 of the 17 journaled files have a correct hash row. The remaining 8 (`0008_normal_odin` … `0014_parched_lake`) are missing or wrong, plus the corrupt id=11.

---

## 2. Recommended sequence

### Phase A — quarantine the dead files (file ops)

```bash
cd apps/lead-gen

git rm \
  migrations/0000_bouncy_enchantress.sql \
  migrations/0001_nebulous_lady_mastermind.sql \
  migrations/0002_add_role_tagging_columns.sql \
  migrations/0003_add_application_tracking_fields.sql \
  migrations/0003_reflective_black_bolt.sql \
  migrations/0004_backfill_is_remote_eu.sql \
  migrations/0004_nifty_northstar.sql \
  migrations/0005_add_jobs_indexes.sql \
  migrations/0006_reported_jobs.sql \
  migrations/0007_add_jobs_unique_constraint.sql \
  migrations/0008_add_application_tracks.sql \
  migrations/0009_add_ai_interview_prep.sql \
  migrations/0011_add_resumes_skill_profile.sql \
  migrations/0012_add_contacts.sql \
  migrations/0013_add_consecutive_errors_to_job_sources.sql \
  migrations/0014_add_remotive_arbeitnow_sources.sql \
  migrations/0015_add_remoteok_himalayas_jobicy_sources.sql \
  migrations/0016_add_bounced_emails_to_contacts.sql \
  migrations/0017_add_job_description_to_applications.sql \
  migrations/0018_job_sources_unique_constraint.sql \
  migrations/0019_add_company_linkedin_job_board_url.sql \
  migrations/0020_add_ai_interview_questions_to_applications.sql \
  migrations/0021_restore_classification_columns.sql \
  migrations/0022_add_study_topics.sql \
  migrations/0023_seed_react_hooks.sql \
  migrations/0024_add_study_concept_explanations.sql \
  migrations/0025_add_contact_emails.sql \
  migrations/0026_add_opportunities.sql \
  migrations/0027_add_ai_agentic_coding.sql \
  migrations/0028_add_ai_native_company_classification.sql \
  migrations/0029_seed_react_auth_jwt.sql \
  migrations/0030_add_is_hidden_to_companies.sql \
  migrations/0031_add_ai_deep_research.sql \
  migrations/0031_add_deep_analysis.sql \
  migrations/0032_add_crm_tables.sql \
  migrations/0032_add_learning_teams.sql \
  migrations/0032_knowledge_squad_columns.sql \
  migrations/0033_add_email_scheduling_columns.sql \
  migrations/0034_add_received_emails.sql \
  migrations/0035_add_crm_port_columns.sql \
  migrations/0036_remove_is_hidden_companies.sql \
  migrations/0037_add_better_auth_tables.sql \
  migrations/0038_add_pipeline_tables_neon.sql \
  migrations/0039_remove_jobs_tables.sql \
  migrations/0040_remove_ats.sql \
  migrations/0041_add_github_handle_index.sql
```

This removes **46 SQLite-era files**. After this, the only remaining filename collisions are:

- `0009`: `0009_blue_fantastic_four.sql` (silent-applied) — **remove `_blue_fantastic_four` collision** by renaming the silent-applied file to `0017_blue_fantastic_four.sql` (next free idx = 17). See Phase B.
- `0044`: `0044_add_authenticity_fields.sql` + `0044_generic_reminders_table.sql` — both silent-applied; renumber to keep both. Pick one to renumber to a new free idx.
- `0050`: `0050_add_products.sql` + `0050_rls_app_role.sql` — both silent-applied; renumber.
- `0071`: `0071_add_outreach_product_awareness.sql` + `0071_intent_signals_product_aware.sql` — both needs-application; renumber.

### Phase B — renumber prefix-colliding files

The new contiguous index sequence after deletion will be 0–16 (the original journaled set, untouched), then we slot in the silent-applied + needs-application files at new indices ≥ 17, in chronological order of when they were authored.

Suggested renames (mtime-ordered):

| Old name | New name | Why |
|---|---|---|
| `0009_blue_fantastic_four.sql` | `0017_blue_fantastic_four.sql` | first silent-applied file outside journal |
| `0042_add_contact_ml_fields.sql` | `0018_add_contact_ml_fields.sql` | |
| `0043_add_reminders_and_touch_score.sql` | `0019_add_reminders_and_touch_score.sql` | |
| `0044_add_authenticity_fields.sql` | `0020_add_authenticity_fields.sql` | resolves 0044 collision |
| `0044_generic_reminders_table.sql` | `0021_generic_reminders_table.sql` | resolves 0044 collision |
| `0045_add_voyager_api_tables.sql` | `0022_add_voyager_api_tables.sql` | needs-application |
| `0046_add_webhook_events.sql` | `0023_add_webhook_events.sql` | |
| `0047_add_forwarding_alias.sql` | `0024_add_forwarding_alias.sql` | |
| `0048_add_competitor_analysis.sql` | `0025_add_competitor_analysis.sql` | |
| `0049_add_rls_tenant.sql` | `0026_add_rls_tenant.sql` | |
| `0050_add_products.sql` | `0027_add_products.sql` | resolves 0050 collision |
| `0050_rls_app_role.sql` | `0028_rls_app_role.sql` | resolves 0050 collision |
| `0051_add_product_highlights.sql` | `0029_add_product_highlights.sql` | |
| `0052_add_contact_lora_fields.sql` | `0030_add_contact_lora_fields.sql` | |
| `0053_add_product_icp.sql` | `0031_add_product_icp.sql` | |
| `0054_add_contact_papers.sql` | `0032_add_contact_papers.sql` | |
| `0055_add_contact_linkedin_profile.sql` | `0033_add_contact_linkedin_profile.sql` | |
| `0056_add_contact_openalex_profile.sql` | `0034_add_contact_openalex_profile.sql` | |
| `0057_add_product_intel_columns.sql` | `0035_add_product_intel_columns.sql` | |
| `0058_add_product_intel_runs.sql` | `0036_add_product_intel_runs.sql` | |
| `0059_public_intel_reads.sql` | `0037_public_intel_reads.sql` | |
| `0060_add_product_published_at.sql` | `0038_add_product_published_at.sql` | |
| `0061_product_intel_run_secrets.sql` | `0039_product_intel_run_secrets.sql` | |
| `0062_add_competitor_deep_analysis.sql` | `0040_add_competitor_deep_analysis.sql` | needs-application |
| `0063_add_product_intel_runs_progress.sql` | `0041_add_product_intel_runs_progress.sql` | needs-application |
| `0064_add_product_positioning_analysis.sql` | `0042_add_product_positioning_analysis.sql` | |
| `0065_add_freshness_tracking.sql` | `0043_add_freshness_tracking.sql` | |
| `0066_add_product_intel_runs_total_cost.sql` | `0044_add_product_intel_runs_total_cost.sql` | needs-application |
| `0067_add_product_signals.sql` | `0045_add_product_signals.sql` | |
| `0068_seed_ingestible_email_templates.sql` | `0046_seed_ingestible_email_templates.sql` | |
| `0069_add_contact_gh_match.sql` | `0047_add_contact_gh_match.sql` | |
| `0070_add_product_intel_runs_schema_version.sql` | `0048_add_product_intel_runs_schema_version.sql` | needs-application |
| `0071_add_outreach_product_awareness.sql` | `0049_add_outreach_product_awareness.sql` | resolves 0071 collision; needs-application |
| `0071_intent_signals_product_aware.sql` | `0050_intent_signals_product_aware.sql` | resolves 0071 collision; needs-application |

> **Important**: renaming a file does NOT change its sha256 (Drizzle hashes file bytes, not the filename). Hashes shown in §1 stay valid after renames.

### Phase C — fix `drizzle.__drizzle_migrations` (DB)

Run as a single transaction (recommended via Neon Console SQL Editor, NOT via app code):

```sql
BEGIN;

-- 1) Delete the corrupt row (id=11 stores a tag string in `hash`).
DELETE FROM drizzle.__drizzle_migrations WHERE id = 11;

-- 2) Delete the misplaced row (id=10 holds the hash of 0009_blue_fantastic_four
--    but no matching journal entry; we'll re-insert it with the right slot).
DELETE FROM drizzle.__drizzle_migrations WHERE id = 10;

-- 3) Insert the missing journaled hashes (idx 8..14) with the correct sha256
--    (Drizzle expects exactly these hashes once the journal is rewritten).
INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
  ('d87ded919284e32cdcca0fdd6149ca4540561045fd4ae7e9abf67b468fdfa48e', 1775123371995),  -- 0008_normal_odin
  ('78233c2619b1783564179d57978ef4b3750712d67758a0f157a591ca3a08cdd5', 1775731430206),  -- 0009_spicy_chat
  ('0ed8323274f04bfb1a1ab3831bb656955cee0f7c57865699bcc1056d235bda81', 1775887876965),  -- 0010_amused_moonstone
  ('c12130f7555658304495d63c5a501214321d86c70fd9b5eeac0f9c3501047d6b', 1775889539559),  -- 0011_bizarre_greymalkin
  ('462ca947302ba971663c158161e371f317dfd2e1d0862bdcbfab481afaba242b', 1775900101594),  -- 0012_aspiring_mysterio
  ('9332e764b8cbd9708a62d59c1376f81dd59698733be812ca774d8d3802374cd3', 1775900214916),  -- 0013_misty_bloodstorm
  ('cff36c6993dfe532c924dd3006dbc5f5d8606c000087ada86ebf1ebaf9c3d750', 1776061366232);  -- 0014_parched_lake

COMMIT;
```

Verify: `SELECT id, left(hash, 16) AS hash16, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;` should show exactly 17 rows in chronological order, hashes matching journaled files (0000 through 0016).

### Phase D — register the silent-applied files (DB)

After Phase B renames, the following 27 files become indices 17–47 (with gaps at the needs-application slots). Insert one row per silent-applied file:

```sql
BEGIN;

INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES
  ('b03389b29c9b9fe188a457030ed88eb87bd9b767d5216bc3c6e31775f1f08782', 1775750000000),  -- 0017_blue_fantastic_four (was 0009)
  ('d73d367bb3e6...FULL_HASH...',    extract(epoch from now()) * 1000),                  -- 0018_add_contact_ml_fields (was 0042)
  -- ...etc, one row per silent-applied file in renumbered order.
  -- Use the full sha256 from the table in §1 — the prefixes shown there
  -- are truncated to 12 chars, full hashes are emitted by the helper script
  -- below (run BEFORE this INSERT so you have them on hand).
  ;

COMMIT;
```

Helper to print the full INSERT body (run from `apps/lead-gen/`):

```bash
python3 - <<'PY'
import hashlib, os
order = [
    "0009_blue_fantastic_four.sql",
    "0042_add_contact_ml_fields.sql",
    "0043_add_reminders_and_touch_score.sql",
    "0044_add_authenticity_fields.sql",
    "0044_generic_reminders_table.sql",
    "0046_add_webhook_events.sql",
    "0047_add_forwarding_alias.sql",
    "0048_add_competitor_analysis.sql",
    "0049_add_rls_tenant.sql",
    "0050_add_products.sql",
    "0050_rls_app_role.sql",
    "0051_add_product_highlights.sql",
    "0052_add_contact_lora_fields.sql",
    "0053_add_product_icp.sql",
    "0054_add_contact_papers.sql",
    "0055_add_contact_linkedin_profile.sql",
    "0056_add_contact_openalex_profile.sql",
    "0057_add_product_intel_columns.sql",
    "0058_add_product_intel_runs.sql",
    "0059_public_intel_reads.sql",
    "0060_add_product_published_at.sql",
    "0061_product_intel_run_secrets.sql",
    "0064_add_product_positioning_analysis.sql",
    "0065_add_freshness_tracking.sql",
    "0067_add_product_signals.sql",
    "0068_seed_ingestible_email_templates.sql",
    "0069_add_contact_gh_match.sql",
]
ts0 = 1776200000000
for i, f in enumerate(order):
    with open(f"migrations/{f}", "rb") as fh:
        h = hashlib.sha256(fh.read()).hexdigest()
    print(f"  ('{h}', {ts0 + i * 1000}),  -- {f}")
PY
```

### Phase E — apply the 7 needs-application files

Apply each file via raw SQL in the Neon SQL Editor (or via `psql $NEON_DATABASE_URL -f migrations/<file>`), in this order:

1. `0045_add_voyager_api_tables.sql` (renamed `0022_…`)
2. `0062_add_competitor_deep_analysis.sql` (renamed `0040_…`)
3. `0063_add_product_intel_runs_progress.sql` (renamed `0041_…`)
4. `0066_add_product_intel_runs_total_cost.sql` (renamed `0044_…`)
5. `0070_add_product_intel_runs_schema_version.sql` (renamed `0048_…`)
6. `0071_add_outreach_product_awareness.sql` (renamed `0049_…`)
7. `0071_intent_signals_product_aware.sql` (renamed `0050_…`)

After each successful apply, register the hash:

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('<full sha256 of the file>', extract(epoch from now()) * 1000);
```

(Use the same Python helper above to compute the hash for each file.)

### Phase F — rewrite `_journal.json`

Replace `migrations/meta/_journal.json` so it lists exactly the 17 journaled + 27 silent-applied + 7 newly-applied files in renumbered order (0000…0050). Pseudo-content (just the entries — keep the existing `version`/`dialect` keys at the top):

```jsonc
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    { "idx": 0,  "version": "7", "when": 1773836641790, "tag": "0000_baseline",                "breakpoints": true },
    // … original 16 entries (already in file) …
    { "idx": 16, "version": "7", "when": 1776189655966, "tag": "0016_ambiguous_liz_osborn",    "breakpoints": true },
    { "idx": 17, "version": "7", "when": 1775750000000, "tag": "0017_blue_fantastic_four",     "breakpoints": true },
    { "idx": 18, "version": "7", "when": <ts>,          "tag": "0018_add_contact_ml_fields",    "breakpoints": true },
    // … one entry per renumbered file, in order, ending at idx 50 …
    { "idx": 50, "version": "7", "when": <ts>,          "tag": "0050_intent_signals_product_aware", "breakpoints": true }
  ]
}
```

`when` for each new entry: use the Unix-ms timestamp of the original file's last commit (or the current time — Drizzle only requires monotonic order).

### Phase G — verify

```bash
cd apps/lead-gen
pnpm db:migrate    # MUST report "0 to apply"
```

If it reports anything other than 0, abort and roll back the INSERTs in Phase D/E (they are easy to identify by `created_at >= 1776200000000`).

---

## 3. Risks

1. **Hash mismatch on rename.** Drizzle hashes the **file contents**, not the filename — so renames are safe. But if anyone has accidentally edited the bytes of a silent-applied file since it was applied, the recomputed hash won't match what we register. Mitigation: before Phase D, re-grep DB tables/columns the file mentions, confirming the DDL effects are present. If a file mentions a column that was added but ALSO has a comment that's been edited — the bytes differ but DB state matches — register the current sha256 anyway, because that's what Drizzle will see on the next compare.
2. **`0044_generic_reminders_table.sql` is destructive on re-run.** It does `ALTER TABLE contact_reminders RENAME TO reminders`. If we ever roll back (drop the journal row + re-apply), it will fail because `contact_reminders` no longer exists. Mitigation: never re-run this migration; only register its hash. Same applies to `0036_remove_is_hidden_companies.sql` (already classified dead-skip) and `0061_product_intel_run_secrets.sql` (the `webhook_secret DROP NOT NULL` is idempotent).
3. **`0050_add_products.sql` drops `seed_product_url`/`seed_product_name`.** Same as risk #2 — non-idempotent, never re-run, only register.
4. **Out-of-band scripts may still reference the deleted SQLite files.** Grep before deletion: `rg -l '00(00_bouncy_enchantress|01_nebulous|02_add_role_tagging|...)' apps/lead-gen/{scripts,src,backend}` to confirm no script reads these as data fixtures or seed sources.
5. **`__drizzle_migrations.id` is `bigserial`** — the gap at id=9 and removal of id=10/11 will leave non-contiguous ids. That's harmless (Drizzle uses `created_at` order, not id), but if any external script does `SELECT … WHERE id = N`, it could break. Audit: `rg '__drizzle_migrations' apps/lead-gen/{scripts,src,backend}` — there should be zero hits.
6. **Phase E executes 7 fresh DDL migrations on prod.** `0045_add_voyager_api_tables.sql` adds `voyager_*` tables that may already be referenced by removed code (Voyager scraping was deprecated). Confirm whether the LinkedIn Voyager subsystem is still active before applying — if dead, skip both 0045 and reclassify it as `dead-skip`.
7. **`0071_intent_signals_product_aware.sql` adds an FK to `competitors`** — that FK already exists per `0048_add_competitor_analysis.sql` (silent-applied). This should be fine, but verify the FK target table name matches (it's `competitors`, not `competitor_analyses`).

## 4. Out-of-scope

- **Archiving the dead files** instead of `git rm`. The git history retains them, so plain `git rm` is sufficient. If desired, move them to `migrations/archive/` first instead of deleting — this proposal does not.
- **Verifying `research_papers` / `paper_authors`** tables in DB — these exist but no migration on disk creates them. They were likely added via `drizzle-kit push`. Out of scope here; suggest a follow-up audit.
- **Renumbering `_journal.json` `when` timestamps** to be evenly spaced — purely cosmetic; Drizzle only cares about monotonic order.
- **Dropping unused tables** like `crawl_logs`, `messages`, `voyager_*` (if applied then deprecated). Out of scope; needs separate review.
- **Switching from raw SQL to `pnpm db:generate` for the 7 needs-application files**. The files already exist and are correct PG syntax — re-generating from `src/db/schema.ts` would create a new migration with a different idx and risk schema drift. Apply as-is.
- **Adding a CI guard** that fails the build if `migrations/meta/_journal.json` falls out of sync with `migrations/*.sql`. Worth doing as a follow-up but not part of this cleanup.

---

## Estimated execution time

- Phase A (git rm 46 files):  2 min
- Phase B (rename 34 files):  10 min (need to run `git mv` for each)
- Phase C (fix `__drizzle_migrations`):  3 min (single SQL transaction in Neon Console)
- Phase D (register 27 silent hashes):  10 min (compute + paste a single INSERT)
- Phase E (apply 7 needs-application files):  20 min (one at a time, verify after each)
- Phase F (rewrite `_journal.json`):  10 min
- Phase G (verify `pnpm db:migrate`):  2 min

**Total: ~60 min** of focused execution, assuming no surprises.
