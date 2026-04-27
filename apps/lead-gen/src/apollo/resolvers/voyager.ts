/**
 * Voyager API Integration Resolvers
 *
 * Proxies LinkedIn Voyager API (job search, job counts) through GraphQL,
 * persists results into linkedin_posts (type='job'), and creates
 * intent_signals (hiring_intent, source_type='job_posting') for companies
 * with active job postings.
 *
 * The Voyager API requires a CSRF token from an authenticated LinkedIn
 * session. In production this comes from the Chrome extension forwarding
 * the token; in dev/scripts it can be passed via the x-voyager-csrf header.
 */

import { eq, and, inArray, desc } from "drizzle-orm";
import { companies, intentSignals } from "@/db/schema";
import type {
  Company as DbCompany,
  NewIntentSignal,
} from "@/db/schema";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { listD1Posts, upsertD1Posts, type UpsertPostInput } from "@/lib/posts-d1-client";

// ── Voyager API constants ────────────────────────────────────────────

const VOYAGER_JOB_CARDS_URL =
  "https://www.linkedin.com/voyager/api/voyagerJobsDashJobCards";
const VOYAGER_DECORATION_ID =
  "com.linkedin.voyager.dash.deco.jobs.search.JobSearchCardsCollection-227";
const VOYAGER_GEO_WORLDWIDE = "92000000";
const VOYAGER_WORKPLACE_REMOTE = 2;
const MAX_VOYAGER_RESULTS = 100;
const VOYAGER_PAGE_SIZE = 25;

// Intent signal defaults for hiring_intent from job postings
const HIRING_INTENT_DECAY_DAYS = 30;
const HIRING_INTENT_BASE_CONFIDENCE = 0.75;

// ── Types ────────────────────────────────────────────────────────────

interface VoyagerJobCard {
  urn: string;
  title: string;
  companyName: string | null;
  companyNumericId: string | null;
  location: string | null;
  workplaceType: number | null;
  employmentType: string | null;
  postedAt: string | null;
  url: string;
  linkedInPostId: number | null;
}

interface VoyagerRawElement {
  entityUrn?: string;
  jobPostingTitle?: string;
  primaryDescription?: { text?: string };
  secondaryDescription?: { text?: string };
  tertiaryDescription?: { text?: string };
  trackingUrn?: string;
  listedAt?: number; // epoch ms
  formattedLocation?: string;
  workplaceType?:
    | string
    | { $type?: string; localizedName?: string; code?: number };
}

interface VoyagerRawResponse {
  elements?: VoyagerRawElement[];
  included?: VoyagerRawElement[];
  paging?: { total?: number; count?: number; start?: number };
  data?: { paging?: { total?: number } };
}

// ── Voyager API client ───────────────────────────────────────────────

/**
 * Build the Voyager jobSearch URL for a given set of filters.
 */
function buildVoyagerJobSearchUrl(params: {
  companyIds?: string[];
  keywords?: string;
  geoId?: string;
  workplaceType?: number;
  limit?: number;
  offset?: number;
}): string {
  const url = new URL(VOYAGER_JOB_CARDS_URL);
  url.searchParams.set("decorationId", VOYAGER_DECORATION_ID);
  url.searchParams.set(
    "count",
    String(Math.min(params.limit ?? VOYAGER_PAGE_SIZE, MAX_VOYAGER_RESULTS)),
  );
  url.searchParams.set("start", String(params.offset ?? 0));
  url.searchParams.set("q", "jobSearch");

  // Build the query filter string
  const filters: string[] = [];
  if (params.companyIds?.length) {
    filters.push(`company:List(${params.companyIds.join(",")})`);
  }
  if (params.workplaceType != null) {
    filters.push(`workplaceType:List(${params.workplaceType})`);
  }

  const keywordsStr = params.keywords ? `,keywords:${params.keywords}` : "";
  const filtersStr = filters.length > 0 ? `,selectedFilters:(${filters.join(",")})` : "";
  url.searchParams.set(
    "query",
    `(origin:JOB_SEARCH_PAGE_JOB_FILTER${filtersStr}${keywordsStr},spellCorrectionEnabled:true)`,
  );

  const geoId = params.geoId ?? VOYAGER_GEO_WORLDWIDE;
  url.searchParams.set("locationUnion", `(geoId:${geoId})`);

  return url.toString();
}

