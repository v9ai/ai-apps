"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  en: {
    sectionTitle: "5-Day Itinerary",
    sectionSubtitle: "€1,000 budget — Naples done properly",
    tipLabel: "Pro tip",
    days: [
      {
        number: "01",
        title: "Arrival & Old Town",
        cost: "€20–25",
        activities: [
          "Arrive at Naples International (NAP), check in",
          "Walk Spaccanapoli end-to-end",
          "Pizza at L'Antica Pizzeria da Michele",
          "Evening wander through Quartieri Spagnoli",
        ],
        tip: "Get oriented by walking Spaccanapoli west to east. Stop at any bar for a €1.10 standing espresso.",
      },
      {
        number: "02",
        title: "Museums & Underground",
        cost: "€30–35",
        activities: [
          "Museo Archeologico Nazionale — €15 (2–3 hrs minimum)",
          "Napoli Sotterranea tour — €10",
          "Wander Via San Gregorio Armeno",
          "Gelato on Spaccanapoli",
        ],
        tip: "Book Napoli Sotterranea in advance. The MANN takes 2–3 hours minimum; don't skip the Secret Cabinet.",
      },
      {
        number: "03",
        title: "Castles & Viewpoints",
        cost: "€10–15",
        activities: [
          "Castel dell'Ovo — free entry",
          "Lungomare Caracciolo waterfront walk",
          "Funicular to Vomero — €1.10",
          "Certosa di San Martino — €6",
          "Sunset from the Certosa terrace",
        ],
        tip: "The funicular is an experience in itself. The Certosa terrace has the best free panorama in Naples.",
      },
      {
        number: "04",
        title: "Capri Day Trip",
        cost: "€60–70",
        activities: [
          "Early hydrofoil from Molo Beverello — €22 return",
          "Explore Marina Grande",
          "Hike to Villa Jovis",
          "Bus to Anacapri",
          "Return on evening ferry",
        ],
        tip: "Buy your return ticket immediately on arrival. Pack lunch to avoid Capri restaurant prices.",
      },
      {
        number: "05",
        title: "Pompeii & Departure",
        cost: "€28–35",
        activities: [
          "Circumvesuviana train to Pompeii Scavi — €2.90",
          "3–4 hours on site — €18 entry",
          "Return to Naples",
          "Departure",
        ],
        tip: "Arrive at Pompeii at 9am sharp. The site is vast and exposed — hat and water are essential.",
      },
    ],
  },
  ro: {
    sectionTitle: "Itinerar 5 Zile",
    sectionSubtitle: "Buget €1.000 — Napoli facut cum trebuie",
    tipLabel: "Sfat util",
    days: [
      {
        number: "01",
        title: "Sosire & Orasul Vechi",
        cost: "€20–25",
        activities: [
          "Sosire pe Aeroportul International Napoli (NAP), check-in",
          "Plimbare pe Spaccanapoli de la un capat la altul",
          "Pizza la L'Antica Pizzeria da Michele",
          "Seara in Quartieri Spagnoli",
        ],
        tip: "Orienteaza-te mergand pe Spaccanapoli dinspre vest spre est. Opreste-te la orice bar pentru un espresso la ghiseu — €1.10.",
      },
      {
        number: "02",
        title: "Muzee & Subterane",
        cost: "€30–35",
        activities: [
          "Museo Archeologico Nazionale — €15 (minim 2–3 ore)",
          "Tur Napoli Sotterranea — €10",
          "Plimbare pe Via San Gregorio Armeno",
          "Inghetata pe Spaccanapoli",
        ],
        tip: "Rezerva Napoli Sotterranea in avans. MANN necesita minim 2–3 ore; nu rata Cabinetul Secret.",
      },
      {
        number: "03",
        title: "Castele & Panorame",
        cost: "€10–15",
        activities: [
          "Castel dell'Ovo — intrare gratuita",
          "Plimbare pe lungomare Caracciolo",
          "Funicular spre Vomero — €1.10",
          "Certosa di San Martino — €6",
          "Apus de la terasa Certosa",
        ],
        tip: "Funicularele sunt o experienta in sine. Terasa Certosa ofera cel mai bun panorama din Napoli.",
      },
      {
        number: "04",
        title: "Excursie Capri",
        cost: "€60–70",
        activities: [
          "Hidroglisant de dimineata din Molo Beverello — €22 dus-intors",
          "Explorarea Marinei Grande",
          "Traseu pe jos pana la Villa Jovis",
          "Autobuz spre Anacapri",
          "Retur cu feribotul de seara",
        ],
        tip: "Cumpara biletul de retur imediat la sosire. Ia pranz de acasa pentru a evita preturile restaurantelor din Capri.",
      },
      {
        number: "05",
        title: "Pompei & Plecare",
        cost: "€28–35",
        activities: [
          "Tren Circumvesuviana pana la Pompei Scavi — €2.90",
          "3–4 ore pe sit — bilet €18",
          "Intoarcere la Napoli",
          "Plecare",
        ],
        tip: "Ajunge la Pompei la ora 9 fix. Situl este vast si fara umbra — palaria si apa sunt esentiale.",
      },
    ],
  },
};

