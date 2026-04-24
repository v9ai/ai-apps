-- Ingestible lead-gen vertical signals.
--
-- Adds 5 columns to `companies` that the Ingestible discovery + enrichment
-- pipeline populates to identify token-efficient-document-ingestion buyers.
-- Additive, all nullable/defaulted — existing rows are unchanged, backward-compat.
--
-- Populated by:
--   rag_stack_detected    — GitHub code-search: `from langchain.text_splitter`
--                           / `from llama_index.core.node_parser` — one of
--                           'langchain'|'llamaindex'|'haystack'|'custom'|'none'.
--   token_cost_complaint  — HN Algolia + Reddit JSON mining for employee
--                           complaints re: token cost / context-window cost.
--   on_prem_required      — Greenhouse/Ashby JD regex
--                           `(on[- ]prem|air[- ]gapped|self[- ]hosted).*(RAG|retrieval|LLM)`
--                           OR compliance footprint on /trust, /security pages.
--   ingestion_volume_hint — freeform text extracted from homepage/careers
--                           (e.g. "millions of pages", "10k docs/month").
--   ai_act_exposure       — EU AI Act / GDPR / HIPAA / SOC2 exposure detected
--                           from /trust, /legal, /security, or EU-customer hints.
--
-- A "hot Ingestible lead" is a company with:
--   rag_stack_detected IN ('langchain','llamaindex')
--   AND (on_prem_required = true OR ai_act_exposure = true OR token_cost_complaint = true).

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "rag_stack_detected" text,
  ADD COLUMN IF NOT EXISTS "token_cost_complaint" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "on_prem_required" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "ingestion_volume_hint" text,
  ADD COLUMN IF NOT EXISTS "ai_act_exposure" boolean NOT NULL DEFAULT false;

-- Partial index covering the hot-lead shape: only rows that have ANY RAG
-- signal are included, keeping the index lean on the existing companies table.
CREATE INDEX IF NOT EXISTS idx_companies_ingestible_hot
  ON companies (rag_stack_detected, on_prem_required, ai_act_exposure, token_cost_complaint)
  WHERE rag_stack_detected IS NOT NULL;