/**
 * Call the Voyager API with the given CSRF token.
 * Returns raw JSON response or throws.
 */
async function callVoyagerApi(
  url: string,
  csrfToken: string,
): Promise<VoyagerRawResponse> {
  const res = await fetch(url, {
    headers: {
      "csrf-token": csrfToken,
      "x-restli-protocol-version": "2.0.0",
      Accept: "application/vnd.linkedin.normalized+json+2.1",
    },
    credentials: "include",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(`Voyager auth error: ${res.status} — LinkedIn session may be expired`);
  }
  if (res.status === 429) {
    throw new Error("Voyager rate limited (429) — retry after backoff");
  }
  if (!res.ok) {
    throw new Error(`Voyager API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<VoyagerRawResponse>;
}

/**
 * Parse Voyager raw response into typed job cards.
 */
function parseVoyagerJobCards(raw: VoyagerRawResponse): VoyagerJobCard[] {
  const elements = raw.elements ?? raw.included ?? [];
  const cards: VoyagerJobCard[] = [];

  for (const el of elements) {
    // Filter to actual job posting entities
    if (
      !el.entityUrn?.includes("jobPosting") &&
      !el.trackingUrn?.includes("jobPosting")
    ) {
      continue;
    }

    const urn = el.entityUrn ?? el.trackingUrn ?? "";
    // Extract numeric job ID from URN
    const jobIdMatch = urn.match(/(\d+)$/);
    const jobId = jobIdMatch?.[1] ?? "";

    // Parse listedAt epoch to ISO
    const postedAt = el.listedAt
      ? new Date(el.listedAt).toISOString()
      : null;

    // Parse workplace type
    let workplaceType: number | null = null;
    if (typeof el.workplaceType === "object" && el.workplaceType?.code != null) {
      workplaceType = el.workplaceType.code;
    } else if (typeof el.workplaceType === "string") {
      if (el.workplaceType.includes("REMOTE")) workplaceType = 2;
      else if (el.workplaceType.includes("HYBRID")) workplaceType = 3;
      else workplaceType = 1;
    }

    cards.push({
      urn,
      title: el.jobPostingTitle ?? el.primaryDescription?.text ?? "Unknown",
      companyName: el.secondaryDescription?.text ?? null,
      companyNumericId: null, // Populated by caller from query context
      location: el.formattedLocation ?? el.tertiaryDescription?.text ?? null,
      workplaceType,
      employmentType: null, // Not reliably in jobCards response
      postedAt,
      url: jobId
        ? `https://www.linkedin.com/jobs/view/${jobId}`
        : `https://www.linkedin.com/jobs/search/`,
      linkedInPostId: null,
    });
  }

  return cards;
}

/**
 * Extract CSRF token from request headers.
 * The Chrome extension forwards it via x-voyager-csrf header.
 */
function extractCsrfToken(context: GraphQLContext): string {
  // In production, the CSRF token is forwarded by the Chrome extension
  // via a custom header. For server-to-server, it must be provided.
  const token =
    (context as unknown as { req?: { headers?: Record<string, string> } }).req
      ?.headers?.["x-voyager-csrf"] ?? null;

  if (!token) {
    throw new Error(
      "Missing x-voyager-csrf header. " +
        "The Voyager API requires an authenticated LinkedIn session. " +
        "Forward the CSRF token from the Chrome extension.",
    );
  }
  return token;
}

// ── Helpers: Voyager → linkedin_posts mapping ────────────────────────

