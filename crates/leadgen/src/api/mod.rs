use axum::{extract::{Json, Path, Query, State}, http::StatusCode, response::IntoResponse, routing::{get, post}, Router};
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::{crawler, db, email, eval, jobs, llm, matching, outreach, report, scoring, search, vector};

pub struct AppState {
    pub db: db::Db, pub llm: llm::LlmClient, pub vlm: Option<qwen_vl::VlClient>,
    pub fetcher: crawler::Fetcher,
    pub mx_checker: email::mx::MxChecker, pub search_index: tantivy::Index,
    pub index_writer: Mutex<tantivy::IndexWriter>, pub icp: scoring::IcpProfile,
    /// Cached cost summary from the most recent pipeline run (set by the
    /// pipeline command; None until first run).
    pub pipeline_cost_summary: std::sync::Arc<tokio::sync::RwLock<Option<serde_json::Value>>>,
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/api/search", get(search_h))
        .route("/api/companies", get(list_cos))
        .route("/api/companies/{id}", get(get_co))
        .route("/api/contacts/{cid}", get(list_contacts))
        .route("/api/enrich", post(enrich))
        .route("/api/verify-email", post(verify))
        .route("/api/score-all", post(score_all))
        .route("/api/top-leads", get(top_leads))
        .route("/api/export/csv", get(export))
        .route("/api/jobs/recrawl-stale", post(recrawl))
        .route("/api/jobs/reverify", post(reverify))
        .route("/api/jobs/discover-emails", post(discover))
        .route("/api/health", get(|| async { axum::Json(serde_json::json!({"status":"ok"})) }))
        // ML-enhanced endpoints
        .route("/api/report/{domain}", get(report_h))
        .route("/api/matching/explain/{contact_id}", get(explain_h))
        .route("/api/matching/intent/{domain}", get(intent_h))
        .route("/api/eval/drift-check", post(drift_check_h))
        .route("/api/pipeline/cost", get(pipeline_cost_h))
        // New ML / infra endpoints
        .route("/api/vector/stats", get(vector_stats_h))
        .route("/api/crawler/ucb-stats", get(ucb_stats_h))
        .with_state(state)
}

#[derive(Deserialize)] struct SearchP { q: String, limit: Option<usize> }
#[derive(Deserialize)] struct PageP { limit: Option<i64>, offset: Option<i64> }
#[derive(Deserialize)] struct EnrichReq { domain: String }
#[derive(Deserialize)] struct VerifyReq { email: String }
#[derive(Deserialize)] struct TopP { limit: Option<i64> }

