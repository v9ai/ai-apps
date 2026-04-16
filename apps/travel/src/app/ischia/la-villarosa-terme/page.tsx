import type { Metadata } from "next";
import { VillarosaContent } from "./VillarosaContent";

export const metadata: Metadata = {
  title: "Hotel La Villarosa Terme — Ischia Porto | Thermal Hotel & Private Beach",
  description:
    "19th-century thermal hotel in central Ischia Porto. Thermal pool, private beach, rooftop restaurant with sea views. Breakfast, half board, or full board from ~€220/night.",
};

export default function VillarosaPage() {
  return <VillarosaContent />;
}
