import { NextRequest, NextResponse } from "next/server";
import { queryAirbnb } from "@/lib/airbnb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const data = queryAirbnb({
    priceMax: Number(searchParams.get("price_max")) || undefined,
    region: searchParams.get("region") ?? undefined,
    checkin: searchParams.get("checkin") ?? undefined,
    checkout: searchParams.get("checkout") ?? undefined,
  });

  return NextResponse.json(data);
}
