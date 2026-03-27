//! travel-discover: scrape travel sources → Candle semantic filter → extract →
//! deduplicate → review analysis → index in LanceDB → export JSON.

use anyhow::{Context, Result};
use candle_core::Device;
use clap::Parser;
use tracing::info;

use travel_ml::constants::{DISCOVERY_YEAR, DISCOVERY_YEAR_STR};
use travel_ml::dedup::deduplicate;
use travel_ml::discover::{
    extract_hotels, is_seaside_hotel, rank_passages, scrape_all_sources, validate_hotel,
};
use travel_ml::embeddings::EmbeddingEngine;
use travel_ml::hotel::{seed_hotels, Hotel, HotelSearchResult};
use travel_ml::reviews::{self, EnrichedSearchResult};
use travel_ml::store::HotelStore;

#[derive(Parser)]
#[command(
    name = "travel-discover",
    about = "Discover new 2026 Greece hotels via web scraping + Candle ML"
)]
struct Args {
    /// Path to LanceDB database directory
    #[arg(long, default_value = "data/hotels.lance")]
    db: String,

    /// Output JSON file path
    #[arg(long, default_value = "../../apps/travel/src/data/hotels_2026.json")]
    out: String,

    /// Cosine similarity threshold for passage relevance (0.0–1.0)
    #[arg(long, default_value_t = 0.30)]
    relevance_threshold: f32,

    /// Cosine similarity threshold for deduplication (0.0–1.0)
    #[arg(long, default_value_t = 0.92)]
    dedup_threshold: f32,

    /// Also index into LanceDB (not just JSON export)
    #[arg(long)]
    index: bool,

    /// Skip review analysis (faster, no sentiment/aspect scores)
    #[arg(long)]
    skip_reviews: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    // ── Stage 1: Init Candle embedding engine ──
    info!("Loading Candle embedding model (all-MiniLM-L6-v2)...");
    let device = Device::Cpu;
    let engine = EmbeddingEngine::new(device).context("loading embedding model")?;

    // ── Stage 2: Scrape travel sources ──
    info!("Scraping travel sources for new Greece hotels...");
    let passages = scrape_all_sources().await;

    if passages.is_empty() {
        info!("No passages scraped — falling back to seed-based discovery");
        return run_seed_fallback(&engine, &args).await;
    }

    // ── Stage 3: Candle semantic passage retrieval ──
    info!("Running Candle semantic filtering...");
    let ranked = rank_passages(&engine, &passages, args.relevance_threshold)
        .context("ranking passages")?;

    info!(
        "Top {} relevant passages (of {})",
        ranked.len(),
        passages.len()
    );
    for (i, rp) in ranked.iter().take(5).enumerate() {
        info!(
            "  #{} score={:.3} src={} text={}...",
            i + 1,
            rp.score,
            rp.passage.source_url,
            &rp.passage.text[..rp.passage.text.len().min(80)],
        );
    }

    // ── Stage 4: Extract hotel data from scraped passages ──
    info!("Extracting hotel data from relevant passages...");
    let mut scraped_candidates = extract_hotels(&ranked);
    let before = scraped_candidates.len();
    scraped_candidates.retain(validate_hotel);
    if scraped_candidates.len() < before {
        info!(
            "Validation: dropped {} invalid candidates",
            before - scraped_candidates.len()
        );
    }
    let before_seaside = scraped_candidates.len();
    scraped_candidates.retain(|h| is_seaside_hotel(h));
    if scraped_candidates.len() < before_seaside {
        info!(
            "Seaside filter: dropped {} inland candidates",
            before_seaside - scraped_candidates.len()
        );
    }
    info!("Valid seaside candidates: {}", scraped_candidates.len());

    // ── Stage 5: Merge scraped + curated 2026 hotels ──
    let curated = curated_2026_hotels();
    info!("Curated {DISCOVERY_YEAR_STR} dataset: {} hotels", curated.len());
    let mut candidates = curated;
    candidates.extend(scraped_candidates);

    // ── Stage 6: Deduplicate with Candle embeddings ──
    info!("Deduplicating with Candle cosine similarity...");
    let existing = seed_hotels();
    let unique = deduplicate(&engine, &candidates, &existing, args.dedup_threshold)
        .context("deduplicating hotels")?;

    // ── Stage 7: Review analysis + export ──
    export_results(&unique, &engine, &args).await
}

