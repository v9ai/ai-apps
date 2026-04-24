import { and, desc, eq, isNotNull, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyProductSignals, products } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import type {
  QueryProductLeadsArgs,
  ProductLead,
  ProductLeadsConnection,
} from "@/__generated__/resolvers-types";
import { isAdminEmail } from "@/lib/admin";

// Scored leads for a product, drawn from company_product_signals (schema.ts
// line 1027). Joined with companies for display columns. Only published
// products are visible to non-admins (matches the other product queries).
//
// Ordering: tier first ('hot' < 'warm' < 'cold'), then score desc. Postgres
// sorts NULLs last by default on DESC — null tier drops to the bottom.
const TIER_RANK = sql`
  CASE ${companyProductSignals.tier}
    WHEN 'hot' THEN 0
    WHEN 'warm' THEN 1
    WHEN 'cold' THEN 2
    ELSE 3
  END
`;

export const productLeadsQueries = {
  async productLeads(
    _parent: unknown,
    args: QueryProductLeadsArgs,
    context: GraphQLContext,
  ): Promise<ProductLeadsConnection> {
    const limit = Math.min(args.limit ?? 50, 200);
    const offset = args.offset ?? 0;
    const isAdmin = isAdminEmail(context.userEmail);

    const productWhere = isAdmin
      ? eq(products.slug, args.slug.toLowerCase())
      : and(
          eq(products.slug, args.slug.toLowerCase()),
          isNotNull(products.published_at),
        );

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(productWhere)
      .limit(1);

    if (!product) {
      return {
        leads: [],
        totalCount: 0,
        hotCount: 0,
        warmCount: 0,
        coldCount: 0,
      };
    }

    const tierFilter = args.tier ? eq(companyProductSignals.tier, args.tier) : undefined;
    const where = tierFilter
      ? and(eq(companyProductSignals.product_id, product.id), tierFilter)
      : eq(companyProductSignals.product_id, product.id);

    const rows = await db
      .select({
        companyId: companies.id,
        companyKey: companies.key,
        companyName: companies.name,
        companyDomain: companies.canonical_domain,
        companyLogoUrl: companies.logo_url,
        companyDescription: companies.description,
        companyIndustry: companies.industry,
        companySize: companies.size,
        companyLocation: companies.location,
        tier: companyProductSignals.tier,
        score: companyProductSignals.score,
        regexScore: companyProductSignals.regex_score,
        semanticScore: companyProductSignals.semantic_score,
        signals: companyProductSignals.signals,
        updatedAt: companyProductSignals.updated_at,
      })
      .from(companyProductSignals)
      .innerJoin(companies, eq(companies.id, companyProductSignals.company_id))
      .where(where)
      .orderBy(asc(TIER_RANK), desc(companyProductSignals.score))
      .limit(limit)
      .offset(offset);

    // Single aggregate query for the tier counts (and total). Cheaper than 4 round-trips.
    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        hot: sql<number>`count(*) filter (where ${companyProductSignals.tier} = 'hot')::int`,
        warm: sql<number>`count(*) filter (where ${companyProductSignals.tier} = 'warm')::int`,
        cold: sql<number>`count(*) filter (where ${companyProductSignals.tier} = 'cold')::int`,
      })
      .from(companyProductSignals)
      .where(eq(companyProductSignals.product_id, product.id));

    const leads: ProductLead[] = rows.map((r) => ({
      companyId: r.companyId,
      companyKey: r.companyKey,
      companyName: r.companyName,
      companyDomain: r.companyDomain ?? null,
      companyLogoUrl: r.companyLogoUrl ?? null,
      companyDescription: r.companyDescription ?? null,
      companyIndustry: r.companyIndustry ?? null,
      companySize: r.companySize ?? null,
      companyLocation: r.companyLocation ?? null,
      tier: r.tier ?? null,
      score: r.score,
      regexScore: r.regexScore,
      semanticScore: r.semanticScore ?? null,
      signals: r.signals,
      updatedAt:
        r.updatedAt instanceof Date
          ? r.updatedAt.toISOString()
          : String(r.updatedAt),
    }));

    return {
      leads,
      totalCount: counts?.total ?? 0,
      hotCount: counts?.hot ?? 0,
      warmCount: counts?.warm ?? 0,
      coldCount: counts?.cold ?? 0,
    };
  },
};
