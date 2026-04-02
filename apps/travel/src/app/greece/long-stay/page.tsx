import type { Metadata } from "next";
import { LongStayPageContent } from "./LongStayPageContent";

export const metadata: Metadata = {
  title: "Greece Long-Stay Rentals — Beach Houses with Parking",
  description:
    "Monthly rentals in Greece near the beach with parking. Houses, villas and apartments for 28+ nights under €1,500/month.",
};

export default function LongStayPage() {
  return <LongStayPageContent />;
}
