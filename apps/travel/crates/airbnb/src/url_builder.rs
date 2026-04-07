//! Airbnb search URL builder.
//!
//! Constructs `https://www.airbnb.com/s/{location}/homes?...` URLs with
//! typed query parameters.  No HTTP calls — pure URL construction.

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use url::Url;

// ── Enums ───────────────────────────────────────────────────────────────

/// Airbnb amenity filter IDs.
///
/// These are the numeric IDs Airbnb uses in the `amenities[]` query param.
/// Source: reverse-engineered from Airbnb search URLs (April 2026).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Amenity {
    /// Pool (ID 7)
    Pool = 7,
    /// Kitchen (ID 8)
    Kitchen = 8,
    /// WiFi (ID 4)
    Wifi = 4,
    /// Free parking (ID 9)
    FreeParking = 9,
    /// Air conditioning (ID 5)
    AirConditioning = 5,
    /// Washing machine (ID 33)
    WashingMachine = 33,
    /// Gym (ID 15)
    Gym = 15,
    /// Hot tub (ID 25)
    HotTub = 25,
    /// BBQ grill (ID 38)
    BbqGrill = 38,
    /// Beachfront (ID 671)
    Beachfront = 671,
}

impl Amenity {
    pub fn id(self) -> u16 {
        self as u16
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Pool => "Pool",
            Self::Kitchen => "Kitchen",
            Self::Wifi => "Wi-Fi",
            Self::FreeParking => "Free parking",
            Self::AirConditioning => "Air conditioning",
            Self::WashingMachine => "Washing machine",
            Self::Gym => "Gym",
            Self::HotTub => "Hot tub",
            Self::BbqGrill => "BBQ grill",
            Self::Beachfront => "Beachfront",
        }
    }
}

/// Airbnb room type filter values.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RoomType {
    EntireHome,
    PrivateRoom,
    SharedRoom,
}

impl RoomType {
    pub fn query_value(self) -> &'static str {
        match self {
            Self::EntireHome => "Entire home/apt",
            Self::PrivateRoom => "Private room",
            Self::SharedRoom => "Shared room",
        }
    }
}

// ── Search params ───────────────────────────────────────────────────────

/// All parameters for an Airbnb search URL.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchParams {
    pub location: String,
    pub checkin: NaiveDate,
    pub checkout: NaiveDate,
    pub price_min: Option<u32>,
    pub price_max: Option<u32>,
    pub min_bedrooms: Option<u8>,
    pub min_bathrooms: Option<u8>,
    pub adults: Option<u8>,
    pub children: Option<u8>,
    pub amenities: Vec<Amenity>,
    pub room_types: Vec<RoomType>,
    /// Number of results per page (Airbnb default is 20).
    pub items_per_grid: Option<u8>,
}

/// Builder for [`SearchParams`].
pub struct SearchParamsBuilder {
    location: String,
    checkin: NaiveDate,
    checkout: NaiveDate,
    price_min: Option<u32>,
    price_max: Option<u32>,
    min_bedrooms: Option<u8>,
    min_bathrooms: Option<u8>,
    adults: Option<u8>,
    children: Option<u8>,
    amenities: Vec<Amenity>,
    room_types: Vec<RoomType>,
    items_per_grid: Option<u8>,
}

impl SearchParams {
    /// Start building search params.
    pub fn builder() -> SearchParamsBuilder {
        SearchParamsBuilder {
            location: String::new(),
            checkin: NaiveDate::from_ymd_opt(2026, 6, 1).unwrap(),
            checkout: NaiveDate::from_ymd_opt(2026, 6, 30).unwrap(),
            price_min: None,
            price_max: None,
            min_bedrooms: None,
            min_bathrooms: None,
            adults: None,
            children: None,
            amenities: Vec::new(),
            room_types: Vec::new(),
            items_per_grid: None,
        }
    }

    /// Total nights for this search.
    pub fn nights(&self) -> i64 {
        (self.checkout - self.checkin).num_days()
    }

    /// Estimated max monthly cost based on price_max × nights.
    pub fn estimated_max_monthly_eur(&self) -> Option<u32> {
        self.price_max.map(|p| p * self.nights() as u32)
    }
}

impl SearchParamsBuilder {
    pub fn location(mut self, loc: &str) -> Self {
        self.location = loc.to_string();
        self
    }

