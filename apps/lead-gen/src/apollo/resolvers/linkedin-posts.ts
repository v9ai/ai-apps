import { linkedinPosts, type LinkedInPost as DbLinkedInPost } from "@/db/schema";
import { eq, and, type SQL } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";

// ─── Field resolver (snake_case DB → camelCase GQL) ──────────────────────────

const LinkedInPost = {
  companyId:      (p: DbLinkedInPost) => p.company_id ?? null,
  contactId:      (p: DbLinkedInPost) => p.contact_id ?? null,
  authorName:     (p: DbLinkedInPost) => p.author_name ?? null,
  authorUrl:      (p: DbLinkedInPost) => p.author_url ?? null,
  employmentType: (p: DbLinkedInPost) => p.employment_type ?? null,
  postedAt:       (p: DbLinkedInPost) => p.posted_at ?? null,
  scrapedAt:      (p: DbLinkedInPost) => p.scraped_at,
  rawData:        (p: DbLinkedInPost) => p.raw_data ? JSON.parse(p.raw_data) : null,
  createdAt:      (p: DbLinkedInPost) => p.created_at,
};

// ─── Resolver map ─────────────────────────────────────────────────────────────

export const linkedinPostResolvers = {
  LinkedInPost,

  Query: {
    async linkedinPost(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      const [row] = await context.db
        .select()
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, args.id))
        .limit(1);
      return row ?? null;
    },

    async linkedinPosts(
      _parent: unknown,
      args: { type?: string | null; companyId?: number | null; limit?: number | null; offset?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const limit  = Math.min(args.limit  ?? 50, 200);
      const offset = args.offset ?? 0;

      const conditions: SQL[] = [];
      if (args.type)      conditions.push(eq(linkedinPosts.type, args.type as "post" | "job"));
      if (args.companyId) conditions.push(eq(linkedinPosts.company_id, args.companyId));

      const rows = await context.db
        .select()
        .from(linkedinPosts)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(linkedinPosts.id)
        .limit(limit)
        .offset(offset);

      return rows;
    },
  },

  Mutation: {
    async upsertLinkedInPost(
      _parent: unknown,
      args: {
        input: {
          url: string;
          type: "post" | "job";
          companyId?: number | null;
          contactId?: number | null;
          title?: string | null;
          content?: string | null;
          authorName?: string | null;
          authorUrl?: string | null;
          location?: string | null;
          employmentType?: string | null;
          postedAt?: string | null;
          rawData?: unknown;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const { input } = args;
      const values = {
        url:             input.url,
        type:            input.type,
        company_id:      input.companyId   ?? null,
        contact_id:      input.contactId   ?? null,
        title:           input.title       ?? null,
        content:         input.content     ?? null,
        author_name:     input.authorName  ?? null,
        author_url:      input.authorUrl   ?? null,
        location:        input.location    ?? null,
        employment_type: input.employmentType ?? null,
        posted_at:       input.postedAt    ?? null,
        raw_data:        input.rawData != null ? JSON.stringify(input.rawData) : null,
      };

      const [row] = await context.db
        .insert(linkedinPosts)
        .values(values)
        .onConflictDoUpdate({
          target: linkedinPosts.url,
          set: {
            type:            values.type,
            company_id:      values.company_id,
            contact_id:      values.contact_id,
            title:           values.title,
            content:         values.content,
            author_name:     values.author_name,
            author_url:      values.author_url,
            location:        values.location,
            employment_type: values.employment_type,
            posted_at:       values.posted_at,
            raw_data:        values.raw_data,
          },
        })
        .returning();

      return row;
    },

    async deleteLinkedInPost(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      await context.db
        .delete(linkedinPosts)
        .where(eq(linkedinPosts.id, args.id));
      return true;
    },
  },
};
