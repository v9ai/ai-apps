//! LanceDB vector store for hotel reviews — schema, ingest, and semantic search.
//!
//! Stores review texts with their sentiment scores, aspect scores, and metadata
//! for semantic search and analysis.

use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    Array, ArrayRef, FixedSizeListArray, Float32Array, Float64Array, RecordBatch, StringArray,
    BooleanArray,
};
use arrow_schema::{DataType, Field, Schema};
use lancedb::query::{ExecutableQuery, QueryBase};
use lancedb::Connection;
use tracing::info;

use crate::embeddings::{EmbeddingEngine, DIM};
use crate::reviews::Review;

const REVIEWS_TABLE: &str = "reviews";

/// Review stored in LanceDB with embedding vector.
#[derive(Debug, Clone)]
pub struct StoredReview {
    pub review_id: String,
    pub hotel_id: String,
    pub text: String,
    pub source: String,
    pub sentiment: f32,
    pub aspects_json: String,
    pub is_representative: bool,
    pub indexed_at: f64,
    pub vector: Vec<f32>,
}

fn reviews_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("review_id", DataType::Utf8, false),
        Field::new("hotel_id", DataType::Utf8, false),
        Field::new("text", DataType::Utf8, false),
        Field::new("source", DataType::Utf8, false),
        Field::new("sentiment", DataType::Float32, false),
        Field::new("aspects_json", DataType::Utf8, false),
        Field::new("is_representative", DataType::Boolean, false),
        Field::new("indexed_at", DataType::Float64, true),
        Field::new(
            "vector",
            DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                DIM as i32,
            ),
            true,
        ),
    ]))
}

fn now_secs() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

/// LanceDB-backed store for embedding, indexing, and searching reviews.
pub struct ReviewStore {
    conn: Connection,
    engine: EmbeddingEngine,
}

impl ReviewStore {
    /// Open (or create) a LanceDB store at `path` with the given embedding engine.
    pub async fn connect(path: &str, engine: EmbeddingEngine) -> Result<Self> {
        let conn = lancedb::connect(path)
            .execute()
            .await
            .context("connecting to LanceDB")?;

        let tables: Vec<String> = conn
            .table_names()
            .execute()
            .await
            .context("listing LanceDB tables")?;

        if !tables.contains(&REVIEWS_TABLE.to_string()) {
            let schema = reviews_schema();
            let batch = RecordBatch::new_empty(schema.clone());
            conn.create_table(REVIEWS_TABLE, batch)
                .execute()
                .await
                .context("creating reviews table")?;
            info!("Created '{REVIEWS_TABLE}' table");
        }

        Ok(Self { conn, engine })
    }

    /// Build an Arrow RecordBatch from reviews + their pre-computed embeddings.
    fn build_batch(reviews: &[StoredReview], vecs: &[Vec<f32>]) -> Result<RecordBatch> {
        let n = reviews.len();
        let mut review_ids = Vec::with_capacity(n);
        let mut hotel_ids = Vec::with_capacity(n);
        let mut texts = Vec::with_capacity(n);
        let mut sources = Vec::with_capacity(n);
        let mut sentiments = Vec::with_capacity(n);
        let mut aspects = Vec::with_capacity(n);
        let mut representatives = Vec::with_capacity(n);
        let mut timestamps = Vec::with_capacity(n);
        let mut all_vecs: Vec<f32> = Vec::with_capacity(n * DIM);

        for (r, v) in reviews.iter().zip(vecs.iter()) {
            review_ids.push(r.review_id.clone());
            hotel_ids.push(r.hotel_id.clone());
            texts.push(r.text.clone());
            sources.push(r.source.clone());
            sentiments.push(r.sentiment);
            aspects.push(r.aspects_json.clone());
            representatives.push(r.is_representative);
            timestamps.push(r.indexed_at);
            all_vecs.extend_from_slice(v);
        }

        let vec_values = Float32Array::from(all_vecs);
        let vec_field = Arc::new(Field::new("item", DataType::Float32, true));
        let vec_array =
            FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)
                .context("building vector array")?;

