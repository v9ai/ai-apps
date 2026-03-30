use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{Array, BooleanArray, Float32Array, Int32Array, Int64Array, RecordBatch, StringArray};
use arrow_schema::{DataType, Field, Schema};
use lancedb::{connect, Connection};
use tokio::sync::Mutex;

use crate::analysis::{self, PostAnalysis};
use crate::intent_scorer::PostIntentScorer;
use crate::models::{Contact, ExportResponse, IntentSummary, Post, StoredPost};

/// PostsDb persists data to LanceDB and mirrors it in memory for reads.
pub struct PostsDb {
    conn: Connection,
    next_post_id: Mutex<i64>,
    contacts: Mutex<Vec<Contact>>,
    posts: Mutex<Vec<StoredPost>>,
}

fn contacts_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("first_name", DataType::Utf8, false),
        Field::new("last_name", DataType::Utf8, false),
        Field::new("linkedin_url", DataType::Utf8, false),
        Field::new("company", DataType::Utf8, true),
        Field::new("position", DataType::Utf8, true),
        Field::new("scraped_at", DataType::Utf8, false),
    ]))
}

fn posts_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        // Original fields
        Field::new("id", DataType::Int64, false),
        Field::new("contact_id", DataType::Int32, false),
        Field::new("post_url", DataType::Utf8, true),
        Field::new("post_text", DataType::Utf8, true),
        Field::new("posted_date", DataType::Utf8, true),
        Field::new("reactions_count", DataType::Int32, false),
        Field::new("comments_count", DataType::Int32, false),
        Field::new("reposts_count", DataType::Int32, false),
        Field::new("media_type", DataType::Utf8, false),
        Field::new("is_repost", DataType::Boolean, false),
        Field::new("original_author", DataType::Utf8, true),
        Field::new("scraped_at", DataType::Utf8, false),
        // ML analysis fields
        Field::new("relevance_score", DataType::Float32, false),
        Field::new("primary_intent", DataType::Utf8, false),
        Field::new("intent_hiring", DataType::Float32, false),
        Field::new("intent_ai_ml", DataType::Float32, false),
        Field::new("intent_remote", DataType::Float32, false),
        Field::new("intent_eng_culture", DataType::Float32, false),
        Field::new("intent_company_growth", DataType::Float32, false),
        Field::new("intent_thought_leadership", DataType::Float32, false),
        Field::new("intent_noise", DataType::Float32, false),
        Field::new("entities_json", DataType::Utf8, true),
    ]))
}

impl PostsDb {
    pub async fn open(path: &str) -> Result<Self> {
        let conn = connect(path)
            .execute()
            .await
            .context("Failed to open LanceDB")?;

        let db = Self {
            conn,
            next_post_id: Mutex::new(1),
            contacts: Mutex::new(Vec::new()),
            posts: Mutex::new(Vec::new()),
        };

        db.ensure_tables().await?;

        Ok(db)
    }

    async fn ensure_tables(&self) -> Result<()> {
        let tables = self.conn.table_names().execute().await?;

        if !tables.contains(&"contacts".to_string()) {
            self.conn
                .create_empty_table("contacts", contacts_schema())
                .execute()
                .await
                .context("Failed to create contacts table")?;
            tracing::info!("Created contacts table");
        }

        if tables.contains(&"posts".to_string()) {
            // Check if we need to migrate (old schema lacks relevance_score)
            let table = self.conn.open_table("posts").execute().await?;
            let schema = table.schema().await?;
            let has_relevance = schema.fields().iter().any(|f| f.name() == "relevance_score");
            if !has_relevance {
                tracing::info!("Migrating posts table to v2 schema (adding ML columns)");
                self.conn
                    .drop_table("posts", &[])
                    .await
                    .context("Failed to drop old posts table")?;
                self.conn
                    .create_empty_table("posts", posts_schema())
                    .execute()
                    .await
                    .context("Failed to create posts table v2")?;
                tracing::info!("Created posts table v2 with ML analysis columns");
            }
        } else {
            self.conn
                .create_empty_table("posts", posts_schema())
                .execute()
                .await
                .context("Failed to create posts table")?;
            tracing::info!("Created posts table with ML analysis columns");
        }

        Ok(())
    }

