"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const SWIPE_THRESHOLD_PX = 50;
import { css } from "styled-system/css";
import Link from "next/link";
import type { HotelSearchResult } from "@/lib/types";
import { NEW_HOTEL_MIN_YEAR } from "@/lib/constants";

const T = {
  ro: {
    eyebrow: "Hoteluri in Grecia",
    subtitle: "Sortat dupa discovery score — sentiment, recenzii si valoare",
    cta: "Detalii",
    stars: "stele",
    night: "noapte",
    photos: "fotografii",
    more: "inca",
    disclosure: "Sentiment, aspecte si valoare calculate prin analiza semantica.",
    value: "Valoare",
  },
  en: {
    eyebrow: "Greece Hotels",
    subtitle: "Sorted by discovery score — sentiment, reviews and value",
    cta: "Details",
    stars: "stars",
    night: "night",
    photos: "photos",
    more: "more",
    disclosure: "Sentiment, aspects and value computed via semantic analysis.",
    value: "Value",
  },
};

// ── Lightbox Modal ───────────────────────────────────────────────────

interface LightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);

  const prev = useCallback(() => setIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % images.length), [images.length]);

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
        bg: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(12px)",
      })}
      onClick={onClose}
    >
      {/* Close button */}
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

      {/* Prev arrow */}
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

      {/* Next arrow */}
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

      {/* Image */}
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

      {/* Counter */}
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

// ── Sub-components ───────────────────────────────────────────────────

interface GreeceHotelsProps {
  results: HotelSearchResult[];
  lang: "ro" | "en";
}

function StarBadge({ count }: { count: number }) {
  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5",
        px: "2",
        py: "0.5",
        rounded: "pill",
        fontSize: "meta",
        fontWeight: "600",
        bg: "amber.glow",
        color: "amber.warm",
        border: "1px solid",
        borderColor: "rgba(201, 146, 42, 0.25)",
      })}
    >
      {"★".repeat(count)}
    </span>
  );
}

function NewYearBadge({ year }: { year: number }) {
  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        px: "2",
        py: "0.5",
        rounded: "pill",
        fontSize: "meta",
        fontWeight: "700",
        bg: "rgba(90, 122, 92, 0.2)",
        color: "#8BC48A",
        border: "1px solid rgba(90, 122, 92, 0.3)",
        ml: "1.5",
      })}
    >
      NEW {year}
    </span>
  );
}

function ValueBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 50 ? "#8BC48A" : score >= 25 ? "#C9922A" : "#C45A5A";
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
        border: "1px solid",
        ml: "1.5",
      })}
      style={{
        background: `${color}18`,
        color,
        borderColor: `${color}40`,
      }}
    >
      {label} {Math.round(score)}
    </span>
  );
}

function SentimentBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
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
        {pct}%
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

// ── Main Component ───────────────────────────────────────────────────

