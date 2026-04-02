import type { Category } from "./categories";

export interface PlaceBooking {
  type: "ticket" | "reservation" | "free_entry" | "guided_tour";
  needs_reservation: boolean;
  best_time_to_visit: string;
  estimated_cost: { pln: number; eur: number };
  nearby_hotel_area: string;
  combined_with: string[];
  advance_booking_days: number;
  platform_urls: Record<string, string>;
}

export interface Place {
  name: string;
  description: string;
  description_ro?: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  visit_duration: string;
  visit_duration_ro?: string;
  tips: string;
  tips_ro?: string;
  maps_url: string;
  maps_embed_query: string;
  tripadvisor_url?: string;
  image_query?: string;
  price_level?: "budget" | "moderate" | "premium";
  price_display?: string;
  kid_friendly?: boolean;
  family_score?: number;       // 0–1
  family_tips?: string;
  family_tips_ro?: string;
  family_cost?: {
    adults: number;
    kids: number;
    total_eur: number;
  };
  booking?: PlaceBooking;
}

export interface CuratedHotel {
  name: string;
  property_id: string;
  address: string;
  url: string;
}

export interface BookingSummary {
  total_estimated_cost: { pln: number; eur: number };
  places_needing_reservation: string[];
  hotel_search_url: string;
  curated_hotels?: CuratedHotel[];
  group_size?: { adults: number; kids: number };
  family_total_cost?: { eur: number };
  family_note?: string;
  budget_breakdown?: BudgetBreakdown;
  itinerary?: ItineraryDay[];
}

// ── Naples itinerary & budget types ──

export type KidEnergyLevel = "low" | "low-medium" | "medium" | "medium-high" | "high";

export interface ItineraryDay {
  day: number;
  theme: string;
  theme_ro?: string;
  kid_energy: KidEnergyLevel;
  places: string[];
  tip: string;
  tip_ro?: string;
  cost_estimate_eur: number;
  all_kid_friendly: boolean;
}

export interface BudgetBreakdown {
  hotel_eur: number;
  food_eur: number;
  activities_eur: number;
  transport_eur: number;
  buffer_eur: number;
  total_eur: number;
  stay_days: number;
  per_person_per_day_eur: number;
  hotel_per_night_eur?: number;
  notes?: Record<string, string>;
}

export interface PlacesData {
  city: string;
  city_overview: string;
  city_overview_ro?: string;
  places: Place[];
  rankings?: {
    best: string[];
    cheapest: string[];
  };
  seo?: Record<string, unknown>;
  booking_summary?: BookingSummary;
}

// ── Hotel semantic search results ──

export interface ReviewResult {
  text: string;
  source: string;
  sentiment: number;
  aspects: string[];
  is_representative: boolean;
}

export interface HotelResult {
  hotel_id: string;
  name: string;
  description: string;
  star_rating: number;
  board_type: string;
  price_eur: number;
  location: string;
  region: string;
  lat: number;
  lng: number;
  source_url: string;
  amenities: string[];
  image_url: string | null;
  gallery?: string[];
  opened_year?: number;
  // Review analysis
  reviews?: ReviewResult[];
  sentiment_score?: number;
  value_score?: number;
  aspect_scores?: Record<string, number>;
  review_summary?: string;
  pros?: string[];
  cons?: string[];
  review_count?: number;
  review_rating?: number;
  discovery_score?: number;
}

export interface HotelSearchResult {
  hotel: HotelResult;
  score: number;
}

// ── Long-stay rental search results ──

export type PropertyType = "house" | "apartment" | "villa" | "studio";
export type SourcePlatform = "airbnb" | "booking_com" | "spitogatos" | "curated";

export interface LongStayRental {
  rental_id: string;
  name: string;
  description: string;
  property_type: PropertyType;
  monthly_price_eur: number;
  bedrooms: number | null;
  max_guests: number | null;
  location: string;
  region: string;
  lat: number;
  lng: number;
  source_url: string;
  amenities: string[];
  has_parking: boolean;
  beach_distance_km: number | null; // null = unknown
  image_url: string | null;
  gallery?: string[];
  min_nights: number;
  source_platform: SourcePlatform;
}

export interface LongStayScore {
  rental_id: string;
  total_score: number;       // 0–100
  price_score: number;       // 0–1
  beach_score: number;       // 0–1
  parking_score: number;     // 0 or 1
  amenity_score: number;     // 0–1
  embedding_score: number;   // 0–1
}

// Flattened output (matches Rust #[serde(flatten)])
export interface LongStayResult extends LongStayRental {
  score: LongStayScore;
}
