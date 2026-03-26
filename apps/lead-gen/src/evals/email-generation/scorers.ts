import type { EmailTestCase, EmailScoreResult } from "./schema";

const ROBOTIC_PHRASES = [
  "I hope this email finds you well",
  "I am writing to express my interest",
  "I would like to take this opportunity",
  "Please find attached",
  "I look forward to hearing from you at your earliest convenience",
  "Do not hesitate to contact me",
  "Pursuant to",
  "As per my last email",
  "To whom it may concern",
  "Dear Sir/Madam",
  "I am reaching out regarding",
];

const SENDER_SKILLS: Record<string, string[]> = {
  frontend: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
  "ai-ml": ["LLM", "RAG", "AI SDK", "prompt engineering", "LangChain", "AI"],
  backend: ["Node.js", "GraphQL", "REST", "PostgreSQL", "SQLite", "SQL"],
  systems: ["Rust", "WebAssembly", "WASM", "Cloudflare Workers"],
  infra: ["Docker", "CI/CD", "Vercel", "Cloudflare"],
};

/**
 * Score skill relevance: Are the right skills mentioned?
 * Checks mustMention phrases and expectedSkillCategory overlap.
 */
export function scoreRelevance(email: string, testCase: EmailTestCase): number {
  const lower = email.toLowerCase();
  let score = 1.0;

  // mustMention check
  if (testCase.mustMention && testCase.mustMention.length > 0) {
    const found = testCase.mustMention.filter((phrase) =>
      lower.includes(phrase.toLowerCase())
    );
    const mentionScore = found.length / testCase.mustMention.length;
    score = Math.min(score, mentionScore);
  }

  // mustNotContain check — each violation drops score
  if (testCase.mustNotContain && testCase.mustNotContain.length > 0) {
    const violations = testCase.mustNotContain.filter((phrase) =>
      lower.includes(phrase.toLowerCase())
    );
    if (violations.length > 0) {
      score *= Math.max(0, 1 - violations.length * 0.3);
    }
  }

  // Check skill category alignment
  if (testCase.expectedSkillCategory && testCase.jobContext?.requiredSkills) {
    const expectedSenderSkills = testCase.expectedSkillCategory.flatMap(
      (cat) => SENDER_SKILLS[cat] || []
    );
    const irrelevantCategories = Object.keys(SENDER_SKILLS).filter(
      (cat) => !testCase.expectedSkillCategory!.includes(cat as any)
    );
    const irrelevantSkills = irrelevantCategories.flatMap(
      (cat) => SENDER_SKILLS[cat]
    );

    // Bonus for mentioning relevant skills
    const relevantMentioned = expectedSenderSkills.filter((s) =>
      lower.includes(s.toLowerCase())
    );
    if (relevantMentioned.length > 0) {
      score = Math.min(score + 0.1, 1.0);
    }

    // Penalty for mentioning clearly irrelevant skills
    const irrelevantMentioned = irrelevantSkills.filter((s) =>
      lower.includes(s.toLowerCase())
    );
    if (irrelevantMentioned.length > 2) {
      score *= 0.7;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Score naturalness: Does the email sound human?
 */
export function scoreNaturalness(email: string, testCase: EmailTestCase): number {
  const lower = email.toLowerCase();
  let score = 1.0;

  // Check for robotic phrases
  const roboticFound = ROBOTIC_PHRASES.filter((phrase) =>
    lower.includes(phrase.toLowerCase())
  );
  score -= roboticFound.length * 0.15;

  // Check mustNotContain as naturalness violations too
  if (testCase.mustNotContain) {
    const violations = testCase.mustNotContain.filter((phrase) =>
      lower.includes(phrase.toLowerCase())
    );
    score -= violations.length * 0.2;
  }

  // Penalty for excessive exclamation marks
  const exclamationCount = (email.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    score -= 0.1;
  }

  // Penalty for ALL CAPS words (more than 2)
  const capsWords = (email.match(/\b[A-Z]{3,}\b/g) || []).filter(
    (w) => !["MAX", "CTA", "API", "SDK", "RAG", "LLM", "AWS", "AI", "ML", "EU", "CSS", "SQL"].includes(w)
  );
  if (capsWords.length > 2) {
    score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Score personalization: Does it reference company name and job title?
 */
export function scorePersonalization(email: string, testCase: EmailTestCase): number {
  const lower = email.toLowerCase();
  let score = 0.5; // base score

  // Company name mentioned
  if (testCase.companyName && lower.includes(testCase.companyName.toLowerCase())) {
    score += 0.25;
  }

  // Job title or role mentioned
  if (testCase.jobContext?.title && lower.includes(testCase.jobContext.title.toLowerCase())) {
    score += 0.25;
  }

  // Has {{name}} placeholder
  if (email.includes("{{name}}")) {
    score = Math.max(score, score); // Already counted in structure
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Score structure: greeting, CTA, sign-off.
 */
export function scoreStructure(email: string): number {
  let score = 0;
  const lower = email.toLowerCase();

  // Has greeting with {{name}} or a name
  if (/^(hey|hi|hello)\s+\{\{name\}\}/i.test(email.trim())) {
    score += 0.35;
  } else if (/^(hey|hi|hello)\s+/i.test(email.trim())) {
    score += 0.25;
  }

  // Has CTA (question or suggestion)
  if (lower.includes("?") || lower.includes("chat") || lower.includes("call") || lower.includes("meet") || lower.includes("connect")) {
    score += 0.3;
  }

  // Has sign-off
  if (/thanks,?\s*\n\s*vadim/i.test(email)) {
    score += 0.35;
  } else if (/thanks|regards|best|cheers/i.test(email)) {
    score += 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Score conciseness: word count within 100-180 range.
 */
export function scoreConciseness(email: string): number {
  const wordCount = email.split(/\s+/).filter(Boolean).length;

  if (wordCount >= 100 && wordCount <= 180) return 1.0;
  if (wordCount >= 80 && wordCount < 100) return 0.8;
  if (wordCount > 180 && wordCount <= 220) return 0.8;
  if (wordCount >= 60 && wordCount < 80) return 0.6;
  if (wordCount > 220 && wordCount <= 260) return 0.5;
  if (wordCount < 60) return 0.3;
  return 0.2; // > 260
}

/**
 * Score no hallucination: no fabricated details.
 */
export function scoreNoHallucination(email: string, testCase: EmailTestCase): number {
  const lower = email.toLowerCase();
  let score = 1.0;

  // Check mustNotContain strictly
  if (testCase.mustNotContain) {
    const violations = testCase.mustNotContain.filter((phrase) =>
      lower.includes(phrase.toLowerCase())
    );
    score -= violations.length * 0.25;
  }

  // Check for fabricated certifications
  const fakeCerts = [
    "certified", "certification", "PhD", "Master's degree",
    "published paper", "patent",
  ];
  const certViolations = fakeCerts.filter((c) => lower.includes(c.toLowerCase()));
  if (certViolations.length > 0) {
    score -= certViolations.length * 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Compute weighted composite score.
 */
export function scoreComposite(scores: Omit<EmailScoreResult, "composite">): number {
  const weights = {
    relevance: 0.25,
    naturalness: 0.20,
    personalization: 0.20,
    noHallucination: 0.15,
    structure: 0.10,
    conciseness: 0.10,
  };

  return (
    scores.relevance * weights.relevance +
    scores.naturalness * weights.naturalness +
    scores.personalization * weights.personalization +
    scores.noHallucination * weights.noHallucination +
    scores.structure * weights.structure +
    scores.conciseness * weights.conciseness
  );
}

/**
 * Run all scorers and return complete result.
 */
export function scoreEmail(email: string, testCase: EmailTestCase): EmailScoreResult {
  const relevance = scoreRelevance(email, testCase);
  const naturalness = scoreNaturalness(email, testCase);
  const personalization = scorePersonalization(email, testCase);
  const structure = scoreStructure(email);
  const conciseness = scoreConciseness(email);
  const noHallucination = scoreNoHallucination(email, testCase);

  const dimensionScores = { relevance, naturalness, personalization, structure, conciseness, noHallucination };
  const composite = scoreComposite(dimensionScores);

  return { ...dimensionScores, composite };
}
