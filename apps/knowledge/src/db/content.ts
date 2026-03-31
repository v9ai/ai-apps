import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as contentSchema from "./content-schema";
import path from "path";

const DB_PATH =
  process.env.CONTENT_DB_PATH ||
  path.join(process.cwd(), "data", "knowledge.db");

let _db: BetterSQLite3Database<typeof contentSchema> | null = null;

export function getContentDb() {
  if (!_db) {
    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = normal");
    sqlite.pragma("foreign_keys = ON");
    _db = drizzle(sqlite, { schema: contentSchema });
  }
  return _db;
}

export const contentDb = new Proxy(
  {} as BetterSQLite3Database<typeof contentSchema>,
  {
    get(_target, prop) {
      return (getContentDb() as unknown as Record<string | symbol, unknown>)[
        prop
      ];
    },
  },
);
