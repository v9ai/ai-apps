use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use tower_http::cors::CorsLayer;

use linkedin_posts::{authority, models, neon};
use linkedin_posts::db::PostsDb;
use linkedin_posts::intent_scorer::PostIntentScorer;
use linkedin_posts::models::{
    AddContactsRequest, AddPostsRequest, ClassifiedPostsQuery, ExportResponse, InsertResult,
    IntentDistribution, StatsResponse,
};

struct AppStateInner {
    db: PostsDb,
    scorer: tokio::sync::RwLock<PostIntentScorer>,
}

type AppState = Arc<AppStateInner>;

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

    // Load scorer from JSON or use default pretrained weights
    let weights_path = format!("{}/post_intent_weights.json", db_path);
    let scorer = match PostIntentScorer::from_json(std::path::Path::new(&weights_path)) {
        Ok(s) => {
            tracing::info!("Loaded intent scorer weights from {}", weights_path);
            s
        }
        Err(_) => {
            tracing::info!("Using default pretrained intent scorer weights");
            PostIntentScorer::default_pretrained()
        }
    };

    let state: AppState = Arc::new(AppStateInner {
        db,
        scorer: tokio::sync::RwLock::new(scorer),
    });

    let app = Router::new()
        // Original routes
        .route("/contacts", get(get_contacts).post(add_contacts))
        .route("/posts", post(add_posts))
        .route("/stats", get(stats))
        .route("/export", get(export))
        // New ML routes
        .route("/posts/classified", get(get_classified_posts))
        .route("/posts/signals/{contact_id}", get(get_post_signals))
        .route("/posts/intents/distribution", get(get_intent_distribution))
        .route("/scorer/reload", post(reload_scorer))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = "0.0.0.0:9876";
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

fn dirs_or_default() -> String {
    linkedin_posts::lance_db_path()
}

// ── Original handlers ────────────────────────────────────────────────────────

async fn get_contacts(
    State(state): State<AppState>,
) -> Result<Json<Vec<models::Contact>>, (StatusCode, String)> {
    let contacts = neon::fetch_contacts_with_linkedin()
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Cache in LanceDB
    if let Err(e) = state.db.add_contacts(&contacts).await {
        tracing::warn!("Failed to cache contacts in LanceDB: {}", e);
    }

    Ok(Json(contacts))
}

async fn add_contacts(
    State(state): State<AppState>,
    Json(req): Json<AddContactsRequest>,
) -> Result<Json<InsertResult>, (StatusCode, String)> {
    let inserted = state
        .db
        .add_contacts(&req.contacts)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(InsertResult {
        inserted,
        duplicates: None,
        filtered: None,
        intent_summary: None,
    }))
}

async fn add_posts(
    State(state): State<AppState>,
    Json(req): Json<AddPostsRequest>,
) -> Result<Json<InsertResult>, (StatusCode, String)> {
    let scorer = state.scorer.read().await;
    let (inserted, duplicates, filtered, intent_summary) = state
        .db
        .add_posts(req.contact_id, &req.posts, &scorer)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update contact authority in background (non-blocking)
    if inserted > 0 {
        let contact_id = req.contact_id;
        let posts = state.db.get_posts().await;
        tokio::spawn(async move {
            let contact_posts: Vec<_> = posts
                .iter()
                .filter(|p| p.contact_id == contact_id)
                .cloned()
                .collect();
            let signals = authority::aggregate_signals(contact_id, &contact_posts);
            if signals.authority_delta > 0.0 {
                if let Err(e) =
                    neon::update_contact_authority(contact_id, signals.authority_delta).await
                {
                    tracing::warn!("Failed to update authority for contact {}: {}", contact_id, e);
                }
            }
        });
    }

    Ok(Json(InsertResult {
        inserted,
        duplicates: Some(duplicates),
        filtered: if filtered > 0 { Some(filtered) } else { None },
        intent_summary,
    }))
}

async fn stats(State(state): State<AppState>) -> Json<StatsResponse> {
    let contacts = neon::count_contacts().await.unwrap_or(0) as usize;
    let posts = state.db.posts_count().await;
    Json(StatsResponse { contacts, posts })
}

