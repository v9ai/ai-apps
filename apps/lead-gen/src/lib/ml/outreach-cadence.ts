/**
 * Kaplan-Meier survival analysis + optimal stopping for outreach cadence.
 *
 * Fits a non-parametric survival curve from historical reply-time data, then
 * uses dynamic programming to decide when (or whether) to send the next
 * follow-up email given diminishing returns and annoyance cost.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SurvivalObservation {
  /** Days from first email to reply (or censoring) */
  days: number;
  /** true if the contact replied, false if censored (no reply observed) */
  replied: boolean;
}

export interface SurvivalCurve {
  /** Ordered event times (days) */
  times: number[];
  /** S(t) values at each event time (piecewise constant, right-continuous) */
  survival: number[];
  /** Segment label (e.g., "ai_tier_2" or "all") */
  segmentKey: string;
  /** Number of observations used to fit */
  sampleSize: number;
}

export interface CadenceRecommendation {
  /** Days until next follow-up, or null if stopping is optimal */
  nextFollowUpDays: number | null;
  /** P(reply) estimated from survival curve for the remaining window */
  expectedReplyProb: number;
  /** Expected remaining value if we continue the sequence */
  remainingValue: number;
  /** Human-readable reason for the recommendation */
  reason: string;
}

// ---------------------------------------------------------------------------
// Kaplan-Meier fitting
// ---------------------------------------------------------------------------

/**
 * Fit a Kaplan-Meier survival curve from observed reply times.
 *
 * @param observations Array of {days, replied} observations.
 * @param segmentKey   Optional label for the segment (default "all").
 */
export function fitKaplanMeier(
  observations: SurvivalObservation[],
  segmentKey = "all",
): SurvivalCurve {
  if (observations.length === 0) {
    return { times: [0], survival: [1], segmentKey, sampleSize: 0 };
  }

  // Sort by time
  const sorted = [...observations].sort((a, b) => a.days - b.days);
  const n = sorted.length;

  // Collect unique event times (only where replied=true)
  const eventTimes = Array.from(new Set(sorted.filter((o) => o.replied).map((o) => o.days))).sort(
    (a, b) => a - b,
  );

  const times: number[] = [0];
  const survival: number[] = [1.0];
  let atRisk = n;
  let S = 1.0;
  let sortIdx = 0;

  for (const t of eventTimes) {
    // Count censored before this time
    while (sortIdx < n && sorted[sortIdx].days < t) {
      if (!sorted[sortIdx].replied) {
        atRisk--;
      }
      sortIdx++;
    }

    // Count events at this time
    let events = 0;
    let censoredAtT = 0;
    while (sortIdx < n && sorted[sortIdx].days === t) {
      if (sorted[sortIdx].replied) {
        events++;
      } else {
        censoredAtT++;
      }
      sortIdx++;
    }

    if (atRisk > 0 && events > 0) {
      S *= 1 - events / atRisk;
    }

    times.push(t);
    survival.push(Math.max(0, S));

    atRisk -= events + censoredAtT;
    if (atRisk <= 0) break;
  }

  return { times, survival, segmentKey, sampleSize: n };
}

// ---------------------------------------------------------------------------
// Survival interpolation
// ---------------------------------------------------------------------------

/**
 * Evaluate S(t) using step-function interpolation (piecewise constant).
 * S(t) = S(t_k) where t_k is the largest event time <= t.
 */
function survivalAt(curve: SurvivalCurve, t: number): number {
  if (t <= 0) return 1;
  let s = 1;
  for (let i = 0; i < curve.times.length; i++) {
    if (curve.times[i] <= t) {
      s = curve.survival[i];
    } else {
      break;
    }
  }
  return s;
}

/**
 * Hazard estimate: h(t) approx = -dS/dt / S(t) discretized.
 */
