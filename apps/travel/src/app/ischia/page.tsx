import type { Metadata } from "next";
import { IschiaPageContent } from "./IschiaPageContent";
import { DAYS } from "./constants";

export const metadata: Metadata = {
  title: `Ischia Thermal Baths Guide — ${DAYS}-Day Itinerary for Families`,
  description:
    `Complete Ischia thermal baths guide: ${DAYS}-day itinerary covering 6 thermal parks, free hot springs, volcanic mud therapy, family-friendly accommodation, and ferry connections from Naples.`,
  openGraph: {
    title: `Ischia Thermal Baths — ${DAYS}-Day Family Guide`,
    description:
      `${DAYS} days on Ischia island: thermal parks (Poseidon, Negombo, Castiglione), free hot springs at Sorgeto Bay, volcanic mud therapy, and thermal hotel tiers for 2 adults + 1 child.`,
    locale: "en_GB",
    type: "website",
  },
};

export default function IschiaPage() {
  return <IschiaPageContent />;
}
