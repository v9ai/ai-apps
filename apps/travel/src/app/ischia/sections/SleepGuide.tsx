"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { NIGHTS, DATE_RANGE_LABEL, RECOMMENDED_TIER } from "../constants";

interface Hotel {
  name: string;
  area: string;
  price: string;
  note: string;
  thermalPools: string;
  thermalDetail: string;
  board: string;
  bestFor: string;
  qualityPrice: number;
}

interface Tier {
  tier: string;
  price: string;
  total: string;
  type: string;
  neighbourhoods: string;
  expect: string;
  goodFor: string;
  hotels: Hotel[];
}

interface Neighbourhood {
  name: string;
  desc: string;
  thermal: string;
}

interface ValuePoint {
  label: string;
  detail: string;
}

const T = {
  en: {
    sectionLabel: "Where to Sleep",
    sectionTitle: "Thermal Hotels — Best Quality ÷ Price",
    sectionSubtitle:
      `Ischia island, ${NIGHTS} nights (${DATE_RANGE_LABEL.en}). Every hotel below has on-site thermal facilities — Ischia's real advantage over mainland hotels. Prices are family totals per night (2 adults + 1 child). Quality-price rating reflects thermal access, board, location, and family facilities relative to cost.`,
    recommended: "RECOMMENDED",
    bestValue: "BEST VALUE",
    hotelsLabel: "Properties in this tier",
    thermalLabel: "Thermal facilities",
    bestForLabel: "Best for",
    qpLabel: "Quality ÷ Price",
    tiers: [
      {
        tier: "Budget Thermal",
        price: "€100–150 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 125}`,
        type: "3-star thermal hotels, agriturismo with thermal pool, family B&Bs",
        neighbourhoods: "Casamicciola Terme, Forio, Barano",
        expect:
          "Family room with thermal pool access included in rate. Simple rooms, genuine thermal water (not heated tap water). Breakfast or half board.",
        goodFor: "Families who want real thermal bathing without resort markup — the water is the same volcanic source as €250 hotels",
        hotels: [
          {
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
          {
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
          {
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
        ],
      },
      {
        tier: "Mid-Range Thermal",
        price: "€150–195 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 170}`,
        type: "4-star thermal hotels with dedicated family rooms and multiple thermal pools",
        neighbourhoods: "Lacco Ameno, Forio, Ischia Porto",
        expect:
          "4-star family room, half or full board, thermal garden with 2–4 pools at different temperatures, children's pool, on-site spa. Child discount 30–50%.",
        goodFor:
          "The sweet spot — 4-star thermal access, family board included, genuine thermal gardens with multiple temperature pools. Best overall value for thermal holidays.",
        hotels: [
          {
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
          {
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
          {
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
        ],
      },
      {
        tier: "Comfort Thermal",
        price: "€195–280 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 235}`,
        type: "4-star premium thermal spa resorts with extensive pool complexes",
        neighbourhoods: "Lacco Ameno, Forio",
        expect:
          "Multiple thermal pools (4–7) including children's freshwater pool, Soft All-Inclusive or full board, kids club, full thermal spa, beach access. 24h thermal pool access.",
        goodFor:
          "Families wanting an all-in thermal resort — the resort IS the thermal park. No separate thermal park tickets needed.",
        hotels: [
          {
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
          {
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
          {
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
        ],
      },
    ] as Tier[],
    valueAnalysis: {
      title: "Thermal Value Analysis",
      subtitle: "Why budget thermal is the smart choice",
      points: [
        {
          label: "Budget thermal (€100–150/night)",
          detail: "Genuine volcanic water, half or full board included, and the same volcanic source as €250 hotels. Pair with 1–2 thermal park visits (€25–38) for variety. Total weekly cost: €800–1,200 — the best value on the island.",
        },
        {
          label: "Mid-range thermal (€150–195/night)",
          detail: "Multiple temperature pools on-site + full/half board. Might still visit 1–2 external parks but you have a thermal base at the hotel. Total weekly with 2 park visits: €1,250–1,550.",
        },
        {
          label: "Comfort thermal (€195–280/night)",
          detail: "The resort IS the thermal park — 4–7 pools covers everything. Skip paid parks entirely and save €150+. But the premium is paid upfront. Total weekly: €1,400–1,960.",
        },
        {
          label: "Our pick: Hotel Terme La Pergola (€100/night HB)",
          detail: "Half board 3-star with 3 thermal pools (indoor + outdoor), free mud treatment for 5+ night stays, child under 3 free. At €100/night you get genuine sulphate-bicarbonate volcanic water — the cheapest real thermal hotel on the island, and the quality-to-price winner.",
        },
      ] as ValuePoint[],
    },
    neighbourhoodsLabel: "Ischia Area Guide — Which Zone for Thermal?",
    neighbourhoods: [
      {
        name: "Forio",
        desc: "Best overall thermal zone. Home to Poseidon (Europe's largest), wide sandy beaches, flat walkable centre. Most hotel and restaurant choice. Sorriso Thermae and Eden Park are here.",
        thermal: "Poseidon, Sorriso resort pools, Citara Bay warm springs",
      },
      {
        name: "Lacco Ameno",
        desc: "Calm shallow San Montano bay, iconic mushroom rock, Negombo botanical thermal park adjacent. Quieter and more upscale. Don Pepe, Michelangelo, and Reginella are all here.",
        thermal: "Negombo gardens, hotel thermal complexes, San Montano warm springs",
      },
      {
        name: "Casamicciola Terme",
        desc: "The island's historic thermal centre — 'Terme' is in the name. Direct ferry port, natural springs, cheapest accommodation. Budget picks (Pergola, Stella Maris) are here. Castiglione park on the hillside.",
        thermal: "Castiglione park, natural public springs, hotel thermal pools",
      },
      {
        name: "Sant'Angelo / Barano (South)",
        desc: "Car-free Sant'Angelo village, dramatic southern coast. Home to Tropical Terme, Cavascura Roman spa, Sorgeto Bay, and Maronti fumarole beach. Wildest thermal experiences but fewer family hotels.",
        thermal: "Tropical, Cavascura, Sorgeto Bay, Maronti fumaroles — all natural/wild",
      },
    ] as Neighbourhood[],
    tierLabels: {
      type: "Property type",
      neighbourhoods: "Best areas",
      expect: "What to expect",
      goodFor: "Good for",
    },
  },
  ro: {
    sectionLabel: "Unde Dormi",
    sectionTitle: "Hoteluri Termale — Cea Mai Bună Calitate ÷ Preț",
    sectionSubtitle:
      `Insula Ischia, ${NIGHTS} nopți (${DATE_RANGE_LABEL.ro}). Fiecare hotel de mai jos are facilități termale la fața locului — avantajul real al Ischiei. Prețurile sunt totalul familiei pe noapte (2 adulți + 1 copil). Ratingul calitate-preț reflectă accesul termal, pensiunea, locația și facilitățile pentru familii.`,
    recommended: "RECOMANDAT",
    bestValue: "CEL MAI BUN PREȚ",
    hotelsLabel: "Proprietăți în acest nivel",
    thermalLabel: "Facilități termale",
    bestForLabel: "Ideal pentru",
    qpLabel: "Calitate ÷ Preț",
    tiers: [
      {
        tier: "Buget Termal",
        price: "€100–150 / noapte",
        total: `${NIGHTS} nopți ≈ €${NIGHTS * 125}`,
        type: "Hoteluri termale 3 stele, agriturismo cu piscină termală, B&B-uri familii",
        neighbourhoods: "Casamicciola Terme, Forio, Barano",
        expect:
          "Cameră de familie cu acces la piscina termală inclus. Camere simple, apă termală autentică. Mic dejun sau demi-pensiune.",
        goodFor: "Familii care vor îmbăiere termală autentică fără suprapreț de resort — apa vine din aceeași sursă vulcanică",
        hotels: [
          {
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
          {
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
          {
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
        ],
      },
      {
        tier: "Mediu Termal",
        price: "€150–195 / noapte",
        total: `${NIGHTS} nopți ≈ €${NIGHTS * 170}`,
        type: "Hoteluri termale 4 stele cu camere dedicate familii și piscine termale multiple",
        neighbourhoods: "Lacco Ameno, Forio, Ischia Porto",
        expect:
          "Cameră de familie 4 stele, demi sau pensiune completă, grădină termală cu 2–4 piscine la temperaturi diferite, piscină copii, spa. Reducere copii 30–50%.",
        goodFor:
          "Punctul ideal — acces termal 4 stele, pensiune inclusă, grădini termale autentice. Cel mai bun raport calitate-preț.",
        hotels: [
          {
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
          {
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
          {
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
        ],
      },
      {
        tier: "Confort Termal",
        price: "€195–280 / noapte",
        total: `${NIGHTS} nopți ≈ €${NIGHTS * 235}`,
        type: "Stațiuni premium 4 stele cu complexe termale extensive",
        neighbourhoods: "Lacco Ameno, Forio",
        expect:
          "Piscine termale multiple (4–7) inclusiv piscină copii, Soft All-Inclusive sau pensiune completă, club copii, spa termal complet, acces plajă. Acces termal 24h.",
        goodFor:
          "Familii care vor stațiune termală all-in — stațiunea ESTE parcul termal. Nu mai trebuie bilete separate.",
        hotels: [
          {
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
          {
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
          {
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
        ],
      },
    ] as Tier[],
    valueAnalysis: {
      title: "Analiză Valoare Termală",
      subtitle: "De ce nivelul mediu este punctul ideal",
      points: [
        {
          label: "Buget termal (€100–150/noapte)",
          detail: "Apă vulcanică autentică dar varietate limitată. Veți vrea bilete la parcuri termale (€25–38/buc) separat — adaugă €100–150 la săptămână. Cost total săptămânal: €800–1.200.",
        },
        {
          label: "Mediu termal (€150–195/noapte)",
          detail: "Piscine la temperaturi multiple la hotel + pensiune. Poate 1–2 parcuri externe dar aveți baza termală la hotel. Cost total cu 2 parcuri: €1.250–1.550.",
        },
        {
          label: "Confort termal (€195–280/noapte)",
          detail: "Stațiunea ESTE parcul termal — 4–7 piscine acoperă totul. Săriți parcurile cu plată, economisiți €150+. Premiul e plătit în avans. Cost total: €1.400–1.960.",
        },
        {
          label: "Alegerea noastră: Hotel Don Pepe (€155/noapte PC)",
          detail: "Pensiune completă 4 stele cu 4 piscine termale la trei temperaturi, piscină copii, ciclu gratuit nămol la 7 nopți, și prețul unui hotel buget. Câștigătorul calitate-preț de pe toată insula.",
        },
      ] as ValuePoint[],
    },
    neighbourhoodsLabel: "Ghid Zone Ischia — Ce Zonă pentru Termal?",
    neighbourhoods: [
      {
        name: "Forio",
        desc: "Cea mai bună zonă termală. Acasă la Poseidon (cel mai mare din Europa), plaje largi, centru plat. Cea mai mare ofertă. Sorriso Thermae și Eden Park sunt aici.",
        thermal: "Poseidon, piscinele Sorriso, izvoare calde Citara Bay",
      },
      {
        name: "Lacco Ameno",
        desc: "Golful San Montano calm, stânca ciupercă, Negombo adiacent. Mai liniștit și exclusivist. Don Pepe, Michelangelo și Reginella sunt aici.",
        thermal: "Negombo, complexe termale hotel, izvoare San Montano",
      },
      {
        name: "Casamicciola Terme",
        desc: "Centrul termal istoric — 'Terme' e în nume. Port feribot, izvoare naturale, cazare cea mai ieftină. Pergola, Stella Maris sunt aici. Castiglione pe deal.",
        thermal: "Castiglione, izvoare publice, piscine termale hotel",
      },
      {
        name: "Sant'Angelo / Barano (Sud)",
        desc: "Sat pietonal, coasta sudică dramatică. Tropical Terme, Cavascura, Sorgeto, fumarole Maronti. Cele mai sălbatice experiențe termale dar mai puține hoteluri de familie.",
        thermal: "Tropical, Cavascura, Sorgeto, fumarole Maronti — naturale/sălbatice",
      },
    ] as Neighbourhood[],
    tierLabels: {
      type: "Tip proprietate",
      neighbourhoods: "Cele mai bune zone",
      expect: "La ce să te aștepți",
      goodFor: "Potrivit pentru",
    },
  },
};

export function SleepGuide() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        bg: "steel.dark",
        py: { base: "14", md: "20" },
        px: { base: "4", sm: "6", md: "8", lg: "10", xl: "12" },
      })}
    >
      {/* ── Section header ── */}
      <div
        className={css({
          maxW: "none",
          mx: "auto",
          mb: { base: "10", md: "14" },
        })}
      >
        <p
          className={css({
            fontSize: "label",
            fontFamily: "display",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "amber.warm",
            mb: "3",
          })}
        >
          {t.sectionLabel}
        </p>
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "h2",
            letterSpacing: "h2",
            color: "text.primary",
            mb: "4",
          })}
        >
          {t.sectionTitle}
        </h2>
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
            maxW: "800px",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* ── Tier cards ── */}
      <div
        className={css({
          maxW: "none",
          mx: "auto",
          display: "grid",
          gridTemplateColumns: {
            base: "1fr",
            md: "repeat(3, 1fr)",
          },
          gap: { base: "4", md: "6" },
          mb: { base: "12", md: "16" },
        })}
      >
        {t.tiers.map((tier, i) => {
          const isRecommended = i === RECOMMENDED_TIER;
          return (
            <div
              key={tier.tier}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: isRecommended ? "amber.warm" : "steel.border",
                rounded: "card",
                boxShadow: isRecommended ? "card.hover" : "card",
                p: { base: "6", md: "7" },
                display: "flex",
                flexDir: "column",
                gap: "5",
                position: "relative",
                transition: "border-color 0.2s, box-shadow 0.2s",
                _hover: {
                  borderColor: isRecommended ? "amber.bright" : "steel.borderHover",
                  boxShadow: "card.hover",
                },
              })}
            >
              {/* Recommended badge */}
              {isRecommended && (
                <div
                  className={css({
                    position: "absolute",
                    top: "-1px",
                    right: "20px",
                    bg: "amber.warm",
                    color: "steel.dark",
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    px: "3",
                    py: "1",
                    rounded: "pill",
                  })}
                >
                  {t.recommended}
                </div>
              )}

              {/* Tier header */}
              <div>
                <p
                  className={css({
                    fontSize: "xs",
                    fontFamily: "display",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isRecommended ? "amber.warm" : "text.muted",
                    mb: "2",
                  })}
                >
                  {tier.tier}
                </p>
                <p
                  className={css({
                    fontSize: "h3",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    lineHeight: "1.1",
                    mb: "1",
                  })}
                >
                  {tier.price}
                </p>
                <p
                  className={css({
                    fontSize: "meta",
                    color: isRecommended ? "amber.bright" : "text.faint",
                    fontFamily: "display",
                    letterSpacing: "0.04em",
                  })}
                >
                  {tier.total}
                </p>
              </div>

              {/* Divider */}
              <div
                className={css({
                  h: "1px",
                  bg: isRecommended ? "amber.warm" : "steel.border",
                  opacity: isRecommended ? 0.4 : 1,
                })}
              />

              {/* Details */}
              <dl
                className={css({
                  display: "flex",
                  flexDir: "column",
                  gap: "4",
                })}
              >
                <TierRow label={t.tierLabels.type}          value={tier.type}          isRecommended={isRecommended} />
                <TierRow label={t.tierLabels.neighbourhoods} value={tier.neighbourhoods} isRecommended={isRecommended} />
                <TierRow label={t.tierLabels.expect}        value={tier.expect}        isRecommended={isRecommended} />
                <TierRow label={t.tierLabels.goodFor}       value={tier.goodFor}       isRecommended={isRecommended} />
              </dl>

              {/* Hotel list divider */}
              <div
                className={css({
                  h: "1px",
                  bg: isRecommended ? "amber.warm" : "steel.border",
                  opacity: isRecommended ? 0.3 : 0.6,
                })}
              />

              {/* Named hotels with thermal details */}
              <div>
                <p
                  className={css({
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "text.faint",
                    mb: "3",
                  })}
                >
                  {t.hotelsLabel}
                </p>
                <div
                  className={css({
                    display: "flex",
                    flexDir: "column",
                    gap: "4",
                  })}
                >
                  {tier.hotels.map((hotel) => {
                    const isBestValue = hotel.qualityPrice === 5;
                    return (
                      <div
                        key={hotel.name}
                        className={css({
                          bg: "steel.raised",
                          border: "1px solid",
                          borderColor: isBestValue && isRecommended ? "rgba(201,146,42,0.3)" : isBestValue ? "rgba(201,146,42,0.15)" : "steel.border",
                          rounded: "md",
                          px: "4",
                          py: "3.5",
                          position: "relative",
                        })}
                      >
                        {/* Best value badge */}
                        {isBestValue && (
                          <div
                            className={css({
                              position: "absolute",
                              top: "-1px",
                              left: "12px",
                              bg: "amber.warm",
                              color: "steel.dark",
                              fontSize: "2xs",
                              fontFamily: "display",
                              fontWeight: "700",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              px: "2",
                              py: "0.5",
                              rounded: "pill",
                              lineHeight: "1.4",
                            })}
                          >
                            {t.bestValue}
                          </div>
                        )}

                        {/* Name + price row */}
                        <div
                          className={css({
                            display: "flex",
                            alignItems: "baseline",
                            justifyContent: "space-between",
                            gap: "2",
                            mb: "1",
                            mt: isBestValue ? "1.5" : "0",
                          })}
                        >
                          <p
                            className={css({
                              fontSize: "xs",
                              fontWeight: "700",
                              fontFamily: "display",
                              color: isRecommended ? "text.primary" : "text.secondary",
                              lineHeight: "1.3",
                            })}
                          >
                            {hotel.name}
                          </p>
                          <span
                            className={css({
                              flexShrink: "0",
                              fontSize: "2xs",
                              fontWeight: "700",
                              fontFamily: "display",
                              color: isRecommended ? "amber.warm" : "text.muted",
                              whiteSpace: "nowrap",
                            })}
                          >
                            {hotel.price}
                          </span>
                        </div>

                        {/* Area + note */}
                        <p
                          className={css({
                            fontSize: "2xs",
                            color: "text.faint",
                            fontFamily: "display",
                            letterSpacing: "0.02em",
                            mb: "2",
                          })}
                        >
                          {hotel.area} · {hotel.note}
                        </p>

                        {/* Thermal detail */}
                        <div
                          className={css({
                            borderTop: "1px solid",
                            borderColor: "steel.border",
                            pt: "2",
                            mt: "1",
                          })}
                        >
                          <p
                            className={css({
                              fontSize: "2xs",
                              fontFamily: "display",
                              fontWeight: "600",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "amber.warm",
                              mb: "1",
                            })}
                          >
                            {t.thermalLabel}: {hotel.thermalPools}
                          </p>
                          <p
                            className={css({
                              fontSize: "2xs",
                              color: "text.secondary",
                              lineHeight: "1.5",
                              mb: "2",
                            })}
                          >
                            {hotel.thermalDetail}
                          </p>

                          {/* Quality-price + best-for row */}
                          <div
                            className={css({
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "2",
                              flexWrap: "wrap",
                            })}
                          >
                            <span
                              className={css({
                                fontSize: "2xs",
                                color: "text.muted",
                                fontFamily: "display",
                              })}
                            >
                              {t.bestForLabel}: {hotel.bestFor}
                            </span>
                            <span
                              className={css({
                                fontSize: "2xs",
                                fontFamily: "display",
                                fontWeight: "700",
                                color: hotel.qualityPrice >= 4 ? "amber.warm" : "text.faint",
                                whiteSpace: "nowrap",
                              })}
                            >
                              {t.qpLabel}{" "}
                              {Array.from({ length: 5 }, (_, j) =>
                                j < hotel.qualityPrice ? "\u2605" : "\u2606"
                              ).join("")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Value Analysis ── */}
      <div
        className={css({
          maxW: "none",
          mx: "auto",
          mb: { base: "12", md: "16" },
        })}
      >
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: { base: "6", md: "8" },
          })}
        >
          <p
            className={css({
              fontSize: "label",
              fontFamily: "display",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "amber.warm",
              mb: "2",
            })}
          >
            {t.valueAnalysis.title}
          </p>
          <p
            className={css({
              fontSize: "h3",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              lineHeight: "1.2",
              mb: "6",
            })}
          >
            {t.valueAnalysis.subtitle}
          </p>

          <div
            className={css({
              display: "flex",
              flexDir: "column",
              gap: "4",
            })}
          >
            {t.valueAnalysis.points.map((point, i) => {
              const isOurPick = i === t.valueAnalysis.points.length - 1;
              return (
                <div
                  key={i}
                  className={css({
                    bg: isOurPick ? "rgba(201,146,42,0.08)" : "steel.raised",
                    border: "1px solid",
                    borderColor: isOurPick ? "rgba(201,146,42,0.3)" : "steel.border",
                    rounded: "md",
                    px: "5",
                    py: "4",
                  })}
                >
                  <p
                    className={css({
                      fontSize: "xs",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: isOurPick ? "amber.warm" : "text.primary",
                      mb: "1",
                    })}
                  >
                    {point.label}
                  </p>
                  <p
                    className={css({
                      fontSize: "meta",
                      color: "text.secondary",
                      lineHeight: "1.55",
                    })}
                  >
                    {point.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Area guide ── */}
      <div className={css({ maxW: "none", mx: "auto" })}>
        <p
          className={css({
            fontSize: "label",
            fontFamily: "display",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "text.muted",
            mb: "6",
          })}
        >
          {t.neighbourhoodsLabel}
        </p>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
            gap: { base: "3", md: "4" },
          })}
        >
          {t.neighbourhoods.map((n) => (
            <div
              key={n.name}
              className={css({
                bg: "steel.raised",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                px: "5",
                py: "4",
                transition: "border-color 0.2s",
                _hover: { borderColor: "steel.borderHover" },
              })}
            >
              <p
                className={css({
                  fontSize: "label",
                  fontWeight: "600",
                  fontFamily: "display",
                  color: "text.primary",
                  mb: "1",
                })}
              >
                {n.name}
              </p>
              <p
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "1.55",
                  mb: "2",
                })}
              >
                {n.desc}
              </p>
              <p
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "600",
                  letterSpacing: "0.04em",
                  color: "amber.warm",
                })}
              >
                {n.thermal}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TierRow({
  label,
  value,
  isRecommended,
}: {
  label: string;
  value: string;
  isRecommended: boolean;
}) {
  return (
    <div>
      <dt
        className={css({
          fontSize: "xs",
          fontFamily: "display",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "text.faint",
          mb: "1",
        })}
      >
        {label}
      </dt>
      <dd
        className={css({
          fontSize: "meta",
          color: isRecommended ? "text.primary" : "text.secondary",
          lineHeight: "1.5",
          margin: 0,
        })}
      >
        {value}
      </dd>
    </div>
  );
}