function hazardAt(curve: SurvivalCurve, t: number): number {
  const dt = 1; // 1-day resolution
  const s1 = survivalAt(curve, t);
  const s2 = survivalAt(curve, t + dt);
  if (s1 <= 0) return 0;
  return Math.max(0, (s1 - s2) / (s1 * dt));
}

// ---------------------------------------------------------------------------
// Optimal cadence
// ---------------------------------------------------------------------------

/** Standard follow-up day spacings by sequence position */
const DEFAULT_FOLLOW_UP_DAYS = [3, 5, 7, 10];

/**
 * Compute the optimal next follow-up timing using survival analysis
 * and a value-of-information framework.
 *
 * @param curve             Fitted KM survival curve.
 * @param currentDay        Days since initial email.
 * @param numFollowUpsSent  How many follow-ups have already been sent (0-based).
 * @param maxFollowUps      Maximum follow-ups allowed (default 3).
 * @param annoyanceCost     Cost of sending an unwanted follow-up (default 0.05).
 * @param followUpBoost     Multiplier boost to reply probability from follow-up (default 0.3).
 */
export function computeOptimalCadence(
  curve: SurvivalCurve,
  currentDay: number,
  numFollowUpsSent: number,
  maxFollowUps = 3,
  annoyanceCost = 0.05,
  followUpBoost = 0.3,
): CadenceRecommendation {
  // If max follow-ups reached, stop
  if (numFollowUpsSent >= maxFollowUps) {
    const remainingProb = 1 - survivalAt(curve, currentDay);
    return {
      nextFollowUpDays: null,
      expectedReplyProb: remainingProb,
      remainingValue: 0,
      reason: `Maximum follow-ups (${maxFollowUps}) reached. Remaining reply probability is ${(remainingProb * 100).toFixed(1)}%.`,
    };
  }

  // Current survival (P(no reply yet by currentDay))
  const sCurrent = survivalAt(curve, currentDay);

  // If survival is already very low, lead has likely replied or is lost
  if (sCurrent < 0.05) {
    return {
      nextFollowUpDays: null,
      expectedReplyProb: 1 - sCurrent,
      remainingValue: 0,
      reason: "Survival function near zero — lead already replied or exhausted.",
    };
  }

  // Evaluate each candidate follow-up day
  let bestValue = -Infinity;
  let bestDay = DEFAULT_FOLLOW_UP_DAYS[numFollowUpsSent] ?? 7;
  let bestReplyProb = 0;

  for (let waitDays = 2; waitDays <= 14; waitDays++) {
    const futureDay = currentDay + waitDays;
    const sFuture = survivalAt(curve, futureDay);

    // Incremental reply probability in this window
    const baseReplyProb = (sCurrent - sFuture) / Math.max(sCurrent, 1e-10);

    // Follow-up boost decays with number already sent
    const decay = Math.pow(0.6, numFollowUpsSent);
    const boostedReplyProb = Math.min(
      1,
      baseReplyProb + followUpBoost * decay * hazardAt(curve, futureDay),
    );

    // Value = expected reply gain minus annoyance cost
    const value = boostedReplyProb - annoyanceCost * (1 + numFollowUpsSent);

    if (value > bestValue) {
      bestValue = value;
      bestDay = waitDays;
      bestReplyProb = boostedReplyProb;
    }
  }

  // If best value is negative, stopping is better
  if (bestValue <= 0) {
    return {
      nextFollowUpDays: null,
      expectedReplyProb: 1 - sCurrent,
      remainingValue: 0,
      reason: `Expected reply gain (${(bestReplyProb * 100).toFixed(1)}%) does not justify annoyance cost. Recommend stopping.`,
    };
  }

  return {
    nextFollowUpDays: bestDay,
    expectedReplyProb: bestReplyProb,
    remainingValue: bestValue,
    reason: `Follow-up #${numFollowUpsSent + 1} in ${bestDay} days. Expected reply boost: ${(bestReplyProb * 100).toFixed(1)}%.`,
  };
}
