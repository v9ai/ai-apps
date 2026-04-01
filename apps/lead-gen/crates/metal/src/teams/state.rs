//! Pipeline state persistence and phase detection.
//!
//! Replaces `pipeline-meta` SKILL.md coordinator agent.

use std::fmt;
use std::path::Path;

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::TeamContext;

// ── Phase detection ───────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Phase {
    /// Few enriched companies (< 50) — prioritize discovery + enrichment
    Building,
    /// Balanced across stages — run full cycle
    Flowing,
    /// Imbalance between stages — run only lagging stage
    Bottleneck,
    /// Verticals fully covered — expand or deepen
    Saturated,
    /// QA < 0.7 or bounce > 15% — halt outreach, run enrich+contacts+qa to recover
    Degraded,
}

impl fmt::Display for Phase {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Building => write!(f, "BUILDING"),
            Self::Flowing => write!(f, "FLOWING"),
            Self::Bottleneck => write!(f, "BOTTLENECK"),
            Self::Saturated => write!(f, "SATURATED"),
            Self::Degraded => write!(f, "DEGRADED"),
        }
    }
}

// ── Phase history (hysteresis) ────────────────────────────────

/// Phase transition history for hysteresis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhaseHistory {
    pub previous: Phase,
    pub consecutive_count: u8,
}

impl Default for PhaseHistory {
    fn default() -> Self {
        Self { previous: Phase::Building, consecutive_count: 0 }
    }
}