    pub async fn add_contacts(&self, contacts: &[Contact]) -> Result<usize> {
        if contacts.is_empty() {
            return Ok(0);
        }

        let schema = contacts_schema();

        let batch = RecordBatch::try_new(
            schema,
            vec![
                Arc::new(Int32Array::from_iter_values(contacts.iter().map(|c| c.id))),
                Arc::new(StringArray::from_iter_values(
                    contacts.iter().map(|c| c.first_name.as_str()),
                )),
                Arc::new(StringArray::from_iter_values(
                    contacts.iter().map(|c| c.last_name.as_str()),
                )),
                Arc::new(StringArray::from_iter_values(
                    contacts.iter().map(|c| c.linkedin_url.as_str()),
                )),
                Arc::new(StringArray::from(
                    contacts
                        .iter()
                        .map(|c| c.company.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    contacts
                        .iter()
                        .map(|c| c.position.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    contacts.iter().map(|c| c.scraped_at.as_str()),
                )),
            ],
        )?;

        let count = batch.num_rows();
        let table = self.conn.open_table("contacts").execute().await?;
        table.add(vec![batch]).execute().await?;

        self.contacts.lock().await.extend(contacts.iter().cloned());

        tracing::info!("Inserted {} contacts", count);
        Ok(count)
    }

    /// Add posts with ML analysis. Returns (inserted, duplicates, filtered, intent_summary).
    pub async fn add_posts(
        &self,
        contact_id: i32,
        posts: &[Post],
        scorer: &PostIntentScorer,
    ) -> Result<(usize, usize, usize, Option<IntentSummary>)> {
        if posts.is_empty() {
            return Ok((0, 0, 0, None));
        }

        // Analyze each post and partition into keep vs filtered
        let mut kept: Vec<(&Post, PostAnalysis)> = Vec::new();
        let mut filtered_count: usize = 0;

        for post in posts {
            let result = analysis::analyze(post, scorer);
            if result.keep {
                tracing::debug!(
                    "KEEP (relevance={:.3} intent={}): {}",
                    result.relevance_score,
                    result.primary_intent,
                    post.post_text
                        .as_deref()
                        .unwrap_or("")
                        .chars()
                        .take(80)
                        .collect::<String>(),
                );
                kept.push((post, result));
            } else {
                tracing::info!(
                    "DROP (relevance={:.3} intent={}): {}",
                    result.relevance_score,
                    result.primary_intent,
                    post.post_text
                        .as_deref()
                        .unwrap_or("[empty]")
                        .chars()
                        .take(80)
                        .collect::<String>(),
                );
                filtered_count += 1;
            }
        }

        if kept.is_empty() {
            tracing::info!(
                "All {} posts for contact {} filtered out",
                posts.len(),
                contact_id
            );
            return Ok((0, 0, filtered_count, None));
        }

        // Compute intent summary
        let mut summary = IntentSummary {
            hiring: 0,
            ai_ml: 0,
            remote: 0,
            eng_culture: 0,
            company_growth: 0,
            thought_leadership: 0,
            noise: 0,
        };
        for (_, analysis) in &kept {
            match analysis.primary_intent.as_str() {
                "hiring_signal" => summary.hiring += 1,
                "ai_ml_content" => summary.ai_ml += 1,
                "remote_signal" => summary.remote += 1,
                "engineering_culture" => summary.eng_culture += 1,
                "company_growth" => summary.company_growth += 1,
                "thought_leadership" => summary.thought_leadership += 1,
                _ => summary.noise += 1,
            }
        }

        let schema = posts_schema();
        let now = chrono::Utc::now().to_rfc3339();
        let n = kept.len();

        let mut next_id = self.next_post_id.lock().await;
        let start_id = *next_id;
        let ids: Vec<i64> = (start_id..start_id + n as i64).collect();
        *next_id = start_id + n as i64;
        drop(next_id);

        let batch = RecordBatch::try_new(
            schema,
            vec![
                // Original fields
                Arc::new(Int64Array::from(ids.clone())),
                Arc::new(Int32Array::from(vec![contact_id; n])),
                Arc::new(StringArray::from(
                    kept.iter()
                        .map(|(p, _)| p.post_url.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    kept.iter()
                        .map(|(p, _)| p.post_text.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    kept.iter()
                        .map(|(p, _)| p.posted_date.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(Int32Array::from_iter_values(
                    kept.iter().map(|(p, _)| p.reactions_count),
                )),
                Arc::new(Int32Array::from_iter_values(
                    kept.iter().map(|(p, _)| p.comments_count),
                )),
                Arc::new(Int32Array::from_iter_values(
                    kept.iter().map(|(p, _)| p.reposts_count),
                )),
                Arc::new(StringArray::from_iter_values(
                    kept.iter().map(|(p, _)| p.media_type.as_str()),
                )),
                Arc::new(BooleanArray::from(
                    kept.iter().map(|(p, _)| p.is_repost).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    kept.iter()
                        .map(|(p, _)| p.original_author.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    std::iter::repeat(now.as_str()).take(n),
                )),
                // ML analysis fields
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.relevance_score),
                )),
                Arc::new(StringArray::from_iter_values(
                    kept.iter().map(|(_, a)| a.primary_intent.as_str()),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.hiring_signal),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.ai_ml_content),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.remote_signal),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.engineering_culture),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.company_growth),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.thought_leadership),
                )),
                Arc::new(Float32Array::from_iter_values(
                    kept.iter().map(|(_, a)| a.intents.noise),
                )),
                Arc::new(StringArray::from(
                    kept.iter()
                        .map(|(_, a)| {
                            serde_json::to_string(&a.entities).ok().as_deref().map(|s| s.to_string())
                        })
                        .collect::<Vec<Option<String>>>()
                        .iter()
                        .map(|s| s.as_deref())
                        .collect::<Vec<_>>(),
                )),
            ],
        )?;

