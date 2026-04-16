"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const flights = [
  { city: "Bucharest", code: "OTP", price: "€80–140", duration: "2h direct", carriers: "Wizz Air, Ryanair" },
  { city: "London", code: "STN/LTN", price: "€50–120", duration: "2.5h direct", carriers: "Ryanair, easyJet" },
  { city: "Paris", code: "CDG/ORY", price: "€60–130", duration: "2h direct", carriers: "Vueling, easyJet" },
  { city: "Amsterdam", code: "AMS", price: "€70–150", duration: "2.5h direct", carriers: "easyJet, KLM" },
  { city: "Madrid", code: "MAD", price: "€60–140", duration: "2.5h direct", carriers: "Vueling, Iberia" },
  { city: "Vienna", code: "VIE", price: "€60–130", duration: "2h direct", carriers: "Ryanair, Austrian" },
  { city: "Warsaw", code: "WAW", price: "€80–150", duration: "2.5h direct", carriers: "Wizz Air, LOT" },
  { city: "Berlin", code: "BER", price: "€70–150", duration: "2.5h direct", carriers: "easyJet, Ryanair" },
];

const T = {
  en: {
    title: "Getting There",
    airport: "Napoli Intl — NAP",
    budgetTag: "Budget allocation: €280 of €1,000",
    colCity: "City",
    colCode: "Code",
    colPrice: "Price",
    colDuration: "Duration",
    colCarriers: "Carriers",
    budgetTipLabel: "Budget tip",
    budgetTip:
      "Book 6–8 weeks ahead for the €280 budget. Low season flights (Nov–Mar) can be 30–40% cheaper.",
  },
  ro: {
    title: "Cum ajungi",
    airport: "Aeroportul Napoli — NAP",
    budgetTag: "Alocare buget: €280 din €1.000",
    colCity: "Oras",
    colCode: "Cod",
    colPrice: "Pret",
    colDuration: "Durata",
    colCarriers: "Companii",
    budgetTipLabel: "Sfat buget",
    budgetTip:
      "Rezerva cu 6–8 saptamani inainte pentru bugetul de €280. Zborurile in extrasezon (Nov–Mar) pot fi cu 30–40% mai ieftine.",
  },
};

export function FlightGuide() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        maxW: "5xl",
        mx: "auto",
        mb: { base: "16", md: "20" },
        animation: "fadeUp 0.6s ease-out 0.18s both",
      })}
    >
      {/* ── Section header ── */}
      <div
        className={css({
          display: "flex",
          alignItems: "baseline",
          gap: "4",
          mb: "8",
          flexWrap: "wrap",
        })}
      >
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            letterSpacing: "h2",
            lineHeight: "h2",
            flexShrink: "0",
          })}
        >
          {t.title}
        </h2>

        {/* Budget allocation tag */}
        <span
          className={css({
            display: "inline-flex",
            alignItems: "center",
            fontSize: "2xs",
            fontWeight: "700",
            fontFamily: "display",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            bg: "rgba(201,146,42,0.12)",
            color: "amber.warm",
            border: "1px solid rgba(201,146,42,0.3)",
            rounded: "pill",
            px: "3",
            py: "1",
            flexShrink: "0",
          })}
        >
          {t.budgetTag}
        </span>

        <span
          className={css({
            flex: "1",
            height: "1px",
            bg: "steel.border",
            display: { base: "none", md: "block" },
          })}
        />
      </div>

      {/* Airport sub-label */}
      <p
        className={css({
          fontSize: "meta",
          fontFamily: "display",
          fontWeight: "600",
          color: "text.faint",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          mb: "6",
        })}
      >
        {t.airport}
      </p>

      {/* ── Flight table card ── */}
      <div
        className={css({
          bg: "steel.surface",
          border: "1px solid",
          borderColor: "steel.border",
          rounded: "card",
          boxShadow: "card",
          overflow: "hidden",
          mb: "5",
        })}
      >
        {/* Table header */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "1fr 80px 90px 110px 1fr",
            gap: "0",
            px: { base: "4", md: "6" },
            py: "3",
            borderBottom: "1px solid",
            borderColor: "steel.border",
            bg: "steel.raised",
          })}
        >
          {[t.colCity, t.colCode, t.colPrice, t.colDuration, t.colCarriers].map(
            (col) => (
              <span
                key={col}
                className={css({
                  fontSize: "2xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "text.faint",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                })}
              >
                {col}
              </span>
            )
          )}
        </div>

        {/* Table rows */}
        {flights.map((row, i) => (
          <div
            key={row.city}
            className={css({
              display: "grid",
              gridTemplateColumns: "1fr 80px 90px 110px 1fr",
              gap: "0",
              px: { base: "4", md: "6" },
              py: { base: "3", md: "3.5" },
              borderBottom: i < flights.length - 1 ? "1px solid" : "none",
              borderColor: "steel.border",
              alignItems: "center",
              transition: "background 0.12s ease",
              _hover: { bg: "steel.raised" },
            })}
          >
            {/* City */}
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "600",
                color: "text.primary",
                fontFamily: "display",
              })}
            >
              {row.city}
            </span>

            {/* IATA code */}
            <span
              className={css({
                fontSize: "xs",
                color: "text.faint",
                fontFamily: "mono",
                letterSpacing: "0.06em",
              })}
            >
              {row.code}
            </span>

            {/* Price */}
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                color: "amber.warm",
                fontFamily: "display",
              })}
            >
              {row.price}
            </span>

            {/* Duration */}
            <span
              className={css({
                fontSize: "xs",
                color: "text.muted",
                fontFamily: "display",
              })}
            >
              {row.duration}
            </span>

            {/* Carriers */}
            <span
              className={css({
                fontSize: "2xs",
                color: "text.faint",
                fontFamily: "display",
                lineHeight: "1.4",
              })}
            >
              {row.carriers}
            </span>
          </div>
        ))}
      </div>

      {/* ── Budget tip ── */}
      <div
        className={css({
          bg: "steel.surface",
          border: "1px solid",
          borderColor: "steel.border",
          rounded: "card",
          p: { base: "4", md: "5" },
          boxShadow: "card",
          display: "flex",
          gap: "4",
          alignItems: "flex-start",
          position: "relative",
          overflow: "hidden",
        })}
      >
        {/* Left accent */}
        <div
          className={css({
            position: "absolute",
            top: "0",
            left: "0",
            bottom: "0",
            w: "3px",
            bg: "linear-gradient(180deg, token(colors.amber.warm), transparent)",
          })}
        />

        <div className={css({ pl: "2" })}>
          <p
            className={css({
              fontSize: "2xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              mb: "1.5",
            })}
          >
            {t.budgetTipLabel}
          </p>
          <p
            className={css({
              fontSize: "xs",
              color: "text.secondary",
              lineHeight: "1.65",
            })}
          >
            {t.budgetTip}
          </p>
        </div>
      </div>
    </section>
  );
}
