import { remoteEUTestCases } from "./test-data";
import { scoreRemoteEUClassification } from "./scorers";
import type { RemoteEUClassification, RemoteEUTestCase } from "./schema";

// ---------------------------------------------------------------------------
// EU country / signal lists
// ---------------------------------------------------------------------------

const EU_COUNTRIES = new Set([
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
  "czechia", "denmark", "estonia", "finland", "france", "germany", "greece",
  "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg",
  "malta", "netherlands", "poland", "portugal", "romania", "slovakia",
  "slovenia", "spain", "sweden",
]);

const EU_COUNTRY_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

const EU_REGION_KEYWORDS = [
  "eu", "european union", "europe", "emea", "eea",
  "schengen", "nordic",
];

const EU_TIMEZONE_KEYWORDS = ["cet", "cest", "european business hours"];

const EU_WORK_AUTH_KEYWORDS = [
  "eu work authorization", "eu work permit", "eu passport",
  "eu residency", "right to work in the eu", "eu member state",
  "eu citizen",
];

const NON_EU_EXCLUSION_SIGNALS = [
  "us only", "uk only", "united states only", "us-based",
  "us work authorization", "must be based in the united states",
  "must be located in the united states", "located in the united states",
  "americas only", "us citizens", "401(k)", "401k",
  "swiss work permit", "switzerland only",
  "latin america", "latam",
  "cannot accept applications from eu",
];

// ---------------------------------------------------------------------------
// Heuristic classifier
// ---------------------------------------------------------------------------

/**
 * Rule-based heuristic classifier for Remote EU jobs.
 *
 * Checks location, description, country code, and remote flags
 * using keyword/pattern matching. No LLM involved.
 */
export function heuristicClassify(
  jobPosting: RemoteEUTestCase["jobPosting"],
): RemoteEUClassification {
  const location = jobPosting.location.toLowerCase();
  const description = jobPosting.description.toLowerCase();
  const combined = `${location} ${description}`;

  // --- Negative signals first (exclusions) ---
  for (const signal of NON_EU_EXCLUSION_SIGNALS) {
    if (combined.includes(signal)) {
      return {
        isRemoteEU: false,
        confidence: "high",
        reason: `Non-EU exclusion signal detected: "${signal}"`,
      };
    }
  }

  // Check for hybrid / on-site signals
  if (
    /hybrid|on-site|onsite|in-office|in office|\bdays? (in|per week)\b/i.test(combined) &&
    !/remote-first|fully remote|100% remote/i.test(combined)
  ) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "Hybrid or on-site signals detected",
    };
  }

  // --- Use structured ATS fields if available ---
  if (jobPosting.country && EU_COUNTRY_CODES.has(jobPosting.country)) {
    if (jobPosting.is_remote === true || jobPosting.workplace_type === "remote") {
      return {
        isRemoteEU: true,
        confidence: "high",
        reason: `EU country code (${jobPosting.country}) + remote flag`,
      };
    }
  }

  // Non-EU country code
  if (jobPosting.country && !EU_COUNTRY_CODES.has(jobPosting.country)) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: `Non-EU country code: ${jobPosting.country}`,
    };
  }

  // --- Location-field keyword checks ---

  // Explicit "Remote - EU" or "Remote EU"
  if (/remote\s*[-|]\s*eu\b/i.test(location) || /\beu\s+remote\b/i.test(location)) {
    return {
      isRemoteEU: true,
      confidence: "high",
      reason: "Location explicitly mentions Remote EU",
    };
  }

  // Check for EU country names in location
  const mentionedEUCountries = [...EU_COUNTRIES].filter((c) =>
    location.includes(c),
  );
  if (mentionedEUCountries.length > 0) {
    // Check if this looks remote (not just a city)
    if (/remote/i.test(location) || jobPosting.is_remote === true) {
      return {
        isRemoteEU: true,
        confidence: "high",
        reason: `EU countries in location: ${mentionedEUCountries.join(", ")}`,
      };
    }
  }

  // EMEA / Europe / EEA in location
  for (const keyword of EU_REGION_KEYWORDS) {
    if (location.includes(keyword)) {
      return {
        isRemoteEU: true,
        confidence: "medium",
        reason: `EU region keyword in location: "${keyword}"`,
      };
    }
  }

  // --- Description-level checks ---

  // EU work authorization keywords
  for (const keyword of EU_WORK_AUTH_KEYWORDS) {
    if (description.includes(keyword)) {
      return {
        isRemoteEU: true,
        confidence: "high",
        reason: `EU work authorization keyword: "${keyword}"`,
      };
    }
  }

  // CET/CEST timezone mentions
  for (const keyword of EU_TIMEZONE_KEYWORDS) {
    if (combined.includes(keyword)) {
      return {
        isRemoteEU: true,
        confidence: "medium",
        reason: `EU timezone signal: "${keyword}"`,
      };
    }
  }

  // EU region keywords in description
  for (const keyword of EU_REGION_KEYWORDS) {
    if (description.includes(keyword) && /remote/i.test(combined)) {
      return {
        isRemoteEU: true,
        confidence: "medium",
        reason: `EU region keyword in description: "${keyword}"`,
      };
    }
  }

  // --- Default: no EU signals found ---
  return {
    isRemoteEU: false,
    confidence: "medium",
    reason: "No EU-specific signals detected",
  };
}

