/**
 * Lightweight regex-based B2B entity extraction.
 *
 * Extracts structured entities from free-text company descriptions,
 * news articles, and job postings without requiring an ML model.
 *
 * Supported entity types:
 *   - `funding_amount`  — "$5M", "raised $120 million", "Series B"
 *   - `team_size`       — "50 employees", "team of 200+", "500-person"
 *   - `technology`      — ~50 common B2B/AI tech terms
 *   - `person_name`     — Preceded by title context (CEO John Smith)
 *   - `job_title`       — C-level, VP, Director, Head of, etc.
 *   - `company_name`    — After "at", "joined", "founded" context words
 */

import {
  normalizeFundingAmount,
  normalizeTeamSize,
  normalizeTechName,
} from "./normalizer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface B2BEntity {
  entityType:
    | "funding_amount"
    | "team_size"
    | "technology"
    | "person_name"
    | "job_title"
    | "company_name";
  /** Raw matched text. */
  text: string;
  /** Normalized value if applicable, or null. */
  normalizedValue: string | null;
  /** Extraction confidence (0-1). */
  confidence: number;
  /** Start offset in the source text. */
  start: number;
  /** End offset in the source text. */
  end: number;
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/**
 * Each extractor runs a global regex against the input and maps matches
 * to one or more B2BEntity objects.
 */
interface PatternDef {
  entityType: B2BEntity["entityType"];
  pattern: RegExp;
  confidence: number;
  normalize: (match: RegExpExecArray) => string | null;
}

// --- Funding ---

const FUNDING_PATTERNS: PatternDef[] = [
  {
    entityType: "funding_amount",
    pattern:
      /(?:raised|secured|closed|funding of|round of|investment of)\s+\$\s*(\d+(?:\.\d+)?)\s*(k|K|m|M|b|B|bn|million|billion|thousand)?/gi,
    confidence: 0.92,
    normalize: (m) => {
      const val = normalizeFundingAmount(m[0]);
      return val !== null ? String(val) : null;
    },
  },
  {
    entityType: "funding_amount",
    pattern: /\$\s*(\d+(?:\.\d+)?)\s*(k|K|m|M|b|B|bn|million|billion|thousand)/gi,
    confidence: 0.85,
    normalize: (m) => {
      const val = normalizeFundingAmount(m[0]);
      return val !== null ? String(val) : null;
    },
  },
  {
    entityType: "funding_amount",
    pattern: /Series\s+[A-F](?:\d)?(?:\s+(?:round|funding))?/gi,
    confidence: 0.90,
    normalize: (m) => m[0].trim(),
  },
  {
    entityType: "funding_amount",
    pattern: /(?:Seed|Pre-Seed|Angel)\s+(?:round|funding|investment)/gi,
    confidence: 0.88,
    normalize: (m) => m[0].trim(),
  },
];

// --- Team size ---

const TEAM_SIZE_PATTERNS: PatternDef[] = [
  {
    entityType: "team_size",
    pattern:
      /(\d{1,6}(?:,\d{3})*)\s*(?:\+\s*)?(?:employees?|people|team\s*members?|staff|engineers?|developers?)/gi,
    confidence: 0.88,
    normalize: (m) => {
      const val = normalizeTeamSize(m[0]);
      return val !== null ? String(val) : null;
    },
  },
  {
    entityType: "team_size",
    pattern: /team\s+of\s+(\d{1,6}(?:,\d{3})*)\s*\+?/gi,
    confidence: 0.85,
    normalize: (m) => {
      const val = normalizeTeamSize(m[1]);
      return val !== null ? String(val) : null;
    },
  },
  {
    entityType: "team_size",
    pattern: /(\d{1,6}(?:,\d{3})*)\s*[-–]\s*person/gi,
    confidence: 0.85,
    normalize: (m) => {
      const val = normalizeTeamSize(m[1]);
      return val !== null ? String(val) : null;
    },
  },
  {
    entityType: "team_size",
    pattern: /(\d{1,6}(?:,\d{3})*)\s*[-–]\s*(\d{1,6}(?:,\d{3})*)\s+employees?/gi,
    confidence: 0.82,
    normalize: (m) => {
      const val = normalizeTeamSize(m[0]);
      return val !== null ? String(val) : null;
    },
  },
];

// --- Technology ---

const TECH_TERMS = [
  "Kubernetes",
  "Docker",
  "PyTorch",
  "TensorFlow",
  "PostgreSQL",
  "React",
  "Next\\.js",
  "Vue",
  "Angular",
  "Svelte",
  "Node\\.js",
  "TypeScript",
  "Python",
  "Rust",
  "Go(?:lang)?",
  "Java(?!Script)",
  "Kotlin",
  "Swift",
  "Ruby",
  "Elixir",
  "Scala",
  "GraphQL",
  "Redis",
  "MongoDB",
  "MySQL",
  "Elasticsearch",
  "Kafka",
  "RabbitMQ",
  "AWS",
  "GCP",
  "Azure",
  "Terraform",
  "Ansible",
  "Jenkins",
  "GitHub Actions",
  "Datadog",
  "Grafana",
  "Prometheus",
  "LangChain",
  "LlamaIndex",
  "OpenAI",
  "Hugging\\s?Face",
  "MLflow",
  "FastAPI",
  "Django",
  "Flask",
  "Spring Boot",
  "Vercel",
  "Cloudflare",
  "DynamoDB",
  "ClickHouse",
  "MLX",
  "ONNX",
  "vLLM",
  "JAX",
];

