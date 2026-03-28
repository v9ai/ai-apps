//! LanceDB vector store for hotels — schema, ingest, and semantic search.

use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    Array, ArrayRef, FixedSizeListArray, Float32Array, Float64Array, RecordBatch, StringArray,
    UInt16Array, UInt8Array,
};
use arrow_schema::{DataType, Field, Schema};
use lancedb::query::{ExecutableQuery, QueryBase};
use lancedb::Connection;
use tracing::info;

use crate::embeddings::{EmbeddingEngine, DIM};
use crate::hotel::{Hotel, HotelSearchResult};

const HOTELS_TABLE: &str = "hotels";

fn hotels_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("hotel_id", DataType::Utf8, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("description", DataType::Utf8, false),
        Field::new("star_rating", DataType::UInt8, false),
        Field::new("board_type", DataType::Utf8, false),
        Field::new("price_eur", DataType::Float32, false),
        Field::new("location", DataType::Utf8, false),
        Field::new("region", DataType::Utf8, false),
        Field::new("lat", DataType::Float64, false),
        Field::new("lng", DataType::Float64, false),
        Field::new("source_url", DataType::Utf8, false),
        Field::new("amenities_json", DataType::Utf8, true),
        Field::new("image_url", DataType::Utf8, true),
        Field::new("opened_year", DataType::UInt16, true),
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

/// LanceDB-backed store for embedding, indexing, and searching hotels.
pub struct HotelStore {
    conn: Connection,
    engine: EmbeddingEngine,
}

impl HotelStore {
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

        if !tables.contains(&HOTELS_TABLE.to_string()) {
            let schema = hotels_schema();
            let batch = RecordBatch::new_empty(schema.clone());
            conn.create_table(HOTELS_TABLE, batch)
                .execute()
                .await
                .context("creating hotels table")?;
            info!("Created '{HOTELS_TABLE}' table");
        }

        Ok(Self { conn, engine })
    }

    /// Build an Arrow RecordBatch from hotels + their pre-computed embeddings.
    fn build_batch(hotels: &[Hotel], vecs: &[Vec<f32>]) -> Result<RecordBatch> {
        let n = hotels.len();
        let mut ids = Vec::with_capacity(n);
        let mut names = Vec::with_capacity(n);
        let mut descs = Vec::with_capacity(n);
        let mut stars = Vec::with_capacity(n);
        let mut boards = Vec::with_capacity(n);
        let mut prices = Vec::with_capacity(n);
        let mut locations = Vec::with_capacity(n);
        let mut regions = Vec::with_capacity(n);
        let mut lats = Vec::with_capacity(n);
        let mut lngs = Vec::with_capacity(n);
        let mut urls = Vec::with_capacity(n);
        let mut amenities = Vec::with_capacity(n);
        let mut images: Vec<Option<String>> = Vec::with_capacity(n);
        let mut opened_years: Vec<Option<u16>> = Vec::with_capacity(n);
        let mut timestamps = Vec::with_capacity(n);
        let mut all_vecs: Vec<f32> = Vec::with_capacity(n * DIM);

        for (h, v) in hotels.iter().zip(vecs.iter()) {
            ids.push(h.hotel_id.clone());
            names.push(h.name.clone());
            descs.push(h.description.clone());
            stars.push(h.star_rating);
            boards.push(h.board_type.clone());
            prices.push(h.price_eur);
            locations.push(h.location.clone());
            regions.push(h.region.clone());
            lats.push(h.lat);
            lngs.push(h.lng);
            urls.push(h.source_url.clone());
            amenities.push(serde_json::to_string(&h.amenities).unwrap_or_default());
            images.push(h.image_url.clone());
            opened_years.push(h.opened_year);
            timestamps.push(now_secs());
            all_vecs.extend_from_slice(v);
        }

        let vec_values = Float32Array::from(all_vecs);
        let vec_field = Arc::new(Field::new("item", DataType::Float32, true));
        let vec_array =
            FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)
                .context("building vector array")?;

        let schema = hotels_schema();
        RecordBatch::try_new(
            schema,
            vec![
                Arc::new(StringArray::from(ids)) as ArrayRef,
                Arc::new(StringArray::from(names)),
                Arc::new(StringArray::from(descs)),
                Arc::new(UInt8Array::from(stars)),
                Arc::new(StringArray::from(boards)),
                Arc::new(Float32Array::from(prices)),
                Arc::new(StringArray::from(locations)),
                Arc::new(StringArray::from(regions)),
                Arc::new(Float64Array::from(lats)),
                Arc::new(Float64Array::from(lngs)),
                Arc::new(StringArray::from(urls)),
                Arc::new(StringArray::from(amenities)),
                Arc::new(StringArray::from(images)),
                Arc::new(UInt16Array::from(opened_years)),
                Arc::new(Float64Array::from(timestamps)),
                Arc::new(vec_array),
            ],
        )
        .context("building hotels RecordBatch")
    }

    /// Embed and insert hotels into the store. Returns the count inserted.
    pub async fn add_hotels(&self, hotels: &[Hotel]) -> Result<usize> {
        if hotels.is_empty() {
            return Ok(0);
        }

        let embed_texts: Vec<String> = hotels.iter().map(|h| h.embed_text()).collect();
        let text_refs: Vec<&str> = embed_texts.iter().map(|s| s.as_str()).collect();
        let vecs = self
            .engine
            .embed_batch(&text_refs)
            .context("embedding hotels")?;

        let batch = Self::build_batch(hotels, &vecs)?;

        let table = self
            .conn
            .open_table(HOTELS_TABLE)
            .execute()
            .await
            .context("opening hotels table")?;
        table
            .add(vec![batch])
            .execute()
            .await
            .context("inserting hotels batch")?;

        info!("Indexed {} hotels", hotels.len());
        Ok(hotels.len())
    }

    /// Semantic search: embed query, find nearest hotels.
    pub async fn search(&self, query: &str, top_k: usize) -> Result<Vec<HotelSearchResult>> {
        let query_vec = self
            .engine
            .embed_one(query)
            .context("embedding search query")?;

        let table = self
            .conn
            .open_table(HOTELS_TABLE)
            .execute()
            .await
            .context("opening hotels table for search")?;

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
                let hotel = hotel_from_batch(batch, i);
                let dist = batch
                    .column_by_name("_distance")
                    .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
                    .map(|c| c.value(i))
                    .unwrap_or(1.0);
                // LanceDB returns L2 distance; convert to similarity score
                let score = 1.0 / (1.0 + dist);
                hits.push(HotelSearchResult { hotel, score });
            }
        }

        hits.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        Ok(hits)
    }
}

