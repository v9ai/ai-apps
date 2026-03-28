//! Ischia & Bay of Naples hotel discovery: web scraping + Candle semantic
//! passage retrieval, tailored for the Campania coast.
//!
//! Pipeline mirrors `discover.rs` but targets Ischia, Procida, Capri,
//! Sorrento, and the Amalfi Coast.

use crate::constants::{DISCOVERY_YEAR, DISCOVERY_YEAR_STR, NEW_HOTEL_MIN_YEAR};
use crate::discover::{extract_hotels_generic, RankedPassage, ScrapedPassage};
use crate::embeddings::EmbeddingEngine;
use crate::hotel::Hotel;
use anyhow::{Context, Result};
use tracing::info;

// ── Locations ──────────────────────────────────────────────────────────

/// Known destinations around the Bay of Naples with approximate coordinates.
pub fn bay_of_naples_locations() -> Vec<(&'static str, &'static str, f64, f64)> {
    vec![
        // Ischia
        ("Ischia Porto", "Ischia", 40.7472, 13.9419),
        ("Ischia Ponte", "Ischia", 40.7310, 13.9620),
        ("Casamicciola Terme", "Ischia", 40.7470, 13.9080),
        ("Lacco Ameno", "Ischia", 40.7550, 13.8870),
        ("Forio", "Ischia", 40.7390, 13.8560),
        ("Sant'Angelo", "Ischia", 40.7000, 13.8940),
        ("Barano d'Ischia", "Ischia", 40.7190, 13.9220),
        ("Serrara Fontana", "Ischia", 40.7120, 13.8870),
        // Procida
        ("Procida", "Procida", 40.7590, 14.0180),
        // Capri
        ("Capri", "Capri", 40.5507, 14.2222),
        ("Anacapri", "Capri", 40.5530, 14.2110),
        // Naples coast
        ("Naples", "Campania", 40.8518, 14.2681),
        ("Posillipo", "Campania", 40.8080, 14.1960),
        ("Pozzuoli", "Campania", 40.8263, 14.1233),
        // Sorrento peninsula
        ("Sorrento", "Sorrento Coast", 40.6263, 14.3756),
        ("Massa Lubrense", "Sorrento Coast", 40.6120, 14.3480),
        ("Sant'Agata sui Due Golfi", "Sorrento Coast", 40.6130, 14.3620),
        // Amalfi Coast
        ("Amalfi", "Amalfi Coast", 40.6340, 14.6027),
        ("Positano", "Amalfi Coast", 40.6283, 14.4850),
        ("Ravello", "Amalfi Coast", 40.6491, 14.6112),
        ("Praiano", "Amalfi Coast", 40.6130, 14.5290),
        ("Maiori", "Amalfi Coast", 40.6500, 14.6400),
        ("Cetara", "Amalfi Coast", 40.6510, 14.7000),
    ]
}

// ── Discovery URLs ─────────────────────────────────────────────────────

/// Curated source URLs for discovering new Bay of Naples / Ischia hotels.
pub fn ischia_discovery_urls() -> Vec<&'static str> {
    vec![
        "https://www.cntraveller.com/topic/ischia",
        "https://www.cntraveller.com/topic/amalfi-coast",
        "https://www.cntraveller.com/topic/capri",
        "https://www.travelandleisure.com/best-hotels/ischia-italy",
        "https://www.thehotelguru.com/best-hotels-in/italy/ischia",
        "https://www.timeout.com/naples/hotels/best-hotels-in-ischia",
        "https://www.booking.com/region/it/ischia.html",
        "https://www.tripadvisor.com/Hotels-g580221-Ischia_Isola_d_Ischia_Province_of_Naples_Campania-Hotels.html",
        "https://www.lonelyplanet.com/italy/ischia/hotels",
        "https://www.telegraph.co.uk/travel/destinations/europe/italy/ischia/hotels/",
        "https://www.booking.com/newhotellist/it.html",
        "https://www.cntraveller.com/topic/naples",
    ]
}

// ── Discovery queries ──────────────────────────────────────────────────

