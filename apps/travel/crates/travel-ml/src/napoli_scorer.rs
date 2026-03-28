//! Napoli family scorer.
//!
//! Combines Candle-powered semantic family scoring
//! ([`crate::family_score`]) with a greedy day-plan
//! ([`crate::itinerary`]) to produce a single [`NapoliReport`]
//! ready for JSON serialisation.

use crate::embeddings::EmbeddingEngine;
use anyhow::Result;
use serde::Serialize;

// ── Public types ──────────────────────────────────────────────────────────

/// Complete Napoli family travel report.
///
/// Contains per-place kid-friendliness scores produced by the Candle
/// embedding engine, an optimised day itinerary, and family composition
/// metadata.
#[derive(Debug, Serialize)]
pub struct NapoliReport {
    /// Per-place semantic family scores (one entry per Napoli place).
    pub place_scores: Vec<crate::family_score::PlaceFamilyScore>,
    /// Optimised day plan for the family.
    pub day_plan: crate::itinerary::DayPlan,
    /// Number of adults in the travelling party.
    pub family_adults: u8,
    /// Number of children in the travelling party.
    pub family_kids: u8,
    /// Report generation date as an ISO 8601 date string.
    pub generated_at: String,
}

// ── Public functions ──────────────────────────────────────────────────────

/// Generate a full Napoli family report using Candle embeddings.
///
/// # Steps
/// 1. Initialise [`EmbeddingEngine`] on `device`.
/// 2. Score the canonical set of Naples places via
///    [`crate::family_score::score_napoli_places`].
/// 3. Build an optimised day plan via
///    [`crate::itinerary::napoli_family_plan`].
/// 4. Bundle everything into a [`NapoliReport`] for 2 adults + 1 kid.
///
/// # Errors
/// Propagates any error from model loading or embedding computation.
pub fn generate_napoli_family_report(device: candle_core::Device) -> Result<NapoliReport> {
    let engine = EmbeddingEngine::new(device)?;

    let place_scores = crate::family_score::score_napoli_places(&engine)?;
    let day_plan = crate::itinerary::napoli_family_plan();

    Ok(NapoliReport {
        place_scores,
        day_plan,
        family_adults: 2,
        family_kids: 1,
        generated_at: "2026-03-28".to_string(),
    })
}

/// Pretty-print a [`NapoliReport`] to stdout as formatted JSON.
///
/// Writes a human-readable header line before the JSON payload so the
/// output is easy to identify in a terminal session.
pub fn print_report(report: &NapoliReport) {
    println!("=== Napoli Family Report (2 Adults + 1 Kid) ===");
    match serde_json::to_string_pretty(report) {
        Ok(json) => println!("{json}"),
        Err(e) => eprintln!("Failed to serialise report: {e}"),
    }
}