function voyagerCardToD1PostInput(
  card: VoyagerJobCard,
  companyId: number | null,
  companyKey: string,
  companyName: string | null,
): UpsertPostInput {
  return {
    type: "job",
    company_key: companyKey,
    company_id: companyId,
    company_name: companyName,
    post_url: card.url,
    title: card.title,
    content: null, // Voyager jobCards don't include full description
    location: card.location,
    employment_type: card.employmentType,
    posted_at: card.postedAt,
    voyager_urn: card.urn,
    voyager_workplace_type: card.workplaceType != null ? String(card.workplaceType) : null,
    raw_data: JSON.stringify({
      voyager: true,
      urn: card.urn,
      companyName: card.companyName,
      companyNumericId: card.companyNumericId,
      workplaceType: card.workplaceType,
      syncedAt: new Date().toISOString(),
    }),
  };
}

// ── Helpers: Intent signal creation ──────────────────────────────────

function buildHiringIntentSignal(
  companyId: number,
  jobCount: number,
  companyNumericId: string,
): NewIntentSignal {
  const now = new Date();
  const decaysAt = new Date(
    now.getTime() + HIRING_INTENT_DECAY_DAYS * 24 * 60 * 60 * 1000,
  );

  // Confidence scales with job count: 1 job = 0.75, 5+ = 0.95
  const confidence = Math.min(
    HIRING_INTENT_BASE_CONFIDENCE + Math.log1p(jobCount) * 0.08,
    0.98,
  );

  return {
    company_id: companyId,
    signal_type: "hiring_intent",
    source_type: "job_posting",
    source_url: `https://www.linkedin.com/jobs/search/?f_C=${companyNumericId}&f_WT=2`,
    raw_text: `${jobCount} remote job posting${jobCount > 1 ? "s" : ""} found on LinkedIn via Voyager API`,
    evidence: JSON.stringify([
      `${jobCount} active remote job listings`,
      `Source: LinkedIn Voyager API (company ID ${companyNumericId})`,
      `Synced at ${now.toISOString()}`,
    ]),
    confidence,
    detected_at: now.toISOString(),
    decays_at: decaysAt.toISOString(),
    decay_days: HIRING_INTENT_DECAY_DAYS,
    metadata: JSON.stringify({
      voyagerCompanyNumericId: companyNumericId,
      remoteJobCount: jobCount,
      workplaceType: VOYAGER_WORKPLACE_REMOTE,
    }),
    model_version: "voyager-sync-v1",
  };
}

// ── Resolver map ─────────────────────────────────────────────────────

