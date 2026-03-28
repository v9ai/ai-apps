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
