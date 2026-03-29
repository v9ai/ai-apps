//! LanceDB vector store for knowledge-app lessons.
//!
//! Schema mirrors the Neon pgvector layout so embeddings are interchangeable:
//!   slug (Utf8), title (Utf8), excerpt (Utf8), category (Utf8),
//!   word_count (UInt32), vector (FixedSizeList<Float32>[1024])

use std::sync::Arc;

use arrow_array::{
    Array, ArrayRef, FixedSizeListArray, Float32Array, RecordBatch, StringArray, UInt32Array,
};
use arrow_schema::{DataType, Field, Schema};
use futures::TryStreamExt;
use lancedb::query::{ExecutableQuery, QueryBase};
use lancedb::Connection;
use tracing::info;

use crate::error::Result;
use crate::types::{Lesson, SearchResult, DIM};

const TABLE: &str = "lessons";

fn schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("slug", DataType::Utf8, false),
        Field::new("title", DataType::Utf8, false),
        Field::new("excerpt", DataType::Utf8, false),
        Field::new("category", DataType::Utf8, false),
        Field::new("word_count", DataType::UInt32, false),
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

pub struct LessonStore {
    conn: Connection,
}

impl LessonStore {
    /// Open (or create) a Lance store at `path`.
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

    /// Insert lessons that already have embeddings computed.
    pub async fn add(&self, lessons: &[Lesson], vectors: &[Vec<f32>]) -> Result<usize> {
        assert_eq!(lessons.len(), vectors.len());
        if lessons.is_empty() {
            return Ok(0);
        }

        let n = lessons.len();
        let slugs: Vec<&str>    = lessons.iter().map(|l| l.slug.as_str()).collect();
        let titles: Vec<&str>   = lessons.iter().map(|l| l.title.as_str()).collect();
        let excerpts: Vec<&str> = lessons.iter().map(|l| l.excerpt.as_str()).collect();
        let cats: Vec<&str>     = lessons.iter().map(|l| l.category.as_str()).collect();
        let wcs: Vec<u32>       = lessons.iter().map(|l| l.word_count as u32).collect();

        // Flatten all vectors into one contiguous buffer.
        let mut flat: Vec<f32> = Vec::with_capacity(n * DIM);
        for v in vectors {
            flat.extend_from_slice(v);
        }
        let values = Float32Array::from(flat);
        let field  = Arc::new(Field::new("item", DataType::Float32, true));
        let vecs   = FixedSizeListArray::try_new(field, DIM as i32, Arc::new(values), None)?;

        let batch = RecordBatch::try_new(
            schema(),
            vec![
                Arc::new(StringArray::from(slugs))    as ArrayRef,
                Arc::new(StringArray::from(titles))   as ArrayRef,
                Arc::new(StringArray::from(excerpts)) as ArrayRef,
                Arc::new(StringArray::from(cats))     as ArrayRef,
                Arc::new(UInt32Array::from(wcs))      as ArrayRef,
                Arc::new(vecs)                        as ArrayRef,
            ],
        )?;

        let table = self.conn.open_table(TABLE).execute().await?;
        table.add(vec![batch]).execute().await?;

        info!("Stored {} lesson embeddings", n);
        Ok(n)
    }

    /// Semantic search: embed query externally, pass the vector here.
    pub async fn search(&self, query_vec: Vec<f32>, top_k: usize) -> Result<Vec<SearchResult>> {
        let table = self.conn.open_table(TABLE).execute().await?;

        let stream = table
            .vector_search(query_vec)?
            .limit(top_k)
            .execute()
            .await?;

        let batches: Vec<RecordBatch> = stream.try_collect().await?;

        let mut results = Vec::new();
        for batch in &batches {
            let get = |col: &str| -> Vec<String> {
                batch
                    .column_by_name(col)
                    .and_then(|c| c.as_any().downcast_ref::<StringArray>())
                    .map(|a| (0..a.len()).map(|i| a.value(i).to_string()).collect())
                    .unwrap_or_default()
            };

            let slugs    = get("slug");
            let titles   = get("title");
            let excerpts = get("excerpt");
            let cats     = get("category");
            let dists: Vec<f32> = batch
                .column_by_name("_distance")
                .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                .map(|a| (0..a.len()).map(|i| a.value(i)).collect())
                .unwrap_or_else(|| vec![1.0; batch.num_rows()]);

            for i in 0..batch.num_rows() {
                results.push(SearchResult {
                    slug:     slugs.get(i).cloned().unwrap_or_default(),
                    title:    titles.get(i).cloned().unwrap_or_default(),
                    excerpt:  excerpts.get(i).cloned().unwrap_or_default(),
                    category: cats.get(i).cloned().unwrap_or_default(),
                    score:    1.0 / (1.0 + dists.get(i).copied().unwrap_or(1.0)),
                });
            }
        }

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        Ok(results)
    }

    /// Total rows in the lessons table.
    pub async fn count(&self) -> Result<usize> {
        let table = self.conn.open_table(TABLE).execute().await?;
        Ok(table.count_rows(None).await?)
    }
}
