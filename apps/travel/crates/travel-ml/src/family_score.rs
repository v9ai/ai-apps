use crate::embeddings::EmbeddingEngine;
use anyhow::Result;
use serde::{Deserialize, Serialize};

static FAMILY_ANCHORS: [&str; 3] = [
    "family-friendly activities for children and kids in the city",
    "outdoor open space suitable for young children and toddlers",
    "educational interactive experience for kids and families",
];

/// Per-place kid-friendliness score derived from semantic similarity to family anchors.
#[derive(Debug, Serialize, Deserialize)]
pub struct PlaceFamilyScore {
    pub name: String,
    pub score: f32,
    pub kid_friendly: bool,
    pub anchor_scores: [f32; 3],
}

fn cosine_sim(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// Score a slice of `(name, description)` place pairs for kid-friendliness.
///
/// Returns one [`PlaceFamilyScore`] per input pair, ordered identically.
pub fn score_places(
    engine: &EmbeddingEngine,
    places: &[(&str, &str)],
) -> Result<Vec<PlaceFamilyScore>> {
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
                kid_friendly: score >= 0.65,
                anchor_scores,
            }
        })
        .collect();

    Ok(results)
}

/// Score the canonical set of Naples places for kid-friendliness.
pub fn score_napoli_places(engine: &EmbeddingEngine) -> Result<Vec<PlaceFamilyScore>> {
    score_places(
        engine,
        &[
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
        ],
    )
}
