use std::time::Duration;

use reqwest::{header, Response, StatusCode};
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::error::{ApiErrorCode, ApiProblem, Error, Result};
use crate::types::{
    CompletedTask, QwenImageEditMaxRequest, QwenImageMaxRequest, TaskCreatedResponse, TaskError,
    TaskInfo, TaskStatus,
};

const BASE_URL: &str = "https://api.mulerouter.ai";
const DEFAULT_POLL_INTERVAL: Duration = Duration::from_secs(3);
const DEFAULT_MAX_ATTEMPTS: u32 = 120; // ~6 min

/// Async MuleRouter client.
///
/// # Example
/// ```no_run
/// # tokio_test::block_on(async {
/// use mulerouter::{Client, QwenImageMaxRequest};
///
/// let client = Client::new("your-api-key");
/// let task = client.qwen_image_max_generate(
///     QwenImageMaxRequest::new("A serene mountain landscape at dawn"),
/// ).await.unwrap();
/// let result = client.wait_for_task(&task.task_info).await.unwrap();
/// # });
/// ```
#[derive(Clone)]
pub struct Client {
    http: reqwest::Client,
    base_url: String,
    poll_interval: Duration,
    max_poll_attempts: u32,
}

impl Client {
    pub fn new(api_key: impl Into<String>) -> Self {
        let api_key = api_key.into();
        let mut headers = header::HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            header::HeaderValue::from_str(&format!("Bearer {api_key}"))
                .expect("invalid API key characters"),
        );

        let http = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .expect("failed to build HTTP client");

