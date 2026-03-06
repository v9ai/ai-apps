use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// Task type classification for a genesis cycle.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum TaskType {
    Feature,
    Bugfix,
    Refactor,
    Test,
    Docs,
}

impl TaskType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Feature => "feature",
            Self::Bugfix => "bugfix",
            Self::Refactor => "refactor",
            Self::Test => "test",
            Self::Docs => "docs",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "feature" => Self::Feature,
            "bugfix" => Self::Bugfix,
            "refactor" => Self::Refactor,
            "test" => Self::Test,
            "docs" => Self::Docs,
            _ => Self::Feature,
        }
    }
}

/// Top-level configuration for genesis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenesisConfig {
    /// Directory for all genesis state (defaults to ~/.genesis/).
    pub state_dir: String,
    /// Maximum tokens per SDD pipeline cycle.
    pub cycle_token_budget: u32,
    /// Daily aggregate token budget.
    pub daily_token_budget: u64,
    /// Minimum fitness score to extract patterns from a cycle.
    pub pattern_threshold: f64,
    /// Number of cycles between prompt mutations.
    pub mutation_interval: u32,
    /// Minimum trials before pruning a variant.
    pub min_trials_for_prune: u32,
    /// Minimum score to keep a variant alive.
    pub prune_threshold: f64,
    /// Rolling window size for baseline computation.
    pub baseline_window: usize,
    /// Failure rate threshold for circuit breaker.
    pub breaker_failure_rate: f64,
    /// SDD verify retry count.
    pub verify_retries: u32,
    /// Fitness dimension weights.
    pub weights: FitnessWeights,
}

impl Default for GenesisConfig {
    fn default() -> Self {
        Self {
            state_dir: dirs_state_dir(),
            cycle_token_budget: 100_000,
            daily_token_budget: 500_000,
            pattern_threshold: 0.7,
            mutation_interval: 20,
            min_trials_for_prune: 10,
            prune_threshold: 0.4,
            baseline_window: 50,
            breaker_failure_rate: 0.30,
            verify_retries: 2,
            weights: FitnessWeights::default(),
        }
    }
}

fn dirs_state_dir() -> String {
    dirs::home_dir()
        .map(|h| h.join(".genesis").to_string_lossy().into_owned())
        .unwrap_or_else(|| ".genesis".into())
}

/// Weights for the composite fitness function.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FitnessWeights {
    pub compiles: f64,
    pub tests_pass: f64,
    pub lint_clean: f64,
    pub complexity: f64,
    pub spec_adherence: f64,
    pub pattern_match: f64,
}

impl Default for FitnessWeights {
    fn default() -> Self {
        Self {
            compiles: 0.25,
            tests_pass: 0.25,
            lint_clean: 0.10,
            complexity: 0.10,
            spec_adherence: 0.20,
            pattern_match: 0.10,
        }
    }
}

impl FitnessWeights {
    /// Return weights as a vec of (name, weight) for iteration.
    pub fn as_vec(&self) -> Vec<(&'static str, f64)> {
        vec![
            ("compiles", self.compiles),
            ("tests_pass", self.tests_pass),
            ("lint_clean", self.lint_clean),
            ("complexity", self.complexity),
            ("spec_adherence", self.spec_adherence),
            ("pattern_match", self.pattern_match),
        ]
    }

    /// EMA update: w(t+1) = alpha * observed + (1 - alpha) * w(t).
    pub fn ema_update(&mut self, dimension: &str, observed: f64, alpha: f64) {
        let w = match dimension {
            "compiles" => &mut self.compiles,
            "tests_pass" => &mut self.tests_pass,
            "lint_clean" => &mut self.lint_clean,
            "complexity" => &mut self.complexity,
            "spec_adherence" => &mut self.spec_adherence,
            "pattern_match" => &mut self.pattern_match,
            _ => return,
        };
        *w = alpha * observed + (1.0 - alpha) * *w;
    }
}

/// Report from the fitness evaluator.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FitnessReport {
    /// Composite score in [0.0, 1.0].
    pub score: f64,
    /// Per-dimension scores.
    pub dimensions: HashMap<String, f64>,
    /// Whether compilation succeeded (hard gate).
    pub compiles: bool,
    /// Number of tests passed / total.
    pub tests_passed: u32,
    pub tests_total: u32,
    /// Lint warning count.
    pub lint_warnings: u32,
    /// Mean cyclomatic complexity.
    pub mean_complexity: f64,
    /// SDD DoD pass/fail.
    pub spec_adherence: bool,
    /// Pattern match score from KB.
    pub pattern_score: f64,
}

