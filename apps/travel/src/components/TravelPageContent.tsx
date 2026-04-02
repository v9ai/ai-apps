"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { data, scrapedReviews } from "@/lib/data";
import { CATEGORY_META, type Category } from "@/lib/categories";
import type { Place } from "@/lib/types";
import { MapOverview } from "@/components/MapOverview";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Footer } from "@/components/Footer";
import { HotelPicks } from "@/components/HotelPicks";
import { useLang } from "@/components/LanguageSwitcher";
import { getKatowiceHotelsWithReviews } from "@/lib/data";

const T = {
  ro: {
    eyebrow: "Ghid de Calatorie \u2014 Polonia",
    tagline: (n: number) =>
      `Silezia Superioara, Polonia\u00a0\u00a0\u00b7\u00a0\u00a0Carbune. Cultura. Metamorfoza.\u00a0\u00a0\u00b7\u00a0\u00a0${n} locuri esentiale`,
    overview: "Prezentare generala",
    map: "Exploreaza harta",
    places: "Locuri de vizitat",
  },
  en: {
    eyebrow: "Travel Guide \u2014 Poland",
    tagline: (n: number) =>
      `Upper Silesia, Poland\u00a0\u00a0\u00b7\u00a0\u00a0Coal. Culture. Metamorphosis.\u00a0\u00a0\u00b7\u00a0\u00a0${n} essential places`,
    overview: "City Overview",
    map: "Explore the Map",
    places: "Places to Visit",
  },
};

interface Props {
  category?: Category | null;
}

