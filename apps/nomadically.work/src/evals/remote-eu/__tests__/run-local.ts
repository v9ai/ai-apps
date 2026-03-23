#!/usr/bin/env tsx

/**
 * Local eval tests for Remote EU classification.
 *
 * Runs offline (no LLM calls) — validates scorers,
 * heuristic classifier, and test data integrity.
 *
 * Usage: pnpm test:evals
 */

import { remoteEUTestCases } from "../test-data";
import {
  scoreRemoteEUClassification,
  scoreRemoteEUConfidence,
  scoreConfidenceCalibration,
} from "../scorers";
import { heuristicClassify } from "../heuristic-comparison";
import type { RemoteEUClassification } from "../schema";

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
  assert(Math.abs(a - b) < eps, `${name} (got ${a}, expected ~${b})`);
}

// ---------------------------------------------------------------------------
// scoreRemoteEUClassification
// ---------------------------------------------------------------------------

console.log("\n--- scoreRemoteEUClassification ---");

const job = { title: "Eng", location: "Remote - EU", description: "EU role" };

{
  const r = scoreRemoteEUClassification({
    jobPosting: job,
    expectedClassification: { isRemoteEU: true, confidence: "high", reason: "" },
    actualClassification: { isRemoteEU: true, confidence: "high", reason: "" },
  });
  assert(r.score === 1, "correct + matching confidence = 1.0");
  assert(r.metadata.isCorrect === true, "isCorrect true");
  assert(r.metadata.confidenceMatch === true, "confidenceMatch true");
}

{
  const r = scoreRemoteEUClassification({
    jobPosting: job,
    expectedClassification: { isRemoteEU: true, confidence: "high", reason: "" },
    actualClassification: { isRemoteEU: true, confidence: "medium", reason: "" },
  });
  assert(r.score === 0.5, "correct + mismatched confidence = 0.5");
  assert(r.metadata.confidenceMatch === false, "confidenceMatch false on mismatch");
}

{
  const r = scoreRemoteEUClassification({
    jobPosting: job,
    expectedClassification: { isRemoteEU: true, confidence: "high", reason: "" },
    actualClassification: { isRemoteEU: false, confidence: "high", reason: "" },
  });
  assert(r.score === 0, "incorrect classification = 0");
  assert(r.metadata.isCorrect === false, "isCorrect false");
}

{
  const r = scoreRemoteEUClassification({
    jobPosting: { title: "PM", location: "Berlin", description: "hybrid" },
    expectedClassification: { isRemoteEU: false, confidence: "high", reason: "office" },
    actualClassification: { isRemoteEU: false, confidence: "high", reason: "not remote" },
  });
  assert(r.metadata.details.jobTitle === "PM", "details.jobTitle populated");
  assert(r.metadata.details.location === "Berlin", "details.location populated");
}

// ---------------------------------------------------------------------------
// scoreRemoteEUConfidence
// ---------------------------------------------------------------------------

console.log("\n--- scoreRemoteEUConfidence ---");

assert(
  scoreRemoteEUConfidence({ isRemoteEU: true, confidence: "high", reason: "" }).score === 1.0,
  "high = 1.0",
);
assert(
  scoreRemoteEUConfidence({ isRemoteEU: true, confidence: "medium", reason: "" }).score === 0.7,
  "medium = 0.7",
);
assert(
  scoreRemoteEUConfidence({ isRemoteEU: false, confidence: "low", reason: "" }).score === 0.4,
  "low = 0.4",
);
assert(
  scoreRemoteEUConfidence({ isRemoteEU: true, confidence: "high", reason: "" }).reason.includes("EU Remote"),
  "EU Remote in reason for isRemoteEU=true",
);
assert(
  scoreRemoteEUConfidence({ isRemoteEU: false, confidence: "high", reason: "" }).reason.includes("Non-EU"),
  "Non-EU in reason for isRemoteEU=false",
);

// ---------------------------------------------------------------------------
// scoreConfidenceCalibration
// ---------------------------------------------------------------------------

console.log("\n--- scoreConfidenceCalibration ---");

