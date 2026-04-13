"use client";

import { css } from "styled-system/css";
import Link from "next/link";
import { useLang } from "@/components/LanguageSwitcher";
import { ISCHIA_HOTELS, TIER_META, getIschiaHotelsByTier } from "../hotels";
import { NIGHTS, DATE_RANGE_LABEL } from "../constants";

const T = {
  en: {
    back: "All Ischia Hotels",
    night: "night",
    nights: `${NIGHTS} nights`,
    dateRange: DATE_RANGE_LABEL.en,
    thermalFacilities: "Thermal Facilities",
    pools: "Pools",
    board: "Board",
    bestFor: "Best For",
    qualityPrice: "Quality ÷ Price",
    area: "Area",
    tier: "Price Tier",
    weekTotal: "Week Total",
    thermalDetail: "Thermal Water Details",
    otherHotels: "Other Hotels in This Tier",
    notFound: "Hotel not found",
    allTiers: "Browse All Tiers",
    familyTotal: "Family total per night (2 adults + 1 child)",
  },
  ro: {
    back: "Toate Hotelurile Ischia",
    night: "noapte",
    nights: `${NIGHTS} nopți`,
    dateRange: DATE_RANGE_LABEL.ro,
    thermalFacilities: "Facilități Termale",
    pools: "Piscine",
    board: "Pensiune",
    bestFor: "Ideal Pentru",
    qualityPrice: "Calitate ÷ Preț",
    area: "Zonă",
    tier: "Nivel Preț",
    weekTotal: "Total Săptămânal",
    thermalDetail: "Detalii Apă Termală",
    otherHotels: "Alte Hoteluri în Același Nivel",
    notFound: "Hotelul nu a fost găsit",
    allTiers: "Vezi Toate Nivelurile",
    familyTotal: "Total familie pe noapte (2 adulți + 1 copil)",
  },
};

