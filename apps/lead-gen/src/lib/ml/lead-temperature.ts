/**
 * Hawkes process for lead engagement temperature scoring.
 *
 * Models email engagement as a self-exciting point process: each interaction
 * increases the likelihood of future interactions (momentum). The exponential
 * kernel λ(t) = μ + Σ α·w_i·exp(-β·(t - t_i)) captures how recent touchpoints
 * "heat up" a lead while older ones decay.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EngagementEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "replied"
  | "meeting";

export interface EngagementEvent {
  type: EngagementEventType;
  /** Unix-epoch milliseconds */
  timestamp: number;
}

export interface HawkesParams {
  /** Background intensity (baseline rate) */
  mu: number;
  /** Excitation magnitude */
  alpha: number;
  /** Decay rate (higher = faster cooldown) */
  beta: number;
}

export type TemperatureTrend = "heating" | "cooling" | "cold" | "hot";

export interface LeadTemperature {
  /** 0-1 temperature score */
  temperature: number;
  /** Raw Hawkes intensity λ(t) */
  intensity: number;
  /** Qualitative trend label */
  trend: TemperatureTrend;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_WEIGHTS: Record<EngagementEventType, number> = {
  sent: 0.1,
  delivered: 0.15,
  opened: 0.4,
  clicked: 0.7,
  replied: 1.0,
  meeting: 1.5,
};

const DEFAULT_PARAMS: HawkesParams = {
  mu: 0.01,
  alpha: 0.6,
  beta: 0.3,
};

const MS_PER_DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Exponential decay lookup table (LUT)
// ---------------------------------------------------------------------------
// Pre-compute exp(-x) for x in [0, DECAY_LUT_MAX_X] with 1024 entries.
// Index mapping: idx = floor(x / DECAY_LUT_MAX_X * (DECAY_LUT_SIZE - 1))
// This avoids per-event Math.exp() calls in the hot path.

const DECAY_LUT_SIZE = 1024;
const DECAY_LUT_MAX_X = 50; // exp(-50) ~ 1.9e-22, effectively zero
const DECAY_LUT = new Float32Array(DECAY_LUT_SIZE);
const DECAY_LUT_SCALE = (DECAY_LUT_SIZE - 1) / DECAY_LUT_MAX_X;

for (let i = 0; i < DECAY_LUT_SIZE; i++) {
  DECAY_LUT[i] = Math.exp(-(i / DECAY_LUT_SCALE));
}

/** Fast exp(-x) approximation via LUT with linear interpolation. */
function expDecayLUT(x: number): number {
  if (x <= 0) return 1;
  if (x >= DECAY_LUT_MAX_X) return 0;
  const fidx = x * DECAY_LUT_SCALE;
  const lo = fidx | 0; // floor via bitwise OR
  const frac = fidx - lo;
  // Linear interpolation between adjacent LUT entries
  return DECAY_LUT[lo] + frac * (DECAY_LUT[lo + 1] - DECAY_LUT[lo]);
}

// ---------------------------------------------------------------------------
// Time-of-day sinusoidal effect table (24 entries, one per hour)
// ---------------------------------------------------------------------------
// Models circadian engagement pattern: peak at ~10am, trough at ~3am.
// γ(h) = 1 + A * sin(2π(h - φ)/24) where A=0.15, φ=4 (peak at 10am)

const TOD_TABLE_SIZE = 24;
const TOD_AMPLITUDE = 0.15;
const TOD_PHASE = 4; // shift so sin peaks at hour 10 (6 + 4)
const TOD_TABLE = new Float32Array(TOD_TABLE_SIZE);

for (let h = 0; h < TOD_TABLE_SIZE; h++) {
  TOD_TABLE[h] = 1 + TOD_AMPLITUDE * Math.sin((2 * Math.PI * (h - TOD_PHASE)) / 24);
}

// Export LUT constants for testing / external consumers
export { DECAY_LUT, DECAY_LUT_SIZE, DECAY_LUT_MAX_X, TOD_TABLE, expDecayLUT };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Box-Muller normal sample (mean 0, std 1). */
function normalSample(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Compute Hawkes intensity at time `t` given past events.
 * λ(t) = μ + Σ α · w_i · exp(-β · (t - t_i))
 */
function hawkesIntensity(
  events: EngagementEvent[],
  t: number,
  params: HawkesParams,
): number {
  const { mu, alpha, beta } = params;
  let sum = 0;
  for (const ev of events) {
    if (ev.timestamp >= t) continue;
    const dt = (t - ev.timestamp) / MS_PER_DAY; // in days
    const w = EVENT_WEIGHTS[ev.type] ?? 0.1;
    sum += alpha * w * Math.exp(-beta * dt);
  }
  return mu + sum;
}

/**
 * LUT-accelerated Hawkes intensity. Replaces Math.exp() with the pre-computed
 * exponential decay lookup table for the hot scoring path.
 */
function hawkesIntensityLUT(
  events: EngagementEvent[],
  t: number,
  params: HawkesParams,
): number {
  const { mu, alpha, beta } = params;
  let sum = 0;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.timestamp >= t) continue;
    const dt = (t - ev.timestamp) / MS_PER_DAY;
    const w = EVENT_WEIGHTS[ev.type] ?? 0.1;
    sum += alpha * w * expDecayLUT(beta * dt);
  }
  return mu + sum;
}

