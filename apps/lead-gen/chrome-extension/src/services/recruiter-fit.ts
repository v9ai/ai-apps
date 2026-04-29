// ── Ideal-recruiter fit scorer (post-scrape hook) ───────────────────
//
// After the Browse Recruiters loop saves a profile + scrapes their recent
// posts to D1, this service runs the score_recruiter_fit langgraph against
// the gathered data and persists the verdict to D1.
//
// Flow: extension → POST {LANGGRAPH_URL}/runs/wait → POST {edge}/api/contacts/d1/recruiter-fit/upsert.
// All errors are non-fatal — failures log and return null so the caller's
// outer recruiter loop is never blocked by a scoring hiccup.

import { runGraph } from "./langgraph";
import { gqlRequest } from "./graphql";

const D1_API_URL =
  (import.meta.env.VITE_JOBS_D1_API_URL as string | undefined) ??
  "http://localhost:8787";
const D1_TOKEN = (import.meta.env.VITE_JOBS_D1_TOKEN as string | undefined) ?? "";

export interface RecruiterFitInput {
  contactId: number | null;
  linkedinUrl: string;
  name: string;
  headline: string;
  employer: string;
  about: string;
  recentPosts: string[];
}

export interface RecruiterFitVerdict {
  fit_score: number;
  tier: "ideal" | "strong" | "weak" | "off_target";
  specialty: "ai_ml" | "engineering_general" | "non_technical" | "unknown";
  remote_global: boolean | null;
  reasons: string[];
}

const ALLOWED_TIERS = new Set(["ideal", "strong", "weak", "off_target"]);
const ALLOWED_SPECIALTIES = new Set([
  "ai_ml",
  "engineering_general",
  "non_technical",
  "unknown",
]);

/**
 * Run the score_recruiter_fit graph and persist the verdict to D1.
 * Returns the verdict on success, null on any failure.
 */
export async function scoreAndPersistRecruiterFit(
  input: RecruiterFitInput,
): Promise<RecruiterFitVerdict | null> {
  const result = await runGraph<{
    fit_score?: number;
    tier?: string;
    specialty?: string;
    remote_global?: boolean | null;
    reasons?: unknown;
  }>({
    assistantId: "score_recruiter_fit",
    input: {
      contact_id: input.contactId,
      name: input.name,
      headline: input.headline,
      employer: input.employer,
      about: input.about,
      recent_posts: input.recentPosts,
    },
  });

  if (!result.ok || !result.output) {
    console.warn(
      `[RecruiterFit] graph failed for ${input.linkedinUrl}: ${result.error ?? "unknown"}`,
    );
    return null;
  }

  const verdict = normalizeVerdict(result.output);
  if (!verdict) {
    console.warn(
      `[RecruiterFit] graph returned malformed verdict for ${input.linkedinUrl}:`,
      result.output,
    );
    return null;
  }

  console.log(
    `[RecruiterFit] ${input.linkedinUrl} → ${verdict.tier} (${verdict.fit_score}, ${verdict.specialty})`,
  );

  await Promise.all([
    persistVerdict(input.contactId, input.linkedinUrl, verdict),
    persistVerdictToNeon(input.contactId, verdict),
  ]);
  return verdict;
}

async function persistVerdictToNeon(
  contactId: number | null,
  verdict: RecruiterFitVerdict,
): Promise<void> {
  if (contactId === null) return;
  try {
    const result = await gqlRequest(
      `mutation SetRecruiterFit(
        $contactId: Int!
        $fitScore: Float!
        $tier: String!
        $specialty: String!
        $remoteGlobal: Boolean
        $reasons: [String!]
      ) {
        setRecruiterFit(
          contactId: $contactId
          fitScore: $fitScore
          tier: $tier
          specialty: $specialty
          remoteGlobal: $remoteGlobal
          reasons: $reasons
        ) { id recruiterFitTier recruiterFitScoredAt }
      }`,
      {
        contactId,
        fitScore: verdict.fit_score,
        tier: verdict.tier,
        specialty: verdict.specialty,
        remoteGlobal: verdict.remote_global,
        reasons: verdict.reasons,
      },
    );
    if (result.errors?.length) {
      console.warn(
        `[RecruiterFit] Neon setRecruiterFit error:`,
        result.errors[0].message,
      );
    }
  } catch (err) {
    console.warn(
      `[RecruiterFit] Neon setRecruiterFit threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function normalizeVerdict(raw: {
  fit_score?: number;
  tier?: string;
  specialty?: string;
  remote_global?: boolean | null;
  reasons?: unknown;
}): RecruiterFitVerdict | null {
  if (typeof raw.fit_score !== "number" || !Number.isFinite(raw.fit_score)) return null;
  if (typeof raw.tier !== "string" || !ALLOWED_TIERS.has(raw.tier)) return null;
  if (typeof raw.specialty !== "string" || !ALLOWED_SPECIALTIES.has(raw.specialty)) return null;

  const remote =
    raw.remote_global === true || raw.remote_global === false ? raw.remote_global : null;
  const reasons = Array.isArray(raw.reasons)
    ? raw.reasons.filter((r): r is string => typeof r === "string").slice(0, 3)
    : [];

  return {
    fit_score: Math.max(0, Math.min(1, raw.fit_score)),
    tier: raw.tier as RecruiterFitVerdict["tier"],
    specialty: raw.specialty as RecruiterFitVerdict["specialty"],
    remote_global: remote,
    reasons,
  };
}

async function persistVerdict(
  contactId: number | null,
  linkedinUrl: string,
  verdict: RecruiterFitVerdict,
): Promise<void> {
  if (!D1_TOKEN) {
    console.warn(
      "[RecruiterFit] VITE_JOBS_D1_TOKEN unset — skipping D1 persist",
    );
    return;
  }

  try {
    const res = await fetch(
      `${D1_API_URL.replace(/\/$/, "")}/api/contacts/d1/recruiter-fit/upsert`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${D1_TOKEN}`,
        },
        body: JSON.stringify({
          contact_id: contactId,
          linkedin_url: linkedinUrl,
          fit_score: verdict.fit_score,
          tier: verdict.tier,
          specialty: verdict.specialty,
          remote_global: verdict.remote_global,
          reasons: verdict.reasons,
        }),
      },
    );
    if (!res.ok) {
      console.warn(
        `[RecruiterFit] D1 upsert ${res.status}: ${await res.text().catch(() => "")}`,
      );
    }
  } catch (err) {
    console.warn(
      `[RecruiterFit] D1 upsert threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
