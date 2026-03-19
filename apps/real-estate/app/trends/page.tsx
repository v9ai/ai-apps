import { neon } from "@neondatabase/serverless";
import { TrendCharts } from "@/components/trend-charts";
import { Topbar } from "@/components/topbar";
import { Footer } from "@/components/footer";
import type {
  TrendsData,
  ZoneStat,
  VerdictCount,
  Opportunity,
  MonthlyPriceTrend,
  ActiveZone,
  CityComparison,
  InvestmentRanking,
} from "@/app/api/trends/route";

export const dynamic = "force-dynamic";

async function getTrendsData(): Promise<TrendsData> {
  const sql = neon(process.env.DATABASE_URL!);

  const [
    zoneRows,
    verdictRows,
    opportunityRows,
    monthlyRows,
    activeZoneRows,
    cityCompRows,
    investmentRows,
  ] = await Promise.all([
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

  return {
    zoneStats: zoneRows as unknown as ZoneStat[],
    verdictCounts: verdictRows as unknown as VerdictCount[],
    opportunities: opportunityRows as unknown as Opportunity[],
    monthlyPriceTrends: monthlyRows as unknown as MonthlyPriceTrend[],
    mostActiveZones: activeZoneRows as unknown as ActiveZone[],
    cityComparisons: cityCompRows as unknown as CityComparison[],
    investmentRankings: investmentRows as unknown as InvestmentRanking[],
  };
}

export default async function TrendsPage() {
  const data = await getTrendsData();

  const totalListings =
    data.verdictCounts.reduce((s, v) => s + v.count, 0);
  const totalZones = data.zoneStats.length;

  return (
    <div>
      <Topbar />

      {/* Hero */}
      <div className="hero" style={{ paddingBottom: 32 }}>
        <div className="hero-glow" />
        <div className="hero-grid-bg" />
        <div className="hero-content">
          <div className="hero-kicker">Market Intelligence</div>
          <h1 className="hero-title">
            Market <span className="hero-title-accent">Trends</span>
          </h1>
          <p className="hero-subtitle">
            Aggregated pricing data and valuation insights across{" "}
            {totalZones} zone{totalZones !== 1 ? "s" : ""} and{" "}
            {totalListings} analyzed listing{totalListings !== 1 ? "s" : ""}.
          </p>

          {totalListings > 0 && (
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-number">{totalListings}</span>
                <span className="hero-stat-label">Listings</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-number">{totalZones}</span>
                <span className="hero-stat-label">Zones</span>
              </div>
              {data.zoneStats.length > 0 && (
                <div className="hero-stat">
                  <span className="hero-stat-number">
                    {"\u20AC"}
                    {Math.round(
                      data.zoneStats.reduce(
                        (s, z) => s + z.avg_price_per_m2 * z.sample_count,
                        0
                      ) /
                        data.zoneStats.reduce((s, z) => s + z.sample_count, 0)
                    ).toLocaleString()}
                  </span>
                  <span className="hero-stat-label">Avg /m{"\u00B2"}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="hero-bottom-line" />
      </div>

      {/* Charts */}
      <TrendCharts data={data} />

      <Footer />
    </div>
  );
}
