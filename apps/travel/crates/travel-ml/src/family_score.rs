use crate::embeddings::EmbeddingEngine;
use anyhow::Result;
use serde::{Deserialize, Serialize};

/// Age band for child-specific scoring adjustments.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum AgeBand {
    /// Ages 0–3
    Toddler,
    /// Ages 4–11
    SchoolAge,
    /// Ages 12+
    Teen,
}

impl AgeBand {
    /// Anchor weights ordered to match [`crate::constants::FAMILY_ANCHORS`]:
    /// [family-friendly, outdoor/toddler, educational]
    fn anchor_weights(self) -> [f32; 3] {
        match self {
            AgeBand::SchoolAge => [0.35, 0.30, 0.35],
            AgeBand::Toddler   => [0.25, 0.50, 0.25],
            AgeBand::Teen      => [0.30, 0.15, 0.55],
        }
    }
}

/// Per-place kid-friendliness score derived from semantic similarity to family anchors.
#[derive(Debug, Serialize, Deserialize)]
pub struct PlaceFamilyScore {
    pub name: String,
    pub score: f32,
    pub kid_friendly: bool,
    pub anchor_scores: [f32; 3],
}

/// Extended per-place kid-friendliness score with age-band weighting and confidence.
#[derive(Debug, Serialize, Deserialize)]
pub struct PlaceFamilyScoreV2 {
    pub name: String,
    /// Unweighted mean across all 3 anchors.
    pub score: f32,
    pub kid_friendly: bool,
    pub anchor_scores: [f32; 3],
    pub age_band: AgeBand,
    /// Weighted cosine similarity against age-band anchor weights.
    pub weighted_score: f32,
    /// Standard deviation across raw anchor scores — lower means more confident signal.
    pub confidence: f32,
    /// True when `weighted_score` is below 0.45 for the given age band.
    pub skip_with_child: bool,
}

fn cosine_sim(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

fn std_dev(values: &[f32]) -> f32 {
    let mean = values.iter().sum::<f32>() / values.len() as f32;
    let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f32>() / values.len() as f32;
    variance.sqrt()
}

/// Score a slice of `(name, description)` place pairs for kid-friendliness.
///
/// Returns one [`PlaceFamilyScore`] per input pair, ordered identically.
/// Uses [`crate::constants::FAMILY_ANCHORS`] for embedding-based scoring.
pub fn score_places(
    engine: &EmbeddingEngine,
    places: &[(&str, &str)],
) -> Result<Vec<PlaceFamilyScore>> {
    use crate::constants::FAMILY_ANCHORS;
    let anchor_vecs = engine.embed_batch(&FAMILY_ANCHORS)?;

    let descriptions: Vec<&str> = places.iter().map(|(_, d)| *d).collect();
    let place_vecs = engine.embed_batch(&descriptions)?;

    let results = places
        .iter()
        .zip(place_vecs.iter())
        .map(|((name, _), pv)| {
            let anchor_scores = [
                cosine_sim(pv, &anchor_vecs[0]),
                cosine_sim(pv, &anchor_vecs[1]),
                cosine_sim(pv, &anchor_vecs[2]),
            ];
            let score = anchor_scores.iter().sum::<f32>() / anchor_scores.len() as f32;
            PlaceFamilyScore {
                name: name.to_string(),
                score,
                kid_friendly: score >= crate::constants::KID_FRIENDLY_THRESHOLD,
                anchor_scores,
            }
        })
        .collect();

    Ok(results)
}

/// Score a slice of `(name, description)` place pairs using all 3 anchors and
/// age-band specific weights, returning [`PlaceFamilyScoreV2`] per place.
pub fn score_places_for_age_band(
    engine: &EmbeddingEngine,
    places: &[(&str, &str)],
    age_band: AgeBand,
) -> Result<Vec<PlaceFamilyScoreV2>> {
    use crate::constants::FAMILY_ANCHORS;
    let anchor_vecs = engine.embed_batch(&FAMILY_ANCHORS)?;
    let weights = age_band.anchor_weights();

    let descriptions: Vec<&str> = places.iter().map(|(_, d)| *d).collect();
    let place_vecs = engine.embed_batch(&descriptions)?;

    let results = places
        .iter()
        .zip(place_vecs.iter())
        .map(|((name, _), pv)| {
            let anchor_scores: [f32; 3] = [
                cosine_sim(pv, &anchor_vecs[0]),
                cosine_sim(pv, &anchor_vecs[1]),
                cosine_sim(pv, &anchor_vecs[2]),
            ];

            let score = anchor_scores.iter().sum::<f32>() / anchor_scores.len() as f32;

            let weighted_score = anchor_scores
                .iter()
                .zip(weights.iter())
                .map(|(s, w)| s * w)
                .sum::<f32>();

            let confidence = std_dev(&anchor_scores);

            PlaceFamilyScoreV2 {
                name: name.to_string(),
                score,
                kid_friendly: score >= crate::constants::KID_FRIENDLY_THRESHOLD,
                anchor_scores,
                age_band,
                weighted_score,
                confidence,
                skip_with_child: weighted_score < 0.45,
            }
        })
        .collect();

    Ok(results)
}

/// Score the canonical set of Naples places for kid-friendliness.
pub fn score_napoli_places(engine: &EmbeddingEngine) -> Result<Vec<PlaceFamilyScore>> {
    let pairs = napoli_place_pairs();
    score_places(engine, &pairs)
}

/// Score the canonical set of Naples places for a family with a school-age child (ages 4–11).
///
/// Uses all 3 anchors with [`AgeBand::SchoolAge`] weights, returning the richer
/// [`PlaceFamilyScoreV2`] which includes `weighted_score`, `confidence`, and `skip_with_child`.
pub fn score_napoli_places_family(engine: &EmbeddingEngine) -> Result<Vec<PlaceFamilyScoreV2>> {
    score_places_for_age_band(engine, &napoli_place_pairs(), AgeBand::SchoolAge)
}

// ── Age-band scoring ──────────────────────────────────────────────────────

/// Age band for the travelling child, affecting which semantic anchors
/// are weighted most heavily.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum KidAgeBand {
    /// 0–3 years: stroller-friendly, open spaces, minimal walking.
    Toddler,
    /// 4–8 years: interactive, playful, short attention span.
    School,
    /// 9–12 years: curious, can handle longer visits.
    Tween,
}