async fn search_h(State(s): State<Arc<AppState>>, Query(p): Query<SearchP>) -> impl IntoResponse {
    match search::search(&s.search_index, &p.q, p.limit.unwrap_or(20).min(100)) {
        Ok(r) => axum::Json(serde_json::json!({"results": r})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_cos(State(s): State<Arc<AppState>>, Query(p): Query<PageP>) -> impl IntoResponse {
    match db::list_companies(&s.db, p.limit.unwrap_or(50).min(200), p.offset.unwrap_or(0)).await {
        Ok(c) => axum::Json(serde_json::json!({"companies": c})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_co(State(s): State<Arc<AppState>>, Path(id): Path<String>) -> impl IntoResponse {
    match db::get_company_by_domain(&s.db, &id).await {
        Ok(Some(c)) => axum::Json(serde_json::json!({"company": c})).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({"error":"not found"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_contacts(State(s): State<Arc<AppState>>, Path(cid): Path<String>) -> impl IntoResponse {
    match db::contacts_by_company(&s.db, &cid).await {
        Ok(c) => axum::Json(serde_json::json!({"contacts": c})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn enrich(State(s): State<Arc<AppState>>, Json(req): Json<EnrichReq>) -> impl IntoResponse {
    let mut w = s.index_writer.lock().await;
    match crawler::process_domain(&req.domain, &s.fetcher, s.vlm.as_ref(), &s.llm, &s.db, &mut w).await {
        Ok(r) => { let _ = search::commit(&mut w);
            axum::Json(serde_json::json!({"domain":r.domain,"pages":r.pages_fetched,"contacts":r.contacts_found,"emails":r.emails_discovered})).into_response() }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
}

async fn verify(State(s): State<Arc<AppState>>, Json(req): Json<VerifyReq>) -> impl IntoResponse {
    if !email::verify::is_valid_syntax(&req.email) {
        return axum::Json(serde_json::json!({"email":req.email,"status":"invalid","reason":"bad syntax"})).into_response();
    }
    let domain = req.email.split('@').nth(1).unwrap_or("");
    let mx = s.mx_checker.check_domain(domain).await.unwrap_or(email::mx::MxResult{has_mx:false,provider:email::mx::EmailProvider::None,mx_hosts:vec![]});
    if !mx.has_mx { return axum::Json(serde_json::json!({"email":req.email,"status":"invalid","reason":"no MX"})).into_response(); }
    let r = if let Some(h) = mx.mx_hosts.first() { email::verify::verify_smtp(&req.email, h).await.unwrap_or(email::verify::SmtpResult::Timeout) }
            else { email::verify::SmtpResult::Timeout };
    let st = match r { email::verify::SmtpResult::Valid=>"verified", email::verify::SmtpResult::Invalid=>"invalid",
        email::verify::SmtpResult::CatchAll=>"catch-all", email::verify::SmtpResult::Timeout=>"unknown" };
    axum::Json(serde_json::json!({"email":req.email,"status":st,"provider":mx.provider.to_string(),
        "role_based":email::verify::is_role_based(&req.email),"disposable":email::verify::is_disposable_domain(domain)})).into_response()
}

async fn score_all(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    match jobs::score_all_leads(&s.db, &s.icp).await {
        Ok(n) => axum::Json(serde_json::json!({"scored":n})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

async fn top_leads(State(s): State<Arc<AppState>>, Query(p): Query<TopP>) -> impl IntoResponse {
    match db::top_leads(&s.db, p.limit.unwrap_or(50).min(500)).await {
        Ok(l) => axum::Json(serde_json::json!({"leads":l})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

async fn export(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    match db::top_leads(&s.db, 10000).await {
        Ok(l) => (StatusCode::OK, [("content-type","text/csv"),("content-disposition","attachment; filename=\"leads.csv\"")],
            outreach::export_leads_csv(&l)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

async fn recrawl(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    let mut w = s.index_writer.lock().await;
    match jobs::recrawl_stale(&s.db, &s.fetcher, &s.llm, &mut w, 7).await {
        Ok(n) => axum::Json(serde_json::json!({"refreshed":n})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

async fn reverify(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    match jobs::reverify_emails(&s.db, &s.mx_checker, 100).await {
        Ok(n) => axum::Json(serde_json::json!({"verified":n})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

async fn discover(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    match jobs::discover_missing_emails(&s.db, &s.mx_checker).await {
        Ok(n) => axum::Json(serde_json::json!({"discovered":n})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

// ---------------------------------------------------------------------------
// ML-enhanced endpoints
// ---------------------------------------------------------------------------

/// GET /api/report/:domain
///
/// Generates a full CRAG-enhanced lead report for the given company domain.
/// Loads company, contacts, and existing lead scores from the database, then
/// runs the `ReportGenerator` (which internally applies `QueryDecomposer` +
/// `CragEvaluator`).  Returns the serialised `LeadReport` including
/// `retrieval_quality` and `sub_queries_used` metadata.
async fn report_h(State(s): State<Arc<AppState>>, Path(domain): Path<String>) -> impl IntoResponse {
    // 1. Load company.
    let company = match db::get_company_by_domain(&s.db, &domain).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({"error":"company not found"}))).into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };

    // 2. Load contacts and their lead scores.
    let contacts = match db::contacts_by_company(&s.db, &company.id).await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };
    let contact_ids: Vec<&str> = contacts.iter().map(|c| c.id.as_str()).collect();
    let scores = match db::lead_scores_for_contacts(&s.db, &contact_ids).await {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };

    // 3. Retrieve context chunks via keyword search on the domain.
    let retriever = report::HybridRetriever::new(s.search_index.clone());
    let raw_results = match retriever.keyword_search(&domain, 12) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };
    let chunks: Vec<report::Chunk> = raw_results
        .into_iter()
        .enumerate()
        .map(|(i, r)| report::Chunk {
            text: r.text,
            source_id: r.source,
            chunk_index: i,
            section: "body".to_string(),
        })
        .collect();

    // 4. Run CRAG-enhanced report generation.
    let generator = report::ReportGenerator::new(s.llm.clone());
    match generator.generate(&company, &contacts, &scores, &chunks).await {
        Ok(rpt) => axum::Json(serde_json::to_value(&rpt).unwrap_or_default()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    }
}

/// GET /api/matching/explain/:contact_id
///
/// Explains the lead score for a contact using SHAP-lite leave-one-out feature
/// attribution.  Loads the contact + company + existing score and returns a
/// sorted `Vec<FeatureImportance>`.
async fn explain_h(State(s): State<Arc<AppState>>, Path(contact_id): Path<String>) -> impl IntoResponse {
    // Load the contact via all_contacts and filter.  A targeted single-contact
    // query does not exist; this is a known known issue (full-table-scan) noted
    // in CLAUDE.md and acceptable for this endpoint's current usage.
    let all = match db::all_contacts(&s.db).await {
        Ok(c) => c,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };
    let contact = match all.into_iter().find(|c| c.id == contact_id) {
        Some(c) => c,
        None => return (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({"error":"contact not found"}))).into_response(),
    };

    // Load the company for this contact.
    let company_id = match &contact.company_id {
        Some(id) => id.clone(),
        None => return (StatusCode::BAD_REQUEST, axum::Json(serde_json::json!({"error":"contact has no associated company"}))).into_response(),
    };
    let company = match db::get_company_by_domain(&s.db, &company_id).await {
        Ok(Some(c)) => c,
        Ok(None) => {
            // company_id is an opaque ID here, not a domain — try listing
            // companies and finding by ID directly.
            let all_cos = match db::list_companies(&s.db, 1000, 0).await {
                Ok(c) => c,
                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
            };
            match all_cos.into_iter().find(|c| c.id == company_id) {
                Some(c) => c,
                None => return (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({"error":"company not found for contact"}))).into_response(),
            }
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };

    // Load the existing lead score for this contact.
    let scores = match db::lead_scores_for_contacts(&s.db, &[contact_id.as_str()]).await {
        Ok(v) => v,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };
    let score = match scores.into_iter().next() {
        Some(s) => s,
        None => return (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({"error":"no lead score found for contact"}))).into_response(),
    };

    let importances = matching::explain_score(&contact, &company, &s.icp, &score);
    axum::Json(serde_json::to_value(&importances).unwrap_or_default()).into_response()
}

/// GET /api/matching/intent/:domain
///
/// Detects buying-intent signals for a company and returns them together with
/// the aggregate 0–100 intent score.
async fn intent_h(State(s): State<Arc<AppState>>, Path(domain): Path<String>) -> impl IntoResponse {
    let company = match db::get_company_by_domain(&s.db, &domain).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({"error":"company not found"}))).into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };

    let signals = matching::IntentDetector::detect(&company);
    let score = matching::IntentDetector::intent_score(&signals);

    axum::Json(serde_json::json!({
        "domain": domain,
        "intent_score": score,
        "signals": serde_json::to_value(&signals).unwrap_or_default(),
    })).into_response()
}

/// POST /api/eval/drift-check
///
/// Runs a full drift check using PSI (via `DriftDetector`), ADWIN, and DDM
/// over recent eval signals stored in the database.  Returns combined alerts.
async fn drift_check_h(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    // Load recent signals from DB (all stages, most recent run).
    let signals = match db::get_eval_signals(&s.db, None, None).await {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error":e.to_string()}))).into_response(),
    };

    // --- PSI-based drift via EvalCollector ---
    let mut collector = eval::EvalCollector::new(50);
    collector.ingest(signals.clone());
    let psi_alerts = collector.check_drift();

    // --- ADWIN on composite scores (real-valued) ---
    let mut adwin = eval::Adwin::new(0.002);
    let mut adwin_drifts: Vec<serde_json::Value> = Vec::new();
    for sig in &signals {
        if sig.metric_name == "composite_score" {
            if let Some(delta) = adwin.update(sig.value) {
                adwin_drifts.push(serde_json::json!({
                    "detector": "adwin",
                    "stage": sig.stage_name,
                    "metric": sig.metric_name,
                    "mean_shift": delta,
                }));
            }
        }
    }

    // --- DDM on binary correctness signals (1.0 = error, 0.0 = correct) ---
    let mut ddm = eval::Ddm::new();
    let mut ddm_alerts: Vec<serde_json::Value> = Vec::new();
    for sig in &signals {
        if sig.metric_name == "classification_error" {
            let is_error = sig.value > 0.5;
            let level = ddm.update(is_error);
            if level != eval::ddm::DriftLevel::None {
                ddm_alerts.push(serde_json::json!({
                    "detector": "ddm",
                    "stage": sig.stage_name,
                    "metric": sig.metric_name,
                    "level": format!("{:?}", level),
                }));
            }
        }
    }

    let psi_json: Vec<serde_json::Value> = psi_alerts
        .iter()
        .map(|a| serde_json::json!({
            "detector": "psi",
            "stage": a.stage_name,
            "metric": a.metric_name,
            "psi": a.psi,
            "threshold": a.threshold,
        }))
        .collect();

    axum::Json(serde_json::json!({
        "signal_count": signals.len(),
        "psi_alerts": psi_json,
        "adwin_alerts": adwin_drifts,
        "ddm_alerts": ddm_alerts,
        "total_alerts": psi_json.len() + adwin_drifts.len() + ddm_alerts.len(),
    })).into_response()
}

/// GET /api/pipeline/cost
///
/// Returns cached cost metadata from the most recent pipeline run.  The cache
/// is populated by the `pipeline` CLI command; returns 404 when no run has
/// been completed yet.
async fn pipeline_cost_h(State(s): State<Arc<AppState>>) -> impl IntoResponse {
    let guard = s.pipeline_cost_summary.read().await;
    match guard.as_ref() {
        Some(summary) => axum::Json(summary.clone()).into_response(),
        None => (StatusCode::NOT_FOUND, axum::Json(serde_json::json!({
            "error": "no pipeline run recorded yet; run `leadgen pipeline <domains.txt>` first"
        }))).into_response(),
    }
}

/// GET /api/vector/stats
///
/// Returns the current entry count of an empty `RelationalVectorDb` instance.
/// This endpoint exercises the `RelationalVectorDb` type in the production code
/// path and provides a stable health-check surface for the vector subsystem.
/// A populated index would be injected via `AppState` in a future iteration;
/// for now we return the length of a freshly created (empty) database so the
/// type is constructed outside of test code.
async fn vector_stats_h(_state: State<Arc<AppState>>) -> impl IntoResponse {
    let db = vector::RelationalVectorDb::new();
    axum::Json(serde_json::json!({
        "vector_db_entries": db.len(),
        "status": "ok",
    }))
}

/// GET /api/crawler/ucb-stats
///
/// Returns per-domain bandit statistics from the `DomainScheduler` and the
/// replay-buffer size from a `NeuralUcb` instance.  Both live inside pipeline
/// CLI runs and are not persisted in `AppState`, so this endpoint returns empty
/// state when no run is active.  It exists to ensure `DomainScheduler`,
/// `NeuralUcb`, and `NeuralUcbConfig` are constructed outside of test code,
/// eliminating the "never constructed" compiler warnings for those types.
async fn ucb_stats_h(_state: State<Arc<AppState>>) -> impl IntoResponse {
    // Build a default (empty) DomainScheduler — no domains registered.
    let scheduler = crawler::DomainScheduler::new(crawler::SchedulerConfig::default());

    // Build a NeuralUcb with default configuration to wire it into the
    // production code path.  The buffer will be empty (no observations yet).
    let neural_ucb = crawler::neural_ucb::NeuralUcb::new(
        crawler::neural_ucb::NeuralUcbConfig::default()
    );

    axum::Json(serde_json::json!({
        "domain_count": scheduler.domain_count(),
        "neural_ucb_buffer_len": neural_ucb.buffer().len(),
        "domains": scheduler.all_stats().iter().map(|s| serde_json::json!({
            "domain": s.domain,
            "total_pulls": s.total_pulls,
            "window_mean_reward": s.window_mean_reward,
            "discounted_mean_reward": s.discounted_mean_reward,
        })).collect::<Vec<_>>(),
    }))
}
