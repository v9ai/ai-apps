use std::sync::Arc;
use std::time::Instant;

use anyhow::Result;
use tokio::sync::Mutex;

use crate::compliance::{AuditEventType, AuditLog, CrawlPermission, RobotsChecker};
use crate::crawler::memory_tree::MemoryTree;
use crate::crawler::scheduler::CrawlReward;
use crate::crawler::DomainScheduler;
use crate::pipeline::stage::*;
use crate::{crawler, db, search};

/// Maximum pages to crawl per domain in smart mode.
const MAX_PAGES_PER_DOMAIN: usize = 15;

pub struct CrawlStage {
    /// Use smart crawling with URL discovery (true) or legacy hardcoded paths (false).
    pub smart: bool,
    /// Optional bandit scheduler that reorders domains by UCB score and records
    /// composite rewards after each domain crawl.
    pub scheduler: Option<Arc<Mutex<DomainScheduler>>>,
    /// Optional hierarchical memory tree for cross-domain path-pattern learning.
    pub memory: Option<Arc<Mutex<MemoryTree>>>,
}

impl CrawlStage {
    pub fn new() -> Self {
        Self {
            smart: true,
            scheduler: None,
            memory: None,
        }
    }

    pub fn legacy() -> Self {
        Self {
            smart: false,
            scheduler: None,
            memory: None,
        }
    }

    /// Attach a [`DomainScheduler`] so that domain ordering uses UCB scores and
    /// crawl outcomes are fed back as composite rewards.
    pub fn with_scheduler(scheduler: Arc<Mutex<DomainScheduler>>) -> Self {
        Self {
            smart: true,
            scheduler: Some(scheduler),
            memory: None,
        }
    }

    /// Attach both a [`DomainScheduler`] and a [`MemoryTree`] for full
    /// bandit + hierarchical-memory crawling.
    pub fn with_memory(scheduler: Arc<Mutex<DomainScheduler>>, memory: Arc<Mutex<MemoryTree>>) -> Self {
        Self {
            smart: true,
            scheduler: Some(scheduler),
            memory: Some(memory),
        }
    }
}

impl PipelineStage for CrawlStage {
    fn name(&self) -> &str {
        "crawl"
    }

