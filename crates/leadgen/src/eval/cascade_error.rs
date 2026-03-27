/// Cascade error attribution across pipeline stages.
///
/// Implements the error-decomposition model described in the TextResNet-inspired
/// research: for each error observed at a downstream stage, we trace back
/// through the `input_hash → output_hash` chain to determine which earlier
/// stage first introduced it.  This lets us compute two diagnostic quantities:
///
/// * **Component Error Rate (CER)** — fraction of records that a stage
///   *originated* an error in, relative to how many it processed.
/// * **Error Amplification Factor (EAF)** — ratio of errors leaving a stage
///   to errors entering it.  EAF > 1 means the stage actively amplifies
///   upstream problems.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// A single error observation recorded at one pipeline stage.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorObservation {
    /// Name of the pipeline stage where the error was detected.
    pub stage: String,
    /// Hash of the record as it entered this stage.
    pub input_hash: u64,
    /// Hash of the record as it left this stage (after transformation).
    pub output_hash: u64,
    pub error_type: ErrorType,
    /// Normalised severity in [0, 1].
    pub severity: f64,
    /// ISO-8601 timestamp string; used for ordering and reports only.
    pub timestamp: String,
}

/// Taxonomy of error classes that can occur at a pipeline stage.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ErrorType {
    /// Required field absent or null in input data.
    MissingData,
    /// NLP / regex extraction produced a wrong value.
    IncorrectExtraction,
    /// Entity resolution returned a match for two distinct entities.
    FalsePositiveMatch,
    /// Entity resolution missed a true duplicate pair.
    FalseNegativeMatch,
    /// Lead-score model returned an implausible probability.
    ScoringError,
    /// Email / domain verification step rejected a valid contact.
    VerificationFailure,
}

/// Tracks error propagation across pipeline stages.
///
/// Errors are recorded via [`record`].  Attribution is performed by walking the
/// `input_hash → output_hash` provenance chain stored in `observations`: an
/// error's input hash is matched against earlier observations' output hashes to
/// find the stage that first introduced the corruption.
pub struct CascadeErrorTracker {
    observations: Vec<ErrorObservation>,
    /// stage name → (errors originated at this stage, errors propagated through it).
    stage_errors: HashMap<String, (u32, u32)>,
    /// output_hash → stage name, used for O(1) provenance look-ups.
    output_index: HashMap<u64, String>,
    /// stage name → total records processed (denominator for CER).
    stage_processed: HashMap<String, u32>,
}

impl Default for CascadeErrorTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl CascadeErrorTracker {
    /// Create an empty tracker.
    pub fn new() -> Self {
        Self {
            observations: Vec::new(),
            stage_errors: HashMap::new(),
            output_index: HashMap::new(),
            stage_processed: HashMap::new(),
        }
    }

    /// Record a processed-record count for a stage (denominator for CER).
    ///
    /// Call once per stage per pipeline run with the total number of records
    /// that stage handled.  Multiple calls for the same stage are additive.
    pub fn record_processed(&mut self, stage: &str, count: u32) {
        *self
            .stage_processed
            .entry(stage.to_string())
            .or_insert(0) += count;
    }

    /// Record an error observation.
    ///
    /// The observation is attributed to an originating stage via the provenance
    /// index: if a previous stage emitted a record whose `output_hash` equals
    /// this observation's `input_hash`, the root cause is that earlier stage;
    /// otherwise this stage is treated as the originator.
    pub fn record(&mut self, obs: ErrorObservation) {
        // Determine whether this is a propagated error or a new origination.
        let originating = self
            .output_index
            .get(&obs.input_hash)
            .cloned()
            .unwrap_or_else(|| obs.stage.clone());

        let current_stage = obs.stage.clone();

        // Increment originated counter for the root stage.
        let entry = self
            .stage_errors
            .entry(originating.clone())
            .or_insert((0, 0));
        entry.0 += 1;

        // If the error propagated (root != current), also bump propagated counter.
        if originating != current_stage {
            let cur_entry = self
                .stage_errors
                .entry(current_stage.clone())
                .or_insert((0, 0));
            cur_entry.1 += 1;
        }

        // Ensure every touched stage has an entry so maps are consistent.
        self.stage_errors.entry(current_stage).or_insert((0, 0));

        // Index this observation's output so downstream stages can trace back.
        if obs.output_hash != 0 {
            self.output_index
                .insert(obs.output_hash, obs.stage.clone());
        }

        self.observations.push(obs);
    }

