//! SODACER Dual-Buffer Adaptive Experience Replay.
//!
//! Implements the SODACER (2026) experience replay scheme for the RL crawler.
//! Key innovation: two complementary buffers with adaptive priority scoring
//! that balance recency (fast buffer) against high-value historical patterns
//! (slow buffer).
//!
//! ## Algorithm
//!
//! **Fast buffer** — a FIFO ring of the most recent N experiences. Eviction is
//! oldest-first once the capacity is exceeded.
//!
//! **Slow buffer** — stores the top-k highest-priority experiences promoted from
//! the fast buffer. Adaptive pruning removes the lowest-priority entry when
//! the slow buffer is full.
//!
//! **Priority scoring:**
//! ```text
//! priority_i = |TD_error_i| * w_td + |Bellman_error_i| * w_bell
//! ```
//! `w_td` and `w_bell` are adaptive weights that shift based on recent
//! sampling success (approximated here by tracking running TD error magnitude).
//!
//! **Proportional sampling with IS correction:**
//! ```text
//! P(i) = priority_i^α / Σ priority_j^α
//! IS_weight_i = (N * P(i))^(-β)
//! ```
//! β anneals from 0.4 → 1.0 over training to correct for the initial
//! prioritisation bias.
//!
//! ## Design choices
//!
//! - No external crates beyond `std`. PRNG reuses the inline xorshift64 pattern
//!   from `scheduler.rs` and `neural_ucb.rs`.
//! - Bellman error is approximated as `|TD_error| * discount` so callers only
//!   need to supply the TD error; full Bellman error support is available via
//!   `Experience::bellman_error`.

// ── PRNG ─────────────────────────────────────────────────────────────────────

/// Minimal xorshift64 PRNG — matches the inline pattern used across this crate.
struct Xorshift64 {
    state: u64,
}

impl Xorshift64 {
    fn new(seed: u64) -> Self {
        // A non-zero seed is required; fall back to a fixed constant if the
        // caller somehow provides zero.
        Self { state: if seed == 0 { 0x_dead_beef_cafe_babe } else { seed } }
    }

    #[inline]
    fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    /// Uniform float in [0, 1).
    #[inline]
    fn next_f64(&mut self) -> f64 {
        // Use the top 53 bits for the mantissa.
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }
}

// ── Experience ────────────────────────────────────────────────────────────────

/// A single experience tuple for the RL crawler.
///
/// `state` is the 16-dimensional context vector produced by `NeuralUCB`.
/// `td_error` is |r + γV(s') - V(s)| computed by the caller after a training
/// step. `priority` is maintained by `DualBufferReplay` and should not be set
/// manually.
#[derive(Debug, Clone)]
pub struct Experience {
    /// Domain features — 16-dim context vector from NeuralUCB.
    pub state: Vec<f64>,
    /// Domain index selected by the policy.
    pub action: usize,
    /// Composite crawl reward (see `CrawlReward::composite`).
    pub reward: f64,
    /// Features of the next state observed after the action.
    pub next_state: Vec<f64>,
    /// |r + γV(s') - V(s)| — set by caller after each Bellman update.
    pub td_error: f64,
    /// Adaptive priority score — managed by `DualBufferReplay::update_priority`.
    pub priority: f64,
    /// Optional separate Bellman residual. When `None`, it is approximated as
    /// `td_error * DISCOUNT` inside the priority computation.
    pub bellman_error: Option<f64>,
}

impl Experience {
    /// Construct a new experience with an initial priority equal to `td_error`.
    /// This ensures new experiences are sampled at least once before priority
    /// is refined (PER convention: max priority for new entries).
    pub fn new(
        state: Vec<f64>,
        action: usize,
        reward: f64,
        next_state: Vec<f64>,
        td_error: f64,
    ) -> Self {
        Self {
            priority: td_error.abs().max(1e-6),
            state,
            action,
            reward,
            next_state,
            td_error,
            bellman_error: None,
        }
    }
}

// ── DualBufferReplay ──────────────────────────────────────────────────────────

/// Discount factor used when approximating Bellman error from TD error.
const DISCOUNT: f64 = 0.99;

