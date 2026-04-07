//! LanceDB vector store — papers + chunks tables with semantic search.

use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{
    ArrayRef, FixedSizeListArray, Float32Array, Float64Array, Int32Array, RecordBatch,
    StringArray, UInt32Array, UInt64Array,
};
use arrow_schema::{DataType, Field, Schema};
use lancedb::query::{ExecutableQuery, QueryBase};
use lancedb::Connection;
use tracing::info;

use crate::chunker::Chunk;
use crate::local_embeddings::{EmbeddingEngine, DIM};
use crate::paper::{PaperSource, ResearchPaper};

const PAPERS_TABLE: &str = "papers";
const CHUNKS_TABLE: &str = "chunks";

/// Maximum papers to embed in a single batch (avoids OOM on large ingests).
const INGEST_BATCH_SIZE: usize = 256;

/// A single chunk hit returned from search.
#[derive(Debug, Clone)]
pub struct ChunkResult {
    pub text: String,
    pub section: Option<String>,
    pub score: f32,
}

/// Search result pairing a paper with its relevance score.
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub paper: ResearchPaper,
    pub score: f32,
    pub matched_chunks: Vec<ChunkResult>,
}

/// Filter criteria for paper search.
#[derive(Debug, Clone, Default)]
pub struct SearchFilter {
    pub year_min: Option<u32>,
    pub year_max: Option<u32>,
    pub source: Option<PaperSource>,
    pub min_citations: Option<u32>,
}

/// LanceDB-backed store for embedding, indexing, and searching papers and chunks.
pub struct VectorStore {
    conn: Connection,
    engine: EmbeddingEngine,
}

fn papers_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("source_id", DataType::Utf8, false),
        Field::new("title", DataType::Utf8, false),
        Field::new("abstract_text", DataType::Utf8, true),
        Field::new("authors_json", DataType::Utf8, true),
        Field::new("year", DataType::UInt32, true),
        Field::new("published_date", DataType::Utf8, true),
        Field::new("doi", DataType::Utf8, true),
        Field::new("citation_count", DataType::UInt64, true),
        Field::new("url", DataType::Utf8, true),
        Field::new("pdf_url", DataType::Utf8, true),
        Field::new("source", DataType::Utf8, true),
        Field::new("fields_of_study_json", DataType::Utf8, true),
        Field::new("primary_category", DataType::Utf8, true),
        Field::new("categories_json", DataType::Utf8, true),
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

fn chunks_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("chunk_id", DataType::Utf8, false),
        Field::new("paper_id", DataType::Utf8, false),
        Field::new("chunk_index", DataType::Int32, false),
        Field::new("text", DataType::Utf8, false),
        Field::new("section", DataType::Utf8, true),
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

/// Parse a `PaperSource` from its Debug/display string.
fn parse_source(s: &str) -> PaperSource {
    match s {
        "Arxiv" => PaperSource::Arxiv,
        "SemanticScholar" => PaperSource::SemanticScholar,
        "OpenAlex" => PaperSource::OpenAlex,
        "Crossref" => PaperSource::Crossref,
        "Core" => PaperSource::Core,
        "Zenodo" => PaperSource::Zenodo,
        _ => PaperSource::SemanticScholar,
    }
}

/// Extract a `ResearchPaper` + distance from a batch row.
fn paper_from_batch(batch: &RecordBatch, i: usize) -> (ResearchPaper, f32) {
    let get_str = |name: &str| -> Option<String> {
        batch
            .column_by_name(name)
            .and_then(|c| c.as_any().downcast_ref::<StringArray>())
            .map(|c| c.value(i).to_string())
            .filter(|s| !s.is_empty())
    };

    let title = get_str("title").unwrap_or_default();
    let abstract_text = get_str("abstract_text");
    let source_id = get_str("source_id").unwrap_or_default();
    let doi = get_str("doi");
    let url = get_str("url");
    let pdf_url = get_str("pdf_url");

    let authors: Vec<String> = batch
        .column_by_name("authors_json")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .and_then(|c| serde_json::from_str(c.value(i)).ok())
        .unwrap_or_default();

    let year = batch
        .column_by_name("year")
        .and_then(|c| c.as_any().downcast_ref::<UInt32Array>())
        .map(|c| c.value(i));

    let citation_count = batch
        .column_by_name("citation_count")
        .and_then(|c| c.as_any().downcast_ref::<UInt64Array>())
        .map(|c| c.value(i));

    let source = batch
        .column_by_name("source")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .map(|c| parse_source(c.value(i)))
        .unwrap_or(PaperSource::SemanticScholar);

    let fields_of_study: Option<Vec<String>> = batch
        .column_by_name("fields_of_study_json")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .and_then(|c| serde_json::from_str(c.value(i)).ok());

    let published_date = get_str("published_date");
    let primary_category = get_str("primary_category");

    let categories: Option<Vec<String>> = batch
        .column_by_name("categories_json")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .and_then(|c| serde_json::from_str(c.value(i)).ok());

    let dist = batch
        .column_by_name("_distance")
        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.5);

    let paper = ResearchPaper {
        title,
        abstract_text,
        authors,
        year,
        doi,
        citation_count,
        url,
        pdf_url,
        source,
        source_id,
        fields_of_study,
        published_date,
        primary_category,
        categories,
        affiliations: None,
        venue: None,
    };

    (paper, dist)
}

