//! LanceDB vector store — papers + chunks tables with semantic search.

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

/// Search result pairing a paper with its relevance score.
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub paper: ResearchPaper,
    pub score: f32,
    pub matched_chunks: Vec<(Chunk, f32)>,
}

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
        Field::new("doi", DataType::Utf8, true),
        Field::new("citation_count", DataType::UInt64, true),
        Field::new("url", DataType::Utf8, true),
        Field::new("pdf_url", DataType::Utf8, true),
        Field::new("source", DataType::Utf8, true),
        Field::new("fields_of_study_json", DataType::Utf8, true),
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

impl VectorStore {
    pub async fn connect(path: &str, engine: EmbeddingEngine) -> Result<Self> {
        let conn = lancedb::connect(path).execute().await?;

        let tables: Vec<String> = conn.table_names().execute().await?;

        if !tables.contains(&PAPERS_TABLE.to_string()) {
            let schema = papers_schema();
            let batch = RecordBatch::new_empty(schema.clone());
            conn.create_table(PAPERS_TABLE, batch)
                .execute()
                .await?;
            info!("Created '{PAPERS_TABLE}' table");
        }

        if !tables.contains(&CHUNKS_TABLE.to_string()) {
            let schema = chunks_schema();
            let batch = RecordBatch::new_empty(schema.clone());
            conn.create_table(CHUNKS_TABLE, batch)
                .execute()
                .await?;
            info!("Created '{CHUNKS_TABLE}' table");
        }

        Ok(Self { conn, engine })
    }

    // ── Ingest ────────────────────────────────────────────────

    pub async fn add_papers(&self, papers: &[ResearchPaper]) -> Result<usize> {
        if papers.is_empty() {
            return Ok(0);
        }

        // Build embedding texts
        let embed_texts: Vec<String> = papers
            .iter()
            .map(|p| {
                let abs = p.abstract_text.as_deref().unwrap_or("");
                let end = abs.len().min(2000);
                format!("{} {}", p.title, &abs[..end])
            })
            .collect();
        let text_refs: Vec<&str> = embed_texts.iter().map(|s| s.as_str()).collect();
        let vecs = self.engine.embed_batch(&text_refs)?;

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
        let mut timestamps = Vec::with_capacity(n);
        let mut all_vecs: Vec<f32> = Vec::with_capacity(n * DIM);

        for (p, v) in papers.iter().zip(vecs.iter()) {
            source_ids.push(p.source_id.clone());
            titles.push(p.title.clone());
            abstracts.push(p.abstract_text.clone().unwrap_or_default());
            authors_json.push(serde_json::to_string(&p.authors).unwrap_or_default());
            years.push(p.year.unwrap_or(0));
            dois.push(p.doi.clone().unwrap_or_default());
            citation_counts.push(p.citation_count.unwrap_or(0));
            urls.push(p.url.clone().unwrap_or_default());
            pdf_urls.push(p.pdf_url.clone().unwrap_or_default());
            sources.push(format!("{:?}", p.source));
            fields_json.push(
                serde_json::to_string(&p.fields_of_study).unwrap_or_default(),
            );
            timestamps.push(now_secs());
            all_vecs.extend_from_slice(v);
        }

        let vec_values = Float32Array::from(all_vecs);
        let vec_field = Arc::new(Field::new("item", DataType::Float32, true));
        let vec_array =
            FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)?;

