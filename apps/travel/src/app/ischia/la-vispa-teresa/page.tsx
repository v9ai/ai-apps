import type { Metadata } from "next";
import { LaVispaTeresaDetail } from "./LaVispaTeresaDetail";

export const metadata: Metadata = {
  title: "La Vispa Teresa — Ischia Porto, B&B | 9.7 Exceptional",
  description:
    "B&B in Ischia Porto, rated 9.7/10. Junior Suite with breakfast, free WiFi, garden, parking. 31 May – 6 Jun 2026, 2 adults + 1 child.",
};

export default function LaVispaTeresaPage() {
  return <LaVispaTeresaDetail />;
}
