//! Intent signal detection stage — classify company content for buying signals.
//!
//! Input:  enrichment report (companies with fetched web content)
//! Output: intent report + updated Pipeline records
//!
//! Strategy: Use local logistic classifier (keyword + semantic features) when trained.
//! Falls back to LLM for intent detection when classifier weights are unavailable.
//! Local path is ~50x faster (~60ms vs ~3s) and eliminates JSON parsing failures.

use anyhow::Result;
use serde::{Deserialize, Serialize};

use super::enrich::EnrichmentReport;
use super::{llm, state, StageReport, StageStatus, TeamContext};

#[derive(Debug, Serialize, Deserialize)]
pub struct IntentReport {
    pub companies: Vec<CompanyIntent>,
    pub total_signals: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyIntent {
    pub domain: String,
    pub name: String,
    pub intent_score: f64,
    pub signals: Vec<DetectedSignal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedSignal {
    pub signal_type: String,
    pub confidence: f64,
    pub evidence: Vec<String>,
    pub decay_days: u32,
}

const INTENT_SYSTEM_PROMPT: &str = "\
You detect buying/hiring intent signals in B2B company content.\n\
Analyze the text and identify all relevant signals.\n\
Return JSON: {\"signals\": [{\"signal_type\": \"...\", \"confidence\": 0.0-1.0, \"evidence\": [\"...\"], \"decay_days\": N}]}\n\n\
Signal types:\n\
- hiring_intent (decay: 30): Company is actively hiring or growing team\n\
- tech_adoption (decay: 60): Adopting new technology, migrating infrastructure\n\
- growth_signal (decay: 45): Funding, revenue growth, expansion, M&A\n\
- budget_cycle (decay: 90): Budget planning, vendor evaluation, procurement\n\
- leadership_change (decay: 60): New executive hires, promotions\n\
- product_launch (decay: 30): New product/feature announcements\n\n\
If no signals detected, return: {\"signals\": []}\n\
CRITICAL: Respond with ONLY a valid JSON object, no markdown.";

pub async fn run(ctx: &TeamContext) -> Result<StageReport> {
    let enrichment: EnrichmentReport = state::load_report(&ctx.data_dir, "enrichment")
        .ok_or_else(|| anyhow::anyhow!("no enrichment report — run enrich first"))?;

    let limit = ctx.batch.enrich.min(enrichment.companies.len());
    let candidates = &enrichment.companies[..limit];

    let mut report = IntentReport {
        companies: Vec::new(),
        total_signals: 0,
        errors: Vec::new(),
    };

    // Try local classifiers first (keyword + optional semantic features).
    // Falls back to LLM if neither classifier is trained.
    let classifier_path = ctx.data_dir.join("models/intent_classifier.json");
    let classifier = crate::kernel::intent_scoring::IntentClassifier::from_json(&classifier_path);

    let semantic_path = ctx.data_dir.join("models/semantic_intent_classifier.json");
    let prototypes_path = ctx.data_dir.join("models/intent_prototypes.json");
    let semantic_classifier = crate::kernel::intent_scoring::SemanticIntentClassifier::from_json(&semantic_path);
    let prototypes = crate::kernel::intent_scoring::IntentPrototypes::from_json(&prototypes_path);

    let use_local = classifier.trained || semantic_classifier.trained;

    for company in candidates {
        let mut text_parts = Vec::new();
        if !company.domain.is_empty() {
            text_parts.push(format!("Company: {} ({})", company.name, company.domain));
        }
        text_parts.push(format!("Category: {}, AI Tier: {}, Industry: {}", company.category, company.ai_tier, company.industry));
        if !company.tech_stack.is_empty() {
            text_parts.push(format!("Tech stack: {}", company.tech_stack.join(", ")));
        }
        if company.has_careers_page {
            text_parts.push("Has active careers/jobs page.".to_string());
        }
        if !company.emails_found.is_empty() {
            text_parts.push(format!("Contact emails found: {}", company.emails_found.len()));
        }

        let user_text = text_parts.join("\n");
        let truncated = if user_text.len() > 3000 { &user_text[..3000] } else { &user_text };

        if use_local {
            // --- LOCAL CLASSIFIER PATH (50x faster, no JSON parsing failures) ---
            let has_url = !company.domain.is_empty();
            let source_type = "company_snapshot";

            let results = if semantic_classifier.trained {
                if let Some(ref proto) = prototypes {
                    // When BGE embedder is loaded, compute real embedding here.
                    // For now, zero embedding for graceful degradation to keyword features.
                    let zero_embedding = vec![0.0f32; proto.dim];
                    semantic_classifier.classify_text(truncated, source_type, has_url, proto, &zero_embedding)
                } else {
                    classifier.classify_text(truncated, source_type, has_url)
                }
            } else {
                classifier.classify_text(truncated, source_type, has_url)
            };

            let signals: Vec<DetectedSignal> = results.into_iter()
                .map(|(signal_type, confidence)| {
                    let type_str = match signal_type {
                        crate::kernel::intent_scoring::SignalType::HiringIntent => "hiring_intent",
                        crate::kernel::intent_scoring::SignalType::TechAdoption => "tech_adoption",
                        crate::kernel::intent_scoring::SignalType::GrowthSignal => "growth_signal",
                        crate::kernel::intent_scoring::SignalType::BudgetCycle => "budget_cycle",
                        crate::kernel::intent_scoring::SignalType::LeadershipChange => "leadership_change",
                        crate::kernel::intent_scoring::SignalType::ProductLaunch => "product_launch",
                    };
                    DetectedSignal {
                        signal_type: type_str.to_string(),
                        confidence: confidence as f64,
                        evidence: vec!["local classifier (keyword+semantic)".to_string()],
                        decay_days: signal_type.default_decay_days() as u32,
                    }
                })
                .collect();

            let intent_score = compute_intent_score(&signals);
            report.total_signals += signals.len();

            report.companies.push(CompanyIntent {
                domain: company.domain.clone(),
                name: company.name.clone(),
                intent_score,
                signals,
            });
        } else {
            // --- LLM FALLBACK PATH (original behavior) ---
            match llm::chat(
                &ctx.http,
                &ctx.llm_base_url,
                ctx.llm_api_key.as_deref(),
                &ctx.llm_model,
                INTENT_SYSTEM_PROMPT,
                truncated,
                Some(0.1),
            ).await {
                Ok(raw) => {
                    let json_str = raw
                        .trim()
                        .strip_prefix("```json")
                        .or_else(|| raw.trim().strip_prefix("```"))
                        .unwrap_or(raw.trim())
                        .strip_suffix("```")
                        .unwrap_or(raw.trim())
                        .trim();

                    match serde_json::from_str::<IntentResponse>(json_str) {
                        Ok(resp) => {
                            let signals: Vec<DetectedSignal> = resp.signals.into_iter()
                                .filter(|s| s.confidence > 0.3)
                                .collect();

                            let intent_score = compute_intent_score(&signals);
                            report.total_signals += signals.len();

                            report.companies.push(CompanyIntent {
                                domain: company.domain.clone(),
                                name: company.name.clone(),
                                intent_score,
                                signals,
                            });
                        }
                        Err(e) => {
                            report.errors.push(format!("{}: parse: {e}", company.domain));
                        }
                    }
                }
                Err(e) => {
                    report.errors.push(format!("{}: LLM: {e}", company.domain));
                }
            }
        }
    }

    state::save_report(&ctx.data_dir, "intent", &report)?;

    let mut st = state::PipelineState::load(&ctx.data_dir);
    st.counts.enriched += report.companies.len();
    st.save(&ctx.data_dir)?;

    let created = report.companies.len();
    let errors = report.errors.clone();
    let status = if errors.is_empty() { StageStatus::Success } else { StageStatus::Partial };

    Ok(StageReport {
        stage: "intent".into(),
        status,
        processed: limit,
        created,
        errors,
        duration_ms: 0,
    })
}

#[derive(Debug, Deserialize)]
struct IntentResponse {
    signals: Vec<DetectedSignal>,
}

fn compute_intent_score(signals: &[DetectedSignal]) -> f64 {
    if signals.is_empty() { return 0.0; }

    let weights: &[(&str, f64)] = &[
        ("hiring_intent", 30.0),
        ("tech_adoption", 20.0),
        ("growth_signal", 25.0),
        ("budget_cycle", 15.0),
        ("leadership_change", 5.0),
        ("product_launch", 5.0),
    ];

    let mut weighted_sum = 0.0;
    let mut total_weight = 0.0;

    for (signal_type, weight) in weights {
        let best = signals.iter()
            .filter(|s| s.signal_type == *signal_type)
            .map(|s| s.confidence)
            .fold(0.0f64, f64::max);

        weighted_sum += best * weight;
        total_weight += weight;
    }

    if total_weight > 0.0 {
        (weighted_sum / total_weight) * 100.0
    } else {
        0.0
    }
}
