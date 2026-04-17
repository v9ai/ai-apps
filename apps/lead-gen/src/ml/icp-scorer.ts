/**
 * Learned ICP (Ideal Customer Profile) scoring function.
 *
 * Hand-tuned weighted sum with domain-knowledge weights for B2B lead-gen.
 * Features are extracted from the company record and related counts.
 *
 * Weights are loaded from config/scoring/icp-weights.json (single source of truth).
 */

import { readFileSync } from "fs";
import { resolve } from "path";

export interface ICPFeatures {
  hasDescription: number;
  descriptionLengthNorm: number;
  hasWebsite: number;
  hasLinkedin: number;
  hasEmail: number;
  emailCount: number;
  tagCount: number;
  serviceCount: number;
  aiTier: number;
  isConsultancy: number;
  isProduct: number;
  factsCount: number;
  hasGithub: number;
  githubAiScore: number;
  hfPresenceScore: number;
  intentScore: number;
  contactsCount: number;
  dmContactsCount: number;
  hasJobBoard: number;
}

function parseJsonArrayLen(val: string | null | undefined): number {
  if (!val) return 0;
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Extract ICP feature vector from a company record and optional counts.
 *
 * @param company - Company row (loosely typed to avoid tight coupling)
 * @param contactsCount - Total contacts for this company
 * @param dmCount - Decision-maker contacts for this company
 * @param factsCount - Company facts count
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractICPFeatures(
  company: any,
  contactsCount = 0,
  dmCount = 0,
  factsCount = 0,
): ICPFeatures {
  const desc = company.description ?? "";
  const emailsArr = parseJsonArrayLen(company.emails);

  return {
    hasDescription: desc.length > 0 ? 1 : 0,
    descriptionLengthNorm: Math.min(desc.length / 500, 1),
    hasWebsite: company.website ? 1 : 0,
    hasLinkedin: company.linkedin_url ? 1 : 0,
    hasEmail: company.email ? 1 : 0,
    emailCount: (company.email ? 1 : 0) + emailsArr,
    tagCount: parseJsonArrayLen(company.tags),
    serviceCount: parseJsonArrayLen(company.services),
    aiTier: company.ai_tier ?? 0,
    isConsultancy: company.category === "CONSULTANCY" ? 1 : 0,
    isProduct: company.category !== "CONSULTANCY" && company.category !== "UNKNOWN" ? 1 : 0,
    factsCount,
    hasGithub: company.github_url ? 1 : 0,
    githubAiScore: company.github_ai_score ?? 0,
    hfPresenceScore: (company.hf_presence_score ?? 0) / 100,
    intentScore: (company.intent_score ?? 0) / 100,
    contactsCount,
    dmContactsCount: dmCount,
    hasJobBoard: company.job_board_url ? 1 : 0,
  };
}

// ── Weights loaded from config/scoring/icp-weights.json ──────────────────

interface ICPWeightsConfig {
  bias: number;
  weights: Record<keyof ICPFeatures, number>;
}

function loadWeightsConfig(): ICPWeightsConfig {
  // Walk up from src/ml/ to find monorepo root's config/
  const configPath = resolve(
    import.meta.dirname ?? __dirname,
    "../../crates/icp/data/company_icp_weights.json",
  );
  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ICPWeightsConfig;
  } catch {
    // Fallback: hardcoded defaults if config file is missing (e.g. in tests)
    return {
      bias: 0.10,
      weights: {
        hasDescription: 0.05, descriptionLengthNorm: 0.03, hasWebsite: 0.04,
        hasLinkedin: 0.03, hasEmail: 0.06, emailCount: 0.02, tagCount: 0.01,
        serviceCount: 0.02, aiTier: 0.15, isConsultancy: -0.08, isProduct: 0.06,
        factsCount: 0.01, hasGithub: 0.04, githubAiScore: 0.10,
        hfPresenceScore: 0.08, intentScore: 0.12, contactsCount: 0.03,
        dmContactsCount: 0.08, hasJobBoard: 0.05,
      },
    };
  }
}

