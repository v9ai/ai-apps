use crate::types::{
    paper_stable_id, Contact, GhCandidate, MatchResult, MatchStatus, ResearchPaper, EMBED_DIM,
};
use anyhow::Result;
use arrow_array::builder::{ListBuilder, StringBuilder};
use arrow_array::{
    Array, FixedSizeListArray, Float32Array, Int64Array, RecordBatch, StringArray,
};
use arrow_schema::{DataType, Field, Schema};
use lancedb::Connection;
use std::sync::Arc;

pub struct Lance {
    pub conn: Connection,
}

impl Lance {
    pub async fn open(uri: &str) -> Result<Self> {
        std::fs::create_dir_all(uri).ok();
        let conn = lancedb::connect(uri).execute().await?;
        Ok(Self { conn })
    }

    pub async fn ensure_tables(&self) -> Result<()> {
        let existing = self.conn.table_names().execute().await?;
        for (name, schema) in [
            ("contacts", contacts_schema()),
            ("paper_embeddings", paper_embeddings_schema()),
            ("gh_profiles", gh_profiles_schema()),
            ("homepages", homepages_schema()),
            ("topic_clusters", topic_clusters_schema()),
            ("fetch_cache", fetch_cache_schema()),
            ("results", results_schema()),
        ] {
            if !existing.contains(&name.to_string()) {
                self.conn.create_empty_table(name, schema).execute().await?;
            }
        }
        Ok(())
    }