const TECH_PATTERN = new RegExp(
  `\\b(?:${TECH_TERMS.join("|")})\\b`,
  "gi",
);

const TECH_DEFS: PatternDef[] = [
  {
    entityType: "technology",
    pattern: TECH_PATTERN,
    confidence: 0.90,
    normalize: (m) => normalizeTechName(m[0]),
  },
];

// --- Job titles ---

const JOB_TITLE_PATTERNS: PatternDef[] = [
  {
    entityType: "job_title",
    pattern:
      /\b(?:C[A-Z]O|CEO|CTO|CFO|COO|CIO|CISO|CMO|CPO|CRO)\b/g,
    confidence: 0.95,
    normalize: (m) => m[0].toUpperCase(),
  },
  {
    entityType: "job_title",
    pattern:
      /\b(?:VP|Vice\s+President|SVP|EVP)\s+(?:of\s+)?[A-Z][a-zA-Z&\s]{2,30}/g,
    confidence: 0.85,
    normalize: (m) => m[0].trim(),
  },
  {
    entityType: "job_title",
    pattern:
      /\b(?:Director|Head|Chief)\s+of\s+[A-Z][a-zA-Z&\s]{2,30}/g,
    confidence: 0.85,
    normalize: (m) => m[0].trim(),
  },
  {
    entityType: "job_title",
    pattern:
      /\b(?:Senior|Sr\.?|Staff|Principal|Lead|Distinguished)\s+(?:Software|ML|AI|Data|DevOps|Platform|Backend|Frontend|Full[- ]?Stack)\s+(?:Engineer|Scientist|Architect|Developer)/gi,
    confidence: 0.80,
    normalize: (m) => m[0].trim(),
  },
];

// --- Person names (context-dependent) ---

const PERSON_NAME_PATTERNS: PatternDef[] = [
  {
    entityType: "person_name",
    // "CEO John Smith", "CTO Jane Doe-Williams"
    pattern:
      /\b(?:CEO|CTO|CFO|COO|CIO|CMO|CPO|founder|co-founder|cofounder)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,2})/gi,
    confidence: 0.75,
    normalize: (m) => m[1]?.trim() ?? null,
  },
  {
    entityType: "person_name",
    // "John Smith, CEO"
    pattern:
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,2}),?\s+(?:CEO|CTO|CFO|COO|CIO|CMO|CPO|founder|co-founder|cofounder)/gi,
    confidence: 0.75,
    normalize: (m) => m[1]?.trim() ?? null,
  },
];

// --- Company names (context-dependent) ---

const COMPANY_NAME_PATTERNS: PatternDef[] = [
  {
    entityType: "company_name",
    // "at Acme Corp", "joined DataTech Inc."
    pattern:
      /(?:at|joined|founded|acquired|from)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,3}(?:\s+(?:Inc\.?|Corp\.?|LLC|Ltd\.?|GmbH|AG|SA|PLC|Co\.?))?)/g,
    confidence: 0.70,
    normalize: (m) => m[1]?.trim() ?? null,
  },
];

// ---------------------------------------------------------------------------
// Extraction engine
// ---------------------------------------------------------------------------

const ALL_PATTERNS: PatternDef[] = [
  ...FUNDING_PATTERNS,
  ...TEAM_SIZE_PATTERNS,
  ...TECH_DEFS,
  ...JOB_TITLE_PATTERNS,
  ...PERSON_NAME_PATTERNS,
  ...COMPANY_NAME_PATTERNS,
];

/**
 * De-duplicate overlapping entities, keeping the one with higher confidence.
 */
function deduplicateEntities(entities: B2BEntity[]): B2BEntity[] {
  // Sort by start position, then by confidence descending
  const sorted = [...entities].sort(
    (a, b) => a.start - b.start || b.confidence - a.confidence,
  );

  const result: B2BEntity[] = [];
  let lastEnd = -1;

  for (const entity of sorted) {
    if (entity.start >= lastEnd) {
      result.push(entity);
      lastEnd = entity.end;
    } else {
      // Overlapping — keep only if strictly higher confidence than current tail
      const prev = result[result.length - 1];
      if (prev && entity.confidence > prev.confidence) {
        result[result.length - 1] = entity;
        lastEnd = entity.end;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract B2B entities from free text using regex-based patterns.
 *
 * Returns de-duplicated, non-overlapping entities sorted by position.
 * No external dependencies or ML model required.
 *
 * @param text - Raw text to extract entities from.
 * @returns Array of {@link B2BEntity} objects.
 */
export function extractB2BEntities(text: string): B2BEntity[] {
  if (!text || text.trim().length === 0) return [];

  const entities: B2BEntity[] = [];

  for (const def of ALL_PATTERNS) {
    // Reset lastIndex for global regex reuse across calls
    def.pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = def.pattern.exec(text)) !== null) {
      const matchedText = match[0];
      const start = match.index;
      const end = start + matchedText.length;

      entities.push({
        entityType: def.entityType,
        text: matchedText,
        normalizedValue: def.normalize(match),
        confidence: def.confidence,
        start,
        end,
      });
    }
  }

  return deduplicateEntities(entities);
}
