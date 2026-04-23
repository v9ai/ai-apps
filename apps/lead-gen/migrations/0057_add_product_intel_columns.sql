-- Product intelligence jsonb columns for the pricing / gtm / product_intel graphs.
-- Populated by the `pricing`, `gtm`, and `product_intel` LangGraph endpoints via
-- the analyzeProductPricing / analyzeProductGTM / runFullProductIntel GraphQL
-- mutations (admin-only). Shapes match PricingStrategy, GTMStrategy, and
-- ProductIntelReport in backend/leadgen_agent/product_intel_schemas.py.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pricing_analysis jsonb,
  ADD COLUMN IF NOT EXISTS pricing_analyzed_at text,
  ADD COLUMN IF NOT EXISTS gtm_analysis jsonb,
  ADD COLUMN IF NOT EXISTS gtm_analyzed_at text,
  ADD COLUMN IF NOT EXISTS intel_report jsonb,
  ADD COLUMN IF NOT EXISTS intel_report_at text;
