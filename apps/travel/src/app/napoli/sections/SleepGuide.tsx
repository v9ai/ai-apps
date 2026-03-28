"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  en: {
    sectionLabel: "Where to Sleep",
    sectionTitle: "Accommodation in Naples",
    sectionSubtitle:
      "Budget allocation €350 — five nights mid-range. Three tiers mapped to your trip.",
    recommended: "RECOMMENDED",
    tiers: [
      {
        tier: "Budget",
        price: "€30–55 / night",
        total: "5 nights ≈ €200",
        type: "Hostels and family-run B&Bs",
        neighbourhoods: "Centro Storico, near Spaccanapoli",
        expect:
          "Shared bathrooms possible, basic rooms, but excellent central location",
        goodFor: "Solo backpackers, maximum budget freed for experiences",
      },
      {
        tier: "Mid-Range",
        price: "€65–100 / night",
        total: "5 nights ≈ €350",
        type: "Boutique hotels and guesthouses",
        neighbourhoods: "Chiaia, Via Toledo, Vomero",
        expect: "Private ensuite, A/C, breakfast sometimes included",
        goodFor: "Couples, first-time visitors wanting comfort and location",
      },
      {
        tier: "Comfort",
        price: "€120–200 / night",
        total: "5 nights ≈ €750",
        type: "Design hotels and heritage properties",
        neighbourhoods: "Lungomare, Posillipo",
        expect: "Full service, rooftop bars, concierge",
        goodFor: "Special occasions, sharing cost with a partner",
      },
    ],
    neighbourhoodsLabel: "Neighbourhood Guide",
    neighbourhoods: [
      {
        name: "Centro Storico",
        desc: "UNESCO-listed street grid, dense with trattorias and street food. Loud, alive, central.",
      },
      {
        name: "Chiaia",
        desc: "Elegant seafront district. Quieter than the historic centre, better restaurants and nightlife.",
      },
      {
        name: "Vomero",
        desc: "Hilltop residential quarter. Calm streets, panoramic views, funicular access to the port.",
      },
      {
        name: "Lungomare",
        desc: "Promenade along the bay. Ideal for morning walks and proximity to Castel dell'Ovo.",
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
      "Buget alocat €350 — cinci nopti la categoria medie. Trei niveluri pentru alegerea ta.",
    recommended: "RECOMANDAT",
    tiers: [
      {
        tier: "Buget",
        price: "€30–55 / noapte",
        total: "5 nopti ≈ €200",
        type: "Hosteluri si B&B-uri de familie",
        neighbourhoods: "Centro Storico, langa Spaccanapoli",
        expect:
          "Posibil bai comune, camere simple, dar locatie centrala excelenta",
        goodFor:
          "Calatori solo, buget maxim eliberat pentru experiente",
      },
      {
        tier: "Mediu",
        price: "€65–100 / noapte",
        total: "5 nopti ≈ €350",
        type: "Hoteluri boutique si pensiuni",
        neighbourhoods: "Chiaia, Via Toledo, Vomero",
        expect: "Baie proprie, A/C, mic dejun uneori inclus",
        goodFor: "Cupluri, vizitatori la prima vizita care vor confort si locatie",
      },
      {
        tier: "Confort",
        price: "€120–200 / noapte",
        total: "5 nopti ≈ €750",
        type: "Hoteluri de design si proprietati istorice",
        neighbourhoods: "Lungomare, Posillipo",
        expect: "Servicii complete, baruri pe acoperis, concierge",
        goodFor: "Ocazii speciale, impartirea costului cu un partener",
      },
    ],
    neighbourhoodsLabel: "Ghid de Cartiere",
    neighbourhoods: [
      {
        name: "Centro Storico",
        desc: "Retea de strazi inclusa in patrimoniul UNESCO, plina de trattorii si mancare stradala. Zgomotos, viu, central.",
      },
      {
        name: "Chiaia",
        desc: "Cartier elegant la malul marii. Mai linistit decat centrul istoric, restaurante si viata de noapte mai bune.",
      },
      {
        name: "Vomero",
        desc: "Cartier rezidential pe deal. Strazi calme, vedere panoramica, acces prin funicular spre port.",
      },
      {
        name: "Lungomare",
        desc: "Promenada de-a lungul golfului. Ideal pentru plimbari de dimineata si aproape de Castel dell'Ovo.",
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

const RECOMMENDED_INDEX = 1;

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
          const isRecommended = i === RECOMMENDED_INDEX;
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