    pub async fn upsert_contact(&self, c: &Contact) -> Result<()> {
        let tbl = self.conn.open_table("contacts").execute().await?;
        tbl.delete(&format!("id = '{}'", escape(&c.id))).await.ok();

        let schema = contacts_schema();
        let mut tags_b = ListBuilder::new(StringBuilder::new());
        for t in &c.tags {
            tags_b.values().append_value(t);
        }
        tags_b.append(true);

        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(vec![c.id.clone()])),
                Arc::new(StringArray::from(vec![c.name.clone()])),
                Arc::new(StringArray::from(vec![c.affiliation.clone()])),
                Arc::new(StringArray::from(vec![c.email.clone()])),
                Arc::new(tags_b.finish()),
            ],
        )?;
        tbl.add(vec![batch]).execute().await?;
        Ok(())
    }

    /// Store one paper embedding per contact/paper pair. `papers.len() == embs.len()`.
    pub async fn upsert_paper_embeddings(
        &self,
        contact_id: &str,
        papers: &[ResearchPaper],
        embs: &[Vec<f32>],
    ) -> Result<()> {
        let tbl = self.conn.open_table("paper_embeddings").execute().await?;
        tbl.delete(&format!("contact_id = '{}'", escape(contact_id))).await.ok();

        if papers.is_empty() {
            return Ok(());
        }
        let schema = paper_embeddings_schema();
        let ids: Vec<String> = papers.iter().map(paper_stable_id).collect();
        let titles: Vec<String> = papers.iter().map(|p| p.title.clone()).collect();
        let abstracts: Vec<Option<String>> = papers.iter().map(|p| p.abstract_text.clone()).collect();
        let contact_ids: Vec<String> = vec![contact_id.to_string(); papers.len()];
        let emb_arr = fixed_size_list_f32(embs, EMBED_DIM)?;

        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(ids)),
                Arc::new(StringArray::from(contact_ids)),
                Arc::new(StringArray::from(titles)),
                Arc::new(StringArray::from(abstracts)),
                Arc::new(emb_arr),
            ],
        )?;
        tbl.add(vec![batch]).execute().await?;
        Ok(())
    }

    pub async fn upsert_gh_profile(
        &self,
        contact_id: &str,
        cand: &GhCandidate,
        emb: &[f32],
    ) -> Result<()> {
        let tbl = self.conn.open_table("gh_profiles").execute().await?;
        tbl.delete(&format!(
            "contact_id = '{}' and login = '{}'",
            escape(contact_id),
            escape(&cand.login)
        ))
        .await
        .ok();

        let schema = gh_profiles_schema();
        let emb_arr = fixed_size_list_f32(&[emb.to_vec()], EMBED_DIM)?;
        let blob = serde_json::to_string(cand)?;

        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(vec![contact_id.to_string()])),
                Arc::new(StringArray::from(vec![cand.login.clone()])),
                Arc::new(StringArray::from(vec![blob])),
                Arc::new(emb_arr),
            ],
        )?;
        tbl.add(vec![batch]).execute().await?;
        Ok(())
    }

    /// Read the single best GH profile for a contact (the one we wrote as "winner").
    /// Returns None if no row found.
    #[allow(dead_code)]
    pub async fn get_gh_profile(&self, contact_id: &str, login: &str) -> Result<Option<GhCandidate>> {
        use futures::TryStreamExt;
        use lancedb::query::{ExecutableQuery, QueryBase};
        let tbl = self.conn.open_table("gh_profiles").execute().await?;
        let mut stream = tbl
            .query()
            .only_if(format!(
                "contact_id = '{}' and login = '{}'",
                escape(contact_id),
                escape(login)
            ))
            .limit(1)
            .execute()
            .await?;
        while let Some(batch) = stream.try_next().await? {
            if batch.num_rows() == 0 {
                continue;
            }
            let blob = batch.column(2).as_any().downcast_ref::<StringArray>().unwrap();
            let cand: GhCandidate = serde_json::from_str(blob.value(0))?;
            return Ok(Some(cand));
        }
        Ok(None)
    }

    pub async fn upsert_homepage(
        &self,
        login: &str,
        url: &str,
        text_excerpt: &str,
        emb: &[f32],
    ) -> Result<()> {
        let tbl = self.conn.open_table("homepages").execute().await?;
        tbl.delete(&format!("login = '{}'", escape(login))).await.ok();
        let schema = homepages_schema();
        let emb_arr = fixed_size_list_f32(&[emb.to_vec()], EMBED_DIM)?;
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(vec![login.to_string()])),
                Arc::new(StringArray::from(vec![url.to_string()])),
                Arc::new(StringArray::from(vec![text_excerpt.to_string()])),
                Arc::new(emb_arr),
            ],
        )?;
        tbl.add(vec![batch]).execute().await?;
        Ok(())
    }

    pub async fn put_fetch_blob(
        &self,
        key: &str,
        raw: &[u8],
        format: &str,
        source_url: &str,
    ) -> Result<()> {
        let tbl = self.conn.open_table("fetch_cache").execute().await?;
        tbl.delete(&format!("key = '{}'", escape(key))).await.ok();
        let schema = fetch_cache_schema();
        let now = chrono::Utc::now().timestamp();
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(vec![key.to_string()])),
                Arc::new(StringArray::from(vec![
                    String::from_utf8_lossy(raw).to_string(),
                ])),
                Arc::new(StringArray::from(vec![format.to_string()])),
                Arc::new(StringArray::from(vec![source_url.to_string()])),
                Arc::new(Int64Array::from(vec![now])),
            ],
        )?;
        tbl.add(vec![batch]).execute().await?;
        Ok(())
    }

    pub async fn get_fetch_blob(&self, key: &str) -> Result<Option<String>> {
        use futures::TryStreamExt;
        use lancedb::query::{ExecutableQuery, QueryBase};
        let tbl = self.conn.open_table("fetch_cache").execute().await?;
        let mut stream = tbl
            .query()
            .only_if(format!("key = '{}'", escape(key)))
            .limit(1)
            .execute()
            .await?;
        while let Some(batch) = stream.try_next().await? {
            if batch.num_rows() == 0 {
                continue;
            }
            let raw = batch.column(1).as_any().downcast_ref::<StringArray>().unwrap();
            return Ok(Some(raw.value(0).to_string()));
        }
        Ok(None)
    }

    pub async fn write_result(&self, r: &MatchResult) -> Result<()> {
        let tbl = self.conn.open_table("results").execute().await?;
        tbl.delete(&format!("contact_id = '{}'", escape(&r.contact_id))).await.ok();

        let schema = results_schema();
        let batch = RecordBatch::try_new(
            schema.clone(),
            vec![
                Arc::new(StringArray::from(vec![r.contact_id.clone()])),
                Arc::new(StringArray::from(vec![r.login.clone()])),
                Arc::new(Float32Array::from(vec![r.score])),
                Arc::new(StringArray::from(vec![r.status.as_str().to_string()])),
                Arc::new(StringArray::from(vec![r.arm_id.clone()])),
                Arc::new(StringArray::from(vec![r.evidence.to_string()])),
            ],
        )?;
        tbl.add(vec![batch]).execute().await?;
        Ok(())
    }

    pub async fn all_results(&self) -> Result<Vec<MatchResult>> {
        use futures::TryStreamExt;
        use lancedb::query::ExecutableQuery;
        let tbl = self.conn.open_table("results").execute().await?;
        let mut stream = tbl.query().execute().await?;
        let mut out = vec![];
        while let Some(batch) = stream.try_next().await? {
            let cid = batch.column(0).as_any().downcast_ref::<StringArray>().unwrap();
            let login = batch.column(1).as_any().downcast_ref::<StringArray>().unwrap();
            let score = batch.column(2).as_any().downcast_ref::<Float32Array>().unwrap();
            let status = batch.column(3).as_any().downcast_ref::<StringArray>().unwrap();
            let arm = batch.column(4).as_any().downcast_ref::<StringArray>().unwrap();
            let ev = batch.column(5).as_any().downcast_ref::<StringArray>().unwrap();
            for i in 0..batch.num_rows() {
                let status_enum = match status.value(i) {
                    "matched" => MatchStatus::Matched,
                    "no_relevant_papers" => MatchStatus::NoRelevantPapers,
                    _ => MatchStatus::NoGithub,
                };
                out.push(MatchResult {
                    contact_id: cid.value(i).to_string(),
                    login: (!login.is_null(i)).then(|| login.value(i).to_string()),
                    score: score.value(i),
                    breakdown: None,
                    evidence: serde_json::from_str(ev.value(i)).unwrap_or(serde_json::json!({})),
                    arm_id: (!arm.is_null(i)).then(|| arm.value(i).to_string()),
                    status: status_enum,
                });
            }
        }
        Ok(out)
    }
}

