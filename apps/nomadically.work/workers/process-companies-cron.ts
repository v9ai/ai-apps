/**
 * Cloudflare Workers Cron — Company Processing & Job Fetching
 *
 * Runs on a schedule (default: every 6 hours) to:
 * 1. Query newly added AI-tier companies from the companies table (Neon)
 * 2. Fetch jobs from discovered ATS sources (Ashby, Greenhouse, Lever)
 * 3. Upsert jobs into Neon
 */

import { neon } from "@neondatabase/serverless";

interface Env {
  NEON_DATABASE_URL: string;
  PROCESS_JOBS_WORKER_URL?: string;
  PROCESS_JOBS_QUEUE?: Queue<ProcessJobsMessage>;
}

type Queue<T = unknown> = {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
};

type ProcessJobsMessage = {
  action: "process" | "enhance" | "tag" | "classify";
  limit: number;
};

type ScheduledEvent = {
  scheduledTime: number;
  cron: string;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

interface Company {
  id: number;
  key: string;
  name: string;
  website?: string;
  category?: string;
  created_at: string;
}

interface Job {
  external_id: string;
  source_kind: string;
  company_key: string;
  title: string;
  location?: string;
  url: string;
  description?: string;
  posted_at: string;
}

// ---------------------------------------------------------------------------
// Ashby Job Fetching
// ---------------------------------------------------------------------------

interface AshbyJobPosting {
  id: string;
  title: string;
  location: string;
  locationName?: string;
  jobUrl: string;
  applyUrl?: string;
  description: string;
  isRemote: boolean;
  isListed: boolean;
  team?: { id: string; name: string };
  department?: { id: string; name: string };
  employmentType?: string;
  publishedAt?: string;
  secondaryLocations?: Array<{
    location: string;
    address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string };
  }>;
  compensation?: { currency?: string; tiers?: Array<{ id: string; title: string }> };
}

interface AshbyBoardResponse {
  title: string;
  jobs: AshbyJobPosting[];
}

export async function fetchAshbyJobs(boardName: string): Promise<Job[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardName}?includeCompensation=true`;
  const jobs: Job[] = [];

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "nomadically-work-cron/1.0" },
    });

    if (!response.ok) {
      console.error(`Ashby API error for ${boardName}: ${response.status}`);
      return jobs;
    }

    const data = (await response.json()) as AshbyBoardResponse;
    if (!data.jobs?.length) return jobs;

    for (const posting of data.jobs) {
      if (!posting.isListed) continue;

      let location = posting.locationName || posting.location ||
               posting.secondaryLocations?.[0]?.location || "";
      if (posting.isRemote && !location) {
        location = "Remote";
      } else if (posting.isRemote && location && !location.toLowerCase().includes("remote")) {
        location = `Remote - ${location}`;
      }

      jobs.push({
        external_id: posting.id,
        source_kind: "ashby",
        company_key: boardName,
        title: posting.title,
        location,
        url: posting.jobUrl,
        description: posting.description,
        posted_at: posting.publishedAt || new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error(`Error fetching Ashby jobs for ${boardName}:`, error);
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Greenhouse Job Fetching
// ---------------------------------------------------------------------------

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  internal_job_id: number;
  updated_at: string;
  publication_date: string;
  location?: { name?: string };
  content?: string;
}

export async function fetchGreenhouseJobs(companyKey: string): Promise<Job[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${companyKey}/jobs`;
  const jobs: Job[] = [];

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "nomadically-work-cron/1.0" },
    });

    if (!response.ok) {
      console.error(`Greenhouse API error for ${companyKey}: ${response.status}`);
      return jobs;
    }

    const data = (await response.json()) as { jobs?: GreenhouseJob[] };
    if (!data.jobs?.length) return jobs;

    for (const job of data.jobs) {
      jobs.push({
        external_id: String(job.internal_job_id),
        source_kind: "greenhouse",
        company_key: companyKey,
        title: job.title,
        location: job.location?.name,
        url: job.absolute_url,
        description: job.content,
        posted_at: job.publication_date || job.updated_at,
      });
    }
  } catch (error) {
    console.error(`Error fetching Greenhouse jobs for ${companyKey}:`, error);
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Lever Job Fetching
// ---------------------------------------------------------------------------

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories?: { location?: string };
  descriptionPlain?: string;
}

