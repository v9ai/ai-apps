-- 2026-04-27 — Surgical perf indexes after agentic-healthcare merge
--
-- 1) HNSW vector indexes on healthcare *_embeddings tables
--    (current `<=>` queries do Seq Scan; fine at ~1.8k rows, breaks above ~100k)
-- 2) Composite (filter, sort DESC) indexes for hot list queries
--    (single-column FK indexes are kept — composites supplement them)
--
-- Notes:
-- - `text` date columns (behavior_observations.observed_at, *_feedbacks.feedback_date)
--   sort lexicographically; works for ISO-8601 strings. No conversion needed.
-- - Applied via Neon MCP (mcp__Neon__run_sql_transaction) so all-or-none.
-- - drizzle-kit migrate is NOT the apply path — record only.

-- ── Tier 1.2: HNSW vector indexes (8 tables) ─────────────────────────
CREATE INDEX IF NOT EXISTS blood_test_embeddings_hnsw
  ON blood_test_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS blood_marker_embeddings_hnsw
  ON blood_marker_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS condition_embeddings_hnsw
  ON condition_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS medication_embeddings_hnsw
  ON medication_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS symptom_embeddings_hnsw
  ON symptom_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS appointment_embeddings_hnsw
  ON appointment_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS health_state_embeddings_hnsw
  ON health_state_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS allergy_embeddings_hnsw
  ON allergy_embeddings USING hnsw (embedding vector_cosine_ops);

-- ── Tier 3: Composite (filter, sort DESC) for hot list queries ────────
CREATE INDEX IF NOT EXISTS appointments_perf_user_date_desc
  ON appointments (user_id, appointment_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS memory_entries_perf_user_logged_desc
  ON memory_entries (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS cognitive_check_ins_perf_protocol_recorded_desc
  ON cognitive_check_ins (protocol_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS medications_perf_user_family_created_desc
  ON medications (user_id, family_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS family_documents_perf_member_user_doc_desc
  ON family_documents (family_member_id, user_id, document_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS medical_letters_perf_doctor_user_letter_desc
  ON medical_letters (doctor_id, user_id, letter_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS behavior_observations_perf_member_user_observed_desc
  ON behavior_observations (family_member_id, user_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS teacher_feedbacks_perf_member_user_feedback_desc
  ON teacher_feedbacks (family_member_id, user_id, feedback_date DESC);
CREATE INDEX IF NOT EXISTS contact_feedbacks_perf_contact_member_user_feedback_desc
  ON contact_feedbacks (contact_id, family_member_id, user_id, feedback_date DESC);
