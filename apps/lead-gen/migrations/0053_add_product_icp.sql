-- Deep ICP analysis columns for products.
-- Populated by the `deep_icp` LangGraph node via the analyzeProductICP
-- GraphQL mutation (admin-only). Shape matches DeepICPResult in
-- src/lib/langgraph-client.ts and backend/leadgen_agent/deep_icp_graph.py.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS icp_analysis jsonb,
  ADD COLUMN IF NOT EXISTS icp_analyzed_at text;
