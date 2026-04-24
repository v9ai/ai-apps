//! HTTP server exposing `POST /embed` and `GET /health`.

use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};
use tower_http::cors::CorsLayer;

use crate::embedder::IcpEmbedder;

pub type AppState = Arc<IcpEmbedder>;

#[derive(Debug, Deserialize)]
pub struct EmbedRequest {
    pub texts: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct EmbedResponse {
    pub vectors: Vec<Vec<f32>>,
    pub dim: usize,
    pub model: String,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/embed", post(embed))
        .layer(CorsLayer::permissive())
        .with_state(state)
}

async fn health() -> &'static str {
    "ok"
}

async fn embed(
    State(state): State<AppState>,
    Json(req): Json<EmbedRequest>,
) -> Result<Json<EmbedResponse>, (StatusCode, Json<ErrorResponse>)> {
    if req.texts.is_empty() {
        return Ok(Json(EmbedResponse {
            vectors: vec![],
            dim: state.dim(),
            model: "BAAI/bge-m3".to_string(),
        }));
    }
    let refs: Vec<&str> = req.texts.iter().map(|s| s.as_str()).collect();
    // Candle inference is blocking — run on the blocking pool so we don't
    // starve the async runtime when the caller batches 32+ texts.
    let state_clone = state.clone();
    let texts_owned: Vec<String> = req.texts.clone();
    let vectors = tokio::task::spawn_blocking(move || {
        let refs: Vec<&str> = texts_owned.iter().map(|s| s.as_str()).collect();
        state_clone.embed_batch(&refs)
    })
    .await
    .map_err(|e| internal(format!("join: {e}")))?
    .map_err(|e| internal(format!("embed: {e}")))?;

    let _ = refs;
    Ok(Json(EmbedResponse {
        vectors,
        dim: state.dim(),
        model: "BAAI/bge-m3".to_string(),
    }))
}

fn internal(msg: String) -> (StatusCode, Json<ErrorResponse>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: msg }))
}

pub async fn serve(state: AppState, addr: &str) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("icp-embed listening on {addr}");
    axum::serve(listener, router(state)).await?;
    Ok(())
}
