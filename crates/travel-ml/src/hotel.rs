//! Hotel data model and seed data.

use serde::{Deserialize, Serialize};

/// A hotel with all metadata needed for embedding and display.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hotel {
    pub hotel_id: String,
    pub name: String,
    pub description: String,
    pub star_rating: u8,
    pub board_type: String,
    pub price_eur: f32,
    pub location: String,
    pub region: String,
    pub lat: f64,
    pub lng: f64,
    pub source_url: String,
    pub amenities: Vec<String>,
    pub image_url: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub gallery: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub opened_year: Option<u16>,
}

/// Search result with similarity score.
#[derive(Debug, Clone, Serialize)]
pub struct HotelSearchResult {
    pub hotel: Hotel,
    pub score: f32,
}

impl Hotel {
    /// Build the text representation used for embedding.
    pub fn embed_text(&self) -> String {
        let amenities_str = if self.amenities.is_empty() {
            String::new()
        } else {
            format!(" Amenities: {}.", self.amenities.join(", "))
        };
        let year_str = self
            .opened_year
            .map(|y| format!(" Opened in {y}."))
            .unwrap_or_default();
        format!(
            "{} {}-star {} in {}. {}.{}{}",
            self.name,
            self.star_rating,
            self.board_type,
            self.location,
            self.description,
            amenities_str,
            year_str,
        )
    }
}

/// Helper to build a minimal Hotel for tests.
#[cfg(test)]
pub fn test_hotel(name: &str, star_rating: u8, location: &str) -> Hotel {
    Hotel {
        hotel_id: name.to_lowercase().replace(' ', "-"),
        name: name.to_string(),
        description: format!("A {star_rating}-star hotel in {location}."),
        star_rating,
        board_type: "Standard".to_string(),
        price_eur: 200.0,
        location: location.to_string(),
        region: "Crete".to_string(),
        lat: 35.3,
        lng: 24.9,
        source_url: String::new(),
        amenities: vec![],
        image_url: None,
        gallery: vec![],
        opened_year: None,
    }
}

