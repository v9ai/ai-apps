import type { Metadata } from "next";
import { MarontiContent } from "./MarontiContent";

export const metadata: Metadata = {
  title: "Hotel Maronti — Barano d'Ischia | Beachfront Stay",
  description:
    "Hotel Maronti: family-run beachfront hotel on Maronti Beach, Ischia. 1-minute walk to the island's largest beach. Breakfast included, free beach service, jacuzzi garden. May 31 – Jun 6, 2026.",
  openGraph: {
    title: "Hotel Maronti — Barano d'Ischia",
    description:
      "Beachfront family hotel on Maronti Beach, Ischia. Breakfast included, free beach service, jacuzzi. 6-night stay for 2 adults + 1 child.",
    locale: "en_GB",
    type: "website",
  },
};

export default function MarontiPage() {
  return <MarontiContent />;
}
