import type { Metadata } from "next";
import { TifeoContent } from "./TifeoContent";

export const metadata: Metadata = {
  title: "Il Soffio di Tifeo Resort — Forio, Ischia | Aparthotel",
  description:
    "Il Soffio di Tifeo: 4-star aparthotel in Forio, Ischia. Heated pool, jacuzzi, sauna, Turkish bath. Self-catering apartments with sea views. 9.8/10 on Booking.com. May 31 – Jun 6, 2026.",
  openGraph: {
    title: "Il Soffio di Tifeo Resort — Forio, Ischia",
    description:
      "4-star aparthotel with heated pool, jacuzzi, sauna & Turkish bath. Self-catering apartments near Citara Beach. 6-night stay for 2 adults + 1 child.",
    locale: "en_GB",
    type: "website",
  },
};

export default function TifeoPage() {
  return <TifeoContent />;
}
