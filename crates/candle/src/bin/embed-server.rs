//! Local embedding server — Metal-accelerated BGE-large-en-v1.5 (1024-dim).
//!
//! Usage:
//!   cargo run --bin embed-server --features server          # default: :9999, BGE-large
//!   cargo run --bin embed-server --features server -- --port 8888
//!   cargo run --bin embed-server --features server -- --model BAAI/bge-base-en-v1.5
//!
//! API:
//!   POST /embed  { "input": "query text" }        -> { "data": [{ "embedding": [...], "index": 0 }] }
//!   POST /embed  { "input": ["a", "b"] }          -> { "data": [{ ... }, { ... }] }
//!   GET  /health                                   -> "ok"

use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use candle::{best_device, EmbeddingModel};
use serde::{Deserialize, Serialize};

const DEFAULT_MODEL: &str = "BAAI/bge-large-en-v1.5";
const DEFAULT_PORT: u16 = 9999;

// ── Request / Response ────────────────────────────────────────────

#[derive(Deserialize)]
struct EmbedRequest {
    input: StringOrVec,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum StringOrVec {
    Single(String),
    Batch(Vec<String>),
}

#[derive(Serialize)]
struct EmbedResponse {
    data: Vec<EmbedData>,
}

#[derive(Serialize)]
struct EmbedData {
    embedding: Vec<f32>,
    index: usize,
}

// ── State ─────────────────────────────────────────────────────────

struct AppState {
    model: EmbeddingModel,
}

// ── Handlers ──────────────────────────────────────────────────────

async fn embed_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<EmbedRequest>,
) -> Result<Json<EmbedResponse>, (StatusCode, String)> {
    let texts: Vec<String> = match req.input {
        StringOrVec::Single(s) => vec![s],
        StringOrVec::Batch(v) => v,
    };

    // Run embedding on blocking thread pool — CPU/Metal bound work
    let model = Arc::clone(&state);
    let data = tokio::task::spawn_blocking(move || {
        let refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
        let tensor = model.model.embed(&refs)?;
        let (batch, _hidden) = tensor.dims2().map_err(candle::Error::from)?;
        let mut results = Vec::with_capacity(batch);
        for i in 0..batch {
            let vec = tensor.get(i).map_err(candle::Error::from)?.to_vec1::<f32>()?;
            results.push(EmbedData {
                embedding: vec,
                index: i,
            });
        }
        Ok::<Vec<EmbedData>, candle::Error>(results)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(EmbedResponse { data }))
}

async fn health() -> impl IntoResponse {
    "ok"
}

// ── Main ──────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();

    let mut port = DEFAULT_PORT;
    let mut model_id = DEFAULT_MODEL.to_string();

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--port" | "-p" => {
                i += 1;
                port = args[i].parse().expect("invalid port");
            }
            "--model" | "-m" => {
                i += 1;
                model_id = args[i].clone();
            }
            _ => {}
        }
        i += 1;
    }

    eprintln!("Loading {model_id} ...");
    let device = best_device().expect("no device available");
    eprintln!("Device: {:?}", device);

    let model = EmbeddingModel::from_hf(&model_id, &device).expect("failed to load model");
    eprintln!("Model loaded.");

    // Warm up with a dummy embed
    let _ = model.embed_one("warmup");
    eprintln!("Warmup done.");

    let state = Arc::new(AppState { model });

    let app = Router::new()
        .route("/embed", post(embed_handler))
        .route("/health", get(health))
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    eprintln!("Embedding server listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
