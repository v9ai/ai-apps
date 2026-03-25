mod db;
mod models;
mod neon;

use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use tower_http::cors::CorsLayer;

use db::PostsDb;
use models::{AddContactsRequest, AddPostsRequest, ExportResponse, InsertResult, StatsResponse};

type AppState = Arc<PostsDb>;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "linkedin_posts=info".into()),
        )
        .init();

    let db_path = dirs_or_default();
    tracing::info!("LanceDB path: {}", db_path);

    let db = PostsDb::open(&db_path).await?;
    let state: AppState = Arc::new(db);

    let app = Router::new()
        .route("/contacts", get(get_contacts).post(add_contacts))
        .route("/posts", post(add_posts))
        .route("/stats", get(stats))
        .route("/export", get(export))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = "0.0.0.0:9876";
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn dirs_or_default() -> String {
    if let Ok(p) = std::env::var("LANCE_DB_PATH") {
        return p;
    }
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    format!("{}/.lance/linkedin", home)
}

async fn get_contacts(
    State(db): State<AppState>,
) -> Result<Json<Vec<models::Contact>>, (StatusCode, String)> {
    let contacts = neon::fetch_contacts_with_linkedin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Also persist to LanceDB
    if let Err(e) = db.add_contacts(&contacts).await {
        tracing::warn!("Failed to cache contacts in LanceDB: {}", e);
    }

    Ok(Json(contacts))
}

async fn add_contacts(
    State(db): State<AppState>,
    Json(req): Json<AddContactsRequest>,
) -> Result<Json<InsertResult>, (StatusCode, String)> {
    let inserted = db
        .add_contacts(&req.contacts)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(InsertResult {
        inserted,
        duplicates: None,
    }))
}

async fn add_posts(
    State(db): State<AppState>,
    Json(req): Json<AddPostsRequest>,
) -> Result<Json<InsertResult>, (StatusCode, String)> {
    let (inserted, duplicates) = db
        .add_posts(req.contact_id, &req.posts)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(InsertResult {
        inserted,
        duplicates: Some(duplicates),
    }))
}

async fn stats(State(db): State<AppState>) -> Json<StatsResponse> {
    let (contacts, posts) = db.stats().await;
    Json(StatsResponse { contacts, posts })
}

async fn export(State(db): State<AppState>) -> Json<ExportResponse> {
    Json(db.export().await)
}
