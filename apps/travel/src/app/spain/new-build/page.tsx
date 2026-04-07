import type { Metadata } from "next";
import { queryNewBuilds } from "@/lib/newbuild";
import { NewBuildPageContent } from "./NewBuildPageContent";

export const metadata: Metadata = {
  title: "Obra Nueva Costa Spania — Apartamente noi lângă mare",
  description:
    "Complexe noi (obra nueva) pe coastă: Costa Blanca, Costa del Sol, Murcia. Cele mai ieftine.",
};

export default async function NewBuildPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const maxPrice = Number(params.max_price) || 150_000;
  const zone = typeof params.zone === "string" ? params.zone : undefined;
  const minBedrooms = Number(params.min_bedrooms) || undefined;
  const hasPool =
    params.pool === "true" ? true : params.pool === "false" ? false : undefined;

  const data = queryNewBuilds({ maxPrice, zone, minBedrooms, hasPool });

  return <NewBuildPageContent data={data} />;
}
