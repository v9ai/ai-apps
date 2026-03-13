#!/usr/bin/env tsx

/**
 * Local eval tests for email generation.
 *
 * Runs offline (no LLM calls, no Langfuse) — validates scorers,
 * prompt builder structure, and test data integrity.
 *
 * Usage: pnpm test:email-evals
 */

import { emailTestCases } from "../test-data";
import {
  scoreRelevance,
  scoreNaturalness,
  scorePersonalization,
  scoreStructure,
  scoreConciseness,
  scoreNoHallucination,
  scoreEmail,
  scoreComposite,
} from "../scorers";
import { buildComposePrompt } from "../../../prompts/compose-email";

// ---------------------------------------------------------------------------
// Minimal test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  FAIL: ${name}`);
  }
}

function assertClose(a: number, b: number, name: string, eps = 0.001) {
  assert(Math.abs(a - b) < eps, `${name} (got ${a.toFixed(4)}, expected ~${b})`);
}

function assertGte(a: number, b: number, name: string) {
  assert(a >= b, `${name} (got ${a.toFixed(4)}, expected >= ${b})`);
}

function assertLte(a: number, b: number, name: string) {
  assert(a <= b, `${name} (got ${a.toFixed(4)}, expected <= ${b})`);
}

// ---------------------------------------------------------------------------
// scoreStructure
// ---------------------------------------------------------------------------

console.log("\n--- scoreStructure ---");

{
  const good = "Hey John,\n\nI'd love to chat.\n\nThanks,\nVadim";
  assert(scoreStructure(good) >= 0.8, "good email structure >= 0.8");
}

{
  const withPlaceholder = "Hey {{name}},\n\nLet's connect.\n\nThanks,\nVadim";
  assert(scoreStructure(withPlaceholder) >= 0.8, "{{name}} placeholder structure >= 0.8");
}

{
  const noGreeting = "I want to work at your company. Thanks,\nVadim";
  assert(scoreStructure(noGreeting) < 0.8, "no greeting lowers structure");
}

{
  const noSignoff = "Hey Alice,\n\nLet's connect.\n\nBest";
  const score = scoreStructure(noSignoff);
  assert(score < scoreStructure("Hey Alice,\n\nLet's connect.\n\nThanks,\nVadim"), "vadim signoff > generic signoff");
}

// ---------------------------------------------------------------------------
// scoreNaturalness
// ---------------------------------------------------------------------------

console.log("\n--- scoreNaturalness ---");

{
  const robotic = "I hope this email finds you well. I am writing to express my interest in your company.";
  assert(scoreNaturalness(robotic, { id: "x", description: "x" }) <= 0.7, "robotic phrases penalized");
}

{
  const natural = "Hey Sarah,\n\nI came across your company while exploring edge computing tooling — really impressive work.";
  assert(scoreNaturalness(natural, { id: "x", description: "x" }) >= 0.9, "natural email >= 0.9");
}

{
  const withUiArtifact = "Hey John,\n\nI applied for the role. Status: Pending Review | Notifications: 0\n\nThanks,\nVadim";
  const tc = { id: "x", description: "x", mustNotContain: ["Status: Pending", "Notifications: 0"] };
  assert(scoreNaturalness(withUiArtifact, tc) < 0.7, "UI artifact violations penalized in naturalness");
}

// ---------------------------------------------------------------------------
// scoreRelevance
// ---------------------------------------------------------------------------

console.log("\n--- scoreRelevance ---");

{
  const tc = {
    id: "x",
    description: "x",
    mustMention: ["RAG", "AI"],
  };
  const emailWithKeywords = "I've built RAG pipelines and AI systems professionally.";
  assert(scoreRelevance(emailWithKeywords, tc) === 1.0, "all mustMention found = 1.0");
}

{
  const tc = {
    id: "x",
    description: "x",
    mustMention: ["RAG", "AI"],
  };
  const emailMissing = "I've built various software systems.";
  assert(scoreRelevance(emailMissing, tc) === 0, "none of mustMention found = 0");
}

{
  const tc = {
    id: "x",
    description: "x",
    mustNotContain: ["0 notifications", "Status: Pending"],
  };
  const emailViolating = "I applied and have 0 notifications about my application.";
  assert(scoreRelevance(emailViolating, tc) < 1.0, "mustNotContain violation reduces score");
}

{
  const tc = {
    id: "x",
    description: "x",
    mustMention: ["Rust"],
    mustNotContain: ["security clearance"],
    expectedSkillCategory: ["systems" as const],
  };
  const goodEmail = "I've been writing production Rust for two years.";
  assertGte(scoreRelevance(goodEmail, tc), 0.9, "Rust mention with systems category >= 0.9");
}

