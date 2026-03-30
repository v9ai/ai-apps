import { neon } from "@neondatabase/serverless";
import type { ColumnInfo, ConstraintInfo, IndexInfo, TableSchema } from "./types.js";

export async function discoverTables(databaseUrl: string): Promise<string[]> {
  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name as string);
}

export async function getTableSchema(
  databaseUrl: string,
  tableName: string,
): Promise<TableSchema> {
  const sql = neon(databaseUrl);

  const columns = (await sql`
    SELECT column_name, data_type, is_nullable, column_default, udt_name, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
    ORDER BY ordinal_position
  `) as unknown as ColumnInfo[];

  const constraints = (await sql`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = ${`public.${tableName}`}::regclass
  `) as unknown as ConstraintInfo[];

  const indexes = (await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ${tableName}
  `) as unknown as IndexInfo[];

  return { tableName, columns, constraints, indexes };
}

export async function exportTableData(
  databaseUrl: string,
  tableName: string,
): Promise<{ jsonl: string; rowCount: number }> {
  const sql = neon(databaseUrl);

  // neon() only supports tagged templates; use sql.query() for dynamic table names
  const rows = await sql.query(`SELECT * FROM "${tableName}"`);

  const lines = rows.map((row: Record<string, unknown>) => JSON.stringify(row));
  return {
    jsonl: lines.join("\n"),
    rowCount: rows.length,
  };
}