/**
 * Recursive Hawkes intensity computation for sorted event streams.
 *
 * Instead of the naive O(n^2) sum over all past events for each evaluation
 * point, exploits the recursive structure of the exponential kernel:
 *
 *   S(t_n) = Σ_{i<n} w_i · exp(-β(t_n - t_i))
 *          = w_{n-1} + exp(-β·Δt) · S(t_{n-1})
 *
 * where Δt = t_n - t_{n-1}. This gives O(n) total computation.
 *
 * @param sortedEvents Events pre-sorted by ascending timestamp.
 * @param t            Evaluation time in ms.
 * @param params       Hawkes parameters.
 * @returns [intensityAtT, intensityThreeDaysBeforeT]
 */
function hawkesIntensityRecursive(
  sortedEvents: EngagementEvent[],
  t: number,
  params: HawkesParams,
): [number, number] {
  const { mu, alpha, beta } = params;
  const n = sortedEvents.length;
  if (n === 0) return [mu, mu];

  const threeDaysAgo = t - 3 * MS_PER_DAY;

  // Running weighted sum S that can be propagated forward:
  // S_n = w_{n-1} + exp(-beta * dt) * S_{n-1}
  let S = 0;
  let intensityAtThreeDaysAgo = mu;
  let capturedThreeDaysAgo = false;

  let prevTimestamp = sortedEvents[0].timestamp;

  for (let i = 0; i < n; i++) {
    const ev = sortedEvents[i];
    if (ev.timestamp >= t) break;

    const dt = (ev.timestamp - prevTimestamp) / MS_PER_DAY;
    if (i > 0) {
      // Propagate the running sum forward by the time gap
      S = S * expDecayLUT(beta * dt);
    }

    // Before adding this event's weight, check if we've passed the 3-day mark
    if (!capturedThreeDaysAgo && ev.timestamp > threeDaysAgo) {
      // Decay S from prevTimestamp to threeDaysAgo
      const dtToMark = (threeDaysAgo - prevTimestamp) / MS_PER_DAY;
      intensityAtThreeDaysAgo = mu + alpha * S * expDecayLUT(beta * Math.max(0, dtToMark));
      capturedThreeDaysAgo = true;
    }

    // Add this event's weight to the running sum
    const w = EVENT_WEIGHTS[ev.type] ?? 0.1;
    S += w;
    prevTimestamp = ev.timestamp;
  }

  // Decay S from last event to evaluation time t
  const dtFinal = (t - prevTimestamp) / MS_PER_DAY;
  const intensityAtT = mu + alpha * S * expDecayLUT(beta * dtFinal);

  // If threeDaysAgo was before all events, compute it by decaying from last event
  if (!capturedThreeDaysAgo) {
    const dtToMark = (threeDaysAgo - prevTimestamp) / MS_PER_DAY;
    if (dtToMark >= 0) {
      // threeDaysAgo is after all events
      intensityAtThreeDaysAgo = mu + alpha * S * expDecayLUT(beta * dtToMark);
    } else {
      // threeDaysAgo is before all events
      intensityAtThreeDaysAgo = mu;
    }
  }

  return [intensityAtT, intensityAtThreeDaysAgo];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the engagement temperature for a lead based on its event history.
 *
 * @param events  Array of engagement events (need not be sorted).
 * @param now     Reference time in ms (defaults to Date.now()).
 * @param params  Hawkes process parameters.
 */
export function computeLeadTemperature(
  events: EngagementEvent[],
  now: number = Date.now(),
  params: HawkesParams = DEFAULT_PARAMS,
): LeadTemperature {
  if (events.length === 0) {
    return { temperature: 0, intensity: params.mu, trend: "cold" };
  }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const intensity = hawkesIntensity(sorted, now, params);
  const temperature = 1 - Math.exp(-intensity);

  // Compare current intensity against intensity 3 days ago for trend
  const threeDaysAgo = now - 3 * MS_PER_DAY;
  const pastIntensity = hawkesIntensity(sorted, threeDaysAgo, params);

  let trend: TemperatureTrend;
  if (temperature > 0.7) {
    trend = "hot";
  } else if (intensity > pastIntensity * 1.15) {
    trend = "heating";
  } else if (temperature < 0.1) {
    trend = "cold";
  } else {
    trend = "cooling";
  }

  return { temperature, intensity, trend };
}

/**
 * Compute the engagement temperature with time-of-day modulation.
 *
 * Extends the base temperature with a circadian effect: leads contacted
 * during peak engagement hours (mid-morning) get a slight boost, while
 * those contacted at off-hours get a slight penalty. Uses the pre-computed
 * sinusoidal TOD_TABLE.
 *
 * @param events  Array of engagement events.
 * @param now     Reference time in ms (defaults to Date.now()).
 * @param params  Hawkes process parameters.
 * @param hourUTC Current hour (0-23) in UTC for time-of-day effect.
 */
export function computeLeadTemperatureWithTOD(
  events: EngagementEvent[],
  now: number = Date.now(),
  params: HawkesParams = DEFAULT_PARAMS,
  hourUTC: number = new Date(now).getUTCHours(),
): LeadTemperature {
  const base = computeLeadTemperature(events, now, params);
  const todModifier = TOD_TABLE[Math.min(23, Math.max(0, hourUTC | 0))];
  const modulated = Math.max(0, Math.min(1, base.temperature * todModifier));
  return { ...base, temperature: modulated };
}

/**
 * Batch-compute temperature scores for multiple leads in a single pass.
 *
 * Uses the recursive O(n) Hawkes formulation and LUT-based exp() to avoid
 * redundant computation. Returns a Float32Array of temperature scores (0-1),
 * one per lead.
 *
 * @param leadEvents Array of event arrays, one per lead. Each inner array
 *                   need not be pre-sorted.
 * @param now        Reference time in ms (defaults to Date.now()).
 * @param params     Hawkes process parameters (shared across all leads).
 * @returns Float32Array of length leadEvents.length with temperature scores.
 */
export function computeTemperatureBatch(
  leadEvents: EngagementEvent[][],
  now: number = Date.now(),
  params: HawkesParams = DEFAULT_PARAMS,
): Float32Array {
  const count = leadEvents.length;
  const result = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const events = leadEvents[i];
    if (!events || events.length === 0) {
      // temperature = 1 - exp(-mu) for empty leads
      result[i] = 1 - expDecayLUT(params.mu);
      continue;
    }

    // Sort events by timestamp for the recursive formulation
    const sorted = events.length <= 1
      ? events
      : [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Use the O(n) recursive intensity computation
    const [intensity] = hawkesIntensityRecursive(sorted, now, params);

    // Map intensity to [0, 1] temperature via saturating exponential
    result[i] = 1 - expDecayLUT(intensity);
  }

  return result;
}

/**
 * Batch-compute temperature scores with full trend information.
 *
 * Like `computeTemperatureBatch` but returns full LeadTemperature objects
 * including trend labels, using the recursive formulation that computes
 * both current and 3-day-ago intensities in a single O(n) pass.
 *
 * @param leadEvents Array of event arrays, one per lead.
 * @param now        Reference time in ms.
 * @param params     Hawkes process parameters.
 */
export function computeTemperatureBatchFull(
  leadEvents: EngagementEvent[][],
  now: number = Date.now(),
  params: HawkesParams = DEFAULT_PARAMS,
): LeadTemperature[] {
  const count = leadEvents.length;
  const results: LeadTemperature[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const events = leadEvents[i];
    if (!events || events.length === 0) {
      results[i] = { temperature: 0, intensity: params.mu, trend: "cold" };
      continue;
    }

    const sorted = events.length <= 1
      ? events
      : [...events].sort((a, b) => a.timestamp - b.timestamp);

    const [intensity, pastIntensity] = hawkesIntensityRecursive(sorted, now, params);
    const temperature = 1 - expDecayLUT(intensity);

    let trend: TemperatureTrend;
    if (temperature > 0.7) {
      trend = "hot";
    } else if (intensity > pastIntensity * 1.15) {
      trend = "heating";
    } else if (temperature < 0.1) {
      trend = "cold";
    } else {
      trend = "cooling";
    }

    results[i] = { temperature, intensity, trend };
  }

  return results;
}

/**
 * Estimate Hawkes parameters (μ, α, β) from observed events via
 * stochastic gradient descent on the log-likelihood.
 *
 * @param events            Observed engagement events.
 * @param observationWindow Total observation window in ms.
 * @param lr                Learning rate (default 0.001).
 * @param iterations        Number of SGD steps (default 200).
 */
export function estimateHawkesParams(
  events: EngagementEvent[],
  observationWindow: number,
  lr = 0.001,
  iterations = 200,
): HawkesParams {
  if (events.length < 3) return { ...DEFAULT_PARAMS };

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const T = observationWindow / MS_PER_DAY;

  let mu = 0.05;
  let alpha = 0.3;
  let beta = 0.5;

  for (let iter = 0; iter < iterations; iter++) {
    let dMu = -T;
    let dAlpha = 0;
    let dBeta = 0;

    for (let i = 0; i < sorted.length; i++) {
      const ti = sorted[i].timestamp / MS_PER_DAY;
      const wi = EVENT_WEIGHTS[sorted[i].type] ?? 0.1;

      // Intensity at event i
      let lambdaI = mu;
      let sumExpI = 0;
      let sumDtExpI = 0;

      for (let j = 0; j < i; j++) {
        const tj = sorted[j].timestamp / MS_PER_DAY;
        const wj = EVENT_WEIGHTS[sorted[j].type] ?? 0.1;
        const dt = ti - tj;
        const expVal = wj * Math.exp(-beta * dt);
        lambdaI += alpha * expVal;
        sumExpI += expVal;
        sumDtExpI += dt * expVal;
      }

      const invLambda = 1 / Math.max(lambdaI, 1e-10);
      dMu += invLambda;
      dAlpha += sumExpI * invLambda;
      dBeta += -alpha * sumDtExpI * invLambda;

      // Integral contribution
      for (let j = i + 1; j < sorted.length; j++) {
        const dt = (sorted[j].timestamp / MS_PER_DAY) - ti;
        const expVal = wi * Math.exp(-beta * dt);
        dAlpha -= expVal / beta;
        dBeta -= alpha * wi * (dt * Math.exp(-beta * dt)) / beta
          - alpha * expVal / (beta * beta);
      }
    }

    // Add small noise for exploration
    mu = Math.max(1e-6, mu + lr * (dMu + normalSample() * 0.001));
    alpha = Math.max(1e-6, Math.min(0.99, alpha + lr * (dAlpha + normalSample() * 0.001)));
    beta = Math.max(1e-4, beta + lr * (dBeta + normalSample() * 0.001));
  }

  return { mu, alpha, beta };
}
