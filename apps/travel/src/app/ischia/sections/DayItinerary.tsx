"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { DAYS, DATE_RANGE_LABEL } from "../constants";

/* ── Energy-level badge palette ────────────────────────────────────── */
const ENERGY: Record<string, { bg: string; color: string }> = {
  low:           { bg: "rgba(76, 175, 80, 0.15)",  color: "rgb(76, 175, 80)" },
  "low-medium":  { bg: "rgba(139, 195, 74, 0.15)", color: "rgb(139, 195, 74)" },
  medium:        { bg: "rgba(255, 193, 7, 0.15)",  color: "rgb(255, 193, 7)" },
  "medium-high": { bg: "rgba(255, 152, 0, 0.15)",  color: "rgb(255, 152, 0)" },
  high:          { bg: "rgba(244, 67, 54, 0.15)",  color: "rgb(244, 67, 54)" },
};

interface DayData {
  number: string;
  title: string;
  places: string;
  energy: string;
  cost: string;
  tip: string;
}

const T = {
  en: {
    sectionLabel: "Itinerary",
    sectionTitle: "7-Day Thermal Itinerary",
    sectionSubtitle: `Thermal-focused ${DAYS}-day plan for 2 adults + 1 child. Balanced between park days, free springs, culture, and hiking.`,
    tipLabel: "Tip",
    energyLabel: "Kid energy",
    days: [
      {
        number: "01",
        title: "Arrival & First Soak",
        places: "Ferry from Naples → Ischia Porto → Hotel check-in → Hotel thermal pool",
        energy: "low",
        cost: "€0 (hotel pool)",
        tip: "Evening passeggiata along Ischia Porto harbour for orientation and gelato.",
      },
      {
        number: "02",
        title: "Poseidon — The Grand Tour",
        places: "Giardini Poseidon Terme (full day, all 22 pools) → Citara Beach sunset",
        energy: "medium",
        cost: "€96 (2 adults + 1 child, full day)",
        tip: "Arrive at 9:00 for best lounger spots near pool 16. Pack lunch to avoid overpriced restaurant.",
      },
      {
        number: "03",
        title: "Negombo & Lacco Ameno",
        places: "Negombo Thermal Gardens → Lacco Ameno mushroom rock → San Montano Bay beach → Dinner in Lacco Ameno",
        energy: "medium",
        cost: "€98 (park entry + dinner)",
        tip: "Book the volcanic-mud treatment a day ahead (€25 extra). The bay is Ischia's calmest swimming water.",
      },
      {
        number: "04",
        title: "Sant'Angelo & Southern Thermals",
        places: "Bus CS to Sant'Angelo → Cavascura Roman spa → Water taxi to Fumarole Beach → Sant'Angelo village sunset",
        energy: "medium-high",
        cost: "€65 (Cavascura + water taxis + lunch)",
        tip: "One parent does Cavascura while the other stays with kids at Maronti beach. Reunite at Sant'Angelo for sunset.",
      },
      {
        number: "05",
        title: "Epomeo Hike & Nitrodi Springs",
        places: "Bus to Fontana → Monte Epomeo summit hike (788m) → Descent to Fonte delle Ninfe Nitrodi → Cool spring soak",
        energy: "high",
        cost: "€32 (Nitrodi entry + lunch)",
        tip: "Start early (7:30) to avoid midday heat. Bring 1.5L water per person. The summit restaurant La Grotta da Fiore is worth the splurge.",
      },
      {
        number: "06",
        title: "Sorgeto Bay & Forio",
        places: "Morning at hotel pool → Afternoon: Chiesa del Soccorso → Forio town & shopping → Sorgeto Bay at sunset (water taxi)",
        energy: "low-medium",
        cost: "€21 (water taxi × 3)",
        tip: "Save Sorgeto for sunset — the steam rising from moonlit water is Ischia's most memorable experience.",
      },
      {
        number: "07",
        title: "Castello & Departure",
        places: "Castello Aragonese → Ischia Ponte gelato & shopping → Ferry to Naples → Flight home",
        energy: "low",
        cost: "€31 (castle entry + gelato)",
        tip: "Take the elevator up, walk down through the gardens. Book an afternoon ferry to have a relaxed morning.",
      },
    ] as DayData[],
  },
  ro: {
    sectionLabel: "Itinerar",
    sectionTitle: "Itinerar Termal de 7 Zile",
    sectionSubtitle: `Plan de ${DAYS} zile axat pe terme pentru 2 adulți + 1 copil. Echilibrat între zile de parc, izvoare gratuite, cultură și drumeții.`,
    tipLabel: "Sfat",
    energyLabel: "Energie copil",
    days: [
      {
        number: "01",
        title: "Sosire & Prima Scufundare",
        places: "Feribot din Napoli → Ischia Porto → Check-in hotel → Piscina termală a hotelului",
        energy: "low",
        cost: "€0 (hotel pool)",
        tip: "Plimbare de seară de-a lungul portului Ischia Porto pentru orientare și înghețată.",
      },
      {
        number: "02",
        title: "Poseidon — Turul Mare",
        places: "Giardini Poseidon Terme (zi întreagă, toate cele 22 piscine) → Apus la Plaja Citara",
        energy: "medium",
        cost: "€96 (2 adulți + 1 copil, zi întreagă)",
        tip: "Ajungeți la 9:00 pentru cele mai bune locuri la șezlonguri lângă piscina 16. Luați prânzul cu voi pentru a evita restaurantul scump.",
      },
      {
        number: "03",
        title: "Negombo & Lacco Ameno",
        places: "Grădinile Termale Negombo → Stânca ciupercă din Lacco Ameno → Plaja Golful San Montano → Cină în Lacco Ameno",
        energy: "medium",
        cost: "€98 (intrare parc + cină)",
        tip: "Rezervați tratamentul cu nămol vulcanic cu o zi înainte (€25 extra). Golful are cea mai calmă apă de înot din Ischia.",
      },
      {
        number: "04",
        title: "Sant'Angelo & Termele Sudice",
        places: "Autobuz CS la Sant'Angelo → Spa roman Cavascura → Taxi nautic la Plaja Fumarole → Apus în satul Sant'Angelo",
        energy: "medium-high",
        cost: "€65 (Cavascura + taxi nautic + prânz)",
        tip: "Un părinte face Cavascura în timp ce celălalt rămâne cu copiii la plaja Maronti. Reunire la Sant'Angelo pentru apus.",
      },
      {
        number: "05",
        title: "Drumeția Epomeo & Izvoarele Nitrodi",
        places: "Autobuz la Fontana → Drumeție la vârful Monte Epomeo (788m) → Coborâre la Fonte delle Ninfe Nitrodi → Scufundare în izvorul rece",
        energy: "high",
        cost: "€32 (intrare Nitrodi + prânz)",
        tip: "Porniți devreme (7:30) pentru a evita căldura de la prânz. Aduceți 1.5L apă per persoană. Restaurantul de la vârf La Grotta da Fiore merită cheltuiala.",
      },
      {
        number: "06",
        title: "Golful Sorgeto & Forio",
        places: "Dimineață la piscina hotelului → După-amiază: Chiesa del Soccorso → Orașul Forio & cumpărături → Golful Sorgeto la apus (taxi nautic)",
        energy: "low-medium",
        cost: "€21 (taxi nautic × 3)",
        tip: "Păstrați Sorgeto pentru apus — aburul ridicându-se din apa luminată de lună este cea mai memorabilă experiență din Ischia.",
      },
      {
        number: "07",
        title: "Castelul & Plecarea",
        places: "Castello Aragonese → Înghețată & cumpărături în Ischia Ponte → Feribot la Napoli → Zbor acasă",
        energy: "low",
        cost: "€31 (intrare castel + înghețată)",
        tip: "Luați liftul în sus, coborâți pe jos prin grădini. Rezervați un feribot de după-amiază pentru o dimineață relaxată.",
      },
    ] as DayData[],
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
      {/* ── Section header ── */}
      <div className={css({ mb: "12" })}>
        <p
          className={css({
            fontSize: "meta",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            mb: "2",
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

      {/* ── Timeline ── */}
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
        {t.days.map((day) => {
          const energyStyle = ENERGY[day.energy] ?? ENERGY.medium;

          return (
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

                {/* Places */}
                <p
                  className={css({
                    fontSize: "label",
                    color: "text.secondary",
                    lineHeight: "1.6",
                    mb: "4",
                  })}
                >
                  {day.places}
                </p>

                {/* Energy badge */}
                <div className={css({ mb: "4" })}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "11px",
                      fontWeight: 600,
                      lineHeight: "1",
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      backgroundColor: energyStyle.bg,
                      color: energyStyle.color,
                    }}
                  >
                    {t.energyLabel}: {day.energy}
                  </span>
                </div>

                {/* Tip */}
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
                      fontStyle: "italic",
                      m: "0",
                    })}
                  >
                    {day.tip}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
