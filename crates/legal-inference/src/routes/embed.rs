use std::sync::Arc;

use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};

use crate::state::AppState;

// --- OpenAI-compatible /v1/embeddings ---

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct EmbeddingRequest {
    pub input: EmbeddingInput,
    #[serde(default)]
    pub model: Option<String>,
}

#[derive(Deserialize)]
#[serde(untagged)]
pub enum EmbeddingInput {
    Single(String),
    Batch(Vec<String>),
}

#[derive(Serialize)]
pub struct EmbeddingResponse {
    pub object: &'static str,
    pub data: Vec<EmbeddingData>,
    pub model: String,
    pub usage: EmbeddingUsage,
}

#[derive(Serialize)]
pub struct EmbeddingData {
    pub object: &'static str,
    pub index: usize,
    pub embedding: Vec<f32>,
}

#[derive(Serialize)]
pub struct EmbeddingUsage {
    pub prompt_tokens: usize,
    pub total_tokens: usize,
}

pub async fn embeddings(
    State(state): State<Arc<AppState>>,
    Json(req): Json<EmbeddingRequest>,
) -> Result<Json<EmbeddingResponse>, (StatusCode, String)> {
    let texts: Vec<String> = match req.input {
        EmbeddingInput::Single(s) => vec![s],
        EmbeddingInput::Batch(v) => v,
    };

    let refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
    let embeddings = state
        .embedder
        .embed_batch(&refs)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total_tokens: usize = texts.iter().map(|t| t.split_whitespace().count()).sum();

    let data: Vec<EmbeddingData> = embeddings
        .into_iter()
        .enumerate()
        .map(|(i, emb)| EmbeddingData {
            object: "embedding",
            index: i,
            embedding: emb,
        })
        .collect();

    Ok(Json(EmbeddingResponse {
        object: "list",
        data,
        model: state.config.embed_model.clone(),
        usage: EmbeddingUsage {
            prompt_tokens: total_tokens,
            total_tokens,
        },
    }))
}

// --- Custom /v1/similarity ---

#[derive(Deserialize)]
pub struct SimilarityRequest {
    pub query: String,
    pub documents: Vec<String>,
}

#[derive(Serialize)]
pub struct SimilarityResponse {
    pub similarities: Vec<f32>,
}

pub async fn similarity(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SimilarityRequest>,
) -> Result<Json<SimilarityResponse>, (StatusCode, String)> {
    let query_emb = state
        .embedder
        .embed(&req.query)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let doc_refs: Vec<&str> = req.documents.iter().map(|s| s.as_str()).collect();
    let doc_embs = state
        .embedder
        .embed_batch(&doc_refs)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let similarities: Vec<f32> = doc_embs
        .iter()
        .map(|doc| cosine_similarity(&query_emb, doc))
        .collect();

    Ok(Json(SimilarityResponse { similarities }))
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a > 0.0 && norm_b > 0.0 {
        dot / (norm_a * norm_b)
    } else {
        0.0
    }
}
