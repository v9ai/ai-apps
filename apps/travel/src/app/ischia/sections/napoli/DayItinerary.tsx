"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { DAYS, DATE_RANGE_LABEL } from "./constants";

const T = {
  en: {
    sectionTitle: `${DAYS}-Day Itinerary`,
    sectionSubtitle: "2 adults + 1 child · €1,000 family budget",
    tipLabel: "Family tip",
    days: [
      {
        number: "01",
        title: "Arrival & Old Town",
        cost: "~€45",
        activities: [
          "Arrive at Naples International (NAP), check in to family room",
          "Walk Spaccanapoli end-to-end — the city at street level",
          "3 pizzas at L'Antica Pizzeria da Michele — €18–21 total",
          "Evening stroll through Quartieri Spagnoli, gelato for the child",
        ],
        tip: "Kids love the controlled chaos of Spaccanapoli. Da Michele has no reservations — arrive at opening (11:00) to avoid the queue with a child.",
      },
      {
        number: "02",
        title: "Museums & Artisan Streets",
        cost: "~€55",
        activities: [
          "Museo Archeologico Nazionale — 2 adults €30 · child FREE (under 18)",
          "Via San Gregorio Armeno — artisan nativity scene workshops, free",
          "Lunch at a trattoria on Spaccanapoli — €30–35 for 3",
          "Gelato on the walk back",
        ],
        tip: "Skip Napoli Sotterranea with young children — passages are very tight and candle-lit. The MANN's plaster cast room and Alexander mosaic are genuinely awe-inspiring for older kids.",
      },
      {
        number: "03",
        title: "Castles & Viewpoints",
        cost: "~€30",
        activities: [
          "Castel dell'Ovo — free entry, great views for children",
          "Lungomare Caracciolo waterfront walk (car-free on Sundays)",
          "Funicular to Vomero — 2 adults €2.20, child under 10 free",
          "Certosa di San Martino — 2 adults €12, child FREE (under 18)",
          "Sunset from the panoramic terrace",
        ],
        tip: "The funicular is thrilling for children. The Certosa cloisters are calmer than the street — a good mid-trip pause.",
      },
      {
        number: "04",
        title: "Capri Day Trip",
        cost: "~€100",
        activities: [
          "Early traditional ferry from Molo Beverello — 2 adults ~€28 + child ~€14 return",
          "Marina Grande — beach and harbour time for the child",
          "Bus to Anacapri (cheaper than funicular, great views)",
          "Lunch packed from Naples — avoid on-island restaurant prices",
          "Return ferry before 17:00 to avoid peak queues",
        ],
        tip: "Traditional ferry over hydrofoil with a child — less motion, more deck space, cheaper. Book return tickets immediately on arrival. The beach at Marina Grande keeps children entertained for hours.",
      },
      {
        number: "05",
        title: "Pompeii & Departure",
        cost: "~€65",
        activities: [
          "Circumvesuviana from Napoli Garibaldi — 3 tickets ~€9 total",
          "Pompeii — 2 adults €36, child FREE (under 18) · 3 hours",
          "Children's highlight: the plaster cast exhibit and Via dell'Abbondanza",
          "Return to Naples, depart",
        ],
        tip: "Pompeii is ideal for children — open air, dramatic, and free for under-18s. Bring hats and 1.5L water per person. The audio guide (€8) has a children's trail.",
      },
    ],
  },
  ro: {
    sectionTitle: `Itinerar ${DAYS} Zile`,
    sectionSubtitle: "2 adulti + 1 copil · buget familie €1.000",
    tipLabel: "Sfat familie",
    days: [
      {
        number: "01",
        title: "Sosire & Orasul Vechi",
        cost: "~€45",
        activities: [
          "Sosire pe Aeroportul Napoli (NAP), check-in camera de familie",
          "Plimbare pe Spaccanapoli de la un capat la altul",
          "3 pizza la L'Antica Pizzeria da Michele — €18–21 total",
          "Seara in Quartieri Spagnoli, inghetata pentru copil",
        ],
        tip: "Copiii adora haosul controlat al Spaccanapoli. La da Michele nu se fac rezervari — ajunge la deschidere (11:00) pentru a evita coada cu copilul.",
      },
      {
        number: "02",
        title: "Muzee & Strazi de Artizani",
        cost: "~€55",
        activities: [
          "Museo Archeologico Nazionale — 2 adulti €30 · copil GRATUIT (sub 18 ani)",
          "Via San Gregorio Armeno — ateliere de artizani, gratuit",
          "Pranz la o trattoria pe Spaccanapoli — €30–35 pentru 3 persoane",
          "Inghetata la intoarcere",
        ],
        tip: "Evita Napoli Sotterranea cu copii mici — pasajele sunt foarte stramte si luminate cu lumanari. Sala mulajelor de la MANN si mozaicul lui Alexandru sunt cu adevarat impresionante pentru copiii mai mari.",
      },
      {
        number: "03",
        title: "Castele & Panorame",
        cost: "~€30",
        activities: [
          "Castel dell'Ovo — intrare gratuita, vedere buna pentru copii",
          "Plimbare pe Lungomare Caracciolo (fara masini duminica)",
          "Funicular spre Vomero — 2 adulti €2.20, copil sub 10 ani gratuit",
          "Certosa di San Martino — 2 adulti €12, copil GRATUIT (sub 18 ani)",
          "Apus de soare de la terasa panoramica",
        ],
        tip: "Funicularele sunt fascinante pentru copii. Claustrele Certosa sunt mai linistite decat strada — o pauza buna la mijlocul calatoriei.",
      },
      {
        number: "04",
        title: "Excursie Capri",
        cost: "~€100",
        activities: [
          "Ferry traditional de dimineata din Molo Beverello — 2 adulti ~€28 + copil ~€14 dus-intors",
          "Marina Grande — plaja si port pentru copil",
          "Autobuz spre Anacapri (mai ieftin decat funicularele, privelisti frumoase)",
          "Pranz luat de acasa — evita preturile restaurantelor din Capri",
          "Retur inainte de 17:00 pentru a evita aglomeratia",
        ],
        tip: "Ferry traditional in loc de hidroglisant cu copilul — mai putin miscari, mai mult spatiu pe punte, mai ieftin. Cumpara biletele de retur imediat la sosire. Plaja de la Marina Grande tine copiii ocupati ore intregi.",
      },
      {
        number: "05",
        title: "Pompei & Plecare",
        cost: "~€65",
        activities: [
          "Circumvesuviana din Napoli Garibaldi — 3 bilete ~€9 total",
          "Pompei — 2 adulti €36, copil GRATUIT (sub 18 ani) · 3 ore",
          "Highlight pentru copii: expozitia mulajelor si Via dell'Abbondanza",
          "Intoarcere la Napoli, plecare",
        ],
        tip: "Pompei este ideal pentru copii — aer liber, dramatic si gratuit pentru sub 18 ani. Luati palarii si 1,5L apa per persoana. Audioghidul (€8) are un traseu special pentru copii.",
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
