//! NeuralUCB contextual bandits for domain selection.
//!
//! Implements NeuralUCB (Zhou et al., 2020 — "Neural Contextual Bandits with
//! UCB-Based Exploration") adapted for web crawler domain prioritisation.
//!
//! ## Algorithm
//!
//! Each crawl candidate is represented as a 16-dimensional context vector
//! capturing crawl statistics, historical yield, and TLD features. A shared
//! 3-layer MLP predicts the expected reward for each domain. Uncertainty is
//! estimated via **MC dropout** (Gal & Ghahramani, 2016): the forward pass is
//! run `mc_samples` times with random dropout masks and the prediction
//! standard deviation is used as the exploration bonus.
//!
//! Selection policy:
//! ```text
//! argmax_i ( μ_i  +  exploration_coeff * σ_i )
//! ```
//! where μ_i is the mean MC prediction and σ_i is its standard deviation.
//!
//! ## Training
//!
//! Online SGD with MSE loss on an experience replay ring buffer. A single
//! mini-batch epoch is run every `retrain_interval` observations. Gradients
//! are computed analytically (back-propagation by hand through the 3-layer
//! ReLU MLP).
//!
//! ## Design choices
//!
//! - **ndarray only** — no candle, no tch. The network is small (~5 K params)
//!   so the overhead of a tensor runtime is not justified.
//! - **Xorshift64** PRNG — matches the pattern in `scheduler.rs`; no rand crate.
//! - All weight matrices are stored column-major so `w.t().dot(x)` is the
//!   natural forward pass direction (input dim × output dim).

use ndarray::{Array1, Array2, Axis};

// ── PRNG ─────────────────────────────────────────────────────────────────────

/// Minimal xorshift64 PRNG — no external dependencies.
///
/// Matches the inline PRNG used in `scheduler.rs`.
pub struct Xorshift64 {
    state: u64,
}

impl Xorshift64 {
    /// Create a seeded generator. Panics if `seed` is zero (invalid for xorshift).
    pub fn new(seed: u64) -> Self {
        assert!(seed != 0, "xorshift64 seed must not be zero");
        Self { state: seed }
    }

    #[inline]
    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    /// Uniform sample in [0, 1).
    #[inline]
    pub fn next_f32(&mut self) -> f32 {
        // Use upper 24 bits for f32 precision (mantissa is 23 bits).
        (self.next_u64() >> 40) as f32 / (1u64 << 24) as f32
    }

    /// Box-Muller transform — standard normal N(0, 1).
    pub fn next_normal_f32(&mut self) -> f32 {
        let u1 = (self.next_f32()).max(1e-7_f32);
        let u2 = self.next_f32();
        (-2.0_f32 * u1.ln()).sqrt() * (2.0_f32 * std::f32::consts::PI * u2).cos()
    }
}

// ── Context ───────────────────────────────────────────────────────────────────

/// 16-dimensional context vector describing a crawl candidate domain.
///
/// All continuous fields should be normalised to roughly [0, 1] before use.
/// The feature extraction caller is responsible for normalisation; this struct
/// stores the already-normalised values.
#[derive(Debug, Clone)]
pub struct DomainContext {
    /// Pages fetched in previous crawls, normalised (e.g. divide by 50).
    pub pages_fetched: f32,
    /// Historical contacts extracted per page.
    pub contacts_per_page: f32,
    /// Historical email addresses found per page.
    pub emails_per_page: f32,
    /// Mean body-text length across pages, normalised (e.g. divide by 3 000).
    pub avg_content_length: f32,
    /// Seconds since last crawl, normalised (e.g. divide by 86 400 for one day).
    pub time_since_last: f32,
    /// Total times this domain has been selected, normalised (e.g. divide by 100).
    pub total_pulls: f32,
    /// Fraction of recently fetched pages that were previously unseen.
    pub novelty_ratio: f32,
    /// Exponential moving average of past composite rewards.
    pub reward_mean: f32,
    /// Variance of past composite rewards (running estimate).
    pub reward_variance: f32,
    /// 1.0 if the primary TLD is `.com`, 0.0 otherwise.
    pub tld_com: f32,
    /// 1.0 if the primary TLD is `.io`, 0.0 otherwise.
    pub tld_io: f32,
    /// 1.0 if the primary TLD is `.ai`, 0.0 otherwise.
    pub tld_ai: f32,
    /// 1.0 if the TLD is anything other than .com/.io/.ai.
    pub tld_other: f32,
    /// Mean URL path depth of pages discovered on this domain.
    pub url_depth_mean: f32,
    /// 1.0 if a `/team` or `/about` page was found.
    pub has_team_page: f32,
    /// 1.0 if a `/careers` or `/jobs` page was found.
    pub has_careers_page: f32,
}

