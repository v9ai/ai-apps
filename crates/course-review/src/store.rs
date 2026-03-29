//! LanceDB columnar store for course reviews.
//!
//! Schema (no vector column — plain row store, embeddings can be added later):
//!   course_id (Utf8), title (Utf8), url (Utf8), provider (Utf8),
//!   level (Utf8), rating (Float32), review_count (UInt32),
//!   duration_hours (Float32), is_free (Boolean),
//!   pedagogy_score (UInt8), technical_accuracy_score (UInt8),
//!   content_depth_score (UInt8), practical_application_score (UInt8),
//!   instructor_clarity_score (UInt8), curriculum_fit_score (UInt8),
//!   prerequisites_score (UInt8), ai_domain_relevance_score (UInt8),
//!   community_health_score (UInt8), value_proposition_score (UInt8),
//!   aggregate_score (Float32), verdict (Utf8), summary (Utf8),
//!   expert_details (Utf8), reviewed_at (Utf8), model_version (Utf8)

use std::sync::Arc;

use arrow_array::{
    Array, ArrayRef, BooleanArray, Float32Array, RecordBatch, StringArray, UInt32Array, UInt8Array,
};
use arrow_schema::{DataType, Field, Schema};
use futures::TryStreamExt;
use lancedb::query::{ExecutableQuery, QueryBase};
use lancedb::Connection;
use tracing::info;

use crate::error::{Error, Result};
use crate::types::{CourseReview, ExpertScore, Verdict};

const TABLE: &str = "reviews";

fn schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("course_id",                    DataType::Utf8,    false),
        Field::new("title",                        DataType::Utf8,    false),
        Field::new("url",                          DataType::Utf8,    false),
        Field::new("provider",                     DataType::Utf8,    false),
        Field::new("level",                        DataType::Utf8,    false),
        Field::new("rating",                       DataType::Float32, false),
        Field::new("review_count",                 DataType::UInt32,  false),
        Field::new("duration_hours",               DataType::Float32, false),
        Field::new("is_free",                      DataType::Boolean, false),
        Field::new("pedagogy_score",               DataType::UInt8,   false),
        Field::new("technical_accuracy_score",     DataType::UInt8,   false),
        Field::new("content_depth_score",          DataType::UInt8,   false),
        Field::new("practical_application_score",  DataType::UInt8,   false),
        Field::new("instructor_clarity_score",     DataType::UInt8,   false),
        Field::new("curriculum_fit_score",         DataType::UInt8,   false),
        Field::new("prerequisites_score",          DataType::UInt8,   false),
        Field::new("ai_domain_relevance_score",    DataType::UInt8,   false),
        Field::new("community_health_score",       DataType::UInt8,   false),
        Field::new("value_proposition_score",      DataType::UInt8,   false),
        Field::new("aggregate_score",              DataType::Float32, false),
        Field::new("verdict",                      DataType::Utf8,    false),
        Field::new("summary",                      DataType::Utf8,    false),
        Field::new("expert_details",               DataType::Utf8,    false),
        Field::new("reviewed_at",                  DataType::Utf8,    false),
        Field::new("model_version",                DataType::Utf8,    false),
    ]))
}

