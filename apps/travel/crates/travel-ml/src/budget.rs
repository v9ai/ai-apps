//! Napoli family budget allocation.
//!
//! Computes optimal budget breakdown for a 7-night Naples family trip
//! (2 adults + 1 child) within a €1 000 total envelope.
//!
//! All values derive deterministically from the named constants in
//! [`crate::constants`] — no ML inference required.  The
//! [`budget_fit_score`] and [`value_weighted_score`] functions are
//! used by the scoring pipeline to de-prioritise high-cost places when
//! the activities budget is nearly exhausted.

use crate::constants::{
    ACTIVITIES_BUDGET_EUR, BUFFER_EUR, DAILY_FOOD_EUR, DAILY_HOTEL_EUR,
    FAMILY_ADULTS, FAMILY_KIDS, KID_FRIENDLY_THRESHOLD,
    STAY_DAYS, TRANSPORT_BUDGET_EUR,
};
use serde::{Deserialize, Serialize};

// ── Data structures ───────────────────────────────────────────────────────

/// Per-category euro breakdown for the Naples family trip.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetBreakdown {
    /// Total accommodation cost (DAILY_HOTEL_EUR × STAY_DAYS).
    pub hotel_eur: f32,
    /// Total food cost (DAILY_FOOD_EUR × STAY_DAYS).
    pub food_eur: f32,
    /// Sightseeing / ticketed entries budget.
    pub activities_eur: f32,
    /// Transport budget (metro, funicular, Circumvesuviana).
    pub transport_eur: f32,
    /// Discretionary buffer (gelato, souvenirs, incidentals).
    pub buffer_eur: f32,
    /// Sum of all categories — must equal FAMILY_BUDGET_EUR.
    pub total_eur: f32,
}

/// Full budget plan for the Naples family trip.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NapoliBudgetPlan {
    /// Per-category euro breakdown.
    pub breakdown: BudgetBreakdown,
    /// Number of adults.
    pub adults: u8,
    /// Number of children.
    pub kids: u8,
    /// Duration of stay in nights.
    pub stay_days: u8,
    /// Total budget per person per day (rounded to 2 decimal places).
    pub per_person_per_day_eur: f32,
    /// Nightly hotel budget.
    pub hotel_budget_per_night_eur: f32,
    /// Daily food allowance per person.
    pub daily_food_per_person_eur: f32,
    /// Recommended hotel star rating for the budget.
    pub recommended_hotel_stars: u8,
}

// ── Public functions ──────────────────────────────────────────────────────

/// Compute the canonical Napoli family budget plan from named constants.
///
/// All values are derived arithmetically — no approximation or ML
/// inference is involved.
pub fn allocate_family_budget() -> NapoliBudgetPlan {
    let hotel_eur = DAILY_HOTEL_EUR * STAY_DAYS as f32;
    let food_eur = DAILY_FOOD_EUR * STAY_DAYS as f32;
    let total_eur = hotel_eur + food_eur + ACTIVITIES_BUDGET_EUR + TRANSPORT_BUDGET_EUR + BUFFER_EUR;

    let total_people = (FAMILY_ADULTS + FAMILY_KIDS) as f32;
    let per_person_per_day_eur =
        (total_eur / total_people / STAY_DAYS as f32 * 100.0).round() / 100.0;

    let daily_food_per_person_eur =
        (DAILY_FOOD_EUR / total_people * 100.0).round() / 100.0;

    NapoliBudgetPlan {
        breakdown: BudgetBreakdown {
            hotel_eur,
            food_eur,
            activities_eur: ACTIVITIES_BUDGET_EUR,
            transport_eur: TRANSPORT_BUDGET_EUR,
            buffer_eur: BUFFER_EUR,
            total_eur,
        },
        adults: FAMILY_ADULTS,
        kids: FAMILY_KIDS,
        stay_days: STAY_DAYS,
        per_person_per_day_eur,
        hotel_budget_per_night_eur: DAILY_HOTEL_EUR,
        daily_food_per_person_eur,
        // €80/night in Naples Centro Storico maps to a 3-star B&B / apartment
        recommended_hotel_stars: 3,
    }
}

/// Budget-fit score for a single place visit.
///
/// Returns `1.0` for free places and decreases linearly as the
/// place's cost approaches `activities_budget_eur`.  Saturates at
/// `0.0` for costs equal to or exceeding the full activities budget.
///
/// Used to down-weight expensive places when composing a day plan.
///
/// # Arguments
/// * `place_cost_eur` — total cost for the whole family (adults + kids).
/// * `activities_budget_eur` — remaining activities budget.
#[must_use]
pub fn budget_fit_score(place_cost_eur: f32, activities_budget_eur: f32) -> f32 {
    if activities_budget_eur <= 0.0 {
        return 0.0;
    }
    (1.0 - place_cost_eur / activities_budget_eur).clamp(0.0, 1.0)
}

/// Value-weighted score combining budget fit with kid-friendliness.
///
/// `kid_score` is the cosine similarity produced by [`crate::family_score`].
/// Places that are kid-friendly AND cheap score highest; expensive
/// adult-only places score lowest.
///
/// Formula:
/// ```text
/// if kid_friendly:
///     0.5 × budget_fit + 0.5 × kid_score
/// else:
///     0.7 × budget_fit + 0.3 × (1 − kid_score)
/// ```
#[must_use]
pub fn value_weighted_score(cost_eur: f32, kid_score: f32, kid_friendly: bool) -> f32 {
    let bf = budget_fit_score(cost_eur, ACTIVITIES_BUDGET_EUR);
    if kid_friendly {
        0.5 * bf + 0.5 * kid_score
    } else {
        // Adult-only places are valid but down-weighted relative to budget
        0.7 * bf + 0.3 * (1.0 - kid_score)
    }
    .clamp(0.0, 1.0)
}

/// Returns `true` if a place with the given kid-score should be classified
/// as kid-friendly, using the global threshold from constants.
#[must_use]
#[inline]
pub fn is_kid_friendly(kid_score: f32) -> bool {
    kid_score >= KID_FRIENDLY_THRESHOLD
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn budget_plan_totals_correctly() {
        let plan = allocate_family_budget();
        let computed = plan.breakdown.hotel_eur
            + plan.breakdown.food_eur
            + plan.breakdown.activities_eur
            + plan.breakdown.transport_eur
            + plan.breakdown.buffer_eur;
        assert!(
            (computed - FAMILY_BUDGET_EUR).abs() < 1.0,
            "plan total {computed} ≠ FAMILY_BUDGET_EUR {FAMILY_BUDGET_EUR}"
        );
        assert_eq!(plan.breakdown.total_eur, computed);
    }

    #[test]
    fn budget_fit_free_place_scores_one() {
        assert!((budget_fit_score(0.0, ACTIVITIES_BUDGET_EUR) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn budget_fit_saturates_at_zero() {
        assert_eq!(budget_fit_score(ACTIVITIES_BUDGET_EUR * 2.0, ACTIVITIES_BUDGET_EUR), 0.0);
    }

    #[test]
    fn value_weighted_in_range() {
        for cost in [0.0_f32, 10.0, 30.0, 100.0] {
            for ks in [0.0_f32, 0.5, 1.0] {
                let s = value_weighted_score(cost, ks, ks >= KID_FRIENDLY_THRESHOLD);
                assert!(s >= 0.0 && s <= 1.0, "score out of range: {s}");
            }
        }
    }
}
