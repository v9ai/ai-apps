/**
 * ICP (Ideal Customer Profile) filter for LinkedIn company scraping.
 *
 * Target: recruitment/staffing firms with ≤200 employees,
 * excluding region-locked outsourcing operations.
 */

export interface CompanyData {
  name: string;
  website: string;
  description: string;
  industry: string;
  size: string;
  location: string;
  linkedinUrl: string;
}

export interface ICPResult {
  target: boolean;
  reason?: "not-recruitment" | "too-large" | "irrelevant-geo";
}

// Parse LinkedIn size strings like "51-200 employees" → upper bound (200).
export function parseLinkedInSize(size: string): number {
  if (/\b(self-employed|myself only|solo|freelance)\b/i.test(size)) return 1;
  const range = size.match(/(\d[\d,]*)\s*[-–—]\s*(\d[\d,]*)/);
  if (range) return parseInt(range[2].replace(/,/g, ""), 10);
  const plus = size.match(/(\d[\d,]*)\+/);
  if (plus) return parseInt(plus[1].replace(/,/g, ""), 10);
  const single = size.match(/(\d[\d,]*)/);
  if (single) return parseInt(single[1].replace(/,/g, ""), 10);
  return Infinity; // unknown — don't flag
}

const RECRUITMENT_RE =
  /staffing|recruit|talent|headhunt|placement|hiring platform/i;

// Compound phrases that signal region-locked business models.
// Single region words alone (e.g. "Africa") don't trigger — only when
// paired with staffing/sourcing language indicating regional exclusivity.
const REGION_LOCKED_PATTERNS: RegExp[] = [
  /nearshore|nearshoring/i,
  /latam\s+(?:talent|staffing|recruit(?:ing|ment)|sourcing)/i,
  /latin\s+america\s+(?:staffing|recruitment|sourcing)/i,
  /india\s+(?:staffing|recruitment|sourcing|only|focused)/i,
  /offshore\s+india/i,
  /\bbpo\b/i,
  /africa\s+(?:talent|staffing|sourcing|recruitment|only)/i,
  /gulf\s+(?:staffing|recruitment|manpower)/i,
  /uae\s+(?:manpower|staffing|recruitment)/i,
  /ksa\s+(?:recruitment|staffing|manpower)/i,
  /middle\s+east\s+(?:staffing|recruitment|manpower)/i,
  /apac\s+(?:staffing|recruitment|sourcing|only)/i,
  /southeast\s+asia\s+(?:talent|staffing|sourcing|recruitment)/i,
  /china\s+(?:recruitment|staffing|sourcing|only|focused)/i,
];

function isIrrelevantGeo(text: string): boolean {
  return REGION_LOCKED_PATTERNS.some((re) => re.test(text));
}

export function isICPTarget(data: CompanyData): ICPResult {
  const text = [data.industry, data.description, data.name].join(" ");

  if (!RECRUITMENT_RE.test(text)) {
    return { target: false, reason: "not-recruitment" };
  }

  if (parseLinkedInSize(data.size || "") > 200) {
    return { target: false, reason: "too-large" };
  }

  if (isIrrelevantGeo(text)) {
    return { target: false, reason: "irrelevant-geo" };
  }

  return { target: true };
}
