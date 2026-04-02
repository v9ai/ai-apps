import type { Metadata } from "next";
import { data } from "@/lib/data";
import { BookingsPageContent } from "@/components/BookingsPageContent";

export const metadata: Metadata = {
  title: `Book ${data.city} — Hotels & Reservations`,
  description: `Plan your stay in ${data.city}, Poland. Curated hotel picks, reservation info, and cost estimates for ${data.places.length} places.`,
  openGraph: {
    title: `Book ${data.city} — Hotels & Reservations`,
    description: `Curated hotels and booking info for your ${data.city} trip.`,
  },
};

export default function BookingsPage() {
  return <BookingsPageContent />;
}
