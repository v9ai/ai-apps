/**
 * Company, CompanyFact, CompanySnapshot, and Evidence field resolvers.
 *
 * JSON fields are memoized per parent object via a WeakMap so that
 * multiple field resolvers accessing the same row never re-parse.
 */

import type {
  Company as DbCompany,
  CompanyFact as DbCompanyFact,
  CompanySnapshot as DbCompanySnapshot,
} from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { safeJsonParse } from "./utils";

// ── Per-object JSON parse cache (WeakMap → auto-GC, zero leak) ──────
const jsonCache = new WeakMap<object, Map<string, unknown>>();

function cachedSafeJsonParse<T>(parent: object, key: string, raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  let cache = jsonCache.get(parent);
  if (!cache) { cache = new Map(); jsonCache.set(parent, cache); }
  if (cache.has(key)) return cache.get(key) as T;
  const parsed = safeJsonParse<T>(raw, fallback);
  cache.set(key, parsed);
  return parsed;
}

function cachedParse<T>(parent: object, key: string, raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  let cache = jsonCache.get(parent);
  if (!cache) { cache = new Map(); jsonCache.set(parent, cache); }
  if (cache.has(key)) return cache.get(key) as T;
  try {
    const parsed = JSON.parse(raw) as T;
    cache.set(key, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

export const CompanyField = {
  ai_tier(parent: DbCompany) {
    return parent.ai_tier ?? 0;
  },
  ai_classification_confidence(parent: DbCompany) {
    return parent.ai_classification_confidence ?? 0.5;
  },
  ai_classification_reason(parent: DbCompany) {
    return parent.ai_classification_reason ?? null;
  },
  blocked(parent: DbCompany) {
    return parent.blocked ?? false;
  },
  // Validate and sanitize category enum
  category(parent: DbCompany) {
    const validCategories = ["CONSULTANCY", "UNKNOWN"];
    const category = parent.category?.toUpperCase() || "UNKNOWN";
    return validCategories.includes(category) ? category : "UNKNOWN";
  },
  // Parse JSON fields with memoized caching
  tags(parent: DbCompany) {
    return cachedSafeJsonParse(parent, "tags", parent.tags, []);
  },
  services(parent: DbCompany) {
    if (!parent.services) return [];
    const parsed = cachedSafeJsonParse<string[] | null>(parent, "services", parent.services, null);
    if (parsed !== null) return parsed;
    // Fallback: plain comma-separated string
    return parent.services.split(',').map((s: string) => s.trim()).filter(Boolean);
  },
  service_taxonomy(parent: DbCompany) {
    return cachedSafeJsonParse(parent, "service_taxonomy", parent.service_taxonomy, []);
  },
  industries(parent: DbCompany) {
    return cachedSafeJsonParse(parent, "industries", parent.industries, []);
  },
  score_reasons(parent: DbCompany) {
    const parsed = cachedSafeJsonParse<unknown>(parent, "score_reasons", parent.score_reasons, []);
    if (Array.isArray(parsed)) return parsed as string[];
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const reasons: string[] = [];
      // consultancy-discover-v1 format
      if (obj.method) reasons.push(`Method: ${obj.method}`);
      if (Array.isArray(obj.keyword_hits) && obj.keyword_hits.length > 0)
        reasons.push(`Keywords: ${obj.keyword_hits.join(", ")}`);
      if (Array.isArray(obj.ai_keyword_hits) && obj.ai_keyword_hits.length > 0)
        reasons.push(`AI keywords: ${(obj.ai_keyword_hits as unknown[]).slice(0, 5).join(", ")}`);
      if (typeof obj.ai_score === "number")
        reasons.push(`AI score: ${(obj.ai_score * 100).toFixed(0)}%`);
      if (typeof obj.consultancy_score === "number")
        reasons.push(`Consultancy score: ${(obj.consultancy_score * 100).toFixed(0)}%`);
      // recruitment-verify format
      if (typeof obj.is_recruitment === "boolean")
        reasons.push(obj.is_recruitment ? "Is recruitment agency" : "Not a recruitment agency");
      if (typeof obj.confidence === "number")
        reasons.push(`Confidence: ${(obj.confidence * 100).toFixed(1)}%`);
      if (Array.isArray(obj.top_matches))
        reasons.push(...obj.top_matches.map(String));
      return reasons;
    }
    return [];
  },
  email(parent: DbCompany) {
    return parent.email ?? null;
  },
  emailsList(parent: DbCompany) {
    return cachedSafeJsonParse(parent, "emails", parent.emails, []);
  },
  githubUrl(parent: DbCompany) {
    return parent.github_url ?? null;
  },
  async facts(
    parent: DbCompany,
    args: { limit?: number; offset?: number; field?: string },
    context: GraphQLContext,
  ) {
    try {
      const limit = args.limit ?? 200;
      const offset = args.offset ?? 0;

      let facts = await context.loaders.companyFacts.load(parent.id);
      if (args.field) {
        facts = facts.filter((f) => f.field === args.field);
      }
      return facts.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error fetching company facts:", error);
      return [];
    }
  },
  async facts_count(parent: DbCompany, _args: unknown, context: GraphQLContext) {
    try {
      const facts = await context.loaders.companyFacts.load(parent.id);
      return facts.length;
    } catch (error) {
      console.error("Error counting company facts:", error);
      return 0;
    }
  },
  async snapshots(parent: DbCompany, args: { limit?: number; offset?: number }, context: GraphQLContext) {
    try {
      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;

      const snapshots = await context.loaders.companySnapshots.load(parent.id);
      return snapshots.slice(offset, offset + limit);
    } catch (error) {
      console.error("Error fetching company snapshots:", error);
      return [];
    }
  },
  async snapshots_count(parent: DbCompany, _args: unknown, context: GraphQLContext) {
    try {
      const snapshots = await context.loaders.companySnapshots.load(parent.id);
      return snapshots.length;
    } catch (error) {
      console.error("Error counting company snapshots:", error);
      return 0;
    }
  },
};

export const EvidenceField = {
  warc(parent: DbCompanyFact) {
    if (!parent.warc_filename) return null;
    return {
      filename: parent.warc_filename,
      offset: parent.warc_offset,
      length: parent.warc_length,
      digest: parent.warc_digest,
    };
  },
};

export const CompanyFactField = {
  value_json(parent: DbCompanyFact) {
    return cachedParse(parent, "value_json", parent.value_json, null);
  },
  normalized_value(parent: DbCompanyFact) {
    return cachedParse(parent, "normalized_value", parent.normalized_value, null);
  },
  evidence(parent: DbCompanyFact) {
    return {
      source_type: parent.source_type,
      source_url: parent.source_url,
      crawl_id: parent.crawl_id,
      capture_timestamp: parent.capture_timestamp,
      observed_at: parent.observed_at,
      method: parent.method,
      extractor_version: parent.extractor_version,
      http_status: parent.http_status,
      mime: parent.mime,
      content_hash: parent.content_hash,
      warc_filename: parent.warc_filename,
      warc_offset: parent.warc_offset,
      warc_length: parent.warc_length,
      warc_digest: parent.warc_digest,
    };
  },
};

export const CompanySnapshotField = {
  jsonld(parent: DbCompanySnapshot) {
    return cachedParse(parent, "jsonld", parent.jsonld, null);
  },
  extracted(parent: DbCompanySnapshot) {
    return cachedParse(parent, "extracted", parent.extracted, null);
  },
  evidence(parent: DbCompanySnapshot) {
    return {
      source_type: parent.source_type,
      source_url: parent.source_url,
      crawl_id: parent.crawl_id,
      capture_timestamp: parent.capture_timestamp,
      observed_at: parent.fetched_at,
      method: parent.method,
      extractor_version: parent.extractor_version,
      http_status: parent.http_status,
      mime: parent.mime,
      content_hash: parent.content_hash,
      warc_filename: parent.warc_filename,
      warc_offset: parent.warc_offset,
      warc_length: parent.warc_length,
      warc_digest: parent.warc_digest,
    };
  },
};
