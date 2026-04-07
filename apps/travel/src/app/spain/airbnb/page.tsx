import type { Metadata } from "next";
import { queryAirbnb } from "@/lib/airbnb";
import { AirbnbPageContent } from "./AirbnbPageContent";

export const metadata: Metadata = {
  title: "Airbnb Spania Iunie 2026 — Piscină, max 50€/noapte",
  description:
    "Link-uri directe Airbnb cu filtre pre-setate: piscină, casă întreagă, max 50€/noapte, iunie 2026.",
  openGraph: {
    title: "Airbnb Spania Iunie 2026",
    description:
      "Link-uri directe Airbnb: Costa Dorada, Costa Blanca, Costa del Sol, Valencia, Murcia.",
    locale: "ro_RO",
    type: "website",
  },
};

export default async function AirbnbPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const priceMax = Number(params.price_max) || 50;
  const region =
    typeof params.region === "string" ? params.region : undefined;

  const data = queryAirbnb({ priceMax, region });

  return <AirbnbPageContent data={data} />;
}
