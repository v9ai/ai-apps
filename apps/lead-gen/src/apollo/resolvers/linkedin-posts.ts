import { linkedinPosts, type LinkedInPost as DbLinkedInPost } from "@/db/schema";
import { eq, and, sql, isNull, inArray, type SQL } from "drizzle-orm";
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
  skills:         (p: DbLinkedInPost) => p.skills ? JSON.parse(p.skills) : null,
  analyzedAt:     (p: DbLinkedInPost) => p.analyzed_at ?? null,
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

    async similarPosts(
      _parent: unknown,
      args: { postId: number; limit?: number | null; minScore?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const limit = args.limit ?? 10;
      const minScore = args.minScore ?? 0.3;

      try {
        const [source] = await context.db
          .select()
          .from(linkedinPosts)
          .where(eq(linkedinPosts.id, args.postId))
          .limit(1);

        if (!source) return [];

        // Read the job_embedding via raw SQL (vector column not in Drizzle schema)
        const embResult = await context.db.execute(
          sql`SELECT job_embedding as emb FROM linkedin_posts WHERE id = ${args.postId} AND job_embedding IS NOT NULL`,
        );
        const embRow = embResult.rows?.[0] as { emb: number[] } | undefined;
        if (!embRow?.emb) return [];

        const vecLiteral = `[${(embRow.emb as number[]).join(",")}]`;
        const vecParam = sql.raw(`'${vecLiteral}'::vector`);

        const results = await context.db
          .select({
            post: linkedinPosts,
            similarity: sql<number>`1 - (job_embedding <=> ${vecParam})`.as("similarity"),
          })
          .from(linkedinPosts)
          .where(
            and(
              sql`job_embedding IS NOT NULL`,
              sql`${linkedinPosts.id} != ${args.postId}`,
            ),
          )
          .orderBy(sql`job_embedding <=> ${vecParam}`)
          .limit(limit);

        return results
          .filter((r) => r.similarity >= minScore)
          .map((r) => ({ post: r.post, similarity: r.similarity }));
      } catch {
        return [];
      }
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

    async upsertLinkedInPosts(
      _parent: unknown,
      args: {
        inputs: Array<{
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
        }>;
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      let inserted = 0;
      let updated = 0;
      const errors: string[] = [];

      // Process in chunks of 50 to avoid overly large SQL statements
      const CHUNK = 50;
      for (let i = 0; i < args.inputs.length; i += CHUNK) {
        const chunk = args.inputs.slice(i, i + CHUNK);
        const rows = chunk.map((input) => ({
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
        }));

        try {
          // Check which URLs already exist to distinguish inserts from updates
          const chunkUrls = rows.map((r) => r.url);
          const existing = await context.db
            .select({ url: linkedinPosts.url })
            .from(linkedinPosts)
            .where(inArray(linkedinPosts.url, chunkUrls));
          const existingUrls = new Set(existing.map((r) => r.url));

          const result = await context.db
            .insert(linkedinPosts)
            .values(rows)
            .onConflictDoUpdate({
              target: linkedinPosts.url,
              set: {
                type:            sql`excluded.type`,
                company_id:      sql`excluded.company_id`,
                contact_id:      sql`excluded.contact_id`,
                title:           sql`excluded.title`,
                content:         sql`excluded.content`,
                author_name:     sql`excluded.author_name`,
                author_url:      sql`excluded.author_url`,
                location:        sql`excluded.location`,
                employment_type: sql`excluded.employment_type`,
                posted_at:       sql`excluded.posted_at`,
                raw_data:        sql`excluded.raw_data`,
                scraped_at:      sql`now()::text`,
              },
            })
            .returning();

          for (const row of result) {
            if (existingUrls.has(row.url)) {
              updated++;
            } else {
              inserted++;
            }
          }
        } catch (err) {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }

      return { success: errors.length === 0, inserted, updated, errors };
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

    async analyzeLinkedInPosts(
      _parent: unknown,
      args: { postIds?: number[] | null; limit?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      let analyzed = 0;
      let failed = 0;
      const errors: string[] = [];

      try {
        const { analyzePostBatch } = await import("@/ml/post-analyzer");

        // Fetch target posts: by IDs or un-analyzed posts
        const targetPosts = args.postIds?.length
          ? await context.db
              .select()
              .from(linkedinPosts)
              .where(sql`${linkedinPosts.id} = ANY(${args.postIds})`)
          : await context.db
              .select()
              .from(linkedinPosts)
              .where(isNull(linkedinPosts.analyzed_at))
              .limit(Math.min(args.limit ?? 50, 200));

        // Filter to posts with content
        const postsWithContent = targetPosts.filter(
          (p) => p.content && p.content.trim().length > 10,
        );

        if (postsWithContent.length === 0) {
          return { success: true, analyzed: 0, failed: 0, errors: [] };
        }

        // Batch analyze
        const results = await analyzePostBatch(
          postsWithContent.map((p) => ({ id: p.id, content: p.content! })),
        );

        // Update DB in chunks of 20
        const CHUNK = 20;
        const entries = Array.from(results.entries());
        for (let i = 0; i < entries.length; i += CHUNK) {
          const chunk = entries.slice(i, i + CHUNK);
          for (const [postId, analysis] of chunk) {
            try {
              const vecLiteral = `[${analysis.jobEmbedding.join(",")}]`;
              await context.db.execute(
                sql`UPDATE linkedin_posts SET
                  skills = ${JSON.stringify(analysis.skills)},
                  analyzed_at = ${analysis.analyzedAt},
                  job_embedding = ${sql.raw(`'${vecLiteral}'::vector`)}
                WHERE id = ${postId}`,
              );
              analyzed++;
            } catch (err) {
              failed++;
              errors.push(
                `Post ${postId}: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        }
      } catch (err) {
        errors.push(
          `Analysis init failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return { success: failed === 0, analyzed, failed, errors };
    },
  },
};