export function IschiaHotelDetail({ slug }: { slug: string }) {
  const { lang } = useLang();
  const t = T[lang];

  const hotel = ISCHIA_HOTELS.find((h) => h.slug === slug);
  if (!hotel) {
    return (
      <main className={css({ px: { base: "4", md: "8" }, py: "20", textAlign: "center" })}>
        <p className={css({ color: "text.muted", fontSize: "body" })}>{t.notFound}</p>
        <Link
          href="/ischia"
          className={css({ color: "amber.warm", fontSize: "meta", mt: "4", display: "inline-block" })}
        >
          &larr; {t.back}
        </Link>
      </main>
    );
  }

  const h = hotel[lang];
  const tierMeta = TIER_META[hotel.tierIndex][lang];
  const siblings = getIschiaHotelsByTier(hotel.tierIndex).filter((s) => s.slug !== slug);
  const weekTotal = hotel.priceNum * NIGHTS;
  const stars = Array.from({ length: 5 }, (_, i) => (i < h.qualityPrice ? "★" : "☆")).join("");

  return (
    <main
      className={css({
        position: "relative",
        zIndex: 1,
        mx: "auto",
        px: { base: "4", sm: "6", md: "8", lg: "10", xl: "12" },
        pt: { base: "8", md: "16" },
        pb: { base: "12", md: "20" },
        animation: "fadeUp 0.6s ease-out",
      })}
    >
      {/* ── Back link ── */}
      <Link
        href="/ischia"
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "2",
          fontSize: "meta",
          fontFamily: "display",
          color: "text.muted",
          letterSpacing: "0.04em",
          mb: { base: "6", md: "10" },
          transition: "color 0.15s",
          _hover: { color: "amber.warm" },
        })}
      >
        &larr; {t.back}
      </Link>

      {/* ── Hero header ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        {/* Tier badge */}
        <p
          className={css({
            fontSize: "2xs",
            fontFamily: "display",
            fontWeight: "700",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "amber.warm",
            mb: "3",
          })}
        >
          {tierMeta.tier}
        </p>

        <h1
          className={css({
            fontSize: "h1",
            fontWeight: "800",
            fontFamily: "display",
            letterSpacing: "h1",
            color: "text.primary",
            lineHeight: "h1",
            mb: "3",
          })}
        >
          {h.name}
        </h1>

        <p
          className={css({
            fontSize: { base: "body", md: "h3" },
            fontFamily: "display",
            color: "text.muted",
            letterSpacing: "0.02em",
          })}
        >
          {h.area}, Ischia &middot; {h.note}
        </p>
      </div>

      {/* ── Price + QP hero row ── */}
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: { base: "4", md: "6" },
          mb: { base: "8", md: "12" },
        })}
      >
        {/* Price card */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "200px",
          })}
        >
          <p
            className={css({
              fontSize: "h1",
              fontWeight: "800",
              fontFamily: "display",
              color: "amber.warm",
              lineHeight: "1.1",
              mb: "1",
            })}
          >
            {h.price}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            {t.familyTotal}
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.weekTotal}: <strong className={css({ color: "text.primary" })}>€{weekTotal}</strong>{" "}
            ({t.nights}, {t.dateRange})
          </p>
        </div>

        {/* Quality-Price card */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: h.qualityPrice >= 4 ? "amber.warm" : "steel.border",
            rounded: "card",
            p: { base: "5", md: "6" },
            flex: "1",
            minW: "200px",
          })}
        >
          <p
            className={css({
              fontSize: "h2",
              fontWeight: "800",
              fontFamily: "display",
              color: h.qualityPrice >= 4 ? "amber.warm" : "text.muted",
              lineHeight: "1.1",
              mb: "1",
              letterSpacing: "0.04em",
            })}
          >
            {stars}
          </p>
          <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display" })}>
            {t.qualityPrice}
          </p>
          <div className={css({ h: "1px", bg: "steel.border", my: "3" })} />
          <p className={css({ fontSize: "xs", color: "text.secondary", fontFamily: "display" })}>
            {t.bestFor}: <span className={css({ color: "text.primary" })}>{h.bestFor}</span>
          </p>
        </div>
      </div>

      {/* ── Thermal Facilities section ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <h2
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            mb: "5",
          })}
        >
          {t.thermalFacilities}
        </h2>

        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
            display: "flex",
            flexDir: "column",
            gap: "5",
          })}
        >
          {/* Pools row */}
          <div>
            <p
              className={css({
                fontSize: "2xs",
                fontFamily: "display",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "amber.warm",
                mb: "2",
              })}
            >
              {t.pools}
            </p>
            <p
              className={css({
                fontSize: "h3",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                lineHeight: "1.2",
              })}
            >
              {h.thermalPools}
            </p>
          </div>

          <div className={css({ h: "1px", bg: "steel.border" })} />

          {/* Thermal detail */}
          <div>
            <p
              className={css({
                fontSize: "2xs",
                fontFamily: "display",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "text.faint",
                mb: "2",
              })}
            >
              {t.thermalDetail}
            </p>
            <p
              className={css({
                fontSize: "body",
                color: "text.secondary",
                lineHeight: "1.7",
              })}
            >
              {h.thermalDetail}
            </p>
          </div>

          <div className={css({ h: "1px", bg: "steel.border" })} />

          {/* Board info */}
          <div className={css({ display: "flex", gap: "6", flexWrap: "wrap" })}>
            <div>
              <p
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "text.faint",
                  mb: "1",
                })}
              >
                {t.board}
              </p>
              <p className={css({ fontSize: "xs", fontWeight: "600", fontFamily: "display", color: "text.primary" })}>
                {h.board}
              </p>
            </div>
            <div>
              <p
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "text.faint",
                  mb: "1",
                })}
              >
                {t.area}
              </p>
              <p className={css({ fontSize: "xs", fontWeight: "600", fontFamily: "display", color: "text.primary" })}>
                {h.area}
              </p>
            </div>
            <div>
              <p
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "text.faint",
                  mb: "1",
                })}
              >
                {t.tier}
              </p>
              <p className={css({ fontSize: "xs", fontWeight: "600", fontFamily: "display", color: "text.primary" })}>
                {tierMeta.tier} ({tierMeta.price})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── What to Expect (from tier) ── */}
      <div className={css({ mb: { base: "8", md: "12" } })}>
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "card",
            p: { base: "5", md: "7" },
          })}
        >
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
              gap: "5",
            })}
          >
            <div>
              <p
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "text.faint",
                  mb: "2",
                })}
              >
                {lang === "en" ? "What to expect" : "La ce să te aștepți"}
              </p>
              <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.6" })}>
                {tierMeta.expect}
              </p>
            </div>
            <div>
              <p
                className={css({
                  fontSize: "2xs",
                  fontFamily: "display",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "text.faint",
                  mb: "2",
                })}
              >
                {lang === "en" ? "Good for" : "Potrivit pentru"}
              </p>
              <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "1.6" })}>
                {tierMeta.goodFor}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Other hotels in tier ── */}
      {siblings.length > 0 && (
        <div className={css({ mb: { base: "8", md: "12" } })}>
          <h2
            className={css({
              fontSize: "h3",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              mb: "5",
            })}
          >
            {t.otherHotels}
          </h2>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: `repeat(${Math.min(siblings.length, 3)}, 1fr)` },
              gap: { base: "4", md: "5" },
            })}
          >
            {siblings.map((sib) => {
              const s = sib[lang];
              const sibStars = Array.from({ length: 5 }, (_, i) =>
                i < s.qualityPrice ? "★" : "☆"
              ).join("");
              return (
                <Link
                  key={sib.slug}
                  href={`/ischia/${sib.slug}`}
                  className={css({
                    bg: "steel.surface",
                    border: "1px solid",
                    borderColor: "steel.border",
                    rounded: "card",
                    boxShadow: "card",
                    p: { base: "5", md: "6" },
                    display: "flex",
                    flexDir: "column",
                    gap: "3",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    textDecoration: "none",
                    _hover: {
                      borderColor: "amber.warm",
                      boxShadow: "card.hover",
                    },
                  })}
                >
                  <p
                    className={css({
                      fontSize: "xs",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "text.primary",
                      lineHeight: "1.3",
                    })}
                  >
                    {s.name}
                  </p>
                  <p className={css({ fontSize: "2xs", color: "text.faint", fontFamily: "display" })}>
                    {s.area} &middot; {s.note}
                  </p>
                  <div className={css({ h: "1px", bg: "steel.border" })} />
                  <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "baseline" })}>
                    <span
                      className={css({
                        fontSize: "h3",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "amber.warm",
                      })}
                    >
                      {s.price}
                    </span>
                    <span
                      className={css({
                        fontSize: "2xs",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: s.qualityPrice >= 4 ? "amber.warm" : "text.faint",
                      })}
                    >
                      {sibStars}
                    </span>
                  </div>
                  <p className={css({ fontSize: "2xs", color: "text.muted", fontFamily: "display" })}>
                    {s.thermalPools}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Back to all tiers ── */}
      <div className={css({ textAlign: "center", pt: "4" })}>
        <Link
          href="/ischia"
          className={css({
            display: "inline-block",
            fontSize: "meta",
            fontFamily: "display",
            fontWeight: "600",
            color: "amber.warm",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "opacity 0.15s",
            _hover: { opacity: 0.8 },
          })}
        >
          &larr; {t.allTiers}
        </Link>
      </div>
    </main>
  );
}
