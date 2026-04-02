import rawData from "@/data/places.json";
import rawHotels2026 from "@/data/hotels_2026.json";
import rawNapoliData from "@/data/napoli_places.json";
import rawLongStay from "@/data/long_stay_2026.json";
import type { PlacesData, Place, HotelSearchResult, LongStayResult } from "./types";
import { type Category } from "./categories";

export const data = rawData as PlacesData;
export const hotels2026 = rawHotels2026 as HotelSearchResult[];
export const napoliData = rawNapoliData as PlacesData;
export const longStay2026 = rawLongStay as LongStayResult[];

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