export function TravelPageContent({ category }: Props) {
  const { lang } = useLang();
  const t = T[lang];
  const { city, city_overview, city_overview_ro, places, booking_summary } = data;
  const curatedHotels = booking_summary?.curated_hotels ?? [];

  const overview = lang === "ro" && city_overview_ro ? city_overview_ro : city_overview;

  const mapPlaces = category ? places.filter((p) => p.category === category) : places;

  // Build ranking map from data
  const rankingMap = new Map<string, { bestRank?: number; cheapestRank?: number }>();
  if (data.rankings) {
    data.rankings.best.forEach((name, i) => {
      const entry = rankingMap.get(name) || {};
      entry.bestRank = i + 1;
      rankingMap.set(name, entry);
    });
    data.rankings.cheapest.forEach((name, i) => {
      const entry = rankingMap.get(name) || {};
      entry.cheapestRank = i + 1;
      rankingMap.set(name, entry);
    });
  }

  return (
    <>
      <main
        className={css({
          position: "relative",
          zIndex: 1,
          mx: "auto",
          px: { base: "4", sm: "6", md: "10", lg: "16", xl: "20" },
          pt: { base: "10", sm: "16", md: "24" },
          pb: { base: "12", md: "20" },
        })}
      >
        {/* ── Hero ─────────────────────────────────────────── */}
        <header
          className={css({
            textAlign: "center",
            maxW: "3xl",
            mx: "auto",
            mb: { base: "10", sm: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3",
              mb: "6",
            })}
          >
            <span className={css({ display: "block", w: "6", h: "1px", bg: "amber.warm", animation: "coalSeam 3s ease-in-out infinite", transformOrigin: "center" })} />
            <p
              className={css({
                fontSize: "label",
                fontWeight: "600",
                fontFamily: "display",
                color: "amber.warm",
                letterSpacing: "label",
                textTransform: "uppercase",
              })}
            >
              {t.eyebrow}
            </p>
            <span className={css({ display: "block", w: "6", h: "1px", bg: "amber.warm", animation: "coalSeam 3s ease-in-out infinite", transformOrigin: "center" })} />
          </div>

          <h1
            className={css({
              fontSize: "h1",
              fontWeight: "800",
              fontFamily: "display",
              letterSpacing: "h1",
              color: "text.primary",
              lineHeight: "h1",
            })}
          >
            {city}
          </h1>

          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "4",
              my: "5",
              maxW: "xs",
              mx: "auto",
            })}
          >
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
            <span
              className={css({
                fontSize: "meta",
                fontFamily: "display",
                color: "text.faint",
                letterSpacing: "0.1em",
                fontWeight: "600",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              50\u00b015\u2032N 19\u00b001\u2032E
            </span>
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
          </div>

          <p
            className={css({
              fontSize: { base: "meta", md: "body" },
              fontFamily: "display",
              color: "text.muted",
              fontWeight: "400",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            })}
          >
            {t.tagline(places.length)}
          </p>
        </header>

        {/* ── Overview ────────────────────────────────────────── */}
        <div
          className={css({
            maxW: "5xl",
            mx: "auto",
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.05s both",
          })}
        >
          <hr
            className={css({
              border: "none",
              borderTop: "1px solid",
              borderColor: "steel.border",
              mb: { base: "10", md: "14" },
            })}
          />

          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "3",
              mb: "6",
            })}
          >
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
            <span
              className={css({
                fontSize: "label",
                fontWeight: "600",
                fontFamily: "display",
                color: "amber.warm",
                letterSpacing: "label",
                textTransform: "uppercase",
              })}
            >
              {t.overview}
            </span>
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
          </div>

          <div
            className={css({
              bg: "steel.surface",
              rounded: "card",
              border: "1px solid",
              borderColor: "steel.border",
              p: { base: "6", md: "10" },
              boxShadow: "card",
            })}
          >
            {overview.split("\n\n").map((para, i, arr) => {
              const isLede = i === 0;
              return (
                <div
                  key={i}
                  className={css({
                    display: "flex",
                    gap: isLede ? "4" : "0",
                    mb: i < arr.length - 1 ? (isLede ? "8" : "5") : "0",
                  })}
                >
                  {isLede && (
                    <div
                      className={css({
                        flexShrink: "0",
                        w: "3px",
                        rounded: "full",
                        alignSelf: "stretch",
                        bg: "amber.warm",
                        opacity: "0.6",
                      })}
                    />
                  )}
                  <p
                    className={css(
                      isLede
                        ? {
                            fontSize: { base: "body", md: "lg" },
                            lineHeight: "1.85",
                            color: "text.primary",
                            fontWeight: "400",
                          }
                        : {
                            fontSize: "body",
                            lineHeight: "body",
                            color: "text.secondary",
                          }
                    )}
                  >
                    {para}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Hotels ─────────────────────────────────────────── */}
        {curatedHotels.length > 0 && (
          <section
            className={css({
              maxW: "5xl",
              mx: "auto",
              mb: { base: "16", md: "20" },
              animation: "fadeUp 0.6s ease-out 0.1s both",
            })}
          >
            <HotelPicks hotels={curatedHotels} lang={lang} />
            <div className={css({ textAlign: "center", mt: "6" })}>
              <Link
                href="/katowice/bookings"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2",
                  fontSize: "meta",
                  fontWeight: "600",
                  fontFamily: "display",
                  color: "text.muted",
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                  _hover: { color: "amber.warm" },
                })}
              >
                {lang === "ro" ? "Vezi toate rezervarile" : "View all bookings"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        )}

        {/* ── Reviews Section ───────────────────────────────── */}
        {curatedHotels.length > 0 && (
          <section
            className={css({
              maxW: "5xl",
              mx: "auto",
              mb: { base: "16", md: "20" },
              animation: "fadeUp 0.6s ease-out 0.12s both",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                mb: "6",
              })}
            >
              <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
              <span
                className={css({
                  fontSize: "label",
                  fontWeight: "600",
                  fontFamily: "display",
                  color: "amber.warm",
                  letterSpacing: "label",
                  textTransform: "uppercase",
                })}
              >
                {lang === "ro" ? "Ce spun oaspetii" : "What guests say"}
              </span>
              <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
            </div>

            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: { base: "4", md: "5" },
              })}
            >
              {getKatowiceHotelsWithReviews().slice(0, 3).map((hotel) =>
                hotel.review_texts && hotel.review_texts.slice(0, 3).map((review: string, idx: number) => (
                  <div
                    key={`${hotel.hotel_id}-review-${idx}`}
                    className={css({
                      bg: "steel.surface",
                      rounded: "card",
                      border: "1px solid",
                      borderColor: "steel.border",
                      p: "4",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2",
                    })}
                  >
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "2",
                        mb: "1",
                      })}
                    >
                      <span
                        className={css({
                          fontSize: "2xs",
                          color: "text.muted",
                          fontWeight: "600",
                          fontFamily: "display",
                        })}
                      >
                        {hotel.name}
                      </span>
                    </div>
                    <p
                      className={css({
                        fontSize: "xs",
                        color: "text.secondary",
                        lineHeight: "1.6",
                        fontStyle: "italic",
                      })}
                    >
                      "{review}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ── Map ──────────────────────────────────────────── */}
        <section
          className={css({
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.15s both",
          })}
        >
          <div className={css({ display: "flex", alignItems: "baseline", gap: "4", mb: "8" })}>
            <h2
              className={css({
                fontSize: "h2",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                letterSpacing: "h2",
                lineHeight: "h2",
              })}
            >
              {t.map}
            </h2>
            <span className={css({ flex: "1", height: "1px", bg: "steel.border", display: { base: "none", md: "block" } })} />
          </div>
          <MapOverview places={mapPlaces} city={city} />
        </section>

        {/* ── Places ────────────────────────────────────────── */}
        <section className={css({ animation: "fadeUp 0.6s ease-out 0.25s both" })}>
          <div className={css({ display: "flex", alignItems: "baseline", gap: "4", mb: "8" })}>
            <h2
              className={css({
                fontSize: "h2",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                letterSpacing: "h2",
                lineHeight: "h2",
              })}
            >
              {t.places}
            </h2>
            <span className={css({ flex: "1", height: "1px", bg: "steel.border", display: { base: "none", md: "block" } })} />
          </div>
          <CategoryFilter places={places} lang={lang} activeCategory={category ?? null} rankingMap={rankingMap} />
        </section>
      </main>

      <Footer city={city} count={places.length} />
    </>
  );
}
