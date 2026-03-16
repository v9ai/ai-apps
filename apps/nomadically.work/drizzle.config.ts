import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for Neon PostgreSQL
 *
 * Database: nomadically-work (twilight-pond-00008257)
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
    url: process.env.DATABASE_URL!,
  },
});
