use serde::{Deserialize, Serialize};

/// Number of features in the logistic regression model.
///
/// Layout:
///   Base contact (0-6):
///   [0]  industry_match       (binary)
///   [1]  employee_in_range    (binary)
///   [2]  seniority_match      (binary)
///   [3]  department_match     (binary)
///   [4]  tech_norm            (0-1)
///   [5]  email_norm           (0-1)
///   [6]  smooth_recency       (exp decay)
///
///   HF composite + depth (7-9):
///   [7]  hf_score             (0-1)
///   [8]  hf_model_depth       (0-1)
///   [9]  hf_training_depth    (0-1)
///
///   Maturity decomposed (10-14):
///   [10] hf_max_effort        (0-1) ordinal of highest EffortLevel
///   [11] hf_production_ratio  (0-1) fraction at Production|Research
///   [12] hf_dl_weighted_maturity (0-1) download-weighted avg maturity
///   [13] hf_alignment_diversity (0-1) distinct alignment methods / 4
///   [14] hf_maturity_trend    (0-1) mapped Pearson-r of effort vs time
///
///   Research (15):
///   [15] hf_research          (binary)
///
///   Sales decomposed (16-19):
///   [16] hf_sales_b2b_core    (binary) IntentScoring|LeadClassification|CrmIntelligence
///   [17] hf_sales_outreach    (binary) EmailOutreach|SalesConversation
///   [18] hf_sales_funnel      (0-1) distinct categories / 7
///   [19] hf_sales_platform    (binary) General category (brand names)
///
///   Training signals (20-23):
///   [20] hf_research_intensity (0-1) per-repo PreTraining+CustomDataset+ArxivCitation
///   [21] hf_infra_sophistication (0-1) weighted MoE/LargeParams/LargeContext/CustomArch
///   [22] hf_signal_breadth    (0-1) repos with any signal / total repos
///   [23] hf_domain_nlp_focus  (0-1) NerLabels+LargeContext presence
///
///   Architecture diversity (24-28):
///   [24] hf_library_sophistication (0-1) tiered lib scoring
///   [25] hf_pipeline_diversity (0-1) distinct modality buckets / 4
///   [26] hf_custom_arch_ratio (0-1) non-standard model types / total
///   [27] hf_framework_diversity (0-1) distinct frameworks / 4
///   [28] hf_moe_ratio         (0-1) MoE models / total
///
///   Download signals (29-33):
///   [29] hf_download_scale    (0-1) ln(1+total)/ln(1+10M)
///   [30] hf_download_per_model (0-1) ln(1+avg)/ln(1+500K)
///   [31] hf_top_model_dominance (0-1) max_dl/total_dl
///   [32] hf_likes_per_download (0-1) ratio*10 capped
///   [33] hf_download_breadth  (0-1) fraction models with >100 dl
///
///   Temporal (34-37):
///   [34] hf_recency           (0-1) exp(-days/180)
///   [35] hf_acceleration      (0-1) recent90/older90
///   [36] hf_longevity         (0-1) span_days/730
///   [37] hf_burst_intensity   (0-1) max_weekly_burst/5
///
///   Cross-signal interactions (38-43):
///   [38] ix_research_x_seniority  features[15] * features[2]
///   [39] ix_score_x_tech          features[7] * features[4]
///   [40] ix_training_x_production features[9] * features[11]
///   [41] ix_depth_x_industry      features[8] * features[0]
///   [42] ix_sales_x_department    features[18] * features[3]
///   [43] ix_hf_threshold          (features[7] > 0.6) as f32
pub const FEATURE_COUNT: usize = 44;

/// Number of base features (before interaction terms).
pub const BASE_FEATURE_COUNT: usize = 38;

/// Number of cross-signal interaction features.
pub const INTERACTION_COUNT: usize = 6;

// ── HuggingFace company-level signals ────────────────────────────────────────

/// Pre-computed HF signals for a company, derived from an HF org profile.
/// All values are normalized to [0, 1] for direct use as ML features.
/// Maps to feature indices 7-37 in the 44-feature layout.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct HfCompanySignals {
    // ── Composite + depth (features 7-9) ─────────────────────────────────
    /// Composite HF score (0-1), from `compute_hf_score()`.
    pub hf_score: f32,
    /// log(1 + model_count) / log(1 + 20), capped at 1.0.
    pub model_depth: f32,
    /// Distinct training signal types / 5, capped at 1.0.
    pub training_depth: f32,

    // ── Maturity decomposed (features 10-14) ─────────────────────────────
    /// Ordinal of highest EffortLevel across all models (0-1).
    pub max_effort: f32,
    /// Fraction of models at Production or Research effort level (0-1).
    pub production_ratio: f32,
    /// Download-weighted average maturity (0-1).
    pub dl_weighted_maturity: f32,
    /// Distinct alignment methods / 4 (0-1).
    pub alignment_diversity: f32,
    /// Mapped Pearson-r of effort vs time (0-1, 0.5 = neutral).
    pub maturity_trend: f32,

    // ── Research (feature 15) ────────────────────────────────────────────
    /// 1.0 if org has pre-training evidence OR arxiv papers, else 0.0.
    pub research: f32,

    // ── Sales decomposed (features 16-19) ────────────────────────────────
    /// 1.0 if IntentScoring|LeadClassification|CrmIntelligence present.
    pub sales_b2b_core: f32,
    /// 1.0 if EmailOutreach|SalesConversation present.
    pub sales_outreach: f32,
    /// Distinct sales categories / 7, capped at 1.0.
    pub sales_funnel: f32,
    /// 1.0 if General sales category (brand names) present.
    pub sales_platform: f32,

    // ── Training signals (features 20-23) ────────────────────────────────
    /// Per-repo PreTraining+CustomDataset+ArxivCitation intensity (0-1).
    pub research_intensity: f32,
    /// Weighted MoE/LargeParams/LargeContext/CustomArch score (0-1).
    pub infra_sophistication: f32,
    /// Repos with any training signal / total repos (0-1).
    pub signal_breadth: f32,
    /// NerLabels+LargeContext presence indicator (0-1).
    pub domain_nlp_focus: f32,

    // ── Architecture diversity (features 24-28) ──────────────────────────
    /// Tiered library scoring (0-1).
    pub library_sophistication: f32,
    /// Distinct modality buckets / 4 (0-1).
    pub pipeline_diversity: f32,
    /// Non-standard model types / total models (0-1).
    pub custom_arch_ratio: f32,
    /// Distinct frameworks / 4 (0-1).
    pub framework_diversity: f32,
    /// MoE models / total models (0-1).
    pub moe_ratio: f32,

    // ── Download signals (features 29-33) ────────────────────────────────
    /// ln(1+total_downloads) / ln(1+10M), capped at 1.0.
    pub download_scale: f32,
    /// ln(1+avg_downloads_per_model) / ln(1+500K), capped at 1.0.
    pub download_per_model: f32,
    /// max_model_downloads / total_downloads (0-1).
    pub top_model_dominance: f32,
    /// (total_likes / total_downloads) * 10, capped at 1.0.
    pub likes_per_download: f32,
    /// Fraction of models with >100 downloads (0-1).
    pub download_breadth: f32,

    // ── Temporal (features 34-37) ────────────────────────────────────────
    /// exp(-days_since_last_update / 180), (0-1).
    pub recency: f32,
    /// recent_90_count / older_90_count ratio, capped at 1.0.
    pub acceleration: f32,
    /// span_days / 730, capped at 1.0.
    pub longevity: f32,
    /// max_weekly_burst / 5, capped at 1.0.
    pub burst_intensity: f32,
}

/// Raw inputs for constructing `HfCompanySignals` with full fidelity.
///
/// Use `HfCompanySignals::from_inputs()` to build a fully-populated signals struct.
#[derive(Debug, Clone, Default)]
pub struct HfRawInputs {
    // Composite
    pub hf_score: f32,
    pub model_count: usize,
    pub training_signal_types: usize,
    // Maturity
    pub max_effort_ordinal: f32,
    pub production_ratio: f32,
    pub dl_weighted_maturity: f32,
    pub alignment_method_count: usize,
    pub maturity_trend: f32,
    // Research
    pub has_pretraining: bool,
    pub arxiv_count: usize,
    // Sales
    pub has_b2b_core: bool,
    pub has_outreach: bool,
    pub sales_category_count: usize,
    pub has_general_sales: bool,
    // Training signals
    pub research_intensity: f32,
    pub infra_sophistication: f32,
    pub signal_breadth: f32,
    pub domain_nlp_focus: f32,
    // Architecture diversity
    pub library_sophistication: f32,
    pub pipeline_diversity: f32,
    pub custom_arch_ratio: f32,
    pub framework_diversity: f32,
    pub moe_ratio: f32,
    // Downloads
    pub total_downloads: u64,
    pub model_count_for_avg: usize,
    pub total_likes: u64,
    pub models_with_downloads_above_100: usize,
    pub max_model_downloads: u64,
    // Temporal
    pub days_since_last_update: f32,
    pub recent_90_count: usize,
    pub older_90_count: usize,
    pub span_days: f32,
    pub max_weekly_burst: usize,
}

impl HfCompanySignals {
    /// Build signals from the old 7-argument interface (backward compatible).
    ///
    /// New fields are populated with sensible defaults/proxies from the available data.
    pub fn from_raw(
        hf_score: f32,
        model_count: usize,
        training_signal_types: usize,
        avg_maturity: f32,
        has_pretraining: bool,
        arxiv_count: usize,
        sales_signal_count: usize,
    ) -> Self {
        Self {
            hf_score: hf_score.clamp(0.0, 1.0),
            model_depth: ((1.0 + model_count as f32).ln() / (1.0 + 20.0_f32).ln()).min(1.0),
            training_depth: (training_signal_types as f32 / 5.0).min(1.0),
            // Maturity decomposed — proxied from the old avg_maturity
            max_effort: avg_maturity.clamp(0.0, 1.0),
            production_ratio: if avg_maturity > 0.8 { 0.5 } else { 0.0 },
            dl_weighted_maturity: avg_maturity.clamp(0.0, 1.0),
            alignment_diversity: 0.0,
            maturity_trend: 0.5, // neutral
            // Research
            research: if has_pretraining || arxiv_count > 0 { 1.0 } else { 0.0 },
            // Sales decomposed — proxied from old count
            sales_b2b_core: 0.0,
            sales_outreach: 0.0,
            sales_funnel: (sales_signal_count as f32 / 7.0).min(1.0),
            sales_platform: 0.0,
            // Training signals — no data from old interface
            research_intensity: 0.0,
            infra_sophistication: 0.0,
            signal_breadth: 0.0,
            domain_nlp_focus: 0.0,
            // Architecture diversity — no data
            library_sophistication: 0.0,
            pipeline_diversity: 0.0,
            custom_arch_ratio: 0.0,
            framework_diversity: 0.0,
            moe_ratio: 0.0,
            // Downloads — no data
            download_scale: 0.0,
            download_per_model: 0.0,
            top_model_dominance: 0.0,
            likes_per_download: 0.0,
            download_breadth: 0.0,
            // Temporal — no data
            recency: 0.5, // neutral
            acceleration: 0.5, // neutral
            longevity: 0.0,
            burst_intensity: 0.0,
        }
    }

