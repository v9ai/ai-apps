import { neon } from "@neondatabase/serverless";
import { DashboardContent, type AnalysisRow } from "./_content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Dashboard | Real Estate AI Research",
};

async function fetchAnalyses(): Promise<AnalysisRow[]> {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT url, source, listing, valuation, analyzed_at
    FROM analysis_results
    ORDER BY analyzed_at DESC
  `;
  return rows as unknown as AnalysisRow[];
}

export default async function DashboardPage() {
  const rows = await fetchAnalyses();
  return <DashboardContent rows={rows} />;
}
