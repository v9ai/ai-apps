import { sql } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

export const executeSqlResolvers = {
  Query: {
    async executeSql(
      _parent: any,
      args: { sql: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden — admin access required");
      }

      const query = args.sql?.trim();
      if (!query) {
        throw new Error("Missing or empty SQL query");
      }

      const upper = query.toUpperCase();
      if (
        !upper.startsWith("SELECT") &&
        !upper.startsWith("WITH") &&
        !upper.startsWith("EXPLAIN")
      ) {
        throw new Error(
          "Only SELECT, WITH, and EXPLAIN queries are allowed",
        );
      }

      const result = await context.db.execute(sql.raw(query));

      const rows = Array.isArray(result) ? result : result.rows ?? [];
      const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
      const formattedRows = rows.map((row: any) =>
        columns.map((col) => {
          const val = row[col];
          return val === null || val === undefined ? null : String(val);
        }),
      );

      return {
        sql: query,
        explanation: null,
        columns,
        rows: formattedRows,
        drilldownSearchQuery: null,
      };
    },
  },
};
