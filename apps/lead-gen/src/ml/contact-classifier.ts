/**
 * ML contact title classifier.
 *
 * Two paths:
 * 1. LLM: fine-tuned Qwen via local mlx_lm.server (classifyContactLLM)
 * 2. Heuristic: weighted keyword scoring (classifyContactML)
 *
 * classifyContactHybrid() tries LLM first, falls back to heuristic.
 */

import OpenAI from "openai";

export interface ContactMLClassification {
  seniority: string;
  seniorityConfidence: number;
  department: string;
  departmentConfidence: number;
  authorityScore: number;
  isDecisionMaker: boolean;
}

// ── Seniority keyword weights ────────────────────────────────────────────

interface WeightedPattern {
  pattern: RegExp;
  weight: number;
}

const SENIORITY_CLASSES: Record<string, WeightedPattern[]> = {
  "C-level": [
    { pattern: /\b(ceo|cto|cfo|coo|cpo|cro|cmo|cdo|cio|cso)\b/, weight: 1.0 },
    { pattern: /\bchief\s+(executive|technology|technical|product|operating|financial|revenue|marketing|data|ai|information|science|growth|people|legal|architect)/, weight: 1.0 },
  ],
  Founder: [
    { pattern: /\b(founder|co-?founder|cofounder)\b/, weight: 0.95 },
    { pattern: /\bpresident\b/, weight: 0.90 },
  ],
  Partner: [
    { pattern: /\b(managing|general|equity)\s+partner\b/, weight: 0.90 },
    { pattern: /\bpartner\b/, weight: 0.80 },
  ],
  VP: [
    { pattern: /\bvice\s+president\b/, weight: 0.85 },
    { pattern: /\bvp\s+(of\s+)?[a-z]+/, weight: 0.85 },
    { pattern: /\bsvp\b/, weight: 0.88 },
    { pattern: /\bevp\b/, weight: 0.87 },
  ],
  Director: [
    { pattern: /\b(director|head\s+of)\b/, weight: 0.75 },
    { pattern: /\b(managing|executive|regional|associate)\s+director\b/, weight: 0.78 },
    { pattern: /\bgeneral\s+manager\b/, weight: 0.72 },
  ],
  Manager: [
    { pattern: /\b(engineering|product|project|program|delivery|account|practice|team)\s+manager\b/, weight: 0.50 },
    { pattern: /\b(team|tech|technical)\s+lead\b/, weight: 0.50 },
    { pattern: /\bmanager\b/, weight: 0.45 },
    { pattern: /\blead\b/, weight: 0.40 },
  ],
  Senior: [
    { pattern: /\b(senior|staff|principal|sr\.?)\s/, weight: 0.25 },
    { pattern: /\blead\s+(engineer|developer|designer)\b/, weight: 0.30 },
  ],
  IC: [
    { pattern: /\b(engineer|developer|analyst|designer|specialist|coordinator|associate)\b/, weight: 0.10 },
  ],
};

// ── Department keyword weights ───────────────────────────────────────────

const DEPARTMENT_CLASSES: Record<string, WeightedPattern[]> = {
  "AI/ML": [
    { pattern: /\b(artificial\s+intelligence|machine\s+learning|deep\s+learning)\b/, weight: 0.95 },
    { pattern: /\b(nlp|natural\s+language|computer\s+vision|data\s+scien)\b/, weight: 0.90 },
    { pattern: /\b(mlops|ml\s+engineer|llm|large\s+language|generative\s+ai)\b/, weight: 0.90 },
    { pattern: /\b(reinforcement\s+learning|neural\s+network|foundation\s+model)\b/, weight: 0.85 },
    { pattern: /\bai\s+(research|engineer|architect|lead|director)\b/, weight: 0.90 },
    { pattern: /\b(head\s+of\s+ai|vp\s+ai|chief\s+ai)\b/, weight: 0.95 },
  ],
  Research: [
    { pattern: /\b(research\s+scientist|research\s+engineer|researcher)\b/, weight: 0.90 },
    { pattern: /\b(r&d|applied\s+science|scientist)\b/, weight: 0.80 },
  ],
  Engineering: [
    { pattern: /\b(software|backend|frontend|full\s*stack|platform|infrastructure)\b/, weight: 0.70 },
    { pattern: /\b(devops|sre|site\s+reliability|cloud\s+architect|solutions?\s+architect)\b/, weight: 0.75 },
    { pattern: /\b(engineer|developer|architect|cto)\b/, weight: 0.60 },
  ],
  Product: [
    { pattern: /\b(product\s+manager|product\s+owner|product\s+lead)\b/, weight: 0.85 },
    { pattern: /\b(ux|user\s+experience|product\s+design|ui\s+design)\b/, weight: 0.75 },
    { pattern: /\bcpo\b/, weight: 0.90 },
  ],
  "Sales/BD": [
    { pattern: /\b(sales|business\s+development|account\s+executive)\b/, weight: 0.85 },
    { pattern: /\b(partnerships|revenue|commercial|channel|pre-?sales)\b/, weight: 0.70 },
    { pattern: /\bcro\b/, weight: 0.90 },
  ],
  Marketing: [
    { pattern: /\b(marketing|growth|brand|demand\s+generation|content)\b/, weight: 0.80 },
    { pattern: /\b(seo|paid\s+acquisition|product\s+marketing)\b/, weight: 0.75 },
    { pattern: /\bcmo\b/, weight: 0.90 },
  ],
  "HR/Recruiting": [
    { pattern: /\b(recruiter|recruiting|recruitment|talent\s+acquisition)\b/, weight: 0.85 },
    { pattern: /\b(human\s+resources|people\s+operations|hrbp|hr\s+manager)\b/, weight: 0.80 },
    { pattern: /\b(head\s+of\s+people|chief\s+people|people\s+&?\s*culture)\b/, weight: 0.85 },
  ],
  Finance: [
    { pattern: /\b(finance|cfo|controller|accounting|treasurer|fp&a)\b/, weight: 0.85 },
  ],
  Operations: [
    { pattern: /\b(operations|coo|chief\s+of\s+staff|strategy|transformation)\b/, weight: 0.75 },
  ],
  Other: [],
};

