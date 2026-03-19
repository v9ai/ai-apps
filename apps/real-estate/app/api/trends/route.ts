import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

function getSQL() {
  return neon(process.env.DATABASE_URL!);
}

// ── Types ───────────────────────────────────────────────────────────

export type ZoneStat = {
  city: string;
  zone: string;
  avg_price_per_m2: number;
  min_price_per_m2: number;
  max_price_per_m2: number;
  sample_count: number;
};

export type VerdictCount = {
  city: string;
  verdict: string;
  count: number;
};

export type Opportunity = {
  url: string;
  title: string;
  city: string;
  zone: string;
  price_eur: number | null;
  price_per_m2: number | null;
  fair_value_eur_per_m2: number | null;
  price_deviation_pct: number;
  investment_score: number | null;
  verdict: string;
  recommendation: string | null;
  condition: string | null;
  size_m2: number | null;
  rooms: number | null;
};

export type MonthlyPriceTrend = {
  month: string;
  city: string;
  avg_price_per_m2: number;
  median_price_eur: number;
  listing_count: number;
};

export type ActiveZone = {
  city: string;
  zone: string;
  listing_count: number;
  avg_price_per_m2: number;
  avg_investment_score: number | null;
};

export type CityComparison = {
  city: string;
  total_listings: number;
  avg_price_eur: number;
  avg_price_per_m2: number;
  avg_investment_score: number | null;
  avg_rental_yield_pct: number | null;
  best_verdict_pct: number;
};

export type InvestmentRanking = {
  url: string;
  title: string;
  city: string;
  zone: string;
  price_eur: number | null;
  investment_score: number;
  rental_yield_pct: number | null;
  price_deviation_pct: number | null;
  verdict: string;
  recommendation: string | null;
};

export type TrendsData = {
  zoneStats: ZoneStat[];
  verdictCounts: VerdictCount[];
  opportunities: Opportunity[];
  monthlyPriceTrends: MonthlyPriceTrend[];
  mostActiveZones: ActiveZone[];
  cityComparisons: CityComparison[];
  investmentRankings: InvestmentRanking[];
};

// ── GET handler ─────────────────────────────────────────────────────

