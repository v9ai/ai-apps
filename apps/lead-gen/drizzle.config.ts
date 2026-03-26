import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for Neon PostgreSQL
 *
 * Database: lead-gen-db (twilight-pond-00008257)
 *
 * Workflow:
 * 1. Update schema in ./src/db/schema.ts
 * 2. Generate migration: pnpm db:generate
 * 3. Apply to Neon: pnpm db:migrate
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: (process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL)!,
  },
});
