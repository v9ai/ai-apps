"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import type { Place } from "@/lib/types";

// ─── Design tokens (mirrors panda.config.ts) ──────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  culture: "#7B68EE",
  nature: "#4CAF50",
  food: "#FF7043",
  nightlife: "#E040FB",
  architecture: "#42A5F5",
  history: "#AB8B6B",
  entertainment: "#FFD54F",
};

const CATEGORY_ICONS: Record<string, string> = {
  culture: "🎭",
  nature: "🌿",
  food: "🍽",
  nightlife: "🎶",
  architecture: "🏛",
  history: "🏰",
  entertainment: "🎪",
};

// ─── Static map helpers ────────────────────────────────────────────────────────

/**
 * Builds a Google Static Maps URL that renders a dark-styled base map with
 * numbered markers for every place. Falls back gracefully when no API key is
 * present — in that case we fall back to the embed iframe.
 */
function buildStaticMapUrl(places: Place[], apiKey: string | undefined): string | null {
  if (!apiKey) return null;

  const base = "https://maps.googleapis.com/maps/api/staticmap";
  const params = new URLSearchParams({
    size: "800x450",
    scale: "2",
    maptype: "roadmap",
    key: apiKey,
    // Dark / industrial style — minimal labels, dark background
    style: [
      "element:geometry|color:0x1a1e25",
      "element:labels.text.fill|color:0x787068",
      "element:labels.text.stroke|color:0x0f1114",
      "feature:road|element:geometry|color:0x262a33",
      "feature:road.arterial|element:geometry|color:0x2e333d",
      "feature:water|element:geometry|color:0x0d1117",
      "feature:poi|visibility:off",
      "feature:transit|visibility:off",
    ].join("&style="),
  });

  places.forEach((p, i) => {
    const color = (CATEGORY_COLORS[p.category] || "#E8A838").replace("#", "0x");
    params.append("markers", `color:${color}|label:${i + 1}|${p.lat},${p.lng}`);
  });

  return `${base}?${params.toString()}`;
}

/**
 * Builds a Google Maps embed URL centered on the provided coordinates.
 */
function buildEmbedUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?ll=${lat},${lng}&z=13&output=embed`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlacePill({
  place,
  index,
  isActive,
  onClick,
}: {
  place: Place;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const color = CATEGORY_COLORS[place.category] || "#E8A838";
  const icon = CATEGORY_ICONS[place.category] || "📍";

  return (
    <button
      onClick={onClick}
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "1.5",
        fontSize: "xs",
        fontWeight: "600",
        fontFamily: "display",
        rounded: "pill",
        px: { base: "2.5", sm: "3" },
        py: { base: "2", sm: "1.5" },
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        border: "1px solid",
        flexShrink: "0",
      })}
      style={{
        background: isActive ? color : "rgba(30, 33, 40, 0.9)",
        color: isActive ? "#0F1114" : color,
        borderColor: isActive ? color : `${color}55`,
        boxShadow: isActive ? `0 0 12px ${color}40` : "none",
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.7 }}>{icon}</span>
      <span
        className={css({
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          w: "3.5",
          h: "3.5",
          rounded: "full",
          fontSize: "2xs",
          fontWeight: "800",
          flexShrink: "0",
        })}
        style={{
          background: isActive ? "rgba(0,0,0,0.25)" : `${color}33`,
          color: isActive ? "#0F1114" : color,
        }}
      >
        {index + 1}
      </span>
      {place.name}
    </button>
  );
}

function DetailPanel({ place, index, onClose }: { place: Place; index: number; onClose: () => void }) {
  const color = CATEGORY_COLORS[place.category] || "#E8A838";
  const icon = CATEGORY_ICONS[place.category] || "📍";

  return (
    <div
      className={css({
        position: "absolute",
        top: { base: "2", sm: "3" },
        right: { base: "2", sm: "3" },
        left: { base: "2", sm: "auto" },
        w: { base: "auto", sm: "260px" },
        bg: "rgba(15, 17, 20, 0.96)",
        backdropFilter: "blur(12px)",
        border: "1px solid",
        borderColor: "steel.borderHover",
        rounded: "card",
        overflow: "hidden",
        boxShadow: "card.hover",
        zIndex: "10",
        animation: "fadeUp 0.2s ease-out",
      })}
    >
      {/* Color bar */}
      <div style={{ height: "3px", background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div className={css({ p: "4" })}>
        {/* Header row */}
        <div className={css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2", mb: "3" })}>
          <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                w: "7",
                h: "7",
                rounded: "full",
                fontSize: "sm",
                flexShrink: "0",
              })}
              style={{ background: `${color}22`, border: `1px solid ${color}44` }}
            >
              {icon}
            </span>
            <div>
              <p
                className={css({
                  fontSize: "2xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  mb: "0.5",
                })}
                style={{ color }}
              >
                #{index + 1} · {place.category}
              </p>
              <h3
                className={css({
                  fontSize: "sm",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "text.primary",
                  lineHeight: "1.25",
                })}
              >
                {place.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              w: "6",
              h: "6",
              rounded: "full",
              bg: "steel.raised",
              border: "1px solid",
              borderColor: "steel.border",
              color: "text.muted",
              fontSize: "xs",
              cursor: "pointer",
              flexShrink: "0",
              transition: "all 0.15s ease",
              _hover: { color: "text.secondary", borderColor: "steel.borderHover" },
            })}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Meta */}
        {(place.rating !== undefined || place.visit_duration) && (
          <div
            className={css({
              display: "flex",
              gap: "3",
              mb: "3",
              fontSize: "xs",
              color: "text.muted",
            })}
          >
            {place.rating !== undefined && <span>⭐ {place.rating}/5</span>}
            {place.visit_duration && <span>⏱ {place.visit_duration}</span>}
          </div>
        )}

        {/* Address */}
        {place.address && (
          <p
            className={css({
              fontSize: "xs",
              color: "text.faint",
              mb: "3",
              lineHeight: "1.5",
            })}
          >
            {place.address}
          </p>
        )}

        {/* CTA */}
        <a
          href={place.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5",
            w: "full",
            py: "2",
            rounded: "8px",
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            textDecoration: "none",
            transition: "all 0.15s ease",
            border: "1px solid",
          })}
          style={{
            background: `${color}18`,
            color: color,
            borderColor: `${color}44`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = `${color}30`;
            (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}88`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = `${color}18`;
            (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}44`;
          }}
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MapOverview({ places, city }: { places: Place[]; city: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Geometric center for the map
  const centerLat = places.reduce((sum, p) => sum + p.lat, 0) / places.length;
  const centerLng = places.reduce((sum, p) => sum + p.lng, 0) / places.length;

  // Use static map if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, else embed
  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      : undefined;
  const staticMapUrl = buildStaticMapUrl(places, apiKey);
  const embedUrl = buildEmbedUrl(centerLat, centerLng);

  const activePlace = activeIndex !== null ? places[activeIndex] : null;

  function handlePillClick(i: number) {
    setActiveIndex((prev) => (prev === i ? null : i));
  }

  return (
    <div
      className={css({
        rounded: "card",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "steel.border",
        boxShadow: "card",
        bg: "steel.surface",
      })}
    >
      {/* ── Map area ─────────────────────────────────────────────────────── */}
      <div
        className={css({
          position: "relative",
          // Taller on desktop where we have the pill strip below
          h: { base: "220px", sm: "300px", md: "380px", lg: "420px" },
          bg: "steel.dark",
          overflow: "hidden",
        })}
      >
        {staticMapUrl ? (
          /* Static map with per-place colour markers */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticMapUrl}
            alt={`Map of ${city} showing all locations`}
            className={css({
              w: "full",
              h: "full",
              objectFit: "cover",
              display: "block",
            })}
          />
        ) : (
          /* Fallback: embed centered on the city */
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map of ${city}`}
          />
        )}

        {/* Vignette — fades the map edges into the card bg */}
        <div
          className={css({
            position: "absolute",
            inset: "0",
            pointerEvents: "none",
          })}
          style={{
            background:
              "linear-gradient(to bottom, rgba(15,17,20,0.1) 0%, transparent 25%, transparent 65%, rgba(15,17,20,0.5) 100%)",
          }}
        />

        {/* City label — top-left */}
        <div
          className={css({
            position: "absolute",
            top: "3",
            left: "3",
            display: "flex",
            alignItems: "center",
            gap: "2",
            bg: "rgba(15, 17, 20, 0.88)",
            backdropFilter: "blur(10px)",
            border: "1px solid",
            borderColor: "steel.borderHover",
            rounded: "pill",
            px: "3",
            py: "1.5",
          })}
        >
          <span
            className={css({
              w: "1.5",
              h: "1.5",
              rounded: "full",
              bg: "amber.warm",
              flexShrink: "0",
              boxShadow: "0 0 6px token(colors.amber.warm)",
            })}
          />
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              letterSpacing: "0.04em",
            })}
          >
            {city}
          </span>
          <span
            className={css({
              fontSize: "2xs",
              color: "text.muted",
              fontFamily: "display",
              fontWeight: "600",
            })}
          >
            {places.length} places
          </span>
        </div>

        {/* Place detail panel (appears when a pill is active) */}
        {activePlace && activeIndex !== null && (
          <DetailPanel
            place={activePlace}
            index={activeIndex}
            onClose={() => setActiveIndex(null)}
          />
        )}
      </div>

      {/* ── Pill strip ───────────────────────────────────────────────────── */}
      <div
        className={css({
          borderTop: "1px solid",
          borderColor: "steel.border",
          bg: "rgba(15, 17, 20, 0.7)",
          backdropFilter: "blur(8px)",
          px: { base: "3", sm: "4" },
          py: { base: "2.5", sm: "3" },
        })}
      >
        {/*
          On mobile: horizontal scroll (no wrap).
          On md+: wrap into up to two rows, max-height prevents runaway growth.
        */}
        <div
          className={css({
            display: "flex",
            gap: { base: "1.5", sm: "2" },
            // Mobile: single scrollable row
            overflowX: { base: "auto", md: "visible" },
            flexWrap: { base: "nowrap", md: "wrap" },
            // Cap desktop pill area so it never grows beyond ~2 rows
            maxH: { md: "76px" },
            overflow: { md: "hidden" },
            // Fade the right edge on mobile to hint scrollability
            maskImage: {
              base: "linear-gradient(to right, black 85%, transparent 100%)",
              md: "none",
            },
            WebkitMaskImage: {
              base: "linear-gradient(to right, black 85%, transparent 100%)",
              md: "none",
            },
            // Smooth momentum scroll on iOS
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            _scrollbar: { display: "none" },
          })}
        >
          {places.map((place, i) => (
            <PlacePill
              key={place.name}
              place={place}
              index={i}
              isActive={activeIndex === i}
              onClick={() => handlePillClick(i)}
            />
          ))}
        </div>

        {/* Mobile scroll hint */}
        <p
          className={css({
            display: { base: "block", md: "none" },
            mt: "2",
            fontSize: "2xs",
            color: "text.faint",
            fontFamily: "display",
            fontWeight: "600",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          })}
        >
          Scroll to see all · tap to explore
        </p>
      </div>
    </div>
  );
}
