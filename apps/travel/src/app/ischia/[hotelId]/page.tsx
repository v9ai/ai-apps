import type { Metadata } from "next";
import { ISCHIA_HOTELS } from "../hotels";
import { IschiaHotelDetail } from "./IschiaHotelDetail";

export function generateStaticParams() {
  return ISCHIA_HOTELS.map((h) => ({ hotelId: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}): Promise<Metadata> {
  const { hotelId } = await params;
  const hotel = ISCHIA_HOTELS.find((h) => h.slug === hotelId);
  if (!hotel) return {};
  const h = hotel.en;
  return {
    title: `${h.name} — ${h.area}, Ischia | Thermal Hotel`,
    description: `${h.thermalPools} thermal pools. ${h.board}. ${h.thermalDetail.slice(0, 120)}`,
  };
}

export default async function IschiaHotelPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  return <IschiaHotelDetail slug={hotelId} />;
}
