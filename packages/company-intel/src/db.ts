import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type CompanyIntelDB = ReturnType<typeof createClient>;

export function createClient(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error("@ai-apps/company-intel: databaseUrl is required");
  }
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
