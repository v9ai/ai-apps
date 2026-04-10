/**
 * ML Contact Classification and Deletion Scoring utilities.
 *
 * These pure functions are used by mutations when creating/updating contacts
 * and by the deletion-scoring pipeline.
 */

import type { Contact as DbContact } from "@/db/schema";

// ─── ML Contact Classification ────────────────────────────────────────────────

export interface ContactClassification {
  seniority: string;
  department: string;
  authorityScore: number;
  isDecisionMaker: boolean;
  dmReasons: string[];
}

/**
 * Classify a contact's job title into seniority tier, department,
 * authority score (0-1), and decision-maker flag.
 *
 * Mirrors the Rust `classify_contact()` in crates/leadgen/src/scoring/authority.rs.
 * This TypeScript version is used for real-time scoring in the GraphQL resolver
 * (Vercel serverless); the Rust version is used for offline batch scoring via
 * `leadgen score-neon --company <key>`.
 */
export function classifyContact(position: string | null | undefined): ContactClassification {
  const raw = position?.trim() ?? "";
  if (!raw) {
    return { seniority: "IC", department: "Other", authorityScore: 0.10, isDecisionMaker: false, dmReasons: ["No title provided"] };
  }

  const t = raw.toLowerCase();

  // ── Seniority ────────────────────────────────────────────────────────────
  let seniority = "IC";
  let authorityScore = 0.10;
  let seniorityReason = `Title '${raw}' classified as IC`;

  const C_LEVEL_PATTERNS = [
    "chief executive", "chief technology", "chief technical", "chief product",
    "chief operating", "chief financial", "chief revenue", "chief marketing",
    "chief data", "chief ai", "chief machine learning", "chief science",
    "chief information", "chief growth", "chief people", "chief legal",
    "chief compliance", "chief architect",
  ];
  const isCLevel =
    C_LEVEL_PATTERNS.some(p => t.includes(p)) ||
    /\bceo\b/.test(t) || /\bcto\b/.test(t) || /\bcfo\b/.test(t) ||
    /\bcoo\b/.test(t) || /\bcpo\b/.test(t) || /\bcro\b/.test(t) || /\bcmo\b/.test(t);

  if (isCLevel) {
    seniority = "C-level"; authorityScore = 1.0; seniorityReason = `Title matches C-level pattern`;
  } else if (["founder", "co-founder", "cofounder", "president", "co founder"].some(p => t.includes(p))) {
    seniority = "Founder"; authorityScore = 0.95; seniorityReason = "Title matches Founder pattern";
  } else if (["managing partner", "general partner", " partner", "equity partner"].some(p => t.includes(p))) {
    seniority = "Partner"; authorityScore = 0.90; seniorityReason = "Title matches Partner pattern";
  } else if (
    ["vice president", "vp of", "vp,", "vp engineering", "vp product", "vp sales",
     "vp marketing", "vp business", "vp operations", "vp ai", "vp technology",
     "vp research", "vp data", "vp partnerships", "vp finance", "vp strategy"].some(p => t.includes(p)) ||
    t.startsWith("vp ") || t === "vp"
  ) {
    seniority = "VP"; authorityScore = 0.85; seniorityReason = "Title matches VP pattern";
  } else if (
    ["director of", "director,", "director ", "head of", "general manager",
     "managing director", "regional director", "executive director",
     "associate director", "group lead", "group manager"].some(p => t.includes(p)) ||
    t === "director"
  ) {
    seniority = "Director"; authorityScore = 0.75; seniorityReason = "Title matches Director/Head-of pattern";
  } else if (
    ["engineering manager", "product manager", "project manager", "program manager",
     "team lead", "tech lead", "technical lead", "team manager", "area manager",
     "delivery manager", "account manager", "practice lead"].some(p => t.includes(p)) ||
    (t.includes("manager") && !t.includes("general manager")) ||
    t.endsWith(" lead")
  ) {
    seniority = "Manager"; authorityScore = 0.50; seniorityReason = "Title matches Manager/Lead pattern";
  } else if (["senior ", "staff ", "principal ", "sr. ", "sr "].some(p => t.includes(p))) {
    seniority = "Senior"; authorityScore = 0.25; seniorityReason = "Title matches Senior/Staff/Principal pattern";
  }

  // ── Department ───────────────────────────────────────────────────────────
  let department = "Other";
  let deptReason = "No department keyword found";

  const AI_ML = [
    "artificial intelligence", " ai ", "machine learning", "deep learning",
    "natural language", " nlp", "computer vision", " cv ", "data science",
    "data scientist", "mlops", "ml engineer", "llm", "large language",
    "language model", "generative ai", "reinforcement learning", "neural network",
    "foundation model", "ai research", "ai engineer", "ai architect", "ai lead",
    "ai director", "head of ai", "vp ai", "chief ai",
  ];
  if (AI_ML.some(p => t.includes(p)) || t.startsWith("ai ") || t.endsWith(" ai")) {
    department = "AI/ML"; deptReason = "Title contains AI/ML keywords";
  } else if (["research scientist", "research engineer", "researcher", "r&d",
              "research and development", "scientist", " lab ", "applied science"].some(p => t.includes(p))) {
    department = "Research"; deptReason = "Title contains Research keywords";
  } else if (["engineer", "developer", "software", "backend", "frontend", "full stack",
              "fullstack", "platform", "infrastructure", "devops", "site reliability",
              "sre", "cloud architect", "solutions architect", "architect", "cto",
              "vp eng", "engineering manager", "head of engineering"].some(p => t.includes(p))) {
    department = "Engineering"; deptReason = "Title contains Engineering keywords";
  } else if (["product manager", "product owner", "product lead", "head of product",
              "vp product", "cpo", "ux", "user experience", "product design",
              "ui designer", "ux designer"].some(p => t.includes(p))) {
    department = "Product"; deptReason = "Title contains Product keywords";
  } else if (["sales", "business development", "account executive", "account manager",
              "commercial", "revenue", "partnerships", "partner manager",
              "strategic alliance", "cro", "pre-sales", "presales",
              "solution selling", "enterprise", "channel"].some(p => t.includes(p))) {
    department = "Sales/BD"; deptReason = "Title contains Sales/BD keywords";
  } else if (["marketing", "growth", "cmo", "brand", "content", "demand generation",
              "seo", "paid acquisition", "pr ", "public relations", "communications",
              "product marketing"].some(p => t.includes(p))) {
    department = "Marketing"; deptReason = "Title contains Marketing keywords";
  } else if (["recruiter", "recruiting", "recruitment", "talent acquisition",
              "talent partner", "head of talent", "head of people", "chief people",
              "people operations", "hr manager", "hrbp", "human resources",
              "people & culture", "people and culture", "people team"].some(p => t.includes(p))) {
    department = "HR/Recruiting"; deptReason = "Title contains HR/Recruiting keywords (gatekeeper)";
  } else if (["finance", "cfo", "controller", "accounting", "treasurer",
              "financial", "fp&a", "investor relations"].some(p => t.includes(p))) {
    department = "Finance"; deptReason = "Title contains Finance keywords";
  } else if (["operations", "coo", "general manager", "chief of staff", "strategy",
              "transformation", "process", "supply chain", "program operations"].some(p => t.includes(p))) {
    department = "Operations"; deptReason = "Title contains Operations keywords";
  }

  // ── Gatekeeper penalty ───────────────────────────────────────────────────
  const reasons: string[] = [seniorityReason, deptReason];
  let effectiveScore = authorityScore;
  if (department === "HR/Recruiting") {
    effectiveScore = authorityScore * 0.4;
    reasons.push("HR/Recruiting contacts are gatekeepers, not hiring DMs");
  }

  const isDecisionMaker = effectiveScore >= 0.70;
  if (isDecisionMaker) reasons.push(`Authority score ${effectiveScore.toFixed(2)} >= 0.70 threshold`);

  return {
    seniority,
    department,
    authorityScore: Math.round(effectiveScore * 100) / 100,
    isDecisionMaker,
    dmReasons: reasons,
  };
}