async fn export(State(state): State<AppState>) -> Json<ExportResponse> {
    Json(state.db.export().await)
}

// ── New ML endpoints ─────────────────────────────────────────────────────────

/// GET /posts/classified?intent=hiring&min_confidence=0.5&contact_id=123&limit=50
async fn get_classified_posts(
    State(state): State<AppState>,
    Query(query): Query<ClassifiedPostsQuery>,
) -> Json<Vec<models::StoredPost>> {
    let posts = state.db.get_posts().await;
    let limit = query.limit.unwrap_or(100);
    let min_conf = query.min_confidence.unwrap_or(0.3);

    let filtered: Vec<_> = posts
        .into_iter()
        .filter(|p| {
            // Filter by contact_id if specified
            if let Some(cid) = query.contact_id {
                if p.contact_id != cid {
                    return false;
                }
            }

            // Filter by intent + confidence
            if let Some(ref intent) = query.intent {
                let score = match intent.as_str() {
                    "hiring" | "hiring_signal" => p.intent_hiring,
                    "ai_ml" | "ai_ml_content" => p.intent_ai_ml,
                    "remote" | "remote_signal" => p.intent_remote,
                    "eng_culture" | "engineering_culture" => p.intent_eng_culture,
                    "company_growth" => p.intent_company_growth,
                    "thought_leadership" => p.intent_thought_leadership,
                    "noise" => p.intent_noise,
                    _ => return false,
                };
                score >= min_conf
            } else {
                true
            }
        })
        .take(limit)
        .collect();

    Json(filtered)
}

/// GET /posts/signals/:contact_id
async fn get_post_signals(
    State(state): State<AppState>,
    Path(contact_id): Path<i32>,
) -> Json<authority::ContactPostSignals> {
    let posts = state.db.get_posts().await;
    let contact_posts: Vec<_> = posts
        .into_iter()
        .filter(|p| p.contact_id == contact_id)
        .collect();
    Json(authority::aggregate_signals(contact_id, &contact_posts))
}

/// GET /posts/intents/distribution
async fn get_intent_distribution(State(state): State<AppState>) -> Json<IntentDistribution> {
    let posts = state.db.get_posts().await;
    let total = posts.len();

    if total == 0 {
        return Json(IntentDistribution {
            total_posts: 0,
            hiring: 0,
            ai_ml: 0,
            remote: 0,
            eng_culture: 0,
            company_growth: 0,
            thought_leadership: 0,
            noise: 0,
            avg_relevance: 0.0,
        });
    }

    let threshold = 0.4f32;
    let mut hiring = 0;
    let mut ai_ml = 0;
    let mut remote = 0;
    let mut eng_culture = 0;
    let mut company_growth = 0;
    let mut thought_leadership = 0;
    let mut noise = 0;
    let mut sum_relevance = 0.0f32;

    for p in &posts {
        if p.intent_hiring > threshold {
            hiring += 1;
        }
        if p.intent_ai_ml > threshold {
            ai_ml += 1;
        }
        if p.intent_remote > threshold {
            remote += 1;
        }
        if p.intent_eng_culture > threshold {
            eng_culture += 1;
        }
        if p.intent_company_growth > threshold {
            company_growth += 1;
        }
        if p.intent_thought_leadership > threshold {
            thought_leadership += 1;
        }
        if p.intent_noise > threshold {
            noise += 1;
        }
        sum_relevance += p.relevance_score;
    }

    Json(IntentDistribution {
        total_posts: total,
        hiring,
        ai_ml,
        remote,
        eng_culture,
        company_growth,
        thought_leadership,
        noise,
        avg_relevance: sum_relevance / total as f32,
    })
}

/// POST /scorer/reload — hot-reload intent scorer weights from JSON file.
async fn reload_scorer(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let db_path = dirs_or_default();
    let weights_path = format!("{}/post_intent_weights.json", db_path);
    let path = std::path::Path::new(&weights_path);

    let scorer = PostIntentScorer::from_json(path)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    *state.scorer.write().await = scorer;

    tracing::info!("Reloaded intent scorer weights from {}", weights_path);
    Ok(Json(serde_json::json!({
        "status": "ok",
        "message": format!("Reloaded weights from {}", weights_path)
    })))
}