/// Candle embedding queries for Ischia / Bay of Naples hotel discovery.
fn ischia_discovery_queries() -> Vec<String> {
    vec![
        format!("new hotel resort Ischia Italy opened {DISCOVERY_YEAR_STR} thermal spa"),
        format!("brand new boutique hotel Ischia island opening {DISCOVERY_YEAR_STR} affordable"),
        format!("newly built hotel Bay of Naples Procida Capri {DISCOVERY_YEAR_STR}"),
        format!("Ischia thermal hotel opening {DISCOVERY_YEAR_STR} budget beach family"),
        format!("new hotel Sorrento Amalfi Coast Ischia {DISCOVERY_YEAR_STR} value"),
    ]
}

/// Embed passages and rank by cosine similarity to Ischia discovery queries.
pub fn rank_ischia_passages(
    engine: &EmbeddingEngine,
    passages: &[ScrapedPassage],
    threshold: f32,
) -> Result<Vec<RankedPassage>> {
    if passages.is_empty() {
        return Ok(vec![]);
    }

    let queries = ischia_discovery_queries();
    let query_refs: Vec<&str> = queries.iter().map(|s| s.as_str()).collect();
    let query_vecs = engine
        .embed_batch(&query_refs)
        .context("embedding Ischia discovery queries")?;

    let batch_size = 32;
    let passage_texts: Vec<&str> = passages.iter().map(|p| p.text.as_str()).collect();
    let mut passage_vecs = Vec::with_capacity(passages.len());

    for chunk in passage_texts.chunks(batch_size) {
        let vecs = engine.embed_batch(chunk).context("embedding passage batch")?;
        passage_vecs.extend(vecs);
    }

    let mut ranked = Vec::new();
    for (i, passage) in passages.iter().enumerate() {
        let pvec = &passage_vecs[i];
        let best_score = query_vecs
            .iter()
            .map(|qvec| dot_product(qvec, pvec))
            .fold(0.0f32, f32::max);

        if best_score >= threshold {
            ranked.push(RankedPassage {
                passage: passage.clone(),
                score: best_score,
            });
        }
    }

    ranked.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    info!(
        "Ischia semantic filter: {}/{} passages above {:.2} threshold",
        ranked.len(),
        passages.len(),
        threshold,
    );
    Ok(ranked)
}

fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

// ── Scraping ───────────────────────────────────────────────────────────

/// Scrape all Ischia discovery URLs.
pub async fn scrape_ischia_sources() -> Vec<ScrapedPassage> {
    use crate::discover::scrape_passages;

    let urls = ischia_discovery_urls();
    let mut all_passages = Vec::new();

    for url in urls {
        match scrape_passages(url).await {
            Ok(passages) => all_passages.extend(passages),
            Err(e) => tracing::warn!("Error scraping {url}: {e}"),
        }
    }

    info!("Total Ischia passages scraped: {}", all_passages.len());
    all_passages
}

// ── Hotel extraction (uses generic extractor with Bay of Naples locs) ──

/// Extract hotels from ranked passages using Bay of Naples location data.
pub fn extract_ischia_hotels(ranked: &[RankedPassage]) -> Vec<Hotel> {
    extract_hotels_generic(ranked, &bay_of_naples_locations(), "Campania", 40.74, 13.94)
}

// ── Validation ─────────────────────────────────────────────────────────

/// Validate a hotel candidate is plausible for the Bay of Naples area.
pub fn validate_ischia_hotel(hotel: &Hotel) -> bool {
    if hotel.name.is_empty() || hotel.name.len() < 4 {
        return false;
    }
    let lower = hotel.name.to_lowercase();
    if lower.starts_with("the best") || lower.starts_with("top ") {
        return false;
    }
    if hotel.star_rating < 1 || hotel.star_rating > 5 {
        return false;
    }
    if hotel.price_eur > 0.0 && (hotel.price_eur < 30.0 || hotel.price_eur > 3000.0) {
        return false;
    }
    // Bay of Naples bounding box (broader than just Ischia)
    if hotel.lat != 0.0 && (hotel.lat < 40.4 || hotel.lat > 41.0) {
        return false;
    }
    if hotel.lng != 0.0 && (hotel.lng < 13.7 || hotel.lng > 14.8) {
        return false;
    }
    true
}

