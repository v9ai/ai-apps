"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { css } from "styled-system/css";
import type { LongStayResult } from "@/lib/types";

const T = {
  ro: {
    eyebrow: "Inchirieri Termen Lung — Grecia",
    subtitle: "Case, apartamente si vile langa plaja cu parcare — 28+ nopti",
    parking: "Parcare",
    beach: "plaja",
    month: "luna",
    beds: "dormitoare",
    unknownBeach: "distanta plaja necunoscuta",
    cta: "Vezi oferta",
    score: "Scor",
    disclosure:
      "Scoring: pret lunar, proximitate plaja, parcare si facilitati. Curatate manual + scraping automat.",
    noResults: "Niciun rezultat gasit.",
    typeLabels: {
      house: "Casa",
      apartment: "Apartament",
      villa: "Vila",
      studio: "Studio",
    } as Record<string, string>,
  },
  en: {
    eyebrow: "Greece Long-Stay Rentals",
    subtitle: "Houses, apartments and villas near the beach with parking — 28+ nights",
    parking: "Parking",
    beach: "beach",
    month: "month",
    beds: "beds",
    unknownBeach: "beach distance unknown",
    cta: "View listing",
    score: "Score",
    disclosure:
      "Scored by: monthly price, beach proximity, parking and amenities. Curated + auto-scraped.",
    noResults: "No results found.",
    typeLabels: {
      house: "House",
      apartment: "Apartment",
      villa: "Villa",
      studio: "Studio",
    } as Record<string, string>,
  },
};

// ── Lightbox ─────────────────────────────────────────────────────────────