    /// Attribute a downstream error to its originating stage.
    ///
    /// Walks the provenance chain (`input_hash` → prior `output_hash`) until no
    /// earlier stage can be found.  Returns the stage name where the error
    /// chain started, or `None` if the tracker has no observations at all.
    pub fn attribute(&self, error: &ErrorObservation) -> Option<String> {
        if self.observations.is_empty() {
            return None;
        }

        let mut current_input = error.input_hash;
        let mut origin = error.stage.clone();

        // Follow the chain up to a reasonable depth to avoid pathological cycles.
        for _ in 0..self.observations.len() {
            match self.output_index.get(&current_input) {
                Some(prior_stage) => {
                    origin = prior_stage.clone();
                    // Find the observation that produced this output to get its input_hash.
                    let prior_obs = self
                        .observations
                        .iter()
                        .find(|o| o.output_hash == current_input);
                    match prior_obs {
                        Some(o) => current_input = o.input_hash,
                        None => break,
                    }
                }
                None => break,
            }
        }

        Some(origin)
    }

    /// Component Error Rate per stage: originated errors / total processed.
    ///
    /// Stages with no recorded processed count will have denominator 0; those
    /// are omitted from the result to avoid division-by-zero.
    pub fn component_error_rates(&self) -> HashMap<String, f64> {
        let mut rates = HashMap::new();
        for (stage, (originated, _)) in &self.stage_errors {
            let processed = self
                .stage_processed
                .get(stage)
                .copied()
                .unwrap_or(*originated); // fall back: assume each error = 1 record
            if processed > 0 {
                rates.insert(stage.clone(), *originated as f64 / processed as f64);
            }
        }
        rates
    }

    /// Error Amplification Factor per stage.
    ///
    /// EAF = (originated + propagated) / max(propagated_in, 1).
    ///
    /// A value > 1 means the stage adds more errors than it receives from
    /// upstream.  Stages with zero propagated-in errors are treated as having
    /// EAF = originated (they receive nothing and create something).
    pub fn amplification_factors(&self) -> HashMap<String, f64> {
        let mut factors = HashMap::new();

        // Build a map of how many propagated errors enter each stage.
        // An error is "in" at stage S if: it originated elsewhere and was
        // *detected* at S (i.e. it shows up in S's propagated counter via the
        // record() logic which increments the current stage's propagated count).
        for (stage, &(originated, propagated)) in &self.stage_errors {
            let errors_out = (originated + propagated) as f64;
            // errors_in = how many upstream errors were passed to this stage.
            // We approximate this as propagated (since those came from elsewhere).
            let errors_in = propagated.max(1) as f64;
            let eaf = if originated == 0 && propagated == 0 {
                1.0
            } else {
                errors_out / errors_in
            };
            factors.insert(stage.clone(), eaf);
        }

        factors
    }

    /// Return the stage with the highest error origination rate (CER).
    pub fn worst_stage(&self) -> Option<(String, f64)> {
        self.component_error_rates()
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
    }

    /// All recorded observations (in insertion order).
    pub fn observations(&self) -> &[ErrorObservation] {
        &self.observations
    }

    /// Total error count recorded.
    pub fn total_errors(&self) -> u32 {
        self.observations.len() as u32
    }

    /// Generate a structured summary report.
    pub fn summary(&self) -> CascadeErrorReport {
        let rates = self.component_error_rates();
        let factors = self.amplification_factors();
        let worst_orig = self.worst_stage().map(|(s, _)| s);

        let worst_amp = self
            .amplification_factors()
            .into_iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(s, _)| s);

        let mut per_stage: Vec<StageErrorStats> = self
            .stage_errors
            .iter()
            .map(|(stage, &(originated, propagated))| {
                let error_rate = rates.get(stage).copied().unwrap_or(0.0);
                let amplification_factor = factors.get(stage).copied().unwrap_or(1.0);
                StageErrorStats {
                    stage: stage.clone(),
                    originated,
                    propagated,
                    error_rate,
                    amplification_factor,
                }
            })
            .collect();

        // Sort deterministically by stage name for stable report output.
        per_stage.sort_by(|a, b| a.stage.cmp(&b.stage));

        CascadeErrorReport {
            total_errors: self.total_errors(),
            per_stage,
            worst_originator: worst_orig,
            worst_amplifier: worst_amp,
        }
    }
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

/// Top-level cascade error report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CascadeErrorReport {
    pub total_errors: u32,
    pub per_stage: Vec<StageErrorStats>,
    /// Stage that originated the most errors (by CER).
    pub worst_originator: Option<String>,
    /// Stage with the highest Error Amplification Factor.
    pub worst_amplifier: Option<String>,
}

/// Per-stage statistics within a [`CascadeErrorReport`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageErrorStats {
    pub stage: String,
    pub originated: u32,
    pub propagated: u32,
    /// Component Error Rate (originated / processed).
    pub error_rate: f64,
    /// Error Amplification Factor.
    pub amplification_factor: f64,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Build a minimal [`ErrorObservation`] for use in tests.