export function DayItinerary() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        py: { base: "14", md: "20" },
        px: { base: "5", md: "8" },
      })}
    >
      {/* Section header */}
      <div
        className={css({
          mb: "12",
        })}
      >
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "h2",
            letterSpacing: "h2",
            color: "text.primary",
          })}
        >
          {t.sectionTitle}
        </h2>
        <p
          className={css({
            mt: "2",
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* Timeline */}
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "6",
          position: "relative",
          _before: {
            content: '""',
            position: "absolute",
            top: "0",
            bottom: "0",
            left: { base: "20px", md: "28px" },
            width: "1px",
            bg: "steel.border",
          },
        })}
      >
        {t.days.map((day) => (
          <div
            key={day.number}
            className={css({
              display: "flex",
              gap: { base: "4", md: "6" },
              alignItems: "flex-start",
              position: "relative",
            })}
          >
            {/* Day number badge */}
            <div
              className={css({
                flexShrink: "0",
                w: { base: "10", md: "14" },
                h: { base: "10", md: "14" },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bg: "amber.warm",
                color: "steel.dark",
                fontSize: { base: "label", md: "h4" },
                fontWeight: "900",
                fontFamily: "display",
                letterSpacing: "-0.02em",
                rounded: "card",
                position: "relative",
                zIndex: "1",
                boxShadow: "card",
              })}
            >
              {day.number}
            </div>

            {/* Card */}
            <div
              className={css({
                flex: "1",
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                p: { base: "5", md: "6" },
                boxShadow: "card",
                _hover: {
                  borderColor: "steel.borderHover",
                  boxShadow: "card.hover",
                },
                transition: "border-color 0.2s, box-shadow 0.2s",
              })}
            >
              {/* Card header */}
              <div
                className={css({
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "3",
                  mb: "4",
                })}
              >
                <h3
                  className={css({
                    fontSize: "h4",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    lineHeight: "1.2",
                  })}
                >
                  {day.title}
                </h3>
                <span
                  className={css({
                    flexShrink: "0",
                    fontSize: "xs",
                    fontWeight: "600",
                    color: "amber.bright",
                    bg: "steel.raised",
                    border: "1px solid",
                    borderColor: "steel.border",
                    rounded: "pill",
                    px: "3",
                    py: "1",
                    whiteSpace: "nowrap",
                  })}
                >
                  {day.cost}
                </span>
              </div>

              {/* Activities list */}
              <ul
                className={css({
                  listStyle: "none",
                  p: "0",
                  m: "0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5",
                  mb: "4",
                })}
              >
                {day.activities.map((activity, i) => (
                  <li
                    key={i}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "2",
                      fontSize: "label",
                      color: "text.secondary",
                      lineHeight: "1.5",
                    })}
                  >
                    <span
                      className={css({
                        flexShrink: "0",
                        mt: "0.5",
                        w: "1",
                        h: "1",
                        rounded: "full",
                        bg: "steel.border",
                        display: "inline-block",
                        position: "relative",
                        top: "6px",
                      })}
                    />
                    {activity}
                  </li>
                ))}
              </ul>

              {/* Pro tip */}
              <div
                className={css({
                  borderLeft: "2px solid",
                  borderLeftColor: "amber.warm",
                  pl: "4",
                  py: "1",
                })}
              >
                <span
                  className={css({
                    display: "block",
                    fontSize: "2xs",
                    fontWeight: "700",
                    fontFamily: "display",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "amber.warm",
                    mb: "1",
                  })}
                >
                  {t.tipLabel}
                </span>
                <p
                  className={css({
                    fontSize: "meta",
                    color: "text.muted",
                    lineHeight: "1.6",
                    m: "0",
                  })}
                >
                  {day.tip}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
