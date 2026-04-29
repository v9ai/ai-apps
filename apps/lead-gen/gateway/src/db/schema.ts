/**
 * Minimal Drizzle schema subset needed by the gateway. Mirrors the relevant
 * subset of `apps/lead-gen/src/db/schema.ts` and `packages/auth/src/schema.ts`.
 *
 * Only the columns actually read/written by the gateway are listed. The wire
 * compatibility with the main app's Drizzle definitions is by table+column
 * name; Postgres ignores the rest.
 */

import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  serial,
  boolean,
} from "drizzle-orm/pg-core";

// ── Better Auth ──────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// ── App tables ───────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  domain: text("domain"),
  description: text("description"),
  highlights: jsonb("highlights"),
  icp_analysis: jsonb("icp_analysis"),
  icp_analyzed_at: text("icp_analyzed_at"),
  pricing_analysis: jsonb("pricing_analysis"),
  pricing_analyzed_at: text("pricing_analyzed_at"),
  gtm_analysis: jsonb("gtm_analysis"),
  gtm_analyzed_at: text("gtm_analyzed_at"),
  intel_report: jsonb("intel_report"),
  intel_report_at: text("intel_report_at"),
  positioning_analysis: jsonb("positioning_analysis"),
  slug: text("slug"),
  published_at: timestamp("published_at", { withTimezone: true }),
  created_by: text("created_by"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const productIntelRuns = pgTable("product_intel_runs", {
  id: text("id").primaryKey(),
  lg_run_id: text("lg_run_id"),
  lg_thread_id: text("lg_thread_id"),
  product_id: integer("product_id").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("queued"),
  webhook_secret: text("webhook_secret").notNull(),
  started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finished_at: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
  output: jsonb("output"),
  created_by: text("created_by"),
});

export const productIntelRunSecrets = pgTable("product_intel_run_secrets", {
  run_id: text("run_id").primaryKey(),
  secret: text("secret").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
