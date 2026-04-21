import { desc, eq } from "drizzle-orm";
import { competitorAnalyses } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import type {
  QueryCompetitorAnalysisArgs,
  QueryCompetitorAnalysesArgs,
} from "@/__generated__/resolvers-types";

export const competitorQueries = {
  async competitorAnalysis(
    _parent: unknown,
    args: QueryCompetitorAnalysisArgs,
    context: GraphQLContext,
  ) {
    const [row] = await context.db
      .select()
      .from(competitorAnalyses)
      .where(eq(competitorAnalyses.id, args.id));
    return row ?? null;
  },

  async competitorAnalyses(
    _parent: unknown,
    args: QueryCompetitorAnalysesArgs,
    context: GraphQLContext,
  ) {
    const limit = Math.min(args.limit ?? 50, 200);
    const offset = args.offset ?? 0;
    return context.db
      .select()
      .from(competitorAnalyses)
      .orderBy(desc(competitorAnalyses.created_at))
      .limit(limit)
      .offset(offset);
  },
};
