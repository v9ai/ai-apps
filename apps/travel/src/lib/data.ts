import rawData from "@/data/places.json";
import rawHotels2026 from "@/data/hotels_2026.json";
import rawNapoliData from "@/data/napoli_places.json";
import rawLongStay from "@/data/long_stay_2026.json";
import rawScrapedReviews from "../../data/scraped_reviews.json";
import type { PlacesData, Place, HotelSearchResult, LongStayResult, KatowiceHotel } from "./types";
import { type Category } from "./categories";

export const data = rawData as PlacesData;
export const hotels2026 = rawHotels2026 as HotelSearchResult[];
export const napoliData = rawNapoliData as PlacesData;
export const longStay2026 = rawLongStay as LongStayResult[];
export const scrapedReviews = rawScrapedReviews as Record<string, { review_rating: number; review_count: number; review_texts: string[]; gallery: string[]; sources: string[] }>;

export function getPlacesByCategory(category: Category): Place[] {
  return data.places.filter((p) => p.category === category);
}

export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of data.places) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  return counts;
}

export function getHotelById(hotelId: string): HotelSearchResult | undefined {
  return hotels2026.find((r) => r.hotel.hotel_id === hotelId);
}

export function getKatowiceHotelsWithReviews(): KatowiceHotel[] {
  // Get curated hotels from booking_summary
  const curatedHotels = data.booking_summary?.curated_hotels ?? [];
  
  // Map curated hotels to KatowiceHotel with review data
  return curatedHotels.map((hotel) => {
    // Check if this is a Katowice hotel with hotel_id
    const hotelWithId = hotel as Partial<KatowiceHotel>;
    const hotelId = hotelWithId.hotel_id;
    
    // Get review data from scraped reviews if available
    const reviewData = hotelId ? scrapedReviews[hotelId] : null;
    
    return {
      ...hotel,
      hotel_id: hotelId || hotel.property_id,
      rating: hotelWithId.rating || reviewData?.review_rating || 0,
      review_count: hotelWithId.review_count || reviewData?.review_count || 0,
      price_eur: hotelWithId.price_eur || 0,
      amenities: hotelWithId.amenities || [],
      recommendation_reason: hotelWithId.recommendation_reason || "",
      is_recommended: hotelWithId.is_recommended || false,
      gallery: reviewData?.gallery || hotelWithId.gallery || [],
      review_texts: reviewData?.review_texts || [],
      sources: reviewData?.sources || [],
    } as KatowiceHotel;
  });
}