        let schema = papers_schema();
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(source_ids)) as ArrayRef,
                Arc::new(StringArray::from(titles)),
                Arc::new(StringArray::from(abstracts)),
                Arc::new(StringArray::from(authors_json)),
                Arc::new(UInt32Array::from(years)),
                Arc::new(StringArray::from(dois)),
                Arc::new(UInt64Array::from(citation_counts)),
                Arc::new(StringArray::from(urls)),
                Arc::new(StringArray::from(pdf_urls)),
                Arc::new(StringArray::from(sources)),
                Arc::new(StringArray::from(fields_json)),
                Arc::new(Float64Array::from(timestamps)),
                Arc::new(vec_array),
            ],
        )?;

        let table = self.conn.open_table(PAPERS_TABLE).execute().await?;
        table.add(vec![batch]).execute().await?;
        info!("Indexed {} papers", n);
        Ok(n)
    }

    pub async fn add_chunks(&self, chunks: &[Chunk]) -> Result<usize> {
        if chunks.is_empty() {
            return Ok(0);
        }

        let text_refs: Vec<&str> = chunks.iter().map(|c| c.text.as_str()).collect();
        let vecs = self.engine.embed_batch(&text_refs)?;

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
            FixedSizeListArray::try_new(vec_field, DIM as i32, Arc::new(vec_values), None)?;

        let schema = chunks_schema();
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(chunk_ids)) as ArrayRef,
                Arc::new(StringArray::from(paper_ids)),
                Arc::new(Int32Array::from(indices)),
                Arc::new(StringArray::from(texts_out)),
                Arc::new(StringArray::from(sections)),
                Arc::new(vec_array),
            ],
        )?;

        let table = self.conn.open_table(CHUNKS_TABLE).execute().await?;
        table.add(vec![batch]).execute().await?;
        Ok(n)
    }

    // ── Search ────────────────────────────────────────────────

    pub async fn search_papers(
        &self,
        query: &str,
        top_k: usize,
        year_min: Option<u32>,
        year_max: Option<u32>,
    ) -> Result<Vec<SearchResult>> {
        let qvec = self.engine.embed_one(query)?;
        let table = self.conn.open_table(PAPERS_TABLE).execute().await?;

        let builder = table
            .vector_search(qvec.clone())
            .context("vector_search")?
            .limit(top_k * 3);

        let results = builder.execute().await?;
        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results).await?;

        let mut search_results = Vec::new();

        for batch in &batches {
            let titles = batch
                .column_by_name("title")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let abstracts = batch
                .column_by_name("abstract_text")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let authors_col = batch
                .column_by_name("authors_json")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let years_col = batch
                .column_by_name("year")
                .and_then(|c| c.as_any().downcast_ref::<UInt32Array>());
            let dois_col = batch
                .column_by_name("doi")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let cites_col = batch
                .column_by_name("citation_count")
                .and_then(|c| c.as_any().downcast_ref::<UInt64Array>());
            let urls_col = batch
                .column_by_name("url")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let pdf_col = batch
                .column_by_name("pdf_url")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let source_col = batch
                .column_by_name("source")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let source_id_col = batch
                .column_by_name("source_id")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let fields_col = batch
                .column_by_name("fields_of_study_json")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let distance_col = batch
                .column_by_name("_distance")
                .and_then(|c| c.as_any().downcast_ref::<Float32Array>());

            for i in 0..batch.num_rows() {
                let year = years_col.map(|c| c.value(i));
                if let Some(ymin) = year_min {
                    if year.unwrap_or(0) < ymin {
                        continue;
                    }
                }
                if let Some(ymax) = year_max {
                    if year.unwrap_or(9999) > ymax {
                        continue;
                    }
                }

                let title = titles
                    .map(|c| c.value(i).to_string())
                    .unwrap_or_default();
                let abstract_text = abstracts
                    .map(|c| c.value(i).to_string())
                    .filter(|s| !s.is_empty());
                let authors: Vec<String> = authors_col
                    .and_then(|c| serde_json::from_str(c.value(i)).ok())
                    .unwrap_or_default();
                let fields_of_study: Option<Vec<String>> = fields_col
                    .and_then(|c| serde_json::from_str(c.value(i)).ok());
                let source_str =
                    source_col.map(|c| c.value(i)).unwrap_or("Manual");
                let source = match source_str {
                    "Arxiv" => PaperSource::Arxiv,
                    "SemanticScholar" => PaperSource::SemanticScholar,
                    "OpenAlex" => PaperSource::OpenAlex,
                    "Crossref" => PaperSource::Crossref,
                    "Core" => PaperSource::Core,
                    _ => PaperSource::SemanticScholar,
                };

                let dist = distance_col.map(|c| c.value(i)).unwrap_or(0.5);
                let score = 1.0 - dist;

                let cite_count = cites_col.map(|c| c.value(i));
                let source_id = source_id_col
                    .map(|c| c.value(i).to_string())
                    .unwrap_or_default();

                search_results.push(SearchResult {
                    paper: ResearchPaper {
                        title,
                        abstract_text,
                        authors,
                        year,
                        doi: dois_col
                            .map(|c| c.value(i).to_string())
                            .filter(|s| !s.is_empty()),
                        citation_count: cite_count,
                        url: urls_col
                            .map(|c| c.value(i).to_string())
                            .filter(|s| !s.is_empty()),
                        pdf_url: pdf_col
                            .map(|c| c.value(i).to_string())
                            .filter(|s| !s.is_empty()),
                        source,
                        source_id,
                        fields_of_study,
                    },
                    score,
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

    pub async fn search_chunks(
        &self,
        query: &str,
        top_k: usize,
    ) -> Result<Vec<(Chunk, f32)>> {
        let qvec = self.engine.embed_one(query)?;
        let table = self.conn.open_table(CHUNKS_TABLE).execute().await?;

        let results = table
            .vector_search(qvec)
            .context("chunk vector_search")?
            .limit(top_k)
            .execute()
            .await?;

        let batches: Vec<RecordBatch> =
            futures::TryStreamExt::try_collect(results).await?;
        let mut out = Vec::new();

        for batch in &batches {
            let texts = batch
                .column_by_name("text")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let paper_ids = batch
                .column_by_name("paper_id")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let indices = batch
                .column_by_name("chunk_index")
                .and_then(|c| c.as_any().downcast_ref::<Int32Array>());
            let sections = batch
                .column_by_name("section")
                .and_then(|c| c.as_any().downcast_ref::<StringArray>());
            let dists = batch
                .column_by_name("_distance")
                .and_then(|c| c.as_any().downcast_ref::<Float32Array>());

            for i in 0..batch.num_rows() {
                let chunk = Chunk {
                    text: texts
                        .map(|c| c.value(i).to_string())
                        .unwrap_or_default(),
                    paper_id: paper_ids
                        .map(|c| c.value(i).to_string())
                        .unwrap_or_default(),
                    chunk_index: indices.map(|c| c.value(i)).unwrap_or(0),
                    section: sections
                        .map(|c| c.value(i).to_string())
                        .unwrap_or_default(),
                };
                let score =
                    1.0 - dists.map(|c| c.value(i)).unwrap_or(0.5);
                out.push((chunk, score));
            }
        }
        Ok(out)
    }

    /// Hybrid search: fuse paper-level and chunk-level scores.
    pub async fn hybrid_search(
        &self,
        query: &str,
        top_k: usize,
        chunk_weight: f32,
        year_min: Option<u32>,
    ) -> Result<Vec<SearchResult>> {
        let mut paper_results = self
            .search_papers(query, top_k * 2, year_min, None)
            .await?;
        let chunk_results = self.search_chunks(query, top_k * 3).await?;

        let mut idx_map: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for (i, sr) in paper_results.iter().enumerate() {
            idx_map.insert(sr.paper.source_id.clone(), i);
        }

        for (chunk, cscore) in chunk_results {
            if let Some(&idx) = idx_map.get(&chunk.paper_id) {
                let sr = &mut paper_results[idx];
                sr.score =
                    sr.score * (1.0 - chunk_weight) + cscore * chunk_weight;
                sr.matched_chunks.push((chunk, cscore));
            }
        }

        paper_results.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        paper_results.truncate(top_k);
        Ok(paper_results)
    }

    pub async fn counts(&self) -> Result<(usize, usize)> {
        let pt = self.conn.open_table(PAPERS_TABLE).execute().await?;
        let ct = self.conn.open_table(CHUNKS_TABLE).execute().await?;
        Ok((pt.count_rows(None).await?, ct.count_rows(None).await?))
    }
}
