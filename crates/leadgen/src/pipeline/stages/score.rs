use std::time::Instant;

use anyhow::Result;

use crate::matching::conformal::ConformalPredictor;
use crate::matching::feature_importance::explain_score;
use crate::matching::hawkes::{BusinessEvent, EventType, HawkesProcess};
use crate::matching::intent_signals::IntentDetector;
use crate::pipeline::stage::*;
use crate::{db, scoring};

pub struct ScoringStage;

impl PipelineStage for ScoringStage {
    fn name(&self) -> &str {
        "score"
    }

    fn execute<'a>(
        &'a self,
        ctx: &'a PipelineContext,
        input: StageInput,
    ) -> BoxFuture<'a, Result<StageOutput>> {
        Box::pin(async move {
            let company_ids = match input {
                StageInput::CompanyIds(ids) => ids,
                _ => {
                    return Ok(StageOutput {
                        input_count: 0,
                        output_count: 0,
                        error_count: 0,
                        signals: vec![],
                        next_input: StageInput::Empty,
                        duration: std::time::Duration::ZERO,
                    })
                }
            };

            let start = Instant::now();
            let input_count = company_ids.len();
            let mut scored_count = 0usize;
            let mut error_count = 0usize;
            let mut contact_ids: Vec<String> = Vec::new();
            let mut score_sum = 0.0f64;
            let mut signals: Vec<EvalSignal> = Vec::new();
            let now = chrono::Utc::now().to_rfc3339();

            // ── Hawkes Process: observe temporal company activity ─────────────
            // One shared process per pipeline run; each company with a known
            // `updated_at` timestamp feeds a BusinessEvent so the process
            // accumulates cross-company excitation before the per-company loop.
            let mut hawkes = HawkesProcess::new();

            // ── Conformal predictor: calibrate lead score intervals ───────────
            // 90% coverage, 500-sample sliding window.
            let mut conformal = ConformalPredictor::new(500, 0.90);

            for company_id in &company_ids {
                let contacts = match db::contacts_by_company(&ctx.db, company_id).await {
                    Ok(c) => c,
                    Err(_) => {
                        error_count += 1;
                        continue;
                    }
                };

                let company = match db::get_company_by_id(&ctx.db, company_id).await {
                    Ok(Some(co)) => co,
                    _ => { error_count += 1; continue; }
                };

                // ── Hawkes: feed a temporal business event for this company ──
                // Use `updated_at` as the event timestamp (seconds since Unix
                // epoch). When the timestamp is unavailable we fall back to
                // `now` — this still registers the company in the process so
                // the baseline intensity is non-zero.
                let event_ts: f64 = company
                    .updated_at
                    .as_deref()
                    .and_then(|s| {
                        chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")
                            .ok()
                            .map(|dt| dt.and_utc().timestamp() as f64)
                    })
                    .unwrap_or_else(|| chrono::Utc::now().timestamp() as f64);

                hawkes.observe(BusinessEvent {
                    timestamp: event_ts,
                    event_type: EventType::Hiring,
                    magnitude: 1.0,
                });

                // Detect intent signals and compute the normalised 0–100 intent score.
                let intent_signals = IntentDetector::detect(&company);
                let intent_score = IntentDetector::intent_score(&intent_signals);

                // Emit per-company intent signal count.
                signals.push(EvalSignal {
                    stage_name: "score".into(),
                    metric_name: "intent_signals_detected".into(),
                    value: intent_signals.len() as f64,
                    timestamp: now.clone(),
                });

                let raw_scores = scoring::score_company_contacts(&contacts, &company, &ctx.icp);

                // Track the top-scored (contact, score) pair for feature importance.
                let mut top_score: Option<(crate::LeadScore, usize)> = None;

                for (idx, (raw_score, contact)) in
                    raw_scores.iter().zip(contacts.iter()).enumerate()
                {
                    // Populate the intent_score field that score_lead leaves as 0.0.
                    let mut score = raw_score.clone();
                    score.intent_score = intent_score;

                    score_sum += score.composite_score;

                    // ── Conformal: observe (predicted, actual=predicted) ──────
                    // No ground-truth labels at pipeline time, so we use the
                    // predicted score as both arguments. This seeds the calibration
                    // window so intervals tighten as the pipeline processes more
                    // contacts. The interval width is emitted as a diagnostic signal.
                    conformal.observe(score.composite_score, score.composite_score);

                    if let Err(_) = db::save_lead_score(&ctx.db, &score).await {
                        error_count += 1;
                    } else {
                        scored_count += 1;
                        contact_ids.push(score.contact_id.clone());
                    }

                    // Keep a reference to the highest-composite-score entry.
                    let is_better = top_score
                        .as_ref()
                        .map(|(ts, _)| score.composite_score > ts.composite_score)
                        .unwrap_or(true);
                    if is_better {
                        top_score = Some((score, idx));
                    }

                    let _ = contact; // silence unused warning; contact accessed below
                }

                // Emit feature importance signal for the top-scored contact.
                if let Some((ref ts, idx)) = top_score {
                    let contact = &contacts[idx];
                    let importances = explain_score(contact, &company, &ctx.icp, ts);
                    if let Some(top_feature) = importances.first() {
                        signals.push(EvalSignal {
                            stage_name: "score".into(),
                            metric_name: format!(
                                "top_feature:{}",
                                top_feature.feature_name
                            ),
                            value: top_feature.contribution,
                            timestamp: now.clone(),
                        });
                    }
                }
            }

            // Aggregate signals across all companies.
            signals.push(EvalSignal {
                stage_name: "score".into(),
                metric_name: "scored_count".into(),
                value: scored_count as f64,
                timestamp: now.clone(),
            });

            if scored_count > 0 {
                signals.push(EvalSignal {
                    stage_name: "score".into(),
                    metric_name: "mean_composite_score".into(),
                    value: score_sum / scored_count as f64,
                    timestamp: now.clone(),
                });
            }

            // ── Hawkes: emit aggregate intensity at current time ──────────────
            let current_ts = chrono::Utc::now().timestamp() as f64;
            let hawkes_intensity = hawkes.intensity(current_ts);
            signals.push(EvalSignal {
                stage_name: "score".into(),
                metric_name: "hawkes_intensity".into(),
                value: hawkes_intensity,
                timestamp: now.clone(),
            });

            // ── Conformal: emit interval width at median score ────────────────
            let median_score = if scored_count > 0 {
                score_sum / scored_count as f64
            } else {
                50.0
            };
            let (_, _, interval_width) = conformal.predict_interval(median_score);
            // Cap infinite width (empty window) to a sentinel value of -1.0 so
            // downstream consumers can distinguish "no data" from a real width.
            let finite_width = if interval_width.is_finite() { interval_width } else { -1.0 };
            signals.push(EvalSignal {
                stage_name: "score".into(),
                metric_name: "conformal_interval_width".into(),
                value: finite_width,
                timestamp: now,
            });

            Ok(StageOutput {
                input_count,
                output_count: scored_count,
                error_count,
                signals,
                next_input: StageInput::ContactIds(contact_ids),
                duration: start.elapsed(),
            })
        })
    }
}
