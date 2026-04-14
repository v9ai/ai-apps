/**
 * Post-level signal scoring for BFS crawler.
 *
 * Analyzes LinkedIn company post text to detect signals indicating
 * remote tech roles accessible from Europe. Composes existing utilities:
 *   - parseJobFields / isJobRelatedPost from job-field-parser.ts
 *   - REGION_REMOTE_RE from voyager-remote-classifier.ts
 */

import { parseJobFields, isJobRelatedPost } from "./job-field-parser";
import { REGION_REMOTE_RE } from "./voyager-remote-classifier";

// Broader Europe geo detection -- matches standalone country names,
// not just "remote Europe" bigrams that REGION_REMOTE_RE requires.
export const EUROPE_GEO_RE =
  /\b(?:eu|europe|european|emea|eea|uk|united\s+kingdom|britain|ireland|germany|german|france|french|netherlands|dutch|holland|spain|spanish|sweden|swedish|switzerland|swiss|poland|polish|portugal|portuguese|denmark|danish|norway|norwegian|finland|finnish|austria|austrian|belgium|belgian|czech|romania|romanian|hungary|hungarian|italy|italian|croatia|croatian|greece|greek|estonia|estonian|latvia|latvian|lithuania|lithuanian|luxembourg|slovakia|slovak|slovenia|slovenian|bulgaria|bulgarian|malta|cyprus)\b/i;

// Tech role keywords -- families of terms indicating software/tech roles.
export const TECH_ROLE_RE =
  /\b(?:salesforce|data\s*cloud|mulesoft|developer|software\s*engineer|full[\s-]?stack|front[\s-]?end|back[\s-]?end|devops|sre|site\s*reliability|cloud\s*(?:architect|engineer)|aws|azure|gcp|google\s*cloud|kubernetes|docker|terraform|python|java(?:script)?|typescript|react|angular|vue|node(?:\.?js)?|\.net|c#|golang|rust|scala|ruby|php|ios|android|mobile\s*developer|data\s*engineer|machine\s*learning|ml\s*engineer|ai\s*engineer|cyber\s*security|infosec|devsecops|platform\s*engineer|solutions?\s*architect|technical?\s*architect|scrum\s*master|agile\s*coach|tech\s*lead|engineering\s*manager|cto|vp\s*(?:of\s*)?engineering|qa\s*engineer|test\s*(?:engineer|automation)|dba|database|bi\s*(?:developer|analyst|engineer)|etl|data\s*(?:warehouse|pipeline|analyst)|power\s*bi|tableau|snowflake|databricks|sap|servicenow|netsuite)\b/i;

export interface PostSignal {
  isJobPost: boolean;
  remoteType: string | null;
  hasEuropeGeo: boolean;
  hasTechKeywords: boolean;
  hasContractSignals: boolean;
  score: number;
}

export interface PostSignalSummary {
  totalPosts: number;
  jobPosts: number;
  remoteEuropePosts: number;
  techContractPosts: number;
  topScore: number;
  avgScore: number;
  hasIdealSignal: boolean;
}

export function scorePost(text: string): PostSignal {
  if (!text || text.length < 20) {
    return { isJobPost: false, remoteType: null, hasEuropeGeo: false, hasTechKeywords: false, hasContractSignals: false, score: 0 };
  }

  const fields = parseJobFields(text);
  const isJob = isJobRelatedPost(text, fields);
  const hasEurope = REGION_REMOTE_RE.test(text) || EUROPE_GEO_RE.test(text);
  const hasTech = TECH_ROLE_RE.test(text);
  const hasContract = !!(fields.rate || fields.ir35Status || fields.duration);

  // Weighted score: job=0.2, remote=0.2, europe=0.25, tech=0.2, contract=0.15
  let score = 0;
  if (isJob) score += 0.20;
  if (fields.remoteType === "fully_remote") score += 0.20;
  else if (fields.remoteType === "remote") score += 0.15;
  if (hasEurope) score += 0.25;
  if (hasTech) score += 0.20;
  if (hasContract) score += 0.15;

  return {
    isJobPost: isJob,
    remoteType: fields.remoteType,
    hasEuropeGeo: hasEurope,
    hasTechKeywords: hasTech,
    hasContractSignals: hasContract,
    score: Math.round(score * 100) / 100,
  };
}

export function summarizePostSignals(posts: Array<{ postText: string | null }>): PostSignalSummary {
  const signals = posts.map((p) => scorePost(p.postText || ""));
  const jobSignals = signals.filter((s) => s.isJobPost);

  return {
    totalPosts: posts.length,
    jobPosts: jobSignals.length,
    remoteEuropePosts: jobSignals.filter(
      (s) => (s.remoteType === "fully_remote" || s.remoteType === "remote") && s.hasEuropeGeo,
    ).length,
    techContractPosts: jobSignals.filter((s) => s.hasTechKeywords && s.hasContractSignals).length,
    topScore: signals.length > 0 ? Math.max(...signals.map((s) => s.score)) : 0,
    avgScore:
      jobSignals.length > 0
        ? Math.round((jobSignals.reduce((sum, s) => sum + s.score, 0) / jobSignals.length) * 100) / 100
        : 0,
    hasIdealSignal: jobSignals.some(
      (s) =>
        (s.remoteType === "fully_remote" || s.remoteType === "remote") &&
        s.hasEuropeGeo &&
        s.hasTechKeywords &&
        s.hasContractSignals,
    ),
  };
}

export function formatSignalSummary(s: PostSignalSummary): string {
  const parts: string[] = [
    `${s.jobPosts}/${s.totalPosts} job posts`,
  ];
  if (s.remoteEuropePosts > 0) parts.push(`${s.remoteEuropePosts} remote-europe`);
  if (s.techContractPosts > 0) parts.push(`${s.techContractPosts} tech-contract`);
  parts.push(`top=${s.topScore}`, `avg=${s.avgScore}`);
  if (s.hasIdealSignal) parts.push("IDEAL");
  return parts.join(", ");
}
