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
  `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name + " Ischia Italy")}&checkin=${CHECK_IN}&checkout=${CHECK_OUT}&group_adults=2&group_children=1&age=8`;

const googleUrl = (name: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(name + " Ischia hotel")}`;

const TIERS_EN: TierGroup[] = [
  {
    tier: "Budget",
    hotels: [
      { name: "Agriturismo Pera di Basso", area: "Casamicciola", price: "~€130 / night", booking: bookingUrl("Agriturismo Pera di Basso"), google: googleUrl("Agriturismo Pera di Basso") },
      { name: "Le Canne Family Resort",    area: "Forio",        price: "~€150 / night", booking: bookingUrl("Le Canne Family Resort"),    google: googleUrl("Le Canne Family Resort Ischia") },
      { name: "Hotel Stella Maris Terme",  area: "Casamicciola", price: "~€170 / night", booking: bookingUrl("Hotel Stella Maris Terme"),  google: googleUrl("Hotel Stella Maris Terme Ischia") },
    ],
  },
  {
    tier: "Mid-Range",
    hotels: [
      { name: "Hotel Don Pepe",            area: "Lacco Ameno",  price: "~€150 / night", booking: bookingUrl("Hotel Don Pepe Ischia"),             google: googleUrl("Hotel Don Pepe Lacco Ameno") },
      { name: "Hotel Eden Park",           area: "Forio",        price: "~€165 / night", booking: bookingUrl("Hotel Eden Park Forio"),            google: googleUrl("Hotel Eden Park Forio Ischia") },
      { name: "Hotel San Valentino Terme", area: "Ischia Porto", price: "~€180 / night", booking: bookingUrl("Hotel San Valentino Terme Ischia"),  google: googleUrl("Hotel San Valentino Terme Ischia") },
    ],
  },
  {
    tier: "Comfort",
    hotels: [
      { name: "Sorriso Thermae Resort & Spa",      area: "Forio",       price: "~€190 / night", booking: bookingUrl("Sorriso Thermae Resort Ischia"),       google: googleUrl("Sorriso Thermae Resort Ischia") },
      { name: "Park Hotel Terme Michelangelo",      area: "Lacco Ameno", price: "~€210 / night", booking: bookingUrl("Park Hotel Terme Michelangelo Ischia"), google: googleUrl("Park Hotel Terme Michelangelo Ischia") },
      { name: "La Reginella Resort & Thermal Spa", area: "Lacco Ameno", price: "~€240 / night", booking: bookingUrl("La Reginella Resort Ischia"),           google: googleUrl("La Reginella Ischia") },
    ],
  },
];

const TIERS_RO: TierGroup[] = [
  {
    tier: "Buget",
    hotels: [
      { name: "Agriturismo Pera di Basso", area: "Casamicciola", price: "~€130 / noapte", booking: bookingUrl("Agriturismo Pera di Basso"), google: googleUrl("Agriturismo Pera di Basso") },
      { name: "Le Canne Family Resort",    area: "Forio",        price: "~€150 / noapte", booking: bookingUrl("Le Canne Family Resort"),    google: googleUrl("Le Canne Family Resort Ischia") },
      { name: "Hotel Stella Maris Terme",  area: "Casamicciola", price: "~€170 / noapte", booking: bookingUrl("Hotel Stella Maris Terme"),  google: googleUrl("Hotel Stella Maris Terme Ischia") },
    ],
  },
  {
    tier: "Mediu",
    hotels: [
      { name: "Hotel Don Pepe",            area: "Lacco Ameno",  price: "~€150 / noapte", booking: bookingUrl("Hotel Don Pepe Ischia"),             google: googleUrl("Hotel Don Pepe Lacco Ameno") },
      { name: "Hotel Eden Park",           area: "Forio",        price: "~€165 / noapte", booking: bookingUrl("Hotel Eden Park Forio"),            google: googleUrl("Hotel Eden Park Forio Ischia") },
      { name: "Hotel San Valentino Terme", area: "Ischia Porto", price: "~€180 / noapte", booking: bookingUrl("Hotel San Valentino Terme Ischia"),  google: googleUrl("Hotel San Valentino Terme Ischia") },
    ],
  },
  {
    tier: "Confort",
    hotels: [
      { name: "Sorriso Thermae Resort & Spa",      area: "Forio",       price: "~€190 / noapte", booking: bookingUrl("Sorriso Thermae Resort Ischia"),       google: googleUrl("Sorriso Thermae Resort Ischia") },
      { name: "Park Hotel Terme Michelangelo",      area: "Lacco Ameno", price: "~€210 / noapte", booking: bookingUrl("Park Hotel Terme Michelangelo Ischia"), google: googleUrl("Park Hotel Terme Michelangelo Ischia") },
      { name: "La Reginella Resort & Thermal Spa", area: "Lacco Ameno", price: "~€240 / noapte", booking: bookingUrl("La Reginella Resort Ischia"),           google: googleUrl("La Reginella Ischia") },
    ],
  },
];

const T = {
  en: {
    sectionLabel: "Booking Links",
    sectionTitle: "Find & Book Your Ischia Hotel",
    sectionSubtitle: "Booking.com links pre-filled for 31 May – 7 Jun 2026, 2 adults + 1 child. Prices are verified family totals per night.",
    recommended: "RECOMMENDED",
    bookingLabel: "Booking.com",
    googleLabel: "Google",
    tiers: TIERS_EN,
  },
  ro: {
    sectionLabel: "Linkuri Rezervare",
    sectionTitle: "Găsește și Rezervă Hotelul în Ischia",
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
