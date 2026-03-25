mod config;
mod models;
mod routes;
mod state;

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "legal_inference=info".into()),
        )
        .init();

    let config = Config::from_env();
    let port = config.port;

    let state = Arc::new(AppState::load(config)?);

    let app = Router::new()
        .route("/health", get(routes::health::health))
        .route("/v1/embeddings", post(routes::embed::embeddings))
        .route("/v1/similarity", post(routes::embed::similarity))
        .route("/v1/chat/completions", post(routes::chat::completions))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    tracing::info!("Legal inference server on {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
