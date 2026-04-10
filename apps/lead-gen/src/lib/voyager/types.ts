/**
 * Voyager Job Market Analytics — Type definitions.
 *
 * All types for the 10-metric analytics system built on LinkedIn Voyager
 * API data and the local linkedinPosts + voyagerJobCounts + voyagerSnapshots tables.
 */

// ---------------------------------------------------------------------------
// 1. Daily Remote Job Count Tracking
// ---------------------------------------------------------------------------

export interface DailyJobCount {
  date: string;                  // YYYY-MM-DD
  query: string;
  totalJobs: number;
  remoteJobs: number;
  newJobs24h: number;
  remoteRatio: number;           // remoteJobs / totalJobs
}

export interface JobCountTrend {
  query: string;
  period: "7d" | "30d" | "90d";
  dataPoints: DailyJobCount[];
  avgDailyRemote: number;
  trend: "growing" | "stable" | "declining";
  growthRate: number;            // % change over period
}

// ---------------------------------------------------------------------------
// 2. Company Hiring Velocity
// ---------------------------------------------------------------------------

export interface CompanyVelocity {
  companyId: number;
  companyName: string;
  companyKey: string;
  jobsPostedThisWeek: number;
  jobsPostedLastWeek: number;
  velocityDelta: number;         // this_week - last_week
  velocityTrend: "accelerating" | "steady" | "decelerating";
  remoteJobsPercent: number;
  /** Rolling 4-week average of jobs posted per week */
  rollingAvgWeekly: number;
}

// ---------------------------------------------------------------------------
// 3. Remote Job Growth Rate by Industry & Region
// ---------------------------------------------------------------------------

export interface IndustryGrowth {
  industry: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;            // % change
  remoteRatio: number;
}

export interface RegionGrowth {
  location: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
  remoteCount: number;
}

export interface GrowthReport {
  period: "7d" | "30d" | "90d";
  byIndustry: IndustryGrowth[];
  byRegion: RegionGrowth[];
  overallGrowthRate: number;
}

// ---------------------------------------------------------------------------
// 4. Salary Trend Analysis
// ---------------------------------------------------------------------------

export interface SalaryBand {
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  currency: string;
  sampleCount: number;
}

export interface SalaryTrend {
  query: string;
  period: "30d" | "90d" | "180d";
  currentBand: SalaryBand;
  previousBand: SalaryBand;
  medianDelta: number;           // % change in median
  trend: "rising" | "stable" | "declining";
  byRegion: { region: string; band: SalaryBand }[];
  bySeniority: { level: string; band: SalaryBand }[];
}

// ---------------------------------------------------------------------------
// 5. Skills Demand Tracking
// ---------------------------------------------------------------------------

export interface SkillDemand {
  skill: string;
  escoLabel?: string;
  count: number;
  pctOfTotal: number;
  avgConfidence: number;
  trend: "rising" | "stable" | "declining";
  /** Weeks this skill has been in the top 20 */
  weeksInTop20: number;
}

export interface SkillsDemandReport {
  query: string;
  period: "7d" | "30d";
  totalJobsAnalyzed: number;
  topSkills: SkillDemand[];
  emergingSkills: SkillDemand[];  // appeared recently, growing fast
  decliningSkills: SkillDemand[]; // were popular, now falling
}

// ---------------------------------------------------------------------------
// 6. Time-to-Fill Estimation
// ---------------------------------------------------------------------------

export interface TimeToFillEstimate {
  avgDays: number;
  medianDays: number;
  p90Days: number;
  sampleSize: number;
}

export interface TimeToFillReport {
  overall: TimeToFillEstimate;
  byIndustry: { industry: string; estimate: TimeToFillEstimate }[];
  bySeniority: { level: string; estimate: TimeToFillEstimate }[];
  byRemoteVsOnsite: {
    remote: TimeToFillEstimate;
    onsite: TimeToFillEstimate;
  };
}

// ---------------------------------------------------------------------------
// 7. Repost Frequency Analysis
// ---------------------------------------------------------------------------

