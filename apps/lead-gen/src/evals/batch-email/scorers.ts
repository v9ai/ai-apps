import type {
  EmailQualityInput,
  EmailQualityAttributes,
  EmailQualityScore,
  EmailQualityCheck,
} from "./schema";

/**
 * Count words in a string (split on whitespace).
 */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Score a generated email against expected quality attributes.
 *
 * Returns a weighted composite score (0-1) with per-check breakdowns.
 */
export function scoreEmailQuality(
  input: EmailQualityInput,
  output: { subject: string; body: string } | null,
): EmailQualityScore {
  const checks: Record<string, EmailQualityCheck> = {};

  // --- Valid JSON parse ---
  if (!output) {
    checks["valid-json"] = { score: 0, comment: "Failed to parse as JSON" };
    // All other checks get 0 since there's no output
    for (const key of [
      "has-name-placeholder",
      "has-greeting",
      "has-signoff",
      "word-count",
      "has-cta",
      "tone-match",
      "mentions-company",
    ]) {
      checks[key] = { score: 0, comment: "Skipped — no parseable output" };
    }
    return { score: 0, checks };
  }

  checks["valid-json"] = { score: 1, comment: "Parsed successfully" };

  const body = output.body;

  // --- Contains {{name}} ---
  const hasName = body.includes("{{name}}");
  checks["has-name-placeholder"] = {
    score: hasName ? 1 : 0,
    comment: hasName ? "Contains {{name}}" : "Missing {{name}} placeholder",
  };

  // --- Has greeting (Hey/Hi/Hello {{name}}) ---
  const greetingPattern = /\b(Hey|Hi|Hello)\s+\{\{name\}\}/i;
  const hasGreeting = greetingPattern.test(body);
  checks["has-greeting"] = {
    score: hasGreeting ? 1 : 0,
    comment: hasGreeting
      ? "Has proper greeting"
      : "Missing greeting with {{name}}",
  };

  // --- Has signoff (Thanks,\nVadim or similar) ---
  const signoffPattern = /Thanks,?\s*\n\s*Vadim/i;
  const hasSignoff = signoffPattern.test(body);
  checks["has-signoff"] = {
    score: hasSignoff ? 1 : 0,
    comment: hasSignoff ? "Has proper signoff" : "Missing 'Thanks,\\nVadim' signoff",
  };

  // --- Word count in [100, 180] ---
  const wc = wordCount(body);
  const lowerBound = 100;
  const upperBound = 180;
  let wordCountScore: number;
  let wordCountComment: string;

  if (wc >= lowerBound && wc <= upperBound) {
    wordCountScore = 1.0;
    wordCountComment = `${wc} words (in range)`;
  } else if (wc >= lowerBound * 0.8 && wc <= upperBound * 1.2) {
    wordCountScore = 0.5;
    wordCountComment = `${wc} words (within 20% of bounds)`;
  } else {
    wordCountScore = 0;
    wordCountComment = `${wc} words (out of range [${lowerBound}-${upperBound}])`;
  }
  checks["word-count"] = { score: wordCountScore, comment: wordCountComment };

  // --- Has clear CTA ---
  const ctaPatterns = [
    /\?/,
    /let me know/i,
    /happy to/i,
    /open to/i,
    /would love to/i,
    /interested in/i,
    /schedule/i,
    /connect/i,
    /grab a/i,
    /hop on/i,
  ];
  const hasCTA = ctaPatterns.some((p) => p.test(body));
  checks["has-cta"] = {
    score: hasCTA ? 1 : 0,
    comment: hasCTA ? "Has clear CTA" : "No CTA detected",
  };

  // --- Tone matches instructions ---
  let toneScore = 1; // default pass if no specific tone expected
  let toneComment = "No specific tone required";

  if (input.instructions) {
    const instructions = input.instructions.toLowerCase();
    const bodyLower = body.toLowerCase();

    // Follow-up detection
    const isFollowUp =
      /follow.?up|applied|application|no response|checking in/i.test(
        instructions,
      );
    if (isFollowUp) {
      const hasFollowUpTone =
        /follow|applied|application|checking|reaching out again|previous/i.test(
          bodyLower,
        );
      toneScore = hasFollowUpTone ? 1 : 0;
      toneComment = hasFollowUpTone
        ? "Follow-up tone detected"
        : "Expected follow-up tone but not found";
    }

    // Referral detection
    const referralMatch = instructions.match(
      /(\w+)\s+referred/i,
    );
    if (referralMatch) {
      const refName = referralMatch[1].toLowerCase();
      const mentionsRef = bodyLower.includes(refName);
      toneScore = mentionsRef ? 1 : 0;
      toneComment = mentionsRef
        ? `Mentions referrer "${referralMatch[1]}"`
        : `Missing referrer name "${referralMatch[1]}"`;
    }

    // Technical keywords detection
    const techKeywords = instructions.match(
      /\b(Rust|AI|React|TypeScript|Python|ML|machine learning)\b/gi,
    );
    if (techKeywords && !isFollowUp && !referralMatch) {
      const found = techKeywords.filter((kw) =>
        bodyLower.includes(kw.toLowerCase()),
      );
      toneScore = found.length > 0 ? 1 : 0;
      toneComment =
        found.length > 0
          ? `Mentions tech keywords: ${found.join(", ")}`
          : `Missing expected keywords: ${techKeywords.join(", ")}`;
    }
  }
  checks["tone-match"] = { score: toneScore, comment: toneComment };

  // --- Mentions company (if provided) ---
  if (input.companyName) {
    const mentionsCompany = body
      .toLowerCase()
      .includes(input.companyName.toLowerCase());
    checks["mentions-company"] = {
      score: mentionsCompany ? 1 : 0,
      comment: mentionsCompany
        ? `Mentions "${input.companyName}"`
        : `Missing company name "${input.companyName}"`,
    };
  } else {
    checks["mentions-company"] = {
      score: 1,
      comment: "No company provided — N/A",
    };
  }

  // --- Composite weighted score ---
  const weights: Record<string, number> = {
    "has-name-placeholder": 0.15,
    "has-greeting": 0.1,
    "has-signoff": 0.1,
    "word-count": 0.15,
    "has-cta": 0.15,
    "tone-match": 0.15,
    "mentions-company": 0.1,
    "valid-json": 0.1,
  };

  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += (checks[key]?.score ?? 0) * weight;
  }

  return { score, checks };
}