        let table = self.conn.open_table("posts").execute().await?;
        table.add(vec![batch]).execute().await?;

        // Mirror to in-memory
        {
            let mut mem_posts = self.posts.lock().await;
            for (i, (post, a)) in kept.iter().enumerate() {
                mem_posts.push(StoredPost {
                    id: ids[i],
                    contact_id,
                    post_url: post.post_url.clone(),
                    post_text: post.post_text.clone(),
                    posted_date: post.posted_date.clone(),
                    reactions_count: post.reactions_count,
                    comments_count: post.comments_count,
                    reposts_count: post.reposts_count,
                    media_type: post.media_type.clone(),
                    is_repost: post.is_repost,
                    original_author: post.original_author.clone(),
                    scraped_at: now.clone(),
                    relevance_score: a.relevance_score,
                    primary_intent: a.primary_intent.clone(),
                    intent_hiring: a.intents.hiring_signal,
                    intent_ai_ml: a.intents.ai_ml_content,
                    intent_remote: a.intents.remote_signal,
                    intent_eng_culture: a.intents.engineering_culture,
                    intent_company_growth: a.intents.company_growth,
                    intent_thought_leadership: a.intents.thought_leadership,
                    intent_noise: a.intents.noise,
                    entities_json: serde_json::to_string(&a.entities).ok(),
                });
            }
        }