// ── Pipeline state ────────────────────────────────────────────

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PipelineState {
    pub cycle_count: u32,
    pub phase: Option<Phase>,
    pub counts: StageCounts,
    pub quality_score: f64,
    pub bounce_rate: f64,
    #[serde(default)]
    pub phase_history: Option<PhaseHistory>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct StageCounts {
    pub discovered: usize,
    pub enriched: usize,
    pub contacts_found: usize,
    pub outreach_drafted: usize,
    pub outreach_sent: usize,
}

impl PipelineState {
    pub fn load(data_dir: &Path) -> Self {
        let path = data_dir.join("reports/state.json");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, data_dir: &Path) -> Result<()> {
        let path = data_dir.join("reports/state.json");
        std::fs::create_dir_all(path.parent().unwrap())?;
        std::fs::write(&path, serde_json::to_string_pretty(self)?)?;
        Ok(())
    }

    pub fn detect_phase(&self) -> Phase {
        if self.quality_score > 0.0 && self.quality_score < 0.7 {
            return Phase::Degraded;
        }
        if self.bounce_rate > 0.15 {
            return Phase::Degraded;
        }
        if self.counts.enriched < 50 {
            return Phase::Building;
        }
        // Check for bottleneck: big drop-off between stages
        let enrich_rate = if self.counts.discovered > 0 {
            self.counts.enriched as f64 / self.counts.discovered as f64
        } else {
            0.0
        };
        let contact_rate = if self.counts.enriched > 0 {
            self.counts.contacts_found as f64 / self.counts.enriched as f64
        } else {
            0.0
        };
        if enrich_rate < 0.3 || contact_rate < 0.3 {
            return Phase::Bottleneck;
        }
        if self.counts.discovered > 200 && enrich_rate > 0.7 && contact_rate > 0.7 {
            return Phase::Saturated;
        }
        Phase::Flowing
    }

    /// Bayesian phase detection with confidence score and hysteresis.
    /// Returns (phase, confidence) where confidence is in [0.0, 1.0].
    pub fn detect_phase_bayesian(&self) -> (Phase, f32) {
        // Beta-Bernoulli enrichment rate model
        let (enrich_mean, enrich_ci_width) = if self.counts.discovered > 0 {
            let alpha = self.counts.enriched as f64 + 1.0;
            let beta_param = (self.counts.discovered.saturating_sub(self.counts.enriched)) as f64 + 1.0;
            let mean = alpha / (alpha + beta_param);
            let var = (alpha * beta_param) / ((alpha + beta_param).powi(2) * (alpha + beta_param + 1.0));
            let ci_width = 2.0 * 1.96 * var.sqrt();
            (mean, ci_width)
        } else {
            (0.0, 1.0)
        };

        let (contact_mean, contact_ci_width) = if self.counts.enriched > 0 {
            let contacts_clamped = self.counts.contacts_found.min(self.counts.enriched);
            let alpha = contacts_clamped as f64 + 1.0;
            let beta_param = (self.counts.enriched - contacts_clamped) as f64 + 1.0;
            let mean = alpha / (alpha + beta_param);
            let var = (alpha * beta_param) / ((alpha + beta_param).powi(2) * (alpha + beta_param + 1.0));
            let ci_width = 2.0 * 1.96 * var.sqrt();
            (mean, ci_width)
        } else {
            (0.0, 1.0)
        };

        // Phase classification using posterior means (same thresholds as detect_phase)
        let raw_phase = if self.quality_score > 0.0 && self.quality_score < 0.7 {
            Phase::Degraded
        } else if self.bounce_rate > 0.15 {
            Phase::Degraded
        } else if self.counts.enriched < 50 {
            Phase::Building
        } else if enrich_mean < 0.3 || contact_mean < 0.3 {
            Phase::Bottleneck
        } else if self.counts.discovered > 200 && enrich_mean > 0.7 && contact_mean > 0.7 {
            Phase::Saturated
        } else {
            Phase::Flowing
        };

        // Confidence from credible interval width
        let avg_ci = (enrich_ci_width + contact_ci_width) / 2.0;
        let confidence = (1.0 - avg_ci.min(1.0)) as f32;

        // Hysteresis: require 2 consecutive cycles in new phase
        let final_phase = if let Some(ref history) = self.phase_history {
            if raw_phase == history.previous {
                raw_phase
            } else if history.consecutive_count >= 2 {
                raw_phase // enough consecutive cycles, allow transition
            } else {
                history.previous // stay in current phase
            }
        } else {
            raw_phase
        };

        (final_phase, confidence)
    }

    /// Update phase history after detection.
    pub fn update_phase_history(&mut self, detected: Phase) {
        match &mut self.phase_history {
            Some(history) => {
                if detected == history.previous {
                    history.consecutive_count = history.consecutive_count.saturating_add(1);
                } else {
                    history.previous = detected;
                    history.consecutive_count = 1;
                }
            }
            None => {
                self.phase_history = Some(PhaseHistory {
                    previous: detected,
                    consecutive_count: 1,
                });
            }
        }
    }
}

// ── Action plan ───────────────────────────────────────────────

#[derive(Debug)]
pub struct ActionPlan {
    pub phase: Phase,
    pub state: PipelineState,
    pub run_discover: bool,
    pub run_enrich: bool,
    pub run_intent: bool,
    pub run_contacts: bool,
    pub run_qa: bool,
    pub run_outreach: bool,
}

impl fmt::Display for ActionPlan {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f)?;
        writeln!(f, "  ── Pipeline Action Plan ──────────────────────")?;
        writeln!(f, "  Phase:       {}", self.phase)?;
        writeln!(f, "  Cycle:       #{}", self.state.cycle_count + 1)?;
        writeln!(f, "  Discovered:  {}", self.state.counts.discovered)?;
        writeln!(f, "  Enriched:    {}", self.state.counts.enriched)?;
        writeln!(f, "  Contacts:    {}", self.state.counts.contacts_found)?;
        writeln!(f, "  Outreach:    {} drafted, {} sent",
            self.state.counts.outreach_drafted, self.state.counts.outreach_sent)?;
        writeln!(f, "  Quality:     {:.0}%", self.state.quality_score * 100.0)?;
        writeln!(f, "  Bounce:      {:.1}%", self.state.bounce_rate * 100.0)?;
        writeln!(f, "  ──────────────────────────────────────────────")?;
        writeln!(f, "  Stages to run:")?;
        if self.run_discover  { writeln!(f, "    [x] discover")?; }
        if self.run_enrich    { writeln!(f, "    [x] enrich")?; }
        if self.run_intent    { writeln!(f, "    [x] intent")?; }
        if self.run_contacts  { writeln!(f, "    [x] contacts")?; }
        if self.run_qa        { writeln!(f, "    [x] qa")?; }
        if self.run_outreach  { writeln!(f, "    [x] outreach (approval required)")?; }
        writeln!(f, "  ──────────────────────────────────────────────")?;
        Ok(())
    }
}

/// Produce an action plan that runs ALL stages (ignores phase).
pub fn all_stages(ctx: &TeamContext) -> Result<ActionPlan> {
    let state = PipelineState::load(&ctx.data_dir);
    let phase = state.detect_phase();
    Ok(ActionPlan {
        phase,
        state,
        run_discover: true,
        run_enrich: true,
        run_intent: true,
        run_contacts: true,
        run_qa: true,
        run_outreach: true,
    })
}