const mkResult = (
  expectedEU: boolean,
  actualEU: boolean,
  confidence: RemoteEUClassification["confidence"],
) => ({
  expected: { isRemoteEU: expectedEU, confidence, reason: "" },
  actual: { isRemoteEU: actualEU, confidence, reason: "" },
});

{
  const cal = scoreConfidenceCalibration([
    mkResult(true, true, "high"),
    mkResult(true, true, "high"),
    mkResult(false, false, "high"),
  ]);
  assertClose(cal.ece, 0.1, "perfect high-only ECE = 0.1");
  assert(cal.tiers.high.accuracy === 1, "high tier accuracy = 1");
  assert(cal.tiers.high.count === 3, "high tier count = 3");
}

{
  const cal = scoreConfidenceCalibration([
    mkResult(true, true, "high"),
    mkResult(true, false, "high"),
    mkResult(true, true, "medium"),
    mkResult(false, false, "low"),
  ]);
  assert(cal.tiers.high.accuracy === 0.5, "mixed: high accuracy = 0.5");
  assert(cal.tiers.medium.accuracy === 1, "mixed: medium accuracy = 1");
  assert(cal.tiers.low.accuracy === 1, "mixed: low accuracy = 1");
  assertClose(cal.ece, 0.2 + 0.1 + 0.175, "mixed ECE = 0.475");
}

{
  const cal = scoreConfidenceCalibration([]);
  assert(cal.ece === 0, "empty results ECE = 0");
}

{
  const cal = scoreConfidenceCalibration([
    mkResult(true, false, "high"),
    mkResult(false, true, "medium"),
    mkResult(true, false, "low"),
  ]);
  assertClose(cal.ece, 0.6, "all-wrong ECE = 0.6");
}

// ---------------------------------------------------------------------------
// heuristicClassify
// ---------------------------------------------------------------------------

console.log("\n--- heuristicClassify ---");

{
  const r = heuristicClassify({ title: "Eng", location: "Remote - EU", description: "EU work" });
  assert(r.isRemoteEU === true, "Remote - EU → true");
  assert(r.confidence === "high", "Remote - EU → high confidence");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Remote", description: "Fully remote.",
    country: "DE", is_remote: true,
  });
  assert(r.isRemoteEU === true, "DE country code + remote → true");
}

{
  const r = heuristicClassify({
    title: "PM", location: "Remote - EMEA", description: "EMEA region role.",
  });
  assert(r.isRemoteEU === true, "EMEA → true");
  assert(r.confidence === "medium", "EMEA → medium");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Remote", description: "Must have EU work authorization.",
  });
  assert(r.isRemoteEU === true, "EU work auth → true");
  assert(r.confidence === "high", "EU work auth → high");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Remote", description: "Must overlap with CET timezone.",
  });
  assert(r.isRemoteEU === true, "CET → true");
  assert(r.confidence === "medium", "CET → medium");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Remote", description: "US citizens and permanent residents only.",
  });
  assert(r.isRemoteEU === false, "US only → false");
  assert(r.confidence === "high", "US only → high");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Remote", description: "401(k), medical, dental.",
    is_remote: true,
  });
  assert(r.isRemoteEU === false, "401k signal → false");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Berlin (Hybrid)", description: "3 days in office.",
  });
  assert(r.isRemoteEU === false, "hybrid → false");
}

{
  const r = heuristicClassify({
    title: "Eng", location: "Remote", description: "Fully remote.",
    country: "AR", is_remote: true,
  });
  assert(r.isRemoteEU === false, "AR country code → false");
}

{
  const r = heuristicClassify({
    title: "PM", location: "Remote - Worldwide", description: "Work from anywhere.",
  });
  assert(r.isRemoteEU === false, "worldwide no EU signals → false");
  assert(r.confidence === "medium", "worldwide → medium");
}

// ATS contradiction: DE code but US-only description
{
  const r = heuristicClassify({
    title: "Dev", location: "Remote", description: "Must be located in the United States.",
    country: "DE", workplace_type: "remote", is_remote: true,
  });
  assert(r.isRemoteEU === false, "ATS contradiction: US-only desc overrides DE code");
}

