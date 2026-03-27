//! Append-only, thread-safe audit log for compliance events.
//!
//! Records who accessed or modified data, when, and why — satisfying the
//! auditability requirements of GDPR Article 30 (records of processing) and
//! Article 5(2) (accountability principle).

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/// High-level categories of compliance-relevant events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuditEventType {
    /// A contact or company record was read.
    DataAccess,
    /// Data was exported to an external system or file.
    DataExport,
    /// A contact record was permanently deleted.
    DataDeletion,
    /// PII was detected in ingested content.
    PiiDetected,
    /// A crawl job was started for a domain.
    CrawlStarted,
    /// A crawl job completed successfully.
    CrawlCompleted,
    /// A data-subject consent record was stored.
    ConsentRecorded,
    /// Two contact records were merged by the entity-resolution stage.
    EntityResolutionMerge,
}

// ---------------------------------------------------------------------------
// Event record
// ---------------------------------------------------------------------------

/// A single immutable compliance event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    /// ISO 8601 UTC timestamp at the moment the event was recorded.
    pub timestamp: String,
    /// Classification of the event.
    pub event_type: AuditEventType,
    /// Identity of the actor (system component name or user id).
    pub actor: String,
    /// The resource that was acted upon (domain, contact id, file path, …).
    pub resource: String,
    /// Free-form context — keep concise and avoid embedding raw PII here.
    pub details: String,
}

// ---------------------------------------------------------------------------
// Log
// ---------------------------------------------------------------------------

/// Thread-safe, append-only audit log.
///
/// All methods that read events return cloned snapshots so the internal lock
/// is held for the minimum possible duration.
pub struct AuditLog {
    events: Mutex<Vec<AuditEvent>>,
}

impl AuditLog {
    /// Create an empty audit log.
    pub fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
        }
    }

    /// Append a new event.  Timestamps are set at call time in UTC.
    pub fn log(
        &self,
        event_type: AuditEventType,
        actor: &str,
        resource: &str,
        details: &str,
    ) {
        let event = AuditEvent {
            timestamp: Utc::now().to_rfc3339(),
            event_type,
            actor: actor.to_string(),
            resource: resource.to_string(),
            details: details.to_string(),
        };
        self.events
            .lock()
            .expect("audit log mutex poisoned")
            .push(event);
    }

    /// Return a snapshot of all recorded events in insertion order.
    pub fn events(&self) -> Vec<AuditEvent> {
        self.events
            .lock()
            .expect("audit log mutex poisoned")
            .clone()
    }

    /// Return events whose `timestamp` is lexicographically >= `since`.
    ///
    /// Because timestamps are RFC 3339 strings, lexicographic order is
    /// identical to chronological order for timestamps in the same timezone
    /// (UTC here), so no parsing is required.
    pub fn events_since(&self, since: &str) -> Vec<AuditEvent> {
        self.events
            .lock()
            .expect("audit log mutex poisoned")
            .iter()
            .filter(|e| e.timestamp.as_str() >= since)
            .cloned()
            .collect()
    }

    /// Return events of a specific type.
    pub fn events_of_type(&self, kind: &AuditEventType) -> Vec<AuditEvent> {
        self.events
            .lock()
            .expect("audit log mutex poisoned")
            .iter()
            .filter(|e| &e.event_type == kind)
            .cloned()
            .collect()
    }

    /// Total number of events recorded so far.
    pub fn count(&self) -> usize {
        self.events
            .lock()
            .expect("audit log mutex poisoned")
            .len()
    }
}

impl Default for AuditLog {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    // --- basic log and retrieve ---

    #[test]
    fn log_and_count() {
        let log = AuditLog::new();
        assert_eq!(log.count(), 0);

        log.log(AuditEventType::DataAccess, "pipeline", "contact/42", "read for scoring");
        log.log(AuditEventType::CrawlStarted, "crawler", "acme.com", "batch run");

        assert_eq!(log.count(), 2);
    }

