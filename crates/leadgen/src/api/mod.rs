use axum::{extract::{Json, Path, Query, State}, http::StatusCode, response::IntoResponse, routing::{get, post}, Router};
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::{crawler, db, email, jobs, llm, outreach, scoring, search};

pub struct AppState {
    pub db: db::Db, pub llm: llm::LlmClient, pub fetcher: crawler::Fetcher,
    pub mx_checker: email::mx::MxChecker, pub search_index: tantivy::Index,
    pub index_writer: Mutex<tantivy::IndexWriter>, pub icp: scoring::IcpProfile,
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
    match crawler::process_domain(&req.domain, &s.fetcher, &s.llm, &s.db, &mut w).await {
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
