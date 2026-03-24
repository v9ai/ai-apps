"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { data } from "@/lib/data";
import { HotelPicks } from "@/components/HotelPicks";
import { Footer } from "@/components/Footer";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  ro: {
    eyebrow: "Planifica-ti sejurul",
    heading: "Rezervari & Cazare",
    subtitle: (city: string) => `Tot ce ai nevoie pentru a-ti planifica vizita in ${city}`,
    back: "Inapoi la ghid",
    hotelsHeading: "Cazare recomandata",
    placesHeading: "Informatii de vizitare",
    summaryHeading: "Rezumat costuri",
    totalCost: "Cost total estimat",
    needsReservation: "Rezervare recomandata",
    freeEntry: "Intrare gratuita",
    bestTime: "Cel mai bun moment",
    advanceBooking: "Rezerva cu anticipatie",
    days: "zile",
    walkIn: "Fara rezervare",
    combinedWith: "Se combina bine cu",
    nearbyHotels: "Zona hoteluri",
    viewOnMap: "Vezi pe harta",
    searchHotels: "Cauta hoteluri pe Booking.com",
    allPlatforms: "Toate platformele",
  },
  en: {
    eyebrow: "Plan Your Stay",
    heading: "Bookings & Accommodation",
    subtitle: (city: string) => `Everything you need to plan your visit to ${city}`,
    back: "Back to guide",
    hotelsHeading: "Recommended Stays",
    placesHeading: "Visit Planning",
    summaryHeading: "Cost Summary",
    totalCost: "Total estimated cost",
    needsReservation: "Reservation recommended",
    freeEntry: "Free entry",
    bestTime: "Best time to visit",
    advanceBooking: "Book in advance",
    days: "days",
    walkIn: "Walk-in",
    combinedWith: "Pairs well with",
    nearbyHotels: "Hotel area",
    viewOnMap: "View on map",
    searchHotels: "Search hotels on Booking.com",
    allPlatforms: "All platforms",
  },
};

