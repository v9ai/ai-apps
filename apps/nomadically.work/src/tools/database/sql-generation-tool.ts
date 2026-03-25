import { textToSql } from "@/lib/langgraph-client";

interface DatabaseSchema {
  tables: Array<{
    schema_name: string;
    table_name: string;
    table_owner: string;
  }>;
  columns: Array<{
    table_schema: string;
    table_name: string;
    column_name: string;
    data_type: string;
    character_maximum_length: number | null;
    numeric_precision: number | null;
    numeric_scale: number | null;
    is_nullable: string;
    column_default: string | null;
    is_primary_key: boolean;
  }>;
  relationships: Array<{
    table_schema: string;
    table_name: string;
    column_name: string;
    foreign_table_schema: string;
    foreign_table_name: string;
    foreign_column_name: string;
    constraint_name: string;
  }>;
  indexes: Array<{
    schema_name: string;
    table_name: string;
    index_name: string;
    index_definition: string;
  }>;
  rowCounts: Array<{
    schema_name: string;
    table_name: string;
    row_count: number;
    error?: string;
  }>;
}

function buildSchemaDescription(databaseSchema: DatabaseSchema): string {
  let schemaDescription = "";
  databaseSchema.tables.forEach((table) => {
    const tableKey = `${table.schema_name}.${table.table_name}`;
    const columns = databaseSchema.columns.filter(
      (c) =>
        c.table_schema === table.schema_name &&
        c.table_name === table.table_name,
    );
    const rowCount = databaseSchema.rowCounts.find(
      (rc) =>
        rc.schema_name === table.schema_name &&
        rc.table_name === table.table_name,
    );

    schemaDescription += `\nTable: ${tableKey}`;
    if (rowCount) schemaDescription += ` (${rowCount.row_count} rows)`;
    schemaDescription += "\nColumns:\n";
    columns.forEach((col) => {
      schemaDescription += `  - ${col.column_name}: ${col.data_type}`;
      if (col.is_primary_key) schemaDescription += " [PK]";
      if (col.is_nullable === "NO") schemaDescription += " [NOT NULL]";
      schemaDescription += "\n";
    });
  });

  return schemaDescription;
}

/**
 * Generates SQL queries from natural language descriptions using database schema information.
 */
export async function generateSqlFromNaturalLanguage(input: {
  naturalLanguageQuery: string;
  databaseSchema: DatabaseSchema;
}) {
  const { naturalLanguageQuery, databaseSchema } = input;
  const schemaDescription = buildSchemaDescription(databaseSchema);

  const result = await textToSql(naturalLanguageQuery, schemaDescription);

  return {
    sql: result.sql,
    explanation: result.explanation,
    confidence: result.confidence,
    assumptions: [] as string[],
    tables_used: result.tables_used,
  };
}

export const sqlGenerationTool = {
  id: "sql-generation",
  description:
    "Generates SQL queries from natural language descriptions using database schema information",
  execute: generateSqlFromNaturalLanguage,
};