const _config = loadWeightsConfig();
const WEIGHTS: Record<keyof ICPFeatures, number> = _config.weights;
const BIAS = _config.bias;

// ── Feature key ordering (stable, used by typed-array paths) ────────────
const FEATURE_KEYS: (keyof ICPFeatures)[] = Object.keys(WEIGHTS) as (keyof ICPFeatures)[];
const NUM_FEATURES = FEATURE_KEYS.length;

// ── INT8 quantized weights ──────────────────────────────────────────────
// Scale: max(|w|) maps to 127. Dequantize: float_w ≈ int8_w * WEIGHT_SCALE
const _absMax = Math.max(...FEATURE_KEYS.map((k) => Math.abs(WEIGHTS[k])));
export const WEIGHT_SCALE = _absMax / 127;
export const WEIGHTS_INT8 = new Int8Array(
  FEATURE_KEYS.map((k) => Math.round(WEIGHTS[k] / WEIGHT_SCALE)),
);
// Pre-compute float32 weight vector for batch path
const WEIGHTS_F32 = new Float32Array(FEATURE_KEYS.map((k) => WEIGHTS[k]));

// ── Sigmoid look-up table with linear interpolation ─────────────────────
// Optimization: expanded from 256 to 1024 entries to reduce interpolation
// error (~16x lower max error) and eliminate branch misprediction from
// coarse-grained LUT misses. Float64Array gives better precision for the
// pre-computed values; the LUT lookup itself is still fast since 1024
// entries fit comfortably in L1 cache (~8KB).
const SIGMOID_LUT_SIZE = 1024;
const SIGMOID_LUT_MIN = -8;
const SIGMOID_LUT_MAX = 8;
const SIGMOID_LUT_RANGE = SIGMOID_LUT_MAX - SIGMOID_LUT_MIN;
// Pre-compute scale factor once to avoid division in hot path
const SIGMOID_LUT_INV_RANGE = (SIGMOID_LUT_SIZE - 1) / SIGMOID_LUT_RANGE;
export const SIGMOID_LUT = new Float64Array(SIGMOID_LUT_SIZE);
for (let i = 0; i < SIGMOID_LUT_SIZE; i++) {
  const x = SIGMOID_LUT_MIN + (i / (SIGMOID_LUT_SIZE - 1)) * SIGMOID_LUT_RANGE;
  SIGMOID_LUT[i] = 1 / (1 + Math.exp(-x));
}

/**
 * Fast sigmoid using LUT with linear interpolation.
 * For inputs outside [-8, 8], clamps to 0 or 1.
 *
 * Optimization: pre-computed inverse range avoids division per call;
 * 1024 entries means interpolation frac is small, reducing error.
 */
export function sigmoidFast(x: number): number {
  if (x <= SIGMOID_LUT_MIN) return 0;
  if (x >= SIGMOID_LUT_MAX) return 1;
  const t = (x - SIGMOID_LUT_MIN) * SIGMOID_LUT_INV_RANGE;
  const idx = t | 0; // floor via bitwise OR
  const frac = t - idx;
  // Linear interpolation between adjacent LUT entries
  return SIGMOID_LUT[idx]! + frac * (SIGMOID_LUT[idx + 1]! - SIGMOID_LUT[idx]!);
}

/**
 * Score a company against the ICP using a hand-tuned weighted sum.
 *
 * Optimization: uses indexed FEATURE_KEYS + WEIGHTS_F32 instead of
 * Record property lookup per feature, reducing dynamic dispatch overhead.
 *
 * @returns score (0..1) and human-readable reasons for top contributors.
 */
export function scoreICP(
  features: ICPFeatures,
): { score: number; reasons: string[] } {
  let raw = BIAS;
  const contributions: { name: string; value: number }[] = [];

  for (let i = 0; i < NUM_FEATURES; i++) {
    const key = FEATURE_KEYS[i]!;
    const contribution = WEIGHTS_F32[i]! * features[key];
    raw += contribution;
    if (Math.abs(contribution) >= 0.02) {
      contributions.push({ name: key, value: contribution });
    }
  }

  const score = Math.max(0, Math.min(1, raw));

  // Top reasons sorted by absolute contribution
  contributions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const reasons = contributions.slice(0, 5).map((c) => {
    const dir = c.value > 0 ? "+" : "";
    return `${c.name}: ${dir}${(c.value * 100).toFixed(1)}%`;
  });

  return { score: Math.round(score * 1000) / 1000, reasons };
}