/** Authority score per seniority level, used for decision-maker scoring. */
const AUTHORITY_SCORES: Record<string, number> = {
  "C-level": 1.0,
  Founder: 0.95,
  Partner: 0.90,
  VP: 0.85,
  Director: 0.75,
  Manager: 0.50,
  Senior: 0.25,
  IC: 0.10,
};

/** Departments that are gatekeepers (lower authority for lead-gen). */
const GATEKEEPER_DEPARTMENTS = new Set(["HR/Recruiting"]);
const GATEKEEPER_PENALTY = 0.4;
const DM_THRESHOLD = 0.70;

function scoreBestClass(
  text: string,
  classes: Record<string, WeightedPattern[]>,
  fallback: string,
): { label: string; confidence: number } {
  let bestLabel = fallback;
  let bestScore = 0;

  for (const [label, patterns] of Object.entries(classes)) {
    let score = 0;
    for (const { pattern, weight } of patterns) {
      if (pattern.test(text)) {
        score = Math.max(score, weight);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  }

  return { label: bestLabel, confidence: bestScore || 0.1 };
}

/**
 * Classify a contact title by seniority, department, and authority.
 *
 * Uses weighted keyword scoring rather than exact match for smoother
 * confidence values and better ranking.
 */
export function classifyContactML(
  position: string,
): ContactMLClassification {
  const raw = position.trim();
  if (!raw) {
    return {
      seniority: "IC",
      seniorityConfidence: 0.1,
      department: "Other",
      departmentConfidence: 0.1,
      authorityScore: 0.1,
      isDecisionMaker: false,
    };
  }

  const t = raw.toLowerCase();

  const sen = scoreBestClass(t, SENIORITY_CLASSES, "IC");
  const dept = scoreBestClass(t, DEPARTMENT_CLASSES, "Other");

  let authorityScore = AUTHORITY_SCORES[sen.label] ?? 0.1;
  if (GATEKEEPER_DEPARTMENTS.has(dept.label)) {
    authorityScore *= GATEKEEPER_PENALTY;
  }
  authorityScore = Math.round(authorityScore * 100) / 100;

  return {
    seniority: sen.label,
    seniorityConfidence: sen.confidence,
    department: dept.label,
    departmentConfidence: dept.confidence,
    authorityScore,
    isDecisionMaker: authorityScore >= DM_THRESHOLD,
  };
}

// ── LLM-based classification (fine-tuned Qwen via mlx_lm.server) ────────

const CONTACT_SYSTEM_PROMPT = `You classify B2B contact job titles into seniority level and department.

Seniority levels: C-level, Founder, Partner, VP, Director, Manager, Senior, IC
Departments: AI/ML, Research, Engineering, Product, Sales/BD, Marketing, HR/Recruiting, Finance, Operations, Other

Also compute:
- authorityScore (0.0-1.0): C-level=1.0, Founder=0.95, Partner=0.90, VP=0.85, Director=0.75, Manager=0.50, Senior=0.25, IC=0.10
- isDecisionMaker (boolean): true if authorityScore >= 0.70
- HR/Recruiting contacts get a 0.4x penalty on authorityScore (gatekeepers, not budget holders)

Respond with ONLY valid JSON:
{"seniority": "...", "department": "...", "authorityScore": 0.85, "isDecisionMaker": true}`;

export async function classifyContactLLM(
  position: string,
): Promise<ContactMLClassification> {
  const url = process.env.LLM_BASE_URL;
  if (!url) throw new Error("LLM_BASE_URL not set");

  const client = new OpenAI({ apiKey: "local", baseURL: url });
  const model = process.env.LLM_MODEL_CONTACT ?? process.env.LLM_MODEL ?? "mlx-community/Qwen2.5-1.5B-Instruct-4bit";

  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: CONTACT_SYSTEM_PROMPT },
      { role: "user", content: `Classify this job title: ${position}` },
    ],
    response_format: { type: "json_object" } as any,
    temperature: 0.1,
    max_tokens: 128,
  });

  const parsed = JSON.parse(res.choices?.[0]?.message?.content ?? "{}") as {
    seniority?: string;
    department?: string;
    authorityScore?: number;
    isDecisionMaker?: boolean;
  };

  const seniority = parsed.seniority ?? "IC";
  const department = parsed.department ?? "Other";
  const authorityScore = Math.max(0, Math.min(1, parsed.authorityScore ?? 0.1));

  return {
    seniority,
    seniorityConfidence: 0.9,
    department,
    departmentConfidence: 0.9,
    authorityScore: Math.round(authorityScore * 100) / 100,
    isDecisionMaker: parsed.isDecisionMaker ?? authorityScore >= DM_THRESHOLD,
  };
}

export async function classifyContactHybrid(
  position: string,
): Promise<ContactMLClassification> {
  if (!position.trim()) return classifyContactML(position);

  try {
    return await Promise.race([
      classifyContactLLM(position),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LLM timeout")), 10_000),
      ),
    ]);
  } catch {
    return classifyContactML(position);
  }
}