// ── Curated seed data ──────────────────────────────────────────────────

/// Curated Ischia & Bay of Naples hotel dataset for the current discovery window.
///
/// Sorted cheapest-first within each tier.
pub fn curated_ischia_hotels() -> Vec<Hotel> {
    vec![
        // ── Budget / Value (under €120) ────────────────────────────
        Hotel {
            hotel_id: "hotel-villa-franca-ischia".into(),
            name: "Hotel Villa Franca Ischia".into(),
            description: "Charming 3-star family-run hotel in the heart of Ischia Porto, \
                200m from the harbour. 30 rooms with balconies, rooftop sun terrace with \
                sea views, and complimentary thermal-pool access at a partner spa. \
                Excellent value base for exploring the island.".into(),
            star_rating: 3,
            board_type: "Bed & Breakfast".into(),
            price_eur: 68.0,
            location: "Ischia Porto, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7472, lng: 13.9419,
            source_url: "https://www.booking.com/searchresults.html?ss=Ischia+Porto+Italy".into(),
            amenities: vec!["Thermal pool access".into(), "Rooftop terrace".into(), "Wi-Fi".into(), "Parking".into(), "Bar".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "albergo-terme-orchidea".into(),
            name: "Albergo Terme Orchidea".into(),
            description: "Traditional 3-star thermal hotel in Casamicciola Terme, Ischia's \
                oldest spa town. 36 rooms, two natural thermal pools, mud-bath treatments, \
                and a half-board restaurant serving Ischitan home cooking. One of the most \
                affordable thermal stays on the island.".into(),
            star_rating: 3,
            board_type: "Half Board".into(),
            price_eur: 75.0,
            location: "Casamicciola Terme, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7470, lng: 13.9080,
            source_url: "https://www.booking.com/searchresults.html?ss=Casamicciola+Terme+Ischia".into(),
            amenities: vec!["Thermal pools".into(), "Mud baths".into(), "Restaurant".into(), "Wi-Fi".into(), "Parking".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "hotel-la-corallina-procida".into(),
            name: "Hotel La Corallina".into(),
            description: "Colourful 3-star hotel on Procida's Marina Corricella, the pastel \
                fishing harbour made famous by the film Il Postino. 24 rooms with harbour \
                views, a waterfront restaurant, and free beach-shuttle to Chiaiolella.".into(),
            star_rating: 3,
            board_type: "Bed & Breakfast".into(),
            price_eur: 82.0,
            location: "Procida, Procida, Italy".into(),
            region: "Procida".into(),
            lat: 40.7590, lng: 14.0180,
            source_url: "https://www.booking.com/searchresults.html?ss=Procida+Italy+hotel".into(),
            amenities: vec!["Restaurant".into(), "Beach shuttle".into(), "Wi-Fi".into(), "Bar".into(), "Sea views".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "hotel-terme-felix-forio".into(),
            name: "Hotel Terme Felix".into(),
            description: "New 3-star thermal hotel in Forio, Ischia's western coast. \
                40 rooms, three thermal pools of different temperatures, garden with \
                citrus groves, and direct access to Citara beach. Budget-friendly \
                thermal wellness.".into(),
            star_rating: 3,
            board_type: "Half Board".into(),
            price_eur: 85.0,
            location: "Forio, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7390, lng: 13.8560,
            source_url: "https://www.booking.com/searchresults.html?ss=Forio+Ischia+Italy".into(),
            amenities: vec!["Thermal pools".into(), "Beach access".into(), "Restaurant".into(), "Garden".into(), "Wi-Fi".into(), "Parking".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        // ── Mid-range (€120–€250) ──────────────────────────────────
        Hotel {
            hotel_id: "hotel-sorriso-terme-ischia".into(),
            name: "Hotel Sorriso Thermae Resort & Spa".into(),
            description: "New-build 4-star thermal resort in Forio d'Ischia with panoramic \
                bay views. 80 rooms, five thermal pools (indoor + outdoor), full spa with \
                volcanic-mud treatments, two restaurants, and terraced gardens descending \
                to Citara beach.".into(),
            star_rating: 4,
            board_type: "Half Board".into(),
            price_eur: 140.0,
            location: "Forio, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7250, lng: 13.8500,
            source_url: "https://www.booking.com/searchresults.html?ss=Forio+Ischia+thermal+resort".into(),
            amenities: vec!["Thermal pools".into(), "Spa".into(), "Beach access".into(), "Restaurant".into(), "Fitness center".into(), "Wi-Fi".into(), "Kids club".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "hotel-san-giorgio-terme".into(),
            name: "Hotel San Giorgio Terme".into(),
            description: "Established 4-star thermal hotel perched above Maronti beach \
                in Barano d'Ischia. 86 rooms, thermal pools fed by the Olmitello spring, \
                Ayurveda spa, and a panoramic restaurant with Capri views. Family-friendly \
                with a kids' play area.".into(),
            star_rating: 4,
            board_type: "Half Board".into(),
            price_eur: 155.0,
            location: "Barano d'Ischia, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7130, lng: 13.9100,
            source_url: "https://www.booking.com/searchresults.html?ss=Barano+Ischia+Italy".into(),
            amenities: vec!["Thermal pools".into(), "Spa".into(), "Beach access".into(), "Restaurant".into(), "Kids club".into(), "Parking".into(), "Wi-Fi".into()],
            image_url: None, gallery: vec![], opened_year: Some(2020),
        },
        Hotel {
            hotel_id: "il-moresco-ischia".into(),
            name: "Il Moresco Hotel".into(),
            description: "Boutique 4-star hotel in Ischia Porto with Moorish-inspired \
                architecture. 70 rooms, thermal pool and jacuzzi, wellness centre with \
                volcanic-stone massage, rooftop cocktail bar, and a Michelin-noted \
                restaurant. Walking distance to the Aragonese Castle.".into(),
            star_rating: 4,
            board_type: "Bed & Breakfast".into(),
            price_eur: 185.0,
            location: "Ischia Porto, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7440, lng: 13.9450,
            source_url: "https://www.booking.com/searchresults.html?ss=Ischia+Porto+boutique".into(),
            amenities: vec!["Thermal pool".into(), "Spa".into(), "Restaurant".into(), "Bar".into(), "Rooftop terrace".into(), "Wi-Fi".into(), "Concierge".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "sant-angelo-resort-terme".into(),
            name: "Park Hotel Terme Mediterraneo".into(),
            description: "Secluded 4-star thermal hotel in the car-free village of \
                Sant'Angelo, Ischia's most picturesque corner. 55 rooms, cliffside \
                thermal pool overlooking the Maronti fumaroles, half-board dining with \
                local seafood, and direct trail to the Fumarole beach.".into(),
            star_rating: 4,
            board_type: "Half Board".into(),
            price_eur: 195.0,
            location: "Sant'Angelo, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7000, lng: 13.8940,
            source_url: "https://www.booking.com/searchresults.html?ss=Sant+Angelo+Ischia".into(),
            amenities: vec!["Thermal pool".into(), "Spa".into(), "Beach access".into(), "Restaurant".into(), "Wi-Fi".into(), "Hiking trails".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        // ── Premium (€250–€500) ────────────────────────────────────
        Hotel {
            hotel_id: "mezzatorre-hotel-thermal-spa".into(),
            name: "Mezzatorre Hotel & Thermal Spa".into(),
            description: "Iconic 5-star hotel set in a 16th-century watchtower above a \
                private bay in Lacco Ameno. 57 rooms, thermal infinity pool, Anna Fendi-designed \
                spa, two restaurants, and a private beach. One of Ischia's grand-dame \
                properties, fully renovated.".into(),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 350.0,
            location: "Lacco Ameno, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7600, lng: 13.8810,
            source_url: "https://www.mezzatorre.it".into(),
            amenities: vec!["Private beach".into(), "Thermal pool".into(), "Spa".into(), "Restaurant".into(), "Bar".into(), "Fitness center".into(), "Concierge".into()],
            image_url: None, gallery: vec![], opened_year: Some(2019),
        },
        Hotel {
            hotel_id: "san-montano-resort-spa".into(),
            name: "San Montano Resort & Spa".into(),
            description: "Luxury 5-star resort overlooking the Bay of San Montano in \
                Lacco Ameno. 72 rooms with sea views, six pools (including thermal), \
                1,800 sqm spa with volcanic treatments, botanical gardens, and a private \
                beach cove.".into(),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 380.0,
            location: "Lacco Ameno, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7580, lng: 13.8850,
            source_url: "https://www.sanmontano.com".into(),
            amenities: vec!["Thermal pools".into(), "Spa".into(), "Private beach".into(), "Restaurant".into(), "Botanical garden".into(), "Fitness center".into(), "Bar".into()],
            image_url: None, gallery: vec![], opened_year: Some(2021),
        },
        Hotel {
            hotel_id: "botania-relais-spa-ischia".into(),
            name: "Botania Relais & Spa".into(),
            description: format!("New adults-only 5-star boutique in Ischia Ponte, converted \
                from a 19th-century villa. 18 suites with private terraces, rooftop thermal \
                plunge pool, chef's-table restaurant, and curated archaeological tours to \
                the Aragonese Castle. Opening {DISCOVERY_YEAR_STR}."),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 420.0,
            location: "Ischia Ponte, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7310, lng: 13.9620,
            source_url: "https://www.booking.com/searchresults.html?ss=Ischia+Ponte+luxury".into(),
            amenities: vec!["Thermal pool".into(), "Spa".into(), "Restaurant".into(), "Concierge".into(), "Butler service".into(), "Wi-Fi".into(), "Rooftop terrace".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        // ── Ultra-luxury (€500+) ──────────────────────────────────
        Hotel {
            hotel_id: "hotel-regina-isabella-ischia".into(),
            name: "Regina Isabella Hotel & Spa".into(),
            description: "Legendary 5-star hotel in Lacco Ameno, Ischia's most exclusive \
                address since the 1950s. 128 rooms, Indaco Michelin-starred restaurant, \
                Olympic-size thermal pool, private beach, and a wellness centre fed by \
                natural hot springs. Full renovation completed.".into(),
            star_rating: 5,
            board_type: "Standard".into(),
            price_eur: 520.0,
            location: "Lacco Ameno, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7540, lng: 13.8880,
            source_url: "https://www.reginaisabella.it".into(),
            amenities: vec!["Thermal pool".into(), "Michelin restaurant".into(), "Private beach".into(), "Spa".into(), "Fitness center".into(), "Bar".into(), "Concierge".into(), "Butler service".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "capri-palace-jumeirah".into(),
            name: "Capri Palace Jumeirah".into(),
            description: "Ultra-luxury 5-star hotel in Anacapri with Jumeirah management. \
                68 suites, two Michelin-starred restaurants (L'Olivo 2*), award-winning \
                Capri Beauty Farm medical spa, infinity pool, and helicopter transfer \
                service. The pinnacle of Bay of Naples luxury.".into(),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 780.0,
            location: "Anacapri, Capri, Italy".into(),
            region: "Capri".into(),
            lat: 40.5530, lng: 14.2110,
            source_url: "https://www.jumeirah.com/capri-palace".into(),
            amenities: vec!["Infinity pool".into(), "Michelin restaurant".into(), "Spa".into(), "Fitness center".into(), "Concierge".into(), "Butler service".into(), "Helicopter transfer".into()],
            image_url: None, gallery: vec![], opened_year: Some(2021),
        },
    ]
}

/// Seed hotels for deduplication (well-known existing Ischia properties).
pub fn ischia_seed_hotels() -> Vec<Hotel> {
    vec![
        Hotel {
            hotel_id: "giardini-poseidon".into(),
            name: "Giardini Poseidon Terme".into(),
            description: "Ischia's largest thermal park with 22 pools at different \
                temperatures, set in a natural amphitheatre on Citara Bay.".into(),
            star_rating: 4,
            board_type: "Standard".into(),
            price_eur: 0.0,
            location: "Forio, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7230, lng: 13.8470,
            source_url: String::new(),
            amenities: vec!["Thermal pools".into(), "Spa".into(), "Beach access".into(), "Restaurant".into()],
            image_url: None, gallery: vec![], opened_year: None,
        },
        Hotel {
            hotel_id: "negombo-terme".into(),
            name: "Negombo Thermal Gardens".into(),
            description: "Boutique thermal park in the Bay of San Montano, Lacco Ameno. \
                12 thermal pools, Japanese garden, private beach, and sculpture park.".into(),
            star_rating: 4,
            board_type: "Standard".into(),
            price_eur: 0.0,
            location: "Lacco Ameno, Ischia, Italy".into(),
            region: "Ischia".into(),
            lat: 40.7570, lng: 13.8820,
            source_url: String::new(),
            amenities: vec!["Thermal pools".into(), "Beach access".into(), "Garden".into()],
            image_url: None, gallery: vec![], opened_year: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bay_of_naples_locations_all_within_bbox() {
        for (name, _region, lat, lng) in bay_of_naples_locations() {
            assert!(
                lat >= 40.4 && lat <= 41.0,
                "{name} lat {lat} out of Bay of Naples bbox"
            );
            assert!(
                lng >= 13.7 && lng <= 14.8,
                "{name} lng {lng} out of Bay of Naples bbox"
            );
        }
    }

    #[test]
    fn bay_of_naples_locations_has_key_towns() {
        let locs = bay_of_naples_locations();
        let names: Vec<&str> = locs.iter().map(|(n, _, _, _)| *n).collect();
        assert!(names.contains(&"Ischia Porto"));
        assert!(names.contains(&"Forio"));
        assert!(names.contains(&"Sant'Angelo"));
        assert!(names.contains(&"Procida"));
        assert!(names.contains(&"Capri"));
        assert!(names.contains(&"Sorrento"));
        assert!(names.contains(&"Positano"));
    }

    #[test]
    fn ischia_discovery_queries_all_contain_discovery_year_str() {
        for q in ischia_discovery_queries() {
            assert!(
                q.contains(DISCOVERY_YEAR_STR),
                "Ischia discovery query missing DISCOVERY_YEAR_STR ({DISCOVERY_YEAR_STR}): {q}"
            );
        }
    }

    #[test]
    fn curated_ischia_hotels_opened_years_valid() {
        for h in curated_ischia_hotels() {
            if let Some(year) = h.opened_year {
                assert!(
                    year <= DISCOVERY_YEAR,
                    "hotel '{}' has opened_year {year} > DISCOVERY_YEAR ({DISCOVERY_YEAR})",
                    h.hotel_id
                );
                assert!(year >= 1900, "hotel '{}' has implausible opened_year {year}", h.hotel_id);
            }
        }
    }

    #[test]
    fn curated_ischia_hotels_has_both_year_types() {
        let hotels = curated_ischia_hotels();
        let discovery_count = hotels.iter().filter(|h| h.opened_year == Some(DISCOVERY_YEAR)).count();
        let real_count = hotels.iter().filter(|h| matches!(h.opened_year, Some(y) if y < DISCOVERY_YEAR)).count();
        assert!(discovery_count > 0, "must contain synthetic hotels with opened_year = DISCOVERY_YEAR");
        assert!(real_count > 0, "must contain real hotels with opened_year < DISCOVERY_YEAR");
    }

    #[test]
    fn validate_ischia_hotel_accepts_valid() {
        let h = &curated_ischia_hotels()[0];
        assert!(validate_ischia_hotel(h));
    }

    #[test]
    fn validate_ischia_hotel_rejects_outside_bbox() {
        let mut h = curated_ischia_hotels()[0].clone();
        h.lat = 42.0; // too far north
        assert!(!validate_ischia_hotel(&h));
    }
}
