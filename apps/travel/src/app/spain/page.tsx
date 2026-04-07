import type { Metadata } from "next";
import { queryAirbnb } from "@/lib/airbnb";
import { queryNewBuilds } from "@/lib/newbuild";
import { SpainPageContent } from "./SpainPageContent";

export const metadata: Metadata = {
  title: "Spain — Travel Guide · Airbnb Iunie 2026 · Obra Nueva",
  description:
    "Spain travel guide with regions, Airbnb rentals for June 2026, and new-build coastal properties.",
  openGraph: {
    title: "Spain — Travel Guide",
    description:
      "Curated Spain guide: regions, Airbnb June 2026 deals, and obra nueva coastal apartments.",
    locale: "en_GB",
    type: "website",
  },
};

export default async function SpainPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const priceMax = Number(params.price_max) || 50;
  const region =
    typeof params.region === "string" ? params.region : undefined;

  const maxPrice = Number(params.max_price) || 150_000;
  const zone = typeof params.zone === "string" ? params.zone : undefined;
  const minBedrooms = Number(params.min_bedrooms) || undefined;
  const hasPool =
    params.pool === "true" ? true : params.pool === "false" ? false : undefined;

  const airbnbData = queryAirbnb({ priceMax, region });
  const newBuildData = queryNewBuilds({ maxPrice, zone, minBedrooms, hasPool });

  return <SpainPageContent airbnbData={airbnbData} newBuildData={newBuildData} />;
}
