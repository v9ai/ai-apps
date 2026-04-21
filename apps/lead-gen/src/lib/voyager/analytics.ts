/**
 * VoyagerAnalytics — LinkedIn Voyager Job Market Intelligence.
 *
 * Orchestrates 10 analytics capabilities for remote job market tracking:
 *
 *  1. Daily remote job count tracking
 *  2. Company hiring velocity detection
 *  3. Remote job growth rate by industry/region
 *  4. Salary trend analysis
 *  5. Skills demand tracking
 *  6. Time-to-fill estimation
 *  7. Repost frequency analysis
 *  8. Competitive analysis
 *  9. Emerging role detection
 * 10. Geographic arbitrage opportunities
 *
 * All queries use Drizzle ORM against the Neon PostgreSQL database.
 * Zero external dependencies beyond drizzle-orm.
 */

import { eq, and, gte, lte, desc, sql, count, type SQL } from "drizzle-orm";
import type { DbInstance } from "@/db";
import {
  linkedinPosts,
  companies,
  voyagerJobCounts,
  voyagerSnapshots,
  type LinkedInPost,
} from "@/db/schema";
import { SKILL_LABELS } from "@/lib/skills/taxonomy";
import type {
  JobCountTrend,
  DailyJobCount,
  CompanyVelocity,
  GrowthReport,
  IndustryGrowth,
  RegionGrowth,
  SalaryTrend,
  SalaryBand,
  SkillsDemandReport,
  SkillDemand,
  TimeToFillReport,
  TimeToFillEstimate,
  RepostReport,
  RepostSignal,
  CompetitiveReport,
  CompetitorProfile,
  EmergingRolesReport,
  EmergingRole,
  ArbitrageReport,
  ArbitrageOpportunity,
  VoyagerAnalyticsConfig,
} from "./types";
import { DEFAULT_ANALYTICS_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function weeksAgo(n: number): string {
  return daysAgo(n * 7);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function periodToDays(period: "7d" | "30d" | "90d" | "180d"): number {
  return parseInt(period);
}

function computeGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function classifyTrend(growthRate: number): "growing" | "stable" | "declining" {
  if (growthRate > 5) return "growing";
  if (growthRate < -5) return "declining";
  return "stable";
}

function classifySalaryTrend(delta: number): "rising" | "stable" | "declining" {
  if (delta > 3) return "rising";
  if (delta < -3) return "declining";
  return "stable";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/** Parse a JSON text column safely, returning fallback on failure. */
function parseJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** Extract salary numbers from job content text using regex heuristics. */
function extractSalaryFromContent(content: string): {
  min: number;
  max: number;
  currency: string;
} | null {
  // Match patterns like "$120,000 - $180,000", "120k-180k", "EUR 80,000 - 120,000"
  const patterns = [
    /(?:USD|\$)\s*([\d,]+)k?\s*[-–to]+\s*(?:USD|\$)?\s*([\d,]+)k?/i,
    /(?:EUR|€)\s*([\d,]+)k?\s*[-–to]+\s*(?:EUR|€)?\s*([\d,]+)k?/i,
    /(?:GBP|£)\s*([\d,]+)k?\s*[-–to]+\s*(?:GBP|£)?\s*([\d,]+)k?/i,
    /([\d,]+)k?\s*[-–to]+\s*([\d,]+)k?\s*(?:USD|\$|per\s+year|annually)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      let min = parseInt(match[1].replace(/,/g, ""));
      let max = parseInt(match[2].replace(/,/g, ""));

      // Handle "k" suffix
      if (min < 1000 && content.toLowerCase().includes("k")) {
        min *= 1000;
        max *= 1000;
      }

      // Detect currency
      let currency = "USD";
      if (/EUR|€/i.test(content)) currency = "EUR";
      else if (/GBP|£/i.test(content)) currency = "GBP";

      // Sanity: salary should be between 20k and 1M
      if (min >= 20000 && max <= 1000000 && min < max) {
        return { min, max, currency };
      }
    }
  }

  return null;
}

/** Normalize job titles for deduplication. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(sr|senior|jr|junior|lead|staff|principal|distinguished)\b/g, "")
    .replace(/\b(i|ii|iii|iv|v|1|2|3|4|5)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// VoyagerAnalytics class
// ---------------------------------------------------------------------------

export class VoyagerAnalytics {
  private db: DbInstance;
  private config: VoyagerAnalyticsConfig;

  constructor(db: DbInstance, config?: Partial<VoyagerAnalyticsConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  }

  // =========================================================================
  // 1. Daily Remote Job Count Tracking
  // =========================================================================

  /**
   * Track daily remote job counts by query/keyword.
   * Reads from voyagerJobCounts (populated by sync) and computes trends.
   */
  async getDailyJobCounts(
    query: string,
    period: "7d" | "30d" | "90d" = "30d",
  ): Promise<JobCountTrend> {
    const days = periodToDays(period);
    const fromDate = daysAgo(days);
    const toDate = today();

    // Query voyagerJobCounts for the date range
    const rows = await this.db
      .select({
        date: sql<string>`DATE(${voyagerJobCounts.counted_at})`.as("date"),
        totalJobs: sql<number>`SUM(${voyagerJobCounts.total_count})`.as("total_jobs"),
        remoteJobs: sql<number>`SUM(${voyagerJobCounts.remote_count})`.as("remote_jobs"),
      })
      .from(voyagerJobCounts)
      .where(
        and(
          eq(voyagerJobCounts.query, query),
          gte(voyagerJobCounts.counted_at, fromDate),
          lte(voyagerJobCounts.counted_at, toDate),
        ),
      )
      .groupBy(sql`DATE(${voyagerJobCounts.counted_at})`)
      .orderBy(sql`DATE(${voyagerJobCounts.counted_at})`);

    const dataPoints: DailyJobCount[] = rows.map((r) => ({
      date: r.date,
      query,
      totalJobs: Number(r.totalJobs) || 0,
      remoteJobs: Number(r.remoteJobs) || 0,
      newJobs24h: 0, // Computed from delta below
      remoteRatio: r.totalJobs > 0 ? Number(r.remoteJobs) / Number(r.totalJobs) : 0,
    }));

    // Compute newJobs24h from deltas
    for (let i = 1; i < dataPoints.length; i++) {
      const delta = dataPoints[i].remoteJobs - dataPoints[i - 1].remoteJobs;
      dataPoints[i].newJobs24h = Math.max(0, delta);
    }

    // Compute trend
    const halfIdx = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, halfIdx);
    const secondHalf = dataPoints.slice(halfIdx);

    const avgFirst = firstHalf.length > 0
      ? firstHalf.reduce((s, d) => s + d.remoteJobs, 0) / firstHalf.length
      : 0;
    const avgSecond = secondHalf.length > 0
      ? secondHalf.reduce((s, d) => s + d.remoteJobs, 0) / secondHalf.length
      : 0;

    const growthRate = computeGrowthRate(avgSecond, avgFirst);
    const avgDailyRemote = dataPoints.length > 0
      ? dataPoints.reduce((s, d) => s + d.remoteJobs, 0) / dataPoints.length
      : 0;

    return {
      query,
      period,
      dataPoints,
      avgDailyRemote,
      trend: classifyTrend(growthRate),
      growthRate,
    };
  }

  // =========================================================================
  // 2. Company Hiring Velocity Detection
  // =========================================================================

  /**
   * Detect company hiring velocity: jobs posted per week, trend detection.
   * Uses linkedinPosts (type='job') grouped by company.
   */
  async getCompanyHiringVelocity(
    limit = 20,
  ): Promise<CompanyVelocity[]> {
    const thisWeekStart = weeksAgo(1);
    const lastWeekStart = weeksAgo(2);
    const fourWeeksAgo = weeksAgo(4);

    // This week's jobs by company
    const thisWeek = await this.db
      .select({
        companyId: linkedinPosts.company_id,
        companyName: companies.name,
        companyKey: companies.key,
        jobCount: count(),
        remoteCount: sql<number>`SUM(CASE WHEN LOWER(${linkedinPosts.location}) LIKE '%remote%' THEN 1 ELSE 0 END)`.as("remote_count"),
      })
      .from(linkedinPosts)
      .innerJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, thisWeekStart),
        ),
      )
      .groupBy(linkedinPosts.company_id, companies.name, companies.key)
      .orderBy(desc(count()))
      .limit(limit * 2); // Fetch extra to filter

    // Last week's jobs by company
    const lastWeek = await this.db
      .select({
        companyId: linkedinPosts.company_id,
        jobCount: count(),
      })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, lastWeekStart),
          lte(linkedinPosts.posted_at, thisWeekStart),
        ),
      )
      .groupBy(linkedinPosts.company_id);

    // 4-week rolling average
    const rolling = await this.db
      .select({
        companyId: linkedinPosts.company_id,
        totalJobs: count(),
      })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, fourWeeksAgo),
        ),
      )
      .groupBy(linkedinPosts.company_id);

    const lastWeekMap = new Map(
      lastWeek.map((r) => [r.companyId, Number(r.jobCount)]),
    );
    const rollingMap = new Map(
      rolling.map((r) => [r.companyId, Number(r.totalJobs)]),
    );

    const results: CompanyVelocity[] = thisWeek
      .filter((r) => r.companyId !== null)
      .map((r) => {
        const companyId = r.companyId!;
        const thisWeekCount = Number(r.jobCount);
        const lastWeekCount = lastWeekMap.get(companyId) ?? 0;
        const rollingTotal = rollingMap.get(companyId) ?? thisWeekCount;
        const velocityDelta = thisWeekCount - lastWeekCount;

        let velocityTrend: "accelerating" | "steady" | "decelerating";
        if (velocityDelta > 1) velocityTrend = "accelerating";
        else if (velocityDelta < -1) velocityTrend = "decelerating";
        else velocityTrend = "steady";

        return {
          companyId,
          companyName: r.companyName,
          companyKey: r.companyKey,
          jobsPostedThisWeek: thisWeekCount,
          jobsPostedLastWeek: lastWeekCount,
          velocityDelta,
          velocityTrend,
          remoteJobsPercent: thisWeekCount > 0
            ? (Number(r.remoteCount) / thisWeekCount) * 100
            : 0,
          rollingAvgWeekly: rollingTotal / 4,
        };
      })
      .sort((a, b) => b.rollingAvgWeekly - a.rollingAvgWeekly)
      .slice(0, limit);

    return results;
  }

  // =========================================================================
  // 3. Remote Job Growth Rate by Industry & Region
  // =========================================================================

  /**
   * Compute growth rates of remote jobs segmented by industry and region.
   */
  async getGrowthReport(
    period: "7d" | "30d" | "90d" = "30d",
  ): Promise<GrowthReport> {
    const days = periodToDays(period);
    const currentFrom = daysAgo(days);
    const previousFrom = daysAgo(days * 2);

    // Current period jobs by industry
    const currentByIndustry = await this.db
      .select({
        industry: companies.industry,
        totalCount: count(),
        remoteCount: sql<number>`SUM(CASE WHEN LOWER(${linkedinPosts.location}) LIKE '%remote%' THEN 1 ELSE 0 END)`.as("remote_count"),
      })
      .from(linkedinPosts)
      .innerJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .groupBy(companies.industry);

    // Previous period
    const previousByIndustry = await this.db
      .select({
        industry: companies.industry,
        totalCount: count(),
      })
      .from(linkedinPosts)
      .innerJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, previousFrom),
          lte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .groupBy(companies.industry);

    const prevIndustryMap = new Map(
      previousByIndustry.map((r) => [r.industry, Number(r.totalCount)]),
    );

    const byIndustry: IndustryGrowth[] = currentByIndustry
      .filter((r) => r.industry)
      .map((r) => {
        const current = Number(r.totalCount);
        const previous = prevIndustryMap.get(r.industry!) ?? 0;
        return {
          industry: r.industry!,
          currentCount: current,
          previousCount: previous,
          growthRate: computeGrowthRate(current, previous),
          remoteRatio: current > 0 ? Number(r.remoteCount) / current : 0,
        };
      })
      .sort((a, b) => b.growthRate - a.growthRate);

    // Current period by region (location)
    const currentByRegion = await this.db
      .select({
        location: linkedinPosts.location,
        totalCount: count(),
        remoteCount: sql<number>`SUM(CASE WHEN LOWER(${linkedinPosts.location}) LIKE '%remote%' THEN 1 ELSE 0 END)`.as("remote_count"),
      })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .groupBy(linkedinPosts.location);

    const previousByRegion = await this.db
      .select({
        location: linkedinPosts.location,
        totalCount: count(),
      })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, previousFrom),
          lte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .groupBy(linkedinPosts.location);

    const prevRegionMap = new Map(
      previousByRegion.map((r) => [r.location, Number(r.totalCount)]),
    );

    const byRegion: RegionGrowth[] = currentByRegion
      .filter((r) => r.location)
      .map((r) => {
        const current = Number(r.totalCount);
        const previous = prevRegionMap.get(r.location!) ?? 0;
        return {
          location: r.location!,
          currentCount: current,
          previousCount: previous,
          growthRate: computeGrowthRate(current, previous),
          remoteCount: Number(r.remoteCount),
        };
      })
      .sort((a, b) => b.growthRate - a.growthRate);

    // Overall growth
    const currentTotal = byIndustry.reduce((s, i) => s + i.currentCount, 0);
    const previousTotal = byIndustry.reduce((s, i) => s + i.previousCount, 0);

    return {
      period,
      byIndustry,
      byRegion,
      overallGrowthRate: computeGrowthRate(currentTotal, previousTotal),
    };
  }

  // =========================================================================
  // 4. Salary Trend Analysis
  // =========================================================================

  /**
   * Analyze salary trends from job content text using regex extraction.
   * Compares current vs. previous period medians.
   */
  async getSalaryTrends(
    query?: string,
    period: "30d" | "90d" | "180d" = "90d",
  ): Promise<SalaryTrend> {
    const days = periodToDays(period);
    const currentFrom = daysAgo(days);
    const previousFrom = daysAgo(days * 2);

    const conditions: SQL[] = [eq(linkedinPosts.type, "job")];
    if (query) {
      conditions.push(
        sql`(LOWER(${linkedinPosts.title}) LIKE ${"%" + query.toLowerCase() + "%"} OR LOWER(${linkedinPosts.content}) LIKE ${"%" + query.toLowerCase() + "%"})`,
      );
    }

    // Current period
    const currentPosts = await this.db
      .select()
      .from(linkedinPosts)
      .where(and(...conditions, gte(linkedinPosts.posted_at, currentFrom)))
      .limit(2000);

    // Previous period
    const previousPosts = await this.db
      .select()
      .from(linkedinPosts)
      .where(
        and(
          ...conditions,
          gte(linkedinPosts.posted_at, previousFrom),
          lte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .limit(2000);

    const extractBand = (posts: LinkedInPost[]): SalaryBand => {
      const salaries: { min: number; max: number; currency: string }[] = [];
      for (const post of posts) {
        if (!post.content) continue;
        const salary = extractSalaryFromContent(post.content);
        if (salary) salaries.push(salary);
      }

      if (salaries.length === 0) {
        return { min: 0, max: 0, median: 0, p25: 0, p75: 0, currency: "USD", sampleCount: 0 };
      }

      const midpoints = salaries.map((s) => (s.min + s.max) / 2);
      const primaryCurrency = salaries
        .reduce((acc, s) => {
          acc.set(s.currency, (acc.get(s.currency) ?? 0) + 1);
          return acc;
        }, new Map<string, number>())
        .entries()
        .toArray()
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "USD";

      return {
        min: Math.min(...salaries.map((s) => s.min)),
        max: Math.max(...salaries.map((s) => s.max)),
        median: median(midpoints),
        p25: percentile(midpoints, 25),
        p75: percentile(midpoints, 75),
        currency: primaryCurrency,
        sampleCount: salaries.length,
      };
    };

    const currentBand = extractBand(currentPosts);
    const previousBand = extractBand(previousPosts);
    const medianDelta = computeGrowthRate(currentBand.median, previousBand.median);

    // By region
    const regionMap = new Map<string, LinkedInPost[]>();
    for (const post of currentPosts) {
      const loc = post.location ?? "Unknown";
      if (!regionMap.has(loc)) regionMap.set(loc, []);
      regionMap.get(loc)!.push(post);
    }
    const byRegion = Array.from(regionMap.entries())
      .map(([region, posts]) => ({ region, band: extractBand(posts) }))
      .filter((r) => r.band.sampleCount >= this.config.minSampleSize)
      .sort((a, b) => b.band.median - a.band.median);

    // By seniority (heuristic from title)
    const seniorityBuckets = new Map<string, LinkedInPost[]>();
    for (const post of currentPosts) {
      const title = (post.title ?? "").toLowerCase();
      let level = "mid";
      if (/senior|sr\.|lead|principal|staff|distinguished/.test(title)) level = "senior";
      else if (/junior|jr\.|intern|entry|associate/.test(title)) level = "junior";
      else if (/director|vp|head of|chief/.test(title)) level = "executive";
      if (!seniorityBuckets.has(level)) seniorityBuckets.set(level, []);
      seniorityBuckets.get(level)!.push(post);
    }
    const bySeniority = Array.from(seniorityBuckets.entries())
      .map(([level, posts]) => ({ level, band: extractBand(posts) }))
      .filter((r) => r.band.sampleCount >= this.config.minSampleSize)
      .sort((a, b) => b.band.median - a.band.median);

    return {
      query: query ?? "all",
      period,
      currentBand,
      previousBand,
      medianDelta,
      trend: classifySalaryTrend(medianDelta),
      byRegion,
      bySeniority,
    };
  }

  // =========================================================================
  // 5. Skills Demand Tracking
  // =========================================================================

  /**
   * Track most-requested skills from analyzed LinkedIn job posts.
   * Uses the `skills` JSON column populated by TechWolf/ConTeXT analysis.
   */
  async getSkillsDemand(
    query?: string,
    period: "7d" | "30d" = "30d",
  ): Promise<SkillsDemandReport> {
    const days = periodToDays(period);
    const currentFrom = daysAgo(days);
    const previousFrom = daysAgo(days * 2);

    const conditions: SQL[] = [
      eq(linkedinPosts.type, "job"),
      sql`${linkedinPosts.skills} IS NOT NULL`,
    ];
    if (query) {
      conditions.push(
        sql`(LOWER(${linkedinPosts.title}) LIKE ${"%" + query.toLowerCase() + "%"} OR LOWER(${linkedinPosts.content}) LIKE ${"%" + query.toLowerCase() + "%"})`,
      );
    }

    // Current period analyzed posts
    const currentPosts = await this.db
      .select({ skills: linkedinPosts.skills })
      .from(linkedinPosts)
      .where(and(...conditions, gte(linkedinPosts.posted_at, currentFrom)))
      .limit(5000);

    // Previous period for trend comparison
    const previousPosts = await this.db
      .select({ skills: linkedinPosts.skills })
      .from(linkedinPosts)
      .where(
        and(
          ...conditions,
          gte(linkedinPosts.posted_at, previousFrom),
          lte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .limit(5000);

    type SkillEntry = { tag: string; label: string; confidence: number };

    const countSkills = (posts: { skills: string | null }[]) => {
      const counts = new Map<string, { count: number; totalConf: number; label: string }>();
      for (const post of posts) {
        const skills = parseJson<SkillEntry[]>(post.skills, []);
        for (const skill of skills) {
          const existing = counts.get(skill.tag) ?? { count: 0, totalConf: 0, label: skill.label };
          existing.count++;
          existing.totalConf += skill.confidence;
          counts.set(skill.tag, existing);
        }
      }
      return counts;
    };

    const currentCounts = countSkills(currentPosts);
    const previousCounts = countSkills(previousPosts);
    const totalJobs = currentPosts.length;

    const toSkillDemand = (
      tag: string,
      data: { count: number; totalConf: number; label: string },
    ): SkillDemand => {
      const prevCount = previousCounts.get(tag)?.count ?? 0;
      const growthRate = computeGrowthRate(data.count, prevCount);
      return {
        skill: tag,
        escoLabel: SKILL_LABELS[tag] || data.label,
        count: data.count,
        pctOfTotal: totalJobs > 0 ? (data.count / totalJobs) * 100 : 0,
        avgConfidence: data.count > 0 ? data.totalConf / data.count : 0,
        trend: classifyTrend(growthRate) === "growing"
          ? "rising"
          : classifyTrend(growthRate) === "declining"
            ? "declining"
            : "stable",
        weeksInTop20: 0, // Would need historical snapshots to compute
      };
    };

    const allSkills = Array.from(currentCounts.entries())
      .map(([tag, data]) => toSkillDemand(tag, data))
      .sort((a, b) => b.count - a.count);

    const topSkills = allSkills.slice(0, 30);
    const emergingSkills = allSkills
      .filter((s) => s.trend === "rising" && s.count >= this.config.minSampleSize)
      .slice(0, 15);
    const decliningSkills = allSkills
      .filter((s) => s.trend === "declining" && s.count >= this.config.minSampleSize)
      .slice(0, 15);

    return {
      query: query ?? "all",
      period,
      totalJobsAnalyzed: totalJobs,
      topSkills,
      emergingSkills,
      decliningSkills,
    };
  }

  // =========================================================================
  // 6. Time-to-Fill Estimation
  // =========================================================================

  /**
   * Estimate time-to-fill from the delta between posted_at and the latest
   * repost/scrape of the same URL (proxy for job still being open).
   */
  async getTimeToFill(): Promise<TimeToFillReport> {
    // Get all job posts with both posted_at and scraped_at
    const posts = await this.db
      .select({
        id: linkedinPosts.id,
        postedAt: linkedinPosts.posted_at,
        scrapedAt: linkedinPosts.scraped_at,
        location: linkedinPosts.location,
        title: linkedinPosts.title,
        companyId: linkedinPosts.company_id,
        industry: companies.industry,
      })
      .from(linkedinPosts)
      .leftJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          sql`${linkedinPosts.posted_at} IS NOT NULL`,
        ),
      )
      .limit(5000);

    const computeEstimate = (
      items: { postedAt: string | null; scrapedAt: string }[],
    ): TimeToFillEstimate => {
      const durations = items
        .filter((p) => p.postedAt)
        .map((p) => {
          const posted = new Date(p.postedAt!).getTime();
          const scraped = new Date(p.scrapedAt).getTime();
          return Math.max(0, (scraped - posted) / (1000 * 60 * 60 * 24));
        })
        .filter((d) => d > 0 && d < 365); // Sanity bounds

      if (durations.length === 0) {
        return { avgDays: 0, medianDays: 0, p90Days: 0, sampleSize: 0 };
      }

      return {
        avgDays: durations.reduce((s, d) => s + d, 0) / durations.length,
        medianDays: median(durations),
        p90Days: percentile(durations, 90),
        sampleSize: durations.length,
      };
    };

    const overall = computeEstimate(posts);

    // By industry
    const industryGroups = new Map<string, typeof posts>();
    for (const p of posts) {
      const ind = p.industry ?? "Unknown";
      if (!industryGroups.has(ind)) industryGroups.set(ind, []);
      industryGroups.get(ind)!.push(p);
    }
    const byIndustry = Array.from(industryGroups.entries())
      .map(([industry, items]) => ({
        industry,
        estimate: computeEstimate(items),
      }))
      .filter((r) => r.estimate.sampleSize >= this.config.minSampleSize)
      .sort((a, b) => a.estimate.medianDays - b.estimate.medianDays);

    // By seniority
    const seniorityGroups = new Map<string, typeof posts>();
    for (const p of posts) {
      const title = (p.title ?? "").toLowerCase();
      let level = "mid";
      if (/senior|sr\.|lead|principal|staff/.test(title)) level = "senior";
      else if (/junior|jr\.|intern|entry/.test(title)) level = "junior";
      else if (/director|vp|head of|chief/.test(title)) level = "executive";
      if (!seniorityGroups.has(level)) seniorityGroups.set(level, []);
      seniorityGroups.get(level)!.push(p);
    }
    const bySeniority = Array.from(seniorityGroups.entries())
      .map(([level, items]) => ({
        level,
        estimate: computeEstimate(items),
      }))
      .filter((r) => r.estimate.sampleSize >= this.config.minSampleSize);

    // Remote vs onsite
    const remotePosts = posts.filter((p) =>
      (p.location ?? "").toLowerCase().includes("remote"),
    );
    const onsitePosts = posts.filter(
      (p) => !(p.location ?? "").toLowerCase().includes("remote"),
    );

    return {
      overall,
      byIndustry,
      bySeniority,
      byRemoteVsOnsite: {
        remote: computeEstimate(remotePosts),
        onsite: computeEstimate(onsitePosts),
      },
    };
  }

  // =========================================================================
  // 7. Repost Frequency Analysis
  // =========================================================================

  /**
   * Analyze repost frequency — jobs that keep appearing indicate hard-to-fill roles.
   * Uses voyagerSnapshots.repost_analysis for pre-computed data,
   * falls back to linkedinPosts deduplication.
   */
  async getRepostAnalysis(): Promise<RepostReport> {
    // Check voyagerSnapshots for recent repost analysis
    const [latestSnapshot] = await this.db
      .select()
      .from(voyagerSnapshots)
      .where(sql`${voyagerSnapshots.repost_analysis} IS NOT NULL`)
      .orderBy(desc(voyagerSnapshots.snapshot_date))
      .limit(1);

    if (latestSnapshot?.repost_analysis) {
      const preComputed = parseJson<RepostSignal[]>(latestSnapshot.repost_analysis, []);
      if (preComputed.length > 0) {
        const hardToFill = preComputed.filter((r) => r.isHardToFill);
        return {
          totalJobsTracked: Number(latestSnapshot.total_jobs),
          repostedJobs: Number(latestSnapshot.reposted_jobs),
          repostRate: latestSnapshot.total_jobs > 0
            ? latestSnapshot.reposted_jobs / latestSnapshot.total_jobs
            : 0,
          hardToFillJobs: hardToFill,
          avgRepostCount: preComputed.length > 0
            ? preComputed.reduce((s, r) => s + r.repostCount, 0) / preComputed.length
            : 0,
          avgDaysOpen: preComputed.length > 0
            ? preComputed.reduce((s, r) => s + r.daysSinceFirst, 0) / preComputed.length
            : 0,
        };
      }
    }

    // Fallback: compute from linkedinPosts by looking for similar titles from same company
    const allJobs = await this.db
      .select({
        id: linkedinPosts.id,
        url: linkedinPosts.url,
        title: linkedinPosts.title,
        companyId: linkedinPosts.company_id,
        companyName: companies.name,
        postedAt: linkedinPosts.posted_at,
        scrapedAt: linkedinPosts.scraped_at,
      })
      .from(linkedinPosts)
      .leftJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(eq(linkedinPosts.type, "job"))
      .orderBy(linkedinPosts.posted_at)
      .limit(5000);

    // Group by normalized title + company
    const groups = new Map<string, typeof allJobs>();
    for (const job of allJobs) {
      if (!job.title || !job.companyId) continue;
      const key = `${job.companyId}:${normalizeTitle(job.title)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(job);
    }

    const repostSignals: RepostSignal[] = [];
    let totalTracked = 0;
    let repostedCount = 0;

    for (const [, jobs] of groups) {
      totalTracked++;
      if (jobs.length <= 1) continue;

      repostedCount++;
      const first = jobs[0];
      const last = jobs[jobs.length - 1];
      const daysSinceFirst = first.postedAt && last.postedAt
        ? (new Date(last.postedAt).getTime() - new Date(first.postedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      repostSignals.push({
        jobUrl: first.url,
        jobTitle: first.title ?? "",
        companyName: first.companyName ?? "",
        repostCount: jobs.length,
        firstSeenDate: first.postedAt ?? first.scrapedAt,
        lastSeenDate: last.postedAt ?? last.scrapedAt,
        daysSinceFirst,
        isHardToFill:
          jobs.length >= this.config.hardToFillRepostThreshold ||
          daysSinceFirst >= this.config.hardToFillDaysThreshold,
      });
    }

    repostSignals.sort((a, b) => b.repostCount - a.repostCount);

    return {
      totalJobsTracked: totalTracked,
      repostedJobs: repostedCount,
      repostRate: totalTracked > 0 ? repostedCount / totalTracked : 0,
      hardToFillJobs: repostSignals.filter((r) => r.isHardToFill),
      avgRepostCount: repostSignals.length > 0
        ? repostSignals.reduce((s, r) => s + r.repostCount, 0) / repostSignals.length
        : 0,
      avgDaysOpen: repostSignals.length > 0
        ? repostSignals.reduce((s, r) => s + r.daysSinceFirst, 0) / repostSignals.length
        : 0,
    };
  }

  // =========================================================================
  // 8. Competitive Analysis
  // =========================================================================

  /**
   * Identify which companies are hiring most aggressively for remote AI/ML roles.
   */
  async getCompetitiveAnalysis(
    period: "7d" | "30d" = "30d",
  ): Promise<CompetitiveReport> {
    const days = periodToDays(period);
    const fromDate = daysAgo(days);
    const prevFrom = daysAgo(days * 2);

    // All job posts with company data for current period
    const currentJobs = await this.db
      .select({
        companyId: linkedinPosts.company_id,
        companyName: companies.name,
        companyKey: companies.key,
        title: linkedinPosts.title,
        location: linkedinPosts.location,
        content: linkedinPosts.content,
        skills: linkedinPosts.skills,
        postedAt: linkedinPosts.posted_at,
      })
      .from(linkedinPosts)
      .innerJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, fromDate),
        ),
      )
      .limit(10000);

    // Previous period for growth comparison
    const previousCounts = await this.db
      .select({
        companyId: linkedinPosts.company_id,
        jobCount: count(),
      })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, prevFrom),
          lte(linkedinPosts.posted_at, fromDate),
        ),
      )
      .groupBy(linkedinPosts.company_id);

    const prevCountMap = new Map(
      previousCounts.map((r) => [r.companyId, Number(r.jobCount)]),
    );

    // Group current jobs by company
    const companyGroups = new Map<
      number,
      {
        name: string;
        key: string;
        jobs: typeof currentJobs;
      }
    >();

    for (const job of currentJobs) {
      if (!job.companyId) continue;
      if (!companyGroups.has(job.companyId)) {
        companyGroups.set(job.companyId, {
          name: job.companyName,
          key: job.companyKey,
          jobs: [],
        });
      }
      companyGroups.get(job.companyId)!.jobs.push(job);
    }

    const profiles: CompetitorProfile[] = [];

    for (const [companyId, group] of companyGroups) {
      const jobs = group.jobs;
      const remoteJobs = jobs.filter((j) =>
        (j.location ?? "").toLowerCase().includes("remote"),
      );
      const aiMlJobs = jobs.filter((j) => {
        const text = `${j.title ?? ""} ${j.content ?? ""}`.toLowerCase();
        return /\b(ai|ml|machine\s+learning|deep\s+learning|llm|nlp|computer\s+vision)\b/.test(text);
      });

      // Top skills from analyzed posts
      const skillCounts = new Map<string, number>();
      for (const job of jobs) {
        const skills = parseJson<{ tag: string }[]>(job.skills, []);
        for (const s of skills) {
          skillCounts.set(s.tag, (skillCounts.get(s.tag) ?? 0) + 1);
        }
      }
      const topSkills = Array.from(skillCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => SKILL_LABELS[tag] || tag);

      // Salary extraction
      const salaries: number[] = [];
      for (const job of jobs) {
        if (!job.content) continue;
        const sal = extractSalaryFromContent(job.content);
        if (sal) salaries.push((sal.min + sal.max) / 2);
      }

      const weeks = days / 7;

      profiles.push({
        companyId,
        companyName: group.name,
        companyKey: group.key,
        totalOpenings: jobs.length,
        remoteOpenings: remoteJobs.length,
        remotePercent: jobs.length > 0 ? (remoteJobs.length / jobs.length) * 100 : 0,
        aiMlOpenings: aiMlJobs.length,
        hiringVelocity: weeks > 0 ? jobs.length / weeks : jobs.length,
        topSkillsSought: topSkills,
        avgSalaryMidpoint: salaries.length > 0 ? median(salaries) : undefined,
        rank: 0, // Set after sorting
      });
    }

    // Sort by remote AI/ML openings, assign rank
    profiles.sort((a, b) => {
      const scoreA = a.remoteOpenings * 2 + a.aiMlOpenings;
      const scoreB = b.remoteOpenings * 2 + b.aiMlOpenings;
      return scoreB - scoreA;
    });
    profiles.forEach((p, i) => (p.rank = i + 1));

    const topHirers = profiles.slice(0, 20);

    // Fastest growing: biggest increase in job count
    const fastestGrowing = [...profiles]
      .filter((p) => prevCountMap.has(p.companyId))
      .sort((a, b) => {
        const growthA = computeGrowthRate(a.totalOpenings, prevCountMap.get(a.companyId) ?? 0);
        const growthB = computeGrowthRate(b.totalOpenings, prevCountMap.get(b.companyId) ?? 0);
        return growthB - growthA;
      })
      .slice(0, 10);

    // New entrants: companies with no jobs in previous period
    const newEntrants = profiles
      .filter((p) => !prevCountMap.has(p.companyId) || prevCountMap.get(p.companyId) === 0)
      .filter((p) => p.aiMlOpenings > 0 || p.remoteOpenings > 0)
      .slice(0, 10);

    return {
      period,
      topHirers,
      fastestGrowing,
      newEntrants,
    };
  }

  // =========================================================================
  // 9. Emerging Role Detection
  // =========================================================================

  /**
   * Detect new job titles appearing in the market, and existing titles
   * with significant growth or decline.
   */
  async getEmergingRoles(
    period: "30d" | "90d" = "90d",
  ): Promise<EmergingRolesReport> {
    const days = periodToDays(period);
    const currentFrom = daysAgo(days);
    const previousFrom = daysAgo(days * 2);
    const lookbackFrom = daysAgo(this.config.novelTitleLookbackDays * 2);

    // Current period titles
    const currentPosts = await this.db
      .select({
        title: linkedinPosts.title,
        companyName: companies.name,
        skills: linkedinPosts.skills,
        content: linkedinPosts.content,
        postedAt: linkedinPosts.posted_at,
      })
      .from(linkedinPosts)
      .leftJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .limit(5000);

    // Previous period titles
    const previousPosts = await this.db
      .select({ title: linkedinPosts.title })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, previousFrom),
          lte(linkedinPosts.posted_at, currentFrom),
        ),
      )
      .limit(5000);

    // Deep lookback for novelty detection
    const lookbackPosts = await this.db
      .select({ title: linkedinPosts.title })
      .from(linkedinPosts)
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, lookbackFrom),
          lte(linkedinPosts.posted_at, previousFrom),
        ),
      )
      .limit(10000);

    const lookbackTitles = new Set(
      lookbackPosts
        .filter((p) => p.title)
        .map((p) => normalizeTitle(p.title!)),
    );

    // Count current titles
    const currentTitleMap = new Map<
      string,
      {
        normalizedTitle: string;
        originalTitle: string;
        count: number;
        companies: Set<string>;
        skills: Set<string>;
        salaries: number[];
        firstSeen: string;
      }
    >();

    for (const post of currentPosts) {
      if (!post.title) continue;
      const norm = normalizeTitle(post.title);
      if (!currentTitleMap.has(norm)) {
        currentTitleMap.set(norm, {
          normalizedTitle: norm,
          originalTitle: post.title,
          count: 0,
          companies: new Set(),
          skills: new Set(),
          salaries: [],
          firstSeen: post.postedAt ?? "",
        });
      }
      const entry = currentTitleMap.get(norm)!;
      entry.count++;
      if (post.companyName) entry.companies.add(post.companyName);
      const skills = parseJson<{ tag: string }[]>(post.skills, []);
      for (const s of skills) entry.skills.add(s.tag);
      if (post.content) {
        const sal = extractSalaryFromContent(post.content);
        if (sal) entry.salaries.push((sal.min + sal.max) / 2);
      }
      if (post.postedAt && post.postedAt < entry.firstSeen) {
        entry.firstSeen = post.postedAt;
      }
    }

    // Count previous titles
    const prevTitleCounts = new Map<string, number>();
    for (const post of previousPosts) {
      if (!post.title) continue;
      const norm = normalizeTitle(post.title);
      prevTitleCounts.set(norm, (prevTitleCounts.get(norm) ?? 0) + 1);
    }

    // Build emerging roles
    const toEmergingRole = (entry: NonNullable<ReturnType<typeof currentTitleMap.get>>): EmergingRole => {
      const prevCount = prevTitleCounts.get(entry.normalizedTitle) ?? 0;
      const growth = computeGrowthRate(entry.count, prevCount);

      return {
        title: entry.originalTitle,
        normalizedTitle: entry.normalizedTitle,
        firstSeenDate: entry.firstSeen,
        count: entry.count,
        weekOverWeekGrowth: growth,
        topCompanies: Array.from(entry.companies).slice(0, 5),
        topSkills: Array.from(entry.skills).slice(0, 5).map((t) => SKILL_LABELS[t] || t),
        avgSalaryMidpoint: entry.salaries.length > 0 ? median(entry.salaries) : undefined,
        isNovel: !lookbackTitles.has(entry.normalizedTitle),
      };
    };

    const allRoles = Array.from(currentTitleMap.values())
      .filter((e) => e.count >= 2) // Minimum 2 occurrences to be meaningful
      .map(toEmergingRole);

    const novelTitles = allRoles
      .filter((r) => r.isNovel)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const surging = allRoles
      .filter((r) => !r.isNovel && r.weekOverWeekGrowth > 50)
      .sort((a, b) => b.weekOverWeekGrowth - a.weekOverWeekGrowth)
      .slice(0, 20);

    const declining = allRoles
      .filter((r) => !r.isNovel && r.weekOverWeekGrowth < -30)
      .sort((a, b) => a.weekOverWeekGrowth - b.weekOverWeekGrowth)
      .slice(0, 20);

    return {
      period,
      novelTitles,
      surging,
      declining,
    };
  }

  // =========================================================================
  // 10. Geographic Arbitrage Opportunities
  // =========================================================================

  /**
   * Find remote roles paying high-salary-region rates.
   * Identifies jobs where salary significantly exceeds the global median
   * for similar roles.
   */
  async getGeographicArbitrage(
    minPremiumPercent = 20,
  ): Promise<ArbitrageReport> {
    const fromDate = daysAgo(30);

    const posts = await this.db
      .select({
        title: linkedinPosts.title,
        url: linkedinPosts.url,
        location: linkedinPosts.location,
        content: linkedinPosts.content,
        companyName: companies.name,
      })
      .from(linkedinPosts)
      .leftJoin(companies, eq(linkedinPosts.company_id, companies.id))
      .where(
        and(
          eq(linkedinPosts.type, "job"),
          gte(linkedinPosts.posted_at, fromDate),
          sql`LOWER(${linkedinPosts.location}) LIKE '%remote%'`,
        ),
      )
      .limit(5000);

    // Extract salaries for all remote posts
    const postsWithSalary: {
      post: typeof posts[number];
      salary: { min: number; max: number; currency: string };
    }[] = [];

    for (const post of posts) {
      if (!post.content) continue;
      const sal = extractSalaryFromContent(post.content);
      if (sal) postsWithSalary.push({ post, salary: sal });
    }

    if (postsWithSalary.length === 0) {
      return { totalOpportunities: 0, topOpportunities: [], byRegion: [] };
    }

    // Compute global median for normalization
    const allMidpoints = postsWithSalary.map(
      (p) => (p.salary.min + p.salary.max) / 2,
    );
    const globalMedian = median(allMidpoints);

    // Build opportunities
    const opportunities: ArbitrageOpportunity[] = postsWithSalary
      .map((p) => {
        const midpoint = (p.salary.min + p.salary.max) / 2;
        const premium = globalMedian > 0
          ? ((midpoint - globalMedian) / globalMedian) * 100
          : 0;

        // Determine salary percentile
        const belowCount = allMidpoints.filter((m) => m < midpoint).length;
        const salaryPercentile = (belowCount / allMidpoints.length) * 100;

        return {
          jobTitle: p.post.title ?? "",
          companyName: p.post.companyName ?? "",
          jobUrl: p.post.url,
          postedLocation: p.post.location ?? "Remote",
          salaryMin: p.salary.min,
          salaryMax: p.salary.max,
          salaryMedian: midpoint,
          currency: p.salary.currency,
          salaryPercentile,
          salaryPremium: premium,
          isHighSalaryRegionPay: premium >= minPremiumPercent,
        };
      })
      .filter((o) => o.isHighSalaryRegionPay)
      .sort((a, b) => b.salaryPremium - a.salaryPremium);

    // Group by region
    const regionMap = new Map<string, { premiums: number[]; count: number }>();
    for (const opp of opportunities) {
      const region = opp.postedLocation;
      if (!regionMap.has(region)) regionMap.set(region, { premiums: [], count: 0 });
      const entry = regionMap.get(region)!;
      entry.premiums.push(opp.salaryPremium);
      entry.count++;
    }

    const byRegion = Array.from(regionMap.entries())
      .map(([region, data]) => ({
        region,
        avgPremium: data.premiums.reduce((s, p) => s + p, 0) / data.premiums.length,
        count: data.count,
      }))
      .sort((a, b) => b.avgPremium - a.avgPremium);

    return {
      totalOpportunities: opportunities.length,
      topOpportunities: opportunities.slice(0, 50),
      byRegion,
    };
  }

  // =========================================================================
  // Snapshot persistence — save daily analytics to voyagerSnapshots
  // =========================================================================

  /**
   * Persist a daily analytics snapshot for a given query.
   * Called by the sync pipeline after collecting Voyager data.
   */
  async saveSnapshot(
    query: string,
    data: {
      totalJobs: number;
      remoteJobs: number;
      newJobs24h: number;
      repostedJobs: number;
      topCompanies?: unknown[];
      topSkills?: unknown[];
      salaryData?: unknown;
      locationBreakdown?: unknown[];
      industryBreakdown?: unknown[];
      employmentTypes?: unknown[];
      emergingTitles?: unknown[];
      repostAnalysis?: unknown[];
      timeToFill?: unknown;
      voyagerRequestId?: string;
      rawMetadata?: unknown;
    },
  ): Promise<void> {
    const snapshotDate = today();

    await this.db
      .insert(voyagerSnapshots)
      .values({
        snapshot_date: snapshotDate,
        query,
        total_jobs: data.totalJobs,
        remote_jobs: data.remoteJobs,
        new_jobs_24h: data.newJobs24h,
        reposted_jobs: data.repostedJobs,
        top_companies: data.topCompanies ? JSON.stringify(data.topCompanies) : null,
        top_skills: data.topSkills ? JSON.stringify(data.topSkills) : null,
        salary_data: data.salaryData ? JSON.stringify(data.salaryData) : null,
        location_breakdown: data.locationBreakdown ? JSON.stringify(data.locationBreakdown) : null,
        industry_breakdown: data.industryBreakdown ? JSON.stringify(data.industryBreakdown) : null,
        employment_types: data.employmentTypes ? JSON.stringify(data.employmentTypes) : null,
        emerging_titles: data.emergingTitles ? JSON.stringify(data.emergingTitles) : null,
        repost_analysis: data.repostAnalysis ? JSON.stringify(data.repostAnalysis) : null,
        time_to_fill: data.timeToFill ? JSON.stringify(data.timeToFill) : null,
        voyager_request_id: data.voyagerRequestId ?? null,
        raw_metadata: data.rawMetadata ? JSON.stringify(data.rawMetadata) : null,
      })
      .onConflictDoUpdate({
        target: [voyagerSnapshots.snapshot_date, voyagerSnapshots.query],
        set: {
          total_jobs: data.totalJobs,
          remote_jobs: data.remoteJobs,
          new_jobs_24h: data.newJobs24h,
          reposted_jobs: data.repostedJobs,
          top_companies: data.topCompanies ? JSON.stringify(data.topCompanies) : null,
          top_skills: data.topSkills ? JSON.stringify(data.topSkills) : null,
          salary_data: data.salaryData ? JSON.stringify(data.salaryData) : null,
          location_breakdown: data.locationBreakdown ? JSON.stringify(data.locationBreakdown) : null,
          industry_breakdown: data.industryBreakdown ? JSON.stringify(data.industryBreakdown) : null,
          employment_types: data.employmentTypes ? JSON.stringify(data.employmentTypes) : null,
          emerging_titles: data.emergingTitles ? JSON.stringify(data.emergingTitles) : null,
          repost_analysis: data.repostAnalysis ? JSON.stringify(data.repostAnalysis) : null,
          time_to_fill: data.timeToFill ? JSON.stringify(data.timeToFill) : null,
        },
      });
  }

  // =========================================================================
  // Full dashboard — run all analytics in parallel
  // =========================================================================

  /**
   * Run all 10 analytics metrics for a comprehensive market dashboard.
   * Returns a merged result object suitable for the GraphQL resolver.
   */
  async getFullDashboard(query?: string) {
    const targetQuery = query ?? this.config.trackedQueries[0];

    const [
      jobCounts,
      hiringVelocity,
      growthReport,
      salaryTrends,
      skillsDemand,
      timeToFill,
      repostAnalysis,
      competitiveAnalysis,
      emergingRoles,
      arbitrage,
    ] = await Promise.all([
      this.getDailyJobCounts(targetQuery, "30d"),
      this.getCompanyHiringVelocity(20),
      this.getGrowthReport("30d"),
      this.getSalaryTrends(targetQuery, "90d"),
      this.getSkillsDemand(targetQuery, "30d"),
      this.getTimeToFill(),
      this.getRepostAnalysis(),
      this.getCompetitiveAnalysis("30d"),
      this.getEmergingRoles("90d"),
      this.getGeographicArbitrage(20),
    ]);

    return {
      query: targetQuery,
      generatedAt: new Date().toISOString(),
      jobCounts,
      hiringVelocity,
      growthReport,
      salaryTrends,
      skillsDemand,
      timeToFill,
      repostAnalysis,
      competitiveAnalysis,
      emergingRoles,
      arbitrage,
    };
  }
}
