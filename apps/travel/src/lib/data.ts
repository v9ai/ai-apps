import rawData from "@/data/places.json";
import type { PlacesData, Place } from "./types";
import { type Category } from "./categories";

export const data = rawData as PlacesData;

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
