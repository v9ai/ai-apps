import { textToSql } from "@/lib/langgraph-client";

function createSchemaDescription(databaseSchema: any): string {
  let description = "";

  const tableColumns = new Map<string, any[]>();
  databaseSchema.columns.forEach((column: any) => {
    const tableKey = `${column.table_schema}.${column.table_name}`;
    if (!tableColumns.has(tableKey)) {
      tableColumns.set(tableKey, []);
    }
    tableColumns.get(tableKey)?.push(column);
  });

  databaseSchema.tables.forEach((table: any) => {
    const tableKey = `${table.schema_name}.${table.table_name}`;
    const columns = tableColumns.get(tableKey) || [];
    const rowCount = databaseSchema.rowCounts.find(
      (rc: any) =>
        rc.schema_name === table.schema_name &&
        rc.table_name === table.table_name,
    );

    description += `\nTable: ${table.schema_name}.${table.table_name}`;
    if (rowCount) {
      description += ` (${rowCount.row_count} rows)`;
    }
    description += "\nColumns:\n";

    columns.forEach((column: any) => {
      description += `  - ${column.column_name}: ${column.data_type}`;
      if (column.character_maximum_length) {
        description += `(${column.character_maximum_length})`;
      }
      if (column.is_primary_key) {
        description += " [PRIMARY KEY]";
      }
      if (column.is_nullable === "NO") {
        description += " [NOT NULL]";
      }
      if (column.column_default) {
        description += ` [DEFAULT: ${column.column_default}]`;
      }
      description += "\n";
    });
  });

  if (databaseSchema.relationships.length > 0) {
    description += "\nRelationships:\n";
    databaseSchema.relationships.forEach((rel: any) => {
      description += `  - ${rel.table_schema}.${rel.table_name}.${rel.column_name} → ${rel.foreign_table_schema}.${rel.foreign_table_name}.${rel.foreign_column_name}\n`;
    });
  }

  if (databaseSchema.indexes.length > 0) {
    description += "\nIndexes:\n";
    databaseSchema.indexes.forEach((index: any) => {
      description += `  - ${index.schema_name}.${index.table_name}: ${index.index_name}\n`;
    });
  }

  return description;
}

export const sqlGenerationAgent = {
  async generate(
    question: string,
    opts?: { requestContext?: Map<string, any> },
  ) {
    const databaseSchema = opts?.requestContext?.get("databaseSchema");
    const schemaDescription = databaseSchema
      ? createSchemaDescription(databaseSchema)
      : "";

    const result = await textToSql(question, schemaDescription);
    return { object: { sql: result.sql, explanation: result.explanation } };
  },
};