impl DomainContext {
    /// Convert to a fixed-size `Array1<f32>` for network input.
    pub fn to_array(&self) -> Array1<f32> {
        Array1::from_vec(vec![
            self.pages_fetched,
            self.contacts_per_page,
            self.emails_per_page,
            self.avg_content_length,
            self.time_since_last,
            self.total_pulls,
            self.novelty_ratio,
            self.reward_mean,
            self.reward_variance,
            self.tld_com,
            self.tld_io,
            self.tld_ai,
            self.tld_other,
            self.url_depth_mean,
            self.has_team_page,
            self.has_careers_page,
        ])
    }
}

pub const CONTEXT_DIM: usize = 16;

// ── MLP ───────────────────────────────────────────────────────────────────────

/// 3-layer MLP: input → hidden1 → hidden2 → scalar output.
///
/// Weight matrices are stored as `(in_dim, out_dim)` — row = input neuron,
/// column = output neuron. Forward pass: `h = relu(x @ W + b)`.
pub struct MlpNetwork {
    /// Shape: (CONTEXT_DIM, hidden)
    w1: Array2<f32>,
    b1: Array1<f32>,
    /// Shape: (hidden, hidden)
    w2: Array2<f32>,
    b2: Array1<f32>,
    /// Shape: (hidden, 1)
    w3: Array2<f32>,
    b3: Array1<f32>,
}

impl MlpNetwork {
    /// Xavier (Glorot) uniform initialisation.
    ///
    /// Weights are drawn from U(-limit, +limit) where
    /// `limit = sqrt(6 / (fan_in + fan_out))`, then Box-Muller-corrected to a
    /// truncated normal so that variance stays near `2 / (fan_in + fan_out)`.
    /// Biases initialised to zero.
    pub fn new(input_dim: usize, hidden: usize, rng: &mut Xorshift64) -> Self {
        let w1 = xavier_matrix(input_dim, hidden, rng);
        let b1 = Array1::zeros(hidden);
        let w2 = xavier_matrix(hidden, hidden, rng);
        let b2 = Array1::zeros(hidden);
        let w3 = xavier_matrix(hidden, 1, rng);
        let b3 = Array1::zeros(1);

        Self { w1, b1, w2, b2, w3, b3 }
    }

    /// Forward pass — no dropout. Returns the scalar output.
    pub fn forward(&self, x: &Array1<f32>) -> f32 {
        let h1 = relu(&(self.w1.t().dot(x) + &self.b1));
        let h2 = relu(&(self.w2.t().dot(&h1) + &self.b2));
        let out = self.w3.t().dot(&h2) + &self.b3;
        out[0]
    }

    /// Forward pass with Bernoulli dropout on both hidden layers.
    ///
    /// Each hidden activation is zeroed with probability `dropout_rate` and the
    /// surviving activations are scaled by `1 / (1 - dropout_rate)` (inverted
    /// dropout) so that the expected value matches the no-dropout forward pass.
    pub fn forward_dropout(
        &self,
        x: &Array1<f32>,
        dropout_rate: f32,
        rng: &mut Xorshift64,
    ) -> f32 {
        let scale = if dropout_rate < 1.0 {
            1.0 / (1.0 - dropout_rate)
        } else {
            0.0
        };

        let pre_h1 = relu(&(self.w1.t().dot(x) + &self.b1));
        let h1 = apply_dropout(pre_h1, dropout_rate, scale, rng);

        let pre_h2 = relu(&(self.w2.t().dot(&h1) + &self.b2));
        let h2 = apply_dropout(pre_h2, dropout_rate, scale, rng);

        let out = self.w3.t().dot(&h2) + &self.b3;
        out[0]
    }

    /// Compute pre-activations and activations needed for backprop.
    ///
    /// Returns `(h1, h2, output)` — the ReLU-activated hidden states and the
    /// raw scalar output (no activation on the last layer).
    fn forward_with_cache(
        &self,
        x: &Array1<f32>,
    ) -> (Array1<f32>, Array1<f32>, f32) {
        let h1 = relu(&(self.w1.t().dot(x) + &self.b1));
        let h2 = relu(&(self.w2.t().dot(&h1) + &self.b2));
        let out = self.w3.t().dot(&h2) + &self.b3;
        (h1, h2, out[0])
    }

