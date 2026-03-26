use anyhow::{Context, Result};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{broadcast, Semaphore};
use tracing::{info, warn};

use deepseek::{DeepSeekClient, ReqwestClient, ChatContent};
use crate::cache::Cache;
use crate::config::{MODEL, TEMPERATURE};
use crate::metrics::Metrics;

#[derive(Clone)]
pub struct DeepSeek {
    client: DeepSeekClient<ReqwestClient>,
    semaphore: Arc<Semaphore>,
    in_flight: Arc<DashMap<String, broadcast::Sender<Decision>>>,
    pub cache: Cache,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Decision {
    pub ok: bool,
    #[serde(default)]
    pub reason: Option<String>,
    #[serde(default)]
    pub reasoning: Option<String>,
}

impl DeepSeek {
    pub fn new(api_key: String, config: &crate::config::DeepSeekConfig, cache: Cache) -> Self {
        use std::time::Duration;

        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(config.timeout_secs))
            .pool_max_idle_per_host(config.max_concurrent)
            .pool_idle_timeout(Duration::from_secs(90))
            .tcp_keepalive(Duration::from_secs(30))
            .build()
            .expect("failed to build HTTP client");

        let client = DeepSeekClient::new(
            ReqwestClient::with_client(http_client),
            api_key,
        ).with_base_url(crate::config::BASE_URL);

        let semaphore = Arc::new(Semaphore::new(config.max_concurrent));

        Self {
            client,
            semaphore,
            in_flight: Arc::new(DashMap::with_shard_amount(32)),
            cache,
        }
    }

    pub async fn evaluate(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        cache_key: Option<&str>,
        metrics: &Metrics,
        input_chars: usize,
    ) -> Result<Decision> {
        // Layer 1: Cache
        if let Some(key) = cache_key {
            if let Some(cached) = self.cache.get(key) {
                info!("  ↳ cache HIT ({} entries)", self.cache.len());
                metrics.record_cache_hit(input_chars);
                return serde_json::from_str(&cached)
                    .context("deserializing cached decision");
            }
        }

        let dedup_key = cache_key.map(|k| k.to_string());

        // Layer 2: In-flight deduplication
        if let Some(ref key) = dedup_key {
            use dashmap::mapref::entry::Entry;
            match self.in_flight.entry(key.clone()) {
                Entry::Occupied(entry) => {
                    let mut rx = entry.get().subscribe();
                    drop(entry);
                    info!("  ↳ dedup HIT (waiting on in-flight call)");
                    metrics.record_dedup_hit();
                    let decision = rx.recv().await.context("in-flight sender dropped")?;
                    return Ok(decision);
                }
                Entry::Vacant(entry) => {
                    let (tx, _) = broadcast::channel(4);
                    entry.insert(tx);
                }
            }
        }

        // Layer 3: API call
        metrics.record_deepseek_call();
        let start = Instant::now();
        info!("  ↳ calling DeepSeek Reasoner ({input_chars} chars)...");
        let result = self.call_api(system_prompt, user_prompt).await;
        let elapsed = start.elapsed();
        metrics.record_deepseek_latency(elapsed);

        match &result {
            Ok(d) => {
                let verdict = if d.ok { "ok=true" } else { "ok=false" };
                let reason = d.reason.as_deref().unwrap_or("-");
                info!("  ↳ DeepSeek responded in {:.1}s: {verdict} | {reason}", elapsed.as_secs_f64());
            }
            Err(e) => {
                info!("  ↳ DeepSeek FAILED in {:.1}s: {e}", elapsed.as_secs_f64());
            }
        }

        if let Some(ref key) = dedup_key {
            if let Some((_, tx)) = self.in_flight.remove(key) {
                if let Ok(ref decision) = result {
                    let _ = tx.send(decision.clone());
                }
            }
            if let Ok(ref decision) = result {
                if let Ok(json) = serde_json::to_string(decision) {
                    self.cache.set(key.clone(), json);
                }
                if decision.ok {
                    metrics.record_deepseek_allow();
                } else {
                    metrics.record_deepseek_deny();
                }
            }
        }

        if result.is_err() {
            metrics.record_deepseek_error();
        }

        result
    }

    async fn call_api(
        &self,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<Decision> {
        let _permit = self.semaphore.acquire().await.context("semaphore closed")?;

        let request = deepseek::ChatRequest {
            model: MODEL.to_string(),
            messages: vec![
                deepseek::system_msg(system_prompt),
                deepseek::user_msg(user_prompt),
            ],
            tools: None,
            tool_choice: None,
            temperature: Some(TEMPERATURE as f64),
            max_tokens: Some(1024),
            stream: None,
        };

        let resp = self.client.chat(&request).await
            .map_err(|e| anyhow::anyhow!("{e}"))?;

        let choice = resp.choices.into_iter().next()
            .context("empty response from DeepSeek")?;

        let content = match &choice.message.content {
            ChatContent::Text(s) => s.trim().to_string(),
            ChatContent::Null => String::new(),
        };

        let mut decision: Decision = parse_decision(&content).unwrap_or_else(|e| {
            warn!("failed to parse decision JSON, defaulting to ok=true: {e}");
            Decision {
                ok: true,
                reason: None,
                reasoning: None,
            }
        });

        if let Some(reasoning) = choice.message.reasoning_content {
            decision.reasoning = Some(reasoning);
        }

        Ok(decision)
    }

    #[allow(dead_code)]
    pub fn evaluate_background(
        &self,
        system_prompt: String,
        user_prompt: String,
        cache_key: Option<String>,
        metrics: Metrics,
        input_chars: usize,
    ) {
        let this = self.clone();
        tokio::spawn(async move {
            match this
                .evaluate(
                    &system_prompt,
                    &user_prompt,
                    cache_key.as_deref(),
                    &metrics,
                    input_chars,
                )
                .await
            {
                Ok(d) => info!("background eval: ok={} reason={:?}", d.ok, d.reason),
                Err(e) => warn!("background eval failed: {e}"),
            }
        });
    }
}

fn parse_decision(content: &str) -> Result<Decision> {
    if let Ok(d) = serde_json::from_str::<Decision>(content) {
        return Ok(d);
    }
    let stripped = content
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(stripped).context("not valid decision JSON")
}