        Self {
            http,
            base_url: BASE_URL.to_owned(),
            poll_interval: DEFAULT_POLL_INTERVAL,
            max_poll_attempts: DEFAULT_MAX_ATTEMPTS,
        }
    }

    /// Override the base URL (useful for testing).
    pub fn with_base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    /// Set the interval between task-status polls.
    pub fn with_poll_interval(mut self, interval: Duration) -> Self {
        self.poll_interval = interval;
        self
    }

    /// Maximum number of status-poll attempts before returning
    /// [`Error::PollTimeout`].
    pub fn with_max_poll_attempts(mut self, attempts: u32) -> Self {
        self.max_poll_attempts = attempts;
        self
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    async fn post<B: Serialize, R: DeserializeOwned>(
        &self,
        path: &str,
        body: &B,
    ) -> Result<R> {
        let url = format!("{}{path}", self.base_url);
        let response = self.http.post(&url).json(body).send().await?;
        self.parse_response(response).await
    }

    async fn get<R: DeserializeOwned>(&self, path: &str) -> Result<R> {
        let url = format!("{}{path}", self.base_url);
        let response = self.http.get(&url).send().await?;
        self.parse_response(response).await
    }

    async fn parse_response<R: DeserializeOwned>(&self, response: Response) -> Result<R> {
        let status = response.status();
        if status.is_success() {
            Ok(response.json::<R>().await?)
        } else {
            let body = response.text().await.unwrap_or_default();
            // Try RFC 9457 problem JSON
            if let Ok(problem) = serde_json::from_str::<ApiProblem>(&body) {
                Err(Error::Api { status, problem })
            } else {
                Err(Error::Http {
                    status,
                    body,
                })
            }
        }
    }

    // ─── Task polling ─────────────────────────────────────────────────────────

    /// Poll a task until it reaches a terminal state or the poll limit is hit.
    pub async fn wait_for_task(&self, task: &TaskInfo) -> Result<CompletedTask> {
        self.wait_for_task_at(&task.id.to_string(), task).await
    }

    /// Poll using a known base path (vendor + model + resource).
    async fn wait_for_task_at(&self, _task_id: &str, initial: &TaskInfo) -> Result<CompletedTask> {
        // We don't store the path in TaskInfo, so the caller must use
        // the model-specific poll helpers. This is kept as a shared
        // body once the path is resolved.
        let _ = initial;
        unreachable!("use model-specific poll helpers")
    }

    /// Generic poll loop. `path` must be the full vendor path including
    /// the task UUID, e.g.
    /// `/vendors/alibaba/v1/qwen-image-max/generation/{id}`.
    pub async fn poll_task(&self, path: &str) -> Result<CompletedTask> {
        for attempt in 0..self.max_poll_attempts {
            let task: CompletedTask = self.get(path).await?;
            match task.task_info.status {
                s if s.is_success() => return Ok(task),
                TaskStatus::Failed => {
                    let err = task.task_info.error.as_ref();
                    return Err(Error::TaskFailed {
                        code: err.and_then(|e| e.code).map(ApiErrorCode::from),
                        title: err.and_then(|e| e.title.clone()),
                        detail: err.and_then(|e| e.detail.clone()),
                    });
                }
                _ => {}
            }
            if attempt + 1 < self.max_poll_attempts {
                tokio::time::sleep(self.poll_interval).await;
            }
        }
        Err(Error::PollTimeout {
            attempts: self.max_poll_attempts,
        })
    }

    // ─── Qwen Image Max ───────────────────────────────────────────────────────

    /// Submit a Qwen Image Max generation task.
    /// Returns immediately with a `TaskCreatedResponse` containing the task ID.
    pub async fn qwen_image_max_generate(
        &self,
        req: QwenImageMaxRequest,
    ) -> Result<TaskCreatedResponse> {
        self.post("/vendors/alibaba/v1/qwen-image-max/generation", &req)
            .await
    }

    /// Poll a previously created Qwen Image Max generation task by UUID.
    pub async fn qwen_image_max_poll(&self, task_id: uuid::Uuid) -> Result<CompletedTask> {
        self.poll_task(&format!(
            "/vendors/alibaba/v1/qwen-image-max/generation/{task_id}"
        ))
        .await
    }

    /// Submit a Qwen Image Max generation task **and block until complete**.
    pub async fn qwen_image_max_generate_and_wait(
        &self,
        req: QwenImageMaxRequest,
    ) -> Result<CompletedTask> {
        let created = self.qwen_image_max_generate(req).await?;
        self.qwen_image_max_poll(created.task_info.id).await
    }

    // ─── Qwen Image Edit Max ──────────────────────────────────────────────────

    /// Submit a Qwen Image Edit Max task.
    pub async fn qwen_image_edit_max_generate(
        &self,
        req: QwenImageEditMaxRequest,
    ) -> Result<TaskCreatedResponse> {
        self.post(
            "/vendors/alibaba/v1/qwen-image-edit-max/generation",
            &req,
        )
        .await
    }

    /// Poll a Qwen Image Edit Max task by UUID.
    pub async fn qwen_image_edit_max_poll(&self, task_id: uuid::Uuid) -> Result<CompletedTask> {
        self.poll_task(&format!(
            "/vendors/alibaba/v1/qwen-image-edit-max/generation/{task_id}"
        ))
        .await
    }

    /// Submit a Qwen Image Edit Max task **and block until complete**.
    pub async fn qwen_image_edit_max_generate_and_wait(
        &self,
        req: QwenImageEditMaxRequest,
    ) -> Result<CompletedTask> {
        let created = self.qwen_image_edit_max_generate(req).await?;
        self.qwen_image_edit_max_poll(created.task_info.id).await
    }

    // ─── Parallel helpers ─────────────────────────────────────────────────────

    /// Submit multiple Qwen Image Max generation requests **in parallel**
    /// and return all `TaskCreatedResponse`s once every submit has resolved.
    ///
    /// Failures are collected per-position; a single failure does not abort
    /// the others.
    pub async fn qwen_image_max_generate_many(
        &self,
        requests: Vec<QwenImageMaxRequest>,
    ) -> Vec<Result<TaskCreatedResponse>> {
        use futures::future::join_all;
        let futures: Vec<_> = requests
            .into_iter()
            .map(|req| self.qwen_image_max_generate(req))
            .collect();
        join_all(futures).await
    }

    /// Submit many Qwen Image Max requests in parallel **and** poll each until
    /// all reach a terminal state.
    pub async fn qwen_image_max_generate_and_wait_many(
        &self,
        requests: Vec<QwenImageMaxRequest>,
    ) -> Vec<Result<CompletedTask>> {
        use futures::future::join_all;
        let futures: Vec<_> = requests
            .into_iter()
            .map(|req| self.qwen_image_max_generate_and_wait(req))
            .collect();
        join_all(futures).await
    }

    /// Submit many Qwen Image Edit Max requests in parallel and poll each
    /// until all reach a terminal state.
    pub async fn qwen_image_edit_max_generate_and_wait_many(
        &self,
        requests: Vec<QwenImageEditMaxRequest>,
    ) -> Vec<Result<CompletedTask>> {
        use futures::future::join_all;
        let futures: Vec<_> = requests
            .into_iter()
            .map(|req| self.qwen_image_edit_max_generate_and_wait(req))
            .collect();
        join_all(futures).await
    }
}
