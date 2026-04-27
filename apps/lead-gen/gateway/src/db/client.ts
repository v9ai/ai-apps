/**
 * Drizzle client over Neon's HTTP driver. Workers-compatible (no TCP).
 *
 * Each request creates a fresh client because Neon's HTTP driver is stateless
 * and Workers handle requests in isolated invocation contexts. Connection
 * pooling happens at the Neon edge, not in-process.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type GatewayDb = ReturnType<typeof getDb>;

export function getDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
