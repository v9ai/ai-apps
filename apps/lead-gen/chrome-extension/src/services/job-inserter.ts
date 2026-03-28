/**
 * Job Inserter Service
 *
 * Inserts jobs via the app's API endpoint.
 */

const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3004";

// API secret can be set at build time or runtime
const BUILD_TIME_API_SECRET = import.meta.env.VITE_API_SECRET || null;

export interface JobInput {
  // Required fields
  title: string;
  company: string;
  url: string;

  // Optional fields
  location?: string;
  salary?: string;
  description?: string;
  publishedDate?: string;
  sourceType?: string;
  sourceCategory?: string;
  sourceDetail?: string;
  guid?: string;
  keywords?: string[];
  employmentType?: string;
  experienceLevel?: string;
  techStack?: string[];
  status?: string;
  applied?: boolean;
  appliedAt?: string;
  isDeveloperRole?: boolean;
  developerConfidence?: string;
  remoteFriendly?: boolean;
}

export interface InsertJobsResponse {
  success: boolean;
  message: string;
  data?: {
    totalJobs: number;
    successCount: number;
    failCount: number;
    successfulIds: string[];
    failures: string[];
  };
  error?: string;
  invalidJobs?: Array<{
    index: number;
    errors: string[];
  }>;
}

/**
 * Get API secret from Chrome storage or build-time env
 */
async function getApiSecret(): Promise<string | null> {
  // First, try build-time secret (from .env.local)
  if (BUILD_TIME_API_SECRET) {
    return BUILD_TIME_API_SECRET;
  }

  // Fall back to runtime secret (from chrome.storage)
  try {
    const result = await chrome.storage.sync.get(["apiSecret"]);
    return (result.apiSecret as string) || null;
  } catch (error) {
    console.warn("[Job Inserter] Could not get API secret:", error);
    return null;
  }
}

/**
 * Insert jobs via app API
 */
export async function insertJobs(
  jobs: JobInput[],
): Promise<InsertJobsResponse> {
  try {
    console.log(`[Job Inserter] Inserting ${jobs.length} jobs...`);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add authentication if configured
    const apiSecret = await getApiSecret();
    if (apiSecret) {
      headers["Authorization"] = `Bearer ${apiSecret}`;
    }

    const response = await fetch(`${API_URL}/api/jobs/insert`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jobs }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));

      console.error("[Job Inserter] API returned error:", errorData);

      return {
        success: false,
        message: errorData.error || `Failed with status ${response.status}`,
        error: errorData.error,
        invalidJobs: errorData.invalidJobs,
      };
    }

    const result: InsertJobsResponse = await response.json();

    console.log("[Job Inserter] API response:", {
      success: result.success,
      successCount: result.data?.successCount,
      failCount: result.data?.failCount,
      failures: result.data?.failures,
    });

    if (result.data?.failures && result.data.failures.length > 0) {
      console.error("[Job Inserter] Failures:", result.data.failures);
    }

    return result;
  } catch (error) {
    console.error("[Job Inserter] Error inserting jobs:", error);

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch")) {
        errorMessage =
          "Cannot connect to API. Check your internet connection.";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      message: `Error: ${errorMessage}`,
      error: errorMessage,
    };
  }
}

/**
 * Save API secret to Chrome storage
 */
export async function setApiSecret(secret: string): Promise<void> {
  await chrome.storage.sync.set({ apiSecret: secret });
  console.log("[Job Inserter] API secret saved");
}

/**
 * Check if API secret is configured
 */
export async function hasApiSecret(): Promise<boolean> {
  const secret = await getApiSecret();
  return !!secret;
}

/**
 * Remove API secret from Chrome storage
 */
export async function clearApiSecret(): Promise<void> {
  await chrome.storage.sync.remove(["apiSecret"]);
  console.log("[Job Inserter] API secret cleared");
}

/**
 * Helper to convert legacy job format to API format
 */
