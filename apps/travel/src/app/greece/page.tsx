import type { Metadata } from "next";
import { GreecePageContent } from "./GreecePageContent";
import { DISCOVERY_YEAR } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Greece Hotels — New in ${DISCOVERY_YEAR}`,
  description:
    "Newly opened hotels in Greece discovered via web scraping and semantic retrieval.",
};

export default function GreecePage() {
  return <GreecePageContent />;
}
