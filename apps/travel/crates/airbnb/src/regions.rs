//! Pre-built Spanish coastal region definitions and June 2026 search URLs.
//!
//! Each [`CoastalZone`] groups a region name with its cities. The
//! [`spain_june_2026`] function generates [`SearchParams`] for every city
//! with pool + entire home + max €50/night filters — matching the direct
//! links from the travel research.
//!
//! Key insight: Airbnb's displayed nightly price does NOT include the
//! cleaning fee.  Set max 40–45€/night to stay under €1500/month total.

use serde::{Deserialize, Serialize};

use crate::url_builder::{Amenity, RoomType, SearchParams};

// ── Region data ─────────────────────────────────────────────────────────

/// Spanish coastal region.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Region {
    CostaDorada,
    CostaBrava,
    CostaBlanca,
    CostaDelSol,
    Valencia,
    Murcia,
    Balearics,
}

impl Region {
    pub fn label(self) -> &'static str {
        match self {
            Self::CostaDorada => "Costa Dorada (1h de Barcelona)",
            Self::CostaBrava => "Costa Brava",
            Self::CostaBlanca => "Costa Blanca (cele mai ieftine din Spania)",
            Self::CostaDelSol => "Costa del Sol (Andaluzia)",
            Self::Valencia => "Valencia",
            Self::Murcia => "Murcia / Costa Cálida",
            Self::Balearics => "Illes Balears",
        }
    }
}

/// A coastal zone with its region and searchable cities.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoastalZone {
    pub region: Region,
    pub cities: Vec<CitySearch>,
}

/// A single city search configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CitySearch {
    pub city: String,
    pub country: String,
    pub note: Option<String>,
    pub params: SearchParams,
}

impl CitySearch {
    /// Build the Airbnb search URL for this city.
    pub fn url(&self) -> String {
        crate::url_builder::build_url(&self.params)
    }
}

// ── Pre-built searches ──────────────────────────────────────────────────

/// All regions with their cities.
pub fn all_regions() -> Vec<CoastalZone> {
    vec![
        CoastalZone {
            region: Region::CostaDorada,
            cities: vec![
                june_city("Salou", "Spain", None),
                june_city("Cambrils", "Spain", None),
                june_city("Calafell", "Spain", None),
            ],
        },
        CoastalZone {
            region: Region::CostaBlanca,
            cities: vec![
                june_city("Torrevieja", "Spain", Some("Cel mai ieftin loc de pe coasta Spaniei")),
                june_city("Alicante", "Spain", Some("San Juan plajă")),
                june_city("Benidorm", "Spain", None),
                june_city("Dénia", "Spain", None),
            ],
        },
        CoastalZone {
            region: Region::CostaDelSol,
            cities: vec![
                june_city("Torre del Mar", "Spain", None),
                june_city("Torremolinos", "Spain", None),
                june_city("Almuñécar", "Spain", None),
                june_city("Fuengirola", "Spain", None),
            ],
        },
        CoastalZone {
            region: Region::Valencia,
            cities: vec![
                june_city("Valencia", "Spain", Some("Plajă + oraș mare")),
            ],
        },
        CoastalZone {
            region: Region::Murcia,
            cities: vec![
                june_city("La Manga del Mar Menor", "Spain", Some("Două mări")),
                june_city("Águilas", "Spain", None),
            ],
        },
    ]
}

/// All June 2026 Spain searches with default filters.
///
/// Filters: pool, entire home, max €50/night, 1 Jun – 30 Jun 2026.
///
/// **Sfat**: Prețul afișat pe noapte NU include taxa de curățenie.
/// Pune max 40–45€/noapte ca să rămâi sub €1500 total pe lună.
pub fn spain_june_2026() -> Vec<CitySearch> {
    all_regions()
        .into_iter()
        .flat_map(|z| z.cities)
        .collect()
}

/// Build a June 2026 city search with standard long-stay filters.
fn june_city(city: &str, country: &str, note: Option<&str>) -> CitySearch {
    let location = format!("{city}, {country}");
    let params = SearchParams::builder()
        .location(&location)
        .checkin("2026-06-01")
        .checkout("2026-06-30")
        .price_max(50)
        .amenity(Amenity::Pool)
        .room_type(RoomType::EntireHome)
        .build();

    CitySearch {
        city: city.to_string(),
        country: country.to_string(),
        note: note.map(|s| s.to_string()),
        params,
    }
}

// ── Tips ────────────────────────────────────────────────────────────────

/// Practical tips for Airbnb long-stay searches in Spain.
pub const TIPS: &[&str] = &[
    "Prețul afișat pe noapte NU include taxa de curățenie — pune max 40-45€/noapte ca să rămâi sub 1500€ total",
    "Filtrează \"New\" sau caută \"new build\", \"renovated 2023/2024\", \"obra nueva\"",
    "Torrevieja are cele mai multe rezultate sub 1500€ — cel mai ieftin de pe coasta Spaniei",
    "Iunie prima jumătate e mai ieftin decât a doua (pre-sezon vs. sezon)",
    "Cere reducere monthly discount direct gazdei — mulți dau 10-20% pt 28+ nopți",
    "Verifică scorul gazdei: Superhost + 4.8+ = safe bet",
];

// ── Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spain_june_generates_all_cities() {
        let searches = spain_june_2026();
        assert!(searches.len() >= 11, "expected at least 11 cities, got {}", searches.len());
    }

    #[test]
    fn all_searches_have_pool_filter() {
        for s in spain_june_2026() {
            assert!(
                s.params.amenities.contains(&Amenity::Pool),
                "{} missing pool filter", s.city
            );
        }
    }

    #[test]
    fn all_searches_have_entire_home() {
        for s in spain_june_2026() {
            assert!(
                s.params.room_types.contains(&RoomType::EntireHome),
                "{} missing entire home filter", s.city
            );
        }
    }

    #[test]
    fn all_searches_under_50_per_night() {
        for s in spain_june_2026() {
            assert_eq!(
                s.params.price_max, Some(50),
                "{} price_max not 50", s.city
            );
        }
    }

    #[test]
    fn torrevieja_url_is_correct() {
        let searches = spain_june_2026();
        let torrevieja = searches.iter().find(|s| s.city == "Torrevieja").unwrap();
        let url = torrevieja.url();
        assert!(url.contains("Torrevieja--Spain"));
        assert!(url.contains("checkin=2026-06-01"));
        assert!(url.contains("price_max=50"));
        assert!(url.contains("amenities%5B%5D=7"));
    }

    #[test]
    fn regions_have_correct_labels() {
        assert_eq!(Region::CostaBlanca.label(), "Costa Blanca (cele mai ieftine din Spania)");
        assert_eq!(Region::CostaDelSol.label(), "Costa del Sol (Andaluzia)");
    }

    #[test]
    fn june_dates_are_correct() {
        for s in spain_june_2026() {
            assert_eq!(s.params.checkin.to_string(), "2026-06-01");
            assert_eq!(s.params.checkout.to_string(), "2026-06-30");
        }
    }
}
