"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { NIGHTS, DATE_RANGE_LABEL, RECOMMENDED_TIER } from "../constants";

const T = {
  en: {
    sectionLabel: "Where to Sleep",
    sectionTitle: "Accommodation in Naples",
    sectionSubtitle:
      `Budget allocation €300 — family room, ${NIGHTS} nights (${DATE_RANGE_LABEL.en}). Three tiers for 2 adults + 1 child.`,
    recommended: "RECOMMENDED",
    hotelsLabel: "Properties in this tier",
    tiers: [
      {
        tier: "Budget",
        price: "€40–60 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 50}`,
        type: "Family-run B&Bs and apartment rentals",
        neighbourhoods: "Centro Storico, Quartieri Spagnoli",
        expect:
          "Private family room (double + extra bed for child), basic amenities, central location",
        goodFor: "Families on a tight budget — frees €50 for extra experiences",
        hotels: [
          { name: "B&B Spaccanapoli", area: "Centro Storico", price: "€45 / night", note: "Family room with extra bed for child" },
          { name: "A' Puteca di Napoli", area: "Quartieri Spagnoli", price: "€48 / night", note: "Family-run, quiet courtyard" },
          { name: "Napoli Centrale Rooms", area: "Piazza Garibaldi", price: "€52 / night", note: "Triple room, steps from Circumvesuviana" },
        ],
      },
      {
        tier: "Mid-Range",
        price: "€55–75 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 65}`,
        type: "Boutique hotels with family rooms",
        neighbourhoods: "Vomero, Lungomare, Via Toledo",
        expect:
          "Family room or connecting rooms, A/C, private bathroom, breakfast sometimes included",
        goodFor:
          "Families — comfortable family room, safe neighbourhood, good transport links",
        hotels: [
          { name: "Hotel Piazza Bellini", area: "Centro Storico", price: "€68 / night", note: "Courtyard garden, family rooms available" },
          { name: "Hotel de Charme Toledo", area: "Via Toledo", price: "€65 / night", note: "Connecting rooms, central location" },
          { name: "Costantinopoli 104", area: "Centro Storico", price: "€72 / night", note: "Liberty villa with pool, child-friendly" },
        ],
      },
      {
        tier: "Comfort",
        price: "€100–160 / night",
        total: `${NIGHTS} nights ≈ €${NIGHTS * 130}`,
        type: "Design hotels and heritage properties",
        neighbourhoods: "Lungomare, Chiaia, Posillipo",
        expect:
          "Junior suite or connecting rooms, room service, concierge, pool access",
        goodFor:
          "Families wanting full comfort — extra space for a child, premium seafront location",
        hotels: [
          { name: "Grand Hotel Vesuvio", area: "Lungomare", price: "€145 / night", note: "Iconic seafront, junior suites" },
          { name: "Hotel Santa Lucia", area: "Lungomare", price: "€130 / night", note: "Bay view family suites" },
          { name: "Romeo Hotel", area: "Porto", price: "€155 / night", note: "Design hotel, Michelin restaurant on-site" },
        ],
      },
    ],
    neighbourhoodsLabel: "Neighbourhood Guide",
    neighbourhoods: [
      {
        name: "Centro Storico",
        desc: "UNESCO-listed street grid, dense with trattorias and street food. Exciting for children during the day — loud at night, light sleepers may struggle.",
      },
      {
        name: "Chiaia",
        desc: "Elegant seafront district. Quieter than the historic centre. Good restaurants, lower foot traffic — manageable with a child.",
      },
      {
        name: "Vomero",
        desc: "Hilltop residential quarter. Calm streets, panoramic views, funicular access. Best neighbourhood for families with young children — safe and quiet at night.",
      },
      {
        name: "Lungomare",
        desc: "Promenade along the bay. Open spaces, sea views, car-free on Sundays. Ideal for families — children love the waterfront and Castel dell'Ovo is five minutes away.",
      },
    ],
    tierLabels: {
      type: "Property type",
      neighbourhoods: "Best neighbourhoods",
      expect: "What to expect",
      goodFor: "Good for",
    },
  },
  ro: {
    sectionLabel: "Unde Dormi",
    sectionTitle: "Cazare in Napoli",
    sectionSubtitle:
      `Buget alocat €300 — camera de familie, ${NIGHTS} nopti (${DATE_RANGE_LABEL.ro}). Trei niveluri pentru 2 adulti + 1 copil.`,
    recommended: "RECOMANDAT",
    hotelsLabel: "Proprietăți în acest nivel",
    tiers: [
      {
        tier: "Buget",
        price: "€40–60 / noapte",
        total: `${NIGHTS} nopti ≈ €${NIGHTS * 50}`,
        type: "B&B-uri de familie si apartamente de inchiriat",
        neighbourhoods: "Centro Storico, Quartieri Spagnoli",
        expect:
          "Camera de familie (pat dublu + pat suplimentar pentru copil), facilitati de baza, locatie centrala",
        goodFor:
          "Familii cu buget redus — elibereaza €50 pentru experiente suplimentare",
        hotels: [
          { name: "B&B Spaccanapoli", area: "Centro Storico", price: "€45 / noapte", note: "Camera de familie cu pat suplimentar" },
          { name: "A' Puteca di Napoli", area: "Quartieri Spagnoli", price: "€48 / noapte", note: "Condus de familie, curte interioara linistita" },
          { name: "Napoli Centrale Rooms", area: "Piazza Garibaldi", price: "€52 / noapte", note: "Camera tripla, langa Circumvesuviana" },
        ],
      },
      {
        tier: "Mediu",
        price: "€55–75 / noapte",
        total: `${NIGHTS} nopti ≈ €${NIGHTS * 65}`,
        type: "Hoteluri boutique cu camere de familie",
        neighbourhoods: "Vomero, Lungomare, Via Toledo",
        expect:
          "Camera de familie sau camere comunicante, A/C, baie proprie, mic dejun uneori inclus",
        goodFor:
          "Familii — camera confortabila, cartier sigur, legaturi bune cu transportul",
        hotels: [
          { name: "Hotel Piazza Bellini", area: "Centro Storico", price: "€68 / noapte", note: "Curte cu gradina, camere de familie" },
          { name: "Hotel de Charme Toledo", area: "Via Toledo", price: "€65 / noapte", note: "Camere comunicante, locatie centrala" },
          { name: "Costantinopoli 104", area: "Centro Storico", price: "€72 / noapte", note: "Vila Liberty cu piscina, prietenos cu copiii" },
        ],
      },
      {
        tier: "Confort",
        price: "€100–160 / noapte",
        total: `${NIGHTS} nopti ≈ €${NIGHTS * 130}`,
        type: "Hoteluri de design si proprietati istorice",
        neighbourhoods: "Lungomare, Chiaia, Posillipo",
        expect:
          "Junior suite sau camere comunicante, room service, concierge, acces la piscina",
        goodFor:
          "Familii care vor confort total — spatiu suplimentar pentru copil, locatie premium la malul marii",
        hotels: [
          { name: "Grand Hotel Vesuvio", area: "Lungomare", price: "€145 / noapte", note: "Iconic la malul marii, junior suites" },
          { name: "Hotel Santa Lucia", area: "Lungomare", price: "€130 / noapte", note: "Suites de familie cu vedere la golf" },
          { name: "Romeo Hotel", area: "Porto", price: "€155 / noapte", note: "Hotel de design, restaurant Michelin" },
        ],
      },
    ],
    neighbourhoodsLabel: "Ghid de Cartiere",
    neighbourhoods: [
      {
        name: "Centro Storico",
        desc: "Retea de strazi inclusa in patrimoniul UNESCO, plina de trattorii si mancare stradala. Fascinant pentru copii ziua — zgomotos noaptea, copiii mici pot fi deranjati.",
      },
      {
        name: "Chiaia",
        desc: "Cartier elegant la malul marii. Mai linistit decat centrul istoric. Restaurante bune, trafic pietonal redus — gestionabil cu un copil.",
      },
      {
        name: "Vomero",
        desc: "Cartier rezidential pe deal. Strazi calme, vedere panoramica, acces prin funicular. Cel mai bun cartier pentru familii cu copii mici — sigur si linistit noaptea.",
      },
      {
        name: "Lungomare",
        desc: "Promenada de-a lungul golfului. Spatii deschise, vedere la mare, fara masini duminica. Ideal pentru familii — copiii iubesc faleza si Castel dell'Ovo e la cinci minute.",
      },
    ],
    tierLabels: {
      type: "Tip proprietate",
      neighbourhoods: "Cele mai bune cartiere",
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
            maxW: "560px",
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
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: "2",
                  })}
                >
                  <p
                    className={css({
                      fontSize: "xs",
                      fontFamily: "display",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: isRecommended ? "amber.warm" : "text.muted",
                    })}
                  >
                    {tier.tier}
                  </p>
                  <span
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      fontWeight: "700",
                      letterSpacing: "0.06em",
                      color: isRecommended ? "amber.bright" : "text.faint",
                      bg: "steel.raised",
                      border: "1px solid",
                      borderColor: isRecommended ? "amber.warm" : "steel.border",
                      rounded: "pill",
                      px: "2",
                      py: "0.5",
                    })}
                  >
                    {t.mlLabel} {tier.mlScore}
                  </span>
                </div>
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
                <TierRow
                  label={t.tierLabels.type}
                  value={tier.type}
                  isRecommended={isRecommended}
                />
                <TierRow
                  label={t.tierLabels.neighbourhoods}
                  value={tier.neighbourhoods}
                  isRecommended={isRecommended}
                />
                <TierRow
                  label={t.tierLabels.expect}
                  value={tier.expect}
                  isRecommended={isRecommended}
                />
                <TierRow
                  label={t.tierLabels.goodFor}
                  value={tier.goodFor}
                  isRecommended={isRecommended}
                />
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

      {/* ── Neighbourhood guide ── */}
      <div
        className={css({
          maxW: "960px",
          mx: "auto",
        })}
      >
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
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: "1",
                })}
              >
                <p
                  className={css({
                    fontSize: "label",
                    fontWeight: "600",
                    fontFamily: "display",
                    color: "text.primary",
                  })}
                >
                  {n.name}
                </p>
                <span
                  className={css({
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    color: "amber.warm",
                    bg: "rgba(201,146,42,0.08)",
                    border: "1px solid rgba(201,146,42,0.2)",
                    rounded: "pill",
                    px: "2",
                    py: "0.5",
                    whiteSpace: "nowrap",
                  })}
                >
                  {t.mlLabel} {n.mlScore}
                </span>
              </div>
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