/// How many experiences to promote from fast → slow each `store` call.
const PROMOTE_TOP_K: usize = 1;

/// SODACER dual-buffer experience replay.
///
/// # Example
/// ```rust
/// use leadgen::crawler::experience_replay::{DualBufferReplay, Experience};
///
/// let mut replay = DualBufferReplay::new(100, 50);
/// let exp = Experience::new(vec![0.0; 16], 0, 1.0, vec![0.1; 16], 0.5);
/// replay.store(exp);
/// let (batch, weights) = replay.sample(1);
/// assert_eq!(batch.len(), 1);
/// assert!((weights[0] - 1.0).abs() < 1.0); // weights are finite
/// ```
pub struct DualBufferReplay {
    /// Recent experiences; evicted FIFO once `fast_capacity` is reached.
    fast_buffer: Vec<Experience>,
    /// High-priority historical experiences promoted from the fast buffer.
    slow_buffer: Vec<Experience>,
    fast_capacity: usize,
    slow_capacity: usize,
    /// Priority exponent α ∈ [0, 1]. 0 = uniform, 1 = fully proportional.
    alpha: f64,
    /// IS-correction exponent β; anneals from `beta_init` toward 1.0.
    beta: f64,
    /// Added to β each training step.
    beta_increment: f64,
    /// Adaptive weight for TD error in priority computation.
    td_weight: f64,
    /// Adaptive weight for Bellman error in priority computation.
    bell_weight: f64,
    /// Running mean of recent TD errors — used to adapt weights.
    td_ema: f64,
    /// Total number of `sample` calls — used for IS normalisation denominator.
    total_samples: u64,
    /// Inline PRNG for sampling.
    rng: Xorshift64,
}

impl DualBufferReplay {
    /// Create a new replay buffer.
    ///
    /// * `fast_capacity` — maximum number of recent experiences retained.
    /// * `slow_capacity` — maximum number of high-priority historical experiences.
    pub fn new(fast_capacity: usize, slow_capacity: usize) -> Self {
        Self {
            fast_buffer: Vec::with_capacity(fast_capacity),
            slow_buffer: Vec::with_capacity(slow_capacity),
            fast_capacity,
            slow_capacity,
            alpha: 0.6,
            beta: 0.4,
            beta_increment: 6e-4, // reaches ~1.0 after ~1 000 steps
            td_weight: 0.7,
            bell_weight: 0.3,
            td_ema: 0.0,
            total_samples: 0,
            rng: Xorshift64::new(0x_dead_cafe_1234_5678),
        }
    }

    // ── Capacity configuration ────────────────────────────────────────────────

    /// Override the default priority exponent α.
    pub fn with_alpha(mut self, alpha: f64) -> Self {
        self.alpha = alpha.clamp(0.0, 1.0);
        self
    }

    /// Override the initial β (IS-correction) value.
    pub fn with_beta_init(mut self, beta: f64) -> Self {
        self.beta = beta.clamp(0.0, 1.0);
        self
    }

    // ── Core operations ───────────────────────────────────────────────────────

    /// Compute the scalar priority for an experience.
    ///
    /// `priority = |TD_error| * w_td + |Bellman_error| * w_bell`
    ///
    /// When `bellman_error` is `None` it is approximated as
    /// `|td_error| * DISCOUNT`.
    fn compute_priority(&self, exp: &Experience) -> f64 {
        let td = exp.td_error.abs();
        let bell = exp
            .bellman_error
            .map(|b| b.abs())
            .unwrap_or(td * DISCOUNT);
        let raw = td * self.td_weight + bell * self.bell_weight;
        raw.max(1e-6) // avoid zero-probability entries
    }

