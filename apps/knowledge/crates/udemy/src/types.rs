//! Udemy course data model.

use serde::{Deserialize, Serialize};

/// A Udemy course scraped from a course page.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Course {
    /// Slug derived from the URL path, e.g. "docker-and-kubernetes-the-complete-guide"
    pub course_id: String,
    pub title: String,
    pub url: String,
    pub description: String,
    pub instructor: String,
    /// "Beginner" | "Intermediate" | "Advanced" | "All Levels"
    pub level: String,
    pub rating: f32,
    pub review_count: u32,
    pub num_students: u32,
    pub duration_hours: f32,
    /// e.g. "$19.99" or "Free"
    pub price: String,
    pub language: String,
    pub category: String,
    pub image_url: String,
    /// JSON array of "what you'll learn" topics
    pub topics_json: String,
}

impl Course {
    /// Build the text used for embedding — rich signal for semantic search.
    pub fn embed_text(&self) -> String {
        let topics = serde_json::from_str::<Vec<String>>(&self.topics_json)
            .unwrap_or_default()
            .join(", ");

        let mut text = format!("{}\n\n{}", self.title, self.description);
        if !self.instructor.is_empty() {
            text.push_str(&format!("\n\nInstructor: {}.", self.instructor));
        }
        if !self.level.is_empty() {
            text.push_str(&format!(" Level: {}.", self.level));
        }
        if !topics.is_empty() {
            text.push_str(&format!(" Topics: {}.", topics));
        }
        text
    }
}

/// A course returned from a vector search, with similarity score.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourseSearchResult {
    pub course: Course,
    pub score: f32,
}
