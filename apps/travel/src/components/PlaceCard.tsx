"use client";

import { css } from "styled-system/css";
import type { Place } from "@/lib/types";
import { buildTripadvisorAffiliateUrl } from "@/lib/affiliate";

// Hex values so we can use them both in css() token refs and inline styles
const CATEGORY_META: Record<
  string,
  { label: string; icon: string; color: string; tokenColor: string }
> = {
  // Typographic glyphs — editorial marks, not emoji
  // ✦ 4-point star: theatrical spotlight, a mark of distinction
  // ◈ circle+diamond: botanical cross-section, a lens on the natural world
  // ◆ solid diamond: classic bistro menu bullet, weighted like good food
  // ● solid circle: a vinyl record, a lit stage in darkness
  // ▲ upward triangle: structural load-bearing geometry, a blueprint mark
  // ◉ bullseye: cartographic survey point, an archival seal
  // ◇ open diamond: a stage mark, a marquee bullet
  culture:       { label: "Culture",       icon: "✦", color: "#7C6E9E", tokenColor: "cat.culture" },
  nature:        { label: "Nature",        icon: "◈", color: "#5A7A5C", tokenColor: "cat.nature" },
  food:          { label: "Food & Drink",  icon: "◆", color: "#B55C3A", tokenColor: "cat.food" },
  nightlife:     { label: "Nightlife",     icon: "●", color: "#8E4E7E", tokenColor: "cat.nightlife" },
  architecture:  { label: "Architecture", icon: "▲", color: "#4A7A9B", tokenColor: "cat.architecture" },
  history:       { label: "History",       icon: "◉", color: "#8C6E4A", tokenColor: "cat.history" },
  entertainment: { label: "Entertainment", icon: "◇", color: "#9A7E3A", tokenColor: "cat.entertainment" },
};

const FALLBACK_META = { label: "Place", icon: "·", color: "#787068", tokenColor: "text.muted" };

