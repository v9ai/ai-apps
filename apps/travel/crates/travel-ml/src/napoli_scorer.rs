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

/// Per-place family cost breakdown for a party of 2 adults + 1 school-age child.
#[derive(Debug, Serialize)]
pub struct FamilyCostBreakdown {
    /// Display name of the place.
    pub place_name: String,
    /// Combined admission cost for all adults in the party (EUR).
    pub adults_eur: f32,
    /// Combined admission cost for all children in the party (EUR).
    pub kids_eur: f32,
    /// Total cost for the full family at this place (EUR).
    pub total_eur: f32,
    /// `true` when this place is not recommended / safe for young children.
    pub skip_with_child: bool,
}

/// Aggregated budget summary for the entire trip.
#[derive(Debug, Serialize)]
pub struct FamilyBudgetSummary {
    /// Detailed cost breakdown for each place.
    pub breakdowns: Vec<FamilyCostBreakdown>,
    /// Sum of `total_eur` for all places where `skip_with_child` is `false`.
    pub grand_total_eur: f32,
    /// Number of places that are child-friendly (i.e. `!skip_with_child`).
    pub kid_friendly_count: u8,
    /// Number of places recommended to skip when travelling with a child.
    pub skip_count: u8,
    /// Human-readable note describing the ML scoring method and cost assumptions.
    pub ml_note: String,
}

/// Complete Napoli family travel report.
///
/// Contains per-place kid-friendliness scores produced by the Candle
/// embedding engine, an optimised day itinerary, family composition
/// metadata, and a detailed cost breakdown.
#[derive(Debug, Serialize)]
pub struct NapoliReport {
    /// Per-place semantic family scores (one entry per Napoli place).
    pub place_scores: Vec<crate::family_score::PlaceFamilyScore>,
    /// Optimised day plan for the family.
    pub day_plan: crate::itinerary::FamilyDayPlan,
    /// Number of adults in the travelling party.
    pub family_adults: u8,
    /// Number of children in the travelling party.
    pub family_kids: u8,
    /// Report generation date as an ISO 8601 date string.
    pub generated_at: String,
    /// Itemised family budget summary for the full trip.
    pub budget: FamilyBudgetSummary,
    /// Identifier string for the embedding model and scoring pipeline used.
    pub ml_version: String,
}

// ── Public functions ──────────────────────────────────────────────────────

/// Build a hard-coded [`FamilyBudgetSummary`] for 2 adults + 1 child (ages 6–10).
///
/// Costs are based on published 2025/26 admission prices rounded to the nearest
/// €0.50.  Places that are physically unsafe or developmentally inappropriate
/// for children are flagged with `skip_with_child = true` and excluded from
/// `grand_total_eur`.
pub fn build_family_budget() -> FamilyBudgetSummary {
    let raw: &[(&str, f32, f32, f32, bool)] = &[
        ("Piazza del Plebiscito",          0.0,  0.0,  0.0,  false),
        ("Museo Archeologico Nazionale",   30.0,  8.0, 38.0,  false),
        ("Spaccanapoli",                    0.0,  0.0,  0.0,  false),
        ("Castel dell'Ovo",                 0.0,  0.0,  0.0,  false),
        ("Napoli Sotterranea",             20.0,  0.0, 20.0,  true),
        ("Certosa di San Martino",         12.0,  3.0, 15.0,  false),
        ("Via San Gregorio Armeno",         0.0,  0.0,  0.0,  false),
        ("L'Antica Pizzeria da Michele",   14.0,  5.0, 19.0,  false),
        ("Lungomare Caracciolo",            0.0,  0.0,  0.0,  false),
        ("Quartieri Spagnoli",             16.0,  5.0, 21.0,  false),
    ];

    let breakdowns: Vec<FamilyCostBreakdown> = raw
        .iter()
        .map(|&(name, adults_eur, kids_eur, total_eur, skip_with_child)| {
            FamilyCostBreakdown {
                place_name: name.to_string(),
                adults_eur,
                kids_eur,
                total_eur,
                skip_with_child,
            }
        })
        .collect();

    let grand_total_eur: f32 = breakdowns
        .iter()
        .filter(|b| !b.skip_with_child)
        .map(|b| b.total_eur)
        .sum();

    let kid_friendly_count = breakdowns.iter().filter(|b| !b.skip_with_child).count() as u8;
    let skip_count = breakdowns.iter().filter(|b| b.skip_with_child).count() as u8;

    FamilyBudgetSummary {
        breakdowns,
        grand_total_eur,
        kid_friendly_count,
        skip_count,
        ml_note: "Family cost computed for 2 adults + 1 child (ages 6\u{2013}10). \
                  Scores: all-MiniLM-L6-v2 cosine similarity to 5 family anchors."
            .to_string(),
    }
}

/// Generate a full Napoli family report using Candle embeddings.
///
/// # Steps
/// 1. Initialise [`EmbeddingEngine`] on `device`.
/// 2. Score the canonical set of Naples places via
///    [`crate::family_score::score_napoli_places`].
/// 3. Build an optimised day plan via
///    [`crate::itinerary::napoli_family_plan`].
/// 4. Compute a family cost breakdown via [`build_family_budget`].
/// 5. Bundle everything into a [`NapoliReport`] for 2 adults + 1 kid.
///
/// # Errors
/// Propagates any error from model loading or embedding computation.
pub fn generate_napoli_family_report(device: candle_core::Device) -> Result<NapoliReport> {
    let engine = EmbeddingEngine::new(device)?;

    let place_scores = crate::family_score::score_napoli_places(&engine)?;
    let day_plan = crate::itinerary::napoli_family_plan();
    let budget = build_family_budget();

    Ok(NapoliReport {
        place_scores,
        day_plan,
        family_adults: 2,
        family_kids: 1,
        generated_at: "2026-03-28".to_string(),
        budget,
        ml_version: "all-MiniLM-L6-v2 \u{00b7} Candle 0.9 \u{00b7} cosine-sim \u{00b7} 5-anchor"
            .to_string(),
    })
}

/// Pretty-print a [`NapoliReport`] to stdout as formatted JSON.
///
/// Writes a human-readable header line before the JSON payload so the
/// output is easy to identify in a terminal session, followed by a
/// concise budget summary table.
pub fn print_report(report: &NapoliReport) {
    println!("=== Napoli Family Report (2 Adults + 1 Kid) ===");
    match serde_json::to_string_pretty(report) {
        Ok(json) => println!("{json}"),
        Err(e) => eprintln!("Failed to serialise report: {e}"),
    }

    let b = &report.budget;
    println!("\n=== Family Budget Summary ===");
    println!(
        "{:<35} {:>10} {:>10} {:>10} {:>6}",
        "Place", "Adults €", "Kids €", "Total €", "Skip?"
    );
    println!("{}", "-".repeat(76));
    for bd in &b.breakdowns {
        println!(
            "{:<35} {:>10.2} {:>10.2} {:>10.2} {:>6}",
            bd.place_name,
            bd.adults_eur,
            bd.kids_eur,
            bd.total_eur,
            if bd.skip_with_child { "yes" } else { "no" },
        );
    }
    println!("{}", "-".repeat(76));
    println!(
        "Grand total (child-friendly places): €{:.2}",
        b.grand_total_eur
    );
    println!(
        "Kid-friendly: {}  |  Skip: {}",
        b.kid_friendly_count, b.skip_count
    );
    println!("Note: {}", b.ml_note);
    println!("ML pipeline: {}", report.ml_version);
}
