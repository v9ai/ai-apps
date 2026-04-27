/**
 * Postgres writes from the gateway.
 *
 * Uses Neon's HTTP-fetch driver so the Worker can update product_intel_runs
 * + products without opening a TCP connection.
 */

import { neon } from "@neondatabase/serverless";

export interface IntelRunMeta {
  productId: number;
  kind: string;
  startedAt: string;
}

export async function loadRunMeta(
  databaseUrl: string,
  appRunId: string,
): Promise<IntelRunMeta | null> {
  const sql = neon(databaseUrl);
  const rows = (await sql`
    SELECT product_id, kind, started_at
    FROM product_intel_runs
    WHERE id = ${appRunId}
    LIMIT 1
  `) as { product_id: number; kind: string; started_at: unknown }[];
  if (rows.length === 0) return null;
  const r = rows[0]!;
  const started =
    r.started_at && typeof (r.started_at as { toISOString?: unknown }).toISOString === "function"
      ? (r.started_at as Date).toISOString()
      : String(r.started_at);
  return {
    productId: r.product_id,
    kind: r.kind,
    startedAt: started,
  };
}

interface RunFinishedRow {
  appRunId: string;
  status: "success" | "error" | "timeout";
  error: string | null;
  finishedAt: string;
  output: unknown;
  productId: number;
  kind: string;
}

export async function persistRunFinished(
  databaseUrl: string,
  row: RunFinishedRow,
): Promise<void> {
  const sql = neon(databaseUrl);
  const outputJson = row.output ? JSON.stringify(row.output) : null;

  await sql`
    UPDATE product_intel_runs
    SET status = ${row.status},
        finished_at = ${row.finishedAt},
        error = ${row.error},
        output = ${outputJson}::jsonb
    WHERE id = ${row.appRunId}
  `;

  if (row.status !== "success" || !row.output) return;

  const out = row.output as Record<string, unknown>;
  const ts = row.finishedAt;

  // Static branches per kind — avoids dynamic SQL identifiers (Neon's HTTP
  // driver does not support sql.unsafe-style identifier interpolation).
  switch (row.kind) {
    case "pricing": {
      const patch = (out.pricing ?? out) as unknown;
      await sql`
        UPDATE products
        SET pricing_analysis = ${JSON.stringify(patch)}::jsonb,
            pricing_analyzed_at = ${ts},
            updated_at = ${ts}
        WHERE id = ${row.productId}
      `;
      return;
    }
    case "gtm": {
      const patch = (out.gtm ?? out) as unknown;
      await sql`
        UPDATE products
        SET gtm_analysis = ${JSON.stringify(patch)}::jsonb,
            gtm_analyzed_at = ${ts},
            updated_at = ${ts}
        WHERE id = ${row.productId}
      `;
      return;
    }
    case "product_intel": {
      const patch = (out.report ?? out) as unknown;
      await sql`
        UPDATE products
        SET intel_report = ${JSON.stringify(patch)}::jsonb,
            intel_report_at = ${ts},
            updated_at = ${ts}
        WHERE id = ${row.productId}
      `;
      return;
    }
    case "icp": {
      const patch = (out.icp ?? out) as unknown;
      await sql`
        UPDATE products
        SET icp_analysis = ${JSON.stringify(patch)}::jsonb,
            icp_analyzed_at = ${ts},
            updated_at = ${ts}
        WHERE id = ${row.productId}
      `;
      return;
    }
  }
}