/// Serialize a single `CourseReview` into a one-row `RecordBatch`.
fn review_to_batch(review: &CourseReview) -> Result<RecordBatch> {
    let expert_details = serde_json::json!({
        "pedagogy":               review.pedagogy,
        "technical_accuracy":     review.technical_accuracy,
        "content_depth":          review.content_depth,
        "practical_application":  review.practical_application,
        "instructor_clarity":     review.instructor_clarity,
        "curriculum_fit":         review.curriculum_fit,
        "prerequisites":          review.prerequisites,
        "ai_domain_relevance":    review.ai_domain_relevance,
        "community_health":       review.community_health,
        "value_proposition":      review.value_proposition,
    })
    .to_string();

    let batch = RecordBatch::try_new(
        schema(),
        vec![
            Arc::new(StringArray::from(vec![review.course_id.as_str()]))   as ArrayRef,
            Arc::new(StringArray::from(vec![review.title.as_str()]))        as ArrayRef,
            Arc::new(StringArray::from(vec![review.url.as_str()]))          as ArrayRef,
            Arc::new(StringArray::from(vec![review.provider.as_str()]))     as ArrayRef,
            Arc::new(StringArray::from(vec![review.level.as_str()]))        as ArrayRef,
            Arc::new(Float32Array::from(vec![review.rating]))               as ArrayRef,
            Arc::new(UInt32Array::from(vec![review.review_count]))          as ArrayRef,
            Arc::new(Float32Array::from(vec![review.duration_hours]))       as ArrayRef,
            Arc::new(BooleanArray::from(vec![review.is_free]))              as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.pedagogy.score]))                as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.technical_accuracy.score]))      as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.content_depth.score]))           as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.practical_application.score]))   as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.instructor_clarity.score]))      as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.curriculum_fit.score]))          as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.prerequisites.score]))           as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.ai_domain_relevance.score]))     as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.community_health.score]))        as ArrayRef,
            Arc::new(UInt8Array::from(vec![review.value_proposition.score]))       as ArrayRef,
            Arc::new(Float32Array::from(vec![review.aggregate_score]))      as ArrayRef,
            Arc::new(StringArray::from(vec![review.verdict.as_str()]))      as ArrayRef,
            Arc::new(StringArray::from(vec![review.summary.as_str()]))      as ArrayRef,
            Arc::new(StringArray::from(vec![expert_details.as_str()]))      as ArrayRef,
            Arc::new(StringArray::from(vec![review.reviewed_at.as_str()]))  as ArrayRef,
            Arc::new(StringArray::from(vec![review.model_version.as_str()])) as ArrayRef,
        ],
    )?;

    Ok(batch)
}

/// Reconstruct a `CourseReview` from a single row in a `RecordBatch`.
fn batch_row_to_review(batch: &RecordBatch, row: usize) -> Result<CourseReview> {
    macro_rules! str_col {
        ($name:expr) => {
            batch
                .column_by_name($name)
                .and_then(|c| c.as_any().downcast_ref::<StringArray>())
                .map(|a| a.value(row).to_string())
                .unwrap_or_default()
        };
    }
    macro_rules! f32_col {
        ($name:expr) => {
            batch
                .column_by_name($name)
                .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                .map(|a| a.value(row))
                .unwrap_or_default()
        };
    }
    macro_rules! u32_col {
        ($name:expr) => {
            batch
                .column_by_name($name)
                .and_then(|c| c.as_any().downcast_ref::<UInt32Array>())
                .map(|a| a.value(row))
                .unwrap_or_default()
        };
    }
    macro_rules! u8_col {
        ($name:expr) => {
            batch
                .column_by_name($name)
                .and_then(|c| c.as_any().downcast_ref::<UInt8Array>())
                .map(|a| a.value(row))
                .unwrap_or_default()
        };
    }
    macro_rules! bool_col {
        ($name:expr) => {
            batch
                .column_by_name($name)
                .and_then(|c| c.as_any().downcast_ref::<BooleanArray>())
                .map(|a| a.value(row))
                .unwrap_or_default()
        };
    }

    // Deserialize expert_details JSON back into individual ExpertScore structs.
    let expert_details_str = str_col!("expert_details");
    let details: serde_json::Value = serde_json::from_str(&expert_details_str)
        .unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    let parse_expert = |key: &str| -> ExpertScore {
        serde_json::from_value(details[key].clone()).unwrap_or(ExpertScore {
            score: 0,
            reasoning: String::new(),
            strengths: vec![],
            weaknesses: vec![],
        })
    };

    let verdict_str = str_col!("verdict");
    let aggregate_score = f32_col!("aggregate_score");
    let verdict = match verdict_str.as_str() {
        "excellent"   => Verdict::Excellent,
        "recommended" => Verdict::Recommended,
        "average"     => Verdict::Average,
        _             => Verdict::from_score(aggregate_score),
    };

    Ok(CourseReview {
        course_id:            str_col!("course_id"),
        title:                str_col!("title"),
        url:                  str_col!("url"),
        provider:             str_col!("provider"),
        level:                str_col!("level"),
        rating:               f32_col!("rating"),
        review_count:         u32_col!("review_count"),
        duration_hours:       f32_col!("duration_hours"),
        is_free:              bool_col!("is_free"),
        pedagogy:             parse_expert("pedagogy"),
        technical_accuracy:   parse_expert("technical_accuracy"),
        content_depth:        parse_expert("content_depth"),
        practical_application: parse_expert("practical_application"),
        instructor_clarity:   parse_expert("instructor_clarity"),
        curriculum_fit:       parse_expert("curriculum_fit"),
        prerequisites:        parse_expert("prerequisites"),
        ai_domain_relevance:  parse_expert("ai_domain_relevance"),
        community_health:     parse_expert("community_health"),
        value_proposition:    parse_expert("value_proposition"),
        aggregate_score,
        verdict,
        summary:              str_col!("summary"),
        // top_strengths / key_weaknesses are not stored in Lance (derivable from expert_details).
        // Reconstruct as empty vecs; callers that need them should recompute.
        top_strengths:        vec![],
        key_weaknesses:       vec![],
        reviewed_at:          str_col!("reviewed_at"),
        model_version:        str_col!("model_version"),
    })
}

