use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: i32,
    pub first_name: String,
    pub last_name: String,
    pub linkedin_url: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub position: Option<String>,
    pub scraped_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Post {
    #[serde(default)]
    pub post_url: Option<String>,
    #[serde(default)]
    pub post_text: Option<String>,
    #[serde(default)]
    pub posted_date: Option<String>,
    #[serde(default)]
    pub reactions_count: i32,
    #[serde(default)]
    pub comments_count: i32,
    #[serde(default)]
    pub reposts_count: i32,
    #[serde(default = "default_media_type")]
    pub media_type: String,
    #[serde(default)]
    pub is_repost: bool,
    #[serde(default)]
    pub original_author: Option<String>,
}

fn default_media_type() -> String {
    "none".to_string()
}

/// Post with storage metadata (id, contact_id, scraped_at) + ML analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredPost {
    pub id: i64,
    pub contact_id: i32,
    pub post_url: Option<String>,
    pub post_text: Option<String>,
    pub posted_date: Option<String>,
    pub reactions_count: i32,
    pub comments_count: i32,
    pub reposts_count: i32,
    pub media_type: String,
    pub is_repost: bool,
    pub original_author: Option<String>,
    pub scraped_at: String,
    // ML analysis fields
    pub relevance_score: f32,
    pub primary_intent: String,
    pub intent_hiring: f32,
    pub intent_ai_ml: f32,
    pub intent_remote: f32,
    pub intent_eng_culture: f32,
    pub intent_company_growth: f32,
    pub intent_thought_leadership: f32,
    pub intent_noise: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entities_json: Option<String>,
}

// ── API request/response types ──

#[derive(Debug, Deserialize)]
pub struct AddContactsRequest {
    pub contacts: Vec<Contact>,
}

#[derive(Debug, Deserialize)]
pub struct AddPostsRequest {
    pub contact_id: i32,
    pub posts: Vec<Post>,
}

#[derive(Debug, Serialize)]
pub struct InsertResult {
    pub inserted: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duplicates: Option<usize>,
    /// Posts dropped by relevance scoring.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filtered: Option<usize>,
    /// Intent distribution of kept posts.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intent_summary: Option<IntentSummary>,
}

/// Aggregate intent distribution for a batch of posts.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentSummary {
    pub hiring: usize,
    pub ai_ml: usize,
    pub remote: usize,
    pub eng_culture: usize,
    pub company_growth: usize,
    pub thought_leadership: usize,
    pub noise: usize,
}

/// Query parameters for filtered post retrieval.
#[derive(Debug, Deserialize)]
pub struct ClassifiedPostsQuery {
    pub intent: Option<String>,
    pub min_confidence: Option<f32>,
    pub contact_id: Option<i32>,
    pub limit: Option<usize>,
}

/// Intent histogram across all stored posts.
#[derive(Debug, Serialize)]
pub struct IntentDistribution {
    pub total_posts: usize,
    pub hiring: usize,
    pub ai_ml: usize,
    pub remote: usize,
    pub eng_culture: usize,
    pub company_growth: usize,
    pub thought_leadership: usize,
    pub noise: usize,
    pub avg_relevance: f32,
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub contacts: usize,
    pub posts: usize,
}

#[derive(Debug, Serialize)]
pub struct ExportResponse {
    pub contacts: Vec<Contact>,
    pub posts: Vec<StoredPost>,
}