export function BookingsPageContent() {
  const { lang } = useLang();
  const t = T[lang];
  const { city, places, booking_summary } = data;
  const curatedHotels = booking_summary?.curated_hotels ?? [];
  const placesWithBooking = places.filter((p) => p.booking);

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
        {/* ── Hero ── */}
        <header
          className={css({
            textAlign: "center",
            maxW: "3xl",
            mx: "auto",
            mb: { base: "10", sm: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out",
          })}
        >
          {/* Back link */}
          <Link
            href="/"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              fontSize: "meta",
              fontFamily: "display",
              fontWeight: "600",
              color: "text.muted",
              textDecoration: "none",
              letterSpacing: "0.04em",
              mb: "8",
              transition: "color 0.15s ease",
              _hover: { color: "amber.warm" },
            })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            {t.back}
          </Link>

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
            {t.heading}
          </h1>

          <p
            className={css({
              mt: "4",
              fontSize: { base: "meta", md: "body" },
              fontFamily: "display",
              color: "text.muted",
              fontWeight: "400",
              letterSpacing: "0.04em",
            })}
          >
            {t.subtitle(city)}
          </p>
        </header>

        {/* ── Cost Summary ── */}
        {booking_summary && (
          <section
            className={css({
              maxW: "5xl",
              mx: "auto",
              mb: { base: "12", md: "16" },
              animation: "fadeUp 0.6s ease-out 0.05s both",
            })}
          >
            <SectionDivider label={t.summaryHeading} />
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: { base: "4", sm: "6" },
              })}
            >
              {/* Total cost card */}
              <div className={summaryCardStyle}>
                <span className={summaryLabelStyle}>{t.totalCost}</span>
                <span
                  className={css({
                    fontSize: "h2",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "amber.warm",
                    letterSpacing: "h2",
                  })}
                >
                  {booking_summary.total_estimated_cost.eur}&nbsp;EUR
                </span>
                <span className={css({ fontSize: "meta", color: "text.faint" })}>
                  ~{booking_summary.total_estimated_cost.pln} PLN
                </span>
              </div>

              {/* Places needing reservation */}
              <div className={summaryCardStyle}>
                <span className={summaryLabelStyle}>{t.needsReservation}</span>
                <span
                  className={css({
                    fontSize: "h3",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "copper.main",
                  })}
                >
                  {booking_summary.places_needing_reservation.length} / {places.length}
                </span>
                <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5", mt: "1" })}>
                  {booking_summary.places_needing_reservation.map((name) => (
                    <span
                      key={name}
                      className={css({
                        fontSize: "2xs",
                        fontFamily: "display",
                        fontWeight: "600",
                        color: "copper.main",
                        bg: "rgba(160, 94, 50, 0.12)",
                        border: "1px solid rgba(160, 94, 50, 0.25)",
                        rounded: "pill",
                        px: "2",
                        py: "0.5",
                        letterSpacing: "0.03em",
                      })}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hotel search */}
              <div className={summaryCardStyle}>
                <span className={summaryLabelStyle}>{t.nearbyHotels}</span>
                <a
                  href={booking_summary.hotel_search_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2",
                    mt: "2",
                    px: "4",
                    py: "2",
                    rounded: "pill",
                    fontSize: "meta",
                    fontWeight: "600",
                    fontFamily: "display",
                    letterSpacing: "0.03em",
                    color: "steel.dark",
                    bg: "amber.warm",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                    _hover: { bg: "amber.bright", transform: "scale(1.03)" },
                  })}
                >
                  {t.searchHotels}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </a>
              </div>
            </div>
          </section>
        )}

        {/* ── Curated Hotels ── */}
        {curatedHotels.length > 0 && (
          <section
            className={css({
              maxW: "5xl",
              mx: "auto",
              mb: { base: "12", md: "16" },
              animation: "fadeUp 0.6s ease-out 0.1s both",
            })}
          >
            <HotelPicks hotels={curatedHotels} lang={lang} />
          </section>
        )}

        {/* ── Per-Place Booking Info ── */}
        {placesWithBooking.length > 0 && (
          <section
            className={css({
              maxW: "5xl",
              mx: "auto",
              mb: { base: "12", md: "16" },
              animation: "fadeUp 0.6s ease-out 0.15s both",
            })}
          >
            <SectionDivider label={t.placesHeading} />
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: { base: "3", sm: "4" },
              })}
            >
              {placesWithBooking.map((place) => {
                const b = place.booking!;
                return (
                  <div
                    key={place.name}
                    className={css({
                      bg: "steel.surface",
                      rounded: "card",
                      border: "1px solid",
                      borderColor: "steel.border",
                      p: { base: "4", sm: "5", md: "6" },
                      boxShadow: "card",
                      display: "flex",
                      flexDirection: { base: "column", md: "row" },
                      gap: { base: "4", md: "6" },
                      transition: "border-color 0.2s ease",
                      _hover: { borderColor: "steel.borderHover" },
                    })}
                  >
                    {/* Left: name + meta */}
                    <div className={css({ flex: "1", minW: "0" })}>
                      <h3
                        className={css({
                          fontSize: { base: "body", md: "lg" },
                          fontWeight: "700",
                          fontFamily: "display",
                          color: "text.primary",
                          lineHeight: "1.3",
                          mb: "2",
                        })}
                      >
                        {place.name}
                      </h3>

                      {/* Tags row */}
                      <div className={css({ display: "flex", flexWrap: "wrap", gap: "2", mb: "3" })}>
                        {/* Booking type */}
                        <span className={tagStyle}>
                          {b.type === "free_entry" ? t.freeEntry : b.type.replace("_", " ")}
                        </span>

                        {/* Reservation badge */}
                        {b.needs_reservation && (
                          <span
                            className={css({
                              ...tagBaseStyles,
                              bg: "rgba(160, 94, 50, 0.12)",
                              color: "copper.main",
                              border: "1px solid rgba(160, 94, 50, 0.25)",
                            })}
                          >
                            {t.needsReservation}
                          </span>
                        )}

                        {/* Cost */}
                        {b.estimated_cost.eur > 0 && (
                          <span className={tagStyle}>
                            ~{b.estimated_cost.eur} EUR
                          </span>
                        )}
                      </div>

                      {/* Details grid */}
                      <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
                        {b.best_time_to_visit && (
                          <DetailRow label={t.bestTime} value={b.best_time_to_visit} />
                        )}
                        <DetailRow
                          label={t.advanceBooking}
                          value={b.advance_booking_days > 0 ? `${b.advance_booking_days} ${t.days}` : t.walkIn}
                        />
                        {b.nearby_hotel_area && (
                          <DetailRow label={t.nearbyHotels} value={b.nearby_hotel_area} />
                        )}
                        {b.combined_with.length > 0 && (
                          <DetailRow label={t.combinedWith} value={b.combined_with.join(", ")} />
                        )}
                      </div>
                    </div>

                    {/* Right: CTAs */}
                    <div
                      className={css({
                        display: "flex",
                        flexDirection: "column",
                        gap: "2",
                        flexShrink: "0",
                        justifyContent: "center",
                      })}
                    >
                      <a
                        href={place.maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ctaPrimaryStyle}
                      >
                        {t.viewOnMap}
                        <ExternalIcon />
                      </a>

                      {b.platform_urls && Object.keys(b.platform_urls).length > 0 && (
                        <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5" })}>
                          {Object.entries(b.platform_urls).map(([key, url]) => (
                            <a
                              key={key}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              className={css({
                                fontSize: "2xs",
                                fontFamily: "display",
                                fontWeight: "600",
                                color: "text.faint",
                                textDecoration: "none",
                                letterSpacing: "0.04em",
                                textTransform: "capitalize",
                                transition: "color 0.15s ease",
                                _hover: { color: "amber.warm" },
                              })}
                            >
                              {key.replace(/_/g, " ")}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer city={city} count={places.length} />
    </>
  );
}

/* ── Shared sub-components ── */

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        gap: "3",
        mb: "8",
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
        {label}
      </span>
      <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={css({ display: "flex", gap: "2", fontSize: "meta" })}>
      <span className={css({ color: "text.faint", flexShrink: "0" })}>{label}:</span>
      <span className={css({ color: "text.secondary" })}>{value}</span>
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

/* ── Style constants ── */

const tagBaseStyles = {
  fontSize: "2xs" as const,
  fontFamily: "display" as const,
  fontWeight: "600" as const,
  letterSpacing: "0.04em",
  rounded: "pill" as const,
  px: "2" as const,
  py: "0.5" as const,
  textTransform: "capitalize" as const,
};

const tagStyle = css({
  ...tagBaseStyles,
  bg: "rgba(201, 146, 42, 0.1)",
  color: "amber.warm",
  border: "1px solid rgba(201, 146, 42, 0.2)",
});

const summaryCardStyle = css({
  bg: "steel.surface",
  rounded: "card",
  border: "1px solid",
  borderColor: "steel.border",
  p: { base: "5", md: "6" },
  boxShadow: "card",
  display: "flex",
  flexDirection: "column",
  gap: "2",
});

const summaryLabelStyle = css({
  fontSize: "label",
  fontWeight: "600",
  fontFamily: "display",
  color: "text.muted",
  letterSpacing: "label",
  textTransform: "uppercase",
});

const ctaPrimaryStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.5",
  fontSize: "xs",
  fontWeight: "700",
  fontFamily: "display",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "steel.dark",
  bg: "amber.warm",
  rounded: "pill",
  px: "4",
  py: "2",
  textDecoration: "none",
  transition: "background 0.15s ease, transform 0.15s ease",
  _hover: { bg: "amber.bright", transform: "scale(1.03)" },
});