export function normalizeJobInput(job: any): any {
  // Extract company key from URL or use company name
  let companyKey = job.company || "unknown";

  // Check if this is a CRM internal URL (localhost or known CRM domains)
  // Format: /jobs/<id-or-slug>?company=<company>&source=<source>
  const crmUrlMatch = job.url?.match(
    /(?:localhost:\d+|lead-gen|127\.0\.0\.1:\d+)\/jobs\/([^?]+)/,
  );

  if (crmUrlMatch) {
    // Parse query params from CRM URL
    const urlObj = new URL(job.url);
    const sourceParam = urlObj.searchParams.get("source");
    const companyParam = urlObj.searchParams.get("company");
    const slug = decodeURIComponent(crmUrlMatch[1]);

    return {
      externalId: slug,
      sourceKind: sourceParam || job.sourceType || "other",
      companyKey: companyParam || companyKey,
      title: job.title,
      url: job.url,
      location: job.location || undefined,
      description: job.description || undefined,
      postedAt: job.publishedDate || job.postedAt || undefined,
      status: job.archived ? "archived" : job.status || "new",
    };
  }

  // Try to extract company from Greenhouse/Lever URLs
  if (job.url) {
    const greenhouseMatch = job.url.match(/boards\.greenhouse\.io\/([^/]+)/);
    const leverMatch = job.url.match(/jobs\.lever\.co\/([^/]+)/);

    if (greenhouseMatch) {
      companyKey = greenhouseMatch[1];
    } else if (leverMatch) {
      companyKey = leverMatch[1];
    } else if (job.company) {
      // Slugify company name
      companyKey = job.company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }
  }

  // Determine source kind from URL or sourceType
  let sourceKind = "other";
  if (job.url?.includes("greenhouse.io")) {
    sourceKind = "greenhouse";
  } else if (job.url?.includes("lever.co")) {
    sourceKind = "lever";
  } else if (job.url?.includes("workable.com")) {
    sourceKind = "workable";
  } else if (job.sourceType) {
    sourceKind = job.sourceType;
  }

  // Extract external ID (UUID) from URL for ATS platforms
  let externalId = job.guid || job.id || job.url;

  if (job.url) {
    // Extract Greenhouse ID from URL if present
    if (job.url.includes("greenhouse.io")) {
      const greenhouseIdMatch = job.url.match(/job_app\?gh_jid=(\d+)/);
      if (greenhouseIdMatch) {
        externalId = greenhouseIdMatch[1];
      }
    }
    // Extract Lever ID from URL if present
    else if (job.url.includes("lever.co")) {
      const leverIdMatch = job.url.match(/jobs\.lever\.co\/[^/]+\/([^/?]+)/);
      if (leverIdMatch) {
        externalId = leverIdMatch[1];
      }
    }
  }

  return {
    externalId: externalId,
    sourceKind: sourceKind,
    companyKey: companyKey,
    title: job.title,
    url: job.url,
    location: job.location || undefined,
    description: job.description || undefined,
    postedAt: job.publishedDate || job.postedAt || undefined,
    status: job.archived ? "archived" : job.status || "new",
  };
}

/**
 * Batch insert with deduplication and validation
 */
export async function insertJobsBatch(
  jobs: any[],
  sourceType: string = "manual",
): Promise<{ success: boolean; message: string; jobsCollected: number }> {
  if (jobs.length === 0) {
    return {
      success: false,
      message: "No jobs to save",
      jobsCollected: 0,
    };
  }

  // Deduplicate by URL
  const uniqueJobsMap = new Map<string, any>();
  for (const job of jobs) {
    if (job?.url && !uniqueJobsMap.has(job.url)) {
      uniqueJobsMap.set(job.url, job);
    }
  }

  const uniqueJobs = Array.from(uniqueJobsMap.values());
  const duplicateCount = jobs.length - uniqueJobs.length;

  if (duplicateCount > 0) {
    console.log(`[Job Inserter] Removed ${duplicateCount} duplicate jobs`);
  }

  // Filter out invalid jobs
  const validJobs = uniqueJobs.filter((job) => {
    const isValid = job?.title && job?.company && job?.url;
    if (!isValid) {
      console.warn("[Job Inserter] Skipping invalid job:", {
        title: job?.title,
        company: job?.company,
        url: job?.url,
      });
    }
    return isValid;
  });

  const invalidCount = uniqueJobs.length - validJobs.length;

  if (invalidCount > 0) {
    console.warn(`[Job Inserter] ${invalidCount} jobs missing required fields`);
  }

  if (validJobs.length === 0) {
    return {
      success: false,
      message: "No valid jobs found (all missing title/company/url)",
      jobsCollected: 0,
    };
  }

  // Normalize to API format
  const jobInputs = validJobs.map((job) => normalizeJobInput(job));

  console.log(`[Job Inserter] Prepared ${jobInputs.length} jobs for insertion`);

  // Insert via API
  const result = await insertJobs(jobInputs);

  // Check for authentication errors
  if (!result.success && result.data?.failures) {
    const has401Errors = result.data.failures.some(
      (f) => f.includes("401") || f.includes("Unauthorized"),
    );

    if (has401Errors) {
      return {
        success: false,
        message:
          "⚠️ Authentication required. Please set the API secret in extension settings.",
        jobsCollected: 0,
      };
    }
  }

  if (result.success) {
    const successCount = result.data?.successCount || 0;
    const failCount = result.data?.failCount || 0;

    return {
      success: true,
      message: `✓ Successfully saved ${successCount} jobs${
        failCount > 0 ? `, ${failCount} failed` : ""
      }${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ""}`,
      jobsCollected: successCount,
    };
  } else {
    const failureMsg = result.data?.failures?.[0] || result.message;
    return {
      success: false,
      message: `Failed to insert jobs: ${failureMsg}`,
      jobsCollected: 0,
    };
  }
}
