-- Positioning synthesis layer for product intel.
--
-- Populated by backend/leadgen_agent/positioning_graph.py — a 4-node sequence
-- (extract_category_conventions → identify_white_space → draft_positioning_statement
-- → stress_test) with a bounded critic loop back to draft.
--
-- Shape of products.positioning_analysis jsonb (PositioningStatement):
--   {
--     "category": "project management / issue tracking",
--     "category_conventions": ["…"],
--     "white_space": ["…"],
--     "differentiators": ["…"],
--     "positioning_axes": ["speed vs bloat", "opinionated vs customizable"],
--     "competitor_frame": ["jira (legacy)", "asana (general-purpose)"],
--     "narrative_hooks": ["the purpose-built jira alternative"],
--     "positioning_statement": "For <ICP> who <pain>, <product> is the <category> that <differentiator>, unlike <competitor> which <gap>.",
--     "critic_rounds": 1,
--     "graph_meta": { … }
--   }
--
-- Consumed by synthesize_report in product_intel_graph.py so the executive
-- TL;DR can reference the positioning explicitly. Also exposed as a standalone
-- langgraph assistant `positioning` for re-runs without the full supervisor.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS positioning_analysis jsonb;