/// Collect all rows from a stream of `RecordBatch`es into `CourseReview`s.
async fn collect_reviews(
    stream: impl futures::Stream<Item = std::result::Result<RecordBatch, arrow_schema::ArrowError>>,
) -> Result<Vec<CourseReview>> {
    let batches: Vec<RecordBatch> = stream.try_collect().await?;
    let mut reviews = Vec::new();
    for batch in &batches {
        for row in 0..batch.num_rows() {
            reviews.push(batch_row_to_review(batch, row)?);
        }
    }
    Ok(reviews)
}

// ─────────────────────────────────────────────────────────────────────────────

pub struct ReviewStore {
    conn: Connection,
}

impl ReviewStore {
    /// Open or create a Lance store at `path`.
    pub async fn connect(path: &str) -> Result<Self> {
        let conn = lancedb::connect(path).execute().await?;

        let tables = conn.table_names().execute().await?;
        if !tables.contains(&TABLE.to_string()) {
            let batch = RecordBatch::new_empty(schema());
            conn.create_table(TABLE, batch).execute().await?;
            info!("Created '{TABLE}' table in {path}");
        }

        Ok(Self { conn })
    }

    /// Upsert a review (delete existing row by course_id, then insert).
    pub async fn upsert(&self, review: &CourseReview) -> Result<()> {
        let table = self.conn.open_table(TABLE).execute().await?;

        // Delete any existing row with this course_id first.
        table
            .delete(&format!("course_id = '{}'", review.course_id))
            .await?;

        let batch = review_to_batch(review)?;
        table.add(vec![batch]).execute().await?;

        info!("Upserted review for course_id={}", review.course_id);
        Ok(())
    }

    /// Get a review by course_id. Returns None if not found.
    pub async fn get(&self, course_id: &str) -> Result<Option<CourseReview>> {
        let table = self.conn.open_table(TABLE).execute().await?;

        let stream = table
            .query()
            .only_if(&format!("course_id = '{}'", course_id))
            .execute()
            .await?;

        let mut reviews = collect_reviews(stream).await?;
        Ok(reviews.pop())
    }

    /// List reviews with aggregate_score >= min_score, sorted descending.
    pub async fn list_by_score(&self, min_score: f32) -> Result<Vec<CourseReview>> {
        let table = self.conn.open_table(TABLE).execute().await?;

        let stream = table
            .query()
            .only_if(&format!("aggregate_score >= {}", min_score))
            .execute()
            .await?;

        let mut reviews = collect_reviews(stream).await?;
        reviews.sort_by(|a, b| {
            b.aggregate_score
                .partial_cmp(&a.aggregate_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        Ok(reviews)
    }

    /// List reviews by verdict string (e.g. "excellent", "recommended").
    pub async fn list_by_verdict(&self, verdict: &str) -> Result<Vec<CourseReview>> {
        let table = self.conn.open_table(TABLE).execute().await?;

        let stream = table
            .query()
            .only_if(&format!("verdict = '{}'", verdict))
            .execute()
            .await?;

        collect_reviews(stream).await
    }

    /// Total number of reviews stored.
    pub async fn count(&self) -> Result<usize> {
        let table = self.conn.open_table(TABLE).execute().await?;
        Ok(table.count_rows(None).await?)
    }

    /// Export all reviews as a JSON array string.
    pub async fn export_json(&self) -> Result<String> {
        let table = self.conn.open_table(TABLE).execute().await?;
        let stream = table.query().execute().await?;
        let reviews = collect_reviews(stream).await?;
        Ok(serde_json::to_string_pretty(&reviews)?)
    }
}
