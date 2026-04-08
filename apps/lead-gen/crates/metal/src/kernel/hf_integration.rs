//! Integration between the HuggingFace `hf` crate and the scoring kernel.
//!
//! Scans real HF organizations, extracts `HfCompanySignals` via `from_org_profile()`,
//! bootstraps labeled datasets, and runs cross-validation + feature ablation.
//!
//! Requires features: `kernel-hf` + `kernel-eval`.

use crate::kernel::cross_validation::{
    feature_ablation, compare_legacy_vs_full, stratified_kfold_cv, AblationResult,
    CvResult, FeatureSetComparison,
};
use crate::kernel::data_gen::{bootstrap_labels, signal_distribution, SignalStats};
use crate::kernel::scoring::HfCompanySignals;

/// Well-known AI organizations on HuggingFace Hub, grouped by expected signal strength.
///
/// Strong orgs: large model publishers with deep training, research, and production signals.
/// Medium orgs: active but smaller or more focused.
/// Weak orgs: minimal or personal-level HF presence (used as negative examples).
/// Strong AI orgs on HuggingFace (known to have rich model/training signals).
/// Note: HF API author filter may be case-sensitive — use exact HF org casing.
pub const STRONG_ORGS: &[&str] = &[
    "meta-llama",
    "mistralai",
    "google",
    "microsoft",
    "deepseek-ai",
    "stabilityai",
    "bigscience",
    "tiiuae",
    "01-ai",
    "CohereForAI",
];

pub const MEDIUM_ORGS: &[&str] = &[
    "allenai",
    "databricks",
    "HuggingFaceH4",
    "teknium",
    "NousResearch",
    "mosaicml",
    "lmsys",
    "upstage",
    "internlm",
    "BAAI",
];

/// Scan a list of HF organizations and extract `HfCompanySignals` for each.
///
/// Returns `(org_name, signals)` pairs. Orgs that fail to scan are skipped with a warning.
pub async fn scan_orgs(org_names: &[&str]) -> Vec<(String, HfCompanySignals)> {
    let client = hf::HfClient::from_env(4).expect("HfClient::from_env");
    let scanner = hf::OrgScanner::new(&client);

    let mut results = Vec::with_capacity(org_names.len());

    for &org in org_names {
        match scanner.scan_org(org).await {
            Ok(profile) => {
                let signals = HfCompanySignals::from_org_profile(&profile);
                tracing::info!(
                    org = org,
                    models = profile.models.len(),
                    hf_score = %signals.hf_score,
                    model_depth = %signals.model_depth,
                    training_depth = %signals.training_depth,
                    research = %signals.research,
                    download_scale = %signals.download_scale,
                    "scanned org"
                );
                results.push((org.to_string(), signals));
            }
            Err(e) => {
                tracing::warn!(org = org, error = %e, "failed to scan org, skipping");
            }
        }
    }

    results
}

/// Full evaluation pipeline: scan orgs → bootstrap labels → CV + ablation.
///
/// Returns a structured report with signal distributions, CV metrics, ablation
/// rankings, and legacy comparison.
pub async fn run_hf_eval(
    org_names: &[&str],
    contacts_per_org: usize,
) -> HfEvalReport {
    let scanned = scan_orgs(org_names).await;
    let signals: Vec<HfCompanySignals> = scanned.iter().map(|(_, s)| *s).collect();
    let org_names_scanned: Vec<String> = scanned.iter().map(|(n, _)| n.clone()).collect();

    let stats = signal_distribution(&signals);
    let samples = bootstrap_labels(&signals, contacts_per_org);
    let total_samples = samples.len();

    // Mix with synthetic data for better class balance
    let synthetic = crate::kernel::data_gen::generate_contact_labels(200);
    let mut combined = samples;
    combined.extend(synthetic);

    let cv = stratified_kfold_cv(&combined, 5, 100, 0.3);
    let ablation = feature_ablation(&combined, 3);
    let comparison = compare_legacy_vs_full(&combined, 3);

    HfEvalReport {
        orgs_scanned: org_names_scanned,
        orgs_failed: org_names.len() - scanned.len(),
        total_samples,
        combined_samples: combined.len(),
        stats,
        cv,
        ablation,
        comparison,
    }
}

/// Report from `run_hf_eval()`.
#[derive(Debug)]
pub struct HfEvalReport {
    pub orgs_scanned: Vec<String>,
    pub orgs_failed: usize,
    pub total_samples: usize,
    pub combined_samples: usize,
    pub stats: SignalStats,
    pub cv: CvResult,
    pub ablation: AblationResult,
    pub comparison: FeatureSetComparison,
}

