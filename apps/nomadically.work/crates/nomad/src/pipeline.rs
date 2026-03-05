use anyhow::Result;
use tracing::info;

use crate::ats_enhance;
use crate::classifier;
use crate::d1::D1Client;
use crate::role_tagger;

/// Run the full 4-phase pipeline:
///   Phase 1: ATS Enhancement (new -> enhanced)
///   Phase 2: Role Tagging (enhanced -> role-match / role-nomatch)
///   Phase 3: EU Classification (role-match -> eu-remote / non-eu)
///   Phase 4: Skill Extraction (TODO — deferred)
pub async fn run_pipeline(
    db: &D1Client,
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    limit: u32,
) -> Result<PipelineStats> {
    let mut stats = PipelineStats::default();

    // Phase 1 — ATS Enhancement
    info!("=== Phase 1: ATS Enhancement ===");
    match ats_enhance::enhance_batch(db, limit).await {
        Ok(s) => {
            info!("Phase 1 complete: {} enhanced, {} errors", s.enhanced, s.errors);
            stats.enhanced = s.enhanced;
            stats.enhance_errors = s.errors;
        }
        Err(e) => {
            tracing::error!("Phase 1 failed: {e}");
            stats.enhance_errors += 1;
        }
    }

    // Phase 2 — Role Tagging
    info!("=== Phase 2: Role Tagging ===");
    match role_tagger::tag_roles_batch(db, deepseek, limit).await {
        Ok(s) => {
            info!(
                "Phase 2 complete: {} processed, {} target, {} irrelevant",
                s.processed, s.target_role, s.irrelevant
            );
            stats.role_tagged = s.processed;
            stats.role_target = s.target_role;
            stats.role_irrelevant = s.irrelevant;
            stats.role_errors = s.errors;
        }
        Err(e) => {
            tracing::error!("Phase 2 failed: {e}");
            stats.role_errors += 1;
        }
    }

    // Phase 3 — EU Classification
    info!("=== Phase 3: EU Classification ===");
    match classifier::classify_batch(db, deepseek, limit).await {
        Ok(s) => {
            info!(
                "Phase 3 complete: {} processed, {} EU, {} non-EU, {} heuristic, {} deepseek",
                s.processed, s.eu_remote, s.non_eu, s.heuristic, s.deepseek
            );
            stats.classified = s.processed;
            stats.eu_remote = s.eu_remote;
            stats.non_eu = s.non_eu;
            stats.classify_errors = s.errors;
        }
        Err(e) => {
            tracing::error!("Phase 3 failed: {e}");
            stats.classify_errors += 1;
        }
    }

    // Phase 4 — Skill Extraction (TODO: implement in skill_extract.rs)
    info!("=== Phase 4: Skill Extraction (skipped — not yet implemented) ===");

    info!("=== Pipeline complete ===");
    Ok(stats)
}

#[derive(Debug, Default)]
pub struct PipelineStats {
    pub enhanced: u32,
    pub enhance_errors: u32,
    pub role_tagged: u32,
    pub role_target: u32,
    pub role_irrelevant: u32,
    pub role_errors: u32,
    pub classified: u32,
    pub eu_remote: u32,
    pub non_eu: u32,
    pub classify_errors: u32,
}

impl std::fmt::Display for PipelineStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Pipeline: enhanced={} role_tagged={} (target={}, irrelevant={}) \
             classified={} (eu={}, non_eu={}) errors={}",
            self.enhanced,
            self.role_tagged,
            self.role_target,
            self.role_irrelevant,
            self.classified,
            self.eu_remote,
            self.non_eu,
            self.enhance_errors + self.role_errors + self.classify_errors,
        )
    }
}