function RatingDots({ rating }: { rating: number }) {
  // 5-dot scale; full dot ≥ 1, half dot ≥ 0.5, empty otherwise
  return (
    <span
      className={css({ display: "inline-flex", gap: "0.5", alignItems: "center" })}
      aria-label={`Rating: ${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const filled = rating >= i + 1;
        const half = !filled && rating >= i + 0.5;
        return (
          <span
            key={i}
            className={css({
              display: "inline-block",
              w: "6px",
              h: "6px",
              rounded: "full",
              flexShrink: "0",
            })}
            style={{
              background: filled
                ? "#E8A838"
                : half
                ? "linear-gradient(90deg, #E8A838 50%, rgba(232,168,56,0.18) 50%)"
                : "rgba(232,168,56,0.18)",
            }}
          />
        );
      })}
      <span
        className={css({
          ml: "1.5",
          fontSize: "xs",
          fontWeight: "600",
          fontFamily: "display",
          color: "amber.warm",
        })}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  );
}

/*
 * VISUAL PLACEHOLDER SYSTEM
 *
 * When no photograph is available, premium editorial design reaches for
 * abstraction rather than emptiness. This palette of gradient "covers"
 * is derived from the Silesian landscape and industrial heritage:
 *
 *   culture      — deep violet twilight over a theatre roof
 *   nature       — forest-floor green fading into morning mist
 *   food         — terracotta kiln-glow, like a Silesian ceramic
 *   nightlife    — coal-face plum dissolving into neon penumbra
 *   architecture — blueprint steel-blue, the colour of engineering paper
 *   history      — parchment amber, archival document warmth
 *   entertainment— antique brass, the patina of a concert-hall chandelier
 *
 * Each gradient has three stops:
 *   1. A rich mid-tone from the category palette (30% opacity over dark base)
 *   2. A darker, more neutral middle that grounds it
 *   3. Near-black base (#12100E) at the bottom — the card surface
 *
 * The diagonal hatching overlay (::after) echoes the body::before lattice,
 * creating visual continuity between the page texture and the card image area.
 */
const CATEGORY_GRADIENTS: Record<string, string> = {
  culture:       "linear-gradient(160deg, rgba(124,110,158,0.55) 0%, rgba(40,32,52,0.7) 55%, #12100E 100%)",
  nature:        "linear-gradient(160deg, rgba(90,122,92,0.55)   0%, rgba(30,45,32,0.7) 55%, #12100E 100%)",
  food:          "linear-gradient(160deg, rgba(181,92,58,0.55)   0%, rgba(55,28,18,0.7) 55%, #12100E 100%)",
  nightlife:     "linear-gradient(160deg, rgba(142,78,126,0.55)  0%, rgba(42,22,40,0.7) 55%, #12100E 100%)",
  architecture:  "linear-gradient(160deg, rgba(74,122,155,0.55)  0%, rgba(22,40,55,0.7) 55%, #12100E 100%)",
  history:       "linear-gradient(160deg, rgba(140,110,74,0.55)  0%, rgba(45,32,18,0.7) 55%, #12100E 100%)",
  entertainment: "linear-gradient(160deg, rgba(154,126,58,0.55)  0%, rgba(45,38,18,0.7) 55%, #12100E 100%)",
};

const FALLBACK_GRADIENT = "linear-gradient(160deg, rgba(120,112,104,0.4) 0%, rgba(30,28,26,0.7) 55%, #12100E 100%)";

export function PlaceCard({
  place,
  index,
  lang = "ro",
  ranking,
}: {
  place: Place;
  index: number;
  lang?: "ro" | "en";
  ranking?: { bestRank?: number; cheapestRank?: number };
}) {
  const meta = CATEGORY_META[place.category] ?? FALLBACK_META;
  const description = lang === "ro" && place.description_ro ? place.description_ro : place.description;
  const tips = lang === "ro" && place.tips_ro ? place.tips_ro : place.tips;
  const visitDuration = lang === "ro" && place.visit_duration_ro ? place.visit_duration_ro : place.visit_duration;
  const gradient = CATEGORY_GRADIENTS[place.category] ?? FALLBACK_GRADIENT;

  return (
    <article
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
      {/*
       * ── Visual placeholder band ──────────────────────────────────────────
       *
       * 160px tall. Three layers:
       *   1. Base: near-black (#12100E) — matches body background
       *   2. Category gradient — the atmospheric colour derived from
       *      the Silesian palette (see CATEGORY_GRADIENTS above)
       *   3. Diagonal lattice overlay — CSS repeating-linear-gradient at
       *      60°/-60° matching body::before at higher opacity (0.06) so it
       *      reads as deliberate texture inside the frame, not bleed-through
       *
       * The index number is set in the lower-left in Syne 800 — large enough
       * to function as a decorative numeral (à la Monocle print guides where
       * the number is part of the visual composition) while remaining legible
       * as a wayfinding element.
       *
       * The category glyph floats in the upper-right — a second anchor.
       * At this scale the glyph (▲ ✦ ◆ etc.) reads as a graphic mark,
       * not a UI icon.
       */}
      <div
        className={css({
          position: "relative",
          h: { base: "120px", sm: "140px", md: "160px" },
          overflow: "hidden",
          flexShrink: "0",
        })}
        style={{ background: "#12100E" }}
      >
        {/* Gradient layer */}
        <div
          className={css({
            position: "absolute",
            inset: "0",
          })}
          style={{ background: gradient }}
        />

        {/* Lattice texture overlay — mirrors body::before but denser */}
        <div
          className={css({
            position: "absolute",
            inset: "0",
            opacity: "0.06",
            backgroundImage: [
              "repeating-linear-gradient(60deg,  rgba(240,215,165,1) 0px, rgba(240,215,165,1) 0.6px, transparent 0.6px, transparent 24px)",
              "repeating-linear-gradient(-60deg, rgba(240,215,165,1) 0px, rgba(240,215,165,1) 0.6px, transparent 0.6px, transparent 24px)",
            ].join(", "),
          })}
        />

        {/* Vignette — bottom fade to card surface */}
        <div
          className={css({
            position: "absolute",
            inset: "0",
          })}
          style={{
            background: "linear-gradient(to bottom, transparent 40%, rgba(33,30,26,0.85) 100%)",
          }}
        />

        {/* Decorative index numeral — lower left */}
        <span
          className={css({
            position: "absolute",
            bottom: "10px",
            left: "14px",
            fontSize: "4xl",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "1",
            letterSpacing: "-0.04em",
            userSelect: "none",
            pointerEvents: "none",
          })}
          style={{ color: `${meta.color}55` }}
          aria-hidden="true"
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Category glyph — upper right */}
        <span
          className={css({
            position: "absolute",
            top: "14px",
            right: "14px",
            fontSize: "xl",
            lineHeight: "1",
            userSelect: "none",
            pointerEvents: "none",
          })}
          style={{ color: `${meta.color}88` }}
          aria-hidden="true"
        >
          {meta.icon}
        </span>

        {/* ML family score bar — bottom edge of visual band */}
        {place.family_score != null && (
          <div
            className={css({
              position: "absolute",
              bottom: "0",
              left: "0",
              right: "0",
              h: "2px",
              bg: "rgba(255,255,255,0.06)",
            })}
          >
            <div
              className={css({ h: "full", bg: "cat.nature", opacity: "0.7" })}
              style={{ width: `${Math.round(place.family_score * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Header band: category pill + sequence number ── */}
      <div
        className={css({
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: "5",
          py: "3",
          borderBottom: "1px solid",
          borderColor: "steel.border",
        })}
      >
        {/* Category pill */}
        <span
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "1.5",
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            rounded: "pill",
            px: "2.5",
            py: "1",
          })}
          style={{
            color: meta.color,
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}33`,
          }}
        >
          <span aria-hidden="true">{meta.icon}</span>
          {meta.label}
        </span>

        <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
          {/* Ranking badges */}
          {ranking?.bestRank != null && ranking.bestRank <= 3 && (
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1",
                fontSize: "2xs",
                fontWeight: "700",
                fontFamily: "display",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                rounded: "pill",
                px: "2",
                py: "0.5",
                bg: "rgba(201, 146, 42, 0.15)",
                color: "amber.warm",
                border: "1px solid rgba(201, 146, 42, 0.3)",
              })}
            >
              #{ranking.bestRank} Top
            </span>
          )}
          {ranking?.cheapestRank != null && ranking.cheapestRank <= 3 && (
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1",
                fontSize: "2xs",
                fontWeight: "700",
                fontFamily: "display",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                rounded: "pill",
                px: "2",
                py: "0.5",
                bg: "rgba(90, 122, 92, 0.15)",
                color: "cat.nature",
                border: "1px solid rgba(90, 122, 92, 0.3)",
              })}
            >
              #{ranking.cheapestRank} Budget
            </span>
          )}

          {/* Reservation badge */}
          {place.booking?.needs_reservation && (
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1",
                fontSize: "2xs",
                fontWeight: "700",
                fontFamily: "display",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                rounded: "pill",
                px: "2",
                py: "0.5",
                bg: "rgba(160, 94, 50, 0.15)",
                color: "copper.main",
                border: "1px solid rgba(160, 94, 50, 0.3)",
              })}
            >
              Reservation
            </span>
          )}

          {/* Kid-friendly badge */}
          {place.kid_friendly && (
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1",
                fontSize: "2xs",
                fontWeight: "700",
                fontFamily: "display",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                rounded: "pill",
                px: "2",
                py: "0.5",
                bg: "rgba(90, 122, 92, 0.15)",
                color: "cat.nature",
                border: "1px solid rgba(90, 122, 92, 0.3)",
              })}
            >
              ◈ Kids
            </span>
          )}

          {/* Index badge */}
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.faint",
              letterSpacing: "0.05em",
            })}
          >
            #{String(index + 1).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={css({ p: { base: "4", sm: "5", md: "6" }, display: "flex", flexDirection: "column", flexGrow: "1", gap: "0" })}>

        {/* Name */}
        <h3
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            lineHeight: "h3",
            mb: "3",
            letterSpacing: "h3",
          })}
        >
          {place.name}
        </h3>

        {/* Rating + duration row */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "4",
            mb: "5",
            flexWrap: "wrap",
          })}
        >
          <RatingDots rating={place.rating} />
          {place.price_display && (
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "amber.warm",
                letterSpacing: "0.04em",
              })}
            >
              {place.price_display}
            </span>
          )}
          <span
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1",
              fontSize: "xs",
              color: "text.muted",
            })}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {visitDuration}
          </span>
          {place.family_cost != null && (
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1",
                fontSize: "xs",
                color: "text.muted",
              })}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {place.family_cost.total_eur === 0 ? "Free · family" : `€${place.family_cost.total_eur} · family`}
            </span>
          )}
        </div>

        {/* Description */}
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
            mb: "6",
          })}
        >
          {description}
        </p>

        {/* Tip — inset with left accent bar */}
        <div
          className={css({
            display: "flex",
            gap: "3",
            mb: "6",
            rounded: "8px",
            p: { base: "3", sm: "4" },
            bg: "amber.glow",
          })}
          style={{ border: "1px solid rgba(232, 168, 56, 0.15)" }}
        >
          <div
            className={css({
              flexShrink: "0",
              w: "3px",
              rounded: "full",
              alignSelf: "stretch",
              bg: "amber.warm",
            })}
          />
          <div>
            <p
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "amber.warm",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                mb: "0.5",
              })}
            >
              Local tip
            </p>
            <p
              className={css({
                fontSize: "xs",
                color: "amber.bright",
                lineHeight: "1.6",
              })}
            >
              {tips}
            </p>
          </div>
        </div>

        {/* Footer: address + CTAs — pushed to bottom */}
        <div
          className={css({
            mt: "auto",
            pt: "4",
            borderTop: "1px solid",
            borderColor: "steel.border",
            display: "flex",
            flexDirection: "column",
            gap: "3",
          })}
        >
          <span
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1",
              fontSize: "xs",
              color: "text.faint",
              lineHeight: "1.4",
            })}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {place.address}
          </span>

          <div
            className={css({
              display: "flex",
              gap: "2",
              flexDirection: { base: "column", sm: "row" },
            })}
          >
            <a
              href={place.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className={css({
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
                px: "3",
                py: { base: "2", sm: "1.5" },
                textDecoration: "none",
                flex: { base: "1", sm: "none" },
                transition: "background 0.15s ease, transform 0.15s ease",
                _hover: {
                  bg: "amber.bright",
                  transform: "scale(1.03)",
                },
              })}
            >
              View on map
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </a>

            {place.tripadvisor_url && (
              <a
                href={buildTripadvisorAffiliateUrl(place.tripadvisor_url)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1.5",
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "text.muted",
                  bg: "transparent",
                  border: "1px solid",
                  borderColor: "steel.border",
                  rounded: "pill",
                  px: "3",
                  py: { base: "2", sm: "1.5" },
                  textDecoration: "none",
                  flex: { base: "1", sm: "none" },
                  transition: "all 0.15s ease",
                  _hover: {
                    borderColor: "text.muted",
                    color: "text.primary",
                    transform: "scale(1.03)",
                  },
                })}
              >
                TripAdvisor
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