    /// Build signals from a comprehensive raw inputs struct.
    pub fn from_inputs(inp: &HfRawInputs) -> Self {
        let model_count_f = inp.model_count_for_avg.max(inp.model_count) as f32;
        let total_dl = inp.total_downloads as f32;

        Self {
            hf_score: inp.hf_score.clamp(0.0, 1.0),
            model_depth: ((1.0 + inp.model_count as f32).ln() / (1.0 + 20.0_f32).ln()).min(1.0),
            training_depth: (inp.training_signal_types as f32 / 5.0).min(1.0),
            // Maturity
            max_effort: inp.max_effort_ordinal.clamp(0.0, 1.0),
            production_ratio: inp.production_ratio.clamp(0.0, 1.0),
            dl_weighted_maturity: inp.dl_weighted_maturity.clamp(0.0, 1.0),
            alignment_diversity: (inp.alignment_method_count as f32 / 4.0).min(1.0),
            maturity_trend: inp.maturity_trend.clamp(0.0, 1.0),
            // Research
            research: if inp.has_pretraining || inp.arxiv_count > 0 { 1.0 } else { 0.0 },
            // Sales
            sales_b2b_core: if inp.has_b2b_core { 1.0 } else { 0.0 },
            sales_outreach: if inp.has_outreach { 1.0 } else { 0.0 },
            sales_funnel: (inp.sales_category_count as f32 / 7.0).min(1.0),
            sales_platform: if inp.has_general_sales { 1.0 } else { 0.0 },
            // Training signals
            research_intensity: inp.research_intensity.clamp(0.0, 1.0),
            infra_sophistication: inp.infra_sophistication.clamp(0.0, 1.0),
            signal_breadth: inp.signal_breadth.clamp(0.0, 1.0),
            domain_nlp_focus: inp.domain_nlp_focus.clamp(0.0, 1.0),
            // Architecture diversity
            library_sophistication: inp.library_sophistication.clamp(0.0, 1.0),
            pipeline_diversity: inp.pipeline_diversity.clamp(0.0, 1.0),
            custom_arch_ratio: inp.custom_arch_ratio.clamp(0.0, 1.0),
            framework_diversity: inp.framework_diversity.clamp(0.0, 1.0),
            moe_ratio: inp.moe_ratio.clamp(0.0, 1.0),
            // Downloads
            download_scale: ((1.0 + total_dl).ln() / (1.0 + 10_000_000.0_f32).ln()).min(1.0),
            download_per_model: if model_count_f > 0.0 {
                ((1.0 + total_dl / model_count_f).ln() / (1.0 + 500_000.0_f32).ln()).min(1.0)
            } else {
                0.0
            },
            top_model_dominance: if total_dl > 0.0 {
                (inp.max_model_downloads as f32 / total_dl).min(1.0)
            } else {
                0.0
            },
            likes_per_download: if total_dl > 0.0 {
                ((inp.total_likes as f32 / total_dl) * 10.0).min(1.0)
            } else {
                0.0
            },
            download_breadth: if model_count_f > 0.0 {
                (inp.models_with_downloads_above_100 as f32 / model_count_f).min(1.0)
            } else {
                0.0
            },
            // Temporal
            recency: (-inp.days_since_last_update / 180.0).exp().clamp(0.0, 1.0),
            acceleration: if inp.older_90_count > 0 {
                (inp.recent_90_count as f32 / inp.older_90_count as f32).min(1.0)
            } else if inp.recent_90_count > 0 {
                1.0
            } else {
                0.5
            },
            longevity: (inp.span_days / 730.0).min(1.0),
            burst_intensity: (inp.max_weekly_burst as f32 / 5.0).min(1.0),
        }
    }
}

/// Build `HfCompanySignals` directly from an `hf::OrgProfile`.
#[cfg(feature = "kernel-hf")]
impl HfCompanySignals {
    /// Standard model types for custom architecture detection.
    /// Defined locally so we don't need to import from the hf crate.
    const STANDARD_MODEL_TYPES: &[&str] = &[
        "bert", "roberta", "distilbert", "albert", "electra", "deberta", "deberta-v2",
        "xlnet", "longformer", "bigbird",
        "gpt2", "gpt_neo", "gpt_neox", "llama", "mistral", "mixtral", "gemma", "gemma2",
        "phi", "phi3", "qwen2", "qwen2_moe", "falcon", "mpt", "cohere", "starcoder2", "codellama",
        "t5", "bart", "pegasus", "marian",
        "whisper", "wav2vec2",
        "vit", "clip", "deit", "swin", "resnet", "convnext",
        "stable-diffusion", "sdxl",
    ];

