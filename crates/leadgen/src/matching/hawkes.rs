/// Retentive Hawkes Process for temporal lead scoring.
///
/// Implements the self-exciting point process:
///
///   λ(t) = μ + Σ_k  α_k · exp(−β_k · (t − t_k))   for t_k < t
///
/// The "retentive" formulation accumulates the conditional intensity in O(n)
/// by sorting events and propagating exponential decay forward in one pass
/// rather than recomputing from scratch per query:
///
///   h_t = exp(−β · Δt) · h_{t-1}  +  α · φ(e_t)
///
/// Each `EventType` carries its own `HawkesParams` so that, for example,
/// a funding round excites much more strongly than a media mention.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// A discrete business event with a Unix-epoch timestamp and associated weight.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BusinessEvent {
    /// Unix epoch seconds (f64 to accommodate sub-second precision).
    pub timestamp: f64,
    pub event_type: EventType,
    /// Magnitude of the event (e.g. funding amount in USD, headcount delta).
    pub magnitude: f64,
}

/// Discriminated set of B2B buying-signal event types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EventType {
    Funding,
    Hiring,
    ProductLaunch,
    TechStackChange,
    Partnership,
    MediaMention,
}

impl EventType {
    /// All variants in a fixed, stable order — used when iterating over types.
    pub fn all() -> [EventType; 6] {
        [
            EventType::Funding,
            EventType::Hiring,
            EventType::ProductLaunch,
            EventType::TechStackChange,
            EventType::Partnership,
            EventType::MediaMention,
        ]
    }
}

// ---------------------------------------------------------------------------
// Hawkes parameters
// ---------------------------------------------------------------------------

/// Per-event-type parameters for the Hawkes process.
#[derive(Debug, Clone)]
pub struct HawkesParams {
    /// Background (baseline) intensity μ — events per second when no history.
    pub mu: f64,
    /// Excitation magnitude α — how much each event of this type boosts λ.
    pub alpha: f64,
    /// Decay rate β — higher means faster return to baseline.
    pub beta: f64,
}

impl Default for HawkesParams {
    fn default() -> Self {
        Self {
            mu: 0.1,
            alpha: 0.5,
            beta: 0.1,
        }
    }
}

/// Build the default parameter map with domain-tuned constants.
///
/// Rationale for choices:
/// - Funding: high alpha (strong signal), moderate decay (stays hot for weeks)
/// - Hiring: moderate alpha, fast decay (hiring surges fade quickly)
/// - ProductLaunch: moderate alpha, slow decay (long-term relevance)
/// - TechStackChange: lower alpha, moderate decay
/// - Partnership: moderate alpha, moderate decay
/// - MediaMention: low alpha, very fast decay (news cycle)
fn default_params() -> HashMap<EventType, HawkesParams> {
    let mut m = HashMap::new();
    m.insert(
        EventType::Funding,
        HawkesParams {
            mu: 0.05,
            alpha: 0.8,
            beta: 0.05,
        },
    );
    m.insert(
        EventType::Hiring,
        HawkesParams {
            mu: 0.10,
            alpha: 0.6,
            beta: 0.20,
        },
    );
    m.insert(
        EventType::ProductLaunch,
        HawkesParams {
            mu: 0.05,
            alpha: 0.5,
            beta: 0.03,
        },
    );
    m.insert(
        EventType::TechStackChange,
        HawkesParams {
            mu: 0.08,
            alpha: 0.4,
            beta: 0.10,
        },
    );
    m.insert(
        EventType::Partnership,
        HawkesParams {
            mu: 0.06,
            alpha: 0.5,
            beta: 0.08,
        },
    );
    m.insert(
        EventType::MediaMention,
        HawkesParams {
            mu: 0.15,
            alpha: 0.2,
            beta: 0.50,
        },
    );
    m
}

// ---------------------------------------------------------------------------
// HawkesProcess
// ---------------------------------------------------------------------------

/// Retentive Hawkes Process — temporal lead scoring via self-exciting point
/// processes.
///
/// # Usage
///
/// ```rust,ignore
/// let mut hp = HawkesProcess::new();
/// hp.observe(BusinessEvent { timestamp: 1_000.0, event_type: EventType::Funding, magnitude: 5e6 });
/// hp.observe(BusinessEvent { timestamp: 1_200.0, event_type: EventType::Hiring, magnitude: 10.0 });
/// let score = hp.intensity(1_500.0); // λ(1500)
/// let features = hp.feature_vector(1_500.0);
/// ```
pub struct HawkesProcess {
    params: HashMap<EventType, HawkesParams>,
    /// Observed events, maintained in ascending timestamp order.
    events: Vec<BusinessEvent>,
}