impl KidAgeBand {
    /// Extra anchor phrases that amplify the base FAMILY_ANCHORS for this band.
    pub fn extra_anchors(&self) -> &'static [&'static str] {
        match self {
            Self::Toddler => &[
                "stroller friendly open flat terrain pram pushchair accessible",
                "gentle safe enclosed play area toddler babies infants",
            ],
            Self::School => &[
                "interactive hands-on playful engaging fun children games activities",
                "short walk manageable kids excited curious discovery",
            ],
            Self::Tween => &[
                "historical mystery adventure exploration discovery teens older kids",
                "educational science museum artefacts mosaics exhibits interactive",
            ],
        }
    }

    /// Weight blending: how much the extra anchors contribute vs the base
    /// FAMILY_ANCHORS (value in [0, 1]).
    pub fn extra_weight(&self) -> f32 {
        match self {
            Self::Toddler => 0.55,
            Self::School  => 0.50,
            Self::Tween   => 0.45,
        }
    }
}

/// Score places with age-band-specific semantic anchors.
///
/// Blends the base [`crate::constants::FAMILY_ANCHORS`] score with the
/// age-band extra anchors using the band's [`KidAgeBand::extra_weight`].
pub fn score_with_age_band(
    engine: &EmbeddingEngine,
    places: &[(&str, &str)],
    band: KidAgeBand,
) -> Result<Vec<PlaceFamilyScore>> {
    use crate::constants::FAMILY_ANCHORS;

    // Embed base anchors
    let base_vecs = engine.embed_batch(&FAMILY_ANCHORS)?;

    // Embed age-band extra anchors
    let extra_anchors = band.extra_anchors();
    let extra_vecs = engine.embed_batch(extra_anchors)?;

    // Embed place descriptions
    let descriptions: Vec<&str> = places.iter().map(|(_, d)| *d).collect();
    let place_vecs = engine.embed_batch(&descriptions)?;

    let w_extra = band.extra_weight();
    let w_base = 1.0 - w_extra;

    let results = places
        .iter()
        .zip(place_vecs.iter())
        .map(|((name, _), pv)| {
            // Base score: mean cosine over FAMILY_ANCHORS
            let base_score = base_vecs
                .iter()
                .map(|av| cosine_sim(pv, av))
                .sum::<f32>()
                / base_vecs.len() as f32;

            // Extra score: mean cosine over age-band anchors
            let extra_score = extra_vecs
                .iter()
                .map(|ev| cosine_sim(pv, ev))
                .sum::<f32>()
                / extra_vecs.len() as f32;

            let score = (w_base * base_score + w_extra * extra_score).clamp(0.0, 1.0);

            // anchor_scores stays as the 3 base anchors for compatibility
            let anchor_scores = [
                cosine_sim(pv, &base_vecs[0]),
                cosine_sim(pv, &base_vecs[1]),
                cosine_sim(pv, &base_vecs[2]),
            ];

            PlaceFamilyScore {
                name: name.to_string(),
                score,
                kid_friendly: score >= crate::constants::KID_FRIENDLY_THRESHOLD,
                anchor_scores,
            }
        })
        .collect();

    Ok(results)
}

