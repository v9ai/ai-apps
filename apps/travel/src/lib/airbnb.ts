// ── Airbnb data + URL builder (server-only) ─────────────────────────────
// Mirrors crates/airbnb logic. All processing happens at request time on
// the server — the client receives pre-built URLs and computed totals.

// ── URL builder ─────────────────────────────────────────────────────────

const AMENITY_IDS: Record<string, number> = {
  Pool: 7,
  Kitchen: 8,
  Wifi: 4,
  FreeParking: 9,
  AirConditioning: 5,
  WashingMachine: 33,
  Beachfront: 671,
};

function buildAirbnbUrl(
  city: string,
  country: string,
  priceMax: number,
  amenities: string[],
  roomType: string,
  checkin: string,
  checkout: string
): string {
  const slug = `${city}, ${country}`.replace(/, /g, "--").replace(/ /g, "-");
  const encoded = encodeURIComponent(slug);
  const params = new URLSearchParams();
  params.set("checkin", checkin);
  params.set("checkout", checkout);
  params.set("price_max", String(priceMax));
  for (const a of amenities) {
    const id = AMENITY_IDS[a];
    if (id) params.append("amenities[]", String(id));
  }
  params.append("room_types[]", roomType);
  return `https://www.airbnb.com/s/${encoded}/homes?${params.toString()}`;
}

// ── Region data ─────────────────────────────────────────────────────────

interface CityEntry {
  city: string;
  country: string;
  note?: string;
}

interface RegionData {
  region: string;
  regionRo: string;
  cities: CityEntry[];
}

const REGIONS: RegionData[] = [
  {
    region: "Costa Dorada",
    regionRo: "Costa Dorada (1h de Barcelona)",
    cities: [
      { city: "Salou", country: "Spain" },
      { city: "Cambrils", country: "Spain" },
      { city: "Calafell", country: "Spain" },
    ],
  },
  {
    region: "Costa Blanca",
    regionRo: "Costa Blanca (cele mai ieftine)",
    cities: [
      { city: "Torrevieja", country: "Spain", note: "Cel mai ieftin de pe coastă" },
      { city: "Alicante", country: "Spain", note: "San Juan plajă" },
      { city: "Benidorm", country: "Spain" },
      { city: "Dénia", country: "Spain" },
    ],
  },
  {
    region: "Costa del Sol",
    regionRo: "Costa del Sol (Andaluzia)",
    cities: [
      { city: "Torre del Mar", country: "Spain" },
      { city: "Torremolinos", country: "Spain" },
      { city: "Almuñécar", country: "Spain" },
      { city: "Fuengirola", country: "Spain" },
    ],
  },
  {
    region: "Valencia",
    regionRo: "Valencia",
    cities: [
      { city: "Valencia", country: "Spain", note: "Plajă + oraș mare" },
    ],
  },
  {
    region: "Murcia / Costa Cálida",
    regionRo: "Murcia / Costa Cálida",
    cities: [
      { city: "La Manga del Mar Menor", country: "Spain", note: "Două mări" },
      { city: "Águilas", country: "Spain" },
    ],
  },
];

export const TIPS = [
  "Prețul afișat pe noapte NU include taxa de curățenie — pune max 40-45€/noapte ca să rămâi sub 1500€ total",
  "Filtrează \"New\" sau caută \"new build\", \"renovated 2023/2024\", \"obra nueva\"",
  "Torrevieja are cele mai multe rezultate sub 1500€ — cel mai ieftin de pe coasta Spaniei",
  "Iunie prima jumătate e mai ieftin decât a doua (pre-sezon vs. sezon)",
  "Cere reducere monthly discount direct gazdei — mulți dau 10-20% pt 28+ nopți",
  "Verifică scorul gazdei: Superhost + 4.8+ = safe bet",
];

// ── Public types ────────────────────────────────────────────────────────

export interface CityResult {
  city: string;
  country: string;
  note: string | null;
  url: string;
  priceMax: number;
  estimatedTotal: number;
}

export interface RegionResult {
  region: string;
  regionRo: string;
  cities: CityResult[];
}

export interface AirbnbData {
  filters: {
    priceMax: number;
    checkin: string;
    checkout: string;
    nights: number;
    amenities: string[];
    roomType: string;
  };
  stats: { regions: number; cities: number };
  regions: RegionResult[];
  tips: string[];
}

// ── Query logic ─────────────────────────────────────────────────────────

export interface AirbnbQuery {
  priceMax?: number;
  region?: string;
  checkin?: string;
  checkout?: string;
}

export function queryAirbnb(q: AirbnbQuery = {}): AirbnbData {
  const priceMax = Math.min(Math.max(q.priceMax ?? 50, 10), 200);
  const checkin = q.checkin || "2026-06-01";
  const checkout = q.checkout || "2026-06-30";
  const regionFilter = q.region?.toLowerCase();

  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);
  const nights = Math.max(
    1,
    Math.round((checkoutDate.getTime() - checkinDate.getTime()) / 86_400_000)
  );

  const amenities = ["Pool"];
  const roomType = "Entire home/apt";

  const filtered = regionFilter
    ? REGIONS.filter(
        (r) =>
          r.region.toLowerCase().includes(regionFilter) ||
          r.regionRo.toLowerCase().includes(regionFilter)
      )
    : REGIONS;

  const regions: RegionResult[] = filtered.map((r) => ({
    region: r.region,
    regionRo: r.regionRo,
    cities: r.cities.map((c) => ({
      city: c.city,
      country: c.country,
      note: c.note ?? null,
      url: buildAirbnbUrl(c.city, c.country, priceMax, amenities, roomType, checkin, checkout),
      priceMax,
      estimatedTotal: priceMax * nights,
    })),
  }));

  const totalCities = regions.reduce((acc, r) => acc + r.cities.length, 0);

  return {
    filters: { priceMax, checkin, checkout, nights, amenities, roomType },
    stats: { regions: regions.length, cities: totalCities },
    regions,
    tips: TIPS,
  };
}
