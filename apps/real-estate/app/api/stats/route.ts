import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

function getSQL() {
  return neon(process.env.DATABASE_URL!);
}

// ── Types ───────────────────────────────────────────────────────────

export type VerdictBreakdown = {
  verdict: string;
  count: number;
  pct: number;
};

export type TopZone = {
  city: string;
  zone: string;
  avg_price_per_m2: number;
  avg_investment_score: number | null;
  listing_count: number;
  best_deal_deviation_pct: number | null;
};

export type CitySnapshot = {
  city: string;
  listing_count: number;
  avg_price_per_m2: number;
  avg_investment_score: number | null;
};

export type RecentActivity = {
  date: string;
  count: number;
};

export type StatsData = {
  totalListings: number;
  totalCities: number;
  totalZones: number;
  verdictBreakdown: VerdictBreakdown[];
  avgInvestmentScore: number | null;
  avgPricePerM2: number | null;
  avgPriceEur: number | null;
  medianPriceEur: number | null;
  topZonesByValue: TopZone[];
  topZonesByScore: TopZone[];
  citySnapshots: CitySnapshot[];
  recentActivity: RecentActivity[];
  priceSnapshotCount: number;
  watchlistCount: number;
};

// ── GET handler ─────────────────────────────────────────────────────

export async function GET() {
  const sql = getSQL();

  try {
    const [
      summaryRows,
      verdictRows,
      topValueRows,
      topScoreRows,
      cityRows,
      activityRows,
      snapshotCountRows,
      watchlistCountRows,
    ] = await Promise.all([
      // 1. Overall summary stats
      sql`
        SELECT
          COUNT(*)::int AS total_listings,
          COUNT(DISTINCT listing->>'city')::int AS total_cities,
          COUNT(DISTINCT COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown'))::int AS total_zones,
          ROUND(AVG((valuation->>'investment_score')::numeric), 1) AS avg_investment_score,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(AVG((listing->>'price_eur')::numeric))::int AS avg_price_eur,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY (listing->>'price_eur')::numeric
          ))::int AS median_price_eur
        FROM analysis_results
        WHERE listing->>'city' IS NOT NULL
      `,

      // 2. Verdict breakdown with percentages
      sql`
        WITH totals AS (
          SELECT COUNT(*)::numeric AS n
          FROM analysis_results
          WHERE valuation->>'verdict' IS NOT NULL
        )
        SELECT
          valuation->>'verdict' AS verdict,
          COUNT(*)::int AS count,
          ROUND(COUNT(*)::numeric / NULLIF((SELECT n FROM totals), 0) * 100, 1) AS pct
        FROM analysis_results
        WHERE valuation->>'verdict' IS NOT NULL
        GROUP BY valuation->>'verdict'
        ORDER BY count DESC
      `,

      // 3. Top zones by value (lowest avg price/m2 -- best value)
      sql`
        SELECT
          listing->>'city' AS city,
          COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown') AS zone,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(AVG((valuation->>'investment_score')::numeric), 1) AS avg_investment_score,
          COUNT(*)::int AS listing_count,
          ROUND(MIN((valuation->>'price_deviation_pct')::numeric), 1) AS best_deal_deviation_pct
        FROM analysis_results
        WHERE listing->>'price_per_m2' IS NOT NULL
          AND listing->>'city' IS NOT NULL
        GROUP BY listing->>'city', COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown')
        HAVING COUNT(*) >= 2
        ORDER BY avg_price_per_m2 ASC
        LIMIT 10
      `,

      // 4. Top zones by investment score
      sql`
        SELECT
          listing->>'city' AS city,
          COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown') AS zone,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(AVG((valuation->>'investment_score')::numeric), 1) AS avg_investment_score,
          COUNT(*)::int AS listing_count,
          ROUND(MIN((valuation->>'price_deviation_pct')::numeric), 1) AS best_deal_deviation_pct
        FROM analysis_results
        WHERE (valuation->>'investment_score')::numeric IS NOT NULL
          AND listing->>'city' IS NOT NULL
        GROUP BY listing->>'city', COALESCE(NULLIF(listing->>'zone', 'null'), 'Unknown')
        HAVING COUNT(*) >= 2
        ORDER BY avg_investment_score DESC
        LIMIT 10
      `,

      // 5. Per-city snapshot
      sql`
        SELECT
          listing->>'city' AS city,
          COUNT(*)::int AS listing_count,
          ROUND(AVG((listing->>'price_per_m2')::numeric))::int AS avg_price_per_m2,
          ROUND(AVG((valuation->>'investment_score')::numeric), 1) AS avg_investment_score
        FROM analysis_results
        WHERE listing->>'city' IS NOT NULL
        GROUP BY listing->>'city'
        ORDER BY listing_count DESC
      `,

      // 6. Recent analysis activity (last 30 days, grouped by date)
      sql`
        SELECT
          TO_CHAR(analyzed_at, 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count
        FROM analysis_results
        WHERE analyzed_at >= NOW() - INTERVAL '30 days'
          AND analyzed_at IS NOT NULL
        GROUP BY TO_CHAR(analyzed_at, 'YYYY-MM-DD')
        ORDER BY date ASC
      `,

      // 7. Price snapshot count
      sql`SELECT COUNT(*)::int AS count FROM price_snapshots`,

      // 8. Watchlist count (table may not exist yet)
      sql`
        SELECT COUNT(*)::int AS count
        FROM information_schema.tables
        WHERE table_name = 'watchlist'
      `.then(async (rows) => {
        if (rows[0]?.count > 0) {
          return sql`SELECT COUNT(*)::int AS count FROM watchlist`;
        }
        return [{ count: 0 }];
      }),
    ]);

    const summary = summaryRows[0] ?? {};

    const data: StatsData = {
      totalListings: summary.total_listings ?? 0,
      totalCities: summary.total_cities ?? 0,
      totalZones: summary.total_zones ?? 0,
      verdictBreakdown: verdictRows as unknown as VerdictBreakdown[],
      avgInvestmentScore: summary.avg_investment_score ?? null,
      avgPricePerM2: summary.avg_price_per_m2 ?? null,
      avgPriceEur: summary.avg_price_eur ?? null,
      medianPriceEur: summary.median_price_eur ?? null,
      topZonesByValue: topValueRows as unknown as TopZone[],
      topZonesByScore: topScoreRows as unknown as TopZone[],
      citySnapshots: cityRows as unknown as CitySnapshot[],
      recentActivity: activityRows as unknown as RecentActivity[],
      priceSnapshotCount: snapshotCountRows[0]?.count ?? 0,
      watchlistCount: watchlistCountRows[0]?.count ?? 0,
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[stats GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