impl std::fmt::Display for HfEvalReport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "═══ HF Integration Eval Report ═══")?;
        writeln!(f)?;
        writeln!(f, "Orgs scanned: {} (failed: {})", self.orgs_scanned.len(), self.orgs_failed)?;
        writeln!(f, "  {}", self.orgs_scanned.join(", "))?;
        writeln!(f)?;

        writeln!(f, "── Signal Distribution ──")?;
        writeln!(f, "  Total orgs: {}", self.stats.org_count)?;
        writeln!(f, "  Positive (heuristic): {}", self.stats.positive_count)?;
        writeln!(f, "  Negative (heuristic): {}", self.stats.negative_count)?;
        writeln!(f)?;
        writeln!(f, "  {:30} {:>6} {:>6} {:>6}", "Field", "Min", "Max", "Mean")?;
        writeln!(f, "  {}", "─".repeat(54))?;
        for (name, min, max, mean) in &self.stats.field_stats {
            writeln!(f, "  {:30} {:6.3} {:6.3} {:6.3}", name, min, max, mean)?;
        }
        writeln!(f)?;

        writeln!(f, "── Cross-Validation (5-fold) ──")?;
        writeln!(f, "  Bootstrapped samples: {} (+ 200 synthetic = {} combined)",
            self.total_samples, self.combined_samples)?;
        writeln!(f, "  F1:  {:.4} ± {:.4}", self.cv.mean_f1, self.cv.std_f1)?;
        writeln!(f, "  AUC: {:.4} ± {:.4}", self.cv.mean_auc, self.cv.std_auc)?;
        writeln!(f)?;

        writeln!(f, "── Feature Ablation (top 15) ──")?;
        writeln!(f, "  Baseline F1: {:.4}", self.ablation.baseline_f1)?;
        writeln!(f, "  {:3} {:35} {:>8}", "#", "Feature", "ΔF1")?;
        writeln!(f, "  {}", "─".repeat(50))?;
        for (rank, (idx, name, delta)) in self.ablation.deltas.iter().take(15).enumerate() {
            let sign = if *delta >= 0.0 { "+" } else { "" };
            writeln!(f, "  {:3} {:35} {}{:.4}  [{}]", rank + 1, name, sign, delta, idx)?;
        }
        writeln!(f)?;

        writeln!(f, "── Legacy vs Full Comparison ──")?;
        writeln!(f, "  Full 44-feat F1:   {:.4} ± {:.4}", self.comparison.full_cv.mean_f1, self.comparison.full_cv.std_f1)?;
        writeln!(f, "  Legacy 7-feat F1:  {:.4} ± {:.4}", self.comparison.legacy_cv.mean_f1, self.comparison.legacy_cv.std_f1)?;
        writeln!(f, "  ΔF1:  {:+.4}", self.comparison.delta_f1)?;
        writeln!(f, "  ΔAUC: {:+.4}", self.comparison.delta_auc)?;

        Ok(())
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Integration test that scans real HF orgs.
    /// Run with: cargo test --features kernel-ml,kernel-eval -- hf_integration --ignored --nocapture
    #[tokio::test]
    #[ignore] // requires network access + HF API
    async fn test_scan_strong_orgs() {
        tracing_subscriber::fmt::init();

        let results = scan_orgs(STRONG_ORGS).await;
        assert!(!results.is_empty(), "should scan at least one strong org");

        let mut nonzero = 0;
        for (org, sig) in &results {
            println!("{org}:");
            println!("  hf_score={:.3} model_depth={:.3} training_depth={:.3}",
                sig.hf_score, sig.model_depth, sig.training_depth);
            println!("  max_effort={:.3} production_ratio={:.3} research={:.0}",
                sig.max_effort, sig.production_ratio, sig.research);
            println!("  download_scale={:.3} recency={:.3} longevity={:.3}",
                sig.download_scale, sig.recency, sig.longevity);
            println!("  library_soph={:.3} pipeline_div={:.3} framework_div={:.3}",
                sig.library_sophistication, sig.pipeline_diversity, sig.framework_diversity);
            println!();

            if sig.hf_score > 0.0 { nonzero += 1; }
        }
        // At least 60% of strong orgs should return real data
        let threshold = results.len() * 6 / 10;
        assert!(nonzero >= threshold,
            "only {nonzero}/{} orgs returned non-zero hf_score (need {})",
            results.len(), threshold);
    }

    /// Full pipeline test: scan → bootstrap → CV → ablation.
    /// Run with: cargo test --features kernel-ml,kernel-eval -- full_hf_eval --ignored --nocapture
    #[tokio::test]
    #[ignore] // requires network access + HF API
    async fn test_full_hf_eval() {
        tracing_subscriber::fmt::init();

        // Use a subset for faster testing
        let orgs: Vec<&str> = STRONG_ORGS.iter().take(5)
            .chain(MEDIUM_ORGS.iter().take(3))
            .copied()
            .collect();

        let report = run_hf_eval(&orgs, 20).await;
        println!("{report}");

        assert!(report.cv.mean_f1 > 0.0, "CV should produce non-zero F1");
        assert!(report.cv.mean_auc > 0.5, "AUC should be better than random");
        assert_eq!(report.ablation.deltas.len(), 44);
    }

    /// Offline test using synthetic HfCompanySignals (no network needed).
    #[test]
    fn test_bootstrap_cv_offline() {
        // Create a mix of synthetic strong/weak signals
        let strong = HfCompanySignals {
            hf_score: 0.8, model_depth: 0.7, training_depth: 0.6,
            max_effort: 0.9, production_ratio: 0.5, dl_weighted_maturity: 0.7,
            alignment_diversity: 0.3, maturity_trend: 0.65,
            research: 1.0,
            sales_b2b_core: 0.0, sales_outreach: 0.0, sales_funnel: 0.3, sales_platform: 0.0,
            research_intensity: 0.4, infra_sophistication: 0.5,
            signal_breadth: 0.6, domain_nlp_focus: 0.2,
            library_sophistication: 0.7, pipeline_diversity: 0.5,
            custom_arch_ratio: 0.1, framework_diversity: 0.5, moe_ratio: 0.05,
            download_scale: 0.6, download_per_model: 0.4,
            top_model_dominance: 0.3, likes_per_download: 0.05, download_breadth: 0.5,
            recency: 0.9, acceleration: 0.7, longevity: 0.8, burst_intensity: 0.3,
        };
        let weak = HfCompanySignals {
            hf_score: 0.05, model_depth: 0.02, training_depth: 0.0,
            max_effort: 0.15, production_ratio: 0.0, dl_weighted_maturity: 0.1,
            alignment_diversity: 0.0, maturity_trend: 0.5,
            research: 0.0,
            sales_b2b_core: 0.0, sales_outreach: 0.0, sales_funnel: 0.0, sales_platform: 0.0,
            research_intensity: 0.0, infra_sophistication: 0.0,
            signal_breadth: 0.0, domain_nlp_focus: 0.0,
            library_sophistication: 0.0, pipeline_diversity: 0.0,
            custom_arch_ratio: 0.0, framework_diversity: 0.0, moe_ratio: 0.0,
            download_scale: 0.02, download_per_model: 0.01,
            top_model_dominance: 0.9, likes_per_download: 0.0, download_breadth: 0.0,
            recency: 0.1, acceleration: 0.5, longevity: 0.05, burst_intensity: 0.0,
        };

        // 5 strong + 5 weak orgs, 20 contacts each = 200 samples
        let mut sigs = Vec::new();
        for _ in 0..5 { sigs.push(strong); }
        for _ in 0..5 { sigs.push(weak); }

        let samples = bootstrap_labels(&sigs, 20);
        assert_eq!(samples.len(), 200);

        // Run CV
        let cv = stratified_kfold_cv(&samples, 5, 80, 0.3);
        assert!(cv.fold_count == 5);
        assert!(cv.mean_f1 > 0.1, "F1 too low on bootstrapped data: {}", cv.mean_f1);
        assert!(cv.mean_auc >= 0.5, "AUC below random: {}", cv.mean_auc);

        // Run ablation
        let ablation = feature_ablation(&samples, 3);
        assert_eq!(ablation.deltas.len(), 44);

        // Top ablation feature should be an HF feature (7+) or a strong contact feature
        let (top_idx, top_name, top_delta) = &ablation.deltas[0];
        println!("Top ablation feature: [{top_idx}] {top_name} Δ={top_delta:.4}");

        // Legacy comparison
        let cmp = compare_legacy_vs_full(&samples, 3);
        println!("Full F1={:.4} Legacy F1={:.4} ΔF1={:+.4}",
            cmp.full_cv.mean_f1, cmp.legacy_cv.mean_f1, cmp.delta_f1);
    }
}
