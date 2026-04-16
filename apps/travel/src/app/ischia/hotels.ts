import { NIGHTS, DATE_RANGE_LABEL } from "./constants";

export interface IschiaHotel {
  slug: string;
  tierIndex: number;
  name: string;
  area: string;
  price: string;
  priceNum: number;
  note: string;
  thermalPools: string;
  thermalDetail: string;
  board: string;
  bestFor: string;
  qualityPrice: number;
}

export interface IschiaHotelBilingual {
  slug: string;
  tierIndex: number;
  priceNum: number;
  en: Omit<IschiaHotel, "slug" | "tierIndex" | "priceNum">;
  ro: Omit<IschiaHotel, "slug" | "tierIndex" | "priceNum">;
}

export interface TierMeta {
  en: { tier: string; price: string; total: string; type: string; neighbourhoods: string; expect: string; goodFor: string };
  ro: { tier: string; price: string; total: string; type: string; neighbourhoods: string; expect: string; goodFor: string };
}

export const TIER_META: TierMeta[] = [
  {
    en: {
      tier: "Budget Thermal",
      price: "€100–150 / night",
      total: `${NIGHTS} nights ≈ €${NIGHTS * 125}`,
      type: "3-star thermal hotels, agriturismo with thermal pool, family B&Bs",
      neighbourhoods: "Casamicciola Terme, Forio, Barano",
      expect: "Family room with thermal pool access included in rate. Simple rooms, genuine thermal water (not heated tap water). Breakfast or half board.",
      goodFor: "Families who want real thermal bathing without resort markup — the water is the same volcanic source as €250 hotels",
    },
    ro: {
      tier: "Buget Termal",
      price: "€100–150 / noapte",
      total: `${NIGHTS} nopți ≈ €${NIGHTS * 125}`,
      type: "Hoteluri termale 3 stele, agriturismo cu piscină termală, B&B-uri familii",
      neighbourhoods: "Casamicciola Terme, Forio, Barano",
      expect: "Cameră de familie cu acces la piscina termală inclus. Camere simple, apă termală autentică. Mic dejun sau demi-pensiune.",
      goodFor: "Familii care vor îmbăiere termală autentică fără suprapreț de resort — apa vine din aceeași sursă vulcanică",
    },
  },
  {
    en: {
      tier: "Mid-Range Thermal",
      price: "€150–195 / night",
      total: `${NIGHTS} nights ≈ €${NIGHTS * 170}`,
      type: "4-star thermal hotels with dedicated family rooms and multiple thermal pools",
      neighbourhoods: "Lacco Ameno, Forio, Ischia Porto",
      expect: "4-star family room, half or full board, thermal garden with 2–4 pools at different temperatures, children's pool, on-site spa. Child discount 30–50%.",
      goodFor: "The sweet spot — 4-star thermal access, family board included, genuine thermal gardens with multiple temperature pools. Best overall value for thermal holidays.",
    },
    ro: {
      tier: "Mediu Termal",
      price: "€150–195 / noapte",
      total: `${NIGHTS} nopți ≈ €${NIGHTS * 170}`,
      type: "Hoteluri termale 4 stele cu camere dedicate familii și piscine termale multiple",
      neighbourhoods: "Lacco Ameno, Forio, Ischia Porto",
      expect: "Cameră de familie 4 stele, demi sau pensiune completă, grădină termală cu 2–4 piscine la temperaturi diferite, piscină copii, spa. Reducere copii 30–50%.",
      goodFor: "Punctul ideal — acces termal 4 stele, pensiune inclusă, grădini termale autentice. Cel mai bun raport calitate-preț.",
    },
  },
  {
    en: {
      tier: "Comfort Thermal",
      price: "€195–280 / night",
      total: `${NIGHTS} nights ≈ €${NIGHTS * 235}`,
      type: "4-star premium thermal spa resorts with extensive pool complexes",
      neighbourhoods: "Lacco Ameno, Forio",
      expect: "Multiple thermal pools (4–7) including children's freshwater pool, Soft All-Inclusive or full board, kids club, full thermal spa, beach access. 24h thermal pool access.",
      goodFor: "Families wanting an all-in thermal resort — the resort IS the thermal park. No separate thermal park tickets needed.",
    },
    ro: {
      tier: "Confort Termal",
      price: "€195–280 / noapte",
      total: `${NIGHTS} nopți ≈ €${NIGHTS * 235}`,
      type: "Stațiuni premium 4 stele cu complexe termale extensive",
      neighbourhoods: "Lacco Ameno, Forio",
      expect: "Piscine termale multiple (4–7) inclusiv piscină copii, Soft All-Inclusive sau pensiune completă, club copii, spa termal complet, acces plajă. Acces termal 24h.",
      goodFor: "Familii care vor stațiune termală all-in — stațiunea ESTE parcul termal. Nu mai trebuie bilete separate.",
    },
  },
];

