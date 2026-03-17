import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export type DbInstance = typeof db;

// Re-export schema
export * from "./schema";