    /// Accumulate gradients from a single (x, target) pair into the provided
    /// gradient accumulators.
    ///
    /// Uses MSE loss: L = (ŷ - y)².  ∂L/∂ŷ = 2(ŷ - y).
    fn accumulate_gradients(
        &self,
        x: &Array1<f32>,
        target: f32,
        gw1: &mut Array2<f32>,
        gb1: &mut Array1<f32>,
        gw2: &mut Array2<f32>,
        gb2: &mut Array1<f32>,
        gw3: &mut Array2<f32>,
        gb3: &mut Array1<f32>,
    ) {
        let (h1, h2, pred) = self.forward_with_cache(x);

        // ── Layer 3 ────────────────────────────────────────────────────────
        // output = w3^T h2 + b3  (shape: scalar)
        // dL/d_pred = 2*(pred - target)
        let d_out = 2.0 * (pred - target);

        // ∂L/∂w3: outer product (h2, d_out)  →  shape (hidden, 1)
        let d_w3 = h2.view().insert_axis(Axis(1)).to_owned()
            * Array2::from_elem((h2.len(), 1), d_out);
        *gw3 = &*gw3 + &d_w3;
        gb3[0] += d_out;

        // ∂L/∂h2 = w3 * d_out  →  shape (hidden,)
        let d_h2: Array1<f32> = self.w3.column(0).to_owned() * d_out;

        // ── Layer 2 ────────────────────────────────────────────────────────
        // pre_h2 = w2^T h1 + b2;  h2 = relu(pre_h2)
        // ∂L/∂pre_h2 = d_h2 * relu'(pre_h2)
        // relu'(x) = 1 if x > 0 else 0  → we recover sign from h2 > 0
        let pre_h2 = self.w2.t().dot(&h1) + &self.b2;
        let d_pre_h2: Array1<f32> = d_h2
            * pre_h2.mapv(|v| if v > 0.0 { 1.0_f32 } else { 0.0_f32 });

        // ∂L/∂w2: outer product (h1, d_pre_h2)  →  shape (hidden, hidden)
        let d_w2 = h1.view().insert_axis(Axis(1)).to_owned()
            * d_pre_h2.view().insert_axis(Axis(0)).to_owned();
        *gw2 = &*gw2 + &d_w2;
        *gb2 = &*gb2 + &d_pre_h2;

        // ∂L/∂h1 = w2 @ d_pre_h2  →  shape (hidden,)
        let d_h1: Array1<f32> = self.w2.dot(&d_pre_h2);

        // ── Layer 1 ────────────────────────────────────────────────────────
        // pre_h1 = w1^T x + b1;  h1 = relu(pre_h1)
        let pre_h1 = self.w1.t().dot(x) + &self.b1;
        let d_pre_h1: Array1<f32> = d_h1
            * pre_h1.mapv(|v| if v > 0.0 { 1.0_f32 } else { 0.0_f32 });

        // ∂L/∂w1: outer product (x, d_pre_h1)  →  shape (input_dim, hidden)
        let d_w1 = x.view().insert_axis(Axis(1)).to_owned()
            * d_pre_h1.view().insert_axis(Axis(0)).to_owned();
        *gw1 = &*gw1 + &d_w1;
        *gb1 = &*gb1 + &d_pre_h1;
    }

    /// Apply accumulated gradients (from a mini-batch) with SGD.
    ///
    /// Divides by `batch_size` to normalise the gradient, then subtracts
    /// `lr * grad`. No momentum or weight decay — keeps the implementation small.
    fn apply_gradients(
        &mut self,
        gw1: &Array2<f32>,
        gb1: &Array1<f32>,
        gw2: &Array2<f32>,
        gb2: &Array1<f32>,
        gw3: &Array2<f32>,
        gb3: &Array1<f32>,
        lr: f32,
        batch_size: f32,
    ) {
        let s = lr / batch_size;
        self.w1 = &self.w1 - &(gw1 * s);
        self.b1 = &self.b1 - &(gb1 * s);
        self.w2 = &self.w2 - &(gw2 * s);
        self.b2 = &self.b2 - &(gb2 * s);
        self.w3 = &self.w3 - &(gw3 * s);
        self.b3 = &self.b3 - &(gb3 * s);
    }
}

// ── Xavier initialisation ─────────────────────────────────────────────────────

