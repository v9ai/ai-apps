"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { RECOMMENDED_TIER } from "../constants";

type HotelLink = {
  name: string;
  area: string;
  price: string;
  booking: string;
  google: string;
};

type TierGroup = {
  tier: string;
  mlScore: number;
  hotels: HotelLink[];
};

const bookingUrl = (name: string) =>
  `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name + " Naples Italy")}`;

const googleUrl = (name: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(name + " Naples hotel")}`;

const TIERS_EN: TierGroup[] = [
  {
    tier: "Budget",
    mlScore: ML_TIER_SCORES[0],
    hotels: [
      { name: "B&B Spaccanapoli",       area: "Centro Storico",    price: "€45 / night", booking: bookingUrl("B&B Spaccanapoli"),       google: googleUrl("B&B Spaccanapoli") },
      { name: "A' Puteca di Napoli",    area: "Quartieri Spagnoli",price: "€48 / night", booking: bookingUrl("A' Puteca di Napoli"),    google: googleUrl("A' Puteca di Napoli") },
      { name: "Napoli Centrale Rooms",  area: "Piazza Garibaldi",  price: "€52 / night", booking: bookingUrl("Napoli Centrale Rooms"),  google: googleUrl("Napoli Centrale Rooms") },
    ],
  },
  {
    tier: "Mid-Range",
    mlScore: ML_TIER_SCORES[1],
    hotels: [
      { name: "Hotel Piazza Bellini",   area: "Centro Storico",    price: "€68 / night", booking: bookingUrl("Hotel Piazza Bellini"),   google: googleUrl("Hotel Piazza Bellini") },
      { name: "Hotel de Charme Toledo", area: "Via Toledo",        price: "€65 / night", booking: bookingUrl("Hotel de Charme Toledo"), google: googleUrl("Hotel de Charme Toledo Naples") },
      { name: "Costantinopoli 104",     area: "Centro Storico",    price: "€72 / night", booking: bookingUrl("Costantinopoli 104"),     google: googleUrl("Costantinopoli 104 Naples") },
    ],
  },
  {
    tier: "Comfort",
    mlScore: ML_TIER_SCORES[2],
    hotels: [
      { name: "Grand Hotel Vesuvio",    area: "Lungomare",         price: "€145 / night", booking: bookingUrl("Grand Hotel Vesuvio"),    google: googleUrl("Grand Hotel Vesuvio Naples") },
      { name: "Hotel Santa Lucia",      area: "Lungomare",         price: "€130 / night", booking: bookingUrl("Hotel Santa Lucia Naples"), google: googleUrl("Hotel Santa Lucia Naples") },
      { name: "Romeo Hotel",            area: "Porto",             price: "€155 / night", booking: bookingUrl("Romeo Hotel Naples"),      google: googleUrl("Romeo Hotel Naples") },
    ],
  },
];

const TIERS_RO: TierGroup[] = [
  {
    tier: "Buget",
    mlScore: ML_TIER_SCORES[0],
    hotels: [
      { name: "B&B Spaccanapoli",       area: "Centro Storico",    price: "€45 / noapte", booking: bookingUrl("B&B Spaccanapoli"),       google: googleUrl("B&B Spaccanapoli") },
      { name: "A' Puteca di Napoli",    area: "Quartieri Spagnoli",price: "€48 / noapte", booking: bookingUrl("A' Puteca di Napoli"),    google: googleUrl("A' Puteca di Napoli") },
      { name: "Napoli Centrale Rooms",  area: "Piazza Garibaldi",  price: "€52 / noapte", booking: bookingUrl("Napoli Centrale Rooms"),  google: googleUrl("Napoli Centrale Rooms") },
    ],
  },
  {
    tier: "Mediu",
    mlScore: ML_TIER_SCORES[1],
    hotels: [
      { name: "Hotel Piazza Bellini",   area: "Centro Storico",    price: "€68 / noapte", booking: bookingUrl("Hotel Piazza Bellini"),   google: googleUrl("Hotel Piazza Bellini") },
      { name: "Hotel de Charme Toledo", area: "Via Toledo",        price: "€65 / noapte", booking: bookingUrl("Hotel de Charme Toledo"), google: googleUrl("Hotel de Charme Toledo Naples") },
      { name: "Costantinopoli 104",     area: "Centro Storico",    price: "€72 / noapte", booking: bookingUrl("Costantinopoli 104"),     google: googleUrl("Costantinopoli 104 Naples") },
    ],
  },
  {
    tier: "Confort",
    mlScore: ML_TIER_SCORES[2],
    hotels: [
      { name: "Grand Hotel Vesuvio",    area: "Lungomare",         price: "€145 / noapte", booking: bookingUrl("Grand Hotel Vesuvio"),    google: googleUrl("Grand Hotel Vesuvio Naples") },
      { name: "Hotel Santa Lucia",      area: "Lungomare",         price: "€130 / noapte", booking: bookingUrl("Hotel Santa Lucia Naples"), google: googleUrl("Hotel Santa Lucia Naples") },
      { name: "Romeo Hotel",            area: "Porto",             price: "€155 / noapte", booking: bookingUrl("Romeo Hotel Naples"),      google: googleUrl("Romeo Hotel Naples") },
    ],
  },
];

const T = {
  en: {
    sectionLabel: "Booking Links",
    sectionTitle: "Find & Book Your Hotel",
    sectionSubtitle: "Direct search links to Booking.com and Google for each property. All 9 hotels — 3 per tier.",
    recommended: "RECOMMENDED",
    mlLabel: ML_SHORT_LABEL,
    bookingLabel: "Booking.com",
    googleLabel: "Google",
    tiers: TIERS_EN,
  },
  ro: {
    sectionLabel: "Linkuri Rezervare",
    sectionTitle: "Găsește și Rezervă Hotelul",
    sectionSubtitle: "Linkuri directe pe Booking.com și Google pentru fiecare proprietate. Toate 9 hoteluri — 3 pe nivel.",
    recommended: "RECOMANDAT",
    mlLabel: ML_SHORT_LABEL,
    bookingLabel: "Booking.com",
    googleLabel: "Google",
    tiers: TIERS_RO,
  },
};

export function HotelLinks() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        bg: "steel.surface",
        py: { base: "14", md: "20" },
        px: { base: "5", md: "8" },
        borderTop: "1px solid",
        borderColor: "steel.border",
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

      {/* ── Tier groups ── */}
      <div
        className={css({
          maxW: "960px",
          mx: "auto",
          display: "flex",
          flexDir: "column",
          gap: { base: "8", md: "10" },
        })}
      >
        {t.tiers.map((group, gi) => {
          const isRecommended = gi === ML_TIER_RECOMMENDED;
          return (
            <div key={group.tier}>
              {/* Tier label */}
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  mb: "4",
                })}
              >
                <p
                  className={css({
                    fontSize: "xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: isRecommended ? "amber.warm" : "text.muted",
                  })}
                >
                  {group.tier}
                </p>
                <span
                  className={css({
                    fontSize: "2xs",
                    fontFamily: "display",
                    fontWeight: "700",
                    color: isRecommended ? "amber.bright" : "text.faint",
                    bg: "steel.raised",
                    border: "1px solid",
                    borderColor: isRecommended ? "amber.warm" : "steel.border",
                    rounded: "pill",
                    px: "2",
                    py: "0.5",
                  })}
                >
                  {t.mlLabel} {group.mlScore}
                </span>
                {isRecommended && (
                  <span
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      fontWeight: "700",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      bg: "amber.warm",
                      color: "steel.dark",
                      rounded: "pill",
                      px: "2.5",
                      py: "0.5",
                    })}
                  >
                    {t.recommended}
                  </span>
                )}
                <span
                  className={css({
                    flex: "1",
                    h: "1px",
                    bg: isRecommended ? "rgba(201,146,42,0.3)" : "steel.border",
                  })}
                />
              </div>

              {/* Hotel rows */}
              <div
                className={css({
                  display: "flex",
                  flexDir: "column",
                  gap: "2",
                })}
              >
                {group.hotels.map((hotel) => (
                  <div
                    key={hotel.name}
                    className={css({
                      bg: "steel.raised",
                      border: "1px solid",
                      borderColor: isRecommended ? "rgba(201,146,42,0.18)" : "steel.border",
                      rounded: "card",
                      px: { base: "4", md: "5" },
                      py: { base: "3", md: "3.5" },
                      display: "flex",
                      alignItems: "center",
                      gap: { base: "3", md: "4" },
                      flexWrap: "wrap",
                      transition: "border-color 0.15s",
                      _hover: {
                        borderColor: isRecommended ? "amber.warm" : "steel.borderHover",
                      },
                    })}
                  >
                    {/* Name + area */}
                    <div className={css({ flex: "1", minW: "0" })}>
                      <p
                        className={css({
                          fontSize: "sm",
                          fontWeight: "700",
                          fontFamily: "display",
                          color: "text.primary",
                          lineHeight: "1.3",
                        })}
                      >
                        {hotel.name}
                      </p>
                      <p
                        className={css({
                          fontSize: "2xs",
                          color: "text.faint",
                          fontFamily: "display",
                          letterSpacing: "0.04em",
                          mt: "0.5",
                        })}
                      >
                        {hotel.area}
                      </p>
                    </div>

                    {/* Price */}
                    <span
                      className={css({
                        fontSize: "xs",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: isRecommended ? "amber.warm" : "text.muted",
                        whiteSpace: "nowrap",
                        flexShrink: "0",
                      })}
                    >
                      {hotel.price}
                    </span>

                    {/* Links */}
                    <div
                      className={css({
                        display: "flex",
                        gap: "2",
                        flexShrink: "0",
                      })}
                    >
                      <a
                        href={hotel.booking}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({
                          fontSize: "2xs",
                          fontFamily: "display",
                          fontWeight: "700",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "steel.dark",
                          bg: isRecommended ? "amber.warm" : "text.muted",
                          rounded: "pill",
                          px: "3",
                          py: "1.5",
                          transition: "opacity 0.15s",
                          _hover: { opacity: 0.85 },
                          whiteSpace: "nowrap",
                        })}
                      >
                        {t.bookingLabel}
                      </a>
                      <a
                        href={hotel.google}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({
                          fontSize: "2xs",
                          fontFamily: "display",
                          fontWeight: "700",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "text.secondary",
                          bg: "steel.surface",
                          border: "1px solid",
                          borderColor: "steel.border",
                          rounded: "pill",
                          px: "3",
                          py: "1.5",
                          transition: "border-color 0.15s, color 0.15s",
                          _hover: { borderColor: "steel.borderHover", color: "text.primary" },
                          whiteSpace: "nowrap",
                        })}
                      >
                        {t.googleLabel}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
