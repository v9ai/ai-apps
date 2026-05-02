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
  linkedinNumericId?: string;
  country?: string;
}

export interface ICPResult {
  target: boolean;
  reason?: "not-recruitment" | "too-large" | "irrelevant-geo" | "non-tech-vertical" | "no-remote-jobs";
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
  /\b(?:delhi|new delhi|mumbai|bangalore|bengaluru|hyderabad|chennai|pune|gurugram|gurgaon|noida|kolkata|ahmedabad)\b/i,
];

function isIrrelevantGeo(text: string): boolean {
  return REGION_LOCKED_PATTERNS.some((re) => re.test(text));
}

// Non-tech verticals — recruiters specializing in these fields are not ICP targets.
// We want software/CS/IT/tech recruiting only.
const NON_TECH_VERTICALS: RegExp[] = [
  // Logistics & supply chain
  /supply\s*chain/i,
  /\blogistics?\b/i,
  /\btransportation\b/i,
  /\bwarehousing?\b/i,
  /\bfreight\b/i,
  /\bshipping\b/i,
  /\btrucking\b/i,
  /\bfleet\b/i,
  // Healthcare & medical
  /\bhealthcare\b/i,
  /\bmedical\b/i,
  /\bnursing\b/i,
  /\bpharmac(?:y|eutical)\b/i,
  /\bdental\b/i,
  /\bclinical\b/i,
  /\bphysician\b/i,
  /\blocum\s*tenens\b/i,
  /\ballied\s*health\b/i,
  // Construction & trades
  /\bconstruction\b/i,
  /\btrades?\b/i,
  /\bskilled\s*labor\b/i,
  /\bmanufacturing\b/i,
  /\bindustrial\b/i,
  /\barchitect(?:ure|ural)?\b/i,
  // Finance & accounting (non-tech)
  /\baccounting\b/i,
  /\btax\s+(?:staff|recruit|talent)/i,
  /\baudit(?:ing)?\b/i,
  /\bbookkeep/i,
  /\bactuari/i,
  // Legal
  /\blegal\s+(?:staff|recruit|talent|place)/i,
  /\bparalegal\b/i,
  /\battorney\b/i,
  /\blaw\s+firm/i,
  // Hospitality & food
  /\bhospitality\b/i,
  /\bculinary\b/i,
  /\brestaurant/i,
  /\bcatering\b/i,
  /\bhotel/i,
  // Education
  /\beducation\s+(?:staff|recruit|talent)/i,
  /\bteacher\b/i,
  /\bfaculty\b/i,
  // Oil & gas / energy (non-renewable)
  /\boil\s*(?:&|and)\s*gas\b/i,
  /\bmining\b/i,
  /\bdrilling\b/i,
  // Insurance
  /\binsurance\s+(?:staff|recruit|talent|agent)/i,
  // Retail
  /\bretail\s+(?:staff|recruit|talent)/i,
  // Agriculture
  /\bagri(?:culture|cultural)\b/i,
  /\bfarming\b/i,
];

function isNonTechVertical(text: string): boolean {
  return NON_TECH_VERTICALS.some((re) => re.test(text));
}

export function isICPTarget(data: CompanyData): ICPResult {
  const text = [data.industry, data.description, data.name, data.location].join(" ");

  if (data.industry.trim().toLowerCase() !== "staffing and recruiting") {
    return { target: false, reason: "not-recruitment" };
  }

  if (parseLinkedInSize(data.size || "") > 200) {
    return { target: false, reason: "too-large" };
  }

  if (isIrrelevantGeo(text)) {
    return { target: false, reason: "irrelevant-geo" };
  }

  // Check description + name for non-tech specialization
  const descAndName = [data.description, data.name].join(" ");
  if (isNonTechVertical(descAndName)) {
    return { target: false, reason: "non-tech-vertical" };
  }

  return { target: true };
}
