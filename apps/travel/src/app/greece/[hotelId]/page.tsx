import type { Metadata } from "next";
import { hotels2026 } from "@/lib/data";
import { HotelDetailContent } from "@/components/HotelDetailContent";

export function generateStaticParams() {
  return hotels2026.map((r) => ({ hotelId: r.hotel.hotel_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}): Promise<Metadata> {
  const { hotelId } = await params;
  const result = hotels2026.find((r) => r.hotel.hotel_id === hotelId);
  if (!result) return {};
  const h = result.hotel;
  return {
    title: `${h.name} — ${h.location} | Greece Hotels 2026`,
    description: `${h.star_rating}-star ${h.board_type} in ${h.location}. ${h.description.slice(0, 140)}`,
  };
}

export default async function HotelDetailPage({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  return <HotelDetailContent hotelId={hotelId} />;
}