export const ISCHIA_HOTELS: IschiaHotelBilingual[] = [
  // ── Budget Thermal ──
  {
    slug: "terme-la-pergola",
    tierIndex: 0,
    priceNum: 100,
    en: {
      name: "Hotel Terme La Pergola",
      area: "Casamicciola",
      price: "~€100 / night",
      note: "3★, HB, opens Apr · child under 3 free",
      thermalPools: "2 outdoor + 1 indoor",
      thermalDetail: "Sulphate-bicarbonate water 35–38°C, direct volcanic source. Indoor pool open year-round. Free thermal mud treatment for guests staying 5+ nights.",
      board: "Half board",
      bestFor: "Cheapest genuine thermal hotel on the island",
      qualityPrice: 5,
    },
    ro: {
      name: "Hotel Terme La Pergola",
      area: "Casamicciola",
      price: "~€100 / noapte",
      note: "3★, DP, deschide apr · copil sub 3 gratuit",
      thermalPools: "2 exterioare + 1 interioară",
      thermalDetail: "Apă sulfat-bicarbonat 35–38°C, sursă vulcanică directă. Piscina interioară deschisă tot anul. Tratament gratuit cu nămol termal pentru șederi de 5+ nopți.",
      board: "Demi-pensiune",
      bestFor: "Cel mai ieftin hotel termal autentic din insulă",
      qualityPrice: 5,
    },
  },
  {
    slug: "pera-di-basso",
    tierIndex: 0,
    priceNum: 110,
    en: {
      name: "Agriturismo Pera di Basso",
      area: "Casamicciola",
      price: "~€110 / night",
      note: "Room-only, sea-view farmhouse, pool",
      thermalPools: "1 outdoor thermal",
      thermalDetail: "Natural thermal pool (32°C) fed by private spring. Vineyard setting with sea views. Not a large complex, but authentic volcanic water.",
      board: "Room only (kitchen access)",
      bestFor: "Farm-stay charm with thermal pool",
      qualityPrice: 4,
    },
    ro: {
      name: "Agriturismo Pera di Basso",
      area: "Casamicciola",
      price: "~€110 / noapte",
      note: "Doar cameră, fermă cu vedere la mare, piscină",
      thermalPools: "1 termală exterioară",
      thermalDetail: "Piscină termală naturală (32°C) alimentată de izvor privat. Cadru de vie cu vedere la mare. Apă vulcanică autentică.",
      board: "Doar cameră (acces bucătărie)",
      bestFor: "Farmec de fermă cu piscină termală",
      qualityPrice: 4,
    },
  },
  {
    slug: "stella-maris-terme",
    tierIndex: 0,
    priceNum: 140,
    en: {
      name: "Hotel Stella Maris Terme",
      area: "Casamicciola",
      price: "~€140 / night",
      note: "3★, FB, thermal pool + Jacuzzi",
      thermalPools: "1 outdoor + thermal Jacuzzi",
      thermalDetail: "Sodium-chloride thermal water at 36°C. Jacuzzi at 39°C. On-site fangoterapia available (€20/session). 200m from Castiglione thermal park.",
      board: "Full board",
      bestFor: "Full board at budget price — barely need to leave",
      qualityPrice: 5,
    },
    ro: {
      name: "Hotel Stella Maris Terme",
      area: "Casamicciola",
      price: "~€140 / noapte",
      note: "3★, PC, piscină termală + Jacuzzi",
      thermalPools: "1 exterioară + Jacuzzi termal",
      thermalDetail: "Apă termală cloruro-sodică la 36°C. Jacuzzi la 39°C. Fangoterapie la fața locului (€20/ședință). La 200m de parcul termal Castiglione.",
      board: "Pensiune completă",
      bestFor: "Pensiune completă la preț de buget",
      qualityPrice: 5,
    },
  },
  // ── Mid-Range Thermal ──
  {
    slug: "don-pepe-terme",
    tierIndex: 1,
    priceNum: 155,
    en: {
      name: "Hotel Don Pepe Terme & Beauty Farm",
      area: "Lacco Ameno",
      price: "~€155 / night",
      note: "4★, FB, child free under 2 · opens Apr 17",
      thermalPools: "3 outdoor + 1 indoor",
      thermalDetail: "Thermal garden: pools at 28°C, 34°C, and 38°C plus indoor winter pool at 36°C. Children's shallow thermal pool (30°C). Free thermal mud cycle included with 7-night stays. Private thermal source since 1962.",
      board: "Full board",
      bestFor: "Best 4★ full-board thermal deal on the island",
      qualityPrice: 5,
    },
    ro: {
      name: "Hotel Don Pepe Terme & Beauty Farm",
      area: "Lacco Ameno",
      price: "~€155 / noapte",
      note: "4★, PC, copil gratuit sub 2 · deschide 17 apr",
      thermalPools: "3 exterioare + 1 interioară",
      thermalDetail: "Grădină termală: piscine la 28°C, 34°C și 38°C plus piscină interioară de iarnă la 36°C. Piscină termală copii (30°C). Ciclu gratuit nămol termal la șederi de 7 nopți. Sursă termală privată din 1962.",
      board: "Pensiune completă",
      bestFor: "Cel mai bun deal 4★ pensiune completă termală",
      qualityPrice: 5,
    },
  },
  {
    slug: "eden-park-terme",
    tierIndex: 1,
    priceNum: 170,
    en: {
      name: "Hotel Eden Park Terme",
      area: "Forio",
      price: "~€170 / night",
      note: "4★, FB, outdoor thermal pool, entertainment",
      thermalPools: "2 outdoor thermal + 1 freshwater children's",
      thermalDetail: "Two sulphate-alkaline pools at 34°C and 37°C. Children's freshwater pool with slide. Evening entertainment. 600m walk to Poseidon. Thermal inhalation treatments available.",
      board: "Full board",
      bestFor: "Families with young children — entertainment + thermal",
      qualityPrice: 4,
    },
    ro: {
      name: "Hotel Eden Park Terme",
      area: "Forio",
      price: "~€170 / noapte",
      note: "4★, PC, piscină termală exterioară, animație",
      thermalPools: "2 termale exterioare + 1 apă dulce copii",
      thermalDetail: "Două piscine sulfato-alcaline la 34°C și 37°C. Piscină copii cu tobogan. Animație seara. La 600m de Poseidon. Inhalații termale disponibile.",
      board: "Pensiune completă",
      bestFor: "Familii cu copii mici — animație + termal",
      qualityPrice: 4,
    },
  },
  {
    slug: "san-valentino-terme",
    tierIndex: 1,
    priceNum: 185,
    en: {
      name: "Hotel San Valentino Terme",
      area: "Ischia Porto",
      price: "~€185 / night",
      note: "4★, HB, indoor + outdoor thermal, babysitting",
      thermalPools: "2 outdoor + 1 indoor + thermal Jacuzzi",
      thermalDetail: "Indoor thermal pool (year-round, 34°C) plus two outdoor (28°C and 36°C). Thermal Jacuzzi on panoramic terrace. Full spa: fango therapy, thermal inhalations, aerosol treatments. SSN thermal treatments accepted.",
      board: "Half board",
      bestFor: "Central location + serious thermal spa — walk everywhere",
      qualityPrice: 4,
    },
    ro: {
      name: "Hotel San Valentino Terme",
      area: "Ischia Porto",
      price: "~€185 / noapte",
      note: "4★, DP, termal indoor + outdoor, babysitting",
      thermalPools: "2 exterioare + 1 interioară + Jacuzzi termal",
      thermalDetail: "Piscină termală interioară (tot anul, 34°C) plus două exterioare (28°C și 36°C). Jacuzzi termal pe terasă panoramică. Spa complet: fangoterapie, inhalații, aerosol. Tratamente SSN acceptate.",
      board: "Demi-pensiune",
      bestFor: "Locație centrală + spa termal serios",
      qualityPrice: 4,
    },
  },
  // ── Comfort Thermal ──
  {
    slug: "sorriso-thermae",
    tierIndex: 2,
    priceNum: 200,
    en: {
      name: "Sorriso Thermae Resort & Spa",
      area: "Forio",
      price: "~€200 / night",
      note: "4★, 5 thermal pools incl. children's, 24h access",
      thermalPools: "5 thermal + 1 children's freshwater",
      thermalDetail: "Five volcanic-source pools at 24°C, 30°C, 34°C, 37°C, and 40°C — effectively your own thermal park. Children's freshwater pool with gentle slope. 24-hour thermal access (unique on the island). Thermal grotto, steam cave, Kneipp path. 1,200m² spa with fango therapy.",
      board: "Half board / Full board available",
      bestFor: "Best comfort value — 5 pools replaces €38 daily Poseidon ticket",
      qualityPrice: 5,
    },
    ro: {
      name: "Sorriso Thermae Resort & Spa",
      area: "Forio",
      price: "~€200 / noapte",
      note: "4★, 5 piscine termale incl. copii, acces 24h",
      thermalPools: "5 termale + 1 apă dulce copii",
      thermalDetail: "Cinci piscine vulcanice la 24°C, 30°C, 34°C, 37°C și 40°C — practic propriul parc termal. Piscină copii cu pantă lină. Acces termal 24h (unic pe insulă). Grotă termală, peșteră aburi, traseu Kneipp. Spa 1.200m² cu fangoterapie.",
      board: "Demi / Pensiune completă disponibilă",
      bestFor: "Cel mai bun raport confort — 5 piscine înlocuiește bilet Poseidon",
      qualityPrice: 5,
    },
  },
  {
    slug: "michelangelo-terme",
    tierIndex: 2,
    priceNum: 230,
    en: {
      name: "Park Hotel Terme Michelangelo",
      area: "Lacco Ameno",
      price: "~€230 / night",
      note: "4★, Soft AI, Mini Club 9:30–23:30, giant playground",
      thermalPools: "4 thermal + 1 children's + 1 baby pool",
      thermalDetail: "Four thermal pools at varying temperatures (28–39°C) with views over San Montano bay. Dedicated children's thermal pool (30°C). Baby splash zone. Mini Club runs 9:30–23:30 — longest supervised childcare window on the island. 800m² thermal spa. Adjacent to Negombo.",
      board: "Soft All-Inclusive",
      bestFor: "Parents wanting thermal time while kids supervised all day",
      qualityPrice: 4,
    },
    ro: {
      name: "Park Hotel Terme Michelangelo",
      area: "Lacco Ameno",
      price: "~€230 / noapte",
      note: "4★, Soft AI, Mini Club 9:30–23:30, loc de joacă imens",
      thermalPools: "4 termale + 1 copii + 1 bebeluși",
      thermalDetail: "Patru piscine termale (28–39°C) cu vedere San Montano. Piscină termală copii (30°C). Zonă splash bebeluși. Mini Club 9:30–23:30 — cel mai lung program de pe insulă. Spa 800m². Adiacent Negombo.",
      board: "Soft All-Inclusive",
      bestFor: "Părinți care vor timp termal în timp ce copiii sunt supravegheați",
      qualityPrice: 4,
    },
  },
  {
    slug: "reginella-resort",
    tierIndex: 2,
    priceNum: 260,
    en: {
      name: "La Reginella Resort & Thermal Spa",
      area: "Lacco Ameno",
      price: "~€260 / night",
      note: "4★, 7-pool thermal garden, steam cave, central piazza",
      thermalPools: "7 thermal pools + steam cave",
      thermalDetail: "Seven interconnected thermal pools from 25°C to 42°C in terraced garden with sea views. Natural steam cave carved from volcanic rock. Hotel ages its own fango mud on-site. Walk to Lacco Ameno piazza and the iconic Fungo rock. Most extensive private thermal complex of any hotel on the island.",
      board: "Full board",
      bestFor: "Most thermal pools of any hotel — resort-as-thermal-park",
      qualityPrice: 4,
    },
    ro: {
      name: "La Reginella Resort & Thermal Spa",
      area: "Lacco Ameno",
      price: "~€260 / noapte",
      note: "4★, grădină termală 7 piscine, peșteră aburi, piața centrală",
      thermalPools: "7 piscine termale + peșteră aburi",
      thermalDetail: "Șapte piscine termale interconectate de la 25°C la 42°C în grădină pe terase cu vedere la mare. Peșteră naturală de aburi. Bazine de maturare fango la fața locului. Cel mai extins complex termal privat din orice hotel de pe insulă.",
      board: "Pensiune completă",
      bestFor: "Cele mai multe piscine termale — resort-ca-parc-termal",
      qualityPrice: 4,
    },
  },
  // ── Featured: La Villarosa Terme (dedicated page) ──
  {
    slug: "la-villarosa-terme",
    tierIndex: 2,
    priceNum: 220,
    en: {
      name: "Hotel La Villarosa Terme",
      area: "Ischia Porto",
      price: "~€220 / night",
      note: "4★, BB/HB/FB, private beach 300m, rooftop restaurant",
      thermalPools: "1 outdoor thermal + Parco Aurora wellness (500m)",
      thermalDetail: "Outdoor thermal pool with volcanic-source hot water. Free access to Parco Aurora wellness centre and gym 500m away. Swimming cap required for pool (€2.50 on-site). Private beach with free sunbeds open May–mid October.",
      board: "Breakfast / Half board / Full board",
      bestFor: "Central Ischia Porto location with character — 19th century gardens, rooftop dining, private beach",
      qualityPrice: 4,
    },
    ro: {
      name: "Hotel La Villarosa Terme",
      area: "Ischia Porto",
      price: "~€220 / noapte",
      note: "4★, MD/DP/PC, plajă privată 300m, restaurant panoramic",
      thermalPools: "1 termală exterioară + Parco Aurora wellness (500m)",
      thermalDetail: "Piscină termală exterioară cu apă caldă din sursă vulcanică. Acces gratuit la centrul wellness Parco Aurora și sala de fitness la 500m. Cască de înot obligatorie (€2.50). Plajă privată cu șezlonguri gratuite, deschisă mai–mijlocul lui octombrie.",
      board: "Mic dejun / Demi-pensiune / Pensiune completă",
      bestFor: "Locație centrală Ischia Porto cu caracter — grădini din sec. XIX, restaurant panoramic, plajă privată",
      qualityPrice: 4,
    },
  },
];

export function getIschiaHotelBySlug(slug: string) {
  return ISCHIA_HOTELS.find((h) => h.slug === slug);
}

export function getIschiaHotelsByTier(tierIndex: number) {
  return ISCHIA_HOTELS.filter((h) => h.tierIndex === tierIndex);
}