    pub fn from_org_profile(profile: &hf::OrgProfile) -> Self {
        use std::collections::{HashMap, HashSet};

        // ── Helpers ──────────────────────────────────────────────────────────

        let effort_ordinal = |e: &hf::EffortLevel| -> f32 {
            match e {
                hf::EffortLevel::Production => 1.0,
                hf::EffortLevel::Research => 0.85,
                hf::EffortLevel::Moderate => 0.7,
                hf::EffortLevel::Experiment => 0.35,
                hf::EffortLevel::Trivial => 0.15,
            }
        };

        fn iso_to_epoch_days(s: &str) -> Option<i64> {
            if s.len() < 10 { return None; }
            let y: i64 = s.get(0..4)?.parse().ok()?;
            let m: i64 = s.get(5..7)?.parse().ok()?;
            let d: i64 = s.get(8..10)?.parse().ok()?;
            let m_adj = if m <= 2 { m + 9 } else { m - 3 };
            let y_adj = if m <= 2 { y - 1 } else { y };
            Some(365 * y_adj + y_adj / 4 - y_adj / 100 + y_adj / 400 + (m_adj * 153 + 2) / 5 + d - 1)
        }

        fn today_epoch_days() -> i64 {
            let secs = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64;
            secs / 86400 + 719468
        }

        // ── Composite + depth (features 7-9) ────────────────────────────────

        let hf_score = hf::OrgScanner::compute_hf_score(profile);
        let model_count = profile.models.len();

        let signal_types: HashSet<_> = profile
            .training_signals
            .iter()
            .map(|s| std::mem::discriminant(&s.signal_type))
            .collect();
        let training_signal_types = signal_types.len();

        // ── Maturity (features 10-14) ────────────────────────────────────────

        let max_effort = profile
            .model_maturity
            .iter()
            .map(|m| effort_ordinal(&m.effort_level))
            .fold(0.0_f32, f32::max);

        let production_research_count = profile
            .model_maturity
            .iter()
            .filter(|m| matches!(m.effort_level, hf::EffortLevel::Production | hf::EffortLevel::Research))
            .count();
        let production_ratio = if profile.model_maturity.is_empty() {
            0.0
        } else {
            production_research_count as f32 / profile.model_maturity.len() as f32
        };

        // Download-weighted average maturity (weight by m.downloads)
        let dl_weighted_maturity = {
            let total_dl: u64 = profile.model_maturity.iter().map(|m| m.downloads).sum();
            if total_dl == 0 {
                // Fallback to uniform average
                if profile.model_maturity.is_empty() {
                    0.0
                } else {
                    let sum: f32 = profile.model_maturity.iter()
                        .map(|m| effort_ordinal(&m.effort_level))
                        .sum();
                    sum / profile.model_maturity.len() as f32
                }
            } else {
                let weighted_sum: f64 = profile.model_maturity.iter()
                    .map(|m| effort_ordinal(&m.effort_level) as f64 * m.downloads as f64)
                    .sum();
                (weighted_sum / total_dl as f64) as f32
            }
        };

        // Alignment diversity: distinct alignment methods / 4
        let alignment_method_count = {
            let methods: HashSet<&str> = profile.model_maturity.iter()
                .filter_map(|m| m.alignment_method.as_deref())
                .collect();
            methods.len()
        };

        // Maturity trend: Pearson-r of (creation-time rank, effort ordinal)
        // Join model_maturity repo_ids to profile.models for created_at
        let maturity_trend = {
            let created_map: HashMap<&str, &str> = profile.models.iter()
                .filter_map(|m| {
                    let id = m.repo_id.as_deref()?;
                    let ca = m.created_at.as_deref()?;
                    Some((id, ca))
                })
                .collect();

            // Build (created_at, effort_ordinal) pairs
            let mut pairs: Vec<(&str, f32)> = profile.model_maturity.iter()
                .filter_map(|m| {
                    let ca = created_map.get(m.repo_id.as_str())?;
                    Some((*ca, effort_ordinal(&m.effort_level)))
                })
                .collect();

            if pairs.len() < 2 {
                0.5 // neutral
            } else {
                // Sort lexicographically by ISO date (sorts correctly)
                pairs.sort_by(|a, b| a.0.cmp(b.0));

                // Pearson-r of (rank, effort_ordinal)
                let n = pairs.len() as f64;
                let mut sum_x = 0.0_f64;
                let mut sum_y = 0.0_f64;
                let mut sum_xy = 0.0_f64;
                let mut sum_x2 = 0.0_f64;
                let mut sum_y2 = 0.0_f64;
                for (i, (_, eff)) in pairs.iter().enumerate() {
                    let x = i as f64;
                    let y = *eff as f64;
                    sum_x += x;
                    sum_y += y;
                    sum_xy += x * y;
                    sum_x2 += x * x;
                    sum_y2 += y * y;
                }
                let num = n * sum_xy - sum_x * sum_y;
                let den = ((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)).sqrt();
                let r = if den.abs() < 1e-12 { 0.0 } else { num / den };
                // Map [-1, 1] to [0, 1]
                ((r + 1.0) / 2.0) as f32
            }
        };

        // ── Research (feature 15) ────────────────────────────────────────────

        let has_pretraining = profile
            .training_signals
            .iter()
            .any(|s| s.signal_type == hf::TrainingSignalType::PreTraining);
        let arxiv_count = profile.arxiv_links.len();

        // ── Sales (features 16-19) ───────────────────────────────────────────

        let has_b2b_core = profile.sales_signals.iter().any(|sig| matches!(
            sig.category,
            hf::SalesCategory::IntentScoring
                | hf::SalesCategory::LeadClassification
                | hf::SalesCategory::CrmIntelligence
        ));

        let has_outreach = profile.sales_signals.iter().any(|sig| matches!(
            sig.category,
            hf::SalesCategory::EmailOutreach | hf::SalesCategory::SalesConversation
        ));

        let sales_category_count = {
            let cats: HashSet<_> = profile.sales_signals.iter()
                .map(|sig| std::mem::discriminant(&sig.category))
                .collect();
            cats.len()
        };

        let has_general_sales = profile.sales_signals.iter().any(|sig|
            matches!(sig.category, hf::SalesCategory::General)
        );

        // ── Training signals (features 20-23) ───────────────────────────────

        let total_models = model_count.max(1);

        // Group training_signals by repo_id
        let mut signals_by_repo: HashMap<&str, Vec<&hf::TrainingSignal>> = HashMap::new();
        for sig in &profile.training_signals {
            signals_by_repo.entry(sig.repo_id.as_str()).or_default().push(sig);
        }

        // research_intensity: per-repo check for PreTraining+CustomDataset+ArxivCitation
        let research_intensity = {
            let mut count = 0usize;
            for sigs in signals_by_repo.values() {
                let has_pt = sigs.iter().any(|s| s.signal_type == hf::TrainingSignalType::PreTraining);
                let has_cd = sigs.iter().any(|s| s.signal_type == hf::TrainingSignalType::CustomDataset);
                let has_ax = sigs.iter().any(|s| s.signal_type == hf::TrainingSignalType::ArxivCitation);
                if has_pt && has_cd && has_ax { count += 1; }
            }
            count as f32 / total_models as f32
        };

        // infra_sophistication: weighted MoE(3)+LargeParams(2)+LargeContext(2)+CustomArch(1) / 8
        let infra_sophistication = {
            let mut total_score = 0.0_f32;
            for sigs in signals_by_repo.values() {
                let mut repo_score = 0.0_f32;
                for sig in sigs {
                    repo_score += match sig.signal_type {
                        hf::TrainingSignalType::MoEArchitecture => 3.0,
                        hf::TrainingSignalType::LargeParamCount => 2.0,
                        hf::TrainingSignalType::LargeContext => 2.0,
                        hf::TrainingSignalType::CustomArchitecture => 1.0,
                        _ => 0.0,
                    };
                }
                total_score += (repo_score / 8.0).min(1.0);
            }
            total_score / total_models as f32
        };

        // signal_breadth: repos with any signal / total models
        let signal_breadth = signals_by_repo.len() as f32 / total_models as f32;

        // domain_nlp_focus: (NerLabels+LargeContext presence)/2 * 0.6 + NLP pipeline tag ratio * 0.4
        let domain_nlp_focus = {
            let all_sigs: Vec<&hf::TrainingSignal> = profile.training_signals.iter().collect();
            let has_ner = all_sigs.iter().any(|s| s.signal_type == hf::TrainingSignalType::NerLabels);
            let has_lc = all_sigs.iter().any(|s| s.signal_type == hf::TrainingSignalType::LargeContext);
            let ner_lc = (has_ner as u8 as f32 + has_lc as u8 as f32) / 2.0;

            let nlp_tags = ["text-generation", "text-classification", "token-classification",
                "question-answering", "summarization", "translation", "fill-mask",
                "text2text-generation", "sentence-similarity", "conversational",
                "text-to-text"];
            let total_tag_count: usize = profile.pipeline_tags.iter().map(|(_, c)| c).sum();
            let nlp_tag_count: usize = profile.pipeline_tags.iter()
                .filter(|(tag, _)| nlp_tags.iter().any(|&t| tag == t))
                .map(|(_, c)| c)
                .sum();
            let nlp_ratio = if total_tag_count > 0 {
                nlp_tag_count as f32 / total_tag_count as f32
            } else {
                0.0
            };

            ner_lc * 0.6 + nlp_ratio * 0.4
        };

        // ── Architecture diversity (features 24-28) ──────────────────────────

        // library_sophistication: tiered scoring
        let library_sophistication = {
            let mut score = 0.0_f32;
            for (lib, _) in &profile.libraries_used {
                let lib_lower = lib.to_lowercase();
                score += match lib_lower.as_str() {
                    "vllm" | "triton" | "trl" => 3.0,
                    "tensorrt" | "onnx" | "deepspeed" | "peft" | "bitsandbytes"
                        | "accelerate" | "jax" => 2.0,
                    "transformers" | "pytorch" | "tensorflow" => 1.0,
                    _ => 0.0,
                };
            }
            (score / 15.0).min(1.0)
        };

        // pipeline_diversity: map pipeline_tags to 4 modality buckets
        let pipeline_diversity = {
            let text_tags = ["text-generation", "text-classification", "token-classification",
                "question-answering", "summarization", "translation", "fill-mask",
                "text2text-generation", "sentence-similarity", "conversational",
                "text-to-text", "feature-extraction", "zero-shot-classification"];
            let vision_tags = ["image-classification", "object-detection", "image-segmentation",
                "image-to-text", "text-to-image", "image-to-image", "depth-estimation",
                "visual-question-answering", "image-feature-extraction"];
            let audio_tags = ["text-to-speech", "automatic-speech-recognition",
                "audio-classification", "audio-to-audio", "voice-activity-detection"];
            let multimodal_tags = ["multimodal", "video-classification", "document-question-answering",
                "video-text-to-text", "image-text-to-text", "any-to-any"];

            let mut buckets = [false; 4];
            for (tag, _) in &profile.pipeline_tags {
                if text_tags.iter().any(|&t| tag == t) { buckets[0] = true; }
                if vision_tags.iter().any(|&t| tag == t) { buckets[1] = true; }
                if audio_tags.iter().any(|&t| tag == t) { buckets[2] = true; }
                if multimodal_tags.iter().any(|&t| tag == t) { buckets[3] = true; }
            }
            let distinct = buckets.iter().filter(|&&b| b).count();
            distinct as f32 / 4.0
        };

        // custom_arch_ratio: model_configs with model_type NOT in standard types / total
        let custom_arch_ratio = {
            if profile.model_configs.is_empty() {
                0.0
            } else {
                let custom_count = profile.model_configs.values()
                    .filter(|cfg| {
                        if let Some(mt) = cfg.get("model_type").and_then(|v| v.as_str()) {
                            !Self::STANDARD_MODEL_TYPES.iter()
                                .any(|&std| mt.eq_ignore_ascii_case(std))
                        } else {
                            false
                        }
                    })
                    .count();
                custom_count as f32 / profile.model_configs.len() as f32
            }
        };

        // framework_diversity: distinct frameworks / 4
        let framework_diversity = {
            let frameworks = ["pytorch", "jax", "tensorflow", "flax", "onnx", "tensorrt"];
            let distinct = profile.libraries_used.iter()
                .filter(|(lib, _)| {
                    let ll = lib.to_lowercase();
                    frameworks.iter().any(|&f| ll == f)
                })
                .count();
            (distinct as f32 / 4.0).min(1.0)
        };

        // moe_ratio: model_configs with num_experts/num_local_experts/n_routed_experts > 1 / total
        let moe_ratio = {
            if profile.model_configs.is_empty() {
                0.0
            } else {
                let moe_count = profile.model_configs.values()
                    .filter(|cfg| {
                        let expert_keys = ["num_experts", "num_local_experts", "n_routed_experts"];
                        expert_keys.iter().any(|key|
                            cfg.get(*key).and_then(|v| v.as_u64()).map_or(false, |n| n > 1)
                        )
                    })
                    .count();
                moe_count as f32 / profile.model_configs.len() as f32
            }
        };

        // ── Downloads (features 29-33) ───────────────────────────────────────

        let total_downloads = profile.total_downloads;
        let total_likes: u64 = profile.models.iter()
            .chain(profile.datasets.iter())
            .chain(profile.spaces.iter())
            .filter_map(|r| r.likes)
            .sum();
        let max_model_downloads: u64 = profile.models.iter()
            .filter_map(|m| m.downloads)
            .max()
            .unwrap_or(0);
        let models_with_downloads_above_100: usize = profile.models.iter()
            .filter(|m| m.downloads.map_or(false, |d| d > 100))
            .count();

        // ── Temporal (features 34-37) ────────────────────────────────────────

        let today = today_epoch_days();

        let all_repos = profile.models.iter()
            .chain(profile.datasets.iter())
            .chain(profile.spaces.iter());

        let mut all_created_days: Vec<i64> = Vec::new();
        let mut max_last_modified: Option<i64> = None;

        for repo in all_repos {
            if let Some(ca) = repo.created_at.as_deref().and_then(iso_to_epoch_days) {
                all_created_days.push(ca);
            }
            if let Some(lm) = repo.last_modified.as_deref().and_then(iso_to_epoch_days) {
                max_last_modified = Some(max_last_modified.map_or(lm, |cur: i64| cur.max(lm)));
            }
        }

        let days_since_last_update = max_last_modified
            .map(|lm| (today - lm).max(0) as f32)
            .unwrap_or(365.0);

        let recent_90_count = all_created_days.iter()
            .filter(|&&d| today - d <= 90)
            .count();
        let older_90_count = all_created_days.iter()
            .filter(|&&d| { let age = today - d; age > 90 && age <= 180 })
            .count();

        let span_days = if all_created_days.len() < 2 {
            0.0
        } else {
            let min_d = *all_created_days.iter().min().unwrap();
            let max_d = *all_created_days.iter().max().unwrap();
            (max_d - min_d) as f32
        };

        // max_weekly_burst: sliding window of width 7 on sorted created_days, two-pointer scan
        let max_weekly_burst = {
            let mut sorted = all_created_days.clone();
            sorted.sort_unstable();
            if sorted.is_empty() {
                0usize
            } else {
                let mut max_burst = 0usize;
                let mut left = 0usize;
                for right in 0..sorted.len() {
                    while sorted[right] - sorted[left] > 7 {
                        left += 1;
                    }
                    max_burst = max_burst.max(right - left + 1);
                }
                max_burst
            }
        };

        // ── Build HfRawInputs and call from_inputs() ────────────────────────

        let inputs = HfRawInputs {
            hf_score,
            model_count,
            training_signal_types,
            max_effort_ordinal: max_effort,
            production_ratio,
            dl_weighted_maturity,
            alignment_method_count,
            maturity_trend,
            has_pretraining,
            arxiv_count,
            has_b2b_core,
            has_outreach,
            sales_category_count,
            has_general_sales,
            research_intensity,
            infra_sophistication,
            signal_breadth,
            domain_nlp_focus,
            library_sophistication,
            pipeline_diversity,
            custom_arch_ratio,
            framework_diversity,
            moe_ratio,
            total_downloads,
            model_count_for_avg: model_count,
            total_likes,
            models_with_downloads_above_100,
            max_model_downloads,
            days_since_last_update,
            recent_90_count,
            older_90_count,
            span_days,
            max_weekly_burst,
        };

        Self::from_inputs(&inputs)
    }
}

/// ICP matching criteria — defines what signals to look for in contact records.
pub struct IcpMatcher {
    /// Target industries (lowercase). A contact's industry matches if any substring matches.
    pub target_industries: Vec<String>,
    /// Target seniorities (e.g., "VP", "Director", "C-level").
    pub target_seniorities: Vec<String>,
    /// Target departments (e.g., "Engineering", "AI", "ML").
    pub target_departments: Vec<String>,
    /// Target tech stack keywords.
    pub target_tech: Vec<String>,
    /// Employee range (min, max).
    pub employee_range: (u32, u32),
}

impl IcpMatcher {
    /// Check if a value matches any target (case-insensitive substring).
    fn matches_any(value: &str, targets: &[String]) -> bool {
        let lower = value.to_lowercase();
        targets.iter().any(|t| lower.contains(t.as_str()))
    }

    /// Score a contact's tech overlap (0-10 scale).
    pub fn tech_overlap(&self, tech_stack: &str) -> u8 {
        if self.target_tech.is_empty() { return 0; }
        let lower = tech_stack.to_lowercase();
        let hits = self.target_tech.iter().filter(|t| lower.contains(t.as_str())).count();
        ((hits as f32 / self.target_tech.len() as f32) * 10.0).min(10.0) as u8
    }

    /// Populate a single slot in a ContactBatch from contact/company fields.
    #[allow(clippy::too_many_arguments)]
    pub fn populate_slot(
        &self,
        batch: &mut ContactBatch,
        idx: usize,
        industry: &str,
        employee_count: u32,
        seniority: &str,
        title: &str,
        tech_stack: &str,
        email_status: &str,
        days_since_update: u16,
    ) {
        batch.industry_match[idx] = Self::matches_any(industry, &self.target_industries) as u8;
        batch.employee_in_range[idx] = (employee_count >= self.employee_range.0
            && employee_count <= self.employee_range.1) as u8;
        batch.seniority_match[idx] = Self::matches_any(seniority, &self.target_seniorities) as u8;
        batch.department_match[idx] = Self::matches_any(title, &self.target_departments) as u8;
        batch.tech_overlap[idx] = self.tech_overlap(tech_stack);
        batch.email_verified[idx] = match email_status {
            "verified" => 2,
            "catch-all" | "catchall" => 1,
            _ => 0,
        };
        batch.recency_days[idx] = days_since_update;
    }
}

