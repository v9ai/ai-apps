//! 10-expert Candle LLM course review pipeline with Lance columnar storage.
//!
//! # Quick start
//!
//! ```no_run
//! use course_review::{CourseInput, CourseReviewPipeline};
//!
//! let mut pipeline = CourseReviewPipeline::new("./course-reviews.lance")?;
//! let course = CourseInput { ... };
//! let review = pipeline.review(&course)?;
//! println!("{}: {}/10 ({})", review.title, review.aggregate_score, review.verdict);
//! ```

pub mod error;
pub mod prompts;
pub mod scorer;
pub mod store;
pub mod types;

mod llm;

pub use error::{Error, Result};
pub use types::{CourseInput, CourseReview, ExpertScore, ExpertType, Verdict};

use llm::LocalLlm;
use scorer::ExpertScorer;
use store::ReviewStore;

/// Combines the 10-expert scorer with Lance storage.
///
/// The LLM is loaded once on construction and reused for all reviews.
pub struct CourseReviewPipeline {
    scorer: ExpertScorer,
    store: ReviewStore,
}

impl CourseReviewPipeline {
    /// Load the default Qwen2.5-3B GGUF model and open/create a Lance store at `store_path`.
    pub async fn new(store_path: &str) -> Result<Self> {
        let device = llm::best_device()?;
        tracing::info!("Using device: {:?}", device);
        let llm = LocalLlm::load_default(&device)?;
        let scorer = ExpertScorer::new(llm);
        let store = ReviewStore::connect(store_path).await?;
        Ok(Self { scorer, store })
    }

    /// Run the 10-expert review for a course.
    pub fn review_course(&mut self, course: &CourseInput) -> Result<CourseReview> {
        self.scorer.review(course)
    }

    /// Review a course and persist the result to Lance.
    pub async fn review_and_store(&mut self, course: &CourseInput) -> Result<CourseReview> {
        let review = self.scorer.review(course)?;
        self.store.upsert(&review).await?;
        Ok(review)
    }

    /// Get a previously stored review by course_id.
    pub async fn get_review(&self, course_id: &str) -> Result<Option<CourseReview>> {
        self.store.get(course_id).await
    }

    /// List reviews with aggregate_score >= min_score.
    pub async fn top_courses(&self, min_score: f32) -> Result<Vec<CourseReview>> {
        self.store.list_by_score(min_score).await
    }

    /// Total reviews stored.
    pub async fn review_count(&self) -> Result<usize> {
        self.store.count().await
    }
}