impl FitnessReport {
    /// Returns true if the cycle is considered successful (score >= threshold).
    pub fn is_success(&self, threshold: f64) -> bool {
        self.compiles && self.score >= threshold
    }
}

/// A prompt variant for a specific SDD phase.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptVariant {
    pub id: String,
    pub phase: String,
    pub prompt: String,
    pub model: String,
    /// Successful outcomes (score >= 0.5).
    pub successes: u32,
    /// Total trials.
    pub trials: u32,
    /// Running mean score.
    pub mean_score: f64,
    /// Whether this is the golden (best-ever) variant.
    pub golden: bool,
    /// Creation timestamp.
    pub created_at: String,
}

impl PromptVariant {
    pub fn new(phase: &str, prompt: String, model: &str) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            phase: phase.into(),
            prompt,
            model: model.into(),
            successes: 0,
            trials: 0,
            mean_score: 0.0,
            golden: false,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// Update variant stats after a trial.
    pub fn record(&mut self, score: f64) {
        self.trials += 1;
        if score >= 0.5 {
            self.successes += 1;
        }
        // Running mean
        self.mean_score = self.mean_score + (score - self.mean_score) / self.trials as f64;
    }

    /// Failures count.
    pub fn failures(&self) -> u32 {
        self.trials.saturating_sub(self.successes)
    }
}

/// Result of a single improvement cycle.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CycleResult {
    pub cycle_id: String,
    pub target: String,
    pub task_type: TaskType,
    pub fitness: FitnessReport,
    pub variants_used: HashMap<String, String>,
    pub tokens_used: u32,
    pub duration_ms: u64,
    pub timestamp: String,
    /// Files that were modified.
    pub files_modified: Vec<String>,
    /// Whether a rollback occurred.
    pub rolled_back: bool,
}

/// Model performance record per phase.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModelStats {
    pub reasoner_trials: u32,
    pub reasoner_mean: f64,
    pub chat_trials: u32,
    pub chat_mean: f64,
}

impl ModelStats {
    /// Record an observation for a model.
    pub fn record(&mut self, model: &str, score: f64) {
        match model {
            "deepseek-reasoner" => {
                self.reasoner_trials += 1;
                self.reasoner_mean += (score - self.reasoner_mean) / self.reasoner_trials as f64;
            }
            "deepseek-chat" => {
                self.chat_trials += 1;
                self.chat_mean += (score - self.chat_mean) / self.chat_trials as f64;
            }
            _ => {}
        }
    }

    /// Pick the best model if we have enough observations.
    pub fn best_model(&self, min_obs: u32) -> Option<&'static str> {
        if self.reasoner_trials >= min_obs && self.chat_trials >= min_obs {
            if self.reasoner_mean >= self.chat_mean {
                Some("deepseek-reasoner")
            } else {
                Some("deepseek-chat")
            }
        } else {
            None
        }
    }
}

/// Circuit breaker state.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BreakerState {
    Closed,
    Open,
    HalfOpen,
}

impl Default for BreakerState {
    fn default() -> Self {
        Self::Closed
    }
}

/// Baseline statistics for regression detection.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BaselineStats {
    pub scores: Vec<f64>,
    pub mean: f64,
    pub stddev: f64,
}

impl BaselineStats {
    /// Recompute mean and stddev from scores.
    pub fn recompute(&mut self) {
        let n = self.scores.len() as f64;
        if n == 0.0 {
            self.mean = 0.0;
            self.stddev = 0.0;
            return;
        }
        self.mean = self.scores.iter().sum::<f64>() / n;
        let variance = self.scores.iter().map(|s| (s - self.mean).powi(2)).sum::<f64>() / n;
        self.stddev = variance.sqrt();
    }

    /// Push a new score and trim to window size.
    pub fn push(&mut self, score: f64, window: usize) {
        self.scores.push(score);
        if self.scores.len() > window {
            self.scores.remove(0);
        }
        self.recompute();
    }
}