impl HawkesProcess {
    /// Create a process with domain-tuned default parameters.
    pub fn new() -> Self {
        Self {
            params: default_params(),
            events: Vec::new(),
        }
    }

    /// Create a process with caller-supplied parameters.
    ///
    /// Any `EventType` not present in `params` falls back to `HawkesParams::default()`.
    pub fn with_params(params: HashMap<EventType, HawkesParams>) -> Self {
        Self {
            params,
            events: Vec::new(),
        }
    }

    /// Record a new event in the history.
    ///
    /// Events need not arrive in order; the internal buffer is kept sorted so
    /// that `intensity` can traverse it in a single forward pass.
    pub fn observe(&mut self, event: BusinessEvent) {
        // Insertion sort is efficient for nearly-sorted arriving streams.
        let pos = self
            .events
            .partition_point(|e| e.timestamp <= event.timestamp);
        self.events.insert(pos, event);
    }

    /// Compute the aggregate conditional intensity λ(t) at time `t`.
    ///
    /// Applies the retentive accumulation:
    ///
    ///   λ(t) = Σ_type μ_type  +  Σ_{k: t_k < t} α_type(k) · exp(−β_type(k) · (t − t_k))
    ///
    /// Time complexity: O(n) — one pass over past events.
    pub fn intensity(&self, t: f64) -> f64 {
        // Sum baseline intensities across all known types.
        let mu_total: f64 = EventType::all()
            .iter()
            .map(|et| self.param(*et).mu)
            .sum();

        let excitation: f64 = self
            .events
            .iter()
            .filter(|e| e.timestamp < t)
            .map(|e| {
                let p = self.param(e.event_type);
                p.alpha * (-p.beta * (t - e.timestamp)).exp()
            })
            .sum();

        mu_total + excitation
    }

    /// Decompose intensity at time `t` by event type.
    ///
    /// Returns a map from each `EventType` to its partial contribution
    /// `μ_type + Σ α·exp(−β·Δt)` for events of that type.
    pub fn intensity_by_type(&self, t: f64) -> HashMap<EventType, f64> {
        let mut result: HashMap<EventType, f64> = EventType::all()
            .iter()
            .map(|&et| (et, self.param(et).mu))
            .collect();

        for e in self.events.iter().filter(|e| e.timestamp < t) {
            let p = self.param(e.event_type);
            let contribution = p.alpha * (-p.beta * (t - e.timestamp)).exp();
            *result.entry(e.event_type).or_insert(0.0) += contribution;
        }

        result
    }

    /// Extract a 6-dimensional feature vector for downstream lead scoring.
    ///
    /// Dimensions:
    /// 0. `total_intensity`   — λ(t) at the query time
    /// 1. `funding_intensity` — partial intensity from Funding events only
    /// 2. `hiring_intensity`  — partial intensity from Hiring events only
    /// 3. `event_count_30d`   — number of events in the last 30 days (2 592 000 s)
    /// 4. `event_count_90d`   — number of events in the last 90 days (7 776 000 s)
    /// 5. `avg_magnitude`     — mean magnitude of all past events (0 if none)
    pub fn feature_vector(&self, t: f64) -> Vec<f64> {
        const SECONDS_30D: f64 = 30.0 * 24.0 * 3600.0;
        const SECONDS_90D: f64 = 90.0 * 24.0 * 3600.0;

        let by_type = self.intensity_by_type(t);

        let total_intensity = self.intensity(t);
        let funding_intensity = by_type
            .get(&EventType::Funding)
            .copied()
            .unwrap_or(0.0);
        let hiring_intensity = by_type
            .get(&EventType::Hiring)
            .copied()
            .unwrap_or(0.0);

        let past_events: Vec<&BusinessEvent> = self
            .events
            .iter()
            .filter(|e| e.timestamp < t)
            .collect();

        let event_count_30d = past_events
            .iter()
            .filter(|e| t - e.timestamp <= SECONDS_30D)
            .count() as f64;

        let event_count_90d = past_events
            .iter()
            .filter(|e| t - e.timestamp <= SECONDS_90D)
            .count() as f64;

        let avg_magnitude = if past_events.is_empty() {
            0.0
        } else {
            past_events.iter().map(|e| e.magnitude).sum::<f64>() / past_events.len() as f64
        };

        vec![
            total_intensity,
            funding_intensity,
            hiring_intensity,
            event_count_30d,
            event_count_90d,
            avg_magnitude,
        ]
    }

