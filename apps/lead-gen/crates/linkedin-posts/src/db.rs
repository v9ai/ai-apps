use std::sync::Arc;

use anyhow::{Context, Result};
use arrow_array::{BooleanArray, Int32Array, Int64Array, RecordBatch, StringArray};
use arrow_schema::{DataType, Field, Schema};
use lancedb::{connect, Connection};
use tokio::sync::Mutex;

use crate::models::{Contact, ExportResponse, Post, StoredPost};
use crate::scoring;

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

        if !tables.contains(&"posts".to_string()) {
            self.conn
                .create_empty_table("posts", posts_schema())
                .execute()
                .await
                .context("Failed to create posts table")?;
            tracing::info!("Created posts table");
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

    pub async fn add_posts(&self, contact_id: i32, posts: &[Post]) -> Result<(usize, usize, usize)> {
        if posts.is_empty() {
            return Ok((0, 0, 0));
        }

        // Score each post and partition into keep vs filtered
        let mut kept: Vec<&Post> = Vec::new();
        let mut filtered_count: usize = 0;

        for post in posts {
            let verdict = scoring::score(post);
            if verdict.keep {
                tracing::debug!(
                    "KEEP (score={} reason={}): {}",
                    verdict.score,
                    verdict.reason,
                    post.post_text.as_deref().unwrap_or("").chars().take(80).collect::<String>(),
                );
                kept.push(post);
            } else {
                tracing::info!(
                    "DROP (score={} reason={}): {}",
                    verdict.score,
                    verdict.reason,
                    post.post_text.as_deref().unwrap_or("[empty]").chars().take(80).collect::<String>(),
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
            return Ok((0, 0, filtered_count));
        }

        let posts = &kept;
        let schema = posts_schema();
        let now = chrono::Utc::now().to_rfc3339();

        let mut next_id = self.next_post_id.lock().await;
        let start_id = *next_id;
        let n = posts.len();
        let ids: Vec<i64> = (start_id..start_id + n as i64).collect();
        *next_id = start_id + n as i64;
        drop(next_id);

        let batch = RecordBatch::try_new(
            schema,
            vec![
                Arc::new(Int64Array::from(ids.clone())),
                Arc::new(Int32Array::from(vec![contact_id; n])),
                Arc::new(StringArray::from(
                    posts
                        .iter()
                        .map(|p| p.post_url.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    posts
                        .iter()
                        .map(|p| p.post_text.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    posts
                        .iter()
                        .map(|p| p.posted_date.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(Int32Array::from_iter_values(
                    posts.iter().map(|p| p.reactions_count),
                )),
                Arc::new(Int32Array::from_iter_values(
                    posts.iter().map(|p| p.comments_count),
                )),
                Arc::new(Int32Array::from_iter_values(
                    posts.iter().map(|p| p.reposts_count),
                )),
                Arc::new(StringArray::from_iter_values(
                    posts.iter().map(|p| p.media_type.as_str()),
                )),
                Arc::new(BooleanArray::from(
                    posts.iter().map(|p| p.is_repost).collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from(
                    posts
                        .iter()
                        .map(|p| p.original_author.as_deref())
                        .collect::<Vec<_>>(),
                )),
                Arc::new(StringArray::from_iter_values(
                    std::iter::repeat(now.as_str()).take(n),
                )),
            ],
        )?;

        let table = self.conn.open_table("posts").execute().await?;
        table.add(vec![batch]).execute().await?;

        // Mirror to in-memory
        {
            let mut mem_posts = self.posts.lock().await;
            for (i, post) in posts.iter().enumerate() {
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
                });
            }
        }

        tracing::info!(
            "Contact {}: {} kept, {} filtered out of {} total",
            contact_id, n, filtered_count, n + filtered_count,
        );
        Ok((n, 0, filtered_count))
    }

    pub async fn posts_count(&self) -> usize {
        match self.conn.open_table("posts").execute().await {
            Ok(table) => table.count_rows(None).await.unwrap_or(0) as usize,
            Err(_) => 0,
        }
    }

    pub async fn export(&self) -> ExportResponse {
        let contacts = self.contacts.lock().await.clone();
        let posts = self.posts.lock().await.clone();
        ExportResponse { contacts, posts }
    }
}
