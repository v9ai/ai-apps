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

// ── Hotel semantic search results (from Rust Candle+LanceDB pipeline) ──

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
  // Candle ML review analysis
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
