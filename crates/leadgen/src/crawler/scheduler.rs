//! Domain scheduling via multi-armed bandits adapted from recent research.
//!
//! Implements two complementary strategies from the literature:
//!
//! **SW-UCB + D-UCB hybrid** (Liu, 2024 — "Comparative analysis of Sliding Window
//! UCB and Discount Factor UCB in non-stationary environments"):
//! Combines sliding-window memory with exponential decay weighting. The D-UCB
//! discount factor γ gives recent observations more influence, while the window
//! bounds memory cost to O(Kτ). Achieves O(√(τT)) regret in piecewise-stationary
//! environments — 30-50% lower cumulative regret than vanilla UCB1.
//!
//! **Composite reward signal** (all 4 research agents agree):
//! Instead of raw harvest_rate = contacts/pages, the reward is a weighted
//! combination of contact yield, email discovery rate, content density, and
//! novelty. This aligns with the "multi-objective" recommendation.
//!
//! **Thompson Sampling** option (Cazzaro et al., 2025 — "Less is More: Boosting
//! Coverage of Web Crawling through Adversarial Multi-Armed Bandit"):
//! Beta-distributed Thompson sampling as alternative to UCB for domains with
//! sparse binary rewards (found_contacts or not). O(√T) adversarial regret.

use std::collections::HashMap;
use std::time::Instant;

// ── Composite Reward ────────────────────────────────────────────────────────

/// Multi-signal crawl outcome fed into the bandit.
///
/// Research consensus: single-scalar harvest_rate is suboptimal. A composite
/// reward weighting contacts, emails, content density, and novelty yields
/// better domain prioritization.
#[derive(Debug, Clone)]
pub struct CrawlReward {
    pub pages_fetched: u32,
    pub contacts_found: u32,
    pub emails_found: u32,
    /// Average body text length across fetched pages (content density signal).
    pub avg_content_length: f64,
    /// Fraction of pages that were previously unseen (novelty signal).
    pub novelty_ratio: f64,
}

impl CrawlReward {
    /// Compute composite reward ∈ [0, 1] using research-recommended weights.
    ///
    /// Weights derived from synthesis priority matrix:
    /// - Contact yield (0.40): primary goal — finding decision-makers
    /// - Email discovery (0.25): high-value for outreach pipeline
    /// - Content density (0.20): pages with rich text yield better extractions
    /// - Novelty (0.15): encourages exploring new content vs re-crawling
    pub fn composite(&self) -> f64 {
        if self.pages_fetched == 0 {
            return 0.0;
        }
        let p = self.pages_fetched as f64;

        let contact_yield = (self.contacts_found as f64 / p).min(1.0);
        let email_yield = (self.emails_found as f64 / p).min(1.0);
        // Normalize content length: 1000 chars = 0.5, 3000+ chars = 1.0
        let content_density = (self.avg_content_length / 3000.0).min(1.0);
        let novelty = self.novelty_ratio.min(1.0);

        0.40 * contact_yield + 0.25 * email_yield + 0.20 * content_density + 0.15 * novelty
    }
}

// ── Domain Arm ──────────────────────────────────────────────────────────────

/// Per-domain statistics with exponential decay weighting (D-UCB).
#[derive(Debug, Clone)]
pub struct DomainArm {
    /// Recent observations: (reward, timestamp).
    window: Vec<(f64, Instant)>,
    /// Total pulls (all time).
    total_pulls: u64,
    /// Total reward (all time).
    total_reward: f64,
    /// When this domain was last crawled.
    pub last_crawled: Option<Instant>,
    /// Minimum delay between crawls (politeness).
    pub min_delay: std::time::Duration,
    /// Thompson sampling: successes (Beta distribution α).
    ts_alpha: f64,
    /// Thompson sampling: failures (Beta distribution β).
    ts_beta: f64,
}

impl DomainArm {
    fn new(min_delay: std::time::Duration) -> Self {
        Self {
            window: Vec::new(),
            total_pulls: 0,
            total_reward: 0.0,
            last_crawled: None,
            min_delay,
            ts_alpha: 1.0, // uninformative prior
            ts_beta: 1.0,
        }
    }

