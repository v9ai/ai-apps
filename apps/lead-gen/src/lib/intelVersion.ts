/**
 * Mirror of PRODUCT_INTEL_VERSION from
 * backend/leadgen_agent/product_intel_schemas.py (source of truth).
 *
 * Parity is enforced by src/lib/__tests__/intelVersion.test.ts, which greps
 * the Python file and asserts the values match. Bump both in the same commit.
 */
export const PRODUCT_INTEL_VERSION = "1.0.0";
