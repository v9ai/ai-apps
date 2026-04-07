//! Airbnb URL builder crate.
//!
//! Airbnb closed their public API in 2023, but their search URLs accept
//! query parameters.  This crate builds pre-filtered search URLs for
//! long-stay rentals across Spanish coastal regions.
//!
//! Usage:
//! ```rust
//! use airbnb::{SearchParams, Amenity, RoomType, Region, build_url, spain_june_2026};
//!
//! // Custom search
//! let params = SearchParams::builder()
//!     .location("Torrevieja, Spain")
//!     .checkin("2026-06-01")
//!     .checkout("2026-06-30")
//!     .price_max(50)
//!     .amenity(Amenity::Pool)
//!     .room_type(RoomType::EntireHome)
//!     .build();
//! let url = build_url(&params);
//!
//! // Pre-built Spain June 2026 searches
//! let all = spain_june_2026();
//! ```

pub mod regions;
pub mod url_builder;

pub use regions::{Region, CoastalZone, spain_june_2026, all_regions};
pub use url_builder::{SearchParams, SearchParamsBuilder, Amenity, RoomType, build_url};
