import type { Metadata } from "next";
import { SpainPageContent } from "./SpainPageContent";

export const metadata: Metadata = {
  title: "Spain — Travel Guide",
  description:
    "Spain travel guide: regions, cities, and places to discover.",
  openGraph: {
    title: "Spain — Travel Guide",
    description:
      "Curated Spain travel guide with regions, cities, and essential places.",
    locale: "en_GB",
    type: "website",
  },
};

export default function SpainPage() {
  return <SpainPageContent />;
}
