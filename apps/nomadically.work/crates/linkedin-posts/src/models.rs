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

/// Post with storage metadata (id, contact_id, scraped_at)
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
