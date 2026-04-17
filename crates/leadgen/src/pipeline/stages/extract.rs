use std::time::Instant;

use anyhow::Result;

use crate::extraction::relations::RelationExtractor;
use crate::pipeline::stage::*;
use crate::db;

/// Pipeline stage that runs regex-based relation extraction on contacts and
/// their associated company page text.
///
/// For each contact the stage:
///
/// 1. Loads the contact row and its owning company.
/// 2. Attempts to retrieve cached page text from the `enrichment_cache` table
///    using the company domain as the cache key URL (`https://<domain>`).
///    Falls back to the company `description` column when no cache entry exists.
/// 3. Runs [`RelationExtractor::extract`] over the resolved text.
/// 4. Emits a per-contact `relations_found` eval signal with the count.
///
/// The stage passes `ContactIds` through unchanged — extraction enriches the
/// knowledge graph but does not filter the lead set.
pub struct ExtractionStage;

impl PipelineStage for ExtractionStage {
    fn name(&self) -> &str {
        "extract"
    }

    fn execute<'a>(
        &'a self,
        ctx: &'a PipelineContext,
        input: StageInput,
    ) -> BoxFuture<'a, Result<StageOutput>> {
        Box::pin(async move {
            // Accept both CompanyIds (from CrawlStage) and ContactIds.
            // When receiving CompanyIds, load all contacts for those companies.
            let (contact_ids, passthrough_input) = match input {
                StageInput::ContactIds(ids) => (ids.clone(), StageInput::ContactIds(ids)),
                StageInput::CompanyIds(ref company_ids) => {
                    let mut cids = Vec::new();
                    for cid in company_ids {
                        if let Ok(contacts) = db::contacts_by_company(&ctx.db, cid).await {
                            cids.extend(contacts.into_iter().map(|c| c.id));
                        }
                    }
                    let passthrough = StageInput::CompanyIds(company_ids.clone());
                    (cids, passthrough)
                }
                _ => {
                    return Ok(StageOutput {
                        input_count: 0,
                        output_count: 0,
                        error_count: 0,
                        signals: vec![],
                        next_input: StageInput::Empty,
                        duration: std::time::Duration::ZERO,
                    });
                }
            };

            let start = Instant::now();
            let input_count = contact_ids.len();
            let mut error_count = 0usize;
            let mut total_relations = 0usize;
            let mut signals: Vec<EvalSignal> = Vec::new();
            let now = chrono::Utc::now().to_rfc3339();

            let extractor = RelationExtractor::new();

            for contact_id in &contact_ids {
                // Load the contact.
                let contact =
                    match sqlx::query_as::<_, crate::Contact>(
                        "SELECT * FROM contacts WHERE id = ?1",
                    )
                    .bind(contact_id)
                    .fetch_optional(&ctx.db)
                    .await
                    {
                        Ok(Some(c)) => c,
                        Ok(None) => {
                            error_count += 1;
                            continue;
                        }
                        Err(_) => {
                            error_count += 1;
                            continue;
                        }
                    };

                // Resolve the company so we can look up the cache key.
                let company_id = match contact.company_id.as_deref() {
                    Some(id) => id.to_string(),
                    None => continue,
                };

                let company =
                    match sqlx::query_as::<_, crate::Company>(
                        "SELECT * FROM companies WHERE id = ?1",
                    )
                    .bind(&company_id)
                    .fetch_optional(&ctx.db)
                    .await
                    {
                        Ok(Some(c)) => c,
                        _ => {
                            error_count += 1;
                            continue;
                        }
                    };

                // Build the canonical cache URL from the company domain.
                let cache_url = company
                    .domain
                    .as_deref()
                    .map(|d| format!("https://{}", d));

                // Check the relation-extraction cache before running the extractor.
                // If we already have serialized relations for this domain URL we
                // skip the (potentially expensive) extractor pass entirely.
                if let Some(ref url) = cache_url {
                    if let Ok(Some(_cached_json)) = db::get_cached_extraction(&ctx.db, url).await {
                        // Cache hit — deserialize to count relations for the signal,
                        // then skip re-extraction for this contact.
                        let cached_count: usize = serde_json::from_str::<serde_json::Value>(&_cached_json)
                            .ok()
                            .and_then(|v| v.as_array().map(|a| a.len()))
                            .unwrap_or(0);
                        total_relations += cached_count;
                        signals.push(EvalSignal {
                            stage_name: "extract".into(),
                            metric_name: "relations_found".into(),
                            value: cached_count as f64,
                            timestamp: now.clone(),
                        });
                        continue;
                    }
                }

                // Resolve page text: try the enrichment_cache `text`/`content`
                // field first, then fall back to the company description column.
                let page_text: Option<String> =
                    if let Some(ref url) = cache_url {
                        match db::get_cached_extraction(&ctx.db, url).await {
                            Ok(Some(json)) => {
                                // The cache stores the full extracted JSON blob.
                                // Pull the plain-text content from a `text` field
                                // if present; otherwise use the raw JSON as the
                                // extraction source — it still contains words.
                                let text = serde_json::from_str::<serde_json::Value>(&json)
                                    .ok()
                                    .and_then(|v| {
                                        v.get("text")
                                            .or_else(|| v.get("content"))
                                            .and_then(|t| t.as_str())
                                            .map(|s| s.to_string())
                                    })
                                    .unwrap_or(json);
                                Some(text)
                            }
                            _ => None,
                        }
                    } else {
                        None
                    };

                let text = page_text
                    .or_else(|| company.description.clone())
                    .unwrap_or_default();

                let relations = extractor.extract(&text);
                let relation_count = relations.len();
                total_relations += relation_count;

                // Persist extracted relations to cache so subsequent pipeline
                // runs for contacts at the same company skip re-extraction.
                if let Some(ref url) = cache_url {
                    if let Ok(serialized) = serde_json::to_string(&relations) {
                        let _ = db::cache_extraction(&ctx.db, url, &serialized, "relation-extractor").await;
                    }
                }

                // VLM deep enrichment: category, AI tier, tech stack, services
                if let Some(ref vlm) = ctx.vlm {
                    if !text.is_empty() {
                        match vlm
                            .extract_from_html::<qwen_vl::EnrichmentExtraction>(
                                &text,
                                qwen_vl::schema::ENRICHMENT_PROMPT,
                            )
                            .await
                        {
                            Ok(enrichment) => {
                                if let Some(ref url) = cache_url {
                                    if let Ok(json) = serde_json::to_string(&enrichment) {
                                        let _ = db::cache_extraction(
                                            &ctx.db, &format!("{url}#vlm-enrichment"), &json, "vlm-enrichment",
                                        ).await;
                                    }
                                }
                                signals.push(EvalSignal {
                                    stage_name: "extract".into(),
                                    metric_name: "vlm_enrichment".into(),
                                    value: 1.0,
                                    timestamp: now.clone(),
                                });
                            }
                            Err(e) => {
                                tracing::debug!(error = %e, "VLM enrichment failed");
                            }
                        }
                    }
                }

                signals.push(EvalSignal {
                    stage_name: "extract".into(),
                    metric_name: "relations_found".into(),
                    value: relation_count as f64,
                    timestamp: now.clone(),
                });
            }

            // Summary signals for the whole batch.
            signals.push(EvalSignal {
                stage_name: "extract".into(),
                metric_name: "total_relations".into(),
                value: total_relations as f64,
                timestamp: now,
            });

            Ok(StageOutput {
                input_count,
                // All contacts pass through unchanged.
                output_count: input_count.saturating_sub(error_count),
                error_count,
                signals,
                // Pass through the original input type so downstream stages
                // (e.g., ScoringStage expecting CompanyIds) receive the right variant.
                next_input: passthrough_input,
                duration: start.elapsed(),
            })
        })
    }
}
