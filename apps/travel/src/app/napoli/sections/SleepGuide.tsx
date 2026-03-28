"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { NIGHTS, DATE_RANGE_LABEL, RECOMMENDED_TIER } from "../constants";

const T = {
  en: {
    sectionLabel: "Where to Sleep",
    sectionTitle: "Accommodation on Ischia",
    sectionSubtitle:
      `Ischia island, ${NIGHTS} nights (${DATE_RANGE_LABEL.en}). Three tiers for 2 adults + 1 child. Prices are family totals per night; full or half board where noted.`,
    recommended: "RECOMMENDED",
    hotelsLabel: "Properties in this tier",
    tiers: [
      {
        tier: "Budget",
        price: "€130–170 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 150}`,
        type: "Agriturismo, Italy Family Hotels certified resorts, 3-star thermal B&Bs",
        neighbourhoods: "Casamicciola Terme, Forio",
        expect:
          "Family room (2 adults + child sharing), thermal pool on-site or nearby, breakfast or full board included",
        goodFor: "Families prioritising thermal access without overspending on décor",
        hotels: [
          { name: "Agriturismo Pera di Basso", area: "Casamicciola", price: "~€130 / night", note: "Room-only, sea-view farmhouse, pool" },
          { name: "Le Canne Family Resort",     area: "Forio",        price: "~€150 / night", note: "Italy Family Hotels certified, HB, Mini Club" },
          { name: "Hotel Stella Maris Terme",   area: "Casamicciola", price: "~€170 / night", note: "3★, full board, thermal pool + Jacuzzi" },
        ],
      },
      {
        tier: "Mid-Range",
        price: "€150–185 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 165}`,
        type: "4-star thermal hotels with family rooms",
        neighbourhoods: "Lacco Ameno, Forio, Ischia Porto",
        expect:
          "4-star family room or connecting rooms, full/half board, thermal garden, child discount 30–50 %",
        goodFor:
          "Families — thermal access included, children's menu, beach shuttle, safe neighbourhood",
        hotels: [
          { name: "Hotel Don Pepe",            area: "Lacco Ameno",  price: "~€150 / night", note: "4★, full board, child free under 2, opens Apr 17" },
          { name: "Hotel Eden Park",           area: "Forio",        price: "~€165 / night", note: "4★, full board, outdoor thermal pool, entertainment" },
          { name: "Hotel San Valentino Terme", area: "Ischia Porto", price: "~€180 / night", note: "4★, half board, indoor + outdoor thermal, babysitting" },
        ],
      },
      {
        tier: "Comfort",
        price: "€185–260 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 220}`,
        type: "4-star thermal spa resorts",
        neighbourhoods: "Lacco Ameno, Forio",
        expect:
          "Multiple thermal pools incl. children's freshwater pool, Soft All-Inclusive, kids club, full spa",
        goodFor:
          "Families wanting all-in thermal resort with children's facilities and premium dining",
        hotels: [
          { name: "Sorriso Thermae Resort & Spa",       area: "Forio",       price: "~€190 / night", note: "4★, 5 thermal pools incl. children's pool, 24h access" },
          { name: "Park Hotel Terme Michelangelo",       area: "Lacco Ameno", price: "~€210 / night", note: "4★, Soft AI, Mini Club 9:30–23:30, giant playground" },
          { name: "La Reginella Resort & Thermal Spa",  area: "Lacco Ameno", price: "~€240 / night", note: "4★, 7-pool thermal garden, steam cave, central piazza" },
        ],
      },
    ],
    neighbourhoodsLabel: "Ischia Area Guide",
    neighbourhoods: [
      {
        name: "Forio",
        desc: "Wide sandy beaches (Citara, La Chiaia), flat walkable centre, Poseidon thermal park next door. Best overall area for families — widest hotel and restaurant choice.",
      },
      {
        name: "Lacco Ameno",
        desc: "Calm shallow San Montano bay, iconic mushroom rock for children, Negombo botanical thermal park. Quieter and more upscale — top pick for the comfort tier.",
      },
      {
        name: "Casamicciola Terme",
        desc: "Direct ferry port, natural thermal springs, cheaper accommodation. Compact and practical for families — easiest arrival, good budget options.",
      },
      {
        name: "Ischia Porto / Ponte",
        desc: "Most central, best transport links, lively harbour. Good base for first-timers — some noise at night, but child-friendly beaches within walking distance.",
      },
    ],
    tierLabels: {
      type: "Property type",
      neighbourhoods: "Best areas",
      expect: "What to expect",
      goodFor: "Good for",
    },
  },
  ro: {
    sectionLabel: "Unde Dormi",
    sectionTitle: "Cazare pe Insula Ischia",
    sectionSubtitle:
      `Insula Ischia, ${NIGHTS} nopti (${DATE_RANGE_LABEL.ro}). Trei niveluri pentru 2 adulti + 1 copil. Preturile sunt totalul familiei pe noapte (pensiune completa sau demi unde este cazul).`,
    recommended: "RECOMANDAT",
    hotelsLabel: "Proprietăți în acest nivel",
    tiers: [
      {
        tier: "Buget",
        price: "€130–170 / noapte",
        total: `${NIGHTS} nopti ≈ €${NIGHTS * 150}`,
        type: "Agriturismo, statiuni certificate Italy Family Hotels, B&B termale 3 stele",
        neighbourhoods: "Casamicciola Terme, Forio",
        expect:
          "Camera de familie (2 adulti + copil impartit), piscina termala la fata locului sau in apropiere, mic dejun sau pensiune completa inclusa",
        goodFor: "Familii care prioritizeaza accesul termal fara a cheltui prea mult pe decor",
        hotels: [
          { name: "Agriturismo Pera di Basso", area: "Casamicciola", price: "~€130 / noapte", note: "Room-only, ferma cu vedere la mare, piscina" },
          { name: "Le Canne Family Resort",     area: "Forio",        price: "~€150 / noapte", note: "Certificat Italy Family Hotels, DP, Mini Club" },
          { name: "Hotel Stella Maris Terme",   area: "Casamicciola", price: "~€170 / noapte", note: "3★, pensiune completa, piscina termala + Jacuzzi" },
        ],
      },
      {
        tier: "Mediu",
        price: "€150–185 / noapte",
        total: `${NIGHTS} nopti ≈ €${NIGHTS * 165}`,
        type: "Hoteluri termale de 4 stele cu camere de familie",
        neighbourhoods: "Lacco Ameno, Forio, Ischia Porto",
        expect:
          "Camera de familie sau camere comunicante 4 stele, pensiune completa/demi-pensiune, gradina termala, reducere copii 30–50%",
        goodFor:
          "Familii — acces termal inclus, meniu pentru copii, naveta la plaja, cartier sigur",
        hotels: [
          { name: "Hotel Don Pepe",            area: "Lacco Ameno",  price: "~€150 / noapte", note: "4★, PC, copil gratuit sub 2 ani, deschis din 17 apr" },
          { name: "Hotel Eden Park",           area: "Forio",        price: "~€165 / noapte", note: "4★, PC, piscina termala exterioara, animatie" },
          { name: "Hotel San Valentino Terme", area: "Ischia Porto", price: "~€180 / noapte", note: "4★, DP, termal indoor + outdoor, babysitting" },
        ],
      },
      {
        tier: "Confort",
        price: "€185–260 / noapte",
        total: `${NIGHTS} nopti ≈ €${NIGHTS * 220}`,
        type: "Statiuni termale de 4 stele",
        neighbourhoods: "Lacco Ameno, Forio",
        expect:
          "Piscine termale multiple incl. piscina de apa dulce pentru copii, Soft All-Inclusive, club copii, spa complet",
        goodFor:
          "Familii care vor statiune termala all-in cu facilitati pentru copii si restaurante premium",
        hotels: [
          { name: "Sorriso Thermae Resort & Spa",      area: "Forio",       price: "~€190 / noapte", note: "4★, 5 piscine termale incl. copii, acces 24h" },
          { name: "Park Hotel Terme Michelangelo",      area: "Lacco Ameno", price: "~€210 / noapte", note: "4★, Soft AI, Mini Club 9:30–23:30, loc de joaca imens" },
          { name: "La Reginella Resort & Thermal Spa", area: "Lacco Ameno", price: "~€240 / noapte", note: "4★, gradina termala 7 piscine, pestera aburi, piata centrala" },
        ],
      },
    ],
    neighbourhoodsLabel: "Ghid Zone Ischia",
    neighbourhoods: [
      {
        name: "Forio",
        desc: "Plaje largi cu nisip (Citara, La Chiaia), centru accesibil pe jos, parcul termal Poseidon alaturi. Cea mai buna zona pentru familii — oferta cea mai larga de hoteluri si restaurante.",
      },
      {
        name: "Lacco Ameno",
        desc: "Golful San Montano calm si mic, stanca ciuperca iconica pentru copii, parcul botanic termal Negombo. Mai linistit si mai exclusivist — alegerea de top pentru nivelul Confort.",
      },
      {
        name: "Casamicciola Terme",
        desc: "Port direct de ferry, izvoare termale naturale, cazare mai ieftina. Compact si practic pentru familii — sosire usoara si optiuni bune la buget.",
      },
      {
        name: "Ischia Porto / Ponte",
        desc: "Cel mai central, cele mai bune legaturi de transport, port animat. Baza buna pentru prima vizita — putina zgomot noaptea, dar plaje prietenoase pentru copii la distanta de mers pe jos.",
      },
    ],
    tierLabels: {
      type: "Tip proprietate",
      neighbourhoods: "Cele mai bune zone",
      expect: "La ce sa te astepti",
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
        px: { base: "5", md: "8" },
      })}
    >
      {/* ── Section header ── */}
      <div
        className={css({
          maxW: "960px",
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
            maxW: "600px",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* ── Tier cards ── */}
      <div
        className={css({
          maxW: "960px",
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

              {/* Named hotels */}
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
                    gap: "3",
                  })}
                >
                  {tier.hotels.map((hotel) => (
                    <div
                      key={hotel.name}
                      className={css({
                        bg: "steel.raised",
                        border: "1px solid",
                        borderColor: isRecommended ? "rgba(201,146,42,0.15)" : "steel.border",
                        rounded: "md",
                        px: "3",
                        py: "2.5",
                      })}
                    >
                      <div
                        className={css({
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: "2",
                          mb: "0.5",
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
                      <p
                        className={css({
                          fontSize: "2xs",
                          color: "text.faint",
                          fontFamily: "display",
                          letterSpacing: "0.02em",
                        })}
                      >
                        {hotel.area} · {hotel.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Area guide ── */}
      <div className={css({ maxW: "960px", mx: "auto" })}>
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
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
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
                })}
              >
                {n.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Internal sub-component ──────────────────────────────────────────────────

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