// ---------------------------------------------------------------------------
// scorePersonalization
// ---------------------------------------------------------------------------

console.log("\n--- scorePersonalization ---");

{
  const tc = {
    id: "x",
    description: "x",
    companyName: "TechShack",
    jobContext: { title: "AI Engineer" },
  };
  const personalized = "Hey John,\n\nI'm reaching out about the AI Engineer role at TechShack.";
  assert(scorePersonalization(personalized, tc) >= 0.9, "company + role mentioned = max");
}

{
  const tc = { id: "x", description: "x", companyName: "TechShack" };
  const noCompany = "Hey John,\n\nI'd like to discuss engineering opportunities.";
  assert(scorePersonalization(noCompany, tc) < 0.8, "company not mentioned < 0.8");
}

// ---------------------------------------------------------------------------
// scoreConciseness
// ---------------------------------------------------------------------------

console.log("\n--- scoreConciseness ---");

{
  // ~140 words — sweet spot
  const ideal =
    "Hey John, I've been building AI-powered systems for the past few years, " +
    "focusing on RAG pipelines and LLM integration in production environments. " +
    "Most recently I shipped a classification system that processes thousands of " +
    "job postings daily using structured output parsing with DeepSeek. I saw your " +
    "team is working on similar problems and I'd love to explore if there's a fit. " +
    "Would you be open to a 20-minute call this week? Thanks, Vadim. " +
    "I am available any time that suits you and can send a calendar invite. " +
    "Looking forward to connecting and learning more about the opportunity.";
  const score = scoreConciseness(ideal);
  assertGte(score, 0.8, "~140 word email >= 0.8");
}

{
  const tooShort = "Hey John, let's chat. Thanks, Vadim.";
  assert(scoreConciseness(tooShort) < 0.5, "very short email < 0.5");
}

{
  const tooLong = Array(40).fill("This is a filler sentence that adds nothing of value.").join(" ");
  assert(scoreConciseness(tooLong) < 0.5, "very long email < 0.5");
}

// ---------------------------------------------------------------------------
// scoreNoHallucination
// ---------------------------------------------------------------------------

console.log("\n--- scoreNoHallucination ---");

{
  const tc = {
    id: "x",
    description: "x",
    mustNotContain: ["security clearance"],
  };
  const hallucinated = "As a cleared security clearance holder I'm familiar with gov requirements.";
  assert(scoreNoHallucination(hallucinated, tc) < 0.8, "clearance claim penalized");
}

{
  const tc = { id: "x", description: "x" };
  const withFakeCert = "As a certified AWS architect with a Master's degree from MIT.";
  assert(scoreNoHallucination(withFakeCert, tc) < 0.9, "fake certs penalized");
}

{
  const tc = { id: "x", description: "x" };
  const clean = "I've been building distributed systems in Rust for the past two years.";
  assert(scoreNoHallucination(clean, tc) === 1.0, "clean email = 1.0 noHallucination");
}

// ---------------------------------------------------------------------------
// scoreComposite
// ---------------------------------------------------------------------------

console.log("\n--- scoreComposite ---");

{
  const perfect = { relevance: 1, naturalness: 1, personalization: 1, structure: 1, conciseness: 1, noHallucination: 1 };
  assertClose(scoreComposite(perfect), 1.0, "all 1.0 → composite 1.0");
}

{
  const zeros = { relevance: 0, naturalness: 0, personalization: 0, structure: 0, conciseness: 0, noHallucination: 0 };
  assertClose(scoreComposite(zeros), 0.0, "all 0.0 → composite 0.0");
}

{
  // Weights: relevance 0.25, naturalness 0.20, personalization 0.20, noHallucination 0.15, structure 0.10, conciseness 0.10
  const partial = { relevance: 1, naturalness: 1, personalization: 0, structure: 0, conciseness: 0, noHallucination: 1 };
  const expected = 1 * 0.25 + 1 * 0.20 + 0 * 0.20 + 0 * 0.10 + 0 * 0.10 + 1 * 0.15;
  assertClose(scoreComposite(partial), expected, "partial composite correct");
}

// ---------------------------------------------------------------------------
// buildComposePrompt
// ---------------------------------------------------------------------------

console.log("\n--- buildComposePrompt ---");

{
  const prompt = buildComposePrompt({ recipientName: "Jane Smith", companyName: "Acme" });
  assert(prompt.includes("Jane"), "first name extracted");
  assert(prompt.includes("Jane Smith"), "full name included");
  assert(prompt.includes("Acme"), "company name included");
  assert(prompt.includes("Hey Jane,"), 'greeting uses first name');
  assert(prompt.includes('"subject"'), "JSON structure hint present");
  assert(prompt.includes('"body"'), "body key hint present");
  assert(prompt.includes("Vadim"), "sender name in prompt");
  assert(prompt.includes("remote EU"), "context includes remote EU");
}

