import { companies } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import {
  listD1Posts,
  getD1Post,
  upsertD1Posts,
  deleteD1Post,
  type D1PostRow,
  type UpsertPostInput,
} from "@/lib/posts-d1-client";

// ─── Field resolver (D1 row → GQL camelCase) ─────────────────────────────────

const LinkedInPost = {
  url:            (p: D1PostRow) => p.post_url,
  companyId:      (p: D1PostRow) => p.company_id,
  contactId:      (p: D1PostRow) => p.contact_id,
  authorName:     (p: D1PostRow) => p.author_name,
  authorUrl:      (p: D1PostRow) => p.author_url,
  employmentType: (p: D1PostRow) => p.employment_type,
  postedAt:       (p: D1PostRow) => p.posted_at,
  scrapedAt:      (p: D1PostRow) => p.scraped_at,
  rawData:        (p: D1PostRow) => p.raw_data ? JSON.parse(p.raw_data) : null,
  skills:         (p: D1PostRow) => p.skills ? JSON.parse(p.skills) : null,
  analyzedAt:     (p: D1PostRow) => p.analyzed_at,
  // D1 has no separate created_at; expose scraped_at to satisfy the schema field.
  createdAt:      (p: D1PostRow) => p.scraped_at,
};

// ─── Helpers: resolve companyId → companies row for denormalization ─────────

async function resolveCompanyById(
  ctx: GraphQLContext,
  id: number,
): Promise<{ key: string; name: string } | null> {
  const [row] = await ctx.db
    .select({ key: companies.key, name: companies.name })
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return row ?? null;
}

async function resolveCompaniesByIds(
  ctx: GraphQLContext,
  ids: number[],
): Promise<Map<number, { key: string; name: string }>> {
  if (ids.length === 0) return new Map();
  const rows = await ctx.db
    .select({ id: companies.id, key: companies.key, name: companies.name })
    .from(companies)
    .where(inArray(companies.id, ids));
  return new Map(rows.map((r) => [r.id, { key: r.key, name: r.name }]));
}

interface UpsertGqlInput {
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
}

function gqlInputToD1(
  input: UpsertGqlInput,
  company: { key: string; name: string } | null,
): UpsertPostInput | null {
  // company_key is required by the D1 schema; if no company resolves, fall
  // back to a synthetic slug derived from companyId so writes never silently
  // drop. Synthetic keys only happen if the chrome extension sends a
  // companyId that doesn't exist in Neon, which is unexpected.
  const company_key =
    company?.key ?? (input.companyId != null ? `_id_${input.companyId}` : null);
  if (!company_key) return null;

  return {
    type: input.type,
    company_key,
    company_id: input.companyId ?? null,
    company_name: company?.name ?? null,
    contact_id: input.contactId ?? null,
    author_name: input.authorName ?? null,
    author_url: input.authorUrl ?? null,
    post_url: input.url,
    post_text: input.content ?? null,
    title: input.title ?? null,
    content: input.content ?? null,
    location: input.location ?? null,
    employment_type: input.employmentType ?? null,
    posted_at: input.postedAt ?? null,
    raw_data: input.rawData != null ? JSON.stringify(input.rawData) : null,
  };
}

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
      return getD1Post(args.id);
    },

    async linkedinPosts(
      _parent: unknown,
      args: {
        type?: string | null;
        companyId?: number | null;
        limit?: number | null;
        offset?: number | null;
      },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      return listD1Posts({
        type: (args.type as "post" | "job" | undefined) ?? undefined,
        companyId: args.companyId ?? undefined,
        limit: Math.min(args.limit ?? 50, 200),
        offset: args.offset ?? 0,
      });
    },

    // similarPosts is deferred until the edge `/api/posts/d1/similar` route
    // ships (Phase 2-B). The current data set is too small to justify the
    // build now; returning [] keeps the schema field non-throwing.
    async similarPosts(
      _parent: unknown,
      _args: { postId: number; limit?: number | null; minScore?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");
      return [];
    },
  },

  Mutation: {
    async upsertLinkedInPost(
      _parent: unknown,
      args: { input: UpsertGqlInput },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      const company = args.input.companyId != null
        ? await resolveCompanyById(context, args.input.companyId)
        : null;
      const d1Input = gqlInputToD1(args.input, company);
      if (!d1Input) throw new Error("companyId required to derive company_key");

      await upsertD1Posts([d1Input]);
      // Read back the row to return a fully populated LinkedInPost. Lookup by
      // post_url since IDs are not deterministic.
      const [row] = await listD1Posts({
        companyKey: d1Input.company_key,
        limit: 200,
      });
      // listD1Posts returns by id desc; find the actual row by url.
      const all = await listD1Posts({
        companyKey: d1Input.company_key,
        limit: 500,
      });
      return all.find((r) => r.post_url === d1Input.post_url) ?? row ?? null;
    },

    async upsertLinkedInPosts(
      _parent: unknown,
      args: { inputs: UpsertGqlInput[] },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const companyIds = Array.from(
        new Set(
          args.inputs
            .map((i) => i.companyId)
            .filter((v): v is number => v != null),
        ),
      );
      const companyMap = await resolveCompaniesByIds(context, companyIds);

      const d1Inputs: UpsertPostInput[] = [];
      const errors: string[] = [];
      for (const input of args.inputs) {
        const company = input.companyId != null
          ? companyMap.get(input.companyId) ?? null
          : null;
        const mapped = gqlInputToD1(input, company);
        if (!mapped) {
          errors.push(`row missing company_key (url=${input.url})`);
          continue;
        }
        d1Inputs.push(mapped);
      }

      let upserted = 0;
      let skipped = 0;
      const CHUNK = 100;
      for (let i = 0; i < d1Inputs.length; i += CHUNK) {
        try {
          const r = await upsertD1Posts(d1Inputs.slice(i, i + CHUNK));
          upserted += r.upserted;
          skipped += r.skipped;
        } catch (e: any) {
          errors.push(e.message ?? String(e));
        }
      }

      // The legacy contract returned { inserted, updated } — D1 doesn't
      // distinguish on UPSERT, so we report both as `upserted` summed into
      // `inserted` and leave `updated` at 0. Callers (chrome extension)
      // don't act on the split.
      return {
        success: errors.length === 0,
        inserted: upserted,
        updated: 0,
        errors,
      };
    },

    async deleteLinkedInPost(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      return deleteD1Post(args.id);
    },

    // analyzeLinkedInPosts ran LLM analysis and wrote skills + embeddings
    // back to Neon via raw SQL. Deferred along with similarPosts; UI paths
    // that depended on it are dormant. Returns a no-op success shape.
    async analyzeLinkedInPosts(
      _parent: unknown,
      _args: { postIds?: number[] | null; limit?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }
      return { analyzed: 0, errors: ["deferred: posts-d1 analyze pipeline not yet wired"] };
    },
  },
};