    #[test]
    fn events_returns_all_in_order() {
        let log = AuditLog::new();
        log.log(AuditEventType::DataAccess, "a", "r1", "d1");
        log.log(AuditEventType::DataExport, "b", "r2", "d2");

        let all = log.events();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].actor, "a");
        assert_eq!(all[1].actor, "b");
    }

    // --- event fields ---

    #[test]
    fn event_fields_are_stored_correctly() {
        let log = AuditLog::new();
        log.log(
            AuditEventType::DataDeletion,
            "admin",
            "contact/99",
            "GDPR erasure request",
        );

        let events = log.events();
        let e = &events[0];
        assert_eq!(e.event_type, AuditEventType::DataDeletion);
        assert_eq!(e.actor, "admin");
        assert_eq!(e.resource, "contact/99");
        assert_eq!(e.details, "GDPR erasure request");
        // Timestamp must be a non-empty RFC 3339 string.
        assert!(!e.timestamp.is_empty());
        assert!(e.timestamp.contains('T'), "timestamp should be ISO 8601: {}", e.timestamp);
    }

    // --- filter by type ---

    #[test]
    fn events_of_type_filters_correctly() {
        let log = AuditLog::new();
        log.log(AuditEventType::DataAccess, "a", "r", "");
        log.log(AuditEventType::CrawlStarted, "b", "r", "");
        log.log(AuditEventType::DataAccess, "c", "r", "");

        let access_events = log.events_of_type(&AuditEventType::DataAccess);
        assert_eq!(access_events.len(), 2);
        for e in &access_events {
            assert_eq!(e.event_type, AuditEventType::DataAccess);
        }

        let crawl_events = log.events_of_type(&AuditEventType::CrawlStarted);
        assert_eq!(crawl_events.len(), 1);
    }

    // --- events_since ---

    #[test]
    fn events_since_filters_by_timestamp_prefix() {
        let log = AuditLog::new();
        // Log an event and capture its timestamp.
        log.log(AuditEventType::PiiDetected, "scanner", "contact/1", "email found");
        let ts_after_first = Utc::now().to_rfc3339();

        // A tiny sleep isn't reliable in tests; instead we just check that
        // events_since with a future timestamp returns nothing.
        let future_ts = "9999-12-31T23:59:59Z";
        let none = log.events_since(future_ts);
        assert!(none.is_empty());

        // events_since a timestamp before any event should return all events.
        let past_ts = "2000-01-01T00:00:00Z";
        let all = log.events_since(past_ts);
        assert_eq!(all.len(), 1);

        // The boundary timestamp itself should be included (>=).
        let event_ts = log.events()[0].timestamp.clone();
        let at_boundary = log.events_since(&event_ts);
        assert_eq!(at_boundary.len(), 1);

        let _ = ts_after_first; // suppress unused warning
    }

    // --- thread safety ---

    #[test]
    fn concurrent_logging_is_safe() {
        let log = Arc::new(AuditLog::new());
        let mut handles = Vec::new();

        for i in 0..16 {
            let log_ref = Arc::clone(&log);
            let handle = std::thread::spawn(move || {
                log_ref.log(
                    AuditEventType::DataAccess,
                    &format!("thread-{}", i),
                    "resource",
                    "concurrent test",
                );
            });
            handles.push(handle);
        }

        for h in handles {
            h.join().expect("thread panicked");
        }

        assert_eq!(log.count(), 16);
    }

    // --- serialisation round-trip ---

    #[test]
    fn event_serialises_to_json() {
        let log = AuditLog::new();
        log.log(AuditEventType::ConsentRecorded, "web", "user/7", "opt-in");
        let event = &log.events()[0];

        let json = serde_json::to_string(event).expect("serialise");
        assert!(json.contains("consent_recorded"));
        assert!(json.contains("web"));

        let deserialized: AuditEvent = serde_json::from_str(&json).expect("deserialise");
        assert_eq!(deserialized.actor, "web");
        assert_eq!(deserialized.event_type, AuditEventType::ConsentRecorded);
    }
}
