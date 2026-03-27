use std::time::Duration;

use serde::{Deserialize, Serialize};

/// A budget violation describes which resource limit was breached and by how much.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BudgetViolation {
    /// Name of the resource that was exceeded (e.g. `"duration"`, `"llm_calls"`).
    pub resource: String,
    /// Human-readable representation of the configured limit.
    pub limit: String,
    /// Human-readable representation of the actual observed value.
    pub actual: String,
}

impl BudgetViolation {
    fn new(
        resource: impl Into<String>,
        limit: impl Into<String>,
        actual: impl Into<String>,
    ) -> Self {
        Self {
            resource: resource.into(),
            limit: limit.into(),
            actual: actual.into(),
        }
    }
}

impl std::fmt::Display for BudgetViolation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "budget exceeded — {}: limit={}, actual={}",
            self.resource, self.limit, self.actual
        )
    }
}

/// Per-pipeline-run resource budget.
///
/// Each field is an upper bound on the corresponding resource. Call the
/// `check_*` methods after each stage; they return `Some(BudgetViolation)` when
/// a limit has been breached, or `None` when the run is still within budget.
///
/// # Example
/// ```rust,ignore
/// let budget = ResourceBudget::default();
/// if let Some(v) = budget.check_duration(elapsed) {
///     tracing::warn!("{v}");
///     return Err(anyhow::anyhow!("{v}"));
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceBudget {
    /// Maximum resident memory the pipeline may use, in mebibytes.
    pub max_memory_mb: u64,
    /// Maximum wall-clock time for the entire pipeline run.
    pub max_duration: Duration,
    /// Maximum number of LLM API calls across all stages.
    pub max_llm_calls: u32,
    /// Maximum number of outbound HTTP requests across all stages.
    pub max_http_requests: u32,
}

impl Default for ResourceBudget {
    fn default() -> Self {
        Self {
            max_memory_mb: 2048,
            max_duration: Duration::from_secs(600),
            max_llm_calls: 1000,
            max_http_requests: 5000,
        }
    }
}

impl ResourceBudget {
    /// Return a violation if `elapsed` exceeds [`max_duration`].
    pub fn check_duration(&self, elapsed: Duration) -> Option<BudgetViolation> {
        if elapsed > self.max_duration {
            Some(BudgetViolation::new(
                "duration",
                format!("{:.1}s", self.max_duration.as_secs_f64()),
                format!("{:.1}s", elapsed.as_secs_f64()),
            ))
        } else {
            None
        }
    }

    /// Return a violation if `count` LLM calls exceeds [`max_llm_calls`].
    pub fn check_llm_calls(&self, count: u32) -> Option<BudgetViolation> {
        if count > self.max_llm_calls {
            Some(BudgetViolation::new(
                "llm_calls",
                self.max_llm_calls.to_string(),
                count.to_string(),
            ))
        } else {
            None
        }
    }

    /// Return a violation if `count` HTTP requests exceeds [`max_http_requests`].
    pub fn check_http_requests(&self, count: u32) -> Option<BudgetViolation> {
        if count > self.max_http_requests {
            Some(BudgetViolation::new(
                "http_requests",
                self.max_http_requests.to_string(),
                count.to_string(),
            ))
        } else {
            None
        }
    }

    /// Check all observable counters at once.
    ///
    /// Returns the **first** violation found (duration → llm_calls → http), or
    /// `None` if every resource is within budget.
    pub fn check_all(
        &self,
        elapsed: Duration,
        llm_calls: u32,
        http_requests: u32,
    ) -> Option<BudgetViolation> {
        self.check_duration(elapsed)
            .or_else(|| self.check_llm_calls(llm_calls))
            .or_else(|| self.check_http_requests(http_requests))
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    fn budget() -> ResourceBudget {
        ResourceBudget {
            max_memory_mb: 512,
            max_duration: Duration::from_secs(60),
            max_llm_calls: 100,
            max_http_requests: 200,
        }
    }

    // --- check_duration ---

    #[test]
    fn duration_within_limit_returns_none() {
        assert!(budget().check_duration(Duration::from_secs(59)).is_none());
    }

    #[test]
    fn duration_exactly_at_limit_returns_none() {
        assert!(budget().check_duration(Duration::from_secs(60)).is_none());
    }

    #[test]
    fn duration_exceeded_returns_violation() {
        let v = budget()
            .check_duration(Duration::from_secs(61))
            .expect("should be a violation");
        assert_eq!(v.resource, "duration");
        assert!(v.actual.contains("61"));
    }

    #[test]
    fn duration_violation_display_contains_resource_name() {
        let v = budget()
            .check_duration(Duration::from_secs(120))
            .unwrap();
        let s = v.to_string();
        assert!(s.contains("duration"), "display: {s}");
        assert!(s.contains("limit="), "display: {s}");
        assert!(s.contains("actual="), "display: {s}");
    }

    // --- check_llm_calls ---

    #[test]
    fn llm_calls_within_limit_returns_none() {
        assert!(budget().check_llm_calls(99).is_none());
    }

    #[test]
    fn llm_calls_exactly_at_limit_returns_none() {
        assert!(budget().check_llm_calls(100).is_none());
    }

    #[test]
    fn llm_calls_exceeded_returns_violation() {
        let v = budget()
            .check_llm_calls(101)
            .expect("should be a violation");
        assert_eq!(v.resource, "llm_calls");
        assert_eq!(v.limit, "100");
        assert_eq!(v.actual, "101");
    }

    // --- check_http_requests ---

    #[test]
    fn http_requests_within_limit_returns_none() {
        assert!(budget().check_http_requests(199).is_none());
    }

    #[test]
    fn http_requests_exactly_at_limit_returns_none() {
        assert!(budget().check_http_requests(200).is_none());
    }

    #[test]
    fn http_requests_exceeded_returns_violation() {
        let v = budget()
            .check_http_requests(201)
            .expect("should be a violation");
        assert_eq!(v.resource, "http_requests");
        assert_eq!(v.limit, "200");
        assert_eq!(v.actual, "201");
    }

    // --- check_all ---

    #[test]
    fn check_all_no_violations() {
        assert!(budget()
            .check_all(Duration::from_secs(30), 50, 100)
            .is_none());
    }

    #[test]
    fn check_all_first_violation_is_duration() {
        // Duration breached, llm_calls and http also fine — should still report duration first.
        let v = budget()
            .check_all(Duration::from_secs(61), 50, 100)
            .unwrap();
        assert_eq!(v.resource, "duration");
    }

    #[test]
    fn check_all_reports_llm_when_duration_ok() {
        let v = budget()
            .check_all(Duration::from_secs(30), 200, 100)
            .unwrap();
        assert_eq!(v.resource, "llm_calls");
    }

    #[test]
    fn check_all_reports_http_when_others_ok() {
        let v = budget()
            .check_all(Duration::from_secs(30), 50, 500)
            .unwrap();
        assert_eq!(v.resource, "http_requests");
    }

    // --- Default values ---

    #[test]
    fn default_budget_has_sensible_values() {
        let b = ResourceBudget::default();
        assert_eq!(b.max_memory_mb, 2048);
        assert_eq!(b.max_duration, Duration::from_secs(600));
        assert_eq!(b.max_llm_calls, 1000);
        assert_eq!(b.max_http_requests, 5000);
    }
}