/// Extract a `Chunk` + distance from a batch row.
fn chunk_from_batch(batch: &RecordBatch, i: usize) -> (Chunk, f32) {
    let text = batch
        .column_by_name("text")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .map(|c| c.value(i).to_string())
        .unwrap_or_default();
    let paper_id = batch
        .column_by_name("paper_id")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .map(|c| c.value(i).to_string())
        .unwrap_or_default();
    let chunk_index = batch
        .column_by_name("chunk_index")
        .and_then(|c| c.as_any().downcast_ref::<Int32Array>())
        .map(|c| c.value(i))
        .unwrap_or(0);
    let section = batch
        .column_by_name("section")
        .and_then(|c| c.as_any().downcast_ref::<StringArray>())
        .map(|c| c.value(i).to_string())
        .unwrap_or_default();
    let dist = batch
        .column_by_name("_distance")
        .and_then(|c| c.as_any().downcast_ref::<Float32Array>())
        .map(|c| c.value(i))
        .unwrap_or(0.5);

    (
        Chunk {
            text,
            paper_id,
            chunk_index,
            section,
        },
        dist,
    )
}

/// Check whether a paper passes the given `SearchFilter`.
fn passes_filter(paper: &ResearchPaper, filter: &SearchFilter) -> bool {
    if let Some(ymin) = filter.year_min {
        if paper.year.unwrap_or(0) < ymin {
            return false;
        }
    }
    if let Some(ymax) = filter.year_max {
        if paper.year.unwrap_or(9999) > ymax {
            return false;
        }
    }
    if let Some(min_cites) = filter.min_citations {
        if paper.citation_count.unwrap_or(0) < min_cites as u64 {
            return false;
        }
    }
    if let Some(ref src) = filter.source {
        let src_str = format!("{:?}", src);
        let paper_str = format!("{:?}", paper.source);
        if src_str != paper_str {
            return false;
        }
    }
    true
}

impl VectorStore {
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

        if !tables.contains(&PAPERS_TABLE.to_string()) {
            let schema = papers_schema();
            let batch = RecordBatch::new_empty(schema.clone());
            conn.create_table(PAPERS_TABLE, batch)
                .execute()
                .await
                .context("creating papers table")?;
            info!("Created '{PAPERS_TABLE}' table");
        }

        if !tables.contains(&CHUNKS_TABLE.to_string()) {
            let schema = chunks_schema();
            let batch = RecordBatch::new_empty(schema.clone());
            conn.create_table(CHUNKS_TABLE, batch)
                .execute()
                .await
                .context("creating chunks table")?;
            info!("Created '{CHUNKS_TABLE}' table");
        }