export async function GET() {
  const sql = getSQL();

  try {
    const [
      zoneRows,
      verdictRows,
      opportunityRows,
      monthlyRows,
      activeZoneRows,
      cityCompRows,
      investmentRows,
    ] = await Promise.all([
      // 1. Zone stats: avg, min, max price/m2 per city+zone
      sql`
        SELECT
          listing->>'city' AS city,
          COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown') AS zone,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(MIN((listing->>'price_per_m2')::numeric))::int AS min_price_per_m2,
          ROUND(MAX((listing->>'price_per_m2')::numeric))::int AS max_price_per_m2,
          COUNT(*)::int AS sample_count
        FROM analysis_results
        WHERE listing->>'price_per_m2' IS NOT NULL
          AND listing->>'city' IS NOT NULL
        GROUP BY listing->>'city', COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown')
        ORDER BY avg_price_per_m2 DESC
      `,

      // 2. Verdict counts per city
      sql`
        SELECT
          listing->>'city' AS city,
          valuation->>'verdict' AS verdict,
          COUNT(*)::int AS count
        FROM analysis_results
        WHERE valuation->>'verdict' IS NOT NULL
          AND listing->>'city' IS NOT NULL
        GROUP BY listing->>'city', valuation->>'verdict'
        ORDER BY listing->>'city', count DESC
      `,

      // 3. Opportunities: listings with largest negative deviation (best deals first)
      sql`
        SELECT
          url,
          listing->>'title' AS title,
          listing->>'city' AS city,
          COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown') AS zone,
          (listing->>'price_eur')::int AS price_eur,
          (listing->>'price_per_m2')::numeric AS price_per_m2,
          (valuation->>'fair_value_eur_per_m2')::numeric AS fair_value_eur_per_m2,
          (valuation->>'price_deviation_pct')::numeric AS price_deviation_pct,
          (valuation->>'investment_score')::numeric AS investment_score,
          valuation->>'verdict' AS verdict,
          valuation->>'recommendation' AS recommendation,
          listing->>'condition' AS condition,
          (listing->>'size_m2')::numeric AS size_m2,
          (listing->>'rooms')::int AS rooms
        FROM analysis_results
        WHERE valuation->>'price_deviation_pct' IS NOT NULL
          AND listing->>'city' IS NOT NULL
        ORDER BY (valuation->>'price_deviation_pct')::numeric ASC
        LIMIT 20
      `,

      // 4. Monthly price trends: avg price/m2 and median price per month per city
      sql`
        SELECT
          TO_CHAR(analyzed_at, 'YYYY-MM') AS month,
          listing->>'city' AS city,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (listing->>'price_eur')::numeric))::int AS median_price_eur,
          COUNT(*)::int AS listing_count
        FROM analysis_results
        WHERE listing->>'price_per_m2' IS NOT NULL
          AND listing->>'city' IS NOT NULL
          AND analyzed_at IS NOT NULL
        GROUP BY TO_CHAR(analyzed_at, 'YYYY-MM'), listing->>'city'
        ORDER BY month ASC, city ASC
      `,

      // 5. Most active zones: zones with the most listings, sorted by volume
      sql`
        SELECT
          listing->>'city' AS city,
          COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown') AS zone,
          COUNT(*)::int AS listing_count,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(AVG((valuation->>'investment_score')::numeric), 1) AS avg_investment_score
        FROM analysis_results
        WHERE listing->>'city' IS NOT NULL
        GROUP BY listing->>'city', COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown')
        ORDER BY listing_count DESC
        LIMIT 15
      `,

      // 6. City comparison: aggregate metrics per city
      sql`
        WITH city_data AS (
          SELECT
            listing->>'city' AS city,
            (listing->>'price_eur')::numeric AS price_eur,
            (listing->>'price_per_m2')::numeric AS price_per_m2,
            (valuation->>'investment_score')::numeric AS investment_score,
            (valuation->>'rental_yield_pct')::numeric AS rental_yield_pct,
            valuation->>'verdict' AS verdict
          FROM analysis_results
          WHERE listing->>'city' IS NOT NULL
        )
        SELECT
          city,
          COUNT(*)::int AS total_listings,
          ROUND(AVG(price_eur))::int AS avg_price_eur,
          ROUND(AVG(price_per_m2))::int AS avg_price_per_m2,
          ROUND(AVG(investment_score), 1) AS avg_investment_score,
          ROUND(AVG(rental_yield_pct), 2) AS avg_rental_yield_pct,
          ROUND(
            COUNT(*) FILTER (WHERE verdict ILIKE '%buy%' OR verdict ILIKE '%undervalued%')::numeric
            / NULLIF(COUNT(*)::numeric, 0) * 100, 1
          ) AS best_verdict_pct
        FROM city_data
        GROUP BY city
        ORDER BY total_listings DESC
      `,

      // 7. Investment opportunity ranking: top listings by investment score
      sql`
        SELECT
          url,
          listing->>'title' AS title,
          listing->>'city' AS city,
          COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown') AS zone,
          (listing->>'price_eur')::int AS price_eur,
          (valuation->>'investment_score')::numeric AS investment_score,
          (valuation->>'rental_yield_pct')::numeric AS rental_yield_pct,
          (valuation->>'price_deviation_pct')::numeric AS price_deviation_pct,
          valuation->>'verdict' AS verdict,
          valuation->>'recommendation' AS recommendation
        FROM analysis_results
        WHERE (valuation->>'investment_score')::numeric IS NOT NULL
          AND listing->>'city' IS NOT NULL
        ORDER BY (valuation->>'investment_score')::numeric DESC
        LIMIT 20
      `,
    ]);

    const data: TrendsData = {
      zoneStats: zoneRows as unknown as ZoneStat[],
      verdictCounts: verdictRows as unknown as VerdictCount[],
      opportunities: opportunityRows as unknown as Opportunity[],
      monthlyPriceTrends: monthlyRows as unknown as MonthlyPriceTrend[],
      mostActiveZones: activeZoneRows as unknown as ActiveZone[],
      cityComparisons: cityCompRows as unknown as CityComparison[],
      investmentRankings: investmentRows as unknown as InvestmentRanking[],
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[trends GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch trends data" },
      { status: 500 },
    );
  }
}
