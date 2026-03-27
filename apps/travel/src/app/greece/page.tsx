import type { Metadata } from "next";
import { GreecePageContent } from "./GreecePageContent";

export const metadata: Metadata = {
  title: "Greece Hotels — New in 2026",
  description:
    "Newly opened hotels in Greece discovered via web scraping + Candle semantic retrieval. Vector search powered by all-MiniLM-L6-v2 embeddings and LanceDB.",
};

export default function GreecePage() {
  return <GreecePageContent />;
}