        let schema = reviews_schema();
        RecordBatch::try_new(
            schema,
            vec![
                Arc::new(StringArray::from(review_ids)) as ArrayRef,
                Arc::new(StringArray::from(hotel_ids)) as ArrayRef,
                Arc::new(StringArray::from(texts)) as ArrayRef,
                Arc::new(StringArray::from(sources)) as ArrayRef,
                Arc::new(Float32Array::from(sentiments)) as ArrayRef,
                Arc::new(StringArray::from(aspects)) as ArrayRef,
                Arc::new(BooleanArray::from(representatives)) as ArrayRef,
                Arc::new(Float64Array::from(timestamps)) as ArrayRef,
                Arc::new(vec_array) as ArrayRef,
            ],
        )
        .context("building reviews RecordBatch")
    }

    /// Embed and insert reviews into the store. Returns the count inserted.
    pub async fn add_reviews(&self, reviews: &[StoredReview]) -> Result<usize> {
        if reviews.is_empty() {
            return Ok(0);
        }

        // Embed review texts
        let embed_texts: Vec<&str> = reviews.iter().map(|r| r.text.as_str()).collect();
        let vecs = self
            .engine
            .embed_batch(&embed_texts)
            .context("embedding reviews")?;

        let batch = Self::build_batch(reviews, &vecs)?;

        let table = self
            .conn
            .open_table(REVIEWS_TABLE)
            .execute()
            .await
            .context("opening reviews table")?;
        table
            .add(vec![batch])
            .execute()
            .await
            .context("inserting reviews batch")?;

        info!("Indexed {} reviews", reviews.len());
        Ok(reviews.len())
    }

    /// Convert a Review to StoredReview (without vector - will be computed during insert).
    pub fn review_to_stored(review: &Review, hotel_id: &str, review_idx: usize) -> StoredReview {
        StoredReview {
            review_id: format!("{}-{}", hotel_id, review_idx),
            hotel_id: hotel_id.to_string(),
            text: review.text.clone(),
            source: review.source.clone(),
            sentiment: review.sentiment,
            aspects_json: serde_json::to_string(&review.aspects).unwrap_or_default(),
            is_representative: review.is_representative,
            indexed_at: now_secs(),
            vector: vec![0.0; DIM], // Placeholder - will be computed during insert
        }
    }

    /// Get all reviews for a specific hotel.
    pub async fn get_reviews_for_hotel(&self, hotel_id: &str) -> Result<Vec<StoredReview>> {
        let table = self
            .conn
            .open_table(REVIEWS_TABLE)
            .execute()
            .await
            .context("opening reviews table")?;

        let results = table
            .query()
            .only_if(format!("hotel_id = '{}'", hotel_id))
            .execute()
            .await
            .context("querying reviews")?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting review results")?;

        let mut reviews = Vec::new();
        for batch in &batches {
            let n = batch.num_rows();
            for i in 0..n {
                reviews.push(stored_review_from_batch(batch, i));
            }
        }

        Ok(reviews)
    }

    /// Semantic search: find reviews similar to query text.
    pub async fn search_reviews(&self, query: &str, top_k: usize) -> Result<Vec<(StoredReview, f32)>> {
        let query_vec = self
            .engine
            .embed_one(query)
            .context("embedding search query")?;

        let table = self
            .conn
            .open_table(REVIEWS_TABLE)
            .execute()
            .await
            .context("opening reviews table for search")?;

        let results = table
            .vector_search(query_vec)
            .context("vector_search")?
            .limit(top_k)
            .execute()
            .await
            .context("executing vector search")?;

        let mut hits = Vec::new();
        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting search results")?;

        for batch in &batches {
            let n = batch.num_rows();
            for i in 0..n {
                let review = stored_review_from_batch(batch, i);
                let dist = batch
                    .column_by_name("_distance")
                    .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                    .map(|c| c.value(i))
                    .unwrap_or(1.0);
                // LanceDB returns L2 distance; convert to similarity score
                let score = 1.0 / (1.0 + dist);
                hits.push((review, score));
            }
        }

        hits.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        Ok(hits)
    }

    /// Search reviews for a specific hotel by semantic similarity.
    pub async fn search_reviews_for_hotel(
        &self,
        hotel_id: &str,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<(StoredReview, f32)>> {
        let query_vec = self
            .engine
            .embed_one(query)
            .context("embedding search query")?;

        let table = self
            .conn
            .open_table(REVIEWS_TABLE)
            .execute()
            .await
            .context("opening reviews table for search")?;

        let results = table
            .vector_search(query_vec)
            .context("vector_search")?
            .only_if(format!("hotel_id = '{}'", hotel_id))
            .limit(top_k)
            .execute()
            .await
            .context("executing vector search")?;

        let mut hits = Vec::new();
        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting search results")?;

        for batch in &batches {
            let n = batch.num_rows();
            for i in 0..n {
                let review = stored_review_from_batch(batch, i);
                let dist = batch
                    .column_by_name("_distance")
                    .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                    .map(|c| c.value(i))
                    .unwrap_or(1.0);
                let score = 1.0 / (1.0 + dist);
                hits.push((review, score));
            }
        }

        hits.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        Ok(hits)
    }

    /// Get total review count in the store.
    pub async fn count(&self) -> Result<usize> {
        let table = self
            .conn
            .open_table(REVIEWS_TABLE)
            .execute()
            .await
            .context("opening reviews table")?;

        let results = table
            .query()
            .execute()
            .await
            .context("querying reviews")?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting review results")?;

        Ok(batches.iter().map(|b| b.num_rows()).sum())
    }

    /// Get review counts grouped by hotel.
    pub async fn count_by_hotel(&self) -> Result<Vec<(String, usize)>> {
        let table = self
            .conn
            .open_table(REVIEWS_TABLE)
            .execute()
            .await
            .context("opening reviews table")?;

        let results = table
            .query()
            .execute()
            .await
            .context("querying reviews")?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting review results")?;

        let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        for batch in &batches {
            let n = batch.num_rows();
            for i in 0..n {
                if let Some(col) = batch.column_by_name("hotel_id").and_then(|c| c.as_any().downcast_ref::<StringArray>()) {
                    let hotel_id = col.value(i).to_string();
                    *counts.entry(hotel_id).or_insert(0) += 1;
                }
            }
        }

        let mut result: Vec<(String, usize)> = counts.into_iter().collect();
        result.sort_by(|a, b| b.1.cmp(&a.1));
        Ok(result)
    }
}