fn escape(s: &str) -> String {
    s.replace('\'', "''")
}

fn fixed_size_list_f32(rows: &[Vec<f32>], dim: usize) -> Result<FixedSizeListArray> {
    use arrow_array::builder::Float32Builder;
    let mut b = Float32Builder::with_capacity(rows.len() * dim);
    for row in rows {
        assert_eq!(row.len(), dim, "embedding dim mismatch");
        b.append_slice(row);
    }
    let values = b.finish();
    let field = Arc::new(Field::new("item", DataType::Float32, true));
    Ok(FixedSizeListArray::try_new(field, dim as i32, Arc::new(values), None)?)
}

fn emb_field() -> Field {
    Field::new(
        "item",
        DataType::Float32,
        true,
    )
}

fn contacts_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("affiliation", DataType::Utf8, true),
        Field::new("email", DataType::Utf8, true),
        Field::new(
            "tags",
            DataType::List(Arc::new(Field::new("item", DataType::Utf8, true))),
            false,
        ),
    ]))
}

fn paper_embeddings_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("contact_id", DataType::Utf8, false),
        Field::new("title", DataType::Utf8, false),
        Field::new("abstract", DataType::Utf8, true),
        Field::new(
            "topic_emb",
            DataType::FixedSizeList(Arc::new(emb_field()), EMBED_DIM as i32),
            false,
        ),
    ]))
}

fn gh_profiles_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("contact_id", DataType::Utf8, false),
        Field::new("login", DataType::Utf8, false),
        Field::new("blob_json", DataType::Utf8, false),
        Field::new(
            "topics_emb",
            DataType::FixedSizeList(Arc::new(emb_field()), EMBED_DIM as i32),
            false,
        ),
    ]))
}

fn homepages_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("login", DataType::Utf8, false),
        Field::new("url", DataType::Utf8, false),
        Field::new("text_excerpt", DataType::Utf8, true),
        Field::new(
            "embedding",
            DataType::FixedSizeList(Arc::new(emb_field()), EMBED_DIM as i32),
            false,
        ),
    ]))
}

fn topic_clusters_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("author_id", DataType::Utf8, false),
        Field::new("cluster_idx", DataType::Utf8, false),
        Field::new("label", DataType::Utf8, true),
        Field::new("weight", DataType::Float32, false),
        Field::new(
            "centroid",
            DataType::FixedSizeList(Arc::new(emb_field()), EMBED_DIM as i32),
            false,
        ),
    ]))
}

fn fetch_cache_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("key", DataType::Utf8, false),
        Field::new("raw_content", DataType::Utf8, false),
        Field::new("format", DataType::Utf8, true),
        Field::new("source_url", DataType::Utf8, true),
        Field::new("fetched_at", DataType::Int64, false),
    ]))
}

fn results_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("contact_id", DataType::Utf8, false),
        Field::new("login", DataType::Utf8, true),
        Field::new("score", DataType::Float32, false),
        Field::new("status", DataType::Utf8, false),
        Field::new("arm_id", DataType::Utf8, true),
        Field::new("evidence_json", DataType::Utf8, false),
    ]))
}