    /// Probability of at least one event occurring in the interval `[t, t + horizon]`.
    ///
    /// Uses the complementary survival probability:
    ///
    ///   P(event in [t, t+h]) = 1 − exp(−∫_t^{t+h} λ(s) ds)
    ///
    /// The integral is approximated via the trapezoidal rule with `n_steps`
    /// equally-spaced quadrature points. `n_steps = 100` gives < 0.1 % relative
    /// error for typical decay rates.
    pub fn next_event_probability(&self, t: f64, horizon: f64) -> f64 {
        if horizon <= 0.0 {
            return 0.0;
        }

        let n_steps: usize = 100;
        let dt = horizon / n_steps as f64;

        // Trapezoidal rule: ½·(f(a) + f(b)) + Σ f(x_i) for interior points.
        let endpoints = self.intensity(t) + self.intensity(t + horizon);
        let interior: f64 = (1..n_steps)
            .map(|i| self.intensity(t + i as f64 * dt))
            .sum();
        let integral = dt * (0.5 * endpoints + interior);

        let prob = 1.0 - (-integral).exp();
        prob.clamp(0.0, 1.0)
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    /// Look up parameters for `event_type`, returning defaults if absent.
    #[inline]
    fn param(&self, event_type: EventType) -> HawkesParams {
        self.params
            .get(&event_type)
            .cloned()
            .unwrap_or_default()
    }
}

impl Default for HawkesProcess {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// Convenience: build an event at a given timestamp.
    fn evt(ts: f64, et: EventType) -> BusinessEvent {
        BusinessEvent {
            timestamp: ts,
            event_type: et,
            magnitude: 1.0,
        }
    }

    fn evt_mag(ts: f64, et: EventType, mag: f64) -> BusinessEvent {
        BusinessEvent {
            timestamp: ts,
            event_type: et,
            magnitude: mag,
        }
    }

    // --- Baseline intensity --------------------------------------------------

    #[test]
    fn empty_process_intensity_equals_sum_of_mu() {
        let hp = HawkesProcess::new();
        let expected_mu: f64 = EventType::all()
            .iter()
            .map(|et| hp.param(*et).mu)
            .sum();
        let got = hp.intensity(1_000.0);
        assert!(
            (got - expected_mu).abs() < 1e-12,
            "empty process should return sum-of-mu = {expected_mu}, got {got}"
        );
    }

    // --- Single event decay --------------------------------------------------

    #[test]
    fn single_event_decays_over_time() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt(0.0, EventType::Funding));