/// Sample a weight matrix from truncated Xavier normal.
///
/// Standard deviation: `sqrt(2 / (fan_in + fan_out))`.
/// Values outside ±2σ are resampled once (soft truncation).
fn xavier_matrix(fan_in: usize, fan_out: usize, rng: &mut Xorshift64) -> Array2<f32> {
    let std = (2.0_f32 / (fan_in + fan_out) as f32).sqrt();
    let mut data = Vec::with_capacity(fan_in * fan_out);
    for _ in 0..(fan_in * fan_out) {
        let mut v = rng.next_normal_f32() * std;
        // One re-sample if outside ±2σ (soft truncation)
        if v.abs() > 2.0 * std {
            v = rng.next_normal_f32() * std;
        }
        data.push(v);
    }
    Array2::from_shape_vec((fan_in, fan_out), data)
        .expect("shape must match data length")
}

// ── Activation helpers ────────────────────────────────────────────────────────

#[inline]
fn relu(x: &Array1<f32>) -> Array1<f32> {
    x.mapv(|v| v.max(0.0))
}

/// Apply inverted Bernoulli dropout in-place (consume and return).
fn apply_dropout(
    mut h: Array1<f32>,
    rate: f32,
    scale: f32,
    rng: &mut Xorshift64,
) -> Array1<f32> {
    for v in h.iter_mut() {
        if rng.next_f32() < rate {
            *v = 0.0;
        } else {
            *v *= scale;
        }
    }
    h
}

// ── Experience buffer ─────────────────────────────────────────────────────────

/// Fixed-capacity ring buffer of `(context_vector, reward)` training pairs.
///
/// When full, new observations overwrite the oldest (FIFO). This provides
/// the experience replay typically used in online bandit / RL settings.
pub struct ExperienceBuffer {
    contexts: Vec<Array1<f32>>,
    rewards: Vec<f32>,
    capacity: usize,
    /// Write position (mod capacity).
    pos: usize,
    /// Whether the buffer has wrapped at least once.
    full: bool,
}

impl ExperienceBuffer {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "buffer capacity must be > 0");
        Self {
            contexts: Vec::with_capacity(capacity),
            rewards: Vec::with_capacity(capacity),
            capacity,
            pos: 0,
            full: false,
        }
    }

    /// Push a new observation; overwrites oldest entry when full.
    pub fn push(&mut self, context: Array1<f32>, reward: f32) {
        if self.contexts.len() < self.capacity {
            self.contexts.push(context);
            self.rewards.push(reward);
        } else {
            self.contexts[self.pos] = context;
            self.rewards[self.pos] = reward;
            self.full = true;
        }
        self.pos = (self.pos + 1) % self.capacity;
    }

    /// Number of stored observations.
    pub fn len(&self) -> usize {
        self.contexts.len()
    }

    pub fn is_empty(&self) -> bool {
        self.contexts.is_empty()
    }

    /// Whether the buffer has been filled and wrapped at least once.
    pub fn is_full(&self) -> bool {
        self.full
    }

    /// Randomly sample `batch_size` (index, context, reward) triples.
    ///
    /// Sampling is with replacement (simpler and sufficient for SGD here).
    fn sample_batch(
        &self,
        batch_size: usize,
        rng: &mut Xorshift64,
    ) -> Vec<(&Array1<f32>, f32)> {
        let n = self.len();
        (0..batch_size.min(n))
            .map(|_| {
                let idx = (rng.next_u64() as usize) % n;
                (&self.contexts[idx], self.rewards[idx])
            })
            .collect()
    }
}

// ── Configuration ─────────────────────────────────────────────────────────────

/// Hyperparameters for `NeuralUcb`.
#[derive(Debug, Clone)]
pub struct NeuralUcbConfig {
    /// Number of units in each hidden layer (default 64).
    pub hidden_dim: usize,
    /// Ring buffer capacity (default 1 000).
    pub buffer_capacity: usize,
    /// UCB exploration coefficient — scales the uncertainty term (default 1.0).
    pub exploration_coeff: f32,
    /// Number of MC dropout forward passes for uncertainty estimation (default 10).
    pub mc_samples: usize,
    /// Retrain the network every this many `record()` calls (default 50).
    pub retrain_interval: usize,
    /// SGD learning rate (default 1e-3).
    pub learning_rate: f32,
    /// Dropout probability applied during MC uncertainty estimation (default 0.1).
    pub dropout_rate: f32,
    /// Mini-batch size for each SGD step (default 32).
    pub batch_size: usize,
}

impl Default for NeuralUcbConfig {
    fn default() -> Self {
        Self {
            hidden_dim: 64,
            buffer_capacity: 1_000,
            exploration_coeff: 1.0,
            mc_samples: 10,
            retrain_interval: 50,
            learning_rate: 1e-3,
            dropout_rate: 0.1,
            batch_size: 32,
        }
    }
}

