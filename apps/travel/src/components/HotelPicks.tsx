"use client";

import { css } from "styled-system/css";
import type { CuratedHotel } from "@/lib/types";

const T = {
  ro: {
    eyebrow: "Unde sa stai",
    cta: "Rezerva pe Booking.com",
    disclosure: "Linkuri afiliate — rezervarea ne aduce un comision, fara cost suplimentar pentru tine.",
  },
  en: {
    eyebrow: "Where to Stay",
    cta: "Book on Booking.com",
    disclosure: "Affiliate links — booking earns us a commission at no extra cost to you.",
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
          {t.eyebrow}
        </span>
        <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
      </div>

      {/* ── Hotel cards grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
          gap: { base: "4", sm: "6" },
        })}
      >
        {hotels.map((hotel, i) => (
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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{hotel.address}</span>
              </div>

              {/* Spacer */}
              <div className={css({ flex: "1" })} />

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
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            </div>
          </div>
        ))}
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