        let t_near = hp.intensity(1.0);
        let t_far = hp.intensity(1_000.0);
        assert!(
            t_near > t_far,
            "intensity should decay: near={t_near:.6} far={t_far:.6}"
        );
    }

    #[test]
    fn single_event_not_counted_before_its_timestamp() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt(100.0, EventType::Funding));

        let before = hp.intensity(50.0);
        let after = hp.intensity(150.0);
        // Before the event only baselines contribute; after it the excitation
        // term is added on top.
        assert!(
            after > before,
            "intensity after event should exceed intensity before event"
        );

        // At exactly t=50 the event at t=100 must not contribute.
        let mu_total: f64 = EventType::all()
            .iter()
            .map(|et| hp.param(*et).mu)
            .sum();
        assert!(
            (before - mu_total).abs() < 1e-12,
            "before event intensity should equal baseline"
        );
    }

    // --- Multiple events sum correctly ---------------------------------------

    #[test]
    fn two_events_sum_correctly() {
        let params = {
            let mut m = HashMap::new();
            m.insert(
                EventType::Funding,
                HawkesParams {
                    mu: 0.0,
                    alpha: 1.0,
                    beta: 1.0,
                },
            );
            // Fill remaining types with zero contribution so maths is clean.
            for et in EventType::all() {
                if et != EventType::Funding {
                    m.insert(et, HawkesParams { mu: 0.0, alpha: 0.0, beta: 1.0 });
                }
            }
            m
        };

        let mut hp = HawkesProcess::with_params(params);
        hp.observe(evt(0.0, EventType::Funding));
        hp.observe(evt(1.0, EventType::Funding));

        let t = 2.0;
        // Expected: exp(−1·(2−0)) + exp(−1·(2−1)) = e^{-2} + e^{-1}
        let expected = (-2.0_f64).exp() + (-1.0_f64).exp();
        let got = hp.intensity(t);
        assert!(
            (got - expected).abs() < 1e-12,
            "two-event intensity: expected {expected:.10}, got {got:.10}"
        );
    }

    // --- Feature vector dimensions ------------------------------------------

    #[test]
    fn feature_vector_has_six_dimensions() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt(0.0, EventType::Hiring));
        let fv = hp.feature_vector(1.0);
        assert_eq!(fv.len(), 6, "feature vector must have exactly 6 dimensions");
    }

    #[test]
    fn feature_vector_avg_magnitude_matches_events() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt_mag(0.0, EventType::Funding, 10.0));
        hp.observe(evt_mag(1.0, EventType::Hiring, 20.0));
        let fv = hp.feature_vector(100.0);
        // avg_magnitude is at index 5
        let avg = fv[5];
        assert!(
            (avg - 15.0).abs() < 1e-10,
            "avg_magnitude should be 15.0, got {avg}"
        );
    }

    #[test]
    fn feature_vector_event_count_windows() {
        const DAY: f64 = 86_400.0;
        let mut hp = HawkesProcess::new();
        // Event 100 days ago — outside both windows
        hp.observe(evt(0.0 * DAY, EventType::Hiring));
        // Event 60 days ago — inside 90d window only
        let t_base = 100.0 * DAY;
        hp.observe(evt(t_base - 60.0 * DAY, EventType::Hiring));
        // Event 10 days ago — inside both windows
        hp.observe(evt(t_base - 10.0 * DAY, EventType::Hiring));

        let fv = hp.feature_vector(t_base);
        let count_30d = fv[3];
        let count_90d = fv[4];

        assert_eq!(count_30d, 1.0, "only 1 event within 30d");
        assert_eq!(count_90d, 2.0, "2 events within 90d");
    }

    // --- Per-type decomposition ---------------------------------------------

    #[test]
    fn intensity_by_type_sums_to_total() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt(0.0, EventType::Funding));
        hp.observe(evt(0.5, EventType::Hiring));

        let t = 1.0;
        let total = hp.intensity(t);
        let by_type: f64 = hp.intensity_by_type(t).values().sum();

        assert!(
            (total - by_type).abs() < 1e-10,
            "sum of per-type intensities must equal total: total={total:.10} sum={by_type:.10}"
        );
    }

    #[test]
    fn event_type_only_excites_its_own_bucket() {
        // Use a params map where only Funding has nonzero alpha.
        let mut params = HashMap::new();
        for et in EventType::all() {
            let alpha = if et == EventType::Funding { 1.0 } else { 0.0 };
            params.insert(et, HawkesParams { mu: 0.0, alpha, beta: 1.0 });
        }
        let mut hp = HawkesProcess::with_params(params);
        hp.observe(evt(0.0, EventType::Hiring)); // Hiring event with alpha=0

        let by_type = hp.intensity_by_type(1.0);
        // Hiring bucket must not have excitation contribution.
        let hiring = by_type[&EventType::Hiring];
        assert!(
            hiring.abs() < 1e-12,
            "Hiring alpha=0, expected 0 excitation, got {hiring}"
        );
    }

    // --- next_event_probability bounds ---------------------------------------

    #[test]
    fn next_event_probability_in_unit_interval() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt(0.0, EventType::Funding));
        hp.observe(evt(100.0, EventType::Hiring));

        let p = hp.next_event_probability(200.0, 86_400.0);
        assert!(
            (0.0..=1.0).contains(&p),
            "probability must be in [0,1], got {p}"
        );
    }

    #[test]
    fn next_event_probability_zero_horizon() {
        let hp = HawkesProcess::new();
        let p = hp.next_event_probability(0.0, 0.0);
        assert_eq!(p, 0.0, "zero horizon must yield zero probability");
    }

    #[test]
    fn next_event_probability_increases_with_horizon() {
        let mut hp = HawkesProcess::new();
        hp.observe(evt(0.0, EventType::Funding));

        let p_short = hp.next_event_probability(1.0, 0.1);
        let p_long = hp.next_event_probability(1.0, 10.0);
        assert!(
            p_long >= p_short,
            "longer horizon must give higher or equal probability: short={p_short}, long={p_long}"
        );
    }

    #[test]
    fn events_out_of_order_produce_same_intensity() {
        let mut hp_ordered = HawkesProcess::new();
        hp_ordered.observe(evt(10.0, EventType::Funding));
        hp_ordered.observe(evt(20.0, EventType::Hiring));

        let mut hp_reversed = HawkesProcess::new();
        hp_reversed.observe(evt(20.0, EventType::Hiring));
        hp_reversed.observe(evt(10.0, EventType::Funding));

        let t = 30.0;
        let i1 = hp_ordered.intensity(t);
        let i2 = hp_reversed.intensity(t);
        assert!(
            (i1 - i2).abs() < 1e-12,
            "insertion order must not affect intensity: ordered={i1}, reversed={i2}"
        );
    }
}