    fn window_pulls(&self) -> usize {
        self.window.len()
    }

    /// Discounted mean reward using exponential decay (D-UCB, Liu 2024).
    ///
    /// `γ` ∈ (0, 1): discount factor. Recent observations weighted more.
    /// D-UCB formula: x̄_γ = Σ γ^(t-s) r_s / Σ γ^(t-s)
    fn discounted_mean(&self, gamma: f64) -> f64 {
        if self.window.is_empty() {
            return 0.0;
        }
        let now = Instant::now();
        let mut weighted_sum = 0.0;
        let mut weight_sum = 0.0;

        for (reward, timestamp) in &self.window {
            // Use seconds elapsed as the time step
            let age = now.duration_since(*timestamp).as_secs_f64();
            let weight = gamma.powf(age);
            weighted_sum += weight * reward;
            weight_sum += weight;
        }

        if weight_sum > 0.0 {
            weighted_sum / weight_sum
        } else {
            0.0
        }
    }

    /// Simple sliding-window mean (SW-UCB).
    fn window_mean(&self) -> f64 {
        let n = self.window_pulls();
        if n == 0 {
            return 0.0;
        }
        self.window.iter().map(|(r, _)| r).sum::<f64>() / n as f64
    }

    /// Discounted number of pulls (effective sample size under D-UCB).
    fn discounted_pulls(&self, gamma: f64) -> f64 {
        let now = Instant::now();
        self.window
            .iter()
            .map(|(_, ts)| gamma.powf(now.duration_since(*ts).as_secs_f64()))
            .sum()
    }

    fn is_available(&self) -> bool {
        match self.last_crawled {
            Some(t) => t.elapsed() >= self.min_delay,
            None => true,
        }
    }
}

// ── Exploration Strategy ────────────────────────────────────────────────────

/// Which exploration strategy to use for domain selection.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ExplorationStrategy {
    /// SW-UCB + D-UCB hybrid (Liu, 2024). Best for continuous reward signals.
    DiscountedUcb,
    /// Classic sliding-window UCB1. Simpler, good baseline.
    SlidingWindowUcb,
    /// Thompson Sampling with Beta prior (Cazzaro et al., 2025).
    /// Best for sparse binary rewards (found contacts or not).
    ThompsonSampling,
}

// ── Scheduler Config ────────────────────────────────────────────────────────

/// Configuration for the domain scheduler.
#[derive(Debug, Clone)]
pub struct SchedulerConfig {
    /// Sliding window size (number of recent observations to keep).
    pub window_size: usize,
    /// UCB exploration parameter. Higher = more exploration.
    /// Classic UCB1: √2 ≈ 1.414. Research suggests 0.5-2.0 range.
    pub exploration_c: f64,
    /// D-UCB discount factor γ ∈ (0, 1). Higher = slower forgetting.
    /// Liu 2024 recommends 0.9-0.99 for web crawling time scales.
    pub discount_gamma: f64,
    /// Default politeness delay per domain.
    pub default_delay: std::time::Duration,
    /// Bonus for domains never crawled (encourages initial exploration).
    pub unseen_bonus: f64,
    /// Which exploration strategy to use.
    pub strategy: ExplorationStrategy,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            window_size: 20,
            exploration_c: 1.414,
            discount_gamma: 0.95,
            default_delay: std::time::Duration::from_secs(2),
            unseen_bonus: 10.0,
            strategy: ExplorationStrategy::DiscountedUcb,
        }
    }
}

// ── Domain Scheduler ────────────────────────────────────────────────────────

/// Multi-armed bandit domain scheduler with research-backed algorithms.
///
/// Supports three exploration strategies:
/// - **D-UCB** (default): Discounted UCB with exponential decay (Liu 2024)
/// - **SW-UCB**: Classic sliding-window UCB1
/// - **Thompson Sampling**: Beta-distributed sampling (Cazzaro et al. 2025)
pub struct DomainScheduler {
    config: SchedulerConfig,
    arms: HashMap<String, DomainArm>,
    total_window_pulls: u64,
    /// Seed for Thompson sampling PRNG (simple xorshift64).
    rng_state: u64,
}

