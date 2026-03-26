use std::time::Duration;

use tokio::time::sleep;
use tracing::warn;

/// Configuration for retry with exponential backoff and jitter.
#[derive(Clone, Debug)]
pub struct RetryConfig {
    /// Maximum number of retries (not counting the initial attempt).
    pub max_retries: u32,
    /// Base delay for exponential backoff (delay = base * 2^attempt).
    pub base_delay: Duration,
    /// Maximum delay cap.
    pub max_delay: Duration,
    /// Whether to add random jitter (up to 50% of computed delay).
    pub jitter: bool,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            base_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(30),
            jitter: true,
        }
    }
}

/// Classifies an HTTP status code for retry decisions.
pub enum RetryAction {
    /// Request succeeded; do not retry.
    Success,
    /// Rate limited (429); retry with backoff.
    RateLimited,
    /// Server error (5xx); retry with backoff.
    ServerError,
    /// Client error (4xx, not 429); do not retry.
    ClientError,
}

impl RetryAction {
    pub fn from_status(status: u16) -> Self {
        match status {
            200..=399 => Self::Success,
            429 => Self::RateLimited,
            500..=599 => Self::ServerError,
            _ => Self::ClientError,
        }
    }

    pub fn should_retry(&self) -> bool {
        matches!(self, Self::RateLimited | Self::ServerError)
    }
}

/// Whether an error from reqwest (before we get a status code) is retryable.
/// Connection timeouts and connection errors are retryable; other errors are not.
pub fn is_reqwest_error_retryable(err: &reqwest::Error) -> bool {
    err.is_timeout() || err.is_connect()
}

/// Compute the backoff delay for a given attempt.
pub fn backoff_delay(config: &RetryConfig, attempt: u32) -> Duration {
    let delay = config
        .base_delay
        .saturating_mul(2u32.pow(attempt))
        .min(config.max_delay);

    if config.jitter {
        // Add jitter: 50-100% of computed delay (deterministic-ish using attempt as seed).
        // We avoid pulling in a full RNG crate by using a simple hash of the current time.
        let jitter_factor = jitter_fraction();
        let jitter_range = delay.as_millis() as f64 * 0.5;
        let jitter_ms = (jitter_range * jitter_factor) as u64;
        delay.saturating_sub(Duration::from_millis(jitter_ms))
    } else {
        delay
    }
}

/// Returns a pseudo-random fraction in [0.0, 1.0) using current time nanoseconds.
fn jitter_fraction() -> f64 {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    (nanos % 1000) as f64 / 1000.0
}

/// Execute an HTTP GET request with retry logic. Returns the raw `reqwest::Response` on success.
///
/// Retries on:
/// - Connection timeouts / connection errors from reqwest
/// - HTTP 429 (rate limited)
/// - HTTP 5xx (server errors)
///
/// Does NOT retry on:
/// - HTTP 4xx (client errors, except 429)
pub async fn retry_get(
    client: &reqwest::Client,
    url: &str,
    params: &[(String, String)],
    config: &RetryConfig,
    api_name: &str,
) -> Result<reqwest::Response, RetryError> {
    let mut last_err = None;

    for attempt in 0..=config.max_retries {
        if attempt > 0 {
            let delay = backoff_delay(config, attempt - 1);
            warn!(
                api = api_name,
                attempt,
                delay_ms = delay.as_millis() as u64,
                "retrying after backoff"
            );
            sleep(delay).await;
        }

        let result = client.get(url).query(params).send().await;

        match result {
            Ok(resp) => {
                let status = resp.status().as_u16();
                let action = RetryAction::from_status(status);

                if !action.should_retry() {
                    return Ok(resp);
                }

                // Retryable status — log and continue.
                let kind = match action {
                    RetryAction::RateLimited => "rate limited (429)",
                    RetryAction::ServerError => "server error",
                    _ => unreachable!(),
                };
                warn!(
                    api = api_name,
                    status,
                    attempt,
                    max = config.max_retries,
                    "{kind}, will retry"
                );
                last_err = Some(RetryError::Http {
                    status,
                    message: resp.text().await.unwrap_or_default(),
                });
            }
            Err(err) => {
                if is_reqwest_error_retryable(&err) && attempt < config.max_retries {
                    warn!(
                        api = api_name,
                        attempt,
                        error = %err,
                        "connection error, will retry"
                    );
                    last_err = Some(RetryError::Connection(err));
                    continue;
                }
                return Err(RetryError::Connection(err));
            }
        }
    }

    Err(last_err.unwrap_or(RetryError::Exhausted))
}

/// Error type returned by [`retry_get`].
#[derive(Debug)]
pub enum RetryError {
    /// A connection-level error (timeout, DNS, TLS, etc.).
    Connection(reqwest::Error),
    /// An HTTP error with status and body after retries exhausted.
    Http { status: u16, message: String },
    /// Retries exhausted with no other error captured (shouldn't happen in practice).
    Exhausted,
}

impl std::fmt::Display for RetryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Connection(e) => write!(f, "connection error: {e}"),
            Self::Http { status, message } => write!(f, "HTTP {status}: {message}"),
            Self::Exhausted => write!(f, "retries exhausted"),
        }
    }
}

impl std::error::Error for RetryError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Connection(e) => Some(e),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_action_classification() {
        assert!(!RetryAction::from_status(200).should_retry());
        assert!(!RetryAction::from_status(301).should_retry());
        assert!(!RetryAction::from_status(400).should_retry());
        assert!(!RetryAction::from_status(404).should_retry());
        assert!(RetryAction::from_status(429).should_retry());
        assert!(RetryAction::from_status(500).should_retry());
        assert!(RetryAction::from_status(502).should_retry());
        assert!(RetryAction::from_status(503).should_retry());
    }

    #[test]
    fn backoff_delay_increases_exponentially() {
        let config = RetryConfig {
            jitter: false,
            ..Default::default()
        };
        let d0 = backoff_delay(&config, 0);
        let d1 = backoff_delay(&config, 1);
        let d2 = backoff_delay(&config, 2);
        assert_eq!(d0, Duration::from_secs(1));
        assert_eq!(d1, Duration::from_secs(2));
        assert_eq!(d2, Duration::from_secs(4));
    }

    #[test]
    fn backoff_delay_respects_max() {
        let config = RetryConfig {
            max_delay: Duration::from_secs(3),
            jitter: false,
            ..Default::default()
        };
        let d5 = backoff_delay(&config, 5);
        assert_eq!(d5, Duration::from_secs(3));
    }

    #[test]
    fn backoff_delay_with_jitter_is_smaller() {
        let config = RetryConfig {
            jitter: true,
            ..Default::default()
        };
        // With jitter, delay should be <= the non-jitter delay
        let d2 = backoff_delay(&config, 2);
        assert!(d2 <= Duration::from_secs(4));
        assert!(d2 >= Duration::from_secs(2)); // at least 50% of 4s
    }
}
