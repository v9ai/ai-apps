/**
 * Beta-Binomial Thompson Sampling for optimal email send-time selection.
 *
 * Maintains a 168-bin (7 days x 24 hours) grid of Beta distributions.
 * Each bin tracks the posterior probability of an open given a send at that
 * hour-of-week slot. Thompson sampling draws from each eligible posterior
 * and picks the slot with the highest sampled value.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendTimeStats {
  /**
   * 168 bins (hour 0-23 x day 0-6, index = dow * 24 + hour).
   * Each pair of consecutive Float64 values is (alpha, beta) for the Beta dist.
   * Total length = 168 * 2 = 336.
   */
  alphaBeta: Float64Array;
  /** Total observations across all bins */
  totalObservations: number;
  /** Seniority modifier: shift prior toward conservative hours for C-suite */
  seniorityModifier: number;
}

export interface SendTimeRecommendation {
  /** 0-23 in recipient local time */
  hour: number;
  /** 0=Sunday .. 6=Saturday */
  dow: number;
  /** Sampled expected open rate for the chosen slot */
  expectedOpenRate: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Box-Muller normal sample (mean 0, std 1).
 */
function normalSample(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Gamma sample via Marsaglia-Tsang method (shape >= 1).
 * For shape < 1, use the Ahrens-Dieter boost.
 */
function gammaSample(shape: number, scale: number): number {
  if (shape < 1) {
    // Boost: Gamma(a) = Gamma(a+1) * U^(1/a)
    const boost = Math.pow(Math.random(), 1 / shape);
    return gammaSample(shape + 1, scale) * boost;
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normalSample();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

/**
 * Beta sample via ratio of Gamma samples.
 */
function betaSample(alpha: number, beta: number): number {
  if (alpha <= 0) alpha = 0.01;
  if (beta <= 0) beta = 0.01;
  const x = gammaSample(alpha, 1);
  const y = gammaSample(beta, 1);
  return x / (x + y);
}

/** Check if a slot is within business hours (Mon-Fri, 7am-6pm). */
function isBusinessHour(dow: number, hour: number): boolean {
  // dow: 0=Sun, 1=Mon .. 5=Fri, 6=Sat
  if (dow === 0 || dow === 6) return false;
  return hour >= 7 && hour < 18;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create default stats with uninformative Beta(1,1) priors for all slots.
 */
export function createDefaultStats(seniorityModifier = 0): SendTimeStats {
  const alphaBeta = new Float64Array(336);
  for (let i = 0; i < 168; i++) {
    alphaBeta[i * 2] = 1; // alpha
    alphaBeta[i * 2 + 1] = 1; // beta
  }
  return { alphaBeta, totalObservations: 0, seniorityModifier };
}

/**
 * Thompson-sample the best send-time slot.
 *
 * @param stats           Current posterior stats.
 * @param seniorityIdx    0=unknown, 1=junior, 2=mid, 3=senior, 4=c-suite.
 * @param timezoneOffset  Recipient UTC offset in hours (e.g., -5 for EST).
 */
export function thompsonSampleBestSlot(
  stats: SendTimeStats,
  seniorityIdx = 0,
  timezoneOffset = 0,
): SendTimeRecommendation {
  let bestSample = -1;
  let bestHour = 9;
  let bestDow = 2; // Tuesday default

  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      // Only sample business hours in recipient local time
      const localHour = ((hour - timezoneOffset) % 24 + 24) % 24;
      const localDow = dow; // simplified — timezone rarely shifts day
      if (!isBusinessHour(localDow, localHour)) continue;

      const idx = dow * 24 + hour;
      let alpha = stats.alphaBeta[idx * 2];
      let beta = stats.alphaBeta[idx * 2 + 1];

      // Seniority modifier: C-suite gets narrower window (9am-12pm bias)
      if (seniorityIdx >= 3 && (localHour < 9 || localHour > 12)) {
        beta += stats.seniorityModifier || 2;
      }

      const sample = betaSample(alpha, beta);
      if (sample > bestSample) {
        bestSample = sample;
        bestHour = hour;
        bestDow = dow;
      }
    }
  }

  return {
    hour: bestHour,
    dow: bestDow,
    expectedOpenRate: Math.max(0, Math.min(1, bestSample)),
  };
}

/**
 * Update posterior after observing a send outcome.
 *
 * @param stats        Current stats (mutated in place, also returned).
 * @param hour         Hour (0-23 UTC) when email was sent.
 * @param dow          Day of week (0=Sun .. 6=Sat).
 * @param seniorityIdx Seniority index (unused in update, reserved).
 * @param opened       Whether the email was opened.
 */
export function updateStats(
  stats: SendTimeStats,
  hour: number,
  dow: number,
  seniorityIdx: number,
  opened: boolean,
): SendTimeStats {
  const idx = dow * 24 + hour;
  if (idx < 0 || idx >= 168) return stats;

  if (opened) {
    stats.alphaBeta[idx * 2] += 1;
  } else {
    stats.alphaBeta[idx * 2 + 1] += 1;
  }
  stats.totalObservations += 1;
  return stats;
}
