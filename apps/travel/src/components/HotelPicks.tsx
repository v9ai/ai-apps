"use client";

import { css } from "styled-system/css";
import type { CuratedHotel } from "@/lib/types";

const T = {
  ro: {
    eyebrow: "Unde sa stai",
    subtitle: "Selecție pentru 2 adulți + 1 copil · Locații verificate",
    cta: "Rezerva pe Booking.com",
    familyFit: "◈ Family fit",
    disclosure: "Linkuri afiliate — rezervarea ne aduce un comision, fara cost suplimentar pentru tine.",
  },
  en: {
    eyebrow: "Where to Stay",
    subtitle: "Curated for 2 adults + 1 child · Verified locations",
    cta: "Book on Booking.com",
    familyFit: "◈ Family fit",
    disclosure: "Affiliate links — booking earns us a commission at no extra cost to you.",
  },
};

const HOTEL_FAMILY_NOTES: Record<
  string,
  { score: number; note: string; note_ro: string; amenities: string[] }
> = {
  "hotel-romeo-naples": {
    score: 0.71,
    note: "Waterfront location; cots available on request. Walking distance to Castel dell'Ovo and Lungomare.",
    note_ro:
      "Locație pe malul apei; pătuțuri disponibile la cerere. La distanță de mers pe jos de Castel dell'Ovo și Lungomare.",
    amenities: ["Family rooms", "Cots on request", "Near Lungomare", "Concierge"],
  },
  "grand-hotel-santa-lucia-naples": {
    score: 0.78,
    note: "Classic family hotel overlooking the bay. Triple rooms available. Excellent for families with children — safe neighbourhood, flat seafront access.",
    note_ro:
      "Hotel clasic de familie cu vedere la golf. Camere triple disponibile. Excelent pentru familii cu copii — cartier sigur, acces plat la mare.",
    amenities: ["Triple rooms", "Bay views", "Safe area", "Restaurant"],
  },
  "palazzo-caracciolo-naples": {
    score: 0.65,
    note: "Historic palazzo in the historic centre. Family suites available. Close to Spaccanapoli and Museo Archeologico — good for the cultural day.",
    note_ro:
      "Palazzo istoric în centrul istoric. Suite de familie disponibile. Aproape de Spaccanapoli și Museo Archeologico — ideal pentru ziua culturală.",
    amenities: ["Family suites", "Historic centre", "Concierge", "Bar"],
  },
};

interface HotelPicksProps {
  hotels: CuratedHotel[];
  lang: "ro" | "en";
}