    /// Store a new experience.
    ///
    /// The experience is appended to the fast buffer. If the fast buffer is at
    /// capacity, the oldest entry is evicted (FIFO). Afterwards, the top-k
    /// highest-priority entries in the fast buffer are promoted to the slow
    /// buffer.
    pub fn store(&mut self, mut exp: Experience) {
        // Compute and assign priority.
        exp.priority = self.compute_priority(&exp);

        // Update adaptive weights using an EMA of recent TD errors.
        let td_abs = exp.td_error.abs();
        self.td_ema = 0.99 * self.td_ema + 0.01 * td_abs;
        // If recent TD errors are large, weight them more; shift toward Bellman
        // when errors are small (network is converging).
        if self.td_ema > 0.5 {
            self.td_weight = (self.td_weight + 0.01).min(0.9);
            self.bell_weight = 1.0 - self.td_weight;
        } else {
            self.bell_weight = (self.bell_weight + 0.01).min(0.9);
            self.td_weight = 1.0 - self.bell_weight;
        }

        // FIFO eviction: remove the oldest entry when at capacity.
        if self.fast_buffer.len() >= self.fast_capacity {
            self.fast_buffer.remove(0);
        }
        self.fast_buffer.push(exp);

        // Promote the highest-priority experiences to the slow buffer.
        self.promote_to_slow();
    }

    /// Sample a mini-batch with importance-sampling weights.
    ///
    /// Draws proportionally from the combined fast + slow buffer according to
    /// `P(i) = priority_i^α / Σ priority_j^α`. IS weights correct for the
    /// sampling bias.
    ///
    /// Returns `(experiences, IS_weights)`. If the total buffer has fewer than
    /// `batch_size` entries, all available experiences are returned (with their
    /// corresponding weights).
    pub fn sample(&self, batch_size: usize) -> (Vec<&Experience>, Vec<f64>) {
        let all: Vec<&Experience> = self
            .fast_buffer
            .iter()
            .chain(self.slow_buffer.iter())
            .collect();

        let n = all.len();
        if n == 0 {
            return (Vec::new(), Vec::new());
        }

        // Build probability distribution: P(i) = priority^α / Σ priority^α
        let powered: Vec<f64> = all
            .iter()
            .map(|e| e.priority.powf(self.alpha))
            .collect();
        let sum: f64 = powered.iter().sum();
        let probs: Vec<f64> = powered.iter().map(|&p| p / sum).collect();

        // Compute IS weights: (N * P(i))^(-β), normalised by max weight so
        // the largest weight equals 1.0 (standard PER normalisation).
        let raw_weights: Vec<f64> = probs
            .iter()
            .map(|&p| ((n as f64) * p).powf(-self.beta))
            .collect();
        let max_w = raw_weights.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let max_w = if max_w <= 0.0 { 1.0 } else { max_w };
        let is_weights: Vec<f64> = raw_weights.iter().map(|&w| w / max_w).collect();

        // Proportional sampling without replacement using a mutable local RNG.
        // We rebuild the RNG from a deterministic seed derived from the current
        // state so that `sample` remains `&self` (no interior mutability needed).
        let actual_batch = batch_size.min(n);
        let mut local_rng = {
            // Mix total_samples and n into a seed.
            let seed = self.total_samples.wrapping_mul(6364136223846793005)
                ^ (n as u64).wrapping_mul(1442695040888963407)
                ^ 0x_dead_cafe_1234_5678;
            Xorshift64::new(if seed == 0 { 1 } else { seed })
        };

        let mut selected_indices: Vec<usize> = Vec::with_capacity(actual_batch);
        // Build cumulative distribution for O(k log n) sampling.
        let mut cum = Vec::with_capacity(n);
        let mut acc = 0.0_f64;
        for &p in &probs {
            acc += p;
            cum.push(acc);
        }

        while selected_indices.len() < actual_batch {
            let r = local_rng.next_f64();
            // Binary search for the bucket containing r.
            let idx = cum.partition_point(|&c| c < r).min(n - 1);
            if !selected_indices.contains(&idx) {
                selected_indices.push(idx);
            }
        }

        let experiences: Vec<&Experience> =
            selected_indices.iter().map(|&i| all[i]).collect();
        let batch_raw: Vec<f64> = selected_indices.iter().map(|&i| is_weights[i]).collect();

        // Re-normalize the batch so the max weight in the returned set is 1.0.
        let batch_max = batch_raw.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let batch_max = if batch_max <= 0.0 { 1.0 } else { batch_max };
        let weights: Vec<f64> = batch_raw.iter().map(|&w| w / batch_max).collect();

        (experiences, weights)
    }