/// Extract a `StoredReview` from a RecordBatch row.
fn stored_review_from_batch(batch: &RecordBatch, i: usize) -> StoredReview {
    let get_str = |name: &str| -> String {
        batch
            .column_by_name(name)
            .and_then(|c| c.as_any().downcast_ref::<StringArray>())
            .map(|c| c.value(i).to_string())
            .unwrap_or_default()
    };

    let sentiment = batch
        .column_by_name("sentiment")
        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.0);

    let is_representative = batch
        .column_by_name("is_representative")
        .and_then(|c| c.as_any().downcast_ref::<BooleanArray>())
        .map(|c| c.value(i))
        .unwrap_or(false);

    let indexed_at = batch
        .column_by_name("indexed_at")
        .and_then(|c| c.as_any().downcast_ref::<Float64Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.0);

    // Extract vector
    let vector = batch
        .column_by_name("vector")
        .and_then(|c| c.as_any().downcast_ref::<FixedSizeListArray>())
        .map(|arr| {
            let values = arr.values().as_any().downcast_ref::<Float32Array>().unwrap();
            let start = i * DIM;
            values.values()[start..start + DIM].to_vec()
        })
        .unwrap_or_else(|| vec![0.0; DIM]);

    StoredReview {
        review_id: get_str("review_id"),
        hotel_id: get_str("hotel_id"),
        text: get_str("text"),
        source: get_str("source"),
        sentiment,
        aspects_json: get_str("aspects_json"),
        is_representative,
        indexed_at,
        vector,
    }
}
