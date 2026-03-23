import { blockedCompanies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

export const blockedCompanyResolvers = {
  BlockedCompany: {
    createdAt(parent: any) {
      return parent.created_at;
    },
  },

  Query: {
    async blockedCompanies(_parent: unknown, _args: unknown, context: GraphQLContext) {
      return context.db.select().from(blockedCompanies).orderBy(blockedCompanies.name);
    },
  },

  Mutation: {
    async blockCompany(
      _parent: unknown,
      args: { name: string; reason?: string },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      // Upsert — if already blocked, return existing row
      const rows = await context.db
        .insert(blockedCompanies)
        .values({
          name: args.name,
          reason: args.reason ?? null,
        })
        .onConflictDoNothing({ target: blockedCompanies.name })
        .returning();

      if (rows.length > 0) return rows[0];

      // Already existed — fetch and return it
      const existing = await context.db
        .select()
        .from(blockedCompanies)
        .where(sql`lower(${blockedCompanies.name}) = ${args.name.toLowerCase()}`)
        .limit(1);
      return existing[0];
    },

    async unblockCompany(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(blockedCompanies).where(eq(blockedCompanies.id, args.id));
      return { success: true, message: "Company unblocked" };
    },
  },
};
