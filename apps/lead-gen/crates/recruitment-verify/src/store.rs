/// LanceDB vector store for the recruitment reference corpus.
///
/// Schema: text (Utf8) | label (UInt8, 1=recruitment 0=not) | vector (FixedSizeList<Float32>[384])
///
/// At startup we embed the ~30 reference snippets and build a table.
/// At query time we run `vector_search` to find the top-K nearest neighbours
/// and majority-vote on the label.

use std::sync::Arc;

use arrow_array::{
    ArrayRef, FixedSizeListArray, Float32Array, RecordBatch, StringArray, UInt8Array,
};
use arrow_schema::{DataType, Field, Schema};
use futures::TryStreamExt;
use lancedb::query::{ExecutableQuery, QueryBase};
use lancedb::Connection;
use tracing::info;

use crate::corpus::CorpusEntry;

const DIM: usize = 384;
const TABLE: &str = "uk_recruitment_corpus";

fn schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("text", DataType::Utf8, false),
        Field::new("label", DataType::UInt8, false),
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

/// A single neighbour returned by kNN search.
pub struct Neighbour {
    pub text: String,
    pub label: u8,
    pub distance: f32,
}

pub struct CorpusStore {
    conn: Connection,
}

impl CorpusStore {
    /// Build the reference corpus table from scratch.
    /// `vectors[i]` is the embedding for `entries[i]`.
    pub async fn build(
        path: &str,
        entries: &[CorpusEntry],
        vectors: &[Vec<f32>],
    ) -> anyhow::Result<Self> {
        assert_eq!(entries.len(), vectors.len());
        let conn = lancedb::connect(path).execute().await?;

        // Drop old table if it exists
        let tables = conn.table_names().execute().await?;
        if tables.contains(&TABLE.to_string()) {
            conn.drop_table(TABLE).await?;
        }

        let n = entries.len();
        let texts: Vec<&str> = entries.iter().map(|e| e.text).collect();
        let labels: Vec<u8> = entries.iter().map(|e| e.is_recruitment as u8).collect();

        let mut flat: Vec<f32> = Vec::with_capacity(n * DIM);
        for v in vectors {
            assert_eq!(v.len(), DIM, "expected {DIM}-dim vector");
            flat.extend_from_slice(v);
        }

        let values = Float32Array::from(flat);
        let field = Arc::new(Field::new("item", DataType::Float32, true));
        let vecs = FixedSizeListArray::try_new(field, DIM as i32, Arc::new(values), None)?;

        let batch = RecordBatch::try_new(
            schema(),
            vec![
                Arc::new(StringArray::from(texts)) as ArrayRef,
                Arc::new(UInt8Array::from(labels)) as ArrayRef,
                Arc::new(vecs) as ArrayRef,
            ],
        )?;

        conn.create_table(TABLE, batch).execute().await?;
        info!("Built LanceDB corpus table '{TABLE}' with {n} entries at {path}");

        Ok(Self { conn })
    }

    /// Find the top-K nearest neighbours for a query vector.
    pub async fn query(&self, query_vec: Vec<f32>, top_k: usize) -> anyhow::Result<Vec<Neighbour>> {
        let table = self.conn.open_table(TABLE).execute().await?;

        let stream = table
            .vector_search(query_vec)?
            .limit(top_k)
            .execute()
            .await?;

        let batches: Vec<RecordBatch> = stream.try_collect().await?;

        let mut results = Vec::new();
        for batch in &batches {
            let texts: Vec<String> = batch
                .column_by_name("text")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>())
                .map(|a| (0..a.len()).map(|i| a.value(i).to_string()).collect())
                .unwrap_or_default();

            let labels: Vec<u8> = batch
                .column_by_name("label")
                .and_then(|c| c.as_any().downcast_ref::<UInt8Array>())
                .map(|a| (0..a.len()).map(|i| a.value(i)).collect())
                .unwrap_or_default();

            let dists: Vec<f32> = batch
                .column_by_name("_distance")
                .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                .map(|a| (0..a.len()).map(|i| a.value(i)).collect())
                .unwrap_or_else(|| vec![1.0; batch.num_rows()]);

            for i in 0..batch.num_rows() {
                results.push(Neighbour {
                    text: texts.get(i).cloned().unwrap_or_default(),
                    label: labels.get(i).copied().unwrap_or(0),
                    distance: dists.get(i).copied().unwrap_or(1.0),
                });
            }
        }

        results.sort_by(|a, b| a.distance.partial_cmp(&b.distance).unwrap_or(std::cmp::Ordering::Equal));
        Ok(results)
    }
}