/// Assess pipeline state and produce an action plan.
pub fn assess(ctx: &TeamContext) -> Result<ActionPlan> {
    let state = PipelineState::load(&ctx.data_dir);
    let phase = state.detect_phase();

    let (run_discover, run_enrich, run_intent, run_contacts, run_qa, run_outreach) = match phase {
        Phase::Building => (true, true, true, true, true, false),
        Phase::Flowing => (true, true, true, true, true, true),
        Phase::Bottleneck => {
            let enrich_rate = if state.counts.discovered > 0 {
                state.counts.enriched as f64 / state.counts.discovered as f64
            } else {
                0.0
            };
            if enrich_rate < 0.3 {
                // Enrichment is lagging
                (false, true, true, false, true, false)
            } else {
                // Contacts lagging
                (false, false, false, true, true, false)
            }
        }
        Phase::Saturated => (false, false, false, false, true, true),
        Phase::Degraded => (false, true, true, true, true, false),
    };

    Ok(ActionPlan {
        phase,
        state,
        run_discover,
        run_enrich,
        run_intent,
        run_contacts,
        run_qa,
        run_outreach,
    })
}

/// Load individual stage reports from disk.
pub fn load_report<T: serde::de::DeserializeOwned>(data_dir: &Path, name: &str) -> Option<T> {
    let path = data_dir.join(format!("reports/{name}.json"));
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

pub fn save_report<T: serde::Serialize>(data_dir: &Path, name: &str, report: &T) -> Result<()> {
    let path = data_dir.join(format!("reports/{name}.json"));
    std::fs::create_dir_all(path.parent().unwrap())?;
    atomic_write(&path, &serde_json::to_string_pretty(report)?)?;
    Ok(())
}

/// Atomic write: write to temp file then rename (survives kill/crash).
fn atomic_write(path: &Path, content: &str) -> Result<()> {
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, content)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

// ── Stage checkpoint (crash resume) ──────────────────────────

/// Tracks which stages completed in the current run.
/// If the process crashes, the next run reads this to skip done stages.
/// Deleted on successful completion of all stages.
#[derive(Debug, Serialize, Deserialize)]
pub struct StageCheckpoint {
    pub run_id: u32,
    pub started_at: String,
    pub completed_stages: Vec<CompletedStage>,
    pub current_stage: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompletedStage {
    pub name: String,
    pub status: super::StageStatus,
}

impl StageCheckpoint {
    pub fn new(run_id: u32) -> Self {
        Self {
            run_id,
            started_at: now_iso(),
            completed_stages: Vec::new(),
            current_stage: None,
        }
    }

    pub fn load(data_dir: &Path) -> Option<Self> {
        let path = data_dir.join("reports/checkpoint.json");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    pub fn save(&self, data_dir: &Path) -> Result<()> {
        let path = data_dir.join("reports/checkpoint.json");
        std::fs::create_dir_all(path.parent().unwrap())?;
        atomic_write(&path, &serde_json::to_string_pretty(self)?)?;
        Ok(())
    }

    pub fn clear(data_dir: &Path) -> Result<()> {
        let path = data_dir.join("reports/checkpoint.json");
        if path.exists() {
            std::fs::remove_file(&path)?;
        }
        Ok(())
    }

    pub fn is_stage_done(&self, name: &str) -> bool {
        self.completed_stages.iter().any(|s| {
            s.name == name && matches!(s.status, super::StageStatus::Success)
        })
    }

    pub fn mark_started(&mut self, name: &str) {
        self.current_stage = Some(name.into());
    }

    pub fn mark_done(&mut self, name: &str, status: super::StageStatus) {
        self.completed_stages.push(CompletedStage {
            name: name.into(),
            status,
        });
        self.current_stage = None;
    }
}

// ── Pipeline progress (cross-run history) ────────────────────

/// Append-only history of pipeline runs. Never overwritten, only appended.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PipelineProgress {
    pub runs: Vec<RunRecord>,
    pub last_updated: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunRecord {
    pub run_id: u32,
    pub started_at: String,
    pub finished_at: String,
    pub duration_ms: u64,
    pub phase: Phase,
    pub stages_completed: Vec<String>,
    pub stages_failed: Vec<String>,
    pub counts: RunCounts,
    pub exit_status: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct RunCounts {
    pub discovered: usize,
    pub enriched: usize,
    #[serde(default)]
    pub intent_detected: usize,
    pub contacts_found: usize,
    pub outreach_drafted: usize,
    pub errors: usize,
}

impl PipelineProgress {
    pub fn load(data_dir: &Path) -> Self {
        let path = data_dir.join("reports/pipeline-progress.json");
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, data_dir: &Path) -> Result<()> {
        let path = data_dir.join("reports/pipeline-progress.json");
        std::fs::create_dir_all(path.parent().unwrap())?;
        atomic_write(&path, &serde_json::to_string_pretty(self)?)?;
        Ok(())
    }

    pub fn next_run_id(&self) -> u32 {
        self.runs.last().map_or(1, |r| r.run_id + 1)
    }

    /// Aggregate totals across all runs.
    pub fn totals(&self) -> RunCounts {
        let mut t = RunCounts::default();
        for r in &self.runs {
            t.discovered += r.counts.discovered;
            t.enriched += r.counts.enriched;
            t.intent_detected += r.counts.intent_detected;
            t.contacts_found += r.counts.contacts_found;
            t.outreach_drafted += r.counts.outreach_drafted;
            t.errors += r.counts.errors;
        }
        t
    }
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

// ── Blocklist ──────────────────────────────────────────────

use std::collections::HashSet;
use std::path::PathBuf;

pub struct Blocklist {
    domains: HashSet<String>,
    path: PathBuf,
}

impl Blocklist {
    /// Load blocklist from `{data_dir}/blocklist.txt`.
    /// Returns empty blocklist if file doesn't exist.
    pub fn load(data_dir: &Path) -> Self {
        let path = data_dir.join("blocklist.txt");
        let domains = match std::fs::read_to_string(&path) {
            Ok(content) => content
                .lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty() && !l.starts_with('#'))
                .map(|l| l.to_lowercase())
                .collect(),
            Err(_) => HashSet::new(),
        };
        Self { domains, path }
    }

    pub fn contains(&self, domain: &str) -> bool {
        self.domains.contains(&domain.to_lowercase())
    }

    pub fn add(&mut self, domain: &str) -> std::io::Result<()> {
        let d = domain.to_lowercase();
        if self.domains.insert(d.clone()) {
            // Ensure parent dir exists
            if let Some(parent) = self.path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            use std::io::Write;
            let mut f = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.path)?;
            writeln!(f, "{d}")?;
        }
        Ok(())
    }

    pub fn remove(&mut self, domain: &str) -> std::io::Result<bool> {
        let d = domain.to_lowercase();
        if !self.domains.remove(&d) {
            return Ok(false);
        }
        // Rewrite file without the removed domain
        let content: String = self.domains.iter()
            .collect::<std::collections::BTreeSet<_>>()
            .into_iter()
            .map(|d| format!("{d}\n"))
            .collect();
        std::fs::write(&self.path, content)?;
        Ok(true)
    }

    pub fn list(&self) -> Vec<&str> {
        let mut v: Vec<&str> = self.domains.iter().map(|s| s.as_str()).collect();
        v.sort();
        v
    }

    pub fn len(&self) -> usize {
        self.domains.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state_with(discovered: usize, enriched: usize, contacts: usize, quality: f64, bounce: f64) -> PipelineState {
        PipelineState {
            cycle_count: 1,
            phase: None,
            counts: StageCounts {
                discovered, enriched, contacts_found: contacts,
                outreach_drafted: 0, outreach_sent: 0,
            },
            quality_score: quality,
            bounce_rate: bounce,
            phase_history: None,
        }
    }

    #[test]
    fn test_phase_building() {
        let s = state_with(10, 5, 3, 0.9, 0.05);
        assert_eq!(s.detect_phase(), Phase::Building);
    }

    #[test]
    fn test_phase_degraded_low_quality() {
        let s = state_with(200, 100, 80, 0.5, 0.05);
        assert_eq!(s.detect_phase(), Phase::Degraded);
    }

    #[test]
    fn test_phase_degraded_high_bounce() {
        let s = state_with(200, 100, 80, 0.9, 0.20);
        assert_eq!(s.detect_phase(), Phase::Degraded);
    }

    #[test]
    fn test_phase_flowing() {
        let s = state_with(100, 60, 40, 0.9, 0.05);
        assert_eq!(s.detect_phase(), Phase::Flowing);
    }

    #[test]
    fn test_phase_bottleneck_enrich() {
        // enriched >= 50 (past Building), but enrich_rate = 55/200 = 0.275 < 0.3
        let s = state_with(200, 55, 40, 0.9, 0.05);
        assert_eq!(s.detect_phase(), Phase::Bottleneck);
    }

    #[test]
    fn test_phase_bottleneck_contacts() {
        let s = state_with(100, 80, 8, 0.9, 0.05);
        assert_eq!(s.detect_phase(), Phase::Bottleneck);
    }

    #[test]
    fn test_phase_saturated() {
        let s = state_with(300, 250, 200, 0.9, 0.05);
        assert_eq!(s.detect_phase(), Phase::Saturated);
    }

    #[test]
    fn test_phase_display() {
        assert_eq!(format!("{}", Phase::Building), "BUILDING");
        assert_eq!(format!("{}", Phase::Degraded), "DEGRADED");
    }

    #[test]
    fn test_state_save_and_load() {
        let dir = tempfile::tempdir().unwrap();
        let state = state_with(100, 80, 60, 0.85, 0.08);
        state.save(dir.path()).unwrap();
        let loaded = PipelineState::load(dir.path());
        assert_eq!(loaded.counts.discovered, 100);
        assert_eq!(loaded.counts.enriched, 80);
    }

    #[test]
    fn test_state_load_missing_file() {
        let dir = tempfile::tempdir().unwrap();
        let state = PipelineState::load(dir.path());
        assert_eq!(state.cycle_count, 0);
    }

    // ── Bayesian phase detection tests ───────────────────────────

    #[test]
    fn test_bayesian_building() {
        let s = state_with(10, 5, 3, 0.9, 0.05);
        let (phase, _confidence) = s.detect_phase_bayesian();
        assert_eq!(phase, Phase::Building);
    }

    #[test]
    fn test_bayesian_degraded() {
        let s = state_with(200, 100, 80, 0.5, 0.05);
        let (phase, _confidence) = s.detect_phase_bayesian();
        assert_eq!(phase, Phase::Degraded);
    }

    #[test]
    fn test_bayesian_high_confidence() {
        // Many observations → narrow credible interval → high confidence
        let s = state_with(500, 400, 350, 0.9, 0.05);
        let (_phase, confidence) = s.detect_phase_bayesian();
        assert!(confidence > 0.8, "Expected confidence > 0.8, got {confidence}");
    }

    #[test]
    fn test_bayesian_low_confidence() {
        // Few observations → wide credible interval → low confidence
        let s = state_with(5, 3, 2, 0.9, 0.05);
        let (_phase, confidence) = s.detect_phase_bayesian();
        assert!(confidence < 0.5, "Expected confidence < 0.5, got {confidence}");
    }

    #[test]
    fn test_hysteresis_prevents_flapping() {
        // History says Flowing with only 1 consecutive — raw detects Building
        // Hysteresis should keep Flowing (need >= 2 consecutive for transition)
        let mut s = state_with(10, 5, 3, 0.9, 0.05);
        s.phase_history = Some(PhaseHistory {
            previous: Phase::Flowing,
            consecutive_count: 1,
        });
        let (phase, _) = s.detect_phase_bayesian();
        assert_eq!(phase, Phase::Flowing, "Hysteresis should prevent transition with consecutive_count=1");
    }

    #[test]
    fn test_hysteresis_allows_transition() {
        // History says Flowing with 2 consecutive — raw detects Building
        // Hysteresis allows transition since consecutive >= 2
        let mut s = state_with(10, 5, 3, 0.9, 0.05);
        s.phase_history = Some(PhaseHistory {
            previous: Phase::Flowing,
            consecutive_count: 2,
        });
        let (phase, _) = s.detect_phase_bayesian();
        assert_eq!(phase, Phase::Building, "Hysteresis should allow transition with consecutive_count=2");
    }

    #[test]
    fn test_phase_history_serialization() {
        let dir = tempfile::tempdir().unwrap();
        let mut state = state_with(100, 80, 60, 0.85, 0.08);
        state.phase_history = Some(PhaseHistory {
            previous: Phase::Flowing,
            consecutive_count: 3,
        });
        state.save(dir.path()).unwrap();
        let loaded = PipelineState::load(dir.path());
        let history = loaded.phase_history.expect("phase_history should be Some after roundtrip");
        assert_eq!(history.previous, Phase::Flowing);
        assert_eq!(history.consecutive_count, 3);
    }

    #[test]
    fn test_bayesian_backward_compat() {
        // Simulate loading old JSON without phase_history field
        let json = r#"{
            "cycle_count": 5,
            "phase": null,
            "counts": { "discovered": 100, "enriched": 80, "contacts_found": 60, "outreach_drafted": 10, "outreach_sent": 5 },
            "quality_score": 0.9,
            "bounce_rate": 0.05
        }"#;
        let state: PipelineState = serde_json::from_str(json).expect("Should deserialize without phase_history");
        assert!(state.phase_history.is_none(), "phase_history should be None for old format");
        // Should still detect phases correctly
        let (phase, _) = state.detect_phase_bayesian();
        assert_eq!(phase, Phase::Flowing);
    }
}
