import { companies, contacts } from "@/db/schema";
import type { Company as DbCompany } from "@/db/schema";
import { eq, sql, and, isNotNull, count, desc } from "drizzle-orm";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { scoreDataQuality } from "@/lib/ml/data-quality";
import { evaluateQualityGate } from "@/lib/ml/quality-gate";
import { scoreICP, extractICPFeatures } from "@/ml/icp-scorer";

export const mlResolvers = {
  Query: {
    async similarCompanies(
      _parent: unknown,
      args: { query: string; limit?: number; minScore?: number; minAiTier?: number },
      context: GraphQLContext,
    ) {
      const limit = args.limit ?? 10;
      const minScore = args.minScore ?? 0.3;

      try {
        const { embedQuery } = await import("@/ml/embedder");
        const queryEmbedding = await embedQuery(args.query);
        const vecLiteral = `[${queryEmbedding.join(",")}]`;

        const results = await context.db
          .select({
            company: companies,
            similarity: sql<number>`1 - (${companies.embedding} <=> ${vecLiteral}::vector)`.as("similarity"),
          })
          .from(companies)
          .where(
            and(
              eq(companies.blocked, false),
              isNotNull(companies.embedding),
              ...(args.minAiTier != null ? [sql`${companies.ai_tier} >= ${args.minAiTier}`] : []),
            ),
          )
          .orderBy(sql`${companies.embedding} <=> ${vecLiteral}::vector`)
          .limit(limit);

        return results
          .filter(r => r.similarity >= minScore)
          .map(r => ({ company: r.company, similarity: r.similarity }));
      } catch {
        // pgvector not enabled or embeddings not generated — return empty
        return [];
      }
    },

    async companiesLike(
      _parent: unknown,
      args: { companyId: number; limit?: number; minScore?: number },
      context: GraphQLContext,
    ) {
      const limit = args.limit ?? 10;
      const minScore = args.minScore ?? 0.3;

      try {
        const [source] = await context.db
          .select()
          .from(companies)
          .where(eq(companies.id, args.companyId))
          .limit(1);

        if (!source?.embedding) return [];

        const vecLiteral = `[${(source.embedding as number[]).join(",")}]`;

        const results = await context.db
          .select({
            company: companies,
            similarity: sql<number>`1 - (${companies.embedding} <=> ${vecLiteral}::vector)`.as("similarity"),
          })
          .from(companies)
          .where(
            and(
              eq(companies.blocked, false),
              isNotNull(companies.embedding),
              sql`${companies.id} != ${args.companyId}`,
            ),
          )
          .orderBy(sql`${companies.embedding} <=> ${vecLiteral}::vector`)
          .limit(limit);

        return results
          .filter(r => r.similarity >= minScore)
          .map(r => ({ company: r.company, similarity: r.similarity }));
      } catch {
        return [];
      }
    },

    async recommendedCompanies(
      _parent: unknown,
      args: { limit?: number; minScore?: number },
      context: GraphQLContext,
    ) {
      const limit = args.limit ?? 20;

      // Score companies using ICP scorer
      const allCompanies = await context.db
        .select()
        .from(companies)
        .where(eq(companies.blocked, false))
        .orderBy(desc(companies.score))
        .limit(limit * 2);

      return allCompanies
        .map(c => {
          const features = extractICPFeatures(c);
          const { score, reasons } = scoreICP(features);
          return { company: c, score, reasons };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },

    async recommendedContacts(
      _parent: unknown,
      args: { companyId: number; limit?: number },
      context: GraphQLContext,
    ) {
      const limit = args.limit ?? 10;
      const { scoreContact } = await import("@/ml/contact-ranker");

      const companyContacts = await context.db
        .select()
        .from(contacts)
        .where(eq(contacts.company_id, args.companyId));

      return companyContacts
        .map(c => {
          const features = {
            authorityScore: c.authority_score ?? 0,
            isDecisionMaker: c.is_decision_maker ? 1 : 0,
            hasVerifiedEmail: c.email_verified ? 1 : 0,
            emailCount: 1,
            hasLinkedin: c.linkedin_url ? 1 : 0,
            hasGithub: c.github_handle ? 1 : 0,
            departmentRelevance: c.department === "AI/ML" || c.department === "Engineering" ? 0.8 : 0.3,
            emailsSent: 0,
            daysSinceLastContact: c.last_contacted_at ? daysSince(c.last_contacted_at) : 0,
            hasReplied: 0,
            doNotContact: c.do_not_contact ? 1 : 0,
            nextTouchScore: c.next_touch_score ?? 0,
          };
          const score = scoreContact(features);
          const reasons: string[] = [];
          if (features.authorityScore > 0.7) reasons.push("High authority");
          if (features.hasVerifiedEmail) reasons.push("Email verified");
          if (features.hasLinkedin) reasons.push("LinkedIn available");
          if (features.isDecisionMaker) reasons.push("Decision maker");
          return { contact: c, rankScore: score, reasons };
        })
        .sort((a, b) => b.rankScore - a.rankScore)
        .slice(0, limit);
    },

    async mlStats(_parent: unknown, _args: unknown, context: GraphQLContext) {
      const [embeddedResult] = await context.db
        .select({ count: count() })
        .from(companies)
        .where(isNotNull(companies.embedding));

      const [totalResult] = await context.db
        .select({ count: count() })
        .from(companies);

      return {
        companiesEmbedded: embeddedResult?.count ?? 0,
        totalCompanies: totalResult?.count ?? 0,
        modelsAvailable: ["bge-small-en-v1.5", "lead-ranker-v1", "icp-scorer-v1"],
        lastEmbeddingAt: null,
      };
    },
  },

  Mutation: {
    async generateCompanyEmbeddings(
      _parent: unknown,
      args: { companyIds?: number[]; batchSize?: number },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      try {
        const { embedDocument } = await import("@/ml/embedder");
        const { companyToEmbeddingText } = await import("@/ml/company-text");

        const targetCompanies = args.companyIds?.length
          ? await context.db.select().from(companies).where(sql`${companies.id} = ANY(${args.companyIds})`)
          : await context.db.select().from(companies).where(sql`${companies.embedding} IS NULL`);

        const batchSize = args.batchSize ?? 50;
        for (let i = 0; i < targetCompanies.length; i += batchSize) {
          const batch = targetCompanies.slice(i, i + batchSize);
          for (const company of batch) {
            try {
              const text = companyToEmbeddingText(company);
              if (text.trim().length < 5) continue;
              const embedding = await embedDocument(text);
              await context.db
                .update(companies)
                .set({ embedding, updated_at: new Date().toISOString() })
                .where(eq(companies.id, company.id));
              processed++;
            } catch (err) {
              failed++;
              errors.push(`${company.name} (${company.id}): ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      } catch (err) {
        errors.push(`Embedder init failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      return { success: failed === 0, processed, failed, errors };
    },
  },

  // Field resolvers for Company ML fields
  Company: {
    dataQuality(parent: DbCompany) {
      return scoreDataQuality(parent);
    },

    qualityGate(parent: DbCompany) {
      const dq = scoreDataQuality(parent);
      return evaluateQualityGate(
        parent,
        parent.anomaly_score ?? 0,
        { completeness: dq.completeness, freshness: dq.freshness },
        0, // no bounce risk at company level
        false,
      );
    },

    rankScore(parent: DbCompany) {
      return parent.rank_score ?? null;
    },

    icpSimilarity(parent: DbCompany) {
      const features = extractICPFeatures(parent);
      return scoreICP(features).score;
    },
  },
};

function daysSince(isoDate: string): number {
  return Math.max(0, (Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}