export async function fetchLeverJobs(companyKey: string): Promise<Job[]> {
  const url = `https://api.lever.co/v0/postings/${companyKey}`;
  const jobs: Job[] = [];

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "nomadically-work-cron/1.0" },
    });

    if (!response.ok) {
      console.error(`Lever API error for ${companyKey}: ${response.status}`);
      return jobs;
    }

    const data = (await response.json()) as LeverJob[];
    if (!Array.isArray(data) || !data.length) return jobs;

    for (const posting of data) {
      jobs.push({
        external_id: posting.id,
        source_kind: "lever",
        company_key: companyKey,
        title: posting.text,
        location: posting.categories?.location,
        url: posting.hostedUrl,
        description: posting.descriptionPlain,
        posted_at: new Date(posting.createdAt).toISOString(),
      });
    }
  } catch (error) {
    console.error(`Error fetching Lever jobs for ${companyKey}:`, error);
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Database Operations (Neon)
// ---------------------------------------------------------------------------

export async function getRecentCompanies(
  sql: ReturnType<typeof neon>,
  hoursAgo: number = 24,
): Promise<Company[]> {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return sql<Company>`
    SELECT id, key, name, website, category, created_at
    FROM companies
    WHERE created_at > ${since}
      AND category != 'DIRECTORY'
      AND ai_tier >= 1
      AND (is_hidden IS NULL OR is_hidden = false)
    ORDER BY ai_tier DESC, ai_classification_confidence DESC, created_at DESC
    LIMIT 100
  `;
}

export async function upsertJob(sql: ReturnType<typeof neon>, job: Job): Promise<void> {
  const now = new Date().toISOString();

  // Ensure company exists
  await sql`
    INSERT INTO companies (key, name, created_at, updated_at)
    VALUES (${job.company_key}, ${job.company_key}, ${now}, ${now})
    ON CONFLICT (key) DO NOTHING
  `;

  await sql`
    INSERT INTO jobs (
      external_id, source_kind, company_key, title, location, url,
      description, posted_at, status, created_at, updated_at
    ) VALUES (
      ${job.external_id}, ${job.source_kind}, ${job.company_key},
      ${job.title}, ${job.location ?? null}, ${job.url},
      ${job.description ?? null}, ${job.posted_at}, 'new', ${now}, ${now}
    )
    ON CONFLICT (source_kind, company_key, external_id) DO UPDATE SET
      title       = EXCLUDED.title,
      location    = COALESCE(EXCLUDED.location, jobs.location),
      url         = EXCLUDED.url,
      description = COALESCE(EXCLUDED.description, jobs.description),
      posted_at   = EXCLUDED.posted_at,
      updated_at  = EXCLUDED.updated_at
  `;
}

// ---------------------------------------------------------------------------
// Main Processing Logic
// ---------------------------------------------------------------------------

export async function processCompanies(
  env: Env,
  options: { hoursAgo?: number; maxCompanies?: number } = {},
): Promise<{
  success: boolean;
  stats: { companiesProcessed: number; jobsDiscovered: number; jobsInserted: number; errors: string[] };
}> {
  const { hoursAgo = 24, maxCompanies = 50 } = options;
  const sql = neon(env.NEON_DATABASE_URL);
  const stats = { companiesProcessed: 0, jobsDiscovered: 0, jobsInserted: 0, errors: [] as string[] };

  console.log(`Processing companies added in the last ${hoursAgo} hours (max: ${maxCompanies})...`);

  try {
    const companies = await getRecentCompanies(sql, hoursAgo);

    if (companies.length === 0) {
      console.log("No recent companies found");
      return { success: true, stats };
    }

    console.log(`Found ${companies.length} recent companies`);

    for (const company of companies.slice(0, maxCompanies)) {
      console.log(`Processing company: ${company.name} (${company.key})`);
      stats.companiesProcessed++;

      try {
        const [ashbyJobs, greenhouseJobs, leverJobs] = await Promise.all([
          fetchAshbyJobs(company.key),
          fetchGreenhouseJobs(company.key),
          fetchLeverJobs(company.key),
        ]);

        const jobsToInsert = [...ashbyJobs, ...greenhouseJobs, ...leverJobs];
        stats.jobsDiscovered += jobsToInsert.length;

        for (const job of jobsToInsert) {
          if (job.external_id.includes("://")) {
            try {
              const jobUrl = new URL(job.external_id);
              const segments = jobUrl.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
              if (segments.length < 2) {
                console.warn(`Skipping board-only URL as external_id: ${job.external_id}`);
                continue;
              }
            } catch {
              // Not a valid URL — proceed normally
            }
          }

          try {
            await upsertJob(sql, job);
            stats.jobsInserted++;
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            stats.errors.push(`Failed to insert job ${job.external_id}: ${msg}`);
            console.error(`Failed to insert job for ${company.key}/${job.external_id}:`, error);
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Error processing company ${company.key}: ${msg}`);
        console.error(`Error processing company ${company.key}:`, error);
      }
    }

    console.log(`Processing complete: ${stats.companiesProcessed} companies, ${stats.jobsDiscovered} jobs discovered, ${stats.jobsInserted} inserted`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Fatal error: ${msg}`);
    console.error("Fatal error:", error);
  }

  return { success: stats.errors.length === 0, stats };
}

async function triggerProcessing(env: Env, jobsInserted: number): Promise<void> {
  if (jobsInserted === 0) return;

  if (env.PROCESS_JOBS_QUEUE) {
    try {
      await env.PROCESS_JOBS_QUEUE.send({ action: "classify", limit: jobsInserted });
      console.log(`Queued job processing for ${jobsInserted} jobs`);
      return;
    } catch (err) {
      console.error("Queue send error:", err);
    }
  }

  if (env.PROCESS_JOBS_WORKER_URL) {
    try {
      const response = await fetch(env.PROCESS_JOBS_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "classify", limit: jobsInserted }),
      });
      if (!response.ok) {
        console.error(`Process-jobs worker returned ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      console.error("Process-jobs HTTP trigger error:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const sql = neon(env.NEON_DATABASE_URL);

    if (url.pathname === "/health") {
      try {
        const result = await sql<{ count: string }>`SELECT COUNT(*) as count FROM companies`;
        return new Response(
          JSON.stringify({ status: "healthy", companyCount: Number(result[0]?.count ?? 0) }),
          { headers: { "Content-Type": "application/json" } },
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ status: "unhealthy", error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (url.pathname === "/process") {
      const hours = parseInt(url.searchParams.get("hours") || "24", 10);
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);
      const result = await processCompanies(env, { hoursAgo: hours, maxCompanies: limit });
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        message: "Company processing cron worker",
        endpoints: ["/health", "/process?hours=24&limit=50 (manual trigger for testing)"],
        hint: "Cron runs every 6 hours by default. Use /process for manual trigger.",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("Starting scheduled company processing...");
    const { stats } = await processCompanies(env, { hoursAgo: 24, maxCompanies: 50 });
    ctx.waitUntil(triggerProcessing(env, stats.jobsInserted));
    console.log("Scheduled company processing complete:", stats);
  },
};