{
  const withLinkedIn = buildComposePrompt({
    recipientName: "Bob",
    linkedinPostContent: "I just launched our new AI product!",
  });
  assert(withLinkedIn.includes("LINKEDIN POST CONTEXT"), "LinkedIn section added");
  assert(withLinkedIn.includes("I just launched"), "post content included");
}

{
  const withInstructions = buildComposePrompt({
    recipientName: "Alice",
    instructions: "Follow up on my application.",
  });
  assert(withInstructions.includes("SPECIAL INSTRUCTIONS"), "instructions section added");
  assert(withInstructions.includes("Follow up on my application."), "instructions text included");
}

{
  const noLinkedIn = buildComposePrompt({ recipientName: "Dave" });
  assert(!noLinkedIn.includes("LINKEDIN POST CONTEXT"), "no LinkedIn section when not provided");
  assert(!noLinkedIn.includes("SPECIAL INSTRUCTIONS"), "no instructions section when not provided");
}

{
  // First name extraction with multi-word name
  const prompt = buildComposePrompt({ recipientName: "Thomas Anderson" });
  assert(prompt.includes("Hey Thomas,"), "multi-word name → first name in greeting");
}

// ---------------------------------------------------------------------------
// scoreEmail — integration
// ---------------------------------------------------------------------------

console.log("\n--- scoreEmail integration ---");

{
  const tc = emailTestCases.find((t) => t.id === "followup-ai-engineer-techshack")!;
  const goodEmail =
    "Hey Alex,\n\nI applied for the AI Engineer role at TechShack a couple of weeks ago and wanted to follow up. " +
    "I've been building RAG pipelines and AI-powered classification systems professionally, processing large volumes " +
    "of structured data with LLMs.\n\nWould you be open to a quick chat this week?\n\nThanks,\nVadim";

  const scores = scoreEmail(goodEmail, tc);
  assertGte(scores.relevance, 0.8, "followup-ai: relevance >= 0.8");
  assertGte(scores.naturalness, 0.8, "followup-ai: naturalness >= 0.8");
  assertGte(scores.structure, 0.7, "followup-ai: structure >= 0.7");
  assertGte(scores.composite, 0.65, "followup-ai: composite >= 0.65");
}

{
  const tc = emailTestCases.find((t) => t.id === "followup-ui-artifacts-in-instructions")!;
  const badEmail =
    "Hey Sam,\n\nStatus: Pending Review | Last updated: 3 days ago | Notifications: 0.\n\nI wanted to follow up.\n\nThanks,\nVadim";

  const scores = scoreEmail(badEmail, tc);
  assertLte(scores.relevance, 0.5, "ui-artifact email: relevance <= 0.5");
  assertLte(scores.noHallucination, 0.5, "ui-artifact email: noHallucination <= 0.5");
}

{
  const tc = emailTestCases.find((t) => t.id === "security-clearance-no-claim")!;
  const hallucinated =
    "Hey Chris,\n\nAs a cleared security clearance holder and certified systems engineer...\n\nThanks,\nVadim";

  const scores = scoreEmail(hallucinated, tc);
  assertLte(scores.relevance, 0.5, "clearance-claim: relevance <= 0.5");
  assertLte(scores.noHallucination, 0.5, "clearance-claim: noHallucination <= 0.5");
}

// ---------------------------------------------------------------------------
// Test data integrity
// ---------------------------------------------------------------------------

console.log("\n--- Test data integrity ---");

{
  const ids = emailTestCases.map((tc) => tc.id);
  const unique = new Set(ids);
  assert(unique.size === ids.length, "no duplicate IDs");
}

assert(emailTestCases.length >= 10, `at least 10 test cases (got ${emailTestCases.length})`);

for (const tc of emailTestCases) {
  assert(!!tc.id, `${tc.id || "?"}: has id`);
  assert(!!tc.description, `${tc.id}: has description`);

  if (tc.mustMention) {
    assert(Array.isArray(tc.mustMention), `${tc.id}: mustMention is array`);
  }
  if (tc.mustNotContain) {
    assert(Array.isArray(tc.mustNotContain), `${tc.id}: mustNotContain is array`);
  }
  if (tc.expectedSkillCategory) {
    const validCats = ["frontend", "ai-ml", "backend", "systems", "infra"];
    for (const cat of tc.expectedSkillCategory) {
      assert(validCats.includes(cat), `${tc.id}: valid skill category "${cat}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n==========================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);

if (failures.length > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log("All tests passed!");
}