/// Fallback: generate discovery results from curated 2026 hotel data.
async fn run_seed_fallback(engine: &EmbeddingEngine, args: &Args) -> Result<()> {
    info!("Using curated {DISCOVERY_YEAR_STR} Greece hotel dataset...");

    let hotels_2026 = curated_2026_hotels();
    info!("Curated dataset: {} hotels", hotels_2026.len());

    let existing = seed_hotels();
    let unique = deduplicate(engine, &hotels_2026, &existing, args.dedup_threshold)
        .context("deduplicating curated hotels")?;

    export_results(&unique, engine, args).await
}

async fn export_results(hotels: &[Hotel], engine: &EmbeddingEngine, args: &Args) -> Result<()> {
    if hotels.is_empty() {
        info!("No hotels to export");
        return Ok(());
    }

    // Optionally index into LanceDB
    if args.index {
        info!("Indexing {} hotels into LanceDB at {}", hotels.len(), args.db);
        let store = HotelStore::connect(&args.db, EmbeddingEngine::new(Device::Cpu)?)
            .await
            .context("connecting to LanceDB")?;
        store
            .add_hotels(hotels)
            .await
            .context("indexing hotels")?;
    }

    // Compute relevance scores via Candle embedding similarity.
    // DISCOVERY_YEAR_STR is embedded in the query so the vector space is anchored
    // to the target year — do not replace with a literal year.
    let query = format!("new affordable seaside beach hotel Greece {DISCOVERY_YEAR_STR} beachfront coastal resort value budget");
    let query_vec = engine.embed_one(&query).context("embedding reference query")?;

    let texts: Vec<String> = hotels.iter().map(|h| h.embed_text()).collect();
    let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
    let hotel_vecs = engine
        .embed_batch(&text_refs)
        .context("embedding hotels for scoring")?;

    let scores: Vec<f32> = hotel_vecs
        .iter()
        .map(|hvec| {
            let score: f32 = query_vec.iter().zip(hvec.iter()).map(|(a, b)| a * b).sum();
            score.clamp(0.0, 1.0)
        })
        .collect();

    if args.skip_reviews {
        // Simple export without review analysis
        let mut results: Vec<HotelSearchResult> = hotels
            .iter()
            .zip(scores.iter())
            .map(|(hotel, &score)| HotelSearchResult {
                hotel: hotel.clone(),
                score,
            })
            .collect();
        results.sort_by(|a, b| {
            a.hotel
                .price_eur
                .partial_cmp(&b.hotel.price_eur)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let json = serde_json::to_string_pretty(&results).context("serializing results")?;
        std::fs::write(&args.out, &json).context("writing output file")?;
        info!("Wrote {} hotels to {} (no review analysis)", results.len(), args.out);
        return Ok(());
    }

    // ── Stage 7b: Load pre-scraped gallery images (Playwright) ──
    info!("Loading hotel gallery images from pre-scraped data...");
    let mut hotels_with_images: Vec<Hotel> = hotels.to_vec();
    let gallery_paths = [
        "../../apps/travel/data/scraped_reviews.json",
        "apps/travel/data/scraped_reviews.json",
        "data/scraped_reviews.json",
    ];
    let gallery_file = gallery_paths.iter().find(|p| std::path::Path::new(p).exists());
    for hotel in &mut hotels_with_images {
        if let Some(path) = gallery_file {
            if let Some(images) = reviews::load_prescraped_gallery(&hotel.hotel_id, path) {
                info!("  {} — {} gallery images from pre-scraped data", hotel.name, images.len());
                hotel.gallery = images;
                continue;
            }
        }
        // Fallback to HTTP scraping (usually returns empty due to bot detection)
        let images = reviews::scrape_hotel_images(&hotel).await;
        if !images.is_empty() {
            hotel.gallery = images;
        }
    }

    // ── Stage 7c: Candle ML review analysis + web scraping ──
    let analyses = reviews::analyze_all_hotels_with_reviews(engine, &hotels_with_images)
        .await
        .context("review analysis pipeline")?;

    // De-classify "new" hotels whose review counts prove they are established
    reviews::clear_misidentified_new_hotels(&mut hotels_with_images, &analyses);

    // Build enriched results
    let mut results: Vec<EnrichedSearchResult> = hotels_with_images
        .iter()
        .zip(scores.iter())
        .zip(analyses.into_iter())
        .map(|((hotel, &score), analysis)| EnrichedSearchResult {
            hotel: reviews::EnrichedHotel {
                hotel: hotel.clone(),
                analysis,
            },
            score,
        })
        .collect();

    // Sort by discovery score descending (cheap × most reviewed × best reviewed)
    results.sort_by(|a, b| {
        b.hotel
            .analysis
            .discovery_score
            .partial_cmp(&a.hotel.analysis.discovery_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(
                a.hotel
                    .hotel
                    .price_eur
                    .partial_cmp(&b.hotel.hotel.price_eur)
                    .unwrap_or(std::cmp::Ordering::Equal),
            )
    });

    let json = serde_json::to_string_pretty(&results).context("serializing results")?;
    std::fs::write(&args.out, &json).context("writing output file")?;
    info!("Wrote {} hotels to {}", results.len(), args.out);

    for (i, r) in results.iter().enumerate() {
        info!(
            "  #{} {} ({}*, €{}/night, {}) — discovery: {:.1}, sentiment: {:.2}, value: {:.0}, rating: {:.1}, reviews: {}, aspects: {}",
            i + 1,
            r.hotel.hotel.name,
            r.hotel.hotel.star_rating,
            r.hotel.hotel.price_eur,
            r.hotel.hotel.location,
            r.hotel.analysis.discovery_score,
            r.hotel.analysis.sentiment_score,
            r.hotel.analysis.value_score,
            r.hotel.analysis.review_rating,
            r.hotel.analysis.review_count,
            r.hotel.analysis.aspect_scores.len(),
        );
    }

    Ok(())
}

/// Curated seed dataset of Greece hotels for the current discovery window.
///
/// Synthetic hotels (no verifiable real-world opening date) are assigned
/// `opened_year: Some(DISCOVERY_YEAR)`. Real brand hotels that opened before
/// the current window keep their actual opening year — those will NOT receive
/// the "NEW" badge in the UI because `opened_year < NEW_HOTEL_MIN_YEAR`.
///
/// When adding a new hotel:
/// - If it is a known real property with a confirmed opening year, use that year.
/// - If it is synthetic/illustrative, use `Some(DISCOVERY_YEAR)`.
/// - Never hardcode a raw year literal — always use the constants from
///   `travel_ml::constants`.
///
/// Sorted cheapest-first within each tier.
fn curated_2026_hotels() -> Vec<Hotel> {
    vec![
        // ── Budget / Value (under €150) ────────────────────────────
        Hotel {
            hotel_id: "selini-suites-naxos".into(),
            name: "Selini Suites Naxos".into(),
            description: "New-build 3-star aparthotel 200m from Agios Georgios beach in Naxos Town. \
                32 airy studios and one-bedroom suites with kitchenettes, shared courtyard pool, \
                and rooftop bar overlooking the Portara. Ideal budget base for Cyclades island-hopping.".into(),
            star_rating: 3,
            board_type: "Room Only".into(),
            price_eur: 72.0,
            location: "Naxos, Cyclades, Greece".into(),
            region: "Cyclades".into(),
            lat: 37.1036, lng: 25.3763,
            source_url: "https://www.booking.com/searchresults.html?ss=Naxos+Town+Greece+hotel".into(),
            amenities: vec!["Swimming pool".into(), "Bar".into(), "Wi-Fi".into(), "Kitchenette".into(), "Beach access".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "corfu-olive-garden".into(),
            name: "Corfu Olive Garden Hotel".into(),
            description: "Family-run 3-star hotel in a converted olive press near Sidari, Corfu. \
                28 rooms set among century-old olive groves, freshwater pool, taverna serving \
                home-grown produce, and free shuttle to the beach. Authentic and affordable.".into(),
            star_rating: 3,
            board_type: "Half Board".into(),
            price_eur: 78.0,
            location: "Corfu, Ionian Islands, Greece".into(),
            region: "Ionian Islands".into(),
            lat: 39.7900, lng: 19.7100,
            source_url: "https://www.booking.com/searchresults.html?ss=Sidari+Corfu+Greece+hotel".into(),
            amenities: vec!["Swimming pool".into(), "Restaurant".into(), "Parking".into(), "Wi-Fi".into(), "Beach shuttle".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "kos-mare-boutique".into(),
            name: "Kos Mare Boutique".into(),
            description: "Freshly built 3-star boutique hotel on Kos's Lambi beach strip. \
                45 modern rooms, ground-floor pool bar, rooftop sun terrace, and free bike rentals. \
                Steps from the beach and a 10-minute walk to Kos Town harbour.".into(),
            star_rating: 3,
            board_type: "Bed & Breakfast".into(),
            price_eur: 85.0,
            location: "Kos, Dodecanese, Greece".into(),
            region: "Dodecanese".into(),
            lat: 36.8933, lng: 26.9881,
            source_url: "https://www.booking.com/searchresults.html?ss=Lambi+Kos+Greece+hotel".into(),
            amenities: vec!["Swimming pool".into(), "Bar".into(), "Beach access".into(), "Wi-Fi".into(), "Parking".into(), "Bike rental".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        // ── Mid-range (€100–€250) ──────────────────────────────────
        Hotel {
            hotel_id: "halkidiki-blue-lagoon".into(),
            name: "Halkidiki Blue Lagoon Resort".into(),
            description: "New-build 4-star family resort on the Kassandra peninsula, Halkidiki. \
                120 bungalow-style rooms among pine trees, 300m of private beach, two pools, \
                kids' animation program, and half-board dining with local seafood.".into(),
            star_rating: 4,
            board_type: "Half Board".into(),
            price_eur: 125.0,
            location: "Halkidiki, Central Macedonia, Greece".into(),
            region: "Central Macedonia".into(),
            lat: 40.0500, lng: 23.4200,
            source_url: "https://www.booking.com/searchresults.html?ss=Kassandra+Halkidiki+Greece+resort".into(),
            amenities: vec!["Private beach".into(), "Swimming pool".into(), "Kids club".into(), "Restaurant".into(), "Parking".into(), "Wi-Fi".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "rhodes-seaside-all-inclusive".into(),
            name: "Rhodes Seaside All-Inclusive".into(),
            description: "New 4-star all-inclusive resort on Faliraki's south beach, Rhodes. \
                200 rooms, three pools, aqua park, five dining outlets, evening entertainment, \
                and a mini golf course. Strong value proposition for families.".into(),
            star_rating: 4,
            board_type: "All-Inclusive".into(),
            price_eur: 135.0,
            location: "Rhodes, Dodecanese, Greece".into(),
            region: "Dodecanese".into(),
            lat: 36.3400, lng: 28.2000,
            source_url: "https://www.booking.com/searchresults.html?ss=Faliraki+Rhodes+Greece+all+inclusive".into(),
            amenities: vec!["Beach access".into(), "Swimming pool".into(), "Kids club".into(), "Multiple restaurants".into(), "Water sports".into(), "Fitness center".into(), "Aqua park".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "paros-azure-beach".into(),
            name: "Paros Azure Beach Hotel".into(),
            description: "New 4-star beachfront hotel on Paros's Golden Beach, the island's \
                windsurfing capital. 80 rooms with sea-view balconies, two pools (adults + family), \
                beach bar, and water-sports centre. Half-board includes Cycladic tasting menus.".into(),
            star_rating: 4,
            board_type: "Half Board".into(),
            price_eur: 145.0,
            location: "Paros, Cyclades, Greece".into(),
            region: "Cyclades".into(),
            lat: 37.0480, lng: 25.2200,
            source_url: "https://www.booking.com/searchresults.html?ss=Golden+Beach+Paros+Greece+hotel".into(),
            amenities: vec!["Beach access".into(), "Swimming pool".into(), "Water sports".into(), "Bar".into(), "Restaurant".into(), "Wi-Fi".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "skiathos-breeze-hotel".into(),
            name: "Skiathos Breeze Hotel".into(),
            description: "Brand-new 4-star hillside hotel overlooking Koukounaries bay, Skiathos. \
                55 rooms with pine-forest views, infinity pool, sunset cocktail bar, and \
                complimentary beach shuttle. One of the Sporades' first new-builds in a decade.".into(),
            star_rating: 4,
            board_type: "Bed & Breakfast".into(),
            price_eur: 165.0,
            location: "Skiathos, Sporades, Greece".into(),
            region: "Sporades".into(),
            lat: 39.1500, lng: 23.4600,
            source_url: "https://www.booking.com/searchresults.html?ss=Koukounaries+Skiathos+Greece+hotel".into(),
            amenities: vec!["Infinity pool".into(), "Bar".into(), "Beach access".into(), "Wi-Fi".into(), "Fitness center".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "casa-cook-rethymno".into(),
            name: "Casa Cook Rethymno".into(),
            description: "Design-led lifestyle hotel in Rethymno's old harbour district, Crete. \
                95 rooms with bohemian-minimalist interiors, communal yoga deck, farm-to-fork \
                restaurant, natural wine bar, and a lap pool in a restored Venetian-era courtyard. \
                Adults-only.".into(),
            star_rating: 4,
            board_type: "Bed & Breakfast".into(),
            price_eur: 195.0,
            location: "Rethymno, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.3720, lng: 24.4700,
            source_url: "https://www.casacook.com".into(),
            amenities: vec!["Swimming pool".into(), "Yoga".into(), "Restaurant".into(), "Bar".into(), "Spa".into(), "Wi-Fi".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        // ── Premium (€250–€500) ────────────────────────────────────
        Hotel {
            hotel_id: "domes-zeen-chania".into(),
            name: "Domes Zeen Chania".into(),
            description: "Domes Resorts' new-build property west of Chania town. 150 rooms wrapped \
                around a lagoon-style pool, Haute Living suites with private chef service, open-air \
                cinema, and a Cretan-Japanese fusion restaurant. Family-friendly with kids' village.".into(),
            star_rating: 5,
            board_type: "Half Board".into(),
            price_eur: 340.0,
            location: "Chania, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.4800, lng: 23.9200,
            source_url: "https://www.domesresorts.com".into(),
            amenities: vec!["Lagoon pool".into(), "Spa".into(), "Kids club".into(), "Multiple restaurants".into(), "Beach access".into(), "Fitness center".into(), "Cinema".into()],
            image_url: None, gallery: vec![], opened_year: Some(2019),
        },
        Hotel {
            hotel_id: "numo-ierapetra".into(),
            name: "Numo Ierapetra Beach Resort".into(),
            description: "Ultra-luxury beachfront resort on Crete's southeastern coast. 280 suites \
                with private pools, a 2,000 sqm spa, five restaurants, and direct access to a \
                400-metre sandy beach. Minimalist Cretan-contemporary design by MKV Design.".into(),
            star_rating: 5,
            board_type: "All-Inclusive".into(),
            price_eur: 380.0,
            location: "Ierapetra, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.0075, lng: 25.7374,
            source_url: "https://numohotels.com".into(),
            amenities: vec!["Private pools".into(), "Spa".into(), "Beach access".into(), "Multiple restaurants".into(), "Fitness center".into(), "Kids club".into(), "Water sports".into()],
            image_url: None, gallery: vec![], opened_year: Some(2021),
        },
        Hotel {
            hotel_id: "w-hotel-crete".into(),
            name: "W Crete".into(),
            description: "W Hotels' first property in Crete, bringing Marriott's lifestyle brand \
                to the island's north coast. 200 rooms with signature W design, WET Deck infinity \
                pool, Away Spa, and multiple dining concepts overlooking the Sea of Crete.".into(),
            star_rating: 5,
            board_type: "Standard".into(),
            price_eur: 420.0,
            location: "Chania, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.5138, lng: 24.0180,
            source_url: "https://www.marriott.com/w-hotels".into(),
            amenities: vec!["Infinity pool".into(), "Spa".into(), "Beach access".into(), "Multiple restaurants".into(), "Bar".into(), "Fitness center".into(), "Rooftop terrace".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "santorini-canaves-oia-epitome".into(),
            name: "Canaves Oia Epitome".into(),
            description: "New adults-only extension of the iconic Canaves Oia brand in Santorini. \
                24 cave-style suites carved into the caldera cliff with private infinity plunge pools, \
                a subterranean spa, and a sunset champagne terrace. Peak Cycladic luxury.".into(),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 480.0,
            location: "Santorini, Cyclades, Greece".into(),
            region: "Cyclades".into(),
            lat: 36.4610, lng: 25.3720,
            source_url: "https://www.canaves.com".into(),
            amenities: vec!["Private pools".into(), "Spa".into(), "Restaurant".into(), "Bar".into(), "Concierge".into(), "Butler service".into()],
            image_url: None, gallery: vec![], opened_year: Some(2018),
        },
        Hotel {
            hotel_id: "costa-navarino-mandarin".into(),
            name: "Mandarin Oriental Costa Navarino".into(),
            description: "Mandarin Oriental's Greek debut on the Peloponnese coast. 99 villas \
                with private gardens, two signature golf courses, MO Spa, kids' academy, and \
                four restaurants. Set within the Costa Navarino eco-resort complex with access to \
                Voidokilia beach, one of the Mediterranean's most beautiful.".into(),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 490.0,
            location: "Costa Navarino, Peloponnese, Greece".into(),
            region: "Peloponnese".into(),
            lat: 36.9600, lng: 21.6500,
            source_url: "https://www.mandarinoriental.com".into(),
            amenities: vec!["Private beach".into(), "Golf course".into(), "Spa".into(), "Kids club".into(), "Multiple restaurants".into(), "Fitness center".into(), "Tennis court".into()],
            image_url: None, gallery: vec![], opened_year: Some(2023),
        },
        // ── Ultra-luxury (€500+) ──────────────────────────────────
        Hotel {
            hotel_id: "six-senses-crete".into(),
            name: "Six Senses Crete".into(),
            description: "IHG's Six Senses brand on the Akrotiri peninsula, Crete. 60 earth-toned \
                villas with plunge pools, organic garden, Six Senses Spa with hammam and \
                cryotherapy, and a working Cretan farm. Net-zero carbon targets.".into(),
            star_rating: 5,
            board_type: "Bed & Breakfast".into(),
            price_eur: 650.0,
            location: "Chania, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.5600, lng: 24.1100,
            source_url: "https://www.sixsenses.com".into(),
            amenities: vec!["Plunge pools".into(), "Spa".into(), "Organic garden".into(), "Restaurant".into(), "Yoga".into(), "Hammam".into(), "Beach access".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
        Hotel {
            hotel_id: "one-and-only-kea".into(),
            name: "One&Only Kea Island".into(),
            description: "One&Only's Greek debut on the unspoilt island of Kea in the western Cyclades. \
                75 clifftop villas with private pools and Aegean panoramas, holistic wellness centre, \
                three restaurants, and a private marina for yacht arrivals.".into(),
            star_rating: 5,
            board_type: "Standard".into(),
            price_eur: 890.0,
            location: "Kea, Cyclades, Greece".into(),
            region: "Cyclades".into(),
            lat: 37.6300, lng: 24.3200,
            source_url: "https://www.oneandonlyresorts.com".into(),
            amenities: vec!["Private pools".into(), "Spa".into(), "Private beach".into(), "Multiple restaurants".into(), "Marina".into(), "Butler service".into(), "Yoga".into()],
            image_url: None, gallery: vec![], opened_year: Some(2023),
        },
        Hotel {
            hotel_id: "aman-elounda".into(),
            name: "Aman Elounda".into(),
            description: "Aman Resorts' first Cretan property overlooking the Gulf of Mirabello. \
                75 pavilions cascading to a private cove. Stone-and-wood construction, cliff-edge \
                Aman Spa, organic farm-to-table dining, and private boat excursions.".into(),
            star_rating: 5,
            board_type: "Standard".into(),
            price_eur: 950.0,
            location: "Elounda, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.2543, lng: 25.7284,
            source_url: "https://www.aman.com".into(),
            amenities: vec!["Private beach".into(), "Spa".into(), "Infinity pool".into(), "Restaurant".into(), "Boat excursions".into(), "Yoga".into(), "Butler service".into()],
            image_url: None, gallery: vec![], opened_year: Some(DISCOVERY_YEAR),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curated_hotels_opened_years_never_exceed_discovery_year() {
        for h in curated_2026_hotels() {
            if let Some(year) = h.opened_year {
                assert!(
                    year <= DISCOVERY_YEAR,
                    "hotel '{}' has opened_year {year} > DISCOVERY_YEAR ({DISCOVERY_YEAR})",
                    h.hotel_id
                );
                assert!(
                    year >= 1900,
                    "hotel '{}' has implausible opened_year {year}",
                    h.hotel_id
                );
            }
        }
    }

    #[test]
    fn curated_hotels_are_all_seaside() {
        use travel_ml::discover::is_seaside_hotel;
        for h in curated_2026_hotels() {
            assert!(
                is_seaside_hotel(&h),
                "curated hotel '{}' (region={}, location={}) is not seaside — \
                 all curated hotels must be beachfront or on a Greek island",
                h.hotel_id, h.region, h.location,
            );
        }
    }

    #[test]
    fn curated_hotels_has_both_discovery_year_and_real_years() {
        let hotels = curated_2026_hotels();
        let discovery_count = hotels
            .iter()
            .filter(|h| h.opened_year == Some(DISCOVERY_YEAR))
            .count();
        let real_count = hotels
            .iter()
            .filter(|h| matches!(h.opened_year, Some(y) if y < DISCOVERY_YEAR))
            .count();
        assert!(
            discovery_count > 0,
            "curated list must contain synthetic hotels with opened_year = DISCOVERY_YEAR"
        );
        assert!(
            real_count > 0,
            "curated list must contain real hotels with opened_year < DISCOVERY_YEAR"
        );
    }
}