        tracing::info!(
            "Contact {}: {} kept, {} filtered out of {} total",
            contact_id,
            n,
            filtered_count,
            n + filtered_count,
        );
        Ok((n, 0, filtered_count, Some(summary)))
    }

    /// Load all posts from LanceDB (full disk scan). Used by batch processing.
    pub async fn load_all_posts(&self) -> Result<Vec<StoredPost>> {
        use lancedb::query::ExecutableQuery;
        use futures::TryStreamExt;

        let table = self
            .conn
            .open_table("posts")
            .execute()
            .await
            .context("Failed to open posts table")?;

        let mut stream = table
            .query()
            .execute()
            .await
            .context("Failed to query posts table")?;

        let mut batches = Vec::new();
        while let Some(batch) = stream.try_next().await.context("Failed reading batch")? {
            batches.push(batch);
        }

        let mut posts = Vec::new();
        for batch in &batches {
            let ids = batch.column(0).as_any().downcast_ref::<Int64Array>().unwrap();
            let contact_ids = batch.column(1).as_any().downcast_ref::<Int32Array>().unwrap();
            let post_urls = batch.column(2).as_any().downcast_ref::<StringArray>().unwrap();
            let post_texts = batch.column(3).as_any().downcast_ref::<StringArray>().unwrap();
            let posted_dates = batch.column(4).as_any().downcast_ref::<StringArray>().unwrap();
            let reactions = batch.column(5).as_any().downcast_ref::<Int32Array>().unwrap();
            let comments = batch.column(6).as_any().downcast_ref::<Int32Array>().unwrap();
            let reposts = batch.column(7).as_any().downcast_ref::<Int32Array>().unwrap();
            let media_types = batch.column(8).as_any().downcast_ref::<StringArray>().unwrap();
            let is_reposts = batch.column(9).as_any().downcast_ref::<BooleanArray>().unwrap();
            let original_authors = batch.column(10).as_any().downcast_ref::<StringArray>().unwrap();
            let scraped_ats = batch.column(11).as_any().downcast_ref::<StringArray>().unwrap();
            let relevance_scores = batch.column(12).as_any().downcast_ref::<Float32Array>().unwrap();
            let primary_intents = batch.column(13).as_any().downcast_ref::<StringArray>().unwrap();
            let intent_hirings = batch.column(14).as_any().downcast_ref::<Float32Array>().unwrap();
            let intent_ai_mls = batch.column(15).as_any().downcast_ref::<Float32Array>().unwrap();
            let intent_remotes = batch.column(16).as_any().downcast_ref::<Float32Array>().unwrap();
            let intent_eng_cultures = batch.column(17).as_any().downcast_ref::<Float32Array>().unwrap();
            let intent_company_growths = batch.column(18).as_any().downcast_ref::<Float32Array>().unwrap();
            let intent_thought_leaderships = batch.column(19).as_any().downcast_ref::<Float32Array>().unwrap();
            let intent_noises = batch.column(20).as_any().downcast_ref::<Float32Array>().unwrap();
            let entities_jsons = batch.column(21).as_any().downcast_ref::<StringArray>().unwrap();

            for i in 0..batch.num_rows() {
                posts.push(StoredPost {
                    id: ids.value(i),
                    contact_id: contact_ids.value(i),
                    post_url: if post_urls.is_null(i) { None } else { Some(post_urls.value(i).to_string()) },
                    post_text: if post_texts.is_null(i) { None } else { Some(post_texts.value(i).to_string()) },
                    posted_date: if posted_dates.is_null(i) { None } else { Some(posted_dates.value(i).to_string()) },
                    reactions_count: reactions.value(i),
                    comments_count: comments.value(i),
                    reposts_count: reposts.value(i),
                    media_type: media_types.value(i).to_string(),
                    is_repost: is_reposts.value(i),
                    original_author: if original_authors.is_null(i) { None } else { Some(original_authors.value(i).to_string()) },
                    scraped_at: scraped_ats.value(i).to_string(),
                    relevance_score: relevance_scores.value(i),
                    primary_intent: primary_intents.value(i).to_string(),
                    intent_hiring: intent_hirings.value(i),
                    intent_ai_ml: intent_ai_mls.value(i),
                    intent_remote: intent_remotes.value(i),
                    intent_eng_culture: intent_eng_cultures.value(i),
                    intent_company_growth: intent_company_growths.value(i),
                    intent_thought_leadership: intent_thought_leaderships.value(i),
                    intent_noise: intent_noises.value(i),
                    entities_json: if entities_jsons.is_null(i) { None } else { Some(entities_jsons.value(i).to_string()) },
                });
            }
        }

        tracing::info!("Loaded {} posts from LanceDB", posts.len());
        Ok(posts)
    }

    pub async fn posts_count(&self) -> usize {
        match self.conn.open_table("posts").execute().await {
            Ok(table) => table.count_rows(None).await.unwrap_or(0) as usize,
            Err(_) => 0,
        }
    }

    /// Get all in-memory posts (for querying/filtering).
    pub async fn get_posts(&self) -> Vec<StoredPost> {
        self.posts.lock().await.clone()
    }

    pub async fn export(&self) -> ExportResponse {
        let contacts = self.contacts.lock().await.clone();
        let posts = self.posts.lock().await.clone();
        ExportResponse { contacts, posts }
    }
}