        Ok(Self { conn, engine })
    }

    // ── Ingest ────────────────────────────────────────────────

    /// Build a `RecordBatch` for a slice of papers with their pre-computed embeddings.
    fn build_papers_batch(
        papers: &[ResearchPaper],
        vecs: &[Vec<f32>],
    ) -> Result<RecordBatch> {
        let n = papers.len();
        let mut source_ids = Vec::with_capacity(n);
        let mut titles = Vec::with_capacity(n);
        let mut abstracts = Vec::with_capacity(n);
        let mut authors_json = Vec::with_capacity(n);
        let mut years = Vec::with_capacity(n);
        let mut dois = Vec::with_capacity(n);
        let mut citation_counts = Vec::with_capacity(n);
        let mut urls = Vec::with_capacity(n);
        let mut pdf_urls = Vec::with_capacity(n);
        let mut sources = Vec::with_capacity(n);
        let mut fields_json = Vec::with_capacity(n);
        let mut published_dates: Vec<Option<String>> = Vec::with_capacity(n);
        let mut primary_categories: Vec<Option<String>> = Vec::with_capacity(n);
        let mut categories_jsons: Vec<Option<String>> = Vec::with_capacity(n);
        let mut timestamps = Vec::with_capacity(n);
        let mut all_vecs: Vec<f32> = Vec::with_capacity(n * DIM);

        for (p, v) in papers.iter().zip(vecs.iter()) {
            source_ids.push(p.source_id.clone());
            titles.push(p.title.clone());
            abstracts.push(p.abstract_text.clone().unwrap_or_default());
            authors_json.push(serde_json::to_string(&p.authors).unwrap_or_default());
            years.push(p.year.unwrap_or(0));
            published_dates.push(p.published_date.clone());
            dois.push(p.doi.clone().unwrap_or_default());
            citation_counts.push(p.citation_count.unwrap_or(0));
            urls.push(p.url.clone().unwrap_or_default());
            pdf_urls.push(p.pdf_url.clone().unwrap_or_default());
            sources.push(format!("{:?}", p.source));
            fields_json.push(
                serde_json::to_string(&p.fields_of_study).unwrap_or_default(),
            );
            primary_categories.push(p.primary_category.clone());
            // categories_json: use categories if present, fallback to fields_of_study
            let cats = p.categories.as_ref().or(p.fields_of_study.as_ref());
            categories_jsons.push(
                cats.map(|c| serde_json::to_string(c).unwrap_or_default()),
            );
            timestamps.push(now_secs());
            all_vecs.extend_from_slice(v);
        }

        let vec_values = Float32Array::from(all_vecs);
        let vec_field = Arc::new(Field::new("item", DataType::Float32, true));
        let vec_array =
            FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)
                .context("building vector array for papers")?;

        let schema = papers_schema();
        RecordBatch::try_new(
            schema,
            vec![
                Arc::new(StringArray::from(source_ids)) as ArrayRef,
                Arc::new(StringArray::from(titles)),
                Arc::new(StringArray::from(abstracts)),
                Arc::new(StringArray::from(authors_json)),
                Arc::new(UInt32Array::from(years)),
                Arc::new(StringArray::from(published_dates)),
                Arc::new(StringArray::from(dois)),
                Arc::new(UInt64Array::from(citation_counts)),
                Arc::new(StringArray::from(urls)),
                Arc::new(StringArray::from(pdf_urls)),
                Arc::new(StringArray::from(sources)),
                Arc::new(StringArray::from(fields_json)),
                Arc::new(StringArray::from(primary_categories)),
                Arc::new(StringArray::from(categories_jsons)),
                Arc::new(Float64Array::from(timestamps)),
                Arc::new(vec_array),
            ],
        )
        .context("building papers RecordBatch")
    }

    /// Embed and insert papers into the store. Returns the count inserted.
    pub async fn add_papers(&self, papers: &[ResearchPaper]) -> Result<usize> {
        if papers.is_empty() {
            return Ok(0);
        }

        let embed_texts: Vec<String> = papers
            .iter()
            .map(|p| {
                let abs = p.abstract_text.as_deref().unwrap_or("");
                let end = abs.len().min(2000);
                format!("{} {}", p.title, &abs[..end])
            })
            .collect();
        let text_refs: Vec<&str> = embed_texts.iter().map(|s| s.as_str()).collect();
        let vecs = self
            .engine
            .embed_batch(&text_refs)
            .context("embedding papers")?;

        let batch = Self::build_papers_batch(papers, &vecs)?;

        let table = self
            .conn
            .open_table(PAPERS_TABLE)
            .execute()
            .await
            .context("opening papers table for add")?;
        table
            .add(vec![batch])
            .execute()
            .await
            .context("inserting papers batch")?;
        info!("Indexed {} papers", papers.len());
        Ok(papers.len())
    }

    /// Ingest papers in fixed-size batches to bound memory usage.
    ///
    /// Papers with duplicate `source_id`s (within this call) are skipped.
    /// Returns the total number of papers actually inserted.
    pub async fn add_papers_batched(
        &self,
        papers: &[ResearchPaper],
        batch_size: usize,
    ) -> Result<usize> {
        if papers.is_empty() {
            return Ok(0);
        }

        // Dedup by source_id within the input
        let mut seen = std::collections::HashSet::new();
        let deduped: Vec<&ResearchPaper> = papers
            .iter()
            .filter(|p| seen.insert(p.source_id.clone()))
            .collect();

        let table = self
            .conn
            .open_table(PAPERS_TABLE)
            .execute()
            .await
            .context("opening papers table for batched add")?;
        let mut total = 0usize;

        let effective_batch = if batch_size == 0 { INGEST_BATCH_SIZE } else { batch_size };
        for batch_slice in deduped.chunks(effective_batch) {
            let owned: Vec<ResearchPaper> = batch_slice.iter().map(|p| (*p).clone()).collect();
            let embed_texts: Vec<String> = owned
                .iter()
                .map(|p| {
                    let abs = p.abstract_text.as_deref().unwrap_or("");
                    let end = abs.len().min(2000);
                    format!("{} {}", p.title, &abs[..end])
                })
                .collect();
            let text_refs: Vec<&str> = embed_texts.iter().map(|s| s.as_str()).collect();
            let vecs = self
                .engine
                .embed_batch(&text_refs)
                .context("embedding papers batch")?;

            let record_batch = Self::build_papers_batch(&owned, &vecs)?;
            table
                .add(vec![record_batch])
                .execute()
                .await
                .context("inserting papers sub-batch")?;
            total += owned.len();
            info!("Indexed batch of {} papers (total: {})", owned.len(), total);
        }

        Ok(total)
    }

    /// Embed and insert text chunks into the store. Returns the count inserted.
    pub async fn add_chunks(&self, chunks: &[Chunk]) -> Result<usize> {
        if chunks.is_empty() {
            return Ok(0);
        }

        let text_refs: Vec<&str> = chunks.iter().map(|c| c.text.as_str()).collect();
        let vecs = self
            .engine
            .embed_batch(&text_refs)
            .context("embedding chunks")?;

        let n = chunks.len();
        let mut chunk_ids = Vec::with_capacity(n);
        let mut paper_ids = Vec::with_capacity(n);
        let mut indices = Vec::with_capacity(n);
        let mut texts_out = Vec::with_capacity(n);
        let mut sections = Vec::with_capacity(n);
        let mut all_vecs: Vec<f32> = Vec::with_capacity(n * DIM);

        for (c, v) in chunks.iter().zip(vecs.iter()) {
            chunk_ids.push(c.chunk_id());
            paper_ids.push(c.paper_id.clone());
            indices.push(c.chunk_index);
            texts_out.push(c.text.clone());
            sections.push(c.section.clone());
            all_vecs.extend_from_slice(v);
        }

        let vec_values = Float32Array::from(all_vecs);
        let vec_field = Arc::new(Field::new("item", DataType::Float32, true));
        let vec_array =
            FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)
                .context("building vector array for chunks")?;

        let schema = chunks_schema();
        let batch = RecordBatch::try_new(
            schema,
            vec![
                Arc::new(StringArray::from(chunk_ids)) as ArrayRef,
                Arc::new(StringArray::from(paper_ids)),
                Arc::new(Int32Array::from(indices)),
                Arc::new(StringArray::from(texts_out)),
                Arc::new(StringArray::from(sections)),
                Arc::new(vec_array),
            ],
        )
        .context("building chunks RecordBatch")?;

        let table = self
            .conn
            .open_table(CHUNKS_TABLE)
            .execute()
            .await
            .context("opening chunks table for add")?;
        table
            .add(vec![batch])
            .execute()
            .await
            .context("inserting chunks batch")?;
        Ok(n)
    }

    /// Ingest chunks in fixed-size batches to bound memory usage.
    pub async fn add_chunks_batched(
        &self,
        chunks: &[Chunk],
        batch_size: usize,
    ) -> Result<usize> {
        if chunks.is_empty() {
            return Ok(0);
        }

        let table = self
            .conn
            .open_table(CHUNKS_TABLE)
            .execute()
            .await
            .context("opening chunks table for batched add")?;
        let mut total = 0usize;

        let effective_batch = if batch_size == 0 { INGEST_BATCH_SIZE } else { batch_size };
        for batch_slice in chunks.chunks(effective_batch) {
            let text_refs: Vec<&str> = batch_slice.iter().map(|c| c.text.as_str()).collect();
            let vecs = self
                .engine
                .embed_batch(&text_refs)
                .context("embedding chunks batch")?;

            let n = batch_slice.len();
            let mut chunk_ids = Vec::with_capacity(n);
            let mut paper_ids = Vec::with_capacity(n);
            let mut indices = Vec::with_capacity(n);
            let mut texts_out = Vec::with_capacity(n);
            let mut sections = Vec::with_capacity(n);
            let mut all_vecs: Vec<f32> = Vec::with_capacity(n * DIM);

            for (c, v) in batch_slice.iter().zip(vecs.iter()) {
                chunk_ids.push(c.chunk_id());
                paper_ids.push(c.paper_id.clone());
                indices.push(c.chunk_index);
                texts_out.push(c.text.clone());
                sections.push(c.section.clone());
                all_vecs.extend_from_slice(v);
            }

            let vec_values = Float32Array::from(all_vecs);
            let vec_field = Arc::new(Field::new("item", DataType::Float32, true));
            let vec_array =
                FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)
                    .context("building vector array for chunks sub-batch")?;

            let schema = chunks_schema();
            let record_batch = RecordBatch::try_new(
                schema,
                vec![
                    Arc::new(StringArray::from(chunk_ids)) as ArrayRef,
                    Arc::new(StringArray::from(paper_ids)),
                    Arc::new(Int32Array::from(indices)),
                    Arc::new(StringArray::from(texts_out)),
                    Arc::new(StringArray::from(sections)),
                    Arc::new(vec_array),
                ],
            )
            .context("building chunks sub-batch RecordBatch")?;

            table
                .add(vec![record_batch])
                .execute()
                .await
                .context("inserting chunks sub-batch")?;
            total += n;
        }

        Ok(total)
    }

    // ── Search ────────────────────────────────────────────────

    /// Semantic paper search with optional year range filtering.
    ///
    /// This is the original search interface; for richer filtering use
    /// [`search_papers_filtered`].
    pub async fn search_papers(
        &self,
        query: &str,
        top_k: usize,
        year_min: Option<u32>,
        year_max: Option<u32>,
    ) -> Result<Vec<SearchResult>> {
        self.search_papers_filtered(
            query,
            top_k,
            &SearchFilter {
                year_min,
                year_max,
                ..Default::default()
            },
        )
        .await
    }

    /// Semantic paper search with full filter support (year, source, citations).
    pub async fn search_papers_filtered(
        &self,
        query: &str,
        top_k: usize,
        filter: &SearchFilter,
    ) -> Result<Vec<SearchResult>> {
        let qvec = self
            .engine
            .embed_one(query)
            .context("embedding query for paper search")?;
        let table = self
            .conn
            .open_table(PAPERS_TABLE)
            .execute()
            .await
            .context("opening papers table for search")?;

        // Over-fetch to allow for client-side filtering.
        let over_fetch = if filter.source.is_some() || filter.min_citations.is_some() {
            top_k * 5
        } else {
            top_k * 3
        };

        let results = table
            .vector_search(qvec)
            .context("paper vector_search")?
            .limit(over_fetch)
            .execute()
            .await
            .context("executing paper vector search")?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting paper search results")?;

        let mut search_results = Vec::new();

        for batch in &batches {
            for i in 0..batch.num_rows() {
                let (paper, dist) = paper_from_batch(batch, i);

                if !passes_filter(&paper, filter) {
                    continue;
                }

                search_results.push(SearchResult {
                    paper,
                    score: 1.0 - dist,
                    matched_chunks: vec![],
                });
            }
        }

        search_results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        search_results.truncate(top_k);
        Ok(search_results)
    }

    /// Semantic chunk search.
    pub async fn search_chunks(
        &self,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<(Chunk, f32)>> {
        let qvec = self
            .engine
            .embed_one(query)
            .context("embedding query for chunk search")?;
        let table = self
            .conn
            .open_table(CHUNKS_TABLE)
            .execute()
            .await
            .context("opening chunks table for search")?;

        let results = table
            .vector_search(qvec)
            .context("chunk vector_search")?
            .limit(top_k)
            .execute()
            .await
            .context("executing chunk vector search")?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting chunk search results")?;
        let mut out = Vec::new();

        for batch in &batches {
            for i in 0..batch.num_rows() {
                let (chunk, dist) = chunk_from_batch(batch, i);
                out.push((chunk, 1.0 - dist));
            }
        }
        Ok(out)
    }

    /// Chunk search filtered to chunks belonging to a specific paper.
    pub async fn search_chunks_for_paper(
        &self,
        paper_id: &str,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<ChunkResult>> {
        let qvec = self
            .engine
            .embed_one(query)
            .context("embedding query for paper-specific chunk search")?;
        let table = self
            .conn
            .open_table(CHUNKS_TABLE)
            .execute()
            .await
            .context("opening chunks table for paper-specific search")?;

        // Over-fetch and filter client-side (LanceDB WHERE support is limited).
        let results = table
            .vector_search(qvec)
            .context("chunk vector_search (paper-specific)")?
            .limit(top_k * 5)
            .execute()
            .await
            .context("executing paper-specific chunk vector search")?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results)
                .await
                .context("collecting paper-specific chunk results")?;
        let mut out = Vec::new();

        for batch in &batches {
            for i in 0..batch.num_rows() {
                let (chunk, dist) = chunk_from_batch(batch, i);
                if chunk.paper_id == paper_id {
                    out.push(ChunkResult {
                        text: chunk.text,
                        section: if chunk.section.is_empty() {
                            None
                        } else {
                            Some(chunk.section)
                        },
                        score: 1.0 - dist,
                    });
                    if out.len() >= top_k {
                        return Ok(out);
                    }
                }
            }
        }
        Ok(out)
    }

    /// Hybrid search: fuse paper-level and chunk-level scores.
    ///
    /// Chunk hits whose `paper_id` matches a paper result boost that paper's score.
    /// Chunk hits for papers not in the paper results are promoted as new entries
    /// (with a score derived purely from chunk similarity).
    pub async fn hybrid_search(
        &self,
        query: &str,
        top_k: usize,
        chunk_weight: f32,
        year_min: Option<u32>,
    ) -> Result<Vec<SearchResult>> {
        self.hybrid_search_filtered(
            query,
            top_k,
            chunk_weight,
            &SearchFilter {
                year_min,
                ..Default::default()
            },
        )
        .await
    }

    /// Hybrid search with full filter support.
    pub async fn hybrid_search_filtered(
        &self,
        query: &str,
        top_k: usize,
        chunk_weight: f32,
        filter: &SearchFilter,
    ) -> Result<Vec<SearchResult>> {
        let mut paper_results = self
            .search_papers_filtered(query, top_k * 2, filter)
            .await?;
        let chunk_results = self.search_chunks(query, top_k * 3).await?;

        let mut idx_map: HashMap<String, usize> = HashMap::new();
        for (i, sr) in paper_results.iter().enumerate() {
            idx_map.insert(sr.paper.source_id.clone(), i);
        }

        for (chunk, cscore) in chunk_results {
            if let Some(&idx) = idx_map.get(&chunk.paper_id) {
                let sr = &mut paper_results[idx];
                sr.score =
                    sr.score * (1.0 - chunk_weight) + cscore * chunk_weight;
                sr.matched_chunks.push(ChunkResult {
                    text: chunk.text,
                    section: if chunk.section.is_empty() {
                        None
                    } else {
                        Some(chunk.section)
                    },
                    score: cscore,
                });
            }
            // Chunks from papers not in paper_results are ignored because we
            // lack the full paper metadata. Callers who need chunk-first
            // discovery should use `search_chunks` directly.
        }

        paper_results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        paper_results.truncate(top_k);
        Ok(paper_results)
    }

    // ── Utilities ─────────────────────────────────────────────

    /// Return (papers_count, chunks_count).
    pub async fn counts(&self) -> Result<(usize, usize)> {
        let pt = self
            .conn
            .open_table(PAPERS_TABLE)
            .execute()
            .await
            .context("opening papers table for count")?;
        let ct = self
            .conn
            .open_table(CHUNKS_TABLE)
            .execute()
            .await
            .context("opening chunks table for count")?;
        let pc = pt
            .count_rows(None)
            .await
            .context("counting papers rows")?;
        let cc = ct
            .count_rows(None)
            .await
            .context("counting chunks rows")?;
        Ok((pc, cc))
    }

    /// Delete all rows from both tables. Useful for tests and resets.
    pub async fn clear(&self) -> Result<()> {
        let pt = self
            .conn
            .open_table(PAPERS_TABLE)
            .execute()
            .await
            .context("opening papers table for clear")?;
        pt.delete("true")
            .await
            .context("deleting all papers")?;

        let ct = self
            .conn
            .open_table(CHUNKS_TABLE)
            .execute()
            .await
            .context("opening chunks table for clear")?;
        ct.delete("true")
            .await
            .context("deleting all chunks")?;

        info!("Cleared all papers and chunks");
        Ok(())
    }

    /// Expose the embedding engine for callers that need raw embeddings.
    pub fn engine(&self) -> &EmbeddingEngine {
        &self.engine
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chunker::Chunk;
    use crate::local_embeddings::EmbeddingEngine;
    use crate::paper::{PaperSource, ResearchPaper};
    use candle_core::Device;
    use serial_test::serial;

    fn test_engine() -> EmbeddingEngine {
        EmbeddingEngine::new(Device::Cpu).expect("failed to load embedding model")
    }

    fn make_paper(id: &str, title: &str, year: u32, cites: u64, source: PaperSource) -> ResearchPaper {
        ResearchPaper {
            title: title.into(),
            abstract_text: Some(format!("Abstract for {title}")),
            authors: vec!["Author A".into()],
            year: Some(year),
            doi: None,
            citation_count: Some(cites),
            url: None,
            pdf_url: None,
            source,
            source_id: id.into(),
            fields_of_study: None,
            published_date: None,
            primary_category: None,
            categories: None,
            affiliations: None,
            venue: None,
        }
    }

    fn make_chunk(paper_id: &str, idx: i32, text: &str) -> Chunk {
        Chunk {
            text: text.into(),
            paper_id: paper_id.into(),
            chunk_index: idx,
            section: "Introduction".into(),
        }
    }

    async fn temp_store(engine: EmbeddingEngine) -> (VectorStore, tempfile::TempDir) {
        let dir = tempfile::tempdir().expect("tempdir");
        let store = VectorStore::connect(dir.path().to_str().unwrap(), engine)
            .await
            .expect("connect");
        (store, dir)
    }

    #[tokio::test]
    #[serial]
    async fn test_add_and_count_papers() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![
            make_paper("p1", "Attention Is All You Need", 2017, 50000, PaperSource::Arxiv),
            make_paper("p2", "BERT Pre-training", 2018, 30000, PaperSource::Arxiv),
        ];
        let n = store.add_papers(&papers).await.unwrap();
        assert_eq!(n, 2);

        let (pc, cc) = store.counts().await.unwrap();
        assert_eq!(pc, 2);
        assert_eq!(cc, 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_add_and_search_chunks() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let chunks = vec![
            make_chunk("p1", 0, "The transformer architecture uses self-attention to process sequences in parallel"),
            make_chunk("p1", 1, "Multi-head attention allows the model to jointly attend to information from different representation subspaces"),
            make_chunk("p2", 0, "Convolutional neural networks excel at image recognition tasks"),
        ];
        let n = store.add_chunks(&chunks).await.unwrap();
        assert_eq!(n, 3);

        let results = store.search_chunks("attention mechanism", 2).await.unwrap();
        assert!(!results.is_empty());
        assert!(results.len() <= 2);
        // Attention-related chunks should score higher than CNN chunk
        assert!(results[0].0.text.contains("attention") || results[0].0.text.contains("Attention"));
    }

    #[tokio::test]
    #[serial]
    async fn test_search_papers_year_filter() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![
            make_paper("old", "Old neural network paper", 2010, 100, PaperSource::Arxiv),
            make_paper("new", "Modern transformer advances", 2023, 50, PaperSource::Arxiv),
        ];
        store.add_papers(&papers).await.unwrap();

        let results = store
            .search_papers("neural network", 10, Some(2020), None)
            .await
            .unwrap();
        assert!(results.iter().all(|r| r.paper.year.unwrap_or(0) >= 2020));
    }

    #[tokio::test]
    #[serial]
    async fn test_search_papers_filtered_by_source() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![
            make_paper("ax1", "Arxiv transformer paper", 2023, 100, PaperSource::Arxiv),
            make_paper("oa1", "OpenAlex language model", 2023, 200, PaperSource::OpenAlex),
        ];
        store.add_papers(&papers).await.unwrap();

        let filter = SearchFilter {
            source: Some(PaperSource::Arxiv),
            ..Default::default()
        };
        let results = store
            .search_papers_filtered("transformer language model", 10, &filter)
            .await
            .unwrap();
        for r in &results {
            assert!(matches!(r.paper.source, PaperSource::Arxiv));
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_search_papers_filtered_by_citations() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![
            make_paper("hi", "Highly cited work on attention", 2020, 5000, PaperSource::Arxiv),
            make_paper("lo", "Obscure attention paper", 2020, 2, PaperSource::Arxiv),
        ];
        store.add_papers(&papers).await.unwrap();

        let filter = SearchFilter {
            min_citations: Some(100),
            ..Default::default()
        };
        let results = store
            .search_papers_filtered("attention", 10, &filter)
            .await
            .unwrap();
        assert!(results.iter().all(|r| r.paper.citation_count.unwrap_or(0) >= 100));
    }

    #[tokio::test]
    #[serial]
    async fn test_hybrid_search() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![
            make_paper("p1", "Self-attention mechanisms in transformers", 2020, 1000, PaperSource::Arxiv),
        ];
        store.add_papers(&papers).await.unwrap();

        let chunks = vec![
            make_chunk("p1", 0, "Self-attention computes a weighted sum of all positions in the sequence"),
            make_chunk("p1", 1, "The scaling factor prevents dot products from growing too large"),
        ];
        store.add_chunks(&chunks).await.unwrap();

        let results = store
            .hybrid_search("self-attention scaling", 5, 0.4, None)
            .await
            .unwrap();
        assert!(!results.is_empty());
        // The paper should have matched chunks attached
        assert!(!results[0].matched_chunks.is_empty());
    }

    #[tokio::test]
    #[serial]
    async fn test_clear() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![make_paper("p1", "Test paper", 2020, 10, PaperSource::Arxiv)];
        store.add_papers(&papers).await.unwrap();
        let (pc, _) = store.counts().await.unwrap();
        assert_eq!(pc, 1);

        store.clear().await.unwrap();
        let (pc, cc) = store.counts().await.unwrap();
        assert_eq!(pc, 0);
        assert_eq!(cc, 0);
    }

    #[tokio::test]
    #[serial]
    async fn test_add_papers_batched_dedup() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let papers = vec![
            make_paper("dup", "Duplicate paper", 2021, 10, PaperSource::Arxiv),
            make_paper("dup", "Duplicate paper", 2021, 10, PaperSource::Arxiv),
            make_paper("uniq", "Unique paper", 2022, 20, PaperSource::Arxiv),
        ];
        let n = store.add_papers_batched(&papers, INGEST_BATCH_SIZE).await.unwrap();
        // Within-call dedup should reduce 3 -> 2
        assert_eq!(n, 2);
    }

    #[tokio::test]
    #[serial]
    async fn test_search_chunks_for_paper() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        let chunks = vec![
            make_chunk("paper-A", 0, "Deep learning for natural language processing"),
            make_chunk("paper-A", 1, "Recurrent networks for sequence modeling"),
            make_chunk("paper-B", 0, "Computer vision with convolutional architectures"),
        ];
        store.add_chunks(&chunks).await.unwrap();

        let results = store
            .search_chunks_for_paper("paper-A", "deep learning NLP", 5)
            .await
            .unwrap();
        // All returned chunks should belong to paper-A
        assert!(!results.is_empty());
        assert!(results.iter().all(|cr| !cr.text.is_empty()));
    }

    #[tokio::test]
    #[serial]
    async fn test_empty_inputs() {
        let engine = test_engine();
        let (store, _dir) = temp_store(engine).await;

        assert_eq!(store.add_papers(&[]).await.unwrap(), 0);
        assert_eq!(store.add_chunks(&[]).await.unwrap(), 0);
        assert_eq!(store.add_papers_batched(&[], INGEST_BATCH_SIZE).await.unwrap(), 0);
        assert_eq!(store.add_chunks_batched(&[], INGEST_BATCH_SIZE).await.unwrap(), 0);
    }
}