impl Default for IcpMatcher {
    fn default() -> Self {
        Self {
            target_industries: vec!["ai".into(), "ml".into(), "saas".into(), "infrastructure".into()],
            target_seniorities: vec!["vp".into(), "director".into(), "head".into(), "chief".into(), "cto".into(), "ceo".into()],
            target_departments: vec!["engineering".into(), "ai".into(), "ml".into(), "data".into(), "platform".into()],
            target_tech: vec!["rust".into(), "python".into(), "kubernetes".into(), "pytorch".into(), "tensorflow".into()],
            employee_range: (20, 500),
        }
    }
}

/// ICP (Ideal Customer Profile) weight configuration for scoring.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpProfile {
    pub industry_weight: f32,    // default 25
    pub employee_weight: f32,    // default 15
    pub seniority_weight: f32,   // default 25
    pub department_weight: f32,  // default 15
    pub tech_weight: f32,        // default 10 (0-10 scale input)
    pub email_weight: f32,       // default 5
    /// HuggingFace composite signal weight (0-1 input).
    #[serde(default = "default_hf_weight")]
    pub hf_weight: f32,          // default 15
}

fn default_hf_weight() -> f32 { 15.0 }

impl IcpProfile {
    /// Load weights from a JSON file, falling back to defaults on any error.
    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    /// Persist weights to a JSON file.
    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }

    /// Return weights as an array (same order as LogisticScorer features, minus recency).
    pub fn as_weights(&self) -> [f32; 7] {
        [
            self.industry_weight,
            self.employee_weight,
            self.seniority_weight,
            self.department_weight,
            self.tech_weight,
            self.email_weight,
            self.hf_weight,
        ]
    }
}

impl Default for IcpProfile {
    fn default() -> Self {
        Self {
            industry_weight: 25.0,
            employee_weight: 15.0,
            seniority_weight: 25.0,
            department_weight: 15.0,
            tech_weight: 10.0,
            email_weight: 5.0,
            hf_weight: 15.0,
        }
    }
}

/// Batch of contacts in Structure-of-Arrays layout for vectorized scoring.
/// Cache-line aligned (64 bytes) for optimal NEON/SSE auto-vectorization.
/// Process up to 256 contacts per batch.
#[repr(C, align(64))]
pub struct ContactBatch {
    // Input columns (parallel arrays — same index = same contact)
    pub industry_match: [u8; 256],    // 1 if matches ICP industry
    pub employee_in_range: [u8; 256], // 1 if in ICP employee range
    pub seniority_match: [u8; 256],   // 1 if matches target seniority
    pub department_match: [u8; 256],  // 1 if matches target department
    pub tech_overlap: [u8; 256],      // 0-10 scale of tech stack overlap
    pub email_verified: [u8; 256],    // 2=verified, 1=catch-all, 0=unknown
    pub recency_days: [u16; 256],     // days since last update

    // Semantic embedding features (from BGE cosine similarity)
    pub semantic_icp_score: [f32; 256], // cosine(company_emb, icp_emb), 0.0 if unavailable

    // HuggingFace company-level signals (same value for all contacts from same company)
    // Composite + depth (features 7-9)
    pub hf_score: [f32; 256],
    pub hf_model_depth: [f32; 256],
    pub hf_training_depth: [f32; 256],
    // Maturity decomposed (features 10-14)
    pub hf_max_effort: [f32; 256],
    pub hf_production_ratio: [f32; 256],
    pub hf_dl_weighted_maturity: [f32; 256],
    pub hf_alignment_diversity: [f32; 256],
    pub hf_maturity_trend: [f32; 256],
    // Research (feature 15)
    pub hf_research: [f32; 256],
    // Sales decomposed (features 16-19)
    pub hf_sales_b2b_core: [f32; 256],
    pub hf_sales_outreach: [f32; 256],
    pub hf_sales_funnel: [f32; 256],
    pub hf_sales_platform: [f32; 256],
    // Training signals (features 20-23)
    pub hf_research_intensity: [f32; 256],
    pub hf_infra_sophistication: [f32; 256],
    pub hf_signal_breadth: [f32; 256],
    pub hf_domain_nlp_focus: [f32; 256],
    // Architecture diversity (features 24-28)
    pub hf_library_sophistication: [f32; 256],
    pub hf_pipeline_diversity: [f32; 256],
    pub hf_custom_arch_ratio: [f32; 256],
    pub hf_framework_diversity: [f32; 256],
    pub hf_moe_ratio: [f32; 256],
    // Download signals (features 29-33)
    pub hf_download_scale: [f32; 256],
    pub hf_download_per_model: [f32; 256],
    pub hf_top_model_dominance: [f32; 256],
    pub hf_likes_per_download: [f32; 256],
    pub hf_download_breadth: [f32; 256],
    // Temporal (features 34-37)
    pub hf_recency: [f32; 256],
    pub hf_acceleration: [f32; 256],
    pub hf_longevity: [f32; 256],
    pub hf_burst_intensity: [f32; 256],

    // Output
    pub scores: [f32; 256],

    pub count: usize,
}

impl ContactBatch {
    pub fn new() -> Self {
        // Safety: all-zeros is valid for this struct
        unsafe { std::mem::zeroed() }
    }

    /// Populate HuggingFace signals for a batch slot (company-level, same for all contacts).
    pub fn populate_hf_slot(&mut self, idx: usize, signals: &HfCompanySignals) {
        // Composite + depth (7-9)
        self.hf_score[idx] = signals.hf_score;
        self.hf_model_depth[idx] = signals.model_depth;
        self.hf_training_depth[idx] = signals.training_depth;
        // Maturity decomposed (10-14)
        self.hf_max_effort[idx] = signals.max_effort;
        self.hf_production_ratio[idx] = signals.production_ratio;
        self.hf_dl_weighted_maturity[idx] = signals.dl_weighted_maturity;
        self.hf_alignment_diversity[idx] = signals.alignment_diversity;
        self.hf_maturity_trend[idx] = signals.maturity_trend;
        // Research (15)
        self.hf_research[idx] = signals.research;
        // Sales decomposed (16-19)
        self.hf_sales_b2b_core[idx] = signals.sales_b2b_core;
        self.hf_sales_outreach[idx] = signals.sales_outreach;
        self.hf_sales_funnel[idx] = signals.sales_funnel;
        self.hf_sales_platform[idx] = signals.sales_platform;
        // Training signals (20-23)
        self.hf_research_intensity[idx] = signals.research_intensity;
        self.hf_infra_sophistication[idx] = signals.infra_sophistication;
        self.hf_signal_breadth[idx] = signals.signal_breadth;
        self.hf_domain_nlp_focus[idx] = signals.domain_nlp_focus;
        // Architecture diversity (24-28)
        self.hf_library_sophistication[idx] = signals.library_sophistication;
        self.hf_pipeline_diversity[idx] = signals.pipeline_diversity;
        self.hf_custom_arch_ratio[idx] = signals.custom_arch_ratio;
        self.hf_framework_diversity[idx] = signals.framework_diversity;
        self.hf_moe_ratio[idx] = signals.moe_ratio;
        // Download signals (29-33)
        self.hf_download_scale[idx] = signals.download_scale;
        self.hf_download_per_model[idx] = signals.download_per_model;
        self.hf_top_model_dominance[idx] = signals.top_model_dominance;
        self.hf_likes_per_download[idx] = signals.likes_per_download;
        self.hf_download_breadth[idx] = signals.download_breadth;
        // Temporal (34-37)
        self.hf_recency[idx] = signals.recency;
        self.hf_acceleration[idx] = signals.acceleration;
        self.hf_longevity[idx] = signals.longevity;
        self.hf_burst_intensity[idx] = signals.burst_intensity;
    }

    /// Compute ICP fit scores for the entire batch using default weights.
    pub fn compute_scores(&mut self) {
        self.compute_scores_with(&IcpProfile::default());
    }

