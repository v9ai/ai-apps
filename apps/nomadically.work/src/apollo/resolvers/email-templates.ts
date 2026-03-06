import { emailTemplates } from "@/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function mapTemplate(row: typeof emailTemplates.$inferSelect) {
  return {
    ...row,
    htmlContent: row.html_content ?? null,
    textContent: row.text_content ?? null,
    tags: parseJsonArray(row.tags),
    variables: parseJsonArray(row.variables),
    isActive: (row.is_active as unknown) === 1 || row.is_active === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const emailTemplateResolvers = {
  Query: {
    async emailTemplates(
      _parent: unknown,
      args: { category?: string; limit?: number; offset?: number },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions = [];
      if (args.category) conditions.push(eq(emailTemplates.category, args.category));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        context.db
          .select()
          .from(emailTemplates)
          .where(where)
          .orderBy(desc(emailTemplates.created_at))
          .limit(limit + 1)
          .offset(offset),
        context.db.select({ value: count() }).from(emailTemplates).where(where),
      ]);

      return {
        templates: rows.slice(0, limit).map(mapTemplate),
        totalCount: countRows[0]?.value ?? 0,
      };
    },

    async emailTemplate(_parent: unknown, args: { id: number }, context: GraphQLContext) {
      const rows = await context.db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, args.id))
        .limit(1);
      return rows[0] ? mapTemplate(rows[0]) : null;
    },
  },

  Mutation: {
    async createEmailTemplate(
      _parent: unknown,
      args: { input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { htmlContent, textContent, tags, variables, ...rest } = args.input;
      const rows = await context.db
        .insert(emailTemplates)
        .values({
          ...rest,
          html_content: htmlContent ?? null,
          text_content: textContent ?? null,
          tags: tags ? JSON.stringify(tags) : "[]",
          variables: variables ? JSON.stringify(variables) : "[]",
        })
        .returning();
      return mapTemplate(rows[0]);
    },

    async updateEmailTemplate(
      _parent: unknown,
      args: { id: number; input: any },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const { htmlContent, textContent, tags, variables, isActive, ...rest } = args.input;
      const patch: Record<string, unknown> = { ...rest };
      if (htmlContent !== undefined) patch.html_content = htmlContent;
      if (textContent !== undefined) patch.text_content = textContent;
      if (tags !== undefined) patch.tags = JSON.stringify(tags);
      if (variables !== undefined) patch.variables = JSON.stringify(variables);
      if (isActive !== undefined) patch.is_active = isActive;
      patch.updated_at = new Date().toISOString();

      const rows = await context.db
        .update(emailTemplates)
        .set(patch)
        .where(eq(emailTemplates.id, args.id))
        .returning();
      if (!rows[0]) throw new Error("Email template not found");
      return mapTemplate(rows[0]);
    },

    async deleteEmailTemplate(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db.delete(emailTemplates).where(eq(emailTemplates.id, args.id));
      return { success: true, message: "Email template deleted" };
    },
  },
};