// remote-first should not be flagged as hybrid
{
  const r = heuristicClassify({
    title: "Eng", location: "Remote - EU",
    description: "Remote-first position. Quarterly visits to Paris office.",
  });
  assert(r.isRemoteEU === true, "remote-first not flagged as hybrid");
}

// ---------------------------------------------------------------------------
// Heuristic accuracy on full test suite
// ---------------------------------------------------------------------------

console.log("\n--- Heuristic accuracy on full test suite ---");

let hCorrect = 0;
const hErrors: string[] = [];
for (const tc of remoteEUTestCases) {
  const h = heuristicClassify(tc.jobPosting);
  if (h.isRemoteEU === tc.expectedClassification.isRemoteEU) {
    hCorrect++;
  } else {
    hErrors.push(
      `  ${tc.id}: heuristic=${h.isRemoteEU ? "EU" : "non-EU"} expected=${tc.expectedClassification.isRemoteEU ? "EU" : "non-EU"} (${h.reason})`,
    );
  }
}
const hAcc = ((hCorrect / remoteEUTestCases.length) * 100).toFixed(1);
console.log(`Heuristic accuracy: ${hCorrect}/${remoteEUTestCases.length} (${hAcc}%)`);
if (hErrors.length > 0) {
  console.log(`Heuristic errors (${hErrors.length}):`);
  hErrors.forEach((e) => console.log(e));
}

// ---------------------------------------------------------------------------
// Test data integrity
// ---------------------------------------------------------------------------

console.log("\n--- Test data integrity ---");

{
  const ids = remoteEUTestCases.map((tc) => tc.id);
  const unique = new Set(ids);
  assert(unique.size === ids.length, "no duplicate IDs");
}

assert(remoteEUTestCases.length >= 50, `at least 50 test cases (got ${remoteEUTestCases.length})`);

{
  const eu = remoteEUTestCases.filter((tc) => tc.expectedClassification.isRemoteEU).length;
  const nonEu = remoteEUTestCases.length - eu;
  assert(eu > 10, `>10 EU cases (got ${eu})`);
  assert(nonEu > 10, `>10 non-EU cases (got ${nonEu})`);
}

{
  const confidences = new Set(remoteEUTestCases.map((tc) => tc.expectedClassification.confidence));
  assert(confidences.has("high"), "has high confidence cases");
  assert(confidences.has("medium"), "has medium confidence cases");
}

for (const tc of remoteEUTestCases) {
  assert(!!tc.id, `${tc.id || "?"}: has id`);
  assert(!!tc.jobPosting.title, `${tc.id}: has title`);
  assert(!!tc.jobPosting.location, `${tc.id}: has location`);
  assert(!!tc.jobPosting.description, `${tc.id}: has description`);
  assert(typeof tc.expectedClassification.isRemoteEU === "boolean", `${tc.id}: isRemoteEU is boolean`);
  assert(
    ["high", "medium", "low"].includes(tc.expectedClassification.confidence),
    `${tc.id}: valid confidence`,
  );
  assert(!!tc.expectedClassification.reason, `${tc.id}: has reason`);
  if (tc.jobPosting.country) {
    assert(/^[A-Z]{2}$/.test(tc.jobPosting.country), `${tc.id}: valid country code`);
  }
  if (tc.jobPosting.workplace_type) {
    assert(
      ["remote", "hybrid", "on-site"].includes(tc.jobPosting.workplace_type),
      `${tc.id}: valid workplace_type`,
    );
  }
}

const newIds = [
  "aggregator-multi-posting-1", "ats-country-code-contradiction-1",
  "salary-currency-eur-1", "salary-currency-usd-1",
  "aggregator-jobgether-eu-1", "multi-posting-duplicate-1",
  "ats-greenhouse-remote-1", "ats-lever-hybrid-1",
  "balkan-countries-1", "baltic-states-1",
  "remote-contractor-eu-1", "startup-relocation-eu-1",
];
const existingIds = new Set(remoteEUTestCases.map((tc) => tc.id));
for (const id of newIds) {
  assert(existingIds.has(id), `new case present: ${id}`);
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
