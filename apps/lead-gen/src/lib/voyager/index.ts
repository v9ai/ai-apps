/**
 * Voyager Job Market Analytics — public API.
 *
 * Provides LinkedIn Voyager API data analytics for remote job market intelligence:
 *
 *  1. Daily remote job count tracking by query/keyword
 *  2. Company hiring velocity detection (jobs/week)
 *  3. Remote job growth rate by industry and region
 *  4. Salary trend analysis for remote roles
 *  5. Skills demand tracking (most-requested skills)
 *  6. Time-to-fill estimation (how long jobs stay open)
 *  7. Repost frequency analysis (hard-to-fill indicator)
 *  8. Competitive analysis (most aggressive remote hirers)
 *  9. Emerging role detection (new job titles appearing)
 * 10. Geographic arbitrage (remote roles with high-salary-region pay)
 */

export { VoyagerAnalytics } from "./analytics";
export { DEFAULT_ANALYTICS_CONFIG } from "./types";

export type {
  // 1. Job counts
  DailyJobCount,
  JobCountTrend,
  // 2. Hiring velocity
  CompanyVelocity,
  // 3. Growth
  IndustryGrowth,
  RegionGrowth,
  GrowthReport,
  // 4. Salary
  SalaryBand,
  SalaryTrend,
  // 5. Skills
  SkillDemand,
  SkillsDemandReport,
  // 6. Time-to-fill
  TimeToFillEstimate,
  TimeToFillReport,
  // 7. Repost
  RepostSignal,
  RepostReport,
  // 8. Competitive
  CompetitorProfile,
  CompetitiveReport,
  // 9. Emerging roles
  EmergingRole,
  EmergingRolesReport,
  // 10. Arbitrage
  ArbitrageOpportunity,
  ArbitrageReport,
  // Config
  VoyagerAnalyticsConfig,
  AnalyticsTimeRange,
} from "./types";