// ── INT8 quantized scoring ──────────────────────────────────────────────

/**
 * Score ICP using INT8 quantized weights for faster integer dot product.
 *
 * The feature vector is quantized to int8 on-the-fly, dot-producted against
 * the pre-quantized weight vector, then dequantized back to float.
 *
 * Optimization: 4-way unrolled loops for both absmax scan and dot product
 * to help V8's turbofan generate better machine code for small vectors.
 *
 * @param features - Float32Array of length NUM_FEATURES (same order as FEATURE_KEYS)
 * @returns score (0..1)
 */
export function scoreIcpQuantized(features: Float32Array): number {
  // Find feature scale factor — unrolled 4-way
  let fMax = 0;
  let i = 0;
  for (; i + 3 < NUM_FEATURES; i += 4) {
    const a0 = Math.abs(features[i]!);
    const a1 = Math.abs(features[i + 1]!);
    const a2 = Math.abs(features[i + 2]!);
    const a3 = Math.abs(features[i + 3]!);
    const m01 = a0 > a1 ? a0 : a1;
    const m23 = a2 > a3 ? a2 : a3;
    const m = m01 > m23 ? m01 : m23;
    if (m > fMax) fMax = m;
  }
  for (; i < NUM_FEATURES; i++) {
    const a = Math.abs(features[i]!);
    if (a > fMax) fMax = a;
  }
  const featureScale = fMax > 0 ? fMax / 127 : 1;
  const invFeatureScale = 1 / featureScale;

  // Integer dot product — unrolled 4-way
  let acc = 0;
  i = 0;
  for (; i + 3 < NUM_FEATURES; i += 4) {
    acc +=
      WEIGHTS_INT8[i]! * Math.round(features[i]! * invFeatureScale) +
      WEIGHTS_INT8[i + 1]! * Math.round(features[i + 1]! * invFeatureScale) +
      WEIGHTS_INT8[i + 2]! * Math.round(features[i + 2]! * invFeatureScale) +
      WEIGHTS_INT8[i + 3]! * Math.round(features[i + 3]! * invFeatureScale);
  }
  for (; i < NUM_FEATURES; i++) {
    acc += WEIGHTS_INT8[i]! * Math.round(features[i]! * invFeatureScale);
  }

  // Dequantize: acc * weightScale * featureScale + BIAS
  const raw = acc * WEIGHT_SCALE * featureScale + BIAS;
  return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;
}

// ── Batch scoring ───────────────────────────────────────────────────────

/** Minimal company feature input for batch scoring */
export type CompanyFeatures = ICPFeatures;

/**
 * Extract feature vector into a Float32Array row (same order as FEATURE_KEYS).
 */
function featuresToFloat32(f: ICPFeatures, out: Float32Array, offset: number): void {
  for (let i = 0; i < NUM_FEATURES; i++) {
    out[offset + i] = f[FEATURE_KEYS[i]!];
  }
}

/**
 * Partial-sort helper: find top-k indices by absolute value (descending).
 * Uses a selection algorithm (partial insertion sort) instead of full sort.
 * Returns indices into the contributions array.
 */