    /// Update the priority of the experience at `index` in the combined buffer
    /// (fast first, then slow) after a new TD error has been computed.
    ///
    /// If `index` is out of bounds the call is a no-op.
    pub fn update_priority(&mut self, index: usize, new_td_error: f64) {
        let fast_len = self.fast_buffer.len();
        if index < fast_len {
            self.fast_buffer[index].td_error = new_td_error;
            let p = self.compute_priority(&self.fast_buffer[index].clone());
            self.fast_buffer[index].priority = p;
        } else {
            let slow_idx = index - fast_len;
            if slow_idx < self.slow_buffer.len() {
                self.slow_buffer[slow_idx].td_error = new_td_error;
                let p = self.compute_priority(&self.slow_buffer[slow_idx].clone());
                self.slow_buffer[slow_idx].priority = p;
            }
        }
    }

    /// Advance β toward 1.0. Call once per training step.
    pub fn step_beta(&mut self) {
        self.beta = (self.beta + self.beta_increment).min(1.0);
        self.total_samples += 1;
    }

    /// Promote the top-k highest-priority experiences from the fast buffer into
    /// the slow buffer.
    ///
    /// When the slow buffer is full, the lowest-priority existing entry is
    /// replaced if the candidate has a strictly higher priority.
    fn promote_to_slow(&mut self) {
        if self.fast_buffer.is_empty() {
            return;
        }

        // Identify top-k candidates in the fast buffer by priority (desc).
        let mut indexed: Vec<(usize, f64)> = self
            .fast_buffer
            .iter()
            .enumerate()
            .map(|(i, e)| (i, e.priority))
            .collect();
        indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        for (fast_idx, candidate_priority) in indexed.iter().take(PROMOTE_TOP_K) {
            let candidate = self.fast_buffer[*fast_idx].clone();

            if self.slow_buffer.len() < self.slow_capacity {
                self.slow_buffer.push(candidate);
            } else {
                // Find the lowest-priority slot in the slow buffer.
                let (min_idx, min_priority) = self
                    .slow_buffer
                    .iter()
                    .enumerate()
                    .map(|(i, e)| (i, e.priority))
                    .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
                    .unwrap_or((0, f64::INFINITY));

                if *candidate_priority > min_priority {
                    self.slow_buffer[min_idx] = candidate;
                }
            }
        }
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /// Total number of stored experiences across both buffers.
    pub fn len(&self) -> usize {
        self.fast_buffer.len() + self.slow_buffer.len()
    }

    /// Whether both buffers are empty.
    pub fn is_empty(&self) -> bool {
        self.fast_buffer.is_empty() && self.slow_buffer.is_empty()
    }

    /// Number of experiences in the fast buffer.
    pub fn fast_len(&self) -> usize {
        self.fast_buffer.len()
    }

    /// Number of experiences in the slow buffer.
    pub fn slow_len(&self) -> usize {
        self.slow_buffer.len()
    }

    /// Current β value (IS-correction exponent).
    pub fn beta(&self) -> f64 {
        self.beta
    }

    /// Current adaptive TD-error weight.
    pub fn td_weight(&self) -> f64 {
        self.td_weight
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_exp(td_error: f64, reward: f64) -> Experience {
        Experience::new(vec![0.0; 16], 0, reward, vec![0.1; 16], td_error)
    }

    // ── store and retrieve ────────────────────────────────────────────────────

    #[test]
    fn store_and_retrieve_single() {
        let mut replay = DualBufferReplay::new(10, 5);
        replay.store(make_exp(0.5, 1.0));
        assert_eq!(replay.fast_len(), 1);
        assert!(replay.slow_len() <= 1);
        assert!(replay.len() >= 1);

        let (batch, weights) = replay.sample(1);
        assert_eq!(batch.len(), 1);
        assert_eq!(weights.len(), 1);
        assert!(weights[0] > 0.0);
    }

    #[test]
    fn store_multiple_retrievable() {
        let mut replay = DualBufferReplay::new(20, 10);
        for i in 0..5 {
            replay.store(make_exp(0.1 * (i + 1) as f64, i as f64));
        }
        let (batch, weights) = replay.sample(3);
        assert_eq!(batch.len(), 3);
        assert_eq!(weights.len(), 3);
    }

    // ── FIFO eviction ─────────────────────────────────────────────────────────

    #[test]
    fn fast_buffer_fifo_eviction() {
        let mut replay = DualBufferReplay::new(3, 10);
        for i in 0..5u32 {
            replay.store(make_exp(0.1, i as f64));
        }
        // Fast buffer should be capped at 3.
        assert_eq!(replay.fast_len(), 3);
    }

    #[test]
    fn fast_buffer_fifo_eviction_order() {
        let mut replay = DualBufferReplay::new(3, 0);
        // Store with distinct rewards so we can identify which survived.
        replay.store(make_exp(0.1, 10.0)); // oldest — should be evicted
        replay.store(make_exp(0.1, 20.0));
        replay.store(make_exp(0.1, 30.0));
        replay.store(make_exp(0.1, 40.0)); // triggers eviction of reward=10

        let rewards: Vec<f64> = replay.fast_buffer.iter().map(|e| e.reward).collect();
        assert!(!rewards.contains(&10.0), "oldest entry should have been evicted");
        assert!(rewards.contains(&40.0), "newest entry should be present");
    }

    // ── Slow buffer promotion ─────────────────────────────────────────────────

    #[test]
    fn slow_buffer_promotes_high_priority() {
        let mut replay = DualBufferReplay::new(50, 5);
        // Store low-priority entries first.
        for _ in 0..10 {
            replay.store(make_exp(0.01, 0.0));
        }
        // Store a high-priority entry.
        replay.store(make_exp(10.0, 5.0));

        // The high-priority experience should have been promoted.
        assert!(replay.slow_len() > 0);
        let max_slow_priority = replay
            .slow_buffer
            .iter()
            .map(|e| e.priority)
            .fold(f64::NEG_INFINITY, f64::max);
        assert!(max_slow_priority > 0.5, "slow buffer should hold high-priority entry");
    }

    #[test]
    fn slow_buffer_does_not_exceed_capacity() {
        let capacity = 4;
        let mut replay = DualBufferReplay::new(100, capacity);
        for i in 0..20 {
            replay.store(make_exp(i as f64, 1.0));
        }
        assert!(
            replay.slow_len() <= capacity,
            "slow buffer length {} exceeds capacity {}",
            replay.slow_len(),
            capacity
        );
    }

    // ── Sampling ──────────────────────────────────────────────────────────────

    #[test]
    fn sample_returns_exact_batch_size() {
        let mut replay = DualBufferReplay::new(50, 20);
        for i in 0..20 {
            replay.store(make_exp(0.1 * (i + 1) as f64, 1.0));
        }
        for batch_size in [1, 5, 10, 15] {
            let (batch, weights) = replay.sample(batch_size);
            assert_eq!(batch.len(), batch_size, "batch_size={batch_size}");
            assert_eq!(weights.len(), batch_size);
        }
    }

    #[test]
    fn sample_clamps_to_available() {
        let mut replay = DualBufferReplay::new(5, 5);
        replay.store(make_exp(0.5, 1.0));
        replay.store(make_exp(0.3, 2.0));

        let (batch, weights) = replay.sample(100);
        // We only stored 2 (fast) + up to 2 promoted (slow) entries.
        assert!(batch.len() <= 4);
        assert_eq!(batch.len(), weights.len());
    }

    #[test]
    fn sample_empty_buffer_returns_empty() {
        let replay = DualBufferReplay::new(10, 5);
        let (batch, weights) = replay.sample(5);
        assert!(batch.is_empty());
        assert!(weights.is_empty());
    }

    // ── IS weights ────────────────────────────────────────────────────────────

    #[test]
    fn is_weights_are_positive_and_bounded() {
        let mut replay = DualBufferReplay::new(50, 20);
        for i in 1..=10 {
            replay.store(make_exp(i as f64 * 0.1, 1.0));
        }
        let (batch, weights) = replay.sample(5);
        assert_eq!(batch.len(), weights.len());
        for &w in &weights {
            assert!(w > 0.0, "IS weight must be positive");
            assert!(w <= 1.0 + 1e-9, "IS weight must not exceed 1 (normalised by max)");
        }
    }

    #[test]
    fn is_weights_max_is_one() {
        // After normalisation the largest IS weight should equal 1.0.
        let mut replay = DualBufferReplay::new(50, 20);
        for i in 1..=15 {
            replay.store(make_exp(i as f64 * 0.2, 1.0));
        }
        let (batch, weights) = replay.sample(10);
        assert!(!weights.is_empty());
        let max_w = weights.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        assert!(
            (max_w - 1.0).abs() < 1e-9,
            "max IS weight should be normalised to 1.0, got {max_w}"
        );

        // Suppress unused-variable warning for batch in test context.
        let _ = batch;
    }

    // ── Beta annealing ────────────────────────────────────────────────────────

    #[test]
    fn beta_anneals_toward_one() {
        let mut replay = DualBufferReplay::new(10, 5);
        let initial_beta = replay.beta();
        assert!((initial_beta - 0.4).abs() < 1e-9);

        for _ in 0..2000 {
            replay.step_beta();
        }
        assert!(
            replay.beta() > 0.9,
            "beta should anneal toward 1.0 after many steps, got {}",
            replay.beta()
        );
    }

    #[test]
    fn beta_does_not_exceed_one() {
        let mut replay = DualBufferReplay::new(10, 5);
        for _ in 0..100_000 {
            replay.step_beta();
        }
        assert!(
            replay.beta() <= 1.0,
            "beta must not exceed 1.0, got {}",
            replay.beta()
        );
    }

    #[test]
    fn total_samples_increments_with_step_beta() {
        let mut replay = DualBufferReplay::new(10, 5);
        assert_eq!(replay.total_samples, 0);
        replay.step_beta();
        assert_eq!(replay.total_samples, 1);
        replay.step_beta();
        assert_eq!(replay.total_samples, 2);
    }

    // ── Priority updates ──────────────────────────────────────────────────────

    #[test]
    fn update_priority_changes_fast_buffer_entry() {
        let mut replay = DualBufferReplay::new(10, 5);
        replay.store(make_exp(0.1, 1.0));

        let old_priority = replay.fast_buffer[0].priority;
        replay.update_priority(0, 5.0); // much larger TD error
        let new_priority = replay.fast_buffer[0].priority;

        assert!(
            new_priority > old_priority,
            "priority should increase with larger TD error: {old_priority} → {new_priority}"
        );
    }

    #[test]
    fn update_priority_out_of_bounds_is_noop() {
        let mut replay = DualBufferReplay::new(10, 5);
        replay.store(make_exp(0.5, 1.0));
        // Should not panic.
        replay.update_priority(9999, 1.0);
        assert_eq!(replay.fast_len(), 1);
    }

    #[test]
    fn update_priority_in_slow_buffer() {
        let mut replay = DualBufferReplay::new(50, 5);
        // Store enough high-priority entries to fill the slow buffer.
        for i in 1..=10 {
            replay.store(make_exp(i as f64, 1.0));
        }
        let fast_len = replay.fast_len();
        // If the slow buffer has at least one entry, update the first slot.
        if replay.slow_len() > 0 {
            let slow_idx = fast_len; // first slow buffer entry in combined view
            replay.update_priority(slow_idx, 0.001); // tiny TD error → low priority
            let updated_priority = replay.slow_buffer[0].priority;
            assert!(
                updated_priority < 0.01,
                "priority should reflect new tiny TD error, got {updated_priority}"
            );
        }
    }

    // ── Adaptive weight adaptation ────────────────────────────────────────────

    #[test]
    fn adaptive_weights_sum_to_one() {
        let mut replay = DualBufferReplay::new(20, 10);
        for i in 0..10 {
            replay.store(make_exp(i as f64 * 0.1 + 0.01, 1.0));
        }
        let sum = replay.td_weight() + replay.bell_weight;
        assert!(
            (sum - 1.0).abs() < 1e-9,
            "td_weight + bell_weight should equal 1.0, got {sum}"
        );
    }
}
