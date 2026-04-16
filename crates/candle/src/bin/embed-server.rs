//! Multi-model embedding server — Metal-accelerated, TEI-inspired.
//!
//! Loads multiple BERT-family models on startup, each addressable by name.
//! All models share the same Metal device.
//!
//! Usage:
//!   cargo run --bin embed-server --features server
//!   cargo run --bin embed-server --features server -- --port 8888
//!   cargo run --bin embed-server --features server -- --models bge-small,bge-large
//!   cargo run --bin embed-server --features server -- --models bge-small  # single model
//!
//! API:
//!   POST /embed/:model  { "input": "text" }    -> { "data": [{ "embedding": [...], "index": 0 }], "model": "bge-small", "dim": 384 }
//!   POST /embed         { "input": "text" }    -> uses default model (bge-large)
//!   GET  /health                                -> { "status": "ok", "models": { "bge-small": { "dim": 384 }, ... } }

use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use candle::{best_device, EmbeddingModel};
use serde::{Deserialize, Serialize};

const DEFAULT_PORT: u16 = 9999;
const DEFAULT_MODEL: &str = "bge-large";

// ── Model registry ───────────────────────────────────────────────

struct ModelEntry {
    model: EmbeddingModel,
    repo_id: String,
    dim: usize,
}

/// Known model aliases → HuggingFace repo IDs.
fn known_models() -> Vec<(&'static str, &'static str, usize)> {
    vec![
        ("bge-small", "BAAI/bge-small-en-v1.5", 384),
        ("bge-large", "BAAI/bge-large-en-v1.5", 1024),
        ("bge-base", "BAAI/bge-base-en-v1.5", 768),
        ("minilm", "sentence-transformers/all-MiniLM-L6-v2", 384),
    ]
}

// ── Request / Response ───────────────────────────────────────────

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
    model: String,
    dim: usize,
}

#[derive(Serialize)]
struct EmbedData {
    embedding: Vec<f32>,
    index: usize,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    models: HashMap<String, ModelInfo>,
}

#[derive(Serialize)]
struct ModelInfo {
    repo: String,
    dim: usize,
}

// ── State ────────────────────────────────────────────────────────

struct AppState {
    models: HashMap<String, ModelEntry>,
    default_model: String,
}

// ── Handlers ─────────────────────────────────────────────────────

async fn embed_named(
    State(state): State<Arc<AppState>>,
    Path(model_name): Path<String>,
    Json(req): Json<EmbedRequest>,
) -> Result<Json<EmbedResponse>, (StatusCode, String)> {
    embed_with_model(state, model_name, req).await
}

async fn embed_default(
    State(state): State<Arc<AppState>>,
    Json(req): Json<EmbedRequest>,
) -> Result<Json<EmbedResponse>, (StatusCode, String)> {
    let default = state.default_model.clone();
    embed_with_model(state, default, req).await
}

async fn embed_with_model(
    state: Arc<AppState>,
    model_name: String,
    req: EmbedRequest,
) -> Result<Json<EmbedResponse>, (StatusCode, String)> {
    // Validate model exists before spawning blocking task
    let dim = state
        .models
        .get(&model_name)
        .map(|e| e.dim)
        .ok_or_else(|| {
            let available: Vec<&str> = state.models.keys().map(|k| k.as_str()).collect();
            (
                StatusCode::NOT_FOUND,
                format!("model '{model_name}' not loaded. available: {available:?}"),
            )
        })?;

    let texts: Vec<String> = match req.input {
        StringOrVec::Single(s) => vec![s],
        StringOrVec::Batch(v) => v,
    };

    let name = model_name.clone();

    // Run on blocking thread — Metal/CPU bound
    let data = tokio::task::spawn_blocking(move || {
        let entry = state.models.get(&model_name).unwrap();
        let refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
        let tensor = entry.model.embed(&refs)?;
        let (batch, _hidden) = tensor.dims2().map_err(candle::Error::from)?;
        let mut results = Vec::with_capacity(batch);
        for i in 0..batch {
            let vec = tensor
                .get(i)
                .map_err(candle::Error::from)?
                .to_vec1::<f32>()?;
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

    Ok(Json(EmbedResponse {
        data,
        model: name,
        dim,
    }))
}

async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let models = state
        .models
        .iter()
        .map(|(name, entry)| {
            (
                name.clone(),
                ModelInfo {
                    repo: entry.repo_id.clone(),
                    dim: entry.dim,
                },
            )
        })
        .collect();

    Json(HealthResponse {
        status: "ok",
        models,
    })
}

// ── Main ─────────────────────────────────────────────────────────

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();

    let mut port = DEFAULT_PORT;
    let mut model_names: Vec<String> = vec![];

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--port" | "-p" => {
                i += 1;
                port = args[i].parse().expect("invalid port");
            }
            "--models" | "-m" => {
                i += 1;
                model_names = args[i].split(',').map(|s| s.trim().to_string()).collect();
            }
            _ => {}
        }
        i += 1;
    }

    // Default: load bge-large only (backward compat)
    if model_names.is_empty() {
        model_names.push(DEFAULT_MODEL.to_string());
    }

    let known = known_models();
    let device = best_device().expect("no device available");
    eprintln!("Device: {:?}", device);

    let mut models = HashMap::new();

    for name in &model_names {
        let (repo_id, dim) = match known.iter().find(|(alias, _, _)| alias == &name.as_str()) {
            Some((_, repo, dim)) => (repo.to_string(), *dim),
            None => {
                // Treat as raw HF repo ID — detect dim after loading
                (name.clone(), 0)
            }
        };

        eprintln!("Loading {name} ({repo_id}) ...");
        let model =
            EmbeddingModel::from_hf(&repo_id, &device).expect(&format!("failed to load {name}"));

        // Warmup — triggers Metal shader compilation
        let warmup_vec = model.embed_one("warmup").expect("warmup failed");
        let actual_dim = warmup_vec.len();
        eprintln!("  {name}: {actual_dim}-dim, ready.");

        models.insert(
            name.clone(),
            ModelEntry {
                model,
                repo_id,
                dim: if dim > 0 { dim } else { actual_dim },
            },
        );
    }

    eprintln!(
        "Loaded {} model(s): {:?}",
        models.len(),
        models.keys().collect::<Vec<_>>()
    );

    let state = Arc::new(AppState {
        models,
        default_model: model_names[0].clone(),
    });

    let app = Router::new()
        .route("/embed/{model_name}", post(embed_named))
        .route("/embed", post(embed_default))
        .route("/health", get(health))
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    eprintln!("Embedding server listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