impl DomainScheduler {
    pub fn new(config: SchedulerConfig) -> Self {
        Self {
            config,
            arms: HashMap::new(),
            total_window_pulls: 0,
            rng_state: 0x5DEECE66D, // arbitrary seed
        }
    }

    /// Register a domain for scheduling.
    pub fn add_domain(&mut self, domain: &str) {
        self.arms
            .entry(domain.to_string())
            .or_insert_with(|| DomainArm::new(self.config.default_delay));
    }

    /// Register multiple domains.
    pub fn add_domains(&mut self, domains: &[String]) {
        for d in domains {
            self.add_domain(d);
        }
    }

    /// Record a crawl result using the composite reward signal.
    pub fn record_composite(&mut self, domain: &str, reward: &CrawlReward) {
        self.record(domain, reward.composite());
    }

    /// Record a simple scalar reward (backward-compatible).
    pub fn record(&mut self, domain: &str, reward: f64) {
        let arm = self
            .arms
            .entry(domain.to_string())
            .or_insert_with(|| DomainArm::new(self.config.default_delay));

        arm.window.push((reward, Instant::now()));
        arm.total_pulls += 1;
        arm.total_reward += reward;
        arm.last_crawled = Some(Instant::now());
        self.total_window_pulls += 1;

        // Thompson sampling update: treat reward > 0.3 as "success"
        if reward > 0.3 {
            arm.ts_alpha += 1.0;
        } else {
            arm.ts_beta += 1.0;
        }

        // Trim window to configured size
        if arm.window.len() > self.config.window_size {
            let excess = arm.window.len() - self.config.window_size;
            arm.window.drain(..excess);
        }
    }

    /// Select the next domain to crawl.
    pub fn select_next(&mut self) -> Option<String> {
        match self.config.strategy {
            ExplorationStrategy::DiscountedUcb => self.select_ducb(),
            ExplorationStrategy::SlidingWindowUcb => self.select_sw_ucb(),
            ExplorationStrategy::ThompsonSampling => self.select_thompson(),
        }
    }

    /// D-UCB selection (Liu 2024).
    ///
    /// score = x̄_γ + c * √(ln(N_γ) / n_γ_i)
    ///
    /// Where x̄_γ is the discounted mean reward, N_γ is the total discounted
    /// pulls, and n_γ_i is the discounted pulls for arm i.
    fn select_ducb(&self) -> Option<String> {
        let gamma = self.config.discount_gamma;
        let total_discounted: f64 = self
            .arms
            .values()
            .map(|arm| arm.discounted_pulls(gamma))
            .sum::<f64>()
            .max(1.0);

        let mut best: Option<String> = None;
        let mut best_score = f64::NEG_INFINITY;

        for (domain, arm) in &self.arms {
            if !arm.is_available() {
                continue;
            }

            let score = if arm.window_pulls() == 0 {
                self.config.unseen_bonus
            } else {
                let mean = arm.discounted_mean(gamma);
                let n_i = arm.discounted_pulls(gamma).max(0.001);
                let exploration = self.config.exploration_c * (total_discounted.ln() / n_i).sqrt();
                mean + exploration
            };

            if score > best_score {
                best_score = score;
                best = Some(domain.clone());
            }
        }

        best
    }

    /// Classic SW-UCB1 selection.
    fn select_sw_ucb(&self) -> Option<String> {
        let total = self.total_window_pulls.max(1) as f64;
        let mut best: Option<String> = None;
        let mut best_score = f64::NEG_INFINITY;

        for (domain, arm) in &self.arms {
            if !arm.is_available() {
                continue;
            }

            let score = if arm.window_pulls() == 0 {
                self.config.unseen_bonus
            } else {
                let mean = arm.window_mean();
                let n = arm.window_pulls() as f64;
                mean + self.config.exploration_c * (total.ln() / n).sqrt()
            };

            if score > best_score {
                best_score = score;
                best = Some(domain.clone());
            }
        }

        best
    }