/// Score Napoli places for a school-age child (4–8 years).
pub fn score_napoli_places_school_age(engine: &EmbeddingEngine) -> Result<Vec<PlaceFamilyScore>> {
    use crate::constants::FAMILY_ANCHORS;
    let _ = FAMILY_ANCHORS; // ensure constants module is used
    score_with_age_band(engine, &napoli_place_pairs(), KidAgeBand::School)
}

/// Canonical Naples (name, description) pairs used by all scoring fns.
fn napoli_place_pairs() -> Vec<(&'static str, &'static str)> {
    vec![
        ("Piazza del Plebiscito", "vast neoclassical civic plaza with families footballers and open space beneath Vesuvius"),
        ("Museo Archeologico Nazionale", "world-class archaeology museum with ancient artifacts Pompeii mosaics secret cabinet adults only sections"),
        ("Spaccanapoli", "narrow Roman street street life espresso bars artisan workshops baroque churches sensory intense"),
        ("Castel dell'Ovo", "medieval waterfront castle on islet with bay views battlements open space free entry families"),
        ("Napoli Sotterranea", "underground tour claustrophobic passages candles dark 15 degrees not suitable for children"),
        ("Certosa di San Martino", "monastery museum on hilltop funicular ride panoramic views cloisters art collection"),
        ("Via San Gregorio Armeno", "artisan nativity figurine workshop street craftsmen children love miniature characters"),
        ("L'Antica Pizzeria da Michele", "historic pizzeria margherita marinara pizza wood-fired oven family food children love pizza"),
        ("Lungomare Caracciolo", "seafront promenade gelato open air car-free weekends Vesuvius views families strollers"),
        ("Quartieri Spagnoli", "narrow alley grid street food fried seafood authentic neighbourhood laundry overhead"),
    ]
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── cosine_sim ────────────────────────────────────────────────────────

    #[test]
    fn cosine_sim_identical_normalized_vectors() {
        let v = vec![0.6_f32, 0.8, 0.0]; // |v| = 1.0
        assert!((cosine_sim(&v, &v) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn cosine_sim_orthogonal_vectors() {
        let a = vec![1.0_f32, 0.0, 0.0];
        let b = vec![0.0_f32, 1.0, 0.0];
        assert!(cosine_sim(&a, &b).abs() < 1e-6);
    }

    #[test]
    fn cosine_sim_zero_vectors_is_zero() {
        let z = vec![0.0_f32, 0.0, 0.0];
        assert_eq!(cosine_sim(&z, &z), 0.0);
    }

    #[test]
    fn cosine_sim_dot_product_formula() {
        // dot product of [0.6, 0.8] · [0.6, 0.0] = 0.36
        let a = vec![0.6_f32, 0.8];
        let b = vec![0.6_f32, 0.0];
        assert!((cosine_sim(&a, &b) - 0.36).abs() < 1e-6);
    }

    #[test]
    fn cosine_sim_negative_components() {
        // [-0.6, 0.8] · [0.6, 0.8] = -0.36 + 0.64 = 0.28
        let a = vec![-0.6_f32, 0.8];
        let b = vec![0.6_f32, 0.8];
        assert!((cosine_sim(&a, &b) - 0.28).abs() < 1e-6);
    }

    #[test]
    fn cosine_sim_single_element() {
        assert!((cosine_sim(&[0.5_f32], &[0.5]) - 0.25).abs() < 1e-6);
    }

    // ── std_dev ───────────────────────────────────────────────────────────

    #[test]
    fn std_dev_constant_values_is_zero() {
        let v = [0.5_f32, 0.5, 0.5];
        assert!(std_dev(&v) < 1e-6);
    }

    #[test]
    fn std_dev_two_values_half() {
        // [0.0, 1.0] → mean=0.5, variance=0.25, std=0.5
        let v = [0.0_f32, 1.0];
        assert!((std_dev(&v) - 0.5).abs() < 1e-6);
    }

    #[test]
    fn std_dev_known_dataset() {
        // [2,4,4,4,5,5,7,9] → mean=5, variance=4, std=2
        let v = [2.0_f32, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        assert!((std_dev(&v) - 2.0).abs() < 1e-5);
    }

    #[test]
    fn std_dev_single_value_is_zero() {
        assert!((std_dev(&[3.14_f32]) - 0.0).abs() < 1e-6);
    }

    #[test]
    fn std_dev_uniform_spread() {
        // [0, 0.5, 1.0] → mean=0.5, variance=(0.25+0+0.25)/3=1/6, std=sqrt(1/6)
        let v = [0.0_f32, 0.5, 1.0];
        let expected = (1.0_f32 / 6.0).sqrt();
        assert!((std_dev(&v) - expected).abs() < 1e-5);
    }

    #[test]
    fn std_dev_nonnegative() {
        for input in [
            &[0.1_f32, 0.2, 0.3][..],
            &[0.5, 0.5, 0.5],
            &[0.0, 1.0],
        ] {
            assert!(std_dev(input) >= 0.0);
        }
    }

    // ── AgeBand::anchor_weights ───────────────────────────────────────────

    #[test]
    fn age_band_weights_sum_to_one() {
        for band in [AgeBand::Toddler, AgeBand::SchoolAge, AgeBand::Teen] {
            let w = band.anchor_weights();
            let sum: f32 = w.iter().sum();
            assert!(
                (sum - 1.0).abs() < 1e-6,
                "{band:?} weights sum to {sum}, expected 1.0"
            );
        }
    }

    #[test]
    fn age_band_toddler_outdoor_anchor_highest() {
        let w = AgeBand::Toddler.anchor_weights();
        // Outdoor (index 1) should dominate for toddlers
        assert!(w[1] >= w[0], "Toddler: outdoor should be >= family-friendly");
        assert!(w[1] >= w[2], "Toddler: outdoor should be >= educational");
    }

    #[test]
    fn age_band_teen_educational_anchor_highest() {
        let w = AgeBand::Teen.anchor_weights();
        // Educational (index 2) should dominate for teens
        assert!(w[2] >= w[0], "Teen: educational should be >= family-friendly");
        assert!(w[2] >= w[1], "Teen: educational should be >= outdoor");
    }

    #[test]
    fn age_band_school_age_exact_weights() {
        let w = AgeBand::SchoolAge.anchor_weights();
        assert!((w[0] - 0.35).abs() < 1e-6, "SchoolAge family-friendly weight");
        assert!((w[1] - 0.30).abs() < 1e-6, "SchoolAge outdoor weight");
        assert!((w[2] - 0.35).abs() < 1e-6, "SchoolAge educational weight");
    }

    #[test]
    fn age_band_all_weights_positive() {
        for band in [AgeBand::Toddler, AgeBand::SchoolAge, AgeBand::Teen] {
            for w in band.anchor_weights() {
                assert!(w > 0.0, "{band:?} has non-positive weight {w}");
            }
        }
    }

    // ── KidAgeBand ────────────────────────────────────────────────────────

    #[test]
    fn kid_age_band_extra_anchors_count() {
        for band in [KidAgeBand::Toddler, KidAgeBand::School, KidAgeBand::Tween] {
            assert_eq!(band.extra_anchors().len(), 2, "{band:?} should have 2 extra anchors");
        }
    }

    #[test]
    fn kid_age_band_extra_anchors_nonempty_strings() {
        for band in [KidAgeBand::Toddler, KidAgeBand::School, KidAgeBand::Tween] {
            for anchor in band.extra_anchors() {
                assert!(anchor.len() > 10, "{band:?} anchor too short: {anchor:?}");
            }
        }
    }

    #[test]
    fn kid_age_band_extra_weight_in_range() {
        for band in [KidAgeBand::Toddler, KidAgeBand::School, KidAgeBand::Tween] {
            let w = band.extra_weight();
            assert!(w > 0.0 && w < 1.0, "{band:?} extra_weight {w} not in (0, 1)");
        }
    }

    #[test]
    fn kid_age_band_toddler_has_highest_extra_weight() {
        assert!(
            KidAgeBand::Toddler.extra_weight() > KidAgeBand::Tween.extra_weight(),
            "Toddler should have higher extra_weight than Tween"
        );
    }

    #[test]
    fn kid_age_band_extra_weight_decreases_with_age() {
        let toddler = KidAgeBand::Toddler.extra_weight();
        let school = KidAgeBand::School.extra_weight();
        let tween = KidAgeBand::Tween.extra_weight();
        assert!(toddler >= school, "Toddler extra_weight should >= School");
        assert!(school >= tween, "School extra_weight should >= Tween");
    }

    #[test]
    fn kid_age_band_toddler_anchors_mention_stroller() {
        let anchors = KidAgeBand::Toddler.extra_anchors();
        let combined = anchors.join(" ").to_lowercase();
        assert!(
            combined.contains("stroller") || combined.contains("pram"),
            "Toddler anchors should mention stroller/pram"
        );
    }

    #[test]
    fn kid_age_band_tween_anchors_mention_history() {
        let anchors = KidAgeBand::Tween.extra_anchors();
        let combined = anchors.join(" ").to_lowercase();
        assert!(
            combined.contains("historical") || combined.contains("museum"),
            "Tween anchors should mention historical/museum"
        );
    }

    // ── napoli_place_pairs data ───────────────────────────────────────────

    #[test]
    fn napoli_place_pairs_count_is_ten() {
        assert_eq!(napoli_place_pairs().len(), 10);
    }

    #[test]
    fn napoli_place_pairs_unique_names() {
        let pairs = napoli_place_pairs();
        let mut names: Vec<&str> = pairs.iter().map(|(n, _)| *n).collect();
        let total = names.len();
        names.sort_unstable();
        names.dedup();
        assert_eq!(names.len(), total, "all place names must be unique");
    }

    #[test]
    fn napoli_place_pairs_descriptions_nonempty() {
        for (name, desc) in napoli_place_pairs() {
            assert!(!desc.is_empty(), "{name}: description must not be empty");
            assert!(desc.len() > 10, "{name}: description is too short");
        }
    }

    #[test]
    fn napoli_place_pairs_contains_core_places() {
        let names: Vec<&str> = napoli_place_pairs().iter().map(|(n, _)| *n).collect();
        for expected in [
            "Lungomare Caracciolo",
            "Napoli Sotterranea",
            "L'Antica Pizzeria da Michele",
            "Piazza del Plebiscito",
        ] {
            assert!(names.contains(&expected), "missing place: {expected}");
        }
    }

    #[test]
    fn napoli_place_sotterranea_description_warns_children() {
        let pairs = napoli_place_pairs();
        let (_, desc) = pairs
            .iter()
            .find(|(n, _)| *n == "Napoli Sotterranea")
            .expect("Sotterranea should be in pairs");
        let lower = desc.to_lowercase();
        assert!(
            lower.contains("claustrophobic") || lower.contains("not suitable") || lower.contains("dark"),
            "Sotterranea description should warn about suitability, got: {desc}"
        );
    }

    #[test]
    fn napoli_place_pizzeria_description_mentions_family_food() {
        let pairs = napoli_place_pairs();
        let (_, desc) = pairs
            .iter()
            .find(|(n, _)| *n == "L'Antica Pizzeria da Michele")
            .expect("da Michele should be in pairs");
        let lower = desc.to_lowercase();
        assert!(
            lower.contains("pizza") || lower.contains("family"),
            "da Michele description should mention pizza/family, got: {desc}"
        );
    }

    #[test]
    fn napoli_place_pairs_names_nonempty() {
        for (name, _) in napoli_place_pairs() {
            assert!(!name.is_empty(), "place name must not be empty");
            assert!(name.len() > 2, "place name too short: {name:?}");
        }
    }
}