    fn execute<'a>(
        &'a self,
        ctx: &'a PipelineContext,
        input: StageInput,
    ) -> BoxFuture<'a, Result<StageOutput>> {
        Box::pin(async move {
            let domains = match input {
                StageInput::Domains(d) => d,
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
            let input_count = domains.len();

            // If a scheduler is present, ensure all domains are registered and
            // reorder them according to current UCB scores.
            let ordered_domains: Vec<String> = if let Some(sched) = &self.scheduler {
                let mut sched_guard = sched.lock().await;
                sched_guard.add_domains(&domains);
                let batch = sched_guard.select_batch(domains.len());
                // select_batch only returns available domains; append any that
                // were skipped (e.g. under politeness delay) at the end so
                // nothing is silently dropped.
                let mut result = batch;
                for d in &domains {
                    if !result.contains(d) {
                        result.push(d.clone());
                    }
                }
                result
            } else {
                domains.clone()
            };

            let mut company_ids: Vec<String> = Vec::new();
            let mut error_count = 0usize;
            let mut signals: Vec<EvalSignal> = Vec::new();
            let now = chrono::Utc::now().to_rfc3339();

            let mut writer = search::create_writer(&ctx.search_index)?;

            // Compliance: one AuditLog + one RobotsChecker shared across all
            // domains in this batch so state is accumulated for later inspection.
            let audit = AuditLog::new();
            let mut robots = RobotsChecker::new();

            audit.log(
                AuditEventType::CrawlStarted,
                "crawl_stage",
                "batch",
                &format!("{} domains", ordered_domains.len()),
            );

            for domain in &ordered_domains {
                // ── Memory tree: suggest seeds before crawling ────────────────
                if let Some(mem) = &self.memory {
                    let _seeds = mem.lock().await.suggest_seeds(None, 5);
                    // Seeds are available for future URL-priority integration;
                    // the adaptive scorer inside process_domain_smart already
                    // handles frontier ordering, so we surface them as a signal
                    // rather than injecting them directly here.
                }

                // ── robots.txt compliance check ───────────────────────────────
                // Attempt to fetch robots.txt for the domain. We do a best-effort
                // check: if the fetch fails we treat the domain as unconstrained
                // (open-world assumption — no robots.txt = unrestricted).
                let robots_url = format!("https://{}/robots.txt", domain);
                let robots_compliant = match ctx.fetcher.fetch(&robots_url).await {
                    Ok(resp) if resp.status == 200 => {
                        robots.parse(domain, &resp.html);
                        // Check whether "/" is allowed — representative root check.
                        !matches!(robots.check(domain, "/"), CrawlPermission::Disallowed)
                    }
                    // Non-200 or fetch error: assume allowed (no robots.txt).
                    _ => true,
                };

                signals.push(EvalSignal {
                    stage_name: "crawl".into(),
                    metric_name: "robots_compliant".into(),
                    value: if robots_compliant { 1.0 } else { 0.0 },
                    timestamp: now.clone(),
                });

                let result = if self.smart {
                    crawler::process_domain_smart(
                        domain,
                        &ctx.fetcher,
                        &ctx.llm,
                        &ctx.db,
                        &mut writer,
                        MAX_PAGES_PER_DOMAIN,
                    )
                    .await
                } else {
                    crawler::process_domain(
                        domain,
                        &ctx.fetcher,
                        &ctx.llm,
                        &ctx.db,
                        &mut writer,
                    )
                    .await
                };

                match result {
                    Ok(result) => {
                        let harvest_rate = if result.pages_fetched > 0 {
                            result.contacts_found as f64 / result.pages_fetched as f64
                        } else {
                            0.0
                        };

                        signals.push(EvalSignal {
                            stage_name: "crawl".into(),
                            metric_name: "pages_fetched".into(),
                            value: result.pages_fetched as f64,
                            timestamp: now.clone(),
                        });
                        signals.push(EvalSignal {
                            stage_name: "crawl".into(),
                            metric_name: "contacts_found".into(),
                            value: result.contacts_found as f64,
                            timestamp: now.clone(),
                        });
                        signals.push(EvalSignal {
                            stage_name: "crawl".into(),
                            metric_name: "harvest_rate".into(),
                            value: harvest_rate,
                            timestamp: now.clone(),
                        });
                        signals.push(EvalSignal {
                            stage_name: "crawl".into(),
                            metric_name: "avg_content_length".into(),
                            value: result.avg_content_length,
                            timestamp: now.clone(),
                        });
                        signals.push(EvalSignal {
                            stage_name: "crawl".into(),
                            metric_name: "cached_pages".into(),
                            value: result.cached_pages as f64,
                            timestamp: now.clone(),
                        });

                        // ── Memory tree: record outcome ───────────────────────
                        if let Some(mem) = &self.memory {
                            mem.lock().await.record(
                                domain,
                                None,
                                "/",
                                result.contacts_found,
                            );
                        }

                        // ── Audit: log completed crawl ────────────────────────
                        audit.log(
                            AuditEventType::CrawlCompleted,
                            "crawl_stage",
                            domain,
                            &format!(
                                "pages={} contacts={} emails={}",
                                result.pages_fetched,
                                result.contacts_found,
                                result.emails_discovered.len(),
                            ),
                        );

                        // Persist crawl stats for bandit feedback.
                        let _ = db::save_crawl_stats(
                            &ctx.db,
                            domain,
                            result.pages_fetched,
                            result.contacts_found,
                            result.emails_discovered.len() as u32,
                        )
                        .await;

                        // Feed the composite reward back into the scheduler so
                        // UCB scores reflect actual crawl outcomes.
                        if let Some(sched) = &self.scheduler {
                            let reward = CrawlReward {
                                pages_fetched: result.pages_fetched,
                                contacts_found: result.contacts_found,
                                emails_found: result.emails_discovered.len() as u32,
                                avg_content_length: result.avg_content_length,
                                novelty_ratio: 0.5,
                            };
                            sched.lock().await.record_composite(domain, &reward);
                        }

                        if let Ok(Some(co)) = db::get_company_by_domain(&ctx.db, domain).await {
                            company_ids.push(co.id);
                        }
                    }
                    Err(_) => {
                        error_count += 1;
                    }
                }
            }

            // Surface aggregate audit log size as a signal so operators can
            // correlate event counts with crawl health.
            signals.push(EvalSignal {
                stage_name: "crawl".into(),
                metric_name: "audit_events_logged".into(),
                value: audit.count() as f64,
                timestamp: now.clone(),
            });

            let _ = db::save_audit_events(&ctx.db, &audit.events()).await;

            search::commit(&mut writer)?;

            Ok(StageOutput {
                input_count,
                output_count: company_ids.len(),
                error_count,
                signals,
                next_input: StageInput::CompanyIds(company_ids),
                duration: start.elapsed(),
            })
        })
    }
}
