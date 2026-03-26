import type { EmailQualityTestCase } from "./schema";

/**
 * Labeled test cases for batch email quality evaluation.
 *
 * Each case defines an input scenario and the expected quality attributes
 * the generated email should exhibit.
 */
export const emailQualityTestCases: EmailQualityTestCase[] = [
  {
    id: "cold-outreach-company",
    description: "Cold outreach with company name",
    input: {
      companyName: "TechShack",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: true,
    },
  },
  {
    id: "follow-up-application",
    description: "Follow-up after application",
    input: {
      instructions: "I applied 2 weeks ago and haven't received a response",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: false,
      toneKeywords: ["applied", "application", "follow", "checking in"],
    },
  },
  {
    id: "generic-no-instructions",
    description: "Generic email with no instructions",
    input: {},
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: false,
    },
  },
  {
    id: "technical-pitch",
    description: "Technical pitch highlighting Rust/AI background",
    input: {
      instructions: "Pitch my Rust and AI engineering background",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: false,
      toneKeywords: ["Rust", "AI"],
    },
  },
  {
    id: "ai-healthcare",
    description: "AI healthcare angle",
    input: {
      companyName: "MedTech AI",
      instructions: "Mention my experience building an AI healthcare app",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: true,
      toneKeywords: ["healthcare", "health"],
    },
  },
  {
    id: "short-ask-call",
    description: "Short instructions asking for a call",
    input: {
      instructions: "Ask if they're open to a quick call",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: false,
      toneKeywords: ["call", "chat"],
    },
  },
  {
    id: "referral-specific",
    description: "Specific company with referral mention",
    input: {
      companyName: "Octopus Search",
      instructions: "Roland referred me, mention his name",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: true,
      toneKeywords: ["Roland", "referred"],
    },
  },
  {
    id: "unicode-company",
    description: "Edge case: company name with special characters",
    input: {
      companyName: "\u00dcber AI GmbH",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: true,
    },
  },
  {
    id: "multiple-asks",
    description: "Multiple asks: portfolio and referrals",
    input: {
      instructions: "Share my portfolio link and ask if they can refer me to hiring managers",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: false,
      toneKeywords: ["portfolio", "refer"],
    },
  },
  {
    id: "role-focus-no-company",
    description: "No company, strong role focus",
    input: {
      instructions: "Cold outreach for senior React remote EU roles",
    },
    expectedAttributes: {
      hasNamePlaceholder: true,
      hasGreeting: true,
      hasSignoff: true,
      wordCountInRange: true,
      hasCTA: true,
      mentionsCompany: false,
      toneKeywords: ["React", "remote"],
    },
  },
];
