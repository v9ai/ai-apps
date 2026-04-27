/**
 * Fake account detector for LinkedIn contacts.
 *
 * Evaluates multiple signals (LinkedIn OG accessibility, headline patterns,
 * GitHub cross-reference, profile completeness) and produces a verdict
 * with flags, an authenticity score, and recommendations.
 *
 * Each flag carries a fixed penalty subtracted from a base score of 1.0.
 * Follows the same pattern as quality-gate.ts.
 */

import type { Contact } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FakeAccountFlag =
  | "linkedin_inaccessible"
  | "templated_headline"
  | "keyword_stuffing"
  | "github_not_found"
  | "skill_mismatch"
  | "profile_sparse"
  | "name_anomaly"
  | "no_cross_reference"
  | "recruiter_at_agency"
  | "low_ai_confidence";

export type AuthenticityVerdict = "verified" | "review" | "suspicious";

export interface SkillMatchResult {
  claimedSkills: string[];
  githubLanguages: string[];
  matched: boolean;
}

export interface FakeAccountResult {
  verdict: AuthenticityVerdict;
  authenticityScore: number;
  flags: FakeAccountFlag[];
  recommendations: string[];
  skillMatch: SkillMatchResult | null;
}

export interface FakeAccountInput {
  contact: Contact;
  linkedinOG: { headline: string | null; bio: string | null } | null;
  githubTopLanguages: string[];
  githubFound: boolean;
  targetSkills?: string[];
  isRecruitingFirm?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLAG_PENALTIES: Record<FakeAccountFlag, number> = {
  linkedin_inaccessible: 0.20,
  templated_headline: 0.15,
  keyword_stuffing: 0.10,
  github_not_found: 0.08,
  skill_mismatch: 0.15,
  profile_sparse: 0.10,
  name_anomaly: 0.05,
  no_cross_reference: 0.10,
  recruiter_at_agency: 0.05,
  low_ai_confidence: 0.02,
};

const VERIFIED_THRESHOLD = 0.70;
const SUSPICIOUS_THRESHOLD = 0.40;

// Headline patterns that suggest a fake or low-quality profile
const TEMPLATE_PATTERNS: RegExp[] = [
  /looking for (opportunities|new role|work|a position)/i,
  /open to (work|opportunities|new|roles)/i,
  /seeking (new|exciting|challenging|remote)/i,
  /aspiring\s+(developer|engineer|programmer)/i,
  /^[A-Za-z]+\s+Developer$/,              // bare "Python Developer"
  /^[A-Za-z]+\s+Engineer$/,               // bare "Rust Engineer"
  /actively looking/i,
  /available for hire/i,
  /freelancer?\s*\|\s*developer/i,
  /immediate joiner/i,
];

// Names that indicate non-person or test accounts
const FAKE_NAME_PATTERNS: RegExp[] = [
  /^linkedin\s+member$/i,
  /^test\s+user$/i,
  /^user\s+\d+$/i,
  /\d/,                                    // digits in name
];

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export function evaluateFakeAccount(input: FakeAccountInput): FakeAccountResult {
  const { contact, linkedinOG, githubTopLanguages, githubFound, targetSkills, isRecruitingFirm } = input;
  const flags: FakeAccountFlag[] = [];
  const recommendations: string[] = [];

  const headline = contact.position || linkedinOG?.headline || "";
  const bio = linkedinOG?.bio || "";
  const fullName = `${contact.first_name} ${contact.last_name}`.trim();

  // 1. LinkedIn OG inaccessible
  if (contact.linkedin_url && !linkedinOG) {
    flags.push("linkedin_inaccessible");
    recommendations.push("LinkedIn profile could not be scraped — may be private or non-existent");
  }

  // 2. Templated headline
  if (headline && TEMPLATE_PATTERNS.some(p => p.test(headline))) {
    flags.push("templated_headline");
    recommendations.push(`Headline matches a generic template pattern: "${headline}"`);
  }

  // 3. Keyword stuffing
  if (headline) {
    const pipeSegments = headline.split("|").length;
    const commaSegments = headline.split(",").length;
    if (pipeSegments >= 4 || commaSegments >= 6) {
      flags.push("keyword_stuffing");
      recommendations.push("Headline contains excessive keyword separators — possible SEO stuffing");
    }
  }

  // 4. GitHub not found
  if (!githubFound && !contact.github_handle) {
    flags.push("github_not_found");
    recommendations.push("No GitHub profile discovered via name search");
  }

  // 5. Skill mismatch (only when target skills provided)
  let skillMatch: SkillMatchResult | null = null;
  if (targetSkills?.length) {
    const claimedSkills = targetSkills.filter(s =>
      headline.toLowerCase().includes(s.toLowerCase()) ||
      (contact.position ?? "").toLowerCase().includes(s.toLowerCase()),
    );

    if (claimedSkills.length > 0 && githubTopLanguages.length > 0) {
      const langLower = githubTopLanguages.map(l => l.toLowerCase());
      const matched = claimedSkills.some(s => langLower.includes(s.toLowerCase()));
      skillMatch = { claimedSkills, githubLanguages: githubTopLanguages, matched };

      if (!matched) {
        flags.push("skill_mismatch");
        recommendations.push(
          `Claims ${claimedSkills.join("/")} but GitHub shows: ${githubTopLanguages.join(", ")}`,
        );
      }
    } else if (claimedSkills.length > 0) {
      skillMatch = { claimedSkills, githubLanguages: [], matched: false };
    }
  }

  // 6. Profile sparsity
  if (linkedinOG && !bio && headline.length < 20) {
    flags.push("profile_sparse");
    recommendations.push("Profile has minimal content — very short headline and no bio");
  }

  // 7. Name anomaly
  const lastName = contact.last_name.trim();
  if (
    lastName.length <= 1 ||
    FAKE_NAME_PATTERNS.some(p => p.test(fullName)) ||
    fullName === fullName.toUpperCase()
  ) {
    flags.push("name_anomaly");
    recommendations.push(`Name "${fullName}" matches suspicious patterns`);
  }

  // 8. No cross-reference
  if (!githubFound && !contact.github_handle && !contact.email_verified) {
    flags.push("no_cross_reference");
    recommendations.push("No external verification — no GitHub, no verified email");
  }

  // 9. Recruiter at agency
  if (isRecruitingFirm && /\b(recruit|talent|sourcing|staffing)\b/i.test(headline)) {
    flags.push("recruiter_at_agency");
    recommendations.push("Recruiter at recruiting firm — real person but not a technical contact");
  }

  // 10. Low AI synthesis confidence
  if (contact.profile) {
    try {
      const profile = JSON.parse(contact.profile);
      if (typeof profile.synthesis_confidence === "number" && profile.synthesis_confidence < 0.2) {
        flags.push("low_ai_confidence");
        recommendations.push("AI enrichment had very low confidence in profile synthesis");
      }
    } catch { /* ignore parse errors */ }
  }

  // Compute score
  const penalty = flags.reduce((sum, f) => sum + FLAG_PENALTIES[f], 0);
  const authenticityScore = Math.max(0, Math.round((1.0 - penalty) * 100) / 100);

  const verdict: AuthenticityVerdict =
    authenticityScore >= VERIFIED_THRESHOLD ? "verified"
    : authenticityScore >= SUSPICIOUS_THRESHOLD ? "review"
    : "suspicious";

  return { verdict, authenticityScore, flags, recommendations, skillMatch };
}
