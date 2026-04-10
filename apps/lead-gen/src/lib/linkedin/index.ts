/**
 * LinkedIn Voyager API client for the lead-gen pipeline.
 *
 * @module @/lib/linkedin
 *
 * @example
 * ```ts
 * import { VoyagerClient, createVoyagerClient } from "@/lib/linkedin";
 *
 * // From environment variables
 * const client = createVoyagerClient();
 *
 * // Or with explicit credentials
 * const client = new VoyagerClient({
 *   session: { liAt: "...", jsessionId: "..." },
 * });
 * ```
 */

export { VoyagerClient, createVoyagerClient } from "./voyager-client";

export { VoyagerError, isRotationConfig } from "./types";

export type {
  // Session & auth
  VoyagerSession,
  SessionRotationConfig,
  VoyagerSessionConfig,
  VoyagerClientConfig,

  // Job search
  VoyagerJobSearchParams,
  VoyagerJobCard,
  VoyagerJobSearchPage,
  VoyagerJobDetails,
  VoyagerJobPoster,
  VoyagerSearchMeta,
  VoyagerJobType,
  VoyagerExperienceLevel,
  VoyagerDatePosted,
  VoyagerRemoteFilter,
  VoyagerSortBy,

  // Analytics
  QueryTrend,
  TrendDataPoint,
  SyncProgress,

  // Infrastructure
  VoyagerHealthStatus,
  VoyagerEvent,
  VoyagerEventType,
  VoyagerEventListener,
  VoyagerErrorCode,
  EndpointBudget,
  RateLimitBudgets,
  CacheConfig,
  CacheEntry,
} from "./types";
