/**
 * Centralized D1 database configuration
 *
 * For local development: Uses wrangler dev with local D1
 * For production: Uses Cloudflare Workers D1 binding
 */

/**
 * Cloudflare Account ID
 */
export const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";

/**
 * D1 Database ID
 */
export const CLOUDFLARE_DATABASE_ID =
  process.env.CLOUDFLARE_DATABASE_ID?.trim() ?? "";

/**
 * D1 Database Name
 */
export const D1_DATABASE_NAME = "research-thera-db";

/**
 * Cloudflare API Token (for remote operations)
 */
export const CLOUDFLARE_D1_TOKEN =
  process.env.CLOUDFLARE_D1_TOKEN?.trim() ?? "";
