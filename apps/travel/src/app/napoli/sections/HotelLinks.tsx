"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { RECOMMENDED_TIER, CHECK_IN, CHECK_OUT } from "../constants";

type HotelLink = {
  name: string;
  area: string;
  price: string;
  booking: string;
  google: string;
};

type TierGroup = {
  tier: string;
  hotels: HotelLink[];
};

const bookingUrl = (name: string) =>
  `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name + " Naples Italy")}&checkin=${CHECK_IN}&checkout=${CHECK_OUT}&group_adults=2&group_children=1&age=8`;

const googleUrl = (name: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(name + " Naples hotel")}`;

const TIERS_EN: TierGroup[] = [
  {
    tier: "Budget",
    hotels: [
      { name: "B&B Palazzo Ferrante",  area: "Spaccanapoli",       price: "~€65 / night",  booking: bookingUrl("B&B Palazzo Ferrante"),  google: googleUrl("B&B Palazzo Ferrante Naples") },
      { name: "Casa Tolentino",        area: "Quartieri Spagnoli", price: "~€75 / night",  booking: bookingUrl("Casa Tolentino"),        google: googleUrl("Casa Tolentino Naples") },
      { name: "Hotel Piazza Bellini",  area: "Centro Storico",     price: "~€85 / night",  booking: bookingUrl("Hotel Piazza Bellini"),  google: googleUrl("Hotel Piazza Bellini Naples") },
    ],
  },
  {
    tier: "Mid-Range",
    hotels: [
      { name: "Hotel Palazzo Decumani", area: "Spaccanapoli",   price: "~€95 / night",  booking: bookingUrl("Hotel Palazzo Decumani"),  google: googleUrl("Hotel Palazzo Decumani Naples") },
      { name: "Hotel Rex",              area: "Lungomare",      price: "~€110 / night", booking: bookingUrl("Hotel Rex Naples"),         google: googleUrl("Hotel Rex Naples Lungomare") },
      { name: "Grand Hotel Parker's",   area: "Corso Vittorio", price: "~€130 / night", booking: bookingUrl("Grand Hotel Parker's Naples"), google: googleUrl("Grand Hotel Parker's Naples") },
    ],
  },
  {
    tier: "Comfort",
    hotels: [
      { name: "Hotel Excelsior",               area: "Lungomare", price: "~€150 / night", booking: bookingUrl("Hotel Excelsior Naples"),              google: googleUrl("Hotel Excelsior Naples") },
      { name: "Hotel San Francesco al Monte",  area: "Vomero",    price: "~€160 / night", booking: bookingUrl("Hotel San Francesco al Monte Naples"), google: googleUrl("Hotel San Francesco al Monte Naples") },
      { name: "Grand Hotel Vesuvio",           area: "Lungomare", price: "~€190 / night", booking: bookingUrl("Grand Hotel Vesuvio Naples"),          google: googleUrl("Grand Hotel Vesuvio Naples") },
    ],
  },
];

const TIERS_RO: TierGroup[] = [
  {
    tier: "Buget",
    hotels: [
      { name: "B&B Palazzo Ferrante",  area: "Spaccanapoli",       price: "~€65 / noapte",  booking: bookingUrl("B&B Palazzo Ferrante"),  google: googleUrl("B&B Palazzo Ferrante Naples") },
      { name: "Casa Tolentino",        area: "Quartieri Spagnoli", price: "~€75 / noapte",  booking: bookingUrl("Casa Tolentino"),        google: googleUrl("Casa Tolentino Naples") },
      { name: "Hotel Piazza Bellini",  area: "Centro Storico",     price: "~€85 / noapte",  booking: bookingUrl("Hotel Piazza Bellini"),  google: googleUrl("Hotel Piazza Bellini Naples") },
    ],
  },
  {
    tier: "Mediu",
    hotels: [
      { name: "Hotel Palazzo Decumani", area: "Spaccanapoli",   price: "~€95 / noapte",  booking: bookingUrl("Hotel Palazzo Decumani"),  google: googleUrl("Hotel Palazzo Decumani Naples") },
      { name: "Hotel Rex",              area: "Lungomare",      price: "~€110 / noapte", booking: bookingUrl("Hotel Rex Naples"),         google: googleUrl("Hotel Rex Naples Lungomare") },
      { name: "Grand Hotel Parker's",   area: "Corso Vittorio", price: "~€130 / noapte", booking: bookingUrl("Grand Hotel Parker's Naples"), google: googleUrl("Grand Hotel Parker's Naples") },
    ],
  },
  {
    tier: "Confort",
    hotels: [
      { name: "Hotel Excelsior",               area: "Lungomare", price: "~€150 / noapte", booking: bookingUrl("Hotel Excelsior Naples"),              google: googleUrl("Hotel Excelsior Naples") },
      { name: "Hotel San Francesco al Monte",  area: "Vomero",    price: "~€160 / noapte", booking: bookingUrl("Hotel San Francesco al Monte Naples"), google: googleUrl("Hotel San Francesco al Monte Naples") },
      { name: "Grand Hotel Vesuvio",           area: "Lungomare", price: "~€190 / noapte", booking: bookingUrl("Grand Hotel Vesuvio Naples"),          google: googleUrl("Grand Hotel Vesuvio Naples") },
    ],
  },
];

const T = {
  en: {
    sectionLabel: "Booking Links",
    sectionTitle: "Find & Book Your Naples Hotel",
    sectionSubtitle: "Booking.com links pre-filled for 31 May – 7 Jun 2026, 2 adults + 1 child. Prices are verified family totals per night.",
    recommended: "RECOMMENDED",
    bookingLabel: "Booking.com",
    googleLabel: "Google",
    tiers: TIERS_EN,
  },
  ro: {
    sectionLabel: "Linkuri Rezervare",
    sectionTitle: "Găsește și Rezervă Hotelul în Napoli",
    sectionSubtitle: "Linkuri Booking.com prefiltrate pentru 31 mai – 7 iun 2026, 2 adulți + 1 copil. Prețurile sunt totaluri verificate per noapte pentru familie.",
    recommended: "RECOMANDAT",
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
            maxW: "600px",
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
          const isRecommended = gi === RECOMMENDED_TIER;
          return (
            <div key={group.tier}>
              {/* Tier label row */}
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
              <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
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
                    <div className={css({ display: "flex", gap: "2", flexShrink: "0" })}>
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
