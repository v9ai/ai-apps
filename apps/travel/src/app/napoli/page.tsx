import type { Metadata } from "next";
import { NapoliPageContent } from "./NapoliPageContent";

export const metadata: Metadata = {
  title: "Naples Family Guide — 7-Day Itinerary, €1,000 Budget for 3",
  description:
    "Complete Naples family travel guide for 2 adults + 1 child: ML-optimised 7-day itinerary, €1,000 budget breakdown, kid-friendly places, and ferry connections to Capri. Candle all-MiniLM-L6-v2 family scoring.",
  openGraph: {
    title: "Naples Family Guide — 7-Day Itinerary & €1,000 Budget",
    description:
      "Seven days in Naples with 2 adults and 1 child on €1,000: budget planner, kid-friendly ratings for every place, day-by-day itinerary from Spaccanapoli to Pompeii, and how to get to Capri.",
    locale: "en_GB",
    type: "website",
  },
};

export default function NapoliPage() {
  return <NapoliPageContent />;
}