// ---------------------------------------------------------------------------
// Comparison runner
// ---------------------------------------------------------------------------

export interface HeuristicComparisonResult {
  heuristicAccuracy: number;
  llmAccuracy: number;
  agreement: number;
  perCase: Array<{
    id: string;
    description: string;
    expected: RemoteEUClassification;
    heuristic: RemoteEUClassification;
    llm: RemoteEUClassification | null;
    heuristicCorrect: boolean;
    llmCorrect: boolean | null;
    agree: boolean;
  }>;
}

/**
 * Run heuristic classifier against all test cases and optionally
 * compare with LLM results.
 *
 * @param llmClassify Optional LLM classifier function. If omitted,
 *   only heuristic results are reported (llm fields will be null).
 */
export async function runHeuristicComparison(
  llmClassify?: (
    jobPosting: RemoteEUTestCase["jobPosting"],
  ) => Promise<RemoteEUClassification>,
): Promise<HeuristicComparisonResult> {
  const perCase: HeuristicComparisonResult["perCase"] = [];

  for (const tc of remoteEUTestCases) {
    const heuristic = heuristicClassify(tc.jobPosting);
    const heuristicCorrect =
      heuristic.isRemoteEU === tc.expectedClassification.isRemoteEU;

    let llm: RemoteEUClassification | null = null;
    let llmCorrect: boolean | null = null;

    if (llmClassify) {
      llm = await llmClassify(tc.jobPosting);
      llmCorrect = llm.isRemoteEU === tc.expectedClassification.isRemoteEU;
    }

    const agree = llm
      ? heuristic.isRemoteEU === llm.isRemoteEU
      : true;

    perCase.push({
      id: tc.id,
      description: tc.description,
      expected: tc.expectedClassification,
      heuristic,
      llm,
      heuristicCorrect,
      llmCorrect,
      agree,
    });
  }

  const total = perCase.length;
  const heuristicAccuracy =
    perCase.filter((r) => r.heuristicCorrect).length / total;

  const llmResults = perCase.filter((r) => r.llmCorrect !== null);
  const llmAccuracy =
    llmResults.length > 0
      ? llmResults.filter((r) => r.llmCorrect).length / llmResults.length
      : 0;

  const agreement = perCase.filter((r) => r.agree).length / total;

  return {
    heuristicAccuracy,
    llmAccuracy,
    agreement,
    perCase,
  };
}
