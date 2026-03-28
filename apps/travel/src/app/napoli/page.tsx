import type { Metadata } from "next";
import { NapoliPageContent } from "./NapoliPageContent";

export const metadata: Metadata = {
  title: "Naples — A Field Guide to Southern Italy's Capital",
  description:
    "Ten essential places in Naples, Italy — from Spaccanapoli's Roman spine to the underground cisterns beneath the city. A curated guide to the Mediterranean's most intense city, plus how to reach Capri by ferry.",
  openGraph: {
    title: "Naples — A Field Guide to Southern Italy's Capital",
    description:
      "Ten essential places in Naples: baroque piazzas, archaeological museums, subterranean aqueducts, and the world's most serious pizza. Plus the ferry to Capri.",
    locale: "en_GB",
    type: "website",
  },
};

export default function NapoliPage() {
  return <NapoliPageContent />;
}