// ── NeuralUCB bandit ───────────────────────────────────────────────────────────

/// NeuralUCB contextual bandit for crawl-domain selection.
///
/// # Usage
///
/// ```rust
/// use neural_ucb::{NeuralUcb, NeuralUcbConfig, DomainContext};
///
/// let mut bandit = NeuralUcb::new(NeuralUcbConfig::default());
///
/// // Build candidate list each round
/// let candidates: Vec<(String, DomainContext)> = todo!();
///
/// if let Some(chosen) = bandit.select(&candidates) {
///     // crawl `chosen`
///     let reward = 0.7_f32; // from CrawlReward::composite()
///     let ctx = candidates.iter().find(|(d, _)| d == &chosen).unwrap().1.clone();
///     bandit.record(&ctx, reward);
/// }
/// ```
pub struct NeuralUcb {
    network: MlpNetwork,
    buffer: ExperienceBuffer,
    config: NeuralUcbConfig,
    observations_since_train: usize,
    rng: Xorshift64,
}

impl NeuralUcb {
    /// Create a new `NeuralUcb` instance with the given configuration.
    pub fn new(config: NeuralUcbConfig) -> Self {
        let mut rng = Xorshift64::new(0xDEAD_BEEF_CAFE_1337);
        let network = MlpNetwork::new(CONTEXT_DIM, config.hidden_dim, &mut rng);
        let buffer = ExperienceBuffer::new(config.buffer_capacity);
        Self {
            network,
            buffer,
            config,
            observations_since_train: 0,
            rng,
        }
    }

    /// Predict `(mean_reward, uncertainty)` for a single domain context.
    ///
    /// Mean and std deviation are computed over `mc_samples` dropout forward
    /// passes. When `mc_samples == 1` the std dev is 0.0 (pure exploitation).
    pub fn predict(&mut self, context: &DomainContext) -> (f32, f32) {
        let x = context.to_array();
        let n = self.config.mc_samples;
        let dr = self.config.dropout_rate;

        if n <= 1 {
            return (self.network.forward(&x), 0.0);
        }

        let mut samples = Vec::with_capacity(n);
        for _ in 0..n {
            samples.push(self.network.forward_dropout(&x, dr, &mut self.rng));
        }

        let mean = samples.iter().sum::<f32>() / n as f32;
        let variance = samples.iter().map(|&s| (s - mean).powi(2)).sum::<f32>() / n as f32;
        let std_dev = variance.sqrt();

        (mean, std_dev)
    }

    /// Select the best domain from a list of candidates.
    ///
    /// Scores each candidate as `μ + exploration_coeff * σ` and returns the
    /// domain string of the highest-scoring arm. Returns `None` if `candidates`
    /// is empty.
    pub fn select(&mut self, candidates: &[(String, DomainContext)]) -> Option<String> {
        if candidates.is_empty() {
            return None;
        }

        let coeff = self.config.exploration_coeff;
        let mut best_score = f32::NEG_INFINITY;
        let mut best_domain: Option<String> = None;

        for (domain, context) in candidates {
            let (mean, std_dev) = self.predict(context);
            let score = mean + coeff * std_dev;

            if score > best_score {
                best_score = score;
                best_domain = Some(domain.clone());
            }
        }

        best_domain
    }

    /// Record an observed reward for a context and trigger retraining if due.
    pub fn record(&mut self, context: &DomainContext, reward: f32) {
        self.buffer.push(context.to_array(), reward);
        self.observations_since_train += 1;

        if self.observations_since_train >= self.config.retrain_interval {
            self.retrain();
            self.observations_since_train = 0;
        }
    }

    /// Run a single mini-batch SGD epoch on the experience buffer.
    ///
    /// Skips training when the buffer holds fewer samples than one batch —
    /// avoids noisy updates on a nearly empty buffer.
    fn retrain(&mut self) {
        let batch_size = self.config.batch_size;
        if self.buffer.len() < batch_size {
            return;
        }

        let hidden = self.config.hidden_dim;

        // Zero-initialise gradient accumulators
        let mut gw1 = Array2::<f32>::zeros((CONTEXT_DIM, hidden));
        let mut gb1 = Array1::<f32>::zeros(hidden);
        let mut gw2 = Array2::<f32>::zeros((hidden, hidden));
        let mut gb2 = Array1::<f32>::zeros(hidden);
        let mut gw3 = Array2::<f32>::zeros((hidden, 1));
        let mut gb3 = Array1::<f32>::zeros(1);

        let batch = self.buffer.sample_batch(batch_size, &mut self.rng);
        let actual_batch_size = batch.len();

        for (x, reward) in batch {
            self.network.accumulate_gradients(
                x, reward,
                &mut gw1, &mut gb1,
                &mut gw2, &mut gb2,
                &mut gw3, &mut gb3,
            );
        }

        self.network.apply_gradients(
            &gw1, &gb1,
            &gw2, &gb2,
            &gw3, &gb3,
            self.config.learning_rate,
            actual_batch_size as f32,
        );
    }

