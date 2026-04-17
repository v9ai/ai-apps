mod api;
mod compliance;
mod crawler;
mod db;
mod dedup;
mod email;
mod entity_resolution;
mod eval;
mod extraction;
mod jobs;
mod llm;
mod matching;
mod outreach;
mod pipeline;
mod report;
mod scoring;
mod search;
pub mod types;
mod vector;

pub use types::{Company, Contact, LeadScore, ScoredLead};

use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "leadgen=info".into()),
        )
        .init();

    info!("starting leadgen engine");

    let args: Vec<String> = std::env::args().collect();
    let command = args.get(1).map(|s| s.as_str()).unwrap_or("serve");

    let database = db::init("data/leads.db").await?;
    info!("database initialized");

    let search_index = search::create_index("data/tantivy_index")?;
    let index_writer = search::create_writer(&search_index)?;
    info!("search index ready");

    // LLM client – prefer mlx_lm.server (OpenAI-compatible on :8080) over Ollama
    let llm_client = if std::env::var("MLX_LM_SERVER").is_ok() {
        llm::LlmClient::remote(
            "http://localhost:8080/v1/chat/completions",
            "mlx-community/Qwen3-8B-4bit",
            "not-needed",
        )
    } else {
        llm::LlmClient::local("qwen2.5:7b-instruct-q4_K_M")
    };
    info!(model = llm_client.model_name(), "LLM client configured");

    // VLM client — optional; pipeline degrades gracefully without it
    let vlm_client = if std::env::var("QWEN_VL_URL").is_ok() || std::env::var("VLLM_SERVER").is_ok() {
        let url = std::env::var("QWEN_VL_URL")
            .unwrap_or_else(|_| "http://localhost:8000/v1".to_string());
        let client = qwen_vl::VlClient::new(&url, None);
        match client.health().await {
            Ok(true) => {
                info!(url = %url, "VLM client connected");
                Some(client)
            }
            _ => {
                info!(url = %url, "VLM server unreachable, running without vision extraction");
                None
            }
        }
    } else {
        info!("No VLM server configured (set QWEN_VL_URL), running text-only extraction");
        None
    };

    let fetcher = crawler::Fetcher::new(1000);
    let mx_checker = email::mx::MxChecker::new()?;

    // ICP profile – AI consultancy campaign (Europe)
    let icp = if std::env::args().any(|a| a == "--icp-ai-consultancy") {
        scoring::IcpProfile {
            target_industries: vec![
                "AI".into(), "Artificial Intelligence".into(), "Machine Learning".into(),
                "Data Science".into(), "Consulting".into(), "Technology Consulting".into(),
                "GenAI".into(), "NLP".into(), "Computer Vision".into(),
                "Deep Learning".into(), "MLOps".into(),
            ],
            min_employees: Some(5),
            max_employees: Some(1000),
            target_seniorities: vec![
                "C-level".into(), "VP".into(), "Director".into(),
                "Manager".into(), "Partner".into(),
            ],
            target_departments: vec![
                "Sales".into(), "Business Development".into(), "Partnerships".into(),
                "Leadership".into(), "Engineering".into(), "Delivery".into(),
            ],
            target_tech_stack: vec![
                "Python".into(), "PyTorch".into(), "TensorFlow".into(),
                "Kubernetes".into(), "AWS".into(), "GCP".into(),
                "Azure".into(), "Databricks".into(), "MLflow".into(),
            ],
            target_locations: vec![],
            funding_stages: vec![],
        }
    } else {
        scoring::IcpProfile::default()
    };

    match command {
        "serve" => {
            let state = Arc::new(api::AppState {
                db: database,
                llm: llm_client,
                vlm: vlm_client,
                fetcher,
                mx_checker,
                search_index,
                index_writer: Mutex::new(index_writer),
                icp,
                pipeline_cost_summary: Arc::new(tokio::sync::RwLock::new(None)),
            });

            let app = api::router(state);
            let addr = "0.0.0.0:3000";
            info!(addr = addr, "API server starting");

            let listener = tokio::net::TcpListener::bind(addr).await?;
            axum::serve(listener, app).await?;
        }

        "enrich" => {
            let domain = args.get(2).expect("usage: leadgen enrich <domain>");
            let mut writer = index_writer;

            let result = crawler::process_domain(
                domain, &fetcher, vlm_client.as_ref(), &llm_client, &database, &mut writer,
            ).await?;

            search::commit(&mut writer)?;

            println!(
                "Enriched {}: {} pages, {} contacts, {} emails",
                result.domain, result.pages_fetched,
                result.contacts_found, result.emails_discovered.len()
            );
            for email in &result.emails_discovered {
                println!("  found: {}", email);
            }
        }

        "verify" => {
            let email_addr = args.get(2).expect("usage: leadgen verify <email>");

            if !email::verify::is_valid_syntax(email_addr) {
                println!("Invalid syntax: {}", email_addr);
                return Ok(());
            }

            let domain = email_addr.split('@').nth(1).unwrap();
            let mx = mx_checker.check_domain(domain).await?;
            println!("MX: {:?}", mx.mx_hosts);
            println!("Provider: {}", mx.provider);

            if let Some(mx_host) = mx.mx_hosts.first() {
                let result = email::verify::verify_smtp(email_addr, mx_host).await?;
                println!("SMTP result: {:?}", result);
            } else {
                println!("No MX records found");
            }
        }

        "score" => {
            let count = jobs::score_all_leads(&database, &icp).await?;
            println!("Scored {} leads", count);
        }

        "top" => {
            let limit = args.get(2).and_then(|s| s.parse::<i64>().ok()).unwrap_or(20);
            let leads = db::top_leads_excluding_duplicates(&database, limit).await?;
            println!("{:<30} {:<25} {:<30} {:<8} {:<6}", "Name", "Title", "Company", "Status", "Score");
            println!("{}", "-".repeat(100));
            for lead in &leads {
                println!(
                    "{:<30} {:<25} {:<30} {:<8} {:.1}",
                    format!("{} {}", lead.first_name, lead.last_name),
                    &lead.title[..lead.title.len().min(24)],
                    &lead.company_name[..lead.company_name.len().min(29)],
                    lead.email_status,
                    lead.composite_score,
                );
            }
        }

        "export" => {
            let leads = db::top_leads(&database, 10000).await?;
            let csv = outreach::export_leads_csv(&leads);
            let path = args.get(2).map(|s| s.as_str()).unwrap_or("leads.csv");
            std::fs::write(path, &csv)?;
            println!("Exported {} leads to {}", leads.len(), path);
        }

        "batch" => {
            let file = args.get(2).expect("usage: leadgen batch <domains.txt>");
            let content = std::fs::read_to_string(file)?;
            let domains: Vec<&str> = content.lines().filter(|l| !l.is_empty()).collect();
            let mut writer = index_writer;

            println!("Processing {} domains...", domains.len());
            for (i, domain) in domains.iter().enumerate() {
                let domain = domain.trim();
                print!("[{}/{}] {} ... ", i + 1, domains.len(), domain);
                match crawler::process_domain(domain, &fetcher, vlm_client.as_ref(), &llm_client, &database, &mut writer).await {
                    Ok(result) => println!("{} pages, {} contacts", result.pages_fetched, result.contacts_found),
                    Err(e) => println!("ERROR: {}", e),
                }
            }
            search::commit(&mut writer)?;
            println!("Done. Run `leadgen score` to score leads.");
        }

        "pipeline" => {
            // Drop the outer index_writer so CrawlStage can acquire its own lock
            drop(index_writer);
            let file = args.get(2).expect("usage: leadgen pipeline <domains.txt>");
            let content = std::fs::read_to_string(file)?;
            let domains: Vec<String> = content.lines().filter(|l| !l.is_empty()).map(|l| l.trim().to_string()).collect();

            info!(domains = domains.len(), "starting full pipeline");

            let scheduler_config = crawler::SchedulerConfig {
                strategy: crawler::ExplorationStrategy::DiscountedUcb,
                ..crawler::SchedulerConfig::default()
            };
            let mut domain_scheduler = crawler::DomainScheduler::new(scheduler_config);
            domain_scheduler.add_domains(&domains);
            let scheduler = Arc::new(Mutex::new(domain_scheduler));

            let ctx = pipeline::PipelineContext {
                db: database.clone(),
                llm: llm_client,
                fetcher,
                mx_checker,
                icp,
                search_index,
                config: pipeline::PipelineConfig::default(),
                vlm: vlm_client,
            };

            let mut runner = pipeline::PipelineRunner::new()
                .add_stage(pipeline::CrawlStage::with_scheduler(scheduler))
                .add_stage(pipeline::ExtractionStage)
                .add_stage(pipeline::ScoringStage)
                .add_stage(pipeline::EntityResolutionStage::new())
                .add_stage(pipeline::VerificationStage);

            let signals = runner.run(&ctx, pipeline::StageInput::Domains(domains)).await?;

            // Print cascade error report so operators can see which stages
            // originated errors and whether any amplified upstream failures.
            let error_report = runner.error_report();
            println!("=== Cascade Error Report ===");
            println!("Total errors: {}", error_report.total_errors);
            if let Some(ref worst) = error_report.worst_originator {
                println!("Worst originator: {worst}");
            }
            if let Some(ref amp) = error_report.worst_amplifier {
                println!("Worst amplifier:  {amp}");
            }
            for stage_stats in &error_report.per_stage {
                println!(
                    "  stage={} originated={} propagated={} CER={:.3} EAF={:.3}",
                    stage_stats.stage,
                    stage_stats.originated,
                    stage_stats.propagated,
                    stage_stats.error_rate,
                    stage_stats.amplification_factor,
                );
            }
            println!("============================");

            let run_id = uuid::Uuid::new_v4().to_string();
            let _ = db::save_pipeline_run(&database, &run_id, 5, signals.len() as i32, true).await;
            let _ = db::save_eval_signals(&database, &run_id, &signals).await;

            let mut collector = eval::EvalCollector::new(50);
            collector.ingest(signals);
            collector.log_summary();

            println!("Pipeline complete. {} signals, run_id={}", collector.signal_count(), run_id);
        }

        "resolve" => {
            let contacts = db::all_contacts(&database).await?;
            let resolver = entity_resolution::EntityResolver::new(entity_resolution::ResolverConfig::default());
            let clusters = resolver.resolve_and_persist(&contacts, &database).await?;
            let dupes: usize = clusters.iter().map(|c| c.member_ids.len().saturating_sub(1)).sum();
            println!("Entity resolution: {} clusters, {} duplicates linked", clusters.len(), dupes);
        }

        "report" => {
            let domain = args.get(2).expect("usage: leadgen report <domain>");
            let company = db::get_company_by_domain(&database, domain).await?
                .expect("company not found for domain");
            let contacts = db::contacts_by_company(&database, &company.id).await?;
            let contact_ids: Vec<&str> = contacts.iter().map(|c| c.id.as_str()).collect();
            let scores = db::lead_scores_for_contacts(&database, &contact_ids).await?;

            // Step 1: Decompose the query into sub-queries.
            let base_query = format!("who are the key contacts at {}", company.name);
            let decomposer = report::QueryDecomposer::new();
            let sub_queries = decomposer.decompose(&base_query);
            println!("QueryDecomposer: {} sub-quer{} generated",
                sub_queries.len(),
                if sub_queries.len() == 1 { "y" } else { "ies" },
            );
            for (i, sq) in sub_queries.iter().enumerate() {
                println!("  [{}] {}", i + 1, sq);
            }

            // Step 2: Retrieve chunks from the search index.
            let retriever = report::HybridRetriever::new(search_index);
            let context = retriever.keyword_search(domain, 12)?;
            let chunks: Vec<report::Chunk> = context
                .iter()
                .enumerate()
                .map(|(i, r)| report::Chunk {
                    text: r.text.clone(),
                    source_id: r.source.clone(),
                    chunk_index: i,
                    section: "body".to_string(),
                })
                .collect();

            // Step 3: Run CRAG evaluation across all sub-queries.
            let evaluator = report::CragEvaluator::new();
            let chunk_inputs: Vec<(String, f64)> = chunks
                .iter()
                .map(|c| (c.text.clone(), 0.5_f64))
                .collect();

            let mut correct_total = 0usize;
            let mut ambiguous_total = 0usize;
            let mut incorrect_total = 0usize;

            for sq in &sub_queries {
                let batch = evaluator.evaluate_batch(sq, &chunk_inputs);
                correct_total += batch.correct_count;
                ambiguous_total += batch.ambiguous_count;
                incorrect_total += batch.incorrect_count;
            }

            // Derive overall quality label for the CLI output.
            let total_evals = correct_total + ambiguous_total + incorrect_total;
            let quality_label = if total_evals == 0 {
                "Incorrect (no chunks)"
            } else if correct_total as f64 / total_evals as f64 > 0.5 {
                "Correct"
            } else if incorrect_total as f64 / total_evals as f64 > 0.5 {
                "Incorrect"
            } else {
                "Ambiguous"
            };

            println!(
                "CRAG evaluation: quality={} correct={} ambiguous={} incorrect={} (across {} sub-quer{})",
                quality_label,
                correct_total,
                ambiguous_total,
                incorrect_total,
                sub_queries.len(),
                if sub_queries.len() == 1 { "y" } else { "ies" },
            );

            // Step 4: Generate the report (ReportGenerator runs CRAG internally).
            let gen = report::ReportGenerator::new(llm_client);
            let rpt = gen.generate(&company, &contacts, &scores, &chunks).await?;

            println!(
                "\n=== {} ===\n{}\n\nKey contacts: {}\nRecommendations: {}\nRetrieval quality: {}\nSub-queries used: {}",
                rpt.company_name,
                rpt.executive_summary,
                rpt.key_contacts.len(),
                rpt.recommendations.len(),
                rpt.retrieval_quality,
                rpt.sub_queries_used,
            );
        }

        "match" => {
            // Build an FTabR index from all company descriptions, then retrieve
            // the top-5 companies similar to a query domain and score each with
            // AttentionScorer.
            let query_domain = args.get(2).expect("usage: leadgen match <domain>");

            let companies = db::list_companies(&database, 10_000, 0).await?;
            if companies.is_empty() {
                println!("No companies in database. Run `leadgen pipeline` or `leadgen batch` first.");
                return Ok(());
            }

            // Build a simple text embedding: character n-gram hash into a
            // fixed-dimension float vector.  This is a placeholder until a real
            // embedding model is wired in; it is sufficient to exercise FTabR
            // and AttentionScorer in the production code path.
            const DIM: usize = 64;
            let embed = |text: &str| -> Vec<f64> {
                let mut v = vec![0.0f64; DIM];
                for (i, byte) in text.bytes().enumerate() {
                    v[i % DIM] += byte as f64 / 255.0;
                }
                // L2-normalise
                let norm: f64 = v.iter().map(|x| x * x).sum::<f64>().sqrt().max(1e-9);
                v.iter().map(|x| x / norm).collect()
            };

            let items: Vec<(String, Vec<f64>)> = companies
                .iter()
                .map(|co| {
                    let text = format!(
                        "{} {} {}",
                        co.name,
                        co.industry.as_deref().unwrap_or(""),
                        co.description.as_deref().unwrap_or(""),
                    );
                    (co.domain.clone().unwrap_or_else(|| co.id.clone()), embed(&text))
                })
                .collect();

            let k = (items.len() as f64).sqrt().ceil() as usize;
            let index = matching::FTabR::build(items, k.max(1));

            let query_text = format!("{} tech software", query_domain);
            let query_vec = embed(&query_text);
            let results = index.retrieve(&query_vec, 5);

            println!("Top-5 companies similar to '{}':", query_domain);
            println!("{:<35} {:<12} {:<10}", "Domain", "Cosine Sim", "Attn Score");
            println!("{}", "-".repeat(60));

            let scorer = matching::AttentionScorer::new(DIM, 8);
            for (domain, cosine_sim) in &results {
                let attention_score = scorer.score(&query_vec);
                println!("{:<35} {:<12.4} {:<10.4}", domain, cosine_sim, attention_score);
            }
        }

        "train" => {
            // Load top leads and their composite scores, hash features via
            // OnlineLearner, and train on pseudo-labels (score > 50 → 1.0).
            let leads = db::top_leads(&database, 10_000).await?;
            if leads.is_empty() {
                println!("No scored leads. Run `leadgen score` first.");
                return Ok(());
            }

            const HASH_DIM: usize = 1 << 18; // 262 144 buckets
            let mut learner = scoring::OnlineLearner::new(HASH_DIM);

            for lead in &leads {
                let features: Vec<(&str, String)> = vec![
                    ("industry", lead.industry.clone()),
                    ("email_status", lead.email_status.clone()),
                    ("icp_fit_score", format!("{:.0}", lead.icp_fit_score)),
                    ("title", lead.title.clone()),
                ];
                let feature_refs: Vec<(&str, &str)> =
                    features.iter().map(|(k, v)| (*k, v.as_str())).collect();
                let hashed =
                    scoring::OnlineLearner::hash_features(&feature_refs, HASH_DIM);

                let label = if lead.composite_score > 50.0 { 1.0 } else { 0.0 };
                learner.update(&hashed, label);
            }

            println!("OnlineLearner training complete.");
            println!("  Leads trained:   {}", learner.observation_count());
            println!("  Steps taken:     {}", learner.step_count());
            println!("  Avg loss:        {:.6}", learner.avg_loss());
            println!("  Weight sparsity: {:.2}%", learner.sparsity() * 100.0);
        }

        #[cfg(feature = "neon")]
        "score-neon" => {
            // Usage: leadgen score-neon --company <key> [--dry-run]
            // Reads contacts from the Neon PostgreSQL database (NEON_DATABASE_URL env var),
            // classifies each contact's position into seniority / department / authority_score
            // / is_decision_maker, prints a ranked table, and writes back to Neon
            // unless --dry-run is passed.
            let company_key = {
                let pos = args.iter().position(|a| a == "--company")
                    .expect("usage: leadgen score-neon --company <key> [--dry-run]");
                args.get(pos + 1).expect("--company requires a value").clone()
            };
            let dry_run = args.iter().any(|a| a == "--dry-run");
            let db_url = std::env::var("NEON_DATABASE_URL")
                .expect("NEON_DATABASE_URL env var must be set");

            db::neon::score_company_contacts(&db_url, &company_key, dry_run).await?;
        }

        _ => {
            eprintln!("Usage: leadgen <command> [args]");
            eprintln!();
            eprintln!("Commands:");
            eprintln!("  serve                  Start API server on :3000");
            eprintln!("  enrich <domain>        Crawl and enrich a single domain");
            eprintln!("  batch <domains.txt>    Batch enrich from file");
            eprintln!("  pipeline <domains.txt> Full pipeline: crawl → extract → score → resolve → verify");
            eprintln!("  resolve                Run entity resolution on all contacts");
            eprintln!("  report <domain>        Generate lead report for a domain");
            eprintln!("  verify <email>         Verify a single email address");
            eprintln!("  score                  Score all leads against ICP");
            eprintln!("  top [limit]            Show top scored leads");
            eprintln!("  export [file.csv]      Export leads to CSV");
            eprintln!("  match <domain>         Find top-5 similar companies via FTabR + AttentionScorer");
            eprintln!("  train                  Train OnlineLearner on top leads (pseudo-labels)");
            eprintln!("  score-neon [neon feat] Score contacts in Neon PostgreSQL (--company <key> [--dry-run])");
        }
    }

    Ok(())
}
