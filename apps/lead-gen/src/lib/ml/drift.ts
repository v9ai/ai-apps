/**
 * Population Stability Index (PSI) and Kolmogorov-Smirnov (KS) tests
 * for detecting feature distribution drift in lead scoring models.
 *
 * PSI measures how much a distribution has shifted from a baseline.
 * KS tests whether two samples come from the same distribution.
 * Both are pure TypeScript with zero dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KSResult {
  /** KS test statistic: max |F1(x) - F2(x)| */
  statistic: number;
  /** Approximate two-sided p-value */
  pValue: number;
}

// ---------------------------------------------------------------------------
// Histogram helper
// ---------------------------------------------------------------------------

/**
 * Build a histogram from a set of values.
 *
 * @param values Array of numeric values.
 * @param bins   Number of bins (default 20).
 * @param edges  Optional pre-computed bin edges (length = bins + 1).
 * @returns Tuple of [counts, edges] where counts[i] is the count in [edges[i], edges[i+1]).
 */
export function histogram(
  values: number[],
  bins = 20,
  edges?: number[],
): [counts: number[], edges: number[]] {
  if (values.length === 0) {
    const emptyEdges = Array.from({ length: bins + 1 }, (_, i) => i);
    return [new Array(bins).fill(0), emptyEdges];
  }

  if (!edges) {
    const min = values.reduce((a, b) => Math.min(a, b), Infinity);
    const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
    const range = max - min || 1;
    edges = Array.from({ length: bins + 1 }, (_, i) => min + (range * i) / bins);
    edges[bins] = max + 1e-10;
  }

  const counts = new Array(edges.length - 1).fill(0);

  for (const v of values) {
    let lo = 0;
    let hi = edges.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (edges[mid] <= v) lo = mid;
      else hi = mid - 1;
    }
    if (lo >= 0 && lo < counts.length) counts[lo]++;
  }

  return [counts, edges];
}

// ---------------------------------------------------------------------------
// PSI
// ---------------------------------------------------------------------------

/**
 * Compute the Population Stability Index between baseline and current distributions.
 *
 * PSI = sum of (p_current - p_baseline) * ln(p_current / p_baseline)
 *
 * Interpretation:
 *   PSI < 0.1   -- no significant shift
 *   PSI 0.1-0.2 -- moderate shift, investigate
 *   PSI > 0.2   -- significant shift, retrain
 *
 * @param baseline Baseline sample values.
 * @param current  Current sample values.
 * @param bins     Number of histogram bins (default 20).
 */
export function computePSI(
  baseline: number[],
  current: number[],
  bins = 20,
): number {
  if (baseline.length === 0 || current.length === 0) return 0;

  const [baselineCounts, sharedEdges] = histogram(baseline, bins);
  const [currentCounts] = histogram(current, bins, sharedEdges);

  const epsilon = 1e-8;
  let psi = 0;

  for (let i = 0; i < baselineCounts.length; i++) {
    const pBase = baselineCounts[i] / baseline.length + epsilon;
    const pCurr = currentCounts[i] / current.length + epsilon;
    psi += (pCurr - pBase) * Math.log(pCurr / pBase);
  }

  return Math.max(0, psi);
}

// ---------------------------------------------------------------------------
// Kolmogorov-Smirnov test
// ---------------------------------------------------------------------------

/**
 * Approximate the complementary CDF of the Kolmogorov distribution
 * using the Smirnov series: P(K >= x) = 2 * sum (-1)^(k-1) * exp(-2k^2x^2).
 */
function kolmogorovPValue(x: number): number {
  if (x <= 0) return 1;
  if (x > 3) return 0;
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    const sign = k % 2 === 1 ? 1 : -1;
    const term = sign * Math.exp(-2 * k * k * x * x);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.max(0, Math.min(1, 2 * sum));
}

/**
 * Two-sample Kolmogorov-Smirnov test.
 *
 * Tests H0: samples a and b are drawn from the same distribution.
 *
 * @param a First sample.
 * @param b Second sample.
 * @returns KS statistic and approximate p-value.
 */
export function computeKS(a: number[], b: number[]): KSResult {
  if (a.length === 0 || b.length === 0) return { statistic: 0, pValue: 1 };

  // Merge both samples with group tags, walk the combined ECDF
  const combined = [
    ...a.map((v) => ({ v, g: 0 as const })),
    ...b.map((v) => ({ v, g: 1 as const })),
  ];
  combined.sort((x, y) => x.v - y.v);

  let cdfA = 0;
  let cdfB = 0;
  let dMax = 0;

  for (const { g } of combined) {
    if (g === 0) cdfA += 1 / a.length;
    else cdfB += 1 / b.length;
    const d = Math.abs(cdfA - cdfB);
    if (d > dMax) dMax = d;
  }

  const ne = Math.sqrt((a.length * b.length) / (a.length + b.length));
  const pValue = kolmogorovPValue((ne + 0.12 + 0.11 / ne) * dMax);

  return { statistic: dMax, pValue };
}
