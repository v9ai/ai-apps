mod types;

pub use types::*;

use std::sync::Arc;

use anyhow::{Context, Result};
use tracing::info;

const BASE_URL: &str = "https://boards-api.greenhouse.io/v1/boards";

/// Lightweight, fully parallel Greenhouse job board API client.
#[derive(Clone)]
pub struct GreenhouseClient {
    http: reqwest::Client,
    board_token: String,
    max_concurrency: usize,
}

impl GreenhouseClient {
    pub fn new(board_token: impl Into<String>) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .user_agent("ats/0.1.0")
            .build()
            .expect("failed to build HTTP client");
        Self {
            http,
            board_token: board_token.into(),
            max_concurrency: 20,
        }
    }

    pub fn with_max_concurrency(mut self, n: usize) -> Self {
        self.max_concurrency = n;
        self
    }

    fn url(&self, path: &str) -> String {
        format!("{BASE_URL}/{}{path}", self.board_token)
    }

    /// Fetch all jobs (lightweight — no content, departments, or offices).
    pub async fn fetch_jobs(&self) -> Result<Vec<Job>> {
        let resp: JobsResponse = self
            .http
            .get(self.url("/jobs"))
            .send()
            .await
            .context("GET /jobs")?
            .error_for_status()
            .context("GET /jobs status")?
            .json()
            .await
            .context("parse /jobs")?;
        info!(total = resp.meta.total, "fetched job list");
        Ok(resp.jobs)
    }

    /// Fetch all jobs with full HTML content in a single request.
    pub async fn fetch_jobs_with_content(&self) -> Result<Vec<Job>> {
        let resp: JobsResponse = self
            .http
            .get(self.url("/jobs"))
            .query(&[("content", "true")])
            .send()
            .await
            .context("GET /jobs?content=true")?
            .error_for_status()
            .context("GET /jobs?content=true status")?
            .json()
            .await
            .context("parse /jobs?content=true")?;
        info!(total = resp.meta.total, "fetched jobs with content");
        Ok(resp.jobs)
    }

    /// Fetch a single job by ID (includes content, departments, offices).
    pub async fn fetch_job(&self, id: u64) -> Result<Job> {
        self.http
            .get(self.url(&format!("/jobs/{id}")))
            .send()
            .await
            .with_context(|| format!("GET /jobs/{id}"))?
            .error_for_status()
            .with_context(|| format!("GET /jobs/{id} status"))?
            .json()
            .await
            .with_context(|| format!("parse /jobs/{id}"))
    }

    /// Fetch all departments (with nested jobs).
    pub async fn fetch_departments(&self) -> Result<Vec<Department>> {
        let resp: DepartmentsResponse = self
            .http
            .get(self.url("/departments"))
            .send()
            .await
            .context("GET /departments")?
            .error_for_status()
            .context("GET /departments status")?
            .json()
            .await
            .context("parse /departments")?;
        info!(count = resp.departments.len(), "fetched departments");
        Ok(resp.departments)
    }

    /// Fetch all offices (with nested departments and jobs).
    pub async fn fetch_offices(&self) -> Result<Vec<Office>> {
        let resp: OfficesResponse = self
            .http
            .get(self.url("/offices"))
            .send()
            .await
            .context("GET /offices")?
            .error_for_status()
            .context("GET /offices status")?
            .json()
            .await
            .context("parse /offices")?;
        info!(count = resp.offices.len(), "fetched offices");
        Ok(resp.offices)
    }

    /// Fetch jobs + departments + offices in parallel (3 concurrent requests).
    pub async fn fetch_all(&self) -> Result<BoardSnapshot> {
        let (jobs, departments, offices) = tokio::try_join!(
            self.fetch_jobs_with_content(),
            self.fetch_departments(),
            self.fetch_offices(),
        )?;
        let total = jobs.len() as u64;
        info!(total, departments = departments.len(), offices = offices.len(), "board snapshot");
        Ok(BoardSnapshot { jobs, departments, offices, total })
    }

    /// Fetch lightweight job list, then fan out individual detail requests
    /// with bounded concurrency.
    pub async fn fetch_jobs_detailed(&self) -> Result<Vec<Job>> {
        let jobs = self.fetch_jobs().await?;
        let total = jobs.len();
        info!(total, concurrency = self.max_concurrency, "fetching job details");

        let sem = Arc::new(tokio::sync::Semaphore::new(self.max_concurrency));
        let mut set = tokio::task::JoinSet::new();

        for job in &jobs {
            let client = self.clone();
            let sem = Arc::clone(&sem);
            let id = job.id;
            set.spawn(async move {
                let _permit = sem.acquire().await.expect("semaphore closed");
                client.fetch_job(id).await
            });
        }

        let mut detailed = Vec::with_capacity(total);
        while let Some(res) = set.join_next().await {
            detailed.push(res.context("task panicked")??);
        }
        Ok(detailed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // hits live API
    async fn fetch_all_anthropic() {
        let client = GreenhouseClient::new("anthropic");
        let snapshot = client.fetch_all().await.unwrap();
        assert!(snapshot.total > 0);
        assert!(!snapshot.departments.is_empty());
        assert!(!snapshot.offices.is_empty());

        let first = &snapshot.jobs[0];
        assert!(!first.title.is_empty());
        assert!(first.content.is_some());
    }
}
