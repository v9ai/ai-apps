"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";
import { NIGHTS, DATE_RANGE_LABEL, RECOMMENDED_TIER } from "../constants";
import { ISCHIA_HOTELS, TIER_META, getIschiaHotelsByTier } from "../hotels";

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
    valueAnalysis: {
      title: "Analiză Valoare Termală",
      subtitle: "De ce bugetul termal este alegerea inteligentă",
      points: [
        {
          label: "Buget termal (€100–150/noapte)",
          detail: "Apă vulcanică autentică, demi sau pensiune completă inclusă, și aceeași sursă vulcanică ca hotelurile de €250. Combină cu 1–2 vizite la parcuri termale (€25–38) pentru varietate. Cost total săptămânal: €800–1.200 — cel mai bun raport calitate-preț de pe insulă.",
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
          label: "Alegerea noastră: Hotel Terme La Pergola (€100/noapte DP)",
          detail: "Demi-pensiune 3 stele cu 3 piscine termale (interioară + exterioară), tratament gratuit cu nămol pentru șederi de 5+ nopți, copil sub 3 gratuit. La €100/noapte ai apă vulcanică sulfat-bicarbonat autentică — cel mai ieftin hotel termal real de pe insulă și câștigătorul calitate-preț.",
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

  const tiers = TIER_META.map((meta, i) => ({
    ...meta[lang],
    hotels: getIschiaHotelsByTier(i).map((h) => ({ ...h[lang], slug: h.slug })),
  }));

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
        {tiers.map((tier, i) => {
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
                          <Link
                            href={`/ischia/${hotel.slug}`}
                            className={css({
                              fontSize: "xs",
                              fontWeight: "700",
                              fontFamily: "display",
                              color: isRecommended ? "text.primary" : "text.secondary",
                              lineHeight: "1.3",
                              textDecoration: "none",
                              transition: "color 0.15s",
                              _hover: { color: "amber.warm" },
                            })}
                          >
                            {hotel.name}
                          </Link>
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
