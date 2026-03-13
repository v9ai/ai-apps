use anyhow::{Context, Result};
use serde::Deserialize;
use serde_json::Value;

/// Row from `family_member_characteristics` as returned by D1.
#[derive(Debug, Deserialize)]
pub struct Characteristic {
    pub id: i32,
    pub family_member_id: i32,
    pub category: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    /// Stored as a JSON-encoded array in D1, e.g. `["ACADEMIC","PEER"]`.
    pub impairment_domains: Option<String>,
}

#[derive(Deserialize)]
struct D1Response {
    result: Vec<D1ResultSet>,
}

#[derive(Deserialize)]
struct D1ResultSet {
    results: Vec<Characteristic>,
}

pub struct D1Client {
    account_id: String,
    database_id: String,
    token: String,
    http: reqwest::Client,
}

impl D1Client {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            account_id: std::env::var("CLOUDFLARE_ACCOUNT_ID")
                .context("CLOUDFLARE_ACCOUNT_ID not set")?,
            database_id: std::env::var("CLOUDFLARE_DATABASE_ID")
                .context("CLOUDFLARE_DATABASE_ID not set")?,
            token: std::env::var("CLOUDFLARE_D1_TOKEN")
                .context("CLOUDFLARE_D1_TOKEN not set")?,
            http: reqwest::Client::new(),
        })
    }

    /// Execute a single SQL statement and return the rows as JSON values.
    async fn execute_sql(&self, sql: &str, params: Value) -> Result<Vec<Value>> {
        let url = format!(
            "https://api.cloudflare.com/client/v4/accounts/{}/d1/database/{}/query",
            self.account_id, self.database_id,
        );
        let body = serde_json::json!({ "sql": sql, "params": params });
        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.token)
            .json(&body)
            .send()
            .await
            .context("D1 HTTP request failed")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 API error {status}: {text}");
        }

        let data: Value = resp.json().await.context("parsing D1 response")?;
        Ok(data["result"][0]["results"]
            .as_array()
            .cloned()
            .unwrap_or_default())
    }

    /// Return the first goal_id linked to a family member, or None.
    pub async fn fetch_first_goal_id(&self, family_member_id: i32) -> Result<Option<i32>> {
        let rows = self
            .execute_sql(
                "SELECT id FROM goals WHERE family_member_id = ?1 ORDER BY created_at DESC LIMIT 1",
                serde_json::json!([family_member_id]),
            )
            .await?;
        Ok(rows.first().and_then(|r| r["id"].as_i64()).map(|v| v as i32))
    }

    /// Upsert a research paper into `therapy_research`.
    ///
    /// - If a row with the same DOI already exists, stamps `characteristic_id` if currently NULL.
    /// - If a row with the same title + goal_id exists, skips insertion.
    /// - Otherwise inserts a new row.
    ///
    /// Returns the row id.
    pub async fn upsert_research_paper(
        &self,
        goal_id: i32,
        characteristic_id: i32,
        therapeutic_goal_type: &str,
        title: &str,
        authors_json: &str,
        year: Option<i32>,
        doi: Option<&str>,
        url: Option<&str>,
        key_findings_json: &str,
        therapeutic_techniques_json: &str,
        evidence_level: &str,
        relevance_score: f64,
    ) -> Result<i64> {
        // 1. Check by DOI
        if let Some(doi_val) = doi.filter(|d| !d.is_empty()) {
            let rows = self
                .execute_sql(
                    "SELECT id, characteristic_id FROM therapy_research WHERE doi = ?1 LIMIT 1",
                    serde_json::json!([doi_val]),
                )
                .await?;
            if let Some(row) = rows.first() {
                let existing_id = row["id"].as_i64().unwrap_or(0);
                // Stamp characteristic_id if not yet set
                if row["characteristic_id"].is_null() {
                    self.execute_sql(
                        "UPDATE therapy_research SET characteristic_id = ?1, updated_at = datetime('now') WHERE id = ?2",
                        serde_json::json!([characteristic_id, existing_id]),
                    ).await?;
                }
                return Ok(existing_id);
            }
        }

        // 2. Check by title + goal_id
        let rows = self
            .execute_sql(
                "SELECT id FROM therapy_research WHERE title = ?1 AND goal_id = ?2 LIMIT 1",
                serde_json::json!([title, goal_id]),
            )
            .await?;
        if let Some(row) = rows.first() {
            return Ok(row["id"].as_i64().unwrap_or(0));
        }

        // 3. Insert
        let rows = self.execute_sql(
            "INSERT INTO therapy_research \
             (goal_id, characteristic_id, therapeutic_goal_type, title, authors, year, doi, url, \
              key_findings, therapeutic_techniques, evidence_level, relevance_score, \
              extracted_by, extraction_confidence) \
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14) RETURNING id",
            serde_json::json!([
                goal_id,
                characteristic_id,
                therapeutic_goal_type,
                title,
                authors_json,
                year,
                doi,
                url,
                key_findings_json,
                therapeutic_techniques_json,
                evidence_level,
                (relevance_score * 100.0) as i64, // stored as integer 0-100
                "rust:deepseek-reasoner:v1",
                75, // default extraction_confidence
            ]),
        ).await?;

        Ok(rows.first().and_then(|r| r["id"].as_i64()).unwrap_or(0))
    }

    pub async fn fetch_characteristic(&self, characteristic_id: i32) -> Result<Characteristic> {
        let url = format!(
            "https://api.cloudflare.com/client/v4/accounts/{}/d1/database/{}/query",
            self.account_id, self.database_id,
        );

        let body = serde_json::json!({
            "sql": "SELECT id, family_member_id, category, title, description, severity, \
                    impairment_domains FROM family_member_characteristics WHERE id = ?1",
            "params": [characteristic_id],
        });

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&self.token)
            .json(&body)
            .send()
            .await
            .context("D1 HTTP request failed")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("D1 API error {status}: {text}");
        }

        let data: D1Response = resp.json().await.context("parsing D1 response")?;

        data.result
            .into_iter()
            .next()
            .and_then(|r| r.results.into_iter().next())
            .with_context(|| format!("characteristic {characteristic_id} not found"))
    }
}

/// Parse `/family/{family_member_id}/characteristics/{characteristic_id}`.
pub fn parse_path(path: &str) -> Result<(i32, i32)> {
    let parts: Vec<&str> = path.trim_matches('/').split('/').collect();
    match parts.as_slice() {
        ["family", fid, "characteristics", cid] => {
            let family_id: i32 = fid
                .parse()
                .with_context(|| format!("invalid family_member_id: {fid}"))?;
            let char_id: i32 = cid
                .parse()
                .with_context(|| format!("invalid characteristic_id: {cid}"))?;
            Ok((family_id, char_id))
        }
        _ => anyhow::bail!(
            "expected /family/{{id}}/characteristics/{{id}}, got: {path}"
        ),
    }
}