    /// Thompson Sampling with Beta(α, β) prior (Cazzaro et al. 2025).
    ///
    /// For each arm, sample from Beta(α_i, β_i) and pick the arm with
    /// highest sample. Uses a simple xorshift64 PRNG to generate Beta
    /// samples via the Jöhnk algorithm.
    fn select_thompson(&mut self) -> Option<String> {
        // Collect candidates first to avoid borrow conflicts with &mut self
        let candidates: Vec<(String, f64, f64)> = self
            .arms
            .iter()
            .filter(|(_, arm)| arm.is_available())
            .map(|(domain, arm)| (domain.clone(), arm.ts_alpha, arm.ts_beta))
            .collect();

        let mut best: Option<String> = None;
        let mut best_sample = f64::NEG_INFINITY;

        for (domain, alpha, beta) in candidates {
            let sample = self.sample_beta(alpha, beta);
            if sample > best_sample {
                best_sample = sample;
                best = Some(domain);
            }
        }

        best
    }

    /// Select the top `k` domains, ordered by current strategy's score.
    pub fn select_batch(&mut self, k: usize) -> Vec<String> {
        let gamma = self.config.discount_gamma;
        let total = self.total_window_pulls.max(1) as f64;
        let total_disc: f64 = self
            .arms
            .values()
            .map(|a| a.discounted_pulls(gamma))
            .sum::<f64>()
            .max(1.0);
        let strategy = self.config.strategy;
        let unseen_bonus = self.config.unseen_bonus;
        let exploration_c = self.config.exploration_c;

        // Collect candidates to avoid borrow conflicts with Thompson sampling
        let candidates: Vec<(String, usize, f64, f64, f64, f64)> = self
            .arms
            .iter()
            .filter(|(_, arm)| arm.is_available())
            .map(|(domain, arm)| {
                (
                    domain.clone(),
                    arm.window_pulls(),
                    arm.discounted_mean(gamma),
                    arm.discounted_pulls(gamma),
                    arm.window_mean(),
                    arm.ts_alpha,
                )
            })
            .collect();

        let ts_betas: Vec<f64> = self
            .arms
            .values()
            .filter(|arm| arm.is_available())
            .map(|arm| arm.ts_beta)
            .collect();

        let mut scored: Vec<(String, f64)> = candidates
            .into_iter()
            .zip(ts_betas)
            .map(|((domain, wp, d_mean, d_pulls, w_mean, ts_a), ts_b)| {
                let score = match strategy {
                    ExplorationStrategy::DiscountedUcb => {
                        if wp == 0 {
                            unseen_bonus
                        } else {
                            let n_i = d_pulls.max(0.001);
                            d_mean + exploration_c * (total_disc.ln() / n_i).sqrt()
                        }
                    }
                    ExplorationStrategy::SlidingWindowUcb => {
                        if wp == 0 {
                            unseen_bonus
                        } else {
                            let n = wp as f64;
                            w_mean + exploration_c * (total.ln() / n).sqrt()
                        }
                    }
                    ExplorationStrategy::ThompsonSampling => self.sample_beta(ts_a, ts_b),
                };
                (domain, score)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored.into_iter().take(k).map(|(d, _)| d).collect()
    }

    /// Get stats for a domain.
    pub fn stats(&self, domain: &str) -> Option<DomainStats> {
        self.arms.get(domain).map(|arm| DomainStats {
            domain: domain.to_string(),
            window_pulls: arm.window_pulls() as u64,
            window_mean_reward: arm.window_mean(),
            discounted_mean_reward: arm.discounted_mean(self.config.discount_gamma),
            total_pulls: arm.total_pulls,
            total_mean_reward: if arm.total_pulls > 0 {
                arm.total_reward / arm.total_pulls as f64
            } else {
                0.0
            },
            ts_alpha: arm.ts_alpha,
            ts_beta: arm.ts_beta,
            is_available: arm.is_available(),
        })
    }

    /// Get stats for all domains, sorted by discounted mean reward descending.
    pub fn all_stats(&self) -> Vec<DomainStats> {
        let mut stats: Vec<DomainStats> = self
            .arms
            .iter()
            .map(|(d, _)| self.stats(d).unwrap())
            .collect();
        stats.sort_by(|a, b| {
            b.discounted_mean_reward
                .partial_cmp(&a.discounted_mean_reward)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        stats
    }

    pub fn domain_count(&self) -> usize {
        self.arms.len()
    }

    // ── PRNG helpers for Thompson Sampling ──────────────────────────────────

    /// Xorshift64 PRNG — lightweight, no external deps.
    fn next_u64(&mut self) -> u64 {
        let mut x = self.rng_state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.rng_state = x;
        x
    }

    /// Uniform random in [0, 1).
    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    /// Sample from Gamma(α, 1) using Marsaglia & Tsang's method (α >= 1)
    /// or Ahrens & Dieter's method (α < 1).
    fn sample_gamma(&mut self, alpha: f64) -> f64 {
        if alpha < 1.0 {
            // Ahrens-Dieter: Gamma(α) = Gamma(α+1) * U^(1/α)
            let u = self.next_f64().max(1e-15);
            return self.sample_gamma(alpha + 1.0) * u.powf(1.0 / alpha);
        }

        // Marsaglia & Tsang
        let d = alpha - 1.0 / 3.0;
        let c = 1.0 / (9.0 * d).sqrt();
        loop {
            let x = self.sample_normal();
            let v = (1.0 + c * x).powi(3);
            if v <= 0.0 {
                continue;
            }
            let u = self.next_f64().max(1e-15);
            if u < 1.0 - 0.0331 * x.powi(4) || u.ln() < 0.5 * x * x + d * (1.0 - v + v.ln()) {
                return d * v;
            }
        }
    }

    /// Box-Muller transform for standard normal.
    fn sample_normal(&mut self) -> f64 {
        let u1 = self.next_f64().max(1e-15);
        let u2 = self.next_f64();
        (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
    }

    /// Sample from Beta(α, β) = Gamma(α) / (Gamma(α) + Gamma(β)).
    fn sample_beta(&mut self, alpha: f64, beta: f64) -> f64 {
        let x = self.sample_gamma(alpha);
        let y = self.sample_gamma(beta);
        if x + y > 0.0 {
            x / (x + y)
        } else {
            0.5
        }
    }
}

#[derive(Debug, Clone)]
pub struct DomainStats {
    pub domain: String,
    pub window_pulls: u64,
    pub window_mean_reward: f64,
    pub discounted_mean_reward: f64,
    pub total_pulls: u64,
    pub total_mean_reward: f64,
    pub ts_alpha: f64,
    pub ts_beta: f64,
    pub is_available: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn zero_delay() -> SchedulerConfig {
        SchedulerConfig {
            default_delay: std::time::Duration::ZERO,
            ..Default::default()
        }
    }

    #[test]
    fn unseen_domains_selected_first() {
        let mut s = DomainScheduler::new(zero_delay());
        s.add_domain("seen.com");
        s.add_domain("unseen.com");
        s.record("seen.com", 0.5);

        assert_eq!(s.select_next().as_deref(), Some("unseen.com"));
    }

    #[test]
    fn high_reward_domain_preferred_ducb() {
        let mut s = DomainScheduler::new(SchedulerConfig {
            exploration_c: 0.0, // pure exploitation
            ..zero_delay()
        });
        s.add_domain("good.com");
        s.add_domain("bad.com");

        for _ in 0..5 {
            s.record("good.com", 0.8);
            s.record("bad.com", 0.1);
        }

        assert_eq!(s.select_next().as_deref(), Some("good.com"));
    }

    #[test]
    fn sw_ucb_strategy_works() {
        let mut s = DomainScheduler::new(SchedulerConfig {
            strategy: ExplorationStrategy::SlidingWindowUcb,
            exploration_c: 0.0,
            ..zero_delay()
        });
        s.add_domain("a.com");
        s.add_domain("b.com");
        s.record("a.com", 0.9);
        s.record("b.com", 0.1);

        assert_eq!(s.select_next().as_deref(), Some("a.com"));
    }

    #[test]
    fn thompson_sampling_works() {
        let mut s = DomainScheduler::new(SchedulerConfig {
            strategy: ExplorationStrategy::ThompsonSampling,
            ..zero_delay()
        });
        s.add_domain("good.com");
        s.add_domain("bad.com");

        // Give "good" many successes, "bad" many failures
        for _ in 0..20 {
            s.record("good.com", 0.9);
            s.record("bad.com", 0.01);
        }

        // Over many samples, Thompson should usually prefer good.com
        let mut good_count = 0;
        for _ in 0..100 {
            if s.select_next().as_deref() == Some("good.com") {
                good_count += 1;
            }
        }
        assert!(
            good_count > 70,
            "Thompson sampling should prefer good.com: {good_count}/100"
        );
    }

    #[test]
    fn batch_returns_top_k() {
        let mut s = DomainScheduler::new(SchedulerConfig {
            exploration_c: 0.0,
            ..zero_delay()
        });
        s.add_domain("a.com");
        s.add_domain("b.com");
        s.add_domain("c.com");
        s.record("a.com", 0.9);
        s.record("b.com", 0.5);
        s.record("c.com", 0.1);

        let batch = s.select_batch(2);
        assert_eq!(batch.len(), 2);
        assert_eq!(batch[0], "a.com");
        assert_eq!(batch[1], "b.com");
    }

    #[test]
    fn window_adapts_to_changing_rewards() {
        let mut s = DomainScheduler::new(SchedulerConfig {
            window_size: 3,
            exploration_c: 0.0,
            ..zero_delay()
        });
        s.add_domain("volatile.com");
        s.add_domain("stable.com");

        for _ in 0..3 {
            s.record("volatile.com", 0.9);
            s.record("stable.com", 0.5);
        }
        assert_eq!(s.select_next().as_deref(), Some("volatile.com"));

        for _ in 0..3 {
            s.record("volatile.com", 0.1);
            s.record("stable.com", 0.5);
        }
        assert_eq!(s.select_next().as_deref(), Some("stable.com"));
    }

    #[test]
    fn composite_reward_weights_correctly() {
        let r = CrawlReward {
            pages_fetched: 10,
            contacts_found: 5,
            emails_found: 3,
            avg_content_length: 1500.0,
            novelty_ratio: 0.8,
        };
        let c = r.composite();
        // 0.40 * (5/10) + 0.25 * (3/10) + 0.20 * (1500/3000) + 0.15 * 0.8
        // = 0.20 + 0.075 + 0.10 + 0.12 = 0.495
        assert!((c - 0.495).abs() < 0.01, "composite = {c}");
    }

    #[test]
    fn composite_reward_zero_pages() {
        let r = CrawlReward {
            pages_fetched: 0,
            contacts_found: 0,
            emails_found: 0,
            avg_content_length: 0.0,
            novelty_ratio: 0.0,
        };
        assert_eq!(r.composite(), 0.0);
    }

    #[test]
    fn empty_scheduler_returns_none() {
        let mut s = DomainScheduler::new(SchedulerConfig::default());
        assert_eq!(s.select_next(), None);
    }

    #[test]
    fn stats_includes_discounted_mean() {
        let mut s = DomainScheduler::new(zero_delay());
        s.add_domain("test.com");
        s.record("test.com", 0.6);
        s.record("test.com", 0.4);

        let stats = s.stats("test.com").unwrap();
        assert_eq!(stats.total_pulls, 2);
        assert!((stats.window_mean_reward - 0.5).abs() < 0.001);
        // Discounted mean should be close to window mean for recent observations
        assert!(stats.discounted_mean_reward > 0.0);
    }

    #[test]
    fn record_composite_works() {
        let mut s = DomainScheduler::new(zero_delay());
        s.add_domain("test.com");
        s.record_composite(
            "test.com",
            &CrawlReward {
                pages_fetched: 10,
                contacts_found: 5,
                emails_found: 2,
                avg_content_length: 2000.0,
                novelty_ratio: 1.0,
            },
        );

        let stats = s.stats("test.com").unwrap();
        assert_eq!(stats.total_pulls, 1);
        assert!(stats.window_mean_reward > 0.3);
    }
}
