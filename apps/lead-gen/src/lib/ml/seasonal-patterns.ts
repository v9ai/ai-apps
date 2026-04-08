/**
 * DFT-based seasonal cycle detection for email engagement patterns.
 *
 * Runs an O(n^2) Discrete Fourier Transform on weekly engagement data
 * (n <= 104 weeks), identifies dominant frequencies matching known business
 * cycles, and produces a forecasting model based on sinusoidal decomposition.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeeklyEngagement {
  opens: number;
  sends: number;
  replies: number;
}

export interface SeasonalSignal {
  /** Dominant period in weeks */
  periodWeeks: number;
  /** Signal amplitude (normalized) */
  amplitude: number;
  /** Phase offset in radians */
  phase: number;
  /** Human-readable label for the cycle */
  label: string;
}

export interface SeasonalForecast {
  /** Weeks ahead from current (1-indexed) */
  weekAhead: number;
  /** Multiplicative engagement factor (1.0 = baseline) */
  engagementMultiplier: number;
  /** Top contributing seasonal factors */
  topFactors: string[];
}

// ---------------------------------------------------------------------------
// Constants: known business cycles
// ---------------------------------------------------------------------------

interface KnownCycle {
  period: number;
  label: string;
  tolerance: number;
}

const KNOWN_CYCLES: KnownCycle[] = [
  { period: 52, label: "annual", tolerance: 4 },
  { period: 26, label: "semi-annual", tolerance: 3 },
  { period: 13, label: "quarterly", tolerance: 2 },
  { period: 4, label: "monthly", tolerance: 1 },
];

// ---------------------------------------------------------------------------
// DFT (O(n^2) — acceptable for n <= 104)
// ---------------------------------------------------------------------------

interface DFTResult {
  frequency: number;
  amplitude: number;
  phase: number;
}

/**
 * Compute the Discrete Fourier Transform of a real-valued signal.
 * Returns amplitude and phase for each frequency bin.
 */
function dft(signal: number[]): DFTResult[] {
  const n = signal.length;
  if (n === 0) return [];

  const results: DFTResult[] = [];

  for (let k = 1; k < Math.floor(n / 2); k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      re += signal[t] * Math.cos(angle);
      im -= signal[t] * Math.sin(angle);
    }
    re /= n;
    im /= n;

    const amplitude = 2 * Math.sqrt(re * re + im * im);
    const phase = Math.atan2(im, re);
    const frequency = k / n; // cycles per sample (i.e., per week)

    results.push({ frequency, amplitude, phase });
  }

  return results;
}

/**
 * Match a DFT frequency to known business cycles.
 * Returns the matching cycle label or null.
 */
function matchCycle(
  periodWeeks: number,
): { label: string; period: number } | null {
  for (const cycle of KNOWN_CYCLES) {
    if (Math.abs(periodWeeks - cycle.period) <= cycle.tolerance) {
      return { label: cycle.label, period: cycle.period };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract seasonal patterns from weekly engagement data.
 *
 * Computes the engagement rate (opens+replies) / max(sends,1) per week,
 * subtracts the mean to detrend, runs DFT, and matches dominant frequencies
 * to known business cycles.
 *
 * @param weeklyData Array of weekly engagement snapshots (oldest first).
 */
export function extractSeasonalPatterns(
  weeklyData: WeeklyEngagement[],
): SeasonalSignal[] {
  if (weeklyData.length < 8) return [];

  // Compute engagement rate signal
  const signal = weeklyData.map(
    (w) => (w.opens + w.replies) / Math.max(w.sends, 1),
  );

  // Detrend: subtract mean
  const mean = signal.reduce((s, v) => s + v, 0) / signal.length;
  const detrended = signal.map((v) => v - mean);

  // DFT
  const spectrum = dft(detrended);

  // Sort by amplitude descending
  spectrum.sort((a, b) => b.amplitude - a.amplitude);

  // Match to known cycles, keep top signals
  const signals: SeasonalSignal[] = [];
  const usedLabels = new Set<string>();

  for (const bin of spectrum) {
    if (signals.length >= 4) break;
    if (bin.amplitude < 0.01) continue;

    const periodWeeks = 1 / bin.frequency;
    const match = matchCycle(periodWeeks);

    if (match && !usedLabels.has(match.label)) {
      usedLabels.add(match.label);
      signals.push({
        periodWeeks: match.period,
        amplitude: bin.amplitude,
        phase: bin.phase,
        label: match.label,
      });
    }
  }

  return signals;
}

/**
 * Forecast future engagement multipliers using detected seasonal signals.
 *
 * @param signals      Seasonal signals from extractSeasonalPatterns.
 * @param currentWeek  Current week index (0-based, same origin as training data).
 * @param horizonWeeks Forecast horizon (default 8).
 */
export function forecastSeasonal(
  signals: SeasonalSignal[],
  currentWeek: number,
  horizonWeeks = 8,
): SeasonalForecast[] {
  const forecasts: SeasonalForecast[] = [];

  for (let h = 1; h <= horizonWeeks; h++) {
    const t = currentWeek + h;
    let multiplier = 1.0;
    const topFactors: string[] = [];

    for (const sig of signals) {
      const contribution =
        sig.amplitude *
        Math.cos((2 * Math.PI * t) / sig.periodWeeks + sig.phase);

      multiplier += contribution;

      if (Math.abs(contribution) > 0.02) {
        const direction = contribution > 0 ? "+" : "-";
        topFactors.push(`${sig.label} (${direction}${(Math.abs(contribution) * 100).toFixed(0)}%)`);
      }
    }

    // Clamp to reasonable range
    multiplier = Math.max(0.3, Math.min(2.0, multiplier));

    forecasts.push({
      weekAhead: h,
      engagementMultiplier: multiplier,
      topFactors,
    });
  }

  return forecasts;
}
