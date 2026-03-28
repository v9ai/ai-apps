use crate::embeddings::EmbeddingEngine;
use anyhow::Result;
use serde::{Deserialize, Serialize};

static FAMILY_ANCHORS: [&str; 5] = [
    "family-friendly activities for children and kids in the city",
    "outdoor open space suitable for young children and toddlers",
    "educational interactive experience for kids and families",
    "safe open space for school-age children with room to explore freely",
    "engaging interactive attraction suitable for curious 6 to 10 year old children",
];

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
    /// Anchor weights ordered to match [`FAMILY_ANCHORS`]:
    /// [family-friendly, outdoor/toddler, educational, safe-open-space, engaging-interactive]
    fn anchor_weights(self) -> [f32; 5] {
        match self {
            AgeBand::SchoolAge => [0.20, 0.20, 0.25, 0.20, 0.15],
            AgeBand::Toddler   => [0.15, 0.35, 0.15, 0.30, 0.05],
            AgeBand::Teen      => [0.20, 0.10, 0.30, 0.15, 0.25],
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
    /// Unweighted mean across all 5 anchors.
    pub score: f32,
    pub kid_friendly: bool,
    pub anchor_scores: [f32; 5],
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
/// Uses the first 3 anchors to preserve backwards-compatible output shape.
pub fn score_places(
    engine: &EmbeddingEngine,
    places: &[(&str, &str)],
) -> Result<Vec<PlaceFamilyScore>> {
    let anchor_vecs = engine.embed_batch(&FAMILY_ANCHORS[..3])?;

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
                kid_friendly: score >= 0.65,
                anchor_scores,
            }
        })
        .collect();

    Ok(results)
}

/// Score a slice of `(name, description)` place pairs using all 5 anchors and
/// age-band specific weights, returning [`PlaceFamilyScoreV2`] per place.
pub fn score_places_for_age_band(
    engine: &EmbeddingEngine,
    places: &[(&str, &str)],
    age_band: AgeBand,
) -> Result<Vec<PlaceFamilyScoreV2>> {
    let anchor_vecs = engine.embed_batch(&FAMILY_ANCHORS)?;
    let weights = age_band.anchor_weights();

    let descriptions: Vec<&str> = places.iter().map(|(_, d)| *d).collect();
    let place_vecs = engine.embed_batch(&descriptions)?;

    let results = places
        .iter()
        .zip(place_vecs.iter())
        .map(|((name, _), pv)| {
            let anchor_scores: [f32; 5] = [
                cosine_sim(pv, &anchor_vecs[0]),
                cosine_sim(pv, &anchor_vecs[1]),
                cosine_sim(pv, &anchor_vecs[2]),
                cosine_sim(pv, &anchor_vecs[3]),
                cosine_sim(pv, &anchor_vecs[4]),
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
                kid_friendly: score >= 0.65,
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

static NAPOLI_PLACES: [(&str, &str); 10] = [
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
];

/// Score the canonical set of Naples places for kid-friendliness.
pub fn score_napoli_places(engine: &EmbeddingEngine) -> Result<Vec<PlaceFamilyScore>> {
    score_places(engine, &NAPOLI_PLACES)
}

/// Score the canonical set of Naples places for a family with a school-age child (ages 4–11).
///
/// Uses all 5 anchors with [`AgeBand::SchoolAge`] weights, returning the richer
/// [`PlaceFamilyScoreV2`] which includes `weighted_score`, `confidence`, and `skip_with_child`.
pub fn score_napoli_places_family(engine: &EmbeddingEngine) -> Result<Vec<PlaceFamilyScoreV2>> {
    score_places_for_age_band(engine, &NAPOLI_PLACES, AgeBand::SchoolAge)
}