export function GreeceHotels({ results, lang }: GreeceHotelsProps) {
  const t = T[lang];
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  // Sort by price ascending (cheapest first), discovery score as tiebreaker
  const sorted = useMemo(
    () =>
      [...results].sort(
        (a, b) =>
          a.hotel.price_eur - b.hotel.price_eur ||
          (b.hotel.discovery_score ?? 0) - (a.hotel.discovery_score ?? 0),
      ),
    [results],
  );

  const openLightbox = (images: string[], index: number) => {
    setLightbox({ images, index });
  };

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

      {/* ── Hotel cards ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" },
          gap: { base: "5", sm: "6" },
        })}
      >
        {sorted.map(({ hotel, score }) => {
          const gallery = hotel.gallery ?? [];
          const heroImg = gallery[0];
          const thumbs = gallery.slice(0, 3);
          const remaining = gallery.length - 3;

          return (
            <div
              key={hotel.hotel_id}
              className={css({
                bg: "steel.surface",
                rounded: "card",
                border: "1px solid",
                borderColor: "steel.border",
                overflow: "hidden",
                boxShadow: "card",
                display: "flex",
                flexDirection: "column",
                transition:
                  "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                _hover: {
                  borderColor: "steel.borderHover",
                  boxShadow: "card.hover",
                  transform: "translateY(-3px)",
                },
              })}
            >
              {/* ── Hero image ── */}
              <div
                className={css({
                  position: "relative",
                  h: { base: "180px", md: "220px" },
                  overflow: "hidden",
                  cursor: heroImg ? "pointer" : "default",
                })}
                onClick={() => heroImg && openLightbox(gallery, 0)}
              >
                {heroImg ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={heroImg}
                    alt={hotel.name}
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
                    src={`https://www.google.com/maps?q=${hotel.lat},${hotel.lng}&z=16&t=k&output=embed&hl=en`}
                    title={`${hotel.name} map`}
                    className={css({
                      w: "100%",
                      h: "100%",
                      border: "none",
                      pointerEvents: "none",
                    })}
                    loading="lazy"
                  />
                )}

                {/* Gradient overlay on image for readability */}
                <div
                  className={css({
                    position: "absolute",
                    inset: "0",
                    pointerEvents: "none",
                  })}
                  style={{
                    background: "linear-gradient(to top, rgba(18,16,14,0.85) 0%, rgba(18,16,14,0.2) 50%, transparent 100%)",
                  }}
                />

                {/* Star badge — top right */}
                <div
                  className={css({
                    position: "absolute",
                    top: "3",
                    right: "4",
                  })}
                >
                  <StarBadge count={hotel.star_rating} />
                  {/* Badge threshold: NEW_HOTEL_MIN_YEAR from @/lib/constants.
                      To change the "new" window, update that constant only —
                      never hardcode a year here. */}
                  {hotel.opened_year && hotel.opened_year >= NEW_HOTEL_MIN_YEAR && <NewYearBadge year={hotel.opened_year} />}
                  {hotel.value_score !== undefined && (
                    <ValueBadge score={hotel.value_score} label={t.value} />
                  )}
                </div>

                {/* Photo count badge — top left */}
                {gallery.length > 0 && (
                  <span
                    className={css({
                      position: "absolute",
                      top: "3",
                      left: "4",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "1",
                      px: "2",
                      py: "0.5",
                      rounded: "pill",
                      fontSize: "meta",
                      fontWeight: "600",
                      bg: "rgba(0,0,0,0.5)",
                      color: "white",
                      backdropFilter: "blur(4px)",
                    })}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    {gallery.length} {t.photos}
                  </span>
                )}

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
                    {"\u20AC"}{hotel.price_eur}
                  </span>
                  <span
                    className={css({
                      fontSize: "meta",
                      color: "text.muted",
                    })}
                  >
                    /{t.night}
                  </span>
                </div>

                {/* Sentiment score — bottom right (only show if real reviews exist) */}
                {hotel.sentiment_score !== undefined && (hotel.review_count ?? 0) > 0 && (
                  <span
                    className={css({
                      position: "absolute",
                      bottom: "3",
                      right: "4",
                      fontSize: "meta",
                      fontFamily: "display",
                      fontVariantNumeric: "tabular-nums",
                    })}
                    style={{
                      color:
                        hotel.sentiment_score >= 0.7
                          ? "#8BC48A"
                          : hotel.sentiment_score >= 0.45
                            ? "#C9922A"
                            : "#C45A5A",
                    }}
                  >
                    {Math.round(hotel.sentiment_score * 100)}% sentiment
                  </span>
                )}
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
                      onClick={() => openLightbox(gallery, i + 1 > gallery.length - 1 ? i : i + 1)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`${hotel.name} photo ${i + 2}`}
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

                      {/* "+N more" badge on last thumbnail */}
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
                          +{remaining} {t.more}
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
                <Link
                  href={`/greece/${hotel.hotel_id}`}
                  target="_blank"
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
                  {hotel.name}
                </Link>

                {/* Sentiment bar */}
                {hotel.sentiment_score !== undefined && (
                  <SentimentBar score={hotel.sentiment_score} />
                )}

                {/* Review metrics row */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    flexWrap: "wrap",
                  })}
                >
                  {hotel.discovery_score !== undefined && hotel.discovery_score > 0 && (
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
                      Discovery {Math.round(hotel.discovery_score)}
                    </span>
                  )}
                  {hotel.review_rating !== undefined && hotel.review_rating > 0 && (
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
                      {hotel.review_rating.toFixed(1)}/10
                    </span>
                  )}
                  {hotel.review_count !== undefined && hotel.review_count > 0 && (
                    <span
                      className={css({
                        fontSize: "meta",
                        color: "text.muted",
                      })}
                    >
                      {hotel.review_count.toLocaleString()} reviews
                    </span>
                  )}
                </div>

                {/* Location + Board type */}
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
                    <span>{hotel.location}</span>
                  </div>

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
                    {hotel.board_type}
                  </span>
                </div>

                {/* Description */}
                <p
                  className={css({
                    fontSize: "meta",
                    color: "text.secondary",
                    lineHeight: "body",
                  })}
                >
                  {hotel.description}
                </p>

                {/* Amenities */}
                {hotel.amenities.length > 0 && (
                  <div
                    className={css({
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1.5",
                    })}
                  >
                    {hotel.amenities.map((a) => (
                      <AmenityChip key={a} label={a} />
                    ))}
                  </div>
                )}

                {/* Spacer */}
                <div className={css({ flex: "1" })} />

                {/* CTA */}
                <Link
                  href={`/greece/${hotel.hotel_id}`}
                  target="_blank"
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
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tech disclosure ── */}
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