    /// Access the underlying experience buffer (e.g. to inspect replay state).
    pub fn buffer(&self) -> &ExperienceBuffer {
        &self.buffer
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── helpers ──────────────────────────────────────────────────────────────

    fn zero_context() -> DomainContext {
        DomainContext {
            pages_fetched: 0.0,
            contacts_per_page: 0.0,
            emails_per_page: 0.0,
            avg_content_length: 0.0,
            time_since_last: 0.0,
            total_pulls: 0.0,
            novelty_ratio: 0.0,
            reward_mean: 0.0,
            reward_variance: 0.0,
            tld_com: 1.0,
            tld_io: 0.0,
            tld_ai: 0.0,
            tld_other: 0.0,
            url_depth_mean: 0.0,
            has_team_page: 0.0,
            has_careers_page: 0.0,
        }
    }

    fn good_context() -> DomainContext {
        DomainContext {
            pages_fetched: 0.8,
            contacts_per_page: 0.9,
            emails_per_page: 0.7,
            avg_content_length: 0.9,
            time_since_last: 0.1,
            total_pulls: 0.5,
            novelty_ratio: 0.8,
            reward_mean: 0.85,
            reward_variance: 0.05,
            tld_com: 1.0,
            tld_io: 0.0,
            tld_ai: 0.0,
            tld_other: 0.0,
            url_depth_mean: 0.2,
            has_team_page: 1.0,
            has_careers_page: 1.0,
        }
    }

    fn bad_context() -> DomainContext {
        DomainContext {
            pages_fetched: 0.1,
            contacts_per_page: 0.0,
            emails_per_page: 0.0,
            avg_content_length: 0.1,
            time_since_last: 0.9,
            total_pulls: 0.1,
            novelty_ratio: 0.1,
            reward_mean: 0.05,
            reward_variance: 0.01,
            tld_com: 0.0,
            tld_io: 0.0,
            tld_ai: 0.0,
            tld_other: 1.0,
            url_depth_mean: 0.8,
            has_team_page: 0.0,
            has_careers_page: 0.0,
        }
    }

    // ── Xorshift64 ────────────────────────────────────────────────────────────

    #[test]
    fn prng_produces_distinct_values() {
        let mut rng = Xorshift64::new(42);
        let a = rng.next_u64();
        let b = rng.next_u64();
        let c = rng.next_u64();
        assert_ne!(a, b);
        assert_ne!(b, c);
    }

    #[test]
    fn prng_f32_in_unit_interval() {
        let mut rng = Xorshift64::new(99);
        for _ in 0..1_000 {
            let v = rng.next_f32();
            assert!(v >= 0.0 && v < 1.0, "f32 out of [0,1): {v}");
        }
    }

    #[test]
    fn box_muller_is_approximately_normal() {
        let mut rng = Xorshift64::new(7);
        let samples: Vec<f32> = (0..10_000).map(|_| rng.next_normal_f32()).collect();
        let mean = samples.iter().sum::<f32>() / samples.len() as f32;
        let var = samples.iter().map(|&x| (x - mean).powi(2)).sum::<f32>()
            / samples.len() as f32;
        // Standard normal: mean ≈ 0, variance ≈ 1
        assert!(mean.abs() < 0.05, "mean too far from 0: {mean}");
        assert!((var - 1.0).abs() < 0.05, "variance too far from 1: {var}");
    }

    // ── Xavier initialisation ─────────────────────────────────────────────────

    #[test]
    fn xavier_weight_magnitudes_are_reasonable() {
        let mut rng = Xorshift64::new(1234);
        let w = xavier_matrix(64, 64, &mut rng);
        // Xavier std for (64, 64): sqrt(2 / 128) ≈ 0.125
        let expected_std = (2.0_f32 / 128.0).sqrt();
        let mean = w.iter().sum::<f32>() / w.len() as f32;
        let var = w.iter().map(|&v| (v - mean).powi(2)).sum::<f32>() / w.len() as f32;
        let std = var.sqrt();

        assert!(mean.abs() < 0.02, "weight mean too large: {mean}");
        // Std should be within 30% of theoretical
        assert!(
            (std - expected_std).abs() < 0.04,
            "weight std {std} too far from expected {expected_std}"
        );
    }

    #[test]
    fn xavier_matrix_shape_is_correct() {
        let mut rng = Xorshift64::new(55);
        let w = xavier_matrix(16, 64, &mut rng);
        assert_eq!(w.shape(), &[16, 64]);
    }

    // ── MLP forward pass ──────────────────────────────────────────────────────

    #[test]
    fn forward_pass_produces_scalar() {
        let mut rng = Xorshift64::new(42);
        let net = MlpNetwork::new(CONTEXT_DIM, 64, &mut rng);
        let x = zero_context().to_array();
        let out = net.forward(&x);
        // Output is a finite float
        assert!(out.is_finite(), "forward output is not finite: {out}");
    }

    #[test]
    fn forward_dropout_produces_scalar() {
        let mut rng_net = Xorshift64::new(11);
        let net = MlpNetwork::new(CONTEXT_DIM, 64, &mut rng_net);
        let x = good_context().to_array();
        let mut rng_do = Xorshift64::new(77);
        let out = net.forward_dropout(&x, 0.1, &mut rng_do);
        assert!(out.is_finite(), "dropout forward output is not finite: {out}");
    }

    #[test]
    fn context_to_array_has_correct_length() {
        let ctx = zero_context();
        let arr = ctx.to_array();
        assert_eq!(arr.len(), CONTEXT_DIM);
    }

    #[test]
    fn different_inputs_produce_different_outputs() {
        let mut rng = Xorshift64::new(8);
        let net = MlpNetwork::new(CONTEXT_DIM, 64, &mut rng);
        let x1 = good_context().to_array();
        let x2 = bad_context().to_array();
        let o1 = net.forward(&x1);
        let o2 = net.forward(&x2);
        // With random weights the outputs almost certainly differ
        assert_ne!(o1, o2, "identical outputs for different inputs — suspicious");
    }

    // ── Training reduces loss ─────────────────────────────────────────────────

    #[test]
    fn training_reduces_loss_on_small_dataset() {
        let config = NeuralUcbConfig {
            hidden_dim: 64,
            buffer_capacity: 200,
            retrain_interval: 999, // disable automatic retraining
            batch_size: 20,
            learning_rate: 1e-2,  // higher lr to see a quick drop
            ..Default::default()
        };
        let mut bandit = NeuralUcb::new(config);

        // Insert 50 observations: good context → reward 0.9
        let ctx = good_context();
        for _ in 0..50 {
            bandit.buffer.push(ctx.to_array(), 0.9);
        }

        // Measure loss before training
        let loss_before = mean_squared_loss(&bandit.network, &bandit.buffer);

        // Run several SGD steps
        for _ in 0..20 {
            bandit.retrain();
        }

        let loss_after = mean_squared_loss(&bandit.network, &bandit.buffer);
        assert!(
            loss_after < loss_before,
            "training should reduce loss: before={loss_before:.4} after={loss_after:.4}"
        );
    }

    fn mean_squared_loss(net: &MlpNetwork, buf: &ExperienceBuffer) -> f32 {
        if buf.is_empty() {
            return 0.0;
        }
        let total: f32 = buf
            .contexts
            .iter()
            .zip(buf.rewards.iter())
            .map(|(x, &y)| {
                let pred = net.forward(x);
                (pred - y).powi(2)
            })
            .sum();
        total / buf.len() as f32
    }

    // ── UCB selection ─────────────────────────────────────────────────────────

    #[test]
    fn select_returns_none_for_empty_candidates() {
        let mut bandit = NeuralUcb::new(NeuralUcbConfig::default());
        assert!(bandit.select(&[]).is_none());
    }

    #[test]
    fn select_returns_single_candidate() {
        let mut bandit = NeuralUcb::new(NeuralUcbConfig::default());
        let candidates = vec![("only.com".to_string(), zero_context())];
        assert_eq!(bandit.select(&candidates).as_deref(), Some("only.com"));
    }

    #[test]
    fn select_prefers_high_reward_domain_after_training() {
        // Train the network to associate good_context → high reward
        // and bad_context → low reward, then check selection.
        let config = NeuralUcbConfig {
            exploration_coeff: 0.0, // pure exploitation — no uncertainty bonus
            retrain_interval: 50,
            batch_size: 16,
            learning_rate: 5e-3,
            ..Default::default()
        };
        let mut bandit = NeuralUcb::new(config);

        // Fill buffer with labelled examples
        let good = good_context();
        let bad = bad_context();
        for _ in 0..50 {
            bandit.buffer.push(good.to_array(), 0.9);
            bandit.buffer.push(bad.to_array(), 0.05);
        }

        // Train for many epochs
        for _ in 0..100 {
            bandit.retrain();
        }

        let candidates = vec![
            ("bad.com".to_string(), bad.clone()),
            ("good.com".to_string(), good.clone()),
        ];

        let chosen = bandit.select(&candidates).expect("selection must return a domain");
        assert_eq!(
            chosen, "good.com",
            "after training, bandit should prefer high-reward domain"
        );
    }

    // ── Experience buffer ─────────────────────────────────────────────────────

    #[test]
    fn buffer_wraps_correctly_at_capacity() {
        let mut buf = ExperienceBuffer::new(3);

        let x = zero_context().to_array();
        buf.push(x.clone(), 0.1);
        buf.push(x.clone(), 0.2);
        buf.push(x.clone(), 0.3);

        assert_eq!(buf.len(), 3);
        assert!(!buf.is_full()); // full flag set on *next* write

        // 4th push overwrites slot 0
        buf.push(x.clone(), 0.4);
        assert_eq!(buf.len(), 3);
        assert!(buf.is_full());

        // Rewards stored at positions 0,1,2 should be 0.4, 0.2, 0.3
        assert!((buf.rewards[0] - 0.4).abs() < f32::EPSILON);
        assert!((buf.rewards[1] - 0.2).abs() < f32::EPSILON);
        assert!((buf.rewards[2] - 0.3).abs() < f32::EPSILON);
    }

    #[test]
    fn buffer_len_grows_up_to_capacity() {
        let mut buf = ExperienceBuffer::new(5);
        let x = zero_context().to_array();
        for i in 0..8 {
            buf.push(x.clone(), i as f32 * 0.1);
            assert!(buf.len() <= 5, "buffer length exceeded capacity at i={i}");
        }
        assert_eq!(buf.len(), 5);
    }

    #[test]
    fn buffer_sample_batch_returns_correct_count() {
        let mut buf = ExperienceBuffer::new(100);
        let x = zero_context().to_array();
        for i in 0..50 {
            buf.push(x.clone(), i as f32 * 0.01);
        }
        let mut rng = Xorshift64::new(42);
        let batch = buf.sample_batch(16, &mut rng);
        assert_eq!(batch.len(), 16);
    }

    // ── record triggers retraining ────────────────────────────────────────────

    #[test]
    fn record_accumulates_observations() {
        let config = NeuralUcbConfig {
            retrain_interval: 100,
            buffer_capacity: 200,
            ..Default::default()
        };
        let mut bandit = NeuralUcb::new(config);
        let ctx = good_context();

        for _ in 0..30 {
            bandit.record(&ctx, 0.7);
        }

        assert_eq!(bandit.buffer.len(), 30);
        assert_eq!(bandit.observations_since_train, 30);
    }

    #[test]
    fn record_resets_counter_after_retrain_interval() {
        let config = NeuralUcbConfig {
            retrain_interval: 10,
            batch_size: 5,
            buffer_capacity: 100,
            ..Default::default()
        };
        let mut bandit = NeuralUcb::new(config);
        let ctx = good_context();

        // Fill buffer first so retrain has data
        for _ in 0..15 {
            bandit.buffer.push(ctx.to_array(), 0.8);
        }

        for _ in 0..10 {
            bandit.record(&ctx, 0.8);
        }

        // After exactly retrain_interval records the counter resets to 0
        assert_eq!(bandit.observations_since_train, 0);
    }

    // ── MC uncertainty ────────────────────────────────────────────────────────

    #[test]
    fn mc_uncertainty_is_non_negative() {
        let config = NeuralUcbConfig {
            mc_samples: 20,
            dropout_rate: 0.3,
            ..Default::default()
        };
        let mut bandit = NeuralUcb::new(config);
        let (_mean, std_dev) = bandit.predict(&good_context());
        assert!(std_dev >= 0.0, "std dev must be non-negative: {std_dev}");
    }

    #[test]
    fn mc_uncertainty_is_zero_when_mc_samples_is_one() {
        let config = NeuralUcbConfig {
            mc_samples: 1,
            ..Default::default()
        };
        let mut bandit = NeuralUcb::new(config);
        let (_mean, std_dev) = bandit.predict(&good_context());
        assert_eq!(std_dev, 0.0);
    }
}