#[cfg(test)]
fn obs(
    stage: &str,
    input_hash: u64,
    output_hash: u64,
    error_type: ErrorType,
    severity: f64,
) -> ErrorObservation {
    ErrorObservation {
        stage: stage.to_string(),
        input_hash,
        output_hash,
        error_type,
        severity,
        timestamp: "2025-01-01T00:00:00Z".to_string(),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // -- empty tracker --

    #[test]
    fn empty_tracker_has_zero_errors() {
        let t = CascadeErrorTracker::new();
        assert_eq!(t.total_errors(), 0);
        assert!(t.observations().is_empty());
    }

    #[test]
    fn empty_tracker_attribute_returns_none() {
        let t = CascadeErrorTracker::new();
        let e = obs("stage_a", 1, 2, ErrorType::MissingData, 0.5);
        assert_eq!(t.attribute(&e), None);
    }

    #[test]
    fn empty_tracker_summary_has_no_stages() {
        let t = CascadeErrorTracker::new();
        let r = t.summary();
        assert_eq!(r.total_errors, 0);
        assert!(r.per_stage.is_empty());
        assert!(r.worst_originator.is_none());
        assert!(r.worst_amplifier.is_none());
    }

    // -- single-error attribution --

    #[test]
    fn single_error_attributes_to_its_own_stage() {
        let mut t = CascadeErrorTracker::new();
        let e = obs("extraction", 10, 20, ErrorType::IncorrectExtraction, 0.8);
        t.record(e.clone());
        let origin = t.attribute(&e).unwrap();
        assert_eq!(origin, "extraction");
    }

    #[test]
    fn single_error_total_count_is_one() {
        let mut t = CascadeErrorTracker::new();
        t.record(obs("crawl", 1, 2, ErrorType::MissingData, 0.3));
        assert_eq!(t.total_errors(), 1);
    }

    // -- multi-stage propagation --

    #[test]
    fn downstream_error_attributed_to_originating_stage() {
        let mut t = CascadeErrorTracker::new();

        // Stage A: corrupts record 1 → outputs hash 100.
        t.record(obs("stage_a", 1, 100, ErrorType::MissingData, 0.5));

        // Stage B: receives hash 100 (corrupted), outputs hash 200.
        t.record(obs("stage_b", 100, 200, ErrorType::IncorrectExtraction, 0.5));

        // Stage C: receives hash 200 and detects the failure.
        let downstream = obs("stage_c", 200, 300, ErrorType::ScoringError, 0.9);
        t.record(downstream.clone());

        let origin = t.attribute(&downstream).unwrap();
        assert_eq!(
            origin, "stage_a",
            "cascade should trace back to the first stage that corrupted the record"
        );
    }

    #[test]
    fn independent_errors_stay_at_their_own_stages() {
        let mut t = CascadeErrorTracker::new();

        // Error in stage A with hash chain 1 → 10.
        t.record(obs("stage_a", 1, 10, ErrorType::MissingData, 0.5));

        // Error in stage B with a completely different input hash (no provenance link).
        let unrelated = obs("stage_b", 99, 199, ErrorType::FalsePositiveMatch, 0.5);
        t.record(unrelated.clone());

        let origin = t.attribute(&unrelated).unwrap();
        assert_eq!(
            origin, "stage_b",
            "error with no upstream provenance should attribute to its own stage"
        );
    }

    // -- component error rates --

    #[test]
    fn error_rates_use_processed_count_as_denominator() {
        let mut t = CascadeErrorTracker::new();
        t.record_processed("ingestion", 100);
        // 5 errors originated at ingestion.
        for i in 0..5u64 {
            t.record(obs("ingestion", i, i + 100, ErrorType::MissingData, 0.5));
        }
        let rates = t.component_error_rates();
        let cer = rates["ingestion"];
        assert!(
            (cer - 0.05).abs() < 1e-10,
            "CER should be 5/100 = 0.05, got {cer}"
        );
    }

    #[test]
    fn error_rates_without_explicit_processed_count() {
        // When record_processed is not called, originated count is used as denominator.
        let mut t = CascadeErrorTracker::new();
        t.record(obs("extractor", 1, 2, ErrorType::IncorrectExtraction, 0.5));
        t.record(obs("extractor", 3, 4, ErrorType::IncorrectExtraction, 0.5));
        let rates = t.component_error_rates();
        // 2 originated / 2 (fallback denominator) = 1.0
        assert!(
            (rates["extractor"] - 1.0).abs() < 1e-10,
            "fallback CER should be 1.0 when processed = originated"
        );
    }

    #[test]
    fn stages_without_errors_are_absent_from_rates() {
        let mut t = CascadeErrorTracker::new();
        t.record_processed("clean_stage", 50);
        // No errors recorded for clean_stage.
        let rates = t.component_error_rates();
        assert!(
            !rates.contains_key("clean_stage"),
            "stages with no errors should not appear in CER map"
        );
    }

    // -- amplification factor --

    #[test]
    fn amplification_factor_above_one_when_stage_adds_errors() {
        let mut t = CascadeErrorTracker::new();

        // Stage A: one origination, output hash 50.
        t.record(obs("stage_a", 1, 50, ErrorType::MissingData, 0.5));

        // Stage B: receives upstream error (input=50) AND adds two new ones.
        t.record(obs("stage_b", 50, 60, ErrorType::IncorrectExtraction, 0.5));
        t.record(obs("stage_b", 2, 70, ErrorType::ScoringError, 0.5));
        t.record(obs("stage_b", 3, 80, ErrorType::FalseNegativeMatch, 0.5));

        let factors = t.amplification_factors();
        let eaf_b = factors["stage_b"];
        // stage_b: originated=2 (hashes 2,3 have no upstream), propagated=1 (hash 50 does).
        // EAF = (2 + 1) / 1 = 3.0
        assert!(
            eaf_b > 1.0,
            "stage_b adds errors to upstream, EAF should be > 1: {eaf_b}"
        );
    }

    #[test]
    fn amplification_factor_at_most_one_when_stage_only_propagates() {
        let mut t = CascadeErrorTracker::new();

        // Stage A originates one error.
        t.record(obs("stage_a", 1, 10, ErrorType::MissingData, 0.5));

        // Stage B only propagates it (no new originations).
        t.record(obs("stage_b", 10, 20, ErrorType::MissingData, 0.5));

        let factors = t.amplification_factors();
        // stage_b: originated=0, propagated=1 → errors_out=1, errors_in=1 → EAF=1.0
        let eaf = factors["stage_b"];
        assert!(
            (eaf - 1.0).abs() < 1e-9,
            "pure-propagation stage should have EAF=1.0, got {eaf}"
        );
    }

    // -- worst_stage --

    #[test]
    fn worst_stage_picks_highest_cer() {
        let mut t = CascadeErrorTracker::new();

        // Stage A: 1 error out of 10 processed → CER = 0.1.
        t.record_processed("stage_a", 10);
        t.record(obs("stage_a", 1, 10, ErrorType::MissingData, 0.5));

        // Stage B: 8 errors out of 10 processed → CER = 0.8.
        t.record_processed("stage_b", 10);
        for i in 2..10u64 {
            t.record(obs("stage_b", i, i + 100, ErrorType::ScoringError, 0.5));
        }

        let (worst, rate) = t.worst_stage().unwrap();
        assert_eq!(worst, "stage_b", "stage_b has higher CER");
        assert!((rate - 0.8).abs() < 1e-9, "worst CER should be 0.8, got {rate}");
    }

    #[test]
    fn worst_stage_none_when_no_errors() {
        let t = CascadeErrorTracker::new();
        assert!(t.worst_stage().is_none());
    }

    // -- summary report --

    #[test]
    fn summary_total_matches_observation_count() {
        let mut t = CascadeErrorTracker::new();
        t.record(obs("a", 1, 2, ErrorType::MissingData, 0.5));
        t.record(obs("a", 3, 4, ErrorType::ScoringError, 0.5));
        t.record(obs("b", 2, 5, ErrorType::VerificationFailure, 0.5));
        let r = t.summary();
        assert_eq!(r.total_errors, 3);
    }

    #[test]
    fn summary_per_stage_sorted_by_name() {
        let mut t = CascadeErrorTracker::new();
        t.record(obs("zzz", 1, 2, ErrorType::MissingData, 0.5));
        t.record(obs("aaa", 3, 4, ErrorType::ScoringError, 0.5));
        let r = t.summary();
        let names: Vec<&str> = r.per_stage.iter().map(|s| s.stage.as_str()).collect();
        assert_eq!(names, ["aaa", "zzz"], "per_stage must be sorted by name");
    }

    #[test]
    fn summary_worst_originator_present_when_errors_exist() {
        let mut t = CascadeErrorTracker::new();
        t.record_processed("alpha", 5);
        t.record(obs("alpha", 1, 10, ErrorType::MissingData, 0.5));
        t.record(obs("alpha", 2, 20, ErrorType::MissingData, 0.5));
        let r = t.summary();
        assert_eq!(r.worst_originator.as_deref(), Some("alpha"));
    }

    #[test]
    fn error_type_variants_are_serializable() {
        let variants = [
            ErrorType::MissingData,
            ErrorType::IncorrectExtraction,
            ErrorType::FalsePositiveMatch,
            ErrorType::FalseNegativeMatch,
            ErrorType::ScoringError,
            ErrorType::VerificationFailure,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).expect("should serialize");
            let back: ErrorType = serde_json::from_str(&json).expect("should deserialize");
            assert_eq!(v, back);
        }
    }
}