/// Extract a `Hotel` from a RecordBatch row.
fn hotel_from_batch(batch: &RecordBatch, i: usize) -> Hotel {
    let get_str = |name: &str| -> String {
        batch
            .column_by_name(name)
            .and_then(|c| c.as_any().downcast_ref::<StringArray>())
            .map(|c| c.value(i).to_string())
            .unwrap_or_default()
    };

    let get_opt_str = |name: &str| -> Option<String> {
        batch
            .column_by_name(name)
            .and_then(|c| c.as_any().downcast_ref::<StringArray>())
            .map(|c| c.value(i).to_string())
            .filter(|s| !s.is_empty())
    };

    let star_rating = batch
        .column_by_name("star_rating")
        .and_then(|c| c.as_any().downcast_ref::<UInt8Array>())
        .map(|c| c.value(i))
        .unwrap_or(0);

    let price_eur = batch
        .column_by_name("price_eur")
        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.0);

    let lat = batch
        .column_by_name("lat")
        .and_then(|c| c.as_any().downcast_ref::<Float64Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.0);

    let lng = batch
        .column_by_name("lng")
        .and_then(|c| c.as_any().downcast_ref::<Float64Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.0);

    let amenities: Vec<String> = batch
        .column_by_name("amenities_json")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .and_then(|c| serde_json::from_str(c.value(i)).ok())
        .unwrap_or_default();

    let opened_year = batch
        .column_by_name("opened_year")
        .and_then(|c| c.as_any().downcast_ref::<UInt16Array>())
        .and_then(|c| if c.is_null(i) { None } else { Some(c.value(i)) });

    Hotel {
        hotel_id: get_str("hotel_id"),
        name: get_str("name"),
        description: get_str("description"),
        star_rating,
        board_type: get_str("board_type"),
        price_eur,
        location: get_str("location"),
        region: get_str("region"),
        lat,
        lng,
        source_url: get_str("source_url"),
        amenities,
        image_url: get_opt_str("image_url"),
        gallery: vec![],
        opened_year,
    }
}