/// Hardcoded seed hotels from jeka.ro (fallback when scraping fails).
pub fn seed_hotels() -> Vec<Hotel> {
    vec![
        Hotel {
            hotel_id: "kiani-beach-resort".into(),
            name: "Kiani Beach Resort".into(),
            description: "5-star beachfront All-Inclusive resort on Crete's northwest coast. \
                Set along Kiani Beach near Kalyves, it offers extensive pools, spa facilities, \
                water sports, and multiple dining venues with sea views. Family-friendly with \
                kids clubs and playground. Verified by Jeka Turism (Aug 2024).".into(),
            star_rating: 5,
            board_type: "All-Inclusive".into(),
            price_eur: 224.0,
            location: "Chania, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.466257,
            lng: 24.155082,
            source_url: "https://www.jeka.ro/kiani-beach-resort_35734.aspx".into(),
            amenities: vec![
                "Beach access".into(),
                "Swimming pools".into(),
                "Spa".into(),
                "Water sports".into(),
                "Kids club".into(),
                "Multiple restaurants".into(),
                "Bars".into(),
                "Fitness center".into(),
            ],
            image_url: None,
            gallery: vec![],
            opened_year: None,
        },
        Hotel {
            hotel_id: "zeus-neptuno-beach".into(),
            name: "Zeus Hotels Neptuno Beach".into(),
            description: "4-star beachfront All-Inclusive hotel on Ammoudara beach near Heraklion. \
                Direct beach frontage on the Cretan Sea with comfortable double rooms, pool area, \
                and dining options. Convenient access to Heraklion city and Knossos archaeological site. \
                Verified by Jeka Turism (Sep 2024).".into(),
            star_rating: 4,
            board_type: "All-Inclusive".into(),
            price_eur: 198.0,
            location: "Heraklion, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.336906,
            lng: 25.087903,
            source_url: "https://www.jeka.ro/zeus-hotels-neptuno-beach_21020.aspx".into(),
            amenities: vec![
                "Beach access".into(),
                "Swimming pool".into(),
                "Restaurant".into(),
                "Bar".into(),
                "Near Knossos".into(),
            ],
            image_url: None,
            gallery: vec![],
            opened_year: None,
        },
        Hotel {
            hotel_id: "glaros-beach".into(),
            name: "Glaros Beach".into(),
            description: "4-star beachfront hotel in Hersonissos, Crete, rated 9.6/10. \
                Just 10-15 meters from the beach with elegant rooms, exemplary daily cleaning, \
                and diverse dining. Part of the Stampoulis hotel group. Half Board and \
                All-Inclusive options available.".into(),
            star_rating: 4,
            board_type: "All-Inclusive".into(),
            price_eur: 107.0,
            location: "Hersonissos, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.512772,
            lng: 23.976490,
            source_url: "https://www.jeka.ro/glaros-beach_28354.aspx".into(),
            amenities: vec![
                "Beach access".into(),
                "Restaurant".into(),
                "Parking".into(),
                "Daily cleaning".into(),
                "Wi-Fi".into(),
            ],
            image_url: None,
            gallery: vec![],
            opened_year: None,
        },
        Hotel {
            hotel_id: "alexander-house".into(),
            name: "Alexander House Hotel".into(),
            description: "Family-run 4-star hotel in the enchanting bay of Agia Pelagia, \
                a traditional fishing village 22 km from Heraklion. 300 metres from the \
                beach with crystal-clear waters. 36 rooms across 6 types including sea \
                view suites. Run by the second-generation Alexandrakis family. Free buffet \
                breakfast, pool, gym, and massage services.".into(),
            star_rating: 4,
            board_type: "Bed & Breakfast".into(),
            price_eur: 122.0,
            location: "Agia Pelagia, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.4095,
            lng: 24.9895,
            source_url: "https://admiral.travel/ro/countries/grecia/heraklion-agia-pelagia/alexander-house-".into(),
            amenities: vec![
                "Beach nearby".into(),
                "Swimming pool".into(),
                "Restaurant & Bar".into(),
                "Gym".into(),
                "Massage & Wellness".into(),
                "Free breakfast".into(),
                "Sea view rooms".into(),
                "Family rooms".into(),
            ],
            image_url: None,
            gallery: vec![],
            opened_year: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embed_text_basic() {
        let h = test_hotel("Acme Resort", 5, "Chania, Crete");
        let text = h.embed_text();
        assert!(text.contains("Acme Resort"));
        assert!(text.contains("5-star"));
        assert!(text.contains("Chania, Crete"));
    }

    #[test]
    fn embed_text_includes_amenities() {
        let mut h = test_hotel("Acme Resort", 4, "Rethymno");
        h.amenities = vec!["Pool".into(), "Spa".into()];
        let text = h.embed_text();
        assert!(text.contains("Pool, Spa"));
    }

    #[test]
    fn embed_text_includes_opened_year() {
        let mut h = test_hotel("Acme Resort", 5, "Chania");
        h.opened_year = Some(2026);
        let text = h.embed_text();
        assert!(text.contains("Opened in 2026"));
    }

    #[test]
    fn embed_text_omits_year_when_none() {
        let h = test_hotel("Acme Resort", 5, "Chania");
        assert!(!h.embed_text().contains("Opened in"));
    }

    #[test]
    fn seed_hotels_all_valid() {
        let seeds = seed_hotels();
        assert_eq!(seeds.len(), 4);
        for h in &seeds {
            assert!(!h.name.is_empty());
            assert!(h.star_rating >= 3 && h.star_rating <= 5);
            assert!(h.price_eur > 0.0);
            assert!(h.lat > 34.0 && h.lat < 36.0);
            assert!(h.opened_year.is_none());
        }
    }

    #[test]
    fn hotel_roundtrip_json() {
        let h = test_hotel("Test Hotel", 4, "Heraklion");
        let json = serde_json::to_string(&h).unwrap();
        let h2: Hotel = serde_json::from_str(&json).unwrap();
        assert_eq!(h.name, h2.name);
        assert_eq!(h.star_rating, h2.star_rating);
    }

    #[test]
    fn hotel_json_skips_none_opened_year() {
        let h = test_hotel("Test Hotel", 4, "Heraklion");
        let json = serde_json::to_string(&h).unwrap();
        assert!(!json.contains("opened_year"));
    }

    #[test]
    fn hotel_json_includes_some_opened_year() {
        let mut h = test_hotel("Test Hotel", 4, "Heraklion");
        h.opened_year = Some(2026);
        let json = serde_json::to_string(&h).unwrap();
        assert!(json.contains("\"opened_year\":2026"));
    }
}
