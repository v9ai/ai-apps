use serde::{Deserialize, Serialize};

/// BGE-large-en-v1.5 output dimension — matches the knowledge app's Neon pgvector schema.
pub const DIM: usize = 1024;

/// A parsed lesson from the knowledge app's content/ directory.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lesson {
    pub slug: String,
    pub title: String,
    /// First non-heading paragraph used as the excerpt.
    pub excerpt: String,
    /// Full markdown content.
    pub content: String,
    pub category: String,
    pub word_count: usize,
}

impl Lesson {
    /// The text that gets embedded — title + excerpt gives a dense, representative signal.
    pub fn embed_text(&self) -> String {
        format!("{}\n\n{}", self.title, self.excerpt)
    }
}

/// A row returned from a Lance vector search.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub slug: String,
    pub title: String,
    pub excerpt: String,
    pub category: String,
    pub score: f32,
}