    /// Compute ICP fit scores with custom weight profile.
    /// The loop structure is auto-vectorizable by LLVM with -C opt-level=3.
    pub fn compute_scores_with(&mut self, icp: &IcpProfile) {
        let n = self.count;
        let max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight
            + icp.hf_weight;

        for i in 0..n {
            let mut score: f32 = 0.0;

            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;
            score += (self.tech_overlap[i] as f32 / 10.0) * icp.tech_weight;
            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };
            // HF composite signal (0-1)
            score += self.hf_score[i] * icp.hf_weight;

            // Normalize to 0-100
            let icp_fit = (score / max) * 100.0;

            // Recency bonus (0-15 points)
            let recency = match self.recency_days[i] {
                0..=7 => 15.0f32,
                8..=14 => 12.0,
                15..=30 => 9.0,
                31..=90 => 5.0,
                91..=180 => 2.0,
                _ => 0.0,
            };

            self.scores[i] = icp_fit * 0.85 + recency;
        }
    }

    /// Compute ICP fit scores with semantic embedding boost.
    /// When `semantic_icp_score[i] > 0`, it blends with the boolean features.
    /// Semantic boost replaces the binary tech_overlap with continuous similarity.
    pub fn compute_scores_semantic(&mut self, icp: &IcpProfile, semantic_weight: f32) {
        let n = self.count;
        let base_max = icp.industry_weight
            + icp.employee_weight
            + icp.seniority_weight
            + icp.department_weight
            + icp.tech_weight
            + icp.email_weight
            + icp.hf_weight;
        let total_max = base_max + semantic_weight;

        for i in 0..n {
            let mut score: f32 = 0.0;

            score += self.industry_match[i] as f32 * icp.industry_weight;
            score += self.employee_in_range[i] as f32 * icp.employee_weight;
            score += self.seniority_match[i] as f32 * icp.seniority_weight;
            score += self.department_match[i] as f32 * icp.department_weight;

            // Blend: use max(keyword tech_overlap, semantic similarity) for tech scoring
            let keyword_tech = self.tech_overlap[i] as f32 / 10.0;
            let semantic_tech = self.semantic_icp_score[i];
            let blended_tech = keyword_tech.max(semantic_tech);
            score += blended_tech * icp.tech_weight;

            score += match self.email_verified[i] {
                2 => icp.email_weight,
                1 => icp.email_weight * 0.4,
                _ => 0.0,
            };

            // HF composite signal
            score += self.hf_score[i] * icp.hf_weight;

            // Semantic ICP score as additive feature (captures soft signals keywords miss)
            score += self.semantic_icp_score[i] * semantic_weight;

            let icp_fit = (score / total_max) * 100.0;

            let recency = match self.recency_days[i] {
                0..=7 => 15.0f32,
                8..=14 => 12.0,
                15..=30 => 9.0,
                31..=90 => 5.0,
                91..=180 => 2.0,
                _ => 0.0,
            };

            self.scores[i] = icp_fit * 0.85 + recency;
        }
    }

    /// Return top-k indices by score (partial sort via quickselect).
    pub fn top_k(&self, k: usize) -> Vec<usize> {
        let k = k.min(self.count);
        if k == 0 {
            return Vec::new();
        }

        let mut indices: Vec<usize> = (0..self.count).collect();

        indices.select_nth_unstable_by(k.saturating_sub(1), |&a, &b| {
            self.scores[b]
                .partial_cmp(&self.scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        indices.truncate(k);
        indices.sort_by(|&a, &b| {
            self.scores[b]
                .partial_cmp(&self.scores[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        indices
    }

    /// Get a scored result as (index, score) pairs, sorted descending.
    pub fn top_k_scored(&self, k: usize) -> Vec<(usize, f32)> {
        self.top_k(k)
            .into_iter()
            .map(|i| (i, self.scores[i]))
            .collect()
    }

    /// Serialize top-K results as JSON for Python pipeline consumption.
    /// Format: [{"index": N, "score": F}, ...]
    pub fn top_k_json(&self, k: usize) -> String {
        let results = self.top_k_scored(k);
        let mut json = String::from("[");
        for (i, (idx, score)) in results.iter().enumerate() {
            if i > 0 {
                json.push(',');
            }
            json.push_str(&format!(r#"{{"index":{},"score":{:.2}}}"#, idx, score));
        }
        json.push(']');
        json
    }
}

impl Default for ContactBatch {
    fn default() -> Self {
        Self::new()
    }
}

// ── Module 4: ML-based Lead Scoring ──────────────────────────────────────────

/// Welford's online algorithm for running mean/variance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WelfordStats {
    pub count: u64,
    pub mean: f32,
    pub m2: f32,
}

impl WelfordStats {
    pub fn new() -> Self {
        Self { count: 0, mean: 0.0, m2: 0.0 }
    }

    pub fn update(&mut self, value: f32) {
        self.count += 1;
        let delta = value - self.mean;
        self.mean += delta / self.count as f32;
        let delta2 = value - self.mean;
        self.m2 += delta * delta2;
    }

    pub fn variance(&self) -> f32 {
        if self.count < 2 { 1.0 } else { self.m2 / self.count as f32 }
    }

    pub fn std_dev(&self) -> f32 {
        self.variance().sqrt().max(1e-6)
    }

    pub fn normalize(&self, value: f32) -> f32 {
        (value - self.mean) / self.std_dev()
    }
}

impl Default for WelfordStats {
    fn default() -> Self {
        Self::new()
    }
}

/// Logistic regression scorer with learned weights (44-feature layout).
///
/// See `FEATURE_COUNT` doc comment for the full 44-feature layout.
/// An optional semantic ICP score can be appended via `score_with_semantic()`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogisticScorer {
    pub weights: Vec<f32>,
    pub bias: f32,
    pub feature_stats: Vec<WelfordStats>,
    pub trained: bool,
    /// Optional extra weight for semantic ICP score (from BGE embeddings).
    #[serde(default)]
    pub semantic_weight: f32,
}

impl LogisticScorer {
    pub fn new() -> Self {
        Self {
            weights: vec![0.0; FEATURE_COUNT],
            bias: 0.0,
            feature_stats: (0..FEATURE_COUNT).map(|_| WelfordStats::new()).collect(),
            trained: false,
            semantic_weight: 0.0,
        }
    }

    /// Pre-trained weights calibrated for B2B lead scoring (44 features).
    pub fn default_pretrained() -> Self {
        Self {
            weights: vec![
                // Contact base (0-6)
                0.8,   //  0: industry_match
                0.5,   //  1: employee_in_range
                0.8,   //  2: seniority_match
                0.5,   //  3: department_match
                0.3,   //  4: tech_norm
                0.2,   //  5: email_norm
                0.3,   //  6: smooth_recency
                // HF composite + depth (7-9)
                0.7,   //  7: hf_score
                0.4,   //  8: hf_model_depth
                0.5,   //  9: hf_training_depth
                // Maturity decomposed (10-14)
                0.4,   // 10: hf_max_effort
                0.5,   // 11: hf_production_ratio
                0.3,   // 12: hf_dl_weighted_maturity
                0.3,   // 13: hf_alignment_diversity
                0.2,   // 14: hf_maturity_trend
                // Research (15)
                0.6,   // 15: hf_research
                // Sales decomposed (16-19)
                0.7,   // 16: hf_sales_b2b_core
                0.5,   // 17: hf_sales_outreach
                0.4,   // 18: hf_sales_funnel
                0.3,   // 19: hf_sales_platform
                // Training signals (20-23)
                0.7,   // 20: hf_research_intensity
                0.5,   // 21: hf_infra_sophistication
                0.4,   // 22: hf_signal_breadth
                0.3,   // 23: hf_domain_nlp_focus
                // Architecture diversity (24-28)
                0.4,   // 24: hf_library_sophistication
                0.3,   // 25: hf_pipeline_diversity
                0.3,   // 26: hf_custom_arch_ratio
                0.2,   // 27: hf_framework_diversity
                0.3,   // 28: hf_moe_ratio
                // Download signals (29-33)
                0.6,   // 29: hf_download_scale
                0.4,   // 30: hf_download_per_model
                -0.3,  // 31: hf_top_model_dominance (negative: over-concentration is bad)
                0.2,   // 32: hf_likes_per_download
                0.3,   // 33: hf_download_breadth
                // Temporal (34-37)
                0.4,   // 34: hf_recency
                0.5,   // 35: hf_acceleration
                0.2,   // 36: hf_longevity
                0.3,   // 37: hf_burst_intensity
                // Cross-signal interactions (38-43)
                0.5,   // 38: ix_research_x_seniority
                0.4,   // 39: ix_score_x_tech
                0.4,   // 40: ix_training_x_production
                0.3,   // 41: ix_depth_x_industry
                0.3,   // 42: ix_sales_x_department
                0.4,   // 43: ix_hf_threshold
            ],
            bias: -4.5,
            feature_stats: (0..FEATURE_COUNT).map(|_| WelfordStats::new()).collect(),
            trained: true,
            semantic_weight: 0.4,
        }
    }

    /// Numerically stable sigmoid activation.
    #[inline]
    pub fn sigmoid(x: f32) -> f32 {
        1.0 / (1.0 + (-x.clamp(-88.0, 88.0)).exp())
    }

    /// Exponential recency decay: 1.0 at day 0, ~0.5 at day 46, <0.1 at day 180.
    #[inline]
    pub fn smooth_recency(days: u16) -> f32 {
        (-0.015 * days as f32).exp()
    }

    /// Extract a FEATURE_COUNT-element vector from a ContactBatch at a given index.
    ///
    /// Returns 38 base features plus 6 computed interaction terms (44 total).
    pub fn extract_features(batch: &ContactBatch, idx: usize) -> [f32; FEATURE_COUNT] {
        let mut f = [0.0f32; FEATURE_COUNT];

        // Base contact (0-6)
        f[0] = batch.industry_match[idx] as f32;
        f[1] = batch.employee_in_range[idx] as f32;
        f[2] = batch.seniority_match[idx] as f32;
        f[3] = batch.department_match[idx] as f32;
        f[4] = batch.tech_overlap[idx] as f32 / 10.0;
        f[5] = batch.email_verified[idx] as f32 / 2.0;
        f[6] = Self::smooth_recency(batch.recency_days[idx]);

        // HF composite + depth (7-9)
        f[7] = batch.hf_score[idx];
        f[8] = batch.hf_model_depth[idx];
        f[9] = batch.hf_training_depth[idx];

        // Maturity decomposed (10-14)
        f[10] = batch.hf_max_effort[idx];
        f[11] = batch.hf_production_ratio[idx];
        f[12] = batch.hf_dl_weighted_maturity[idx];
        f[13] = batch.hf_alignment_diversity[idx];
        f[14] = batch.hf_maturity_trend[idx];

        // Research (15)
        f[15] = batch.hf_research[idx];

        // Sales decomposed (16-19)
        f[16] = batch.hf_sales_b2b_core[idx];
        f[17] = batch.hf_sales_outreach[idx];
        f[18] = batch.hf_sales_funnel[idx];
        f[19] = batch.hf_sales_platform[idx];

        // Training signals (20-23)
        f[20] = batch.hf_research_intensity[idx];
        f[21] = batch.hf_infra_sophistication[idx];
        f[22] = batch.hf_signal_breadth[idx];
        f[23] = batch.hf_domain_nlp_focus[idx];

        // Architecture diversity (24-28)
        f[24] = batch.hf_library_sophistication[idx];
        f[25] = batch.hf_pipeline_diversity[idx];
        f[26] = batch.hf_custom_arch_ratio[idx];
        f[27] = batch.hf_framework_diversity[idx];
        f[28] = batch.hf_moe_ratio[idx];

        // Download signals (29-33)
        f[29] = batch.hf_download_scale[idx];
        f[30] = batch.hf_download_per_model[idx];
        f[31] = batch.hf_top_model_dominance[idx];
        f[32] = batch.hf_likes_per_download[idx];
        f[33] = batch.hf_download_breadth[idx];

        // Temporal (34-37)
        f[34] = batch.hf_recency[idx];
        f[35] = batch.hf_acceleration[idx];
        f[36] = batch.hf_longevity[idx];
        f[37] = batch.hf_burst_intensity[idx];

        // Cross-signal interactions (38-43) — computed from base features
        f[38] = f[15] * f[2];  // research × seniority
        f[39] = f[7] * f[4];   // hf_score × tech
        f[40] = f[9] * f[11];  // training_depth × production_ratio
        f[41] = f[8] * f[0];   // model_depth × industry
        f[42] = f[18] * f[3];  // sales_funnel × department
        f[43] = if f[7] > 0.6 { 1.0 } else { 0.0 }; // hf_threshold

        f
    }

    /// Score a single feature vector.
    pub fn score(&self, features: &[f32; FEATURE_COUNT]) -> f32 {
        let mut dot = self.bias;
        for (&w, &f) in self.weights.iter().zip(features.iter()) {
            dot += w * f;
        }
        Self::sigmoid(dot)
    }

    /// Score a feature vector with semantic ICP score (extra feature).
    pub fn score_with_semantic(&self, features: &[f32; FEATURE_COUNT], semantic_score: f32) -> f32 {
        let mut dot = self.bias;
        for (&w, &f) in self.weights.iter().zip(features.iter()) {
            dot += w * f;
        }
        dot += self.semantic_weight * semantic_score;
        Self::sigmoid(dot)
    }

    /// Score all contacts in a batch, writing results to batch.scores (0-100 scale).
    pub fn score_batch(&self, batch: &mut ContactBatch) {
        for i in 0..batch.count {
            let features = Self::extract_features(batch, i);
            let semantic = batch.semantic_icp_score[i];
            batch.scores[i] = if semantic > 0.0 {
                self.score_with_semantic(&features, semantic) * 100.0
            } else {
                self.score(&features) * 100.0
            };
        }
    }

    /// Train via stochastic gradient descent on labeled data.
    pub fn fit(
        &mut self,
        features: &[[f32; FEATURE_COUNT]],
        labels: &[f32],
        learning_rate: f32,
        epochs: usize,
    ) {
        // Ensure weights/stats are sized correctly
        self.weights.resize(FEATURE_COUNT, 0.0);
        while self.feature_stats.len() < FEATURE_COUNT {
            self.feature_stats.push(WelfordStats::new());
        }

        for sample in features {
            for (stat, &val) in self.feature_stats.iter_mut().zip(sample.iter()) {
                stat.update(val);
            }
        }

        for epoch in 0..epochs {
            let lr = learning_rate * 0.995f32.powi(epoch as i32);
            for (x, &y) in features.iter().zip(labels.iter()) {
                let pred = self.score(x);
                let error = pred - y;
                for (w, &xi) in self.weights.iter_mut().zip(x.iter()) {
                    *w -= lr * error * xi;
                }
                self.bias -= lr * error;
            }
        }

        self.trained = true;
    }
}

impl LogisticScorer {
    /// Load a trained scorer from a JSON file, falling back to pretrained defaults.
    /// If the loaded weights don't match FEATURE_COUNT, falls back to defaults.
    pub fn from_json(path: &std::path::Path) -> Self {
        let loaded: Option<Self> = std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok());
        match loaded {
            Some(mut s) if s.weights.len() == FEATURE_COUNT => {
                // Ensure stats are also the right length
                s.feature_stats.resize_with(FEATURE_COUNT, WelfordStats::new);
                s
            }
            _ => Self::default_pretrained(),
        }
    }

    /// Persist the scorer to a JSON file.
    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }
}

impl Default for LogisticScorer {
    fn default() -> Self {
        Self::new()
    }
}

impl ContactBatch {
    /// Score contacts using a logistic regression model.
    /// Falls back to rule-based scoring if the model is untrained.
    pub fn compute_scores_logistic(&mut self, scorer: &LogisticScorer) {
        if !scorer.trained {
            self.compute_scores();
            return;
        }
        scorer.score_batch(self);
    }
}

/// Isotonic regression calibrator using Pool Adjacent Violators Algorithm.
pub struct IsotonicCalibrator {
    breakpoints: Vec<(f32, f32)>,
    pub fitted: bool,
}

impl IsotonicCalibrator {
    pub fn new() -> Self {
        Self {
            breakpoints: Vec::new(),
            fitted: false,
        }
    }

    /// Fit the calibrator using the Pool Adjacent Violators Algorithm (PAVA).
    /// Sorts (score, label) pairs by score, then merges adjacent blocks where
    /// the label average decreases to enforce monotonicity.
    pub fn fit(&mut self, scores: &[f32], labels: &[f32]) {
        assert_eq!(scores.len(), labels.len(), "scores and labels must have same length");
        if scores.is_empty() {
            return;
        }

        // Sort by score
        let mut pairs: Vec<(f32, f32)> = scores.iter().copied().zip(labels.iter().copied()).collect();
        pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

        // PAVA: maintain blocks of (score_sum, label_sum, count)
        let mut blocks: Vec<(f32, f32, usize)> = Vec::new();
        for (score, label) in &pairs {
            blocks.push((*score, *label, 1));

            // Merge adjacent blocks where the new block's average is less than the previous
            while blocks.len() >= 2 {
                let n = blocks.len();
                let avg_last = blocks[n - 1].1 / blocks[n - 1].2 as f32;
                let avg_prev = blocks[n - 2].1 / blocks[n - 2].2 as f32;
                if avg_last < avg_prev {
                    let last = blocks.pop().unwrap();
                    let prev = blocks.last_mut().unwrap();
                    prev.0 += last.0; // accumulate score sum
                    prev.1 += last.1; // accumulate label sum
                    prev.2 += last.2; // accumulate count
                } else {
                    break;
                }
            }
        }

        // Convert blocks to breakpoints: (average_score, average_label)
        self.breakpoints.clear();
        for (score_sum, label_sum, count) in &blocks {
            let avg_score = score_sum / *count as f32;
            let avg_label = label_sum / *count as f32;
            self.breakpoints.push((avg_score, avg_label));
        }

        self.fitted = true;
    }

    /// Calibrate a raw score using binary search + linear interpolation.
    /// Returns the raw score unchanged if the calibrator is not fitted.
    pub fn calibrate(&self, raw_score: f32) -> f32 {
        if !self.fitted || self.breakpoints.is_empty() {
            return raw_score;
        }

        // Clamp to breakpoint range
        if raw_score <= self.breakpoints[0].0 {
            return self.breakpoints[0].1;
        }
        let last = self.breakpoints.len() - 1;
        if raw_score >= self.breakpoints[last].0 {
            return self.breakpoints[last].1;
        }

        // Binary search for the interval
        let pos = self.breakpoints.partition_point(|bp| bp.0 <= raw_score);
        if pos == 0 {
            return self.breakpoints[0].1;
        }

        let (x0, y0) = self.breakpoints[pos - 1];
        let (x1, y1) = self.breakpoints[pos];

        // Linear interpolation
        let t = if (x1 - x0).abs() < 1e-10 { 0.5 } else { (raw_score - x0) / (x1 - x0) };
        y0 + t * (y1 - y0)
    }

    /// Calibrate all scores in a batch (scores are on 0-100 scale, normalize to 0-1 for
    /// calibration, then scale back).
    pub fn calibrate_batch(&self, batch: &mut ContactBatch) {
        for i in 0..batch.count {
            let raw = batch.scores[i] / 100.0;
            batch.scores[i] = self.calibrate(raw) * 100.0;
        }
    }
}

impl Default for IsotonicCalibrator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_scoring() {
        let mut batch = ContactBatch::new();
        batch.count = 3;

        // Perfect candidate
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 10;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 1;

        // Partial candidate
        batch.industry_match[1] = 1;
        batch.seniority_match[1] = 1;
        batch.tech_overlap[1] = 5;
        batch.email_verified[1] = 1;
        batch.recency_days[1] = 30;

        // Weak candidate
        batch.tech_overlap[2] = 2;
        batch.recency_days[2] = 365;

        batch.compute_scores();

        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2]);
        // With hf_weight in denominator (total max=110), a perfect non-HF candidate
        // gets (95/110)*100*0.85 + 15 ≈ 88.4.  Threshold lowered accordingly.
        assert!(batch.scores[0] > 80.0, "perfect candidate got {}", batch.scores[0]);
        assert!(batch.scores[2] < 20.0); // weak
    }

    #[test]
    fn test_top_k() {
        let mut batch = ContactBatch::new();
        batch.count = 5;
        batch.scores[0] = 50.0;
        batch.scores[1] = 90.0;
        batch.scores[2] = 30.0;
        batch.scores[3] = 70.0;
        batch.scores[4] = 10.0;

        let top3 = batch.top_k(3);
        assert_eq!(top3.len(), 3);
        assert_eq!(top3[0], 1); // 90
        assert_eq!(top3[1], 3); // 70
        assert_eq!(top3[2], 0); // 50
    }

    #[test]
    fn test_top_k_empty() {
        let batch = ContactBatch::new();
        assert!(batch.top_k(5).is_empty());
    }

    #[test]
    fn test_top_k_exceeds_count() {
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.scores[0] = 10.0;
        batch.scores[1] = 20.0;

        let top = batch.top_k(100);
        assert_eq!(top.len(), 2);
        assert_eq!(top[0], 1);
        assert_eq!(top[1], 0);
    }

    #[test]
    fn test_custom_weights() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        batch.industry_match[0] = 1;
        batch.recency_days[0] = 1;

        // Only industry matters
        let icp = IcpProfile {
            industry_weight: 100.0,
            employee_weight: 0.0,
            seniority_weight: 0.0,
            department_weight: 0.0,
            tech_weight: 0.0,
            email_weight: 0.0,
            hf_weight: 0.0,
        };

        batch.compute_scores_with(&icp);
        assert!(batch.scores[0] > 95.0); // 100% ICP fit * 0.85 + 15 recency
    }

    #[test]
    fn test_json_output() {
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.scores[0] = 50.0;
        batch.scores[1] = 90.0;

        let json = batch.top_k_json(2);
        assert!(json.contains("90.00"));
        assert!(json.contains("50.00"));
        assert!(json.starts_with('['));
        assert!(json.ends_with(']'));
    }

    #[test]
    fn test_recency_bonus() {
        let mut batch = ContactBatch::new();
        batch.count = 6;

        // All same ICP fit, vary only recency
        for i in 0..6 {
            batch.industry_match[i] = 1;
            batch.seniority_match[i] = 1;
        }

        batch.recency_days[0] = 1;   // 15 bonus
        batch.recency_days[1] = 10;  // 12 bonus
        batch.recency_days[2] = 20;  // 9 bonus
        batch.recency_days[3] = 60;  // 5 bonus
        batch.recency_days[4] = 120; // 2 bonus
        batch.recency_days[5] = 365; // 0 bonus

        batch.compute_scores();

        for i in 0..5 {
            assert!(
                batch.scores[i] > batch.scores[i + 1],
                "score[{}]={} should > score[{}]={}",
                i, batch.scores[i], i + 1, batch.scores[i + 1]
            );
        }
    }

    // ── IcpMatcher tests ──

    #[test]
    fn test_icp_matcher_tech_overlap() {
        let matcher = IcpMatcher::default();
        assert_eq!(matcher.tech_overlap("rust, python, kubernetes"), 6);
        assert_eq!(matcher.tech_overlap("java, go, c++"), 0);
        assert_eq!(matcher.tech_overlap(""), 0);
    }

    #[test]
    fn test_icp_matcher_tech_overlap_case_insensitive() {
        let matcher = IcpMatcher::default();
        assert_eq!(matcher.tech_overlap("RUST, PYTHON"), 4);
    }

    #[test]
    fn test_icp_matcher_tech_overlap_empty_targets() {
        let matcher = IcpMatcher {
            target_tech: vec![],
            ..IcpMatcher::default()
        };
        assert_eq!(matcher.tech_overlap("rust python"), 0);
    }

    #[test]
    fn test_icp_matcher_populate_slot_hit() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "AI/ML SaaS", 100, "VP Engineering", "Head of AI",
            "rust, pytorch", "verified", 5,
        );
        assert_eq!(batch.industry_match[0], 1);
        assert_eq!(batch.employee_in_range[0], 1);
        assert_eq!(batch.seniority_match[0], 1);
        assert_eq!(batch.department_match[0], 1);
        assert_eq!(batch.tech_overlap[0], 4); // 2/5 * 10
        assert_eq!(batch.email_verified[0], 2);
        assert_eq!(batch.recency_days[0], 5);
    }

    #[test]
    fn test_icp_matcher_populate_slot_miss() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "Mining", 5, "Intern", "Sales Rep",
            "excel, word", "unknown", 400,
        );
        assert_eq!(batch.industry_match[0], 0);
        assert_eq!(batch.employee_in_range[0], 0);
        assert_eq!(batch.seniority_match[0], 0);
        assert_eq!(batch.department_match[0], 0);
        assert_eq!(batch.tech_overlap[0], 0);
        assert_eq!(batch.email_verified[0], 0);
    }

    #[test]
    fn test_icp_matcher_email_catch_all() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(&mut batch, 0, "", 100, "", "", "", "catch-all", 0);
        assert_eq!(batch.email_verified[0], 1);
        matcher.populate_slot(&mut batch, 0, "", 100, "", "", "", "catchall", 0);
        assert_eq!(batch.email_verified[0], 1);
    }

    #[test]
    fn test_icp_profile_default_weights_sum() {
        let icp = IcpProfile::default();
        let total = icp.industry_weight + icp.employee_weight + icp.seniority_weight
            + icp.department_weight + icp.tech_weight + icp.email_weight + icp.hf_weight;
        assert_eq!(total, 110.0);
    }

    #[test]
    fn test_end_to_end_icp_score() {
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "AI Infrastructure", 200, "CTO", "Engineering",
            "rust, python, pytorch", "verified", 3,
        );
        batch.compute_scores();
        assert!(batch.scores[0] > 80.0, "got {}", batch.scores[0]);
    }

    // ── WelfordStats tests ──

    #[test]
    fn test_welford_stats_basic() {
        let mut ws = WelfordStats::new();
        for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0] {
            ws.update(v);
        }
        assert!((ws.mean - 5.0).abs() < 0.01, "mean={}", ws.mean);
        assert!((ws.variance() - 4.0).abs() < 0.01, "variance={}", ws.variance());
    }

    #[test]
    fn test_welford_stats_normalize() {
        let mut ws = WelfordStats::new();
        for v in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0] {
            ws.update(v);
        }
        // mean=5, std=2 → z-score of 7 = (7-5)/2 = 1.0
        let z = ws.normalize(7.0);
        assert!((z - 1.0).abs() < 0.01, "z={}", z);
        // z-score of 5 = 0
        let z0 = ws.normalize(5.0);
        assert!(z0.abs() < 0.01, "z0={}", z0);
    }

    #[test]
    fn test_welford_stats_single() {
        let mut ws = WelfordStats::new();
        ws.update(42.0);
        assert_eq!(ws.count, 1);
        // variance returns 1.0 for count < 2
        assert_eq!(ws.variance(), 1.0);
        assert!(ws.std_dev() >= 1e-6);
    }

    #[test]
    fn test_sigmoid_bounds() {
        let mid = LogisticScorer::sigmoid(0.0);
        assert!((mid - 0.5).abs() < 1e-6, "sigmoid(0)={}", mid);

        let high = LogisticScorer::sigmoid(100.0);
        assert!(high > 0.999, "sigmoid(100)={}", high);

        let low = LogisticScorer::sigmoid(-100.0);
        assert!(low < 0.001, "sigmoid(-100)={}", low);
    }

    #[test]
    fn test_smooth_recency() {
        let day0 = LogisticScorer::smooth_recency(0);
        assert!((day0 - 1.0).abs() < 1e-6, "day0={}", day0);

        let day46 = LogisticScorer::smooth_recency(46);
        assert!((day46 - 0.5).abs() < 0.05, "day46={}", day46);

        let day180 = LogisticScorer::smooth_recency(180);
        assert!(day180 < 0.1, "day180={}", day180);
    }

    #[test]
    fn test_logistic_untrained_fallback() {
        let scorer = LogisticScorer::new();
        assert!(!scorer.trained);

        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 1;
        matcher.populate_slot(
            &mut batch, 0,
            "AI SaaS", 100, "CTO", "Engineering",
            "rust, python", "verified", 3,
        );

        // Save expected rule-based score
        let mut batch_rule = ContactBatch::new();
        batch_rule.count = 1;
        batch_rule.industry_match[0] = batch.industry_match[0];
        batch_rule.employee_in_range[0] = batch.employee_in_range[0];
        batch_rule.seniority_match[0] = batch.seniority_match[0];
        batch_rule.department_match[0] = batch.department_match[0];
        batch_rule.tech_overlap[0] = batch.tech_overlap[0];
        batch_rule.email_verified[0] = batch.email_verified[0];
        batch_rule.recency_days[0] = batch.recency_days[0];
        batch_rule.compute_scores();

        batch.compute_scores_logistic(&scorer);
        assert!(
            (batch.scores[0] - batch_rule.scores[0]).abs() < 0.01,
            "logistic={} rule={}",
            batch.scores[0],
            batch_rule.scores[0]
        );
    }

    #[test]
    fn test_logistic_pretrained_ordering() {
        let scorer = LogisticScorer::default_pretrained();

        // Good lead: all signals positive
        let mut batch = ContactBatch::new();
        batch.count = 2;
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 1;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 8;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 3;

        // Bad lead: no signals
        batch.industry_match[1] = 0;
        batch.employee_in_range[1] = 0;
        batch.seniority_match[1] = 0;
        batch.department_match[1] = 0;
        batch.tech_overlap[1] = 0;
        batch.email_verified[1] = 0;
        batch.recency_days[1] = 365;

        batch.compute_scores_logistic(&scorer);
        assert!(
            batch.scores[0] > batch.scores[1],
            "good={} bad={}",
            batch.scores[0],
            batch.scores[1]
        );
    }

    #[test]
    fn test_logistic_fit() {
        let mut scorer = LogisticScorer::new();

        // Build positive and negative feature vectors for the 44-feature layout
        let mut pos_feat = [0.0f32; FEATURE_COUNT];
        // Base contact
        pos_feat[0] = 1.0; pos_feat[1] = 1.0; pos_feat[2] = 1.0; pos_feat[3] = 1.0;
        pos_feat[4] = 0.8; pos_feat[5] = 1.0; pos_feat[6] = 0.9;
        // HF composite
        pos_feat[7] = 0.8; pos_feat[8] = 0.6; pos_feat[9] = 0.7;
        // Maturity
        pos_feat[10] = 0.9; pos_feat[11] = 0.7; pos_feat[12] = 0.8;
        pos_feat[13] = 0.5; pos_feat[14] = 0.6;
        // Research
        pos_feat[15] = 1.0;
        // Sales
        pos_feat[16] = 0.0; pos_feat[17] = 0.0; pos_feat[18] = 0.3; pos_feat[19] = 0.0;
        // Training signals
        pos_feat[20] = 0.5; pos_feat[21] = 0.4; pos_feat[22] = 0.6; pos_feat[23] = 0.3;
        // Arch diversity
        pos_feat[24] = 0.5; pos_feat[25] = 0.4; pos_feat[26] = 0.2; pos_feat[27] = 0.3; pos_feat[28] = 0.1;
        // Downloads
        pos_feat[29] = 0.6; pos_feat[30] = 0.4; pos_feat[31] = 0.3; pos_feat[32] = 0.05; pos_feat[33] = 0.5;
        // Temporal
        pos_feat[34] = 0.8; pos_feat[35] = 0.6; pos_feat[36] = 0.5; pos_feat[37] = 0.3;
        // Interactions
        pos_feat[38] = pos_feat[15] * pos_feat[2];
        pos_feat[39] = pos_feat[7] * pos_feat[4];
        pos_feat[40] = pos_feat[9] * pos_feat[11];
        pos_feat[41] = pos_feat[8] * pos_feat[0];
        pos_feat[42] = pos_feat[18] * pos_feat[3];
        pos_feat[43] = if pos_feat[7] > 0.6 { 1.0 } else { 0.0 };

        let mut neg_feat = [0.0f32; FEATURE_COUNT];
        neg_feat[4] = 0.1; neg_feat[6] = 0.1;
        // Interactions are all 0.0 for neg

        let mut features = Vec::new();
        let mut labels = Vec::new();
        for _ in 0..10 {
            features.push(pos_feat);
            labels.push(1.0);
        }
        for _ in 0..10 {
            features.push(neg_feat);
            labels.push(0.0);
        }

        scorer.fit(&features, &labels, 0.5, 100);
        assert!(scorer.trained);

        let pos_score = scorer.score(&pos_feat);
        let neg_score = scorer.score(&neg_feat);
        assert!(
            pos_score > neg_score,
            "pos={} neg={}",
            pos_score,
            neg_score
        );
        assert!(pos_score > 0.7, "pos_score={}", pos_score);
        assert!(neg_score < 0.3, "neg_score={}", neg_score);
    }

    #[test]
    fn test_logistic_batch() {
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 3;

        // Strong lead
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python, pytorch", "verified", 1);
        // Medium lead
        matcher.populate_slot(&mut batch, 1, "AI", 200, "Manager", "Data", "python", "catch-all", 30);
        // Weak lead
        matcher.populate_slot(&mut batch, 2, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

        scorer.score_batch(&mut batch);
        assert!(batch.scores[0] > batch.scores[1], "0={} 1={}", batch.scores[0], batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2], "1={} 2={}", batch.scores[1], batch.scores[2]);
    }

    #[test]
    fn test_feature_extraction() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        batch.industry_match[0] = 1;
        batch.employee_in_range[0] = 1;
        batch.seniority_match[0] = 0;
        batch.department_match[0] = 1;
        batch.tech_overlap[0] = 5;
        batch.email_verified[0] = 2;
        batch.recency_days[0] = 0;
        // HF signals — composite + depth
        batch.hf_score[0] = 0.75;
        batch.hf_model_depth[0] = 0.6;
        batch.hf_training_depth[0] = 0.8;
        // Maturity decomposed
        batch.hf_max_effort[0] = 0.9;
        batch.hf_production_ratio[0] = 0.7;
        batch.hf_dl_weighted_maturity[0] = 0.85;
        batch.hf_alignment_diversity[0] = 0.5;
        batch.hf_maturity_trend[0] = 0.6;
        // Research
        batch.hf_research[0] = 1.0;
        // Sales
        batch.hf_sales_b2b_core[0] = 1.0;
        batch.hf_sales_outreach[0] = 0.0;
        batch.hf_sales_funnel[0] = 0.33;
        batch.hf_sales_platform[0] = 0.0;
        // Training signals
        batch.hf_research_intensity[0] = 0.4;
        batch.hf_infra_sophistication[0] = 0.3;
        batch.hf_signal_breadth[0] = 0.5;
        batch.hf_domain_nlp_focus[0] = 0.2;
        // Arch diversity
        batch.hf_library_sophistication[0] = 0.6;
        batch.hf_pipeline_diversity[0] = 0.4;
        batch.hf_custom_arch_ratio[0] = 0.1;
        batch.hf_framework_diversity[0] = 0.3;
        batch.hf_moe_ratio[0] = 0.05;
        // Downloads
        batch.hf_download_scale[0] = 0.7;
        batch.hf_download_per_model[0] = 0.4;
        batch.hf_top_model_dominance[0] = 0.3;
        batch.hf_likes_per_download[0] = 0.02;
        batch.hf_download_breadth[0] = 0.5;
        // Temporal
        batch.hf_recency[0] = 0.8;
        batch.hf_acceleration[0] = 0.6;
        batch.hf_longevity[0] = 0.4;
        batch.hf_burst_intensity[0] = 0.2;

        let features = LogisticScorer::extract_features(&batch, 0);
        // Base contact
        assert_eq!(features[0], 1.0); // industry
        assert_eq!(features[1], 1.0); // employee
        assert_eq!(features[2], 0.0); // seniority
        assert_eq!(features[3], 1.0); // department
        assert!((features[4] - 0.5).abs() < 1e-6); // tech: 5/10
        assert!((features[5] - 1.0).abs() < 1e-6); // email: 2/2
        assert!((features[6] - 1.0).abs() < 1e-6); // recency: day 0 = 1.0
        // HF composite
        assert!((features[7] - 0.75).abs() < 1e-6);
        assert!((features[8] - 0.6).abs() < 1e-6);
        assert!((features[9] - 0.8).abs() < 1e-6);
        // Maturity decomposed
        assert!((features[10] - 0.9).abs() < 1e-6);
        assert!((features[11] - 0.7).abs() < 1e-6);
        assert!((features[12] - 0.85).abs() < 1e-6);
        assert!((features[13] - 0.5).abs() < 1e-6);
        assert!((features[14] - 0.6).abs() < 1e-6);
        // Research
        assert!((features[15] - 1.0).abs() < 1e-6);
        // Sales
        assert!((features[16] - 1.0).abs() < 1e-6);
        assert!((features[17] - 0.0).abs() < 1e-6);
        assert!((features[18] - 0.33).abs() < 1e-6);
        assert!((features[19] - 0.0).abs() < 1e-6);
        // Training signals
        assert!((features[20] - 0.4).abs() < 1e-6);
        assert!((features[21] - 0.3).abs() < 1e-6);
        assert!((features[22] - 0.5).abs() < 1e-6);
        assert!((features[23] - 0.2).abs() < 1e-6);
        // Arch diversity
        assert!((features[24] - 0.6).abs() < 1e-6);
        assert!((features[25] - 0.4).abs() < 1e-6);
        assert!((features[26] - 0.1).abs() < 1e-6);
        assert!((features[27] - 0.3).abs() < 1e-6);
        assert!((features[28] - 0.05).abs() < 1e-6);
        // Downloads
        assert!((features[29] - 0.7).abs() < 1e-6);
        assert!((features[30] - 0.4).abs() < 1e-6);
        assert!((features[31] - 0.3).abs() < 1e-6);
        assert!((features[32] - 0.02).abs() < 1e-6);
        assert!((features[33] - 0.5).abs() < 1e-6);
        // Temporal
        assert!((features[34] - 0.8).abs() < 1e-6);
        assert!((features[35] - 0.6).abs() < 1e-6);
        assert!((features[36] - 0.4).abs() < 1e-6);
        assert!((features[37] - 0.2).abs() < 1e-6);
        // Interactions
        assert!((features[38] - 1.0 * 0.0).abs() < 1e-6); // research × seniority (seniority=0)
        assert!((features[39] - 0.75 * 0.5).abs() < 1e-6); // score × tech
        assert!((features[40] - 0.8 * 0.7).abs() < 1e-6);  // training × production
        assert!((features[41] - 0.6 * 1.0).abs() < 1e-6);  // depth × industry
        assert!((features[42] - 0.33 * 1.0).abs() < 1e-6);  // sales_funnel × department
        assert!((features[43] - 1.0).abs() < 1e-6);  // hf_threshold (0.75 > 0.6)
    }

    // ── IsotonicCalibrator tests ──

    #[test]
    fn test_isotonic_identity() {
        // Already monotonic data should pass through approximately unchanged
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        let labels = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        cal.fit(&scores, &labels);
        assert!(cal.fitted);
        for &s in &scores {
            let c = cal.calibrate(s);
            assert!((c - s).abs() < 0.01, "score={} calibrated={}", s, c);
        }
    }

    #[test]
    fn test_isotonic_pava_merges() {
        // Non-monotonic: label drops then rises — PAVA should merge
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        let labels = vec![0.2, 0.8, 0.3, 0.7, 0.9];
        cal.fit(&scores, &labels);
        assert!(cal.fitted);

        // After PAVA, output at 0.2 should not be > output at 0.3
        let c1 = cal.calibrate(0.2);
        let c2 = cal.calibrate(0.3);
        assert!(c2 >= c1 - 0.01, "c1={} c2={}", c1, c2);
    }

    #[test]
    fn test_isotonic_clamp_edges() {
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.2, 0.5, 0.8];
        let labels = vec![0.1, 0.5, 0.9];
        cal.fit(&scores, &labels);

        // Below range → clamp to first breakpoint's label
        let low = cal.calibrate(0.0);
        assert!((low - 0.1).abs() < 0.01, "low={}", low);

        // Above range → clamp to last breakpoint's label
        let high = cal.calibrate(1.0);
        assert!((high - 0.9).abs() < 0.01, "high={}", high);
    }

    #[test]
    fn test_isotonic_monotonic_output() {
        let mut cal = IsotonicCalibrator::new();
        // Deliberately non-monotonic labels
        let scores = vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        let labels = vec![0.5, 0.3, 0.6, 0.2, 0.7, 0.4, 0.8, 0.5, 0.9];
        cal.fit(&scores, &labels);

        // Verify output is non-decreasing
        let mut prev = f32::NEG_INFINITY;
        for i in 0..100 {
            let s = i as f32 / 100.0;
            let c = cal.calibrate(s);
            assert!(c >= prev - 1e-6, "non-monotonic at s={}: prev={} c={}", s, prev, c);
            prev = c;
        }
    }

    #[test]
    fn test_isotonic_unfitted_passthrough() {
        let cal = IsotonicCalibrator::new();
        assert!(!cal.fitted);
        assert_eq!(cal.calibrate(0.42), 0.42);
        assert_eq!(cal.calibrate(0.99), 0.99);
    }

    #[test]
    fn test_isotonic_batch() {
        let mut cal = IsotonicCalibrator::new();
        let scores = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        let labels = vec![0.1, 0.3, 0.5, 0.7, 0.9];
        cal.fit(&scores, &labels);

        let mut batch = ContactBatch::new();
        batch.count = 3;
        batch.scores[0] = 30.0; // 0.30 normalized
        batch.scores[1] = 70.0; // 0.70 normalized
        batch.scores[2] = 50.0; // 0.50 normalized

        cal.calibrate_batch(&mut batch);

        // Ordering should be preserved
        assert!(batch.scores[1] > batch.scores[2], "1={} 2={}", batch.scores[1], batch.scores[2]);
        assert!(batch.scores[2] > batch.scores[0], "2={} 0={}", batch.scores[2], batch.scores[0]);
    }

    #[test]
    fn test_isotonic_single_point() {
        let mut cal = IsotonicCalibrator::new();
        cal.fit(&[0.5], &[0.8]);
        assert!(cal.fitted);
        // Single breakpoint: everything maps to 0.8
        assert!((cal.calibrate(0.5) - 0.8).abs() < 0.01);
        assert!((cal.calibrate(0.0) - 0.8).abs() < 0.01); // clamped to edge
        assert!((cal.calibrate(1.0) - 0.8).abs() < 0.01); // clamped to edge
    }

    #[test]
    fn test_backward_compat() {
        // Verify existing compute_scores still works identically
        let matcher = IcpMatcher::default();
        let mut batch = ContactBatch::new();
        batch.count = 2;
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);
        batch.compute_scores();
        assert!(batch.scores[0] > batch.scores[1]);
        assert!(batch.scores[0] > 0.0);
    }

    // ── HfCompanySignals tests ──

    #[test]
    fn test_hf_signals_from_raw() {
        let sig = HfCompanySignals::from_raw(0.72, 15, 4, 0.85, true, 3, 2);
        assert!((sig.hf_score - 0.72).abs() < 1e-6);
        assert!(sig.model_depth > 0.0 && sig.model_depth <= 1.0);
        assert!((sig.training_depth - 0.8).abs() < 1e-6); // 4/5
        assert!((sig.max_effort - 0.85).abs() < 1e-6); // proxied from avg_maturity
        assert!((sig.dl_weighted_maturity - 0.85).abs() < 1e-6); // proxied from avg_maturity
        assert_eq!(sig.production_ratio, 0.5); // avg_maturity > 0.8
        assert_eq!(sig.research, 1.0); // has_pretraining = true
        assert!((sig.sales_funnel - (2.0 / 7.0)).abs() < 1e-6); // now /7
    }

    #[test]
    fn test_hf_signals_zero() {
        let sig = HfCompanySignals::from_raw(0.0, 0, 0, 0.0, false, 0, 0);
        assert_eq!(sig.hf_score, 0.0);
        assert_eq!(sig.model_depth, 0.0);
        assert_eq!(sig.training_depth, 0.0);
        assert_eq!(sig.max_effort, 0.0);
        assert_eq!(sig.production_ratio, 0.0);
        assert_eq!(sig.dl_weighted_maturity, 0.0);
        assert_eq!(sig.research, 0.0);
        assert_eq!(sig.sales_funnel, 0.0);
    }

    #[test]
    fn test_hf_signals_clamped() {
        let sig = HfCompanySignals::from_raw(1.5, 100, 20, 1.5, true, 100, 100);
        assert_eq!(sig.hf_score, 1.0); // clamped
        assert_eq!(sig.model_depth, 1.0); // clamped
        assert_eq!(sig.training_depth, 1.0); // clamped
        assert_eq!(sig.max_effort, 1.0); // clamped
        assert_eq!(sig.dl_weighted_maturity, 1.0); // clamped
    }

    #[test]
    fn test_hf_signals_boost_score() {
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 2;

        // Same contact features for both
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);

        // Only slot 0 gets HF signals
        let hf = HfCompanySignals::from_raw(0.85, 12, 4, 0.9, true, 2, 1);
        batch.populate_hf_slot(0, &hf);
        // Slot 1 has no HF signals (all zeros)

        scorer.score_batch(&mut batch);
        assert!(
            batch.scores[0] > batch.scores[1],
            "with_hf={} without_hf={}",
            batch.scores[0],
            batch.scores[1]
        );
    }

    #[test]
    fn test_hf_backward_compat_no_hf() {
        // Contacts with zero HF signals should rank same as before
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 2;

        // Strong lead vs weak lead — no HF signals
        matcher.populate_slot(&mut batch, 0, "AI SaaS", 100, "CTO", "Engineering", "rust, python", "verified", 3);
        matcher.populate_slot(&mut batch, 1, "Mining", 5, "Intern", "Sales", "excel", "unknown", 365);

        scorer.score_batch(&mut batch);
        assert!(batch.scores[0] > batch.scores[1]);
    }

    #[test]
    fn test_hf_maturity_ordering() {
        let scorer = LogisticScorer::default_pretrained();
        let matcher = IcpMatcher::default();

        let mut batch = ContactBatch::new();
        batch.count = 3;

        // Same base features, different maturity levels
        for i in 0..3 {
            matcher.populate_slot(&mut batch, i, "AI", 100, "CTO", "Engineering", "python", "verified", 5);
            batch.hf_score[i] = 0.7;
            batch.hf_model_depth[i] = 0.5;
            batch.hf_training_depth[i] = 0.5;
            batch.hf_research[i] = 1.0;
            batch.hf_sales_funnel[i] = 0.3;
        }
        // Vary maturity decomposed: max_effort + production_ratio + dl_weighted_maturity
        batch.hf_max_effort[0] = 1.0;  batch.hf_production_ratio[0] = 0.8; batch.hf_dl_weighted_maturity[0] = 0.9;
        batch.hf_max_effort[1] = 0.7;  batch.hf_production_ratio[1] = 0.4; batch.hf_dl_weighted_maturity[1] = 0.6;
        batch.hf_max_effort[2] = 0.15; batch.hf_production_ratio[2] = 0.0; batch.hf_dl_weighted_maturity[2] = 0.1;

        scorer.score_batch(&mut batch);
        assert!(batch.scores[0] > batch.scores[1], "prod={} mod={}", batch.scores[0], batch.scores[1]);
        assert!(batch.scores[1] > batch.scores[2], "mod={} triv={}", batch.scores[1], batch.scores[2]);
    }

    #[test]
    fn test_populate_hf_slot() {
        let mut batch = ContactBatch::new();
        batch.count = 1;
        let hf = HfCompanySignals::from_raw(0.65, 8, 3, 0.7, false, 2, 1);
        batch.populate_hf_slot(0, &hf);
        assert!((batch.hf_score[0] - 0.65).abs() < 1e-6);
        assert!(batch.hf_model_depth[0] > 0.0);
        assert!((batch.hf_training_depth[0] - 0.6).abs() < 1e-6); // 3/5
        assert!((batch.hf_max_effort[0] - 0.7).abs() < 1e-6); // proxied from avg_maturity
        assert!((batch.hf_dl_weighted_maturity[0] - 0.7).abs() < 1e-6); // proxied
        assert_eq!(batch.hf_research[0], 1.0); // arxiv_count=2 > 0
        assert!((batch.hf_sales_funnel[0] - (1.0 / 7.0)).abs() < 1e-6); // now /7
    }

    #[test]
    fn test_icp_scoring_with_hf_weight() {
        let mut batch = ContactBatch::new();
        batch.count = 2;

        // Both have same base features (no ICP match at all)
        batch.recency_days[0] = 30;
        batch.recency_days[1] = 30;

        // Only slot 0 has HF signal
        batch.hf_score[0] = 0.9;

        let icp = IcpProfile::default();
        batch.compute_scores_with(&icp);

        // Slot 0 should score higher because of HF contribution
        assert!(
            batch.scores[0] > batch.scores[1],
            "with_hf={} without_hf={}",
            batch.scores[0],
            batch.scores[1]
        );
    }
}