function topKIndices(
  values: Float32Array,
  k: number,
): number[] {
  const n = values.length;
  if (n <= k) {
    // Return all indices sorted by |value| descending
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => Math.abs(values[b]!) - Math.abs(values[a]!));
    return indices;
  }

  // Maintain a min-heap of size k (by absolute value)
  // Simple approach: keep a sorted array of k smallest-abs top entries
  const top: { idx: number; absVal: number }[] = [];
  for (let i = 0; i < n; i++) {
    const av = Math.abs(values[i]!);
    if (top.length < k) {
      top.push({ idx: i, absVal: av });
      // Bubble up to maintain min at position 0
      if (top.length === k) {
        top.sort((a, b) => a.absVal - b.absVal);
      }
    } else if (av > top[0]!.absVal) {
      top[0] = { idx: i, absVal: av };
      // Re-sort to keep min at [0] — k is small (5) so this is fast
      top.sort((a, b) => a.absVal - b.absVal);
    }
  }

  // Return sorted descending by absolute value
  top.sort((a, b) => b.absVal - a.absVal);
  return top.map((t) => t.idx);
}

/**
 * Batch-score multiple companies against the ICP.
 *
 * Extracts features into a contiguous Float32Array matrix, then performs
 * batch matrix-vector multiplication against the weight vector.
 *
 * @returns scores (Float32Array, length = companies.length) and reasons per company
 */
export function scoreIcpBatch(
  companies: CompanyFeatures[],
): { scores: Float32Array; reasons: string[][] } {
  const batchSize = companies.length;
  if (batchSize === 0) {
    return { scores: new Float32Array(0), reasons: [] };
  }

  // Build contiguous feature matrix: batchSize x NUM_FEATURES
  const matrix = new Float32Array(batchSize * NUM_FEATURES);
  for (let row = 0; row < batchSize; row++) {
    featuresToFloat32(companies[row]!, matrix, row * NUM_FEATURES);
  }

  // Batch dot product: scores[i] = matrix[i] . WEIGHTS_F32 + BIAS
  const scores = new Float32Array(batchSize);
  const allReasons: string[][] = [];

  // Optimization: pre-allocate reusable buffers outside the row loop to
  // eliminate per-row allocations. The contribs, significantContribs, and
  // sigToFeature arrays are reused for each row.
  const contribs = new Float32Array(NUM_FEATURES);
  const significantContribs = new Float32Array(NUM_FEATURES);
  const sigToFeature = new Int32Array(NUM_FEATURES);

  for (let row = 0; row < batchSize; row++) {
    const rowOffset = row * NUM_FEATURES;
    let raw = BIAS;

    // Dot product + capture per-feature contributions — 4-way unrolled
    let j = 0;
    for (; j + 3 < NUM_FEATURES; j += 4) {
      const c0 = matrix[rowOffset + j]! * WEIGHTS_F32[j]!;
      const c1 = matrix[rowOffset + j + 1]! * WEIGHTS_F32[j + 1]!;
      const c2 = matrix[rowOffset + j + 2]! * WEIGHTS_F32[j + 2]!;
      const c3 = matrix[rowOffset + j + 3]! * WEIGHTS_F32[j + 3]!;
      contribs[j] = c0;
      contribs[j + 1] = c1;
      contribs[j + 2] = c2;
      contribs[j + 3] = c3;
      raw += c0 + c1 + c2 + c3;
    }
    for (; j < NUM_FEATURES; j++) {
      const c = matrix[rowOffset + j]! * WEIGHTS_F32[j]!;
      contribs[j] = c;
      raw += c;
    }

    scores[row] = Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;

    // Partial sort: find top-5 contributions by absolute value
    // Only consider features with |contribution| >= 0.02
    // Optimization: single pass builds both significant values and feature index mapping
    let sigCount = 0;
    for (j = 0; j < NUM_FEATURES; j++) {
      if (Math.abs(contribs[j]!) >= 0.02) {
        significantContribs[sigCount] = contribs[j]!;
        sigToFeature[sigCount] = j;
        sigCount++;
      }
    }

    const topIdx = topKIndices(significantContribs.subarray(0, sigCount), 5);
    const reasons: string[] = [];
    for (const si of topIdx) {
      const fi = sigToFeature[si]!;
      const val = contribs[fi]!;
      const dir = val > 0 ? "+" : "";
      reasons.push(`${FEATURE_KEYS[fi]}: ${dir}${(val * 100).toFixed(1)}%`);
    }
    allReasons.push(reasons);
  }

  return { scores, reasons: allReasons };
}
