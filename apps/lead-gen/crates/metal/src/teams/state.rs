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
    /// QA < 0.7 or bounce > 15% — halt outreach, run cleanup
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

// ── Pipeline state ────────────────────────────────────────────

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PipelineState {
    pub cycle_count: u32,
    pub phase: Option<Phase>,
    pub counts: StageCounts,
    pub quality_score: f64,
    pub bounce_rate: f64,
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
}

// ── Action plan ───────────────────────────────────────────────

#[derive(Debug)]
pub struct ActionPlan {
    pub phase: Phase,
    pub state: PipelineState,
    pub run_discover: bool,
    pub run_enrich: bool,
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
        if self.run_contacts  { writeln!(f, "    [x] contacts")?; }
        if self.run_qa        { writeln!(f, "    [x] qa")?; }
        if self.run_outreach  { writeln!(f, "    [x] outreach (approval required)")?; }
        writeln!(f, "  ──────────────────────────────────────────────")?;
        Ok(())
    }
}

/// Assess pipeline state and produce an action plan.
pub fn assess(ctx: &TeamContext) -> Result<ActionPlan> {
    let state = PipelineState::load(&ctx.data_dir);
    let phase = state.detect_phase();

    let (run_discover, run_enrich, run_contacts, run_qa, run_outreach) = match phase {
        Phase::Building => (true, true, true, true, false),
        Phase::Flowing => (true, true, true, true, true),
        Phase::Bottleneck => {
            let enrich_rate = if state.counts.discovered > 0 {
                state.counts.enriched as f64 / state.counts.discovered as f64
            } else {
                0.0
            };
            if enrich_rate < 0.3 {
                // Enrichment is lagging
                (false, true, false, true, false)
            } else {
                // Contacts lagging
                (false, false, true, true, false)
            }
        }
        Phase::Saturated => (false, false, false, true, true),
        Phase::Degraded => (false, false, false, true, false),
    };

    Ok(ActionPlan {
        phase,
        state,
        run_discover,
        run_enrich,
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
    std::fs::write(&path, serde_json::to_string_pretty(report)?)?;
    Ok(())
}
