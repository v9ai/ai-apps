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
