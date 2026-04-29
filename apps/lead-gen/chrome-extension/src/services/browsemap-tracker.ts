// ── Browsemap tracker: capture LinkedIn "More profiles for you" sidebar ──
//
// Talks to the agenticleadgen-edge Cloudflare Worker's D1 `linkedin_browsemap`
// table via the route added in edge/src/index.ts:
//
//   POST /api/linkedin/d1/browsemap/upsert
//
// Reuses the same env vars as `visit-tracker.ts` / `jobs-d1-importer.ts`.
//
// Errors are intentionally non-fatal: the recruiter loop must never block on
// this call, so all failures are swallowed.

const API_URL =
  import.meta.env.VITE_JOBS_D1_API_URL ?? "http://localhost:8787";
const TOKEN = (import.meta.env.VITE_JOBS_D1_TOKEN as string | undefined) ?? "";

console.log(
  `[BrowsemapTracker] D1 base resolved to: ${API_URL}` +
    (API_URL.includes("localhost") ? " ⚠️ localhost fallback — set VITE_JOBS_D1_API_URL." : "") +
    (TOKEN ? "" : " ⚠️ VITE_JOBS_D1_TOKEN unset — browsemap upserts will fail with 401."),
);

export interface BrowsemapRecommendation {
  profile_url: string;
  slug: string;
  name: string;
  headline: string | null;
  degree: string | null;
  is_verified: boolean;
  is_premium: boolean;
  avatar_url: string | null;
  position: number;
}

export async function recordBrowsemap(
  sourceProfileUrl: string,
  recommendations: BrowsemapRecommendation[],
): Promise<void> {
  if (recommendations.length === 0) return;
  const url = `${API_URL}/api/linkedin/d1/browsemap/upsert`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        source_profile_url: sourceProfileUrl,
        recommendations,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      console.warn(
        `[BrowsemapTracker] upsert ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      );
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { count?: number };
    console.log(
      `[BrowsemapTracker] upserted ${data.count ?? "?"} recommendations from ${sourceProfileUrl} (${Date.now() - t0}ms)`,
    );
  } catch (err) {
    console.warn(
      `[BrowsemapTracker] network error → ${url}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}
