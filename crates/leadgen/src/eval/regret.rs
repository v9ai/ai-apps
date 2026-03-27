//! Cumulative regret tracking for bandit strategies.
//!
//! Records per-round rewards and computes cumulative regret against
//! the oracle (best single arm in hindsight). Used to compare
//! D-UCB, NeuralUCB, and M2-CMAB strategies on the same domain set.

/// A single round observation.
#[derive(Debug, Clone)]
pub struct Round {
    pub strategy: String,
    pub domain: String,
    pub reward: f64,
}

/// Tracks cumulative regret for one or more strategies.
pub struct RegretTracker {
    rounds: Vec<Round>,
}

impl RegretTracker {
    pub fn new() -> Self {
        Self { rounds: Vec::new() }
    }

    /// Record a round — the strategy chose `domain` and received `reward`.
    pub fn record(&mut self, strategy: &str, domain: &str, reward: f64) {
        self.rounds.push(Round {
            strategy: strategy.to_string(),
            domain: domain.to_string(),
            reward,
        });
    }

    /// Compute the oracle reward: best mean-reward arm in hindsight.
    pub fn oracle_per_round_reward(&self) -> f64 {
        let mut domain_rewards: std::collections::HashMap<&str, (f64, usize)> =
            std::collections::HashMap::new();
        for r in &self.rounds {
            let entry = domain_rewards.entry(&r.domain).or_insert((0.0, 0));
            entry.0 += r.reward;
            entry.1 += 1;
        }

        domain_rewards
            .values()
            .map(|(sum, count)| sum / *count as f64)
            .fold(f64::NEG_INFINITY, f64::max)
    }

    /// Compute cumulative regret for a specific strategy.
    ///
    /// Regret at round t = Σ_{i=1}^{t} (oracle_reward - actual_reward_i)
    pub fn cumulative_regret(&self, strategy: &str) -> Vec<f64> {
        let oracle = self.oracle_per_round_reward();
        let mut regret = Vec::new();
        let mut sum = 0.0;

        for r in self.rounds.iter().filter(|r| r.strategy == strategy) {
            sum += oracle - r.reward;
            regret.push(sum);
        }

        regret
    }

    /// Final cumulative regret for a strategy.
    pub fn total_regret(&self, strategy: &str) -> f64 {
        self.cumulative_regret(strategy).last().copied().unwrap_or(0.0)
    }

    /// Compare strategies: returns (strategy_name, total_regret) sorted ascending.
    pub fn compare_strategies(&self) -> Vec<(String, f64)> {
        let strategies: std::collections::HashSet<&str> =
            self.rounds.iter().map(|r| r.strategy.as_str()).collect();

        let mut results: Vec<(String, f64)> = strategies
            .into_iter()
            .map(|s| (s.to_string(), self.total_regret(s)))
            .collect();

        results.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        results
    }

    /// Average reward per round for a strategy.
    pub fn mean_reward(&self, strategy: &str) -> f64 {
        let (sum, count) = self
            .rounds
            .iter()
            .filter(|r| r.strategy == strategy)
            .fold((0.0, 0usize), |(s, c), r| (s + r.reward, c + 1));

        if count > 0 { sum / count as f64 } else { 0.0 }
    }

    pub fn round_count(&self) -> usize {
        self.rounds.len()
    }
}

impl Default for RegretTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn oracle_picks_best_arm() {
        let mut tracker = RegretTracker::new();
        // Arm A: mean 0.8, Arm B: mean 0.3
        for _ in 0..10 {
            tracker.record("ucb", "a.com", 0.8);
            tracker.record("ucb", "b.com", 0.3);
        }
        assert!((tracker.oracle_per_round_reward() - 0.8).abs() < 0.001);
    }

    #[test]
    fn perfect_strategy_zero_regret() {
        let mut tracker = RegretTracker::new();
        // Always pick the best arm (0.8)
        for _ in 0..10 {
            tracker.record("perfect", "a.com", 0.8);
        }
        // Also record b.com under a different strategy so oracle sees both
        for _ in 0..10 {
            tracker.record("random", "b.com", 0.3);
        }
        assert!((tracker.total_regret("perfect")).abs() < 0.001);
    }

    #[test]
    fn suboptimal_strategy_has_positive_regret() {
        let mut tracker = RegretTracker::new();
        for _ in 0..10 {
            tracker.record("bad", "b.com", 0.3);
        }
        for _ in 0..10 {
            tracker.record("good", "a.com", 0.8);
        }
        // Oracle = 0.8, bad gets 0.3 each round → regret = 10 * 0.5 = 5.0
        assert!((tracker.total_regret("bad") - 5.0).abs() < 0.001);
    }

    #[test]
    fn cumulative_regret_monotonically_increases() {
        let mut tracker = RegretTracker::new();
        for _ in 0..5 {
            tracker.record("sub", "b.com", 0.3);
            tracker.record("opt", "a.com", 0.8);
        }
        let regret = tracker.cumulative_regret("sub");
        for w in regret.windows(2) {
            assert!(w[1] >= w[0], "regret should be non-decreasing");
        }
    }

    #[test]
    fn compare_strategies_ranks_correctly() {
        let mut tracker = RegretTracker::new();
        for _ in 0..10 {
            tracker.record("good", "a.com", 0.8);
            tracker.record("bad", "b.com", 0.2);
        }
        let ranking = tracker.compare_strategies();
        assert_eq!(ranking[0].0, "good");
        assert_eq!(ranking[1].0, "bad");
    }

    #[test]
    fn empty_tracker() {
        let tracker = RegretTracker::new();
        assert_eq!(tracker.round_count(), 0);
        assert_eq!(tracker.total_regret("any"), 0.0);
    }
}