export interface RepostSignal {
  jobUrl: string;
  jobTitle: string;
  companyName: string;
  repostCount: number;
  firstSeenDate: string;
  lastSeenDate: string;
  daysSinceFirst: number;
  isHardToFill: boolean;         // repostCount >= 3 OR daysSinceFirst >= 45
}

export interface RepostReport {
  totalJobsTracked: number;
  repostedJobs: number;
  repostRate: number;             // reposted / total
  hardToFillJobs: RepostSignal[];
  avgRepostCount: number;
  avgDaysOpen: number;
}

// ---------------------------------------------------------------------------
// 8. Competitive Analysis
// ---------------------------------------------------------------------------

export interface CompetitorProfile {
  companyId: number;
  companyName: string;
  companyKey: string;
  totalOpenings: number;
  remoteOpenings: number;
  remotePercent: number;
  aiMlOpenings: number;
  hiringVelocity: number;        // jobs/week rolling avg
  topSkillsSought: string[];
  avgSalaryMidpoint?: number;
  /** Rank among all tracked companies by total remote AI/ML openings */
  rank: number;
}

export interface CompetitiveReport {
  period: "7d" | "30d";
  topHirers: CompetitorProfile[];
  fastestGrowing: CompetitorProfile[];
  /** Companies that posted remote AI/ML roles for the first time */
  newEntrants: CompetitorProfile[];
}

// ---------------------------------------------------------------------------
// 9. Emerging Role Detection
// ---------------------------------------------------------------------------

export interface EmergingRole {
  title: string;
  normalizedTitle: string;
  firstSeenDate: string;
  count: number;
  weekOverWeekGrowth: number;
  topCompanies: string[];
  topSkills: string[];
  avgSalaryMidpoint?: number;
  isNovel: boolean;              // first appeared within lookback period
}

export interface EmergingRolesReport {
  period: "30d" | "90d";
  novelTitles: EmergingRole[];   // never seen before the period
  surging: EmergingRole[];       // existed but growing > 50% w/w
  declining: EmergingRole[];     // existed but shrinking > 30% w/w
}

// ---------------------------------------------------------------------------
// 10. Geographic Arbitrage Opportunities
// ---------------------------------------------------------------------------

export interface ArbitrageOpportunity {
  jobTitle: string;
  companyName: string;
  jobUrl: string;
  postedLocation: string;        // "Remote" or specific locale
  salaryMin: number;
  salaryMax: number;
  salaryMedian: number;
  currency: string;
  /** Percentile of this salary vs. the poster's HQ region median */
  salaryPercentile: number;
  /** Delta vs. global median for same role */
  salaryPremium: number;
  isHighSalaryRegionPay: boolean;
}

export interface ArbitrageReport {
  totalOpportunities: number;
  topOpportunities: ArbitrageOpportunity[];
  byRegion: {
    region: string;
    avgPremium: number;
    count: number;
  }[];
}

// ---------------------------------------------------------------------------
// Orchestrator types
// ---------------------------------------------------------------------------

export interface AnalyticsTimeRange {
  from: string;   // ISO date
  to: string;     // ISO date
}

export interface VoyagerAnalyticsConfig {
  /** Default queries to track */
  trackedQueries: string[];
  /** Minimum sample size for statistical significance */
  minSampleSize: number;
  /** Repost threshold to flag as hard-to-fill */
  hardToFillRepostThreshold: number;
  /** Days open threshold to flag as hard-to-fill */
  hardToFillDaysThreshold: number;
  /** Novel title lookback in days */
  novelTitleLookbackDays: number;
}

export const DEFAULT_ANALYTICS_CONFIG: VoyagerAnalyticsConfig = {
  trackedQueries: [
    "AI engineer remote",
    "machine learning engineer remote",
    "ML engineer remote global",
    "deep learning engineer remote",
    "LLM engineer remote",
    "AI/ML remote worldwide",
  ],
  minSampleSize: 5,
  hardToFillRepostThreshold: 3,
  hardToFillDaysThreshold: 45,
  novelTitleLookbackDays: 90,
};