export const voyagerResolvers = {
  Query: {
    /**
     * Live Voyager job search (not persisted).
     * Requires x-voyager-csrf header from Chrome extension.
     */
    async voyagerJobSearch(
      _parent: unknown,
      args: {
        input: {
          companyIds?: string[] | null;
          keywords?: string | null;
          geoId?: string | null;
          workplaceType?: number | null;
          limit?: number | null;
          offset?: number | null;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const csrfToken = extractCsrfToken(context);
      const { input } = args;

      const limit = Math.min(input.limit ?? VOYAGER_PAGE_SIZE, MAX_VOYAGER_RESULTS);
      const offset = input.offset ?? 0;

      const url = buildVoyagerJobSearchUrl({
        companyIds: input.companyIds ?? undefined,
        keywords: input.keywords ?? undefined,
        geoId: input.geoId ?? undefined,
        workplaceType: input.workplaceType ?? undefined,
        limit,
        offset,
      });

      const raw = await callVoyagerApi(url, csrfToken);
      const jobs = parseVoyagerJobCards(raw);
      const totalCount = raw.paging?.total ?? raw.data?.paging?.total ?? jobs.length;

      // Annotate cards with companyNumericId if a single company was queried
      if (input.companyIds?.length === 1) {
        for (const job of jobs) {
          job.companyNumericId = input.companyIds[0];
        }
      }

      return {
        jobs,
        totalCount,
        hasMore: offset + jobs.length < totalCount,
      };
    },

    /**
     * Cached remote job counts from DB (populated by countRemoteVoyagerJobs mutation).
     * Reads from companies.raw_data -> voyager_remote_job_count metadata or
     * from intent_signals with source_type='job_posting'.
     */
    async voyagerRemoteJobCounts(
      _parent: unknown,
      args: { companyIds: number[] },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      // Get companies with their intent signals for hiring_intent/job_posting
      const companyRows = await context.db
        .select()
        .from(companies)
        .where(inArray(companies.id, args.companyIds));

      const signals = await context.db
        .select()
        .from(intentSignals)
        .where(
          and(
            inArray(intentSignals.company_id, args.companyIds),
            eq(intentSignals.signal_type, "hiring_intent"),
            eq(intentSignals.source_type, "job_posting"),
          ),
        );

      const signalsByCompany = new Map<number, typeof signals>();
      for (const s of signals) {
        const arr = signalsByCompany.get(s.company_id);
        if (arr) arr.push(s);
        else signalsByCompany.set(s.company_id, [s]);
      }

      return companyRows.map((c) => {
        const companySignals = signalsByCompany.get(c.id) ?? [];
        // Get the most recent hiring_intent signal's metadata for job count
        const latestSignal = companySignals[0]; // Already ordered by detected_at desc
        let remoteJobCount = 0;
        let companyNumericId = "";
        let fetchedAt = "";

        if (latestSignal?.metadata) {
          try {
            const meta = JSON.parse(latestSignal.metadata);
            remoteJobCount = meta.remoteJobCount ?? 0;
            companyNumericId = meta.voyagerCompanyNumericId ?? "";
            fetchedAt = latestSignal.detected_at;
          } catch {
            // Ignore parse errors
          }
        }

        // Fallback: extract numeric ID from linkedin_url
        if (!companyNumericId && c.linkedin_url) {
          const match = c.linkedin_url.match(/\/company\/(\d+)/);
          companyNumericId = match?.[1] ?? "";
        }

        return {
          companyId: c.id,
          companyName: c.name,
          companyNumericId,
          remoteJobCount,
          status: latestSignal ? "ok" : "no_data",
          fetchedAt: fetchedAt || c.updated_at,
        };
      });
    },

    /**
     * Get Voyager-sourced jobs stored in linkedin_posts for a specific company.
     */
    async voyagerCompanyJobs(
      _parent: unknown,
      args: { companyId: number; limit?: number | null; offset?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;

      // Posts now in D1; the raw_data->>'voyager' filter happens client-side.
      // The list is page-bounded so a wider fetch + filter is fine.
      const all = await listD1Posts({
        type: "job",
        companyId: args.companyId,
        limit: Math.min(limit + offset + 100, 500),
      });
      const filtered = all.filter((p) => {
        if (!p.raw_data) return false;
        try {
          const r = JSON.parse(p.raw_data);
          return r?.voyager === true;
        } catch {
          return false;
        }
      });
      return filtered.slice(offset, offset + limit);
    },

    /**
     * Aggregate remote-work metrics from Voyager-sourced intent signals.
     */
    async voyagerRemoteMetrics(
      _parent: unknown,
      args: { minRemoteJobs?: number | null },
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const minJobs = args.minRemoteJobs ?? 1;

      // Get all hiring_intent signals from job_posting source
      const signals = await context.db
        .select()
        .from(intentSignals)
        .where(
          and(
            eq(intentSignals.signal_type, "hiring_intent"),
            eq(intentSignals.source_type, "job_posting"),
          ),
        )
        .orderBy(desc(intentSignals.detected_at));

      // Group by company, take most recent signal per company
      const byCompany = new Map<
        number,
        { signal: (typeof signals)[0]; meta: { remoteJobCount: number; voyagerCompanyNumericId: string } }
      >();

      for (const s of signals) {
        if (byCompany.has(s.company_id)) continue; // Already have newer signal
        try {
          const meta = JSON.parse(s.metadata ?? "{}");
          if ((meta.remoteJobCount ?? 0) >= minJobs) {
            byCompany.set(s.company_id, { signal: s, meta });
          }
        } catch {
          // Skip malformed metadata
        }
      }

      // Fetch company details for the matched companies
      const companyIds = [...byCompany.keys()];
      const companyRows =
        companyIds.length > 0
          ? await context.db
              .select()
              .from(companies)
              .where(inArray(companies.id, companyIds))
          : [];

      const companyMap = new Map(companyRows.map((c) => [c.id, c]));

      // Build sorted top companies
      const topCompanies = [...byCompany.entries()]
        .map(([companyId, { signal, meta }]) => ({
          companyId,
          companyName: companyMap.get(companyId)?.name ?? "Unknown",
          companyNumericId: meta.voyagerCompanyNumericId ?? "",
          remoteJobCount: meta.remoteJobCount ?? 0,
          status: "ok" as const,
          fetchedAt: signal.detected_at,
        }))
        .sort((a, b) => b.remoteJobCount - a.remoteJobCount);

      const totalRemoteJobs = topCompanies.reduce(
        (sum, c) => sum + c.remoteJobCount,
        0,
      );

      return {
        totalRemoteJobs,
        companiesWithRemoteJobs: topCompanies.length,
        companiesQueried: topCompanies.length, // All are from Voyager data
        topCompanies: topCompanies.slice(0, 20),
        computedAt: new Date().toISOString(),
      };
    },
  },

  Mutation: {
    /**
     * Fetch jobs from Voyager API and upsert into linkedin_posts.
     * Optionally creates hiring_intent signals.
     * Admin only.
     */
    async syncVoyagerJobs(
      _parent: unknown,
      args: {
        input: {
          companyNumericIds: string[];
          remoteOnly?: boolean | null;
          createIntentSignals?: boolean | null;
          matchCompanies?: boolean | null;
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const csrfToken = extractCsrfToken(context);
      const { input } = args;
      const remoteOnly = input.remoteOnly ?? true;
      const createSignals = input.createIntentSignals ?? true;
      const matchCompanies = input.matchCompanies ?? true;

      let totalUpserted = 0;
      let totalIntentSignals = 0;
      let totalCompaniesMatched = 0;
      const errors: string[] = [];

      // Build a map of linkedin numeric ID -> company row for matching
      const companyLookup = new Map<string, DbCompany>();
      if (matchCompanies) {
        // Match by linkedin_url containing the numeric ID
        const allCompanies = await context.db.select().from(companies);
        for (const c of allCompanies) {
          if (c.linkedin_url) {
            // Extract numeric ID from linkedin_url patterns:
            // /company/12345 or /company/company-name (not numeric, skip)
            const numericMatch = c.linkedin_url.match(/\/company\/(\d+)/);
            if (numericMatch) {
              companyLookup.set(numericMatch[1], c);
            }
          }
        }
      }

      // Process each company in sequence (to avoid Voyager rate limits)
      for (const numericId of input.companyNumericIds) {
        try {
          const url = buildVoyagerJobSearchUrl({
            companyIds: [numericId],
            workplaceType: remoteOnly ? VOYAGER_WORKPLACE_REMOTE : undefined,
            geoId: VOYAGER_GEO_WORLDWIDE,
            limit: MAX_VOYAGER_RESULTS,
            offset: 0,
          });

          const raw = await callVoyagerApi(url, csrfToken);
          const cards = parseVoyagerJobCards(raw);
          const totalCount =
            raw.paging?.total ?? raw.data?.paging?.total ?? cards.length;

          // Annotate with company numeric ID
          for (const card of cards) {
            card.companyNumericId = numericId;
          }

          // Match to existing company
          const matchedCompany = companyLookup.get(numericId) ?? null;
          const companyId = matchedCompany?.id ?? null;
          if (matchedCompany) totalCompaniesMatched++;

          // Upsert job cards into D1 `posts`. D1 requires company_key — the
          // matched company always has one; if there's no match (companyId
          // null), fall back to a synthetic key derived from the LinkedIn
          // numericId so we don't drop rows.
          if (cards.length > 0) {
            const company_key = matchedCompany?.key ?? `_voyager_${numericId}`;
            const company_name = matchedCompany?.name ?? null;

            const CHUNK = 100;
            for (let i = 0; i < cards.length; i += CHUNK) {
              const chunk = cards.slice(i, i + CHUNK);
              const inputs: UpsertPostInput[] = chunk.map((card) =>
                voyagerCardToD1PostInput(card, companyId, company_key, company_name),
              );

              try {
                const r = await upsertD1Posts(inputs);
                totalUpserted += r.upserted;
              } catch (err) {
                errors.push(
                  `Upsert chunk for company ${numericId}: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
          }

          // Create hiring_intent signal if requested and company matched
          if (createSignals && companyId && totalCount > 0) {
            try {
              const signal = buildHiringIntentSignal(
                companyId,
                totalCount,
                numericId,
              );

              await context.db
                .insert(intentSignals)
                .values(signal);

              totalIntentSignals++;
            } catch (err) {
              errors.push(
                `Intent signal for company ${numericId}: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }

          // Small delay between companies to avoid rate limiting
          if (input.companyNumericIds.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        } catch (err) {
          errors.push(
            `Company ${numericId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      return {
        success: errors.length === 0,
        upserted: totalUpserted,
        intentSignalsCreated: totalIntentSignals,
        companiesMatched: totalCompaniesMatched,
        errors,
      };
    },

    /**
     * Count remote jobs for a batch of companies via Voyager API.
     * Stores the count as a hiring_intent signal for each company.
     * Admin only.
     */
    async countRemoteVoyagerJobs(
      _parent: unknown,
      args: {
        input: {
          companyNumericIds: string[];
        };
      },
      context: GraphQLContext,
    ) {
      if (!context.userId || !isAdminEmail(context.userEmail)) {
        throw new Error("Forbidden");
      }

      const csrfToken = extractCsrfToken(context);
      const counts: Array<{
        companyId: number;
        companyName: string;
        companyNumericId: string;
        remoteJobCount: number;
        status: string;
        fetchedAt: string;
      }> = [];
      const errors: string[] = [];

      // Look up companies by linkedin numeric ID
      const allCompanies = await context.db.select().from(companies);
      const companyByNumericId = new Map<string, DbCompany>();
      for (const c of allCompanies) {
        if (c.linkedin_url) {
          const match = c.linkedin_url.match(/\/company\/(\d+)/);
          if (match) companyByNumericId.set(match[1], c);
        }
      }

      for (const numericId of args.input.companyNumericIds) {
        try {
          // Fetch count only (limit=1 to minimize payload)
          const url = buildVoyagerJobSearchUrl({
            companyIds: [numericId],
            workplaceType: VOYAGER_WORKPLACE_REMOTE,
            geoId: VOYAGER_GEO_WORLDWIDE,
            limit: 1,
            offset: 0,
          });

          const raw = await callVoyagerApi(url, csrfToken);
          const total =
            raw.paging?.total ?? raw.data?.paging?.total ?? 0;
          const now = new Date().toISOString();

          const matchedCompany = companyByNumericId.get(numericId);

          counts.push({
            companyId: matchedCompany?.id ?? 0,
            companyName: matchedCompany?.name ?? `LinkedIn Company ${numericId}`,
            companyNumericId: numericId,
            remoteJobCount: total,
            status: "ok",
            fetchedAt: now,
          });

          // Upsert hiring_intent signal if company is matched
          if (matchedCompany && total > 0) {
            const signal = buildHiringIntentSignal(
              matchedCompany.id,
              total,
              numericId,
            );
            await context.db.insert(intentSignals).values(signal);
          }

          // Rate limit delay
          if (args.input.companyNumericIds.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : String(err);
          errors.push(`Company ${numericId}: ${errMsg}`);

          const matchedCompany = companyByNumericId.get(numericId);
          counts.push({
            companyId: matchedCompany?.id ?? 0,
            companyName:
              matchedCompany?.name ?? `LinkedIn Company ${numericId}`,
            companyNumericId: numericId,
            remoteJobCount: 0,
            status: errMsg.includes("429")
              ? "rate_limited"
              : errMsg.includes("401") || errMsg.includes("403")
                ? "auth_error"
                : "error",
            fetchedAt: new Date().toISOString(),
          });
        }
      }

      return {
        success: errors.length === 0,
        counts,
        errors,
      };
    },
  },
};
