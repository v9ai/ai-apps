use std::sync::Arc;

use axum::{extract::State, Json};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub device: String,
    pub models: ModelsInfo,
}

#[derive(Serialize)]
pub struct ModelsInfo {
    pub embedding: ModelInfo,
    pub llm: ModelInfo,
}

#[derive(Serialize)]
pub struct ModelInfo {
    pub name: String,
    pub loaded: bool,
}

pub async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        device: state.device_name.clone(),
        models: ModelsInfo {
            embedding: ModelInfo {
                name: state.config.embed_model.clone(),
                loaded: true,
            },
            llm: ModelInfo {
                name: format!("{}/{}", state.config.llm_model, state.config.llm_file),
                loaded: true,
            },
        },
    })
}
