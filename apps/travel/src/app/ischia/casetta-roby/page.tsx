import type { Metadata } from "next";
import { CasettaRobyDetail } from "./CasettaRobyDetail";

export const metadata: Metadata = {
  title: "Casetta Roby — Centro Storico, Naples | Apartment",
  description:
    "Apartment in Naples Centro Storico, next to Naples Cathedral & Cappella Sansevero. Kitchen, AC, 1 bedroom. 31 May – 7 Jun 2026, 2 adults + 1 child.",
};

export default function CasettaRobyPage() {
  return <CasettaRobyDetail />;
}