export function HotelPicks({ hotels, lang }: HotelPicksProps) {
  const t = T[lang];

  return (
    <div>
      {/* ── Eyebrow divider ── */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: "4",
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
          {t.eyebrow}
        </span>
        <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
      </div>

      {/* ── Section subtitle ── */}
      <p
        className={css({
          fontSize: "body",
          color: "text.secondary",
          textAlign: "center",
          mb: "6",
        })}
      >
        {t.subtitle}
      </p>

      {/* ── Hotel cards grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
          gap: { base: "4", sm: "6" },
        })}
      >
        {hotels.map((hotel, i) => {
          const familyNote = HOTEL_FAMILY_NOTES[hotel.property_id];
          const familyNoteText = familyNote
            ? lang === "ro"
              ? familyNote.note_ro
              : familyNote.note
            : null;
          const isHighScore = familyNote && familyNote.score >= 0.7;

          return (
            <div
              key={hotel.property_id}
              className={css({
                bg: "steel.surface",
                rounded: "card",
                border: "1px solid",
                borderColor: "steel.border",
                overflow: "hidden",
                boxShadow: "card",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                _hover: {
                  borderColor: "steel.borderHover",
                  boxShadow: "card.hover",
                  transform: "translateY(-3px)",
                },
              })}
            >
              {/* ── Gradient band ── */}
              <div
                className={css({
                  position: "relative",
                  h: "80px",
                  overflow: "hidden",
                })}
                style={{
                  background:
                    "linear-gradient(160deg, rgba(201, 146, 42, 0.35) 0%, rgba(55, 42, 22, 0.6) 55%, #12100E 100%)",
                }}
              >
                {/* Lattice overlay */}
                <div
                  className={css({
                    position: "absolute",
                    inset: "0",
                    opacity: "0.06",
                    pointerEvents: "none",
                  })}
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(60deg, rgba(201, 146, 42, 0.4) 0px, rgba(201, 146, 42, 0.4) 0.6px, transparent 0.6px, transparent 28px)," +
                      "repeating-linear-gradient(-60deg, rgba(201, 146, 42, 0.4) 0px, rgba(201, 146, 42, 0.4) 0.6px, transparent 0.6px, transparent 28px)",
                  }}
                />

                {/* Decorative glyph */}
                <span
                  className={css({
                    position: "absolute",
                    top: "3",
                    right: "4",
                    fontSize: "xl",
                    color: "amber.warm",
                    opacity: "0.25",
                    fontFamily: "display",
                    lineHeight: "1",
                  })}
                >
                  {"\u2302"}
                </span>

                {/* Index */}
                <span
                  className={css({
                    position: "absolute",
                    bottom: "2",
                    left: "4",
                    fontSize: "2xl",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "text.primary",
                    opacity: "0.12",
                    lineHeight: "1",
                    fontVariantNumeric: "tabular-nums",
                  })}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* ── Body ── */}
              <div
                className={css({
                  p: { base: "5", md: "6" },
                  display: "flex",
                  flexDirection: "column",
                  flex: "1",
                  gap: "3",
                })}
              >
                <h3
                  className={css({
                    fontSize: { base: "body", md: "lg" },
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    lineHeight: "1.3",
                  })}
                >
                  {hotel.name}
                </h3>

                {/* Address */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5",
                    fontSize: "meta",
                    color: "text.muted",
                  })}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{hotel.address}</span>
                </div>

                {/* ── Family amenity tags ── */}
                {familyNote && (
                  <div
                    className={css({
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1.5",
                    })}
                  >
                    {familyNote.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className={css({
                          fontSize: "2xs",
                          border: "1px solid",
                          borderColor: "steel.border",
                          px: "2",
                          py: "0.5",
                          rounded: "sm",
                          color: "text.muted",
                        })}
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Bilingual family note ── */}
                {familyNoteText && (
                  <p
                    className={css({
                      fontSize: "xs",
                      color: "text.secondary",
                      lineHeight: "1.5",
                    })}
                  >
                    {familyNoteText}
                  </p>
                )}

                {/* Spacer */}
                <div className={css({ flex: "1" })} />

                {/* ── Family score bar ── */}
                {familyNote && (
                  <div
                    className={css({
                      display: "flex",
                      flexDirection: "column",
                      gap: "1",
                    })}
                  >
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "2xs",
                        color: "text.muted",
                      })}
                    >
                      <span>{t.familyFit}</span>
                      <span
                        className={css({
                          color: isHighScore ? "amber.warm" : "text.muted",
                          fontVariantNumeric: "tabular-nums",
                        })}
                      >
                        {Math.round(familyNote.score * 100)}%
                      </span>
                    </div>
                    <div
                      className={css({
                        h: "3px",
                        w: "full",
                        bg: "steel.border",
                        rounded: "full",
                        overflow: "hidden",
                      })}
                    >
                      <div
                        className={css({
                          h: "full",
                          rounded: "full",
                          transition: "width 0.4s ease",
                        })}
                        style={{
                          width: `${Math.round(familyNote.score * 100)}%`,
                          background: isHighScore ? "#C9922A" : "var(--colors-text-muted, #6b7280)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <a
                  href={hotel.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2",
                    mt: "1",
                    px: "4",
                    py: "2",
                    rounded: "pill",
                    fontSize: "meta",
                    fontWeight: "600",
                    fontFamily: "display",
                    letterSpacing: "0.03em",
                    border: "1px solid",
                    borderColor: "steel.border",
                    color: "text.muted",
                    bg: "transparent",
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    _hover: {
                      borderColor: "amber.warm",
                      color: "amber.warm",
                      bg: "rgba(201, 146, 42, 0.08)",
                    },
                  })}
                >
                  {t.cta}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7" />
                    <path d="M7 7h10v10" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Affiliate disclosure ── */}
      <p
        className={css({
          mt: "5",
          fontSize: "meta",
          color: "text.faint",
          opacity: "0.5",
          textAlign: "center",
        })}
      >
        {t.disclosure}
      </p>
    </div>
  );
}