interface LightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  return (
    <div
      className={css({
        position: "fixed",
        inset: "0",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bg: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)",
      })}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className={css({
          position: "absolute",
          top: "4",
          right: "4",
          w: "10",
          h: "10",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bg: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          rounded: "full",
          color: "white",
          fontSize: "xl",
          cursor: "pointer",
          transition: "all 0.2s",
          _hover: { bg: "rgba(255,255,255,0.2)" },
          zIndex: 10,
        })}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className={css({
          position: "absolute",
          left: { base: "2", md: "6" },
          w: "12",
          h: "12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bg: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          rounded: "full",
          color: "white",
          cursor: "pointer",
          transition: "all 0.2s",
          _hover: { bg: "rgba(255,255,255,0.18)" },
          zIndex: 10,
        })}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className={css({
          position: "absolute",
          right: { base: "2", md: "6" },
          w: "12",
          h: "12",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bg: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          rounded: "full",
          color: "white",
          cursor: "pointer",
          transition: "all 0.2s",
          _hover: { bg: "rgba(255,255,255,0.18)" },
          zIndex: 10,
        })}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt={`Photo ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className={css({
          maxW: "90vw",
          maxH: "80vh",
          objectFit: "contain",
          rounded: "lg",
          boxShadow: "0 8px 48px rgba(0,0,0,0.6)",
        })}
      />
      <span
        className={css({
          position: "absolute",
          bottom: "5",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "sm",
          color: "rgba(255,255,255,0.6)",
          fontVariantNumeric: "tabular-nums",
          fontFamily: "display",
          letterSpacing: "0.05em",
          zIndex: 10,
        })}
      >
        {index + 1} / {images.length}
      </span>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function ParkingBadge({ label }: { label: string }) {
  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "1",
        px: "2",
        py: "0.5",
        rounded: "pill",
        fontSize: "meta",
        fontWeight: "700",
        bg: "rgba(90, 122, 92, 0.2)",
        color: "#8BC48A",
        border: "1px solid rgba(90, 122, 92, 0.3)",
      })}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2v-6h4a5 5 0 0 0 0-10H6zM8 6h4a3 3 0 0 1 0 6H8V6z" />
      </svg>
      {label}
    </span>
  );
}

function BeachDistanceChip({ km, unknownLabel }: { km: number | null; unknownLabel: string }) {
  if (km === null) {
    return (
      <span
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1",
          px: "2",
          py: "0.5",
          rounded: "pill",
          fontSize: "meta",
          fontWeight: "600",
          bg: "steel.raised",
          color: "text.faint",
          border: "1px solid",
          borderColor: "steel.border",
        })}
      >
        {unknownLabel}
      </span>
    );
  }

  const color = km === 0 ? "#8BC48A" : km < 0.5 ? "#8BC48A" : km < 1.5 ? "#C9922A" : "#A89E90";
  const label = km === 0 ? "Beachfront" : `~${km.toFixed(1)} km`;

  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "1",
        px: "2",
        py: "0.5",
        rounded: "pill",
        fontSize: "meta",
        fontWeight: "600",
        border: "1px solid",
      })}
      style={{
        background: `${color}18`,
        color,
        borderColor: `${color}40`,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20 Q6 14 12 14 Q18 14 22 20" />
        <path d="M2 16 Q6 10 12 10 Q18 10 22 16" />
      </svg>
      {label}
    </span>
  );
}

function PropertyTypeBadge({ type: propType, labels }: { type: string; labels: Record<string, string> }) {
  return (
    <span
      className={css({
        px: "2",
        py: "0.5",
        rounded: "pill",
        fontSize: "meta",
        fontWeight: "600",
        color: "copper.light",
        bg: "rgba(160, 94, 50, 0.12)",
        border: "1px solid",
        borderColor: "rgba(160, 94, 50, 0.2)",
      })}
    >
      {labels[propType] ?? propType}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score);
  const color = pct >= 70 ? "#8BC48A" : pct >= 45 ? "#C9922A" : "#C45A5A";
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        gap: "2",
        mt: "1",
      })}
    >
      <div
        className={css({
          flex: "1",
          h: "4px",
          rounded: "full",
          bg: "steel.raised",
          overflow: "hidden",
        })}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: "9999px",
          }}
        />
      </div>
      <span
        className={css({
          fontSize: "11px",
          fontWeight: "600",
          fontFamily: "display",
          fontVariantNumeric: "tabular-nums",
        })}
        style={{ color }}
      >
        {pct}
      </span>
    </div>
  );
}

function AmenityChip({ label }: { label: string }) {
  return (
    <span
      className={css({
        px: "2",
        py: "0.5",
        rounded: "pill",
        fontSize: "meta",
        color: "text.secondary",
        bg: "steel.raised",
        border: "1px solid",
        borderColor: "steel.border",
        whiteSpace: "nowrap",
      })}
    >
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface GreeceRentalsProps {
  results: LongStayResult[];
  lang: "ro" | "en";
}

export function GreeceRentals({ results, lang }: GreeceRentalsProps) {
  const t = T[lang];
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  // Sort by total_score desc, monthly_price asc as tiebreaker
  const sorted = useMemo(
    () =>
      [...results].sort(
        (a, b) =>
          b.score.total_score - a.score.total_score ||
          a.monthly_price_eur - b.monthly_price_eur,
      ),
    [results],
  );

  if (sorted.length === 0) {
    return (
      <p
        className={css({
          textAlign: "center",
          fontSize: "body",
          color: "text.muted",
          py: "16",
        })}
      >
        {t.noResults}
      </p>
    );
  }

  return (
    <section>
      {/* ── Eyebrow divider ── */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: "3",
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

      <p
        className={css({
          textAlign: "center",
          fontSize: "meta",
          color: "text.muted",
          mb: "8",
        })}
      >
        {t.subtitle}
      </p>

      {/* ── Rental cards ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
          gap: { base: "5", sm: "6" },
        })}
      >
        {sorted.map((result) => {
          const gallery = result.gallery ?? [];
          const heroImg = gallery[0];
          const thumbs = gallery.slice(0, 3);
          const remaining = gallery.length - 3;

          return (
            <div
              key={result.rental_id}
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
              {/* ── Hero image / map fallback ── */}
              <div
                className={css({
                  position: "relative",
                  h: { base: "180px", md: "220px" },
                  overflow: "hidden",
                  cursor: heroImg ? "pointer" : "default",
                })}
                onClick={() => heroImg && setLightbox({ images: gallery, index: 0 })}
              >
                {heroImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={heroImg}
                    alt={result.name}
                    className={css({
                      w: "100%",
                      h: "100%",
                      objectFit: "cover",
                      transition: "transform 0.4s ease",
                    })}
                    style={{ display: "block" }}
                  />
                ) : (
                  <iframe
                    src={`https://www.google.com/maps?q=${result.lat},${result.lng}&z=15&t=k&output=embed&hl=en`}
                    title={`${result.name} map`}
                    className={css({ w: "100%", h: "100%", border: "none", pointerEvents: "none" })}
                    loading="lazy"
                  />
                )}

                {/* Gradient overlay */}
                <div
                  className={css({ position: "absolute", inset: "0", pointerEvents: "none" })}
                  style={{
                    background:
                      "linear-gradient(to top, rgba(18,16,14,0.85) 0%, rgba(18,16,14,0.2) 50%, transparent 100%)",
                  }}
                />

                {/* Badges — top right: Parking + Beach distance */}
                <div
                  className={css({
                    position: "absolute",
                    top: "3",
                    right: "4",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "1",
                  })}
                >
                  {result.has_parking && <ParkingBadge label={t.parking} />}
                  <BeachDistanceChip km={result.beach_distance_km} unknownLabel={t.unknownBeach} />
                </div>

                {/* Price tag — bottom left */}
                <div
                  className={css({
                    position: "absolute",
                    bottom: "3",
                    left: "4",
                    display: "flex",
                    alignItems: "baseline",
                    gap: "1",
                  })}
                >
                  <span
                    className={css({
                      fontSize: "h3",
                      fontWeight: "800",
                      fontFamily: "display",
                      color: "text.primary",
                      lineHeight: "1",
                    })}
                  >
                    {"\u20AC"}{result.monthly_price_eur.toLocaleString()}
                  </span>
                  <span className={css({ fontSize: "meta", color: "text.muted" })}>
                    /{t.month}
                  </span>
                </div>
              </div>

              {/* ── Thumbnail strip ── */}
              {thumbs.length > 0 && (
                <div
                  className={css({
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1px",
                    bg: "steel.border",
                  })}
                >
                  {thumbs.map((url, i) => (
                    <div
                      key={url}
                      className={css({
                        position: "relative",
                        h: "70px",
                        overflow: "hidden",
                        cursor: "pointer",
                        bg: "steel.surface",
                      })}
                      onClick={() =>
                        setLightbox({ images: gallery, index: i + 1 > gallery.length - 1 ? i : i + 1 })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${result.name} photo ${i + 2}`}
                        className={css({
                          w: "100%",
                          h: "100%",
                          objectFit: "cover",
                          transition: "transform 0.3s ease, opacity 0.3s ease",
                          opacity: "0.85",
                          _hover: { transform: "scale(1.05)", opacity: "1" },
                        })}
                        style={{ display: "block" }}
                      />
                      {i === 2 && remaining > 0 && (
                        <div
                          className={css({
                            position: "absolute",
                            inset: "0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bg: "rgba(0,0,0,0.55)",
                            backdropFilter: "blur(2px)",
                            color: "white",
                            fontSize: "meta",
                            fontWeight: "700",
                            fontFamily: "display",
                          })}
                        >
                          +{remaining}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                {/* Name */}
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({
                    fontSize: { base: "body", md: "lg" },
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    lineHeight: "1.3",
                    textDecoration: "none",
                    transition: "color 0.2s",
                    _hover: { color: "amber.warm" },
                  })}
                >
                  {result.name}
                </a>

                {/* Score bar */}
                <ScoreBar score={result.score.total_score} />

                {/* Metrics row: score badge + bedrooms */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    flexWrap: "wrap",
                  })}
                >
                  <span
                    className={css({
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "1",
                      px: "2",
                      py: "0.5",
                      rounded: "pill",
                      fontSize: "meta",
                      fontWeight: "700",
                      bg: "rgba(74, 122, 155, 0.15)",
                      color: "#4a7a9b",
                      border: "1px solid rgba(74, 122, 155, 0.3)",
                    })}
                  >
                    {t.score} {Math.round(result.score.total_score)}
                  </span>

                  {result.bedrooms !== null && result.bedrooms !== undefined && (
                    <span
                      className={css({
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "1",
                        px: "2",
                        py: "0.5",
                        rounded: "pill",
                        fontSize: "meta",
                        fontWeight: "600",
                        bg: "rgba(201, 146, 42, 0.1)",
                        color: "amber.warm",
                        border: "1px solid rgba(201, 146, 42, 0.2)",
                      })}
                    >
                      {result.bedrooms} {t.beds}
                    </span>
                  )}
                </div>

                {/* Location + Property type */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "3",
                    flexWrap: "wrap",
                  })}
                >
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
                    <span>{result.location}</span>
                  </div>

                  <PropertyTypeBadge type={result.property_type} labels={t.typeLabels} />
                </div>

                {/* Description */}
                <p
                  className={css({
                    fontSize: "meta",
                    color: "text.secondary",
                    lineHeight: "body",
                  })}
                >
                  {result.description}
                </p>

                {/* Amenities */}
                {result.amenities.length > 0 && (
                  <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5" })}>
                    {result.amenities.map((a) => (
                      <AmenityChip key={a} label={a} />
                    ))}
                  </div>
                )}

                <div className={css({ flex: "1" })} />

                {/* CTA */}
                <a
                  href={result.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
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
                    _hover: {
                      borderColor: "amber.warm",
                      color: "amber.warm",
                      bg: "rgba(201, 146, 42, 0.08)",
                    },
                  })}
                >
                  {t.cta}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Disclosure ── */}
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

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