    pub fn checkin(mut self, date: &str) -> Self {
        if let Ok(d) = NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            self.checkin = d;
        }
        self
    }

    pub fn checkout(mut self, date: &str) -> Self {
        if let Ok(d) = NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            self.checkout = d;
        }
        self
    }

    pub fn price_min(mut self, min: u32) -> Self {
        self.price_min = Some(min);
        self
    }

    pub fn price_max(mut self, max: u32) -> Self {
        self.price_max = Some(max);
        self
    }

    pub fn min_bedrooms(mut self, n: u8) -> Self {
        self.min_bedrooms = Some(n);
        self
    }

    pub fn min_bathrooms(mut self, n: u8) -> Self {
        self.min_bathrooms = Some(n);
        self
    }

    pub fn adults(mut self, n: u8) -> Self {
        self.adults = Some(n);
        self
    }

    pub fn children(mut self, n: u8) -> Self {
        self.children = Some(n);
        self
    }

    pub fn amenity(mut self, a: Amenity) -> Self {
        if !self.amenities.contains(&a) {
            self.amenities.push(a);
        }
        self
    }

    pub fn amenities(mut self, list: &[Amenity]) -> Self {
        for &a in list {
            if !self.amenities.contains(&a) {
                self.amenities.push(a);
            }
        }
        self
    }

    pub fn room_type(mut self, rt: RoomType) -> Self {
        if !self.room_types.contains(&rt) {
            self.room_types.push(rt);
        }
        self
    }

    pub fn items_per_grid(mut self, n: u8) -> Self {
        self.items_per_grid = Some(n);
        self
    }

    pub fn build(self) -> SearchParams {
        SearchParams {
            location: self.location,
            checkin: self.checkin,
            checkout: self.checkout,
            price_min: self.price_min,
            price_max: self.price_max,
            min_bedrooms: self.min_bedrooms,
            min_bathrooms: self.min_bathrooms,
            adults: self.adults,
            children: self.children,
            amenities: self.amenities,
            room_types: self.room_types,
            items_per_grid: self.items_per_grid,
        }
    }
}

// ── URL builder ─────────────────────────────────────────────────────────

/// Build an Airbnb search URL from [`SearchParams`].
///
/// The location is URL-encoded into the path segment:
/// `https://www.airbnb.com/s/{location}/homes?checkin=...&checkout=...`
pub fn build_url(params: &SearchParams) -> String {
    let location_slug = params
        .location
        .replace(", ", "--")
        .replace(' ', "-");

    let base = format!("https://www.airbnb.com/s/{location_slug}/homes");
    let mut url = Url::parse(&base).expect("valid base URL");

    {
        let mut q = url.query_pairs_mut();

        q.append_pair("checkin", &params.checkin.format("%Y-%m-%d").to_string());
        q.append_pair("checkout", &params.checkout.format("%Y-%m-%d").to_string());

        if let Some(min) = params.price_min {
            q.append_pair("price_min", &min.to_string());
        }
        if let Some(max) = params.price_max {
            q.append_pair("price_max", &max.to_string());
        }
        if let Some(n) = params.min_bedrooms {
            q.append_pair("min_bedrooms", &n.to_string());
        }
        if let Some(n) = params.min_bathrooms {
            q.append_pair("min_bathrooms", &n.to_string());
        }
        if let Some(n) = params.adults {
            q.append_pair("adults", &n.to_string());
        }
        if let Some(n) = params.children {
            q.append_pair("children", &n.to_string());
        }
        for amenity in &params.amenities {
            q.append_pair("amenities[]", &amenity.id().to_string());
        }
        for rt in &params.room_types {
            q.append_pair("room_types[]", rt.query_value());
        }
        if let Some(n) = params.items_per_grid {
            q.append_pair("items_per_grid", &n.to_string());
        }
    }

    url.to_string()
}

// ── Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_url_construction() {
        let params = SearchParams::builder()
            .location("Salou, Spain")
            .checkin("2026-06-01")
            .checkout("2026-06-30")
            .price_max(50)
            .amenity(Amenity::Pool)
            .room_type(RoomType::EntireHome)
            .build();

        let url = build_url(&params);
        assert!(url.starts_with("https://www.airbnb.com/s/Salou--Spain/homes?"));
        assert!(url.contains("checkin=2026-06-01"));
        assert!(url.contains("checkout=2026-06-30"));
        assert!(url.contains("price_max=50"));
        assert!(url.contains("amenities%5B%5D=7")); // Pool = 7
        assert!(url.contains("room_types%5B%5D=Entire+home%2Fapt"));
    }

    #[test]
    fn nights_calculation() {
        let params = SearchParams::builder()
            .location("Test")
            .checkin("2026-06-01")
            .checkout("2026-06-30")
            .build();
        assert_eq!(params.nights(), 29);
    }

    #[test]
    fn estimated_monthly_cost() {
        let params = SearchParams::builder()
            .location("Test")
            .checkin("2026-06-01")
            .checkout("2026-06-30")
            .price_max(50)
            .build();
        assert_eq!(params.estimated_max_monthly_eur(), Some(50 * 29));
    }

    #[test]
    fn multiple_amenities() {
        let params = SearchParams::builder()
            .location("Valencia, Spain")
            .amenities(&[Amenity::Pool, Amenity::Kitchen, Amenity::AirConditioning])
            .build();

        let url = build_url(&params);
        assert!(url.contains("amenities%5B%5D=7"));  // Pool
        assert!(url.contains("amenities%5B%5D=8"));  // Kitchen
        assert!(url.contains("amenities%5B%5D=5"));  // AC
    }

    #[test]
    fn no_duplicate_amenities() {
        let params = SearchParams::builder()
            .location("Test")
            .amenity(Amenity::Pool)
            .amenity(Amenity::Pool)
            .build();
        assert_eq!(params.amenities.len(), 1);
    }

    #[test]
    fn url_special_characters() {
        let params = SearchParams::builder()
            .location("Almuñécar, Spain")
            .build();
        let url = build_url(&params);
        assert!(url.contains("Almun%CC%83e%CC%81car") || url.contains("Almu%C3%B1%C3%A9car") || url.contains("Almuñécar"));
    }
}
