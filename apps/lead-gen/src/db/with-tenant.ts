import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import ws from "ws";
import * as schema from "./schema";
import { db as httpDb } from "./index";
import type { TenantKey } from "@/lib/tenants";

// Neon WebSocket needs a WS implementation in Node runtimes; browsers get it for free.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

// Single pool reused across warm serverless instances.
let _pool: Pool | undefined;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL,
    });
  }
  return _pool;
}

type TenantDb = NeonDatabase<typeof schema>;

// AsyncLocalStorage propagates the tx-bound db to any code running inside
// withTenantDb without threading it through every function signature.
const storage = new AsyncLocalStorage<TenantDb>();

/**
 * Runs `fn` inside a Postgres transaction with `app.tenant` set via
 * `set_config(..., is_local := true)`. Every query issued through the db
 * argument — or pulled from `getTenantDb()` within the same async context —
 * is filtered by the RLS policy on tenant-scoped tables.
 */
export async function withTenantDb<T>(
  tenantKey: TenantKey,
  fn: (db: TenantDb) => Promise<T>,
): Promise<T> {
  const db = drizzle(getPool(), { schema });
  return db.transaction(async (tx) => {
    // Switch to the non-BYPASSRLS role so the tenant_isolation policy actually
    // filters. neondb_owner has rolbypassrls=true and would otherwise ignore it.
    await tx.execute(sql`SET LOCAL ROLE app_tenant`);
    await tx.execute(sql`SELECT set_config('app.tenant', ${tenantKey}, true)`);
    return storage.run(tx as TenantDb, () => fn(tx as TenantDb));
  });
}

/**
 * Returns the current transaction-bound db if we're inside withTenantDb,
 * otherwise falls back to the unscoped neon-http db so scripts / admin
 * paths keep working. Tenant RLS policies allow access when `app.tenant`
 * is unset, so unscoped reads still return all rows.
 */
export function getTenantDb(): TenantDb | typeof httpDb {
  return storage.getStore() ?? httpDb;
}
