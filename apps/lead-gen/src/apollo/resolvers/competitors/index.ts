import {
  CompetitorAnalysisField,
  CompetitorField,
  PricingTierField,
  CompetitorFeatureField,
  CompetitorIntegrationField,
} from "./field-resolvers";
import { competitorQueries } from "./queries";
import { competitorMutations } from "./mutations";

export const competitorResolvers = {
  CompetitorAnalysis: CompetitorAnalysisField,
  Competitor: CompetitorField,
  PricingTier: PricingTierField,
  CompetitorFeature: CompetitorFeatureField,
  CompetitorIntegration: CompetitorIntegrationField,
  Query: competitorQueries,
  Mutation: competitorMutations,
};