// ─── ML Deletion Scoring ─────────────────────────────────────────────────────

export interface DeletionScore {
  score: number;
  reasons: string[];
}

/**
 * Compute a 0-1 deletion score for a contact using a 10-factor weighted model.
 * Higher score = stronger signal the contact should be purged.
 *
 * Factors (weight):
 *  1. Email invalidity     0.25 -- nb_status invalid/disposable/unknown or email null
 *  2. Email bounce         0.20 -- email in bounced_emails or nb_result fail
 *  3. Staleness            0.15 -- last_contacted_at > 180 days with no reply, or created > 365 days untouched
 *  4. Data incompleteness  0.10 -- no email + no linkedin + no github
 *  5. Low relevance        0.10 -- HR/Recruiting or Other AND authority_score < 0.30
 *  6. DNC flag             0.08 -- do_not_contact = true
 *  7. Outreach exhaustion  0.07 -- > 3 outbound emails, no reply
 *  8. Low authority        0.03 -- authority_score < 0.15
 *  9. No position          0.01 -- position null or empty
 * 10. Tag signals          0.01 -- tags contain stale/archived/left-company/wrong-person
 */
export function computeDeletionScore(
  contact: DbContact,
  outboundEmailCount: number = 0,
  anyReply: boolean = false,
): DeletionScore {
  const reasons: string[] = [];
  let score = 0;

  const msPerDay = 86_400_000;
  const now = Date.now();

  // Factor 1 -- email invalidity (0.25)
  const INVALID_NB_STATUSES = new Set(["invalid", "disposable", "unknown", "catchall"]);
  if (!contact.email) {
    score += 0.25;
    reasons.push("No email address");
  } else if (contact.nb_status && INVALID_NB_STATUSES.has(contact.nb_status)) {
    score += 0.25;
    reasons.push(`NeverBounce status: ${contact.nb_status}`);
  } else if (contact.email_verified === false && contact.nb_status) {
    score += 0.15;
    reasons.push("Email not verified");
  }

  // Factor 2 -- email bounce (0.20)
  const bouncedList: string[] = parseJsonArray(contact.bounced_emails);
  const emailBounced = contact.email && bouncedList.includes(contact.email);
  const nbFail = contact.nb_result === "failed" || contact.nb_result === "fail";
  if (emailBounced || nbFail) {
    score += 0.20;
    reasons.push(emailBounced ? "Primary email is in bounced list" : `NeverBounce result: ${contact.nb_result}`);
  }

  // Factor 3 -- staleness (0.15)
  const createdMs = contact.created_at ? new Date(contact.created_at).getTime() : 0;
  const lastContactedMs = contact.last_contacted_at ? new Date(contact.last_contacted_at).getTime() : 0;
  const daysSinceCreated = createdMs ? Math.floor((now - createdMs) / msPerDay) : 0;
  const daysSinceContacted = lastContactedMs ? Math.floor((now - lastContactedMs) / msPerDay) : 0;
  if (lastContactedMs && daysSinceContacted > 180 && !anyReply) {
    score += 0.15;
    reasons.push(`Last contacted ${daysSinceContacted} days ago with no reply`);
  } else if (!lastContactedMs && daysSinceCreated > 365) {
    score += 0.10;
    reasons.push(`Never contacted, created ${daysSinceCreated} days ago`);
  }

  // Factor 4 -- data incompleteness (0.10)
  if (!contact.email && !contact.linkedin_url && !contact.github_handle) {
    score += 0.10;
    reasons.push("No email, LinkedIn URL, or GitHub handle -- no reachability vector");
  }

  // Factor 5 -- low relevance (0.10)
  const LOW_RELEVANCE_DEPTS = new Set(["HR/Recruiting", "Other"]);
  const authorityScore = contact.authority_score ?? 0;
  if (LOW_RELEVANCE_DEPTS.has(contact.department ?? "") && authorityScore < 0.30) {
    score += 0.10;
    reasons.push(`Low-relevance dept '${contact.department}' with authority score ${authorityScore.toFixed(2)}`);
  }

  // Factor 6 -- DNC flag (0.08)
  const isDnc = (contact.do_not_contact as unknown) === true || (contact.do_not_contact as unknown) === 1;
  if (isDnc) {
    score += 0.08;
    reasons.push("Marked do-not-contact");
  }

  // Factor 7 -- outreach exhaustion (0.07)
  if (outboundEmailCount > 3 && !anyReply) {
    score += 0.07;
    reasons.push(`${outboundEmailCount} outbound emails sent with no reply`);
  }

  // Factor 8 -- low authority (0.03)
  if (authorityScore < 0.15) {
    score += 0.03;
    reasons.push(`Very low authority score (${authorityScore.toFixed(2)})`);
  }

  // Factor 9 -- no position (0.01)
  if (!contact.position?.trim()) {
    score += 0.01;
    reasons.push("No job title");
  }

  // Factor 10 -- tag signals (0.01)
  const STALE_TAGS = new Set(["archived", "stale", "left-company", "wrong-person"]);
  const tags: string[] = parseJsonArray(contact.tags);
  const staleTag = tags.find((t) => STALE_TAGS.has(t.toLowerCase()));
  if (staleTag) {
    score += 0.01;
    reasons.push(`Tag '${staleTag}' signals stale contact`);
  }

  return { score: Math.min(Math.round(score * 100) / 100, 1.0), reasons };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely parse JSON arrays with proper error handling and logging.
 * Prevents crashes from malformed JSON data in database.
 */
export function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch (error) {
    console.warn("[parseJsonArray] Failed to parse JSON:", {
      error: error instanceof Error ? error.message : String(error),
      valueLength: val?.length,
      valuePreview: val?.substring(0, 100),
    });
    return [];
  }
}
