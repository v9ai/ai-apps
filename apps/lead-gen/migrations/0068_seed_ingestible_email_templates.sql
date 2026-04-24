-- Seed the 3 email templates for the Ingestible outreach sequence.
--
-- Tagged via the JSON `tags` array (no new column) so the sequencer can select
-- by product + step:
--   tags = ["product:ingestible", "sequence:outreach", "step:0"]
--
-- Variables rendered by the outreach graph at send time:
--   {{first_name}}, {{company}}, {{domain}}
--
-- Re-runnable: INSERT ... ON CONFLICT skipped because `name` has no unique
-- constraint; a manual DELETE of `tags @> '["product:ingestible"]'::jsonb` is
-- the documented rollback path.

INSERT INTO email_templates (name, description, subject, text_content, category, tags, variables, is_active)
VALUES
  (
    'ingestible_outreach_day0',
    'Ingestible outreach — day 0 cold email. Leads with the 88-99% token-reduction differentiator and the 4-level chunk hierarchy.',
    '92% fewer tokens on your docs corpus',
    E'Hi {{first_name}},\n\nSaw {{company}} is shipping RAG over {{domain}}. Quick note — most LangChain / LlamaIndex pipelines we see pull 25–40 neighbors per query because flat 512-token chunks lose structure.\n\nIngestible uses a 4-level chunk hierarchy (L0–L3) that drops prompt size 88–99% on real corpora (513-page book = 99%, technical docs = 92%). Self-hosted, Docker, MCP server for Claude Code.\n\nWorth a 15-min look?\n\n— Vadim',
    'outreach',
    '["product:ingestible", "sequence:outreach", "step:0"]',
    '["first_name", "company", "domain"]',
    true
  ),
  (
    'ingestible_outreach_day4',
    'Ingestible outreach — day 4 follow-up. On-prem / compliance angle for the EU-regulated / healthcare / fintech segment.',
    'on-prem, no cloud round-trip',
    E'Forgot to mention — Ingestible runs fully air-gapped with Prometheus metrics and GDPR / EU-AI-Act lineage per chunk.\n\nRelevant if {{company}} has EU customers or hospital / bank pilots. One-command Docker, no data leaves your infrastructure.\n\nWorth a closer look?\n\n— Vadim',
    'outreach',
    '["product:ingestible", "sequence:outreach", "step:4"]',
    '["first_name", "company", "domain"]',
    true
  ),
  (
    'ingestible_outreach_day13',
    'Ingestible outreach — day 13 breakup. Drops 2 assets (benchmark repo + Loom walkthrough) and closes the thread.',
    'closing the loop',
    E'Last note — if chunking / token cost isn''t a fire this quarter, feel free to ignore.\n\nIf it is, I have (1) a benchmark repo showing the L0–L3 hierarchy on a sample corpus and (2) a 30-min Loom walking it end-to-end.\n\nReply "send" and I''ll share both. Otherwise I''ll get out of your inbox.\n\n— Vadim',
    'outreach',
    '["product:ingestible", "sequence:outreach", "step:13"]',
    '["first_name", "company", "domain"]',
    true
  );
