import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const sql = neon(process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// DbInstance is a union so tenant-scoped (WebSocket-pool) transactions from
// withTenantDb can be passed to code that was originally typed against the
// default http-driver db. Both implement the same PgDatabase query API.
export type DbInstance =
  | typeof db
  | NeonDatabase<typeof schema>;

// Re-export schema
export * from "./schema";
