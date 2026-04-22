"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { getHotelById, hotels2026 } from "@/lib/data";
import { NEW_HOTEL_MIN_YEAR } from "@/lib/constants";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";

const T = {
  ro: {
    back: "Toate hotelurile",
    night: "noapte",
    stars: "stele",
    sentiment: "Scor Sentiment",
    value: "Valoare Pret",
    aspects: "Analiza Aspecte",
    pros: "Avantaje",
    cons: "Dezavantaje",
    reviews: "Recenzii",
    amenities: "Facilitati",
    location: "Locatie",
    cta: "Rezerva acum",
    pipeline: "Analiza",
    pipelineDesc:
      "Sentiment, aspecte si valoare calculate prin cosine similarity cu all-MiniLM-L6-v2 (384-dim).",
    notFound: "Hotelul nu a fost gasit",
    cheaperThanAvg: "mai ieftin decat media",
    priceContext: "Context pret",
    region: "Regiune",
    boardType: "Tip masa",
    openedIn: "Deschis in",
    representative: "Recenzie reprezentativa",
    discovery: "Scor Discovery",
    reviewRating: "Rating recenzii",
    reviewCount: "Numar recenzii",
  },
  en: {
    back: "All hotels",
    night: "night",
    stars: "stars",
    sentiment: "Sentiment Score",
    value: "Value Score",
    aspects: "Aspect Analysis",
    pros: "Pros",
    cons: "Cons",
    reviews: "Reviews",
    amenities: "Amenities",
    location: "Location",
    cta: "Book now",
    pipeline: "Analysis",
    pipelineDesc:
      "Sentiment, aspects and value computed via cosine similarity with all-MiniLM-L6-v2 (384-dim).",
    notFound: "Hotel not found",
    cheaperThanAvg: "cheaper than average",
    priceContext: "Price context",
    region: "Region",
    boardType: "Board type",
    openedIn: "Opened in",
    representative: "Representative review",
    discovery: "Discovery Score",
    reviewRating: "Review Rating",
    reviewCount: "Review Count",
  },
};

// ── Sub-components ────────────────────────────────────────────────────

function SentimentGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70
      ? "#8BC48A"
      : pct >= 45
        ? "#C9922A"
        : "#C45A5A";

  return (
    <div>
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          mb: "2",
        })}
      >
        <span
          className={css({
            fontSize: "meta",
            fontWeight: "600",
            fontFamily: "display",
            color: "text.secondary",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          })}
        >
          {label}
        </span>
        <span
          className={css({
            fontSize: "body",
            fontWeight: "800",
            fontFamily: "display",
            fontVariantNumeric: "tabular-nums",
          })}
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div
        className={css({
          h: "8px",
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
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

function AspectBars({
  scores,
  label,
}: {
  scores: Record<string, number>;
  label: string;
}) {
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  return (
    <div>
      <h3
        className={css({
          fontSize: "meta",
          fontWeight: "600",
          fontFamily: "display",
          color: "text.secondary",
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          mb: "4",
        })}
      >
        {label}
      </h3>
      <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
        {entries.map(([name, score]) => {
          const pct = Math.round(score * 100);
          return (
            <div key={name}>
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  mb: "1",
                })}
              >
                <span
                  className={css({
                    fontSize: "meta",
                    color: "text.muted",
                  })}
                >
                  {name}
                </span>
                <span
                  className={css({
                    fontSize: "meta",
                    color: "text.faint",
                    fontVariantNumeric: "tabular-nums",
                  })}
                >
                  {pct}%
                </span>
              </div>
              <div
                className={css({
                  h: "5px",
                  rounded: "full",
                  bg: "steel.raised",
                  overflow: "hidden",
                })}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background:
                      pct >= 60
                        ? "linear-gradient(90deg, #4a7a9b88, #4a7a9b)"
                        : "linear-gradient(90deg, #C9922A55, #C9922A)",
                    borderRadius: "9999px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProsCons({
  pros,
  cons,
  prosLabel,
  consLabel,
}: {
  pros: string[];
  cons: string[];
  prosLabel: string;
  consLabel: string;
}) {
  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
        gap: "4",
      })}
    >
      {pros.length > 0 && (
        <div>
          <h3
            className={css({
              fontSize: "meta",
              fontWeight: "600",
              fontFamily: "display",
              color: "#8BC48A",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              mb: "3",
            })}
          >
            {prosLabel}
          </h3>
          <ul className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            {pros.map((p, i) => (
              <li
                key={i}
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "body",
                  pl: "4",
                  position: "relative",
                  _before: {
                    content: '"+"',
                    position: "absolute",
                    left: "0",
                    color: "#8BC48A",
                    fontWeight: "700",
                  },
                })}
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {cons.length > 0 && (
        <div>
          <h3
            className={css({
              fontSize: "meta",
              fontWeight: "600",
              fontFamily: "display",
              color: "#C45A5A",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              mb: "3",
            })}
          >
            {consLabel}
          </h3>
          <ul className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            {cons.map((c, i) => (
              <li
                key={i}
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "body",
                  pl: "4",
                  position: "relative",
                  _before: {
                    content: '"-"',
                    position: "absolute",
                    left: "0",
                    color: "#C45A5A",
                    fontWeight: "700",
                  },
                })}
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export function HotelDetailContent({ hotelId }: { hotelId: string }) {
  const { lang } = useLang();
  const t = T[lang];
  const result = getHotelById(hotelId);

  if (!result) {
    return (
      <div
        className={css({
          minH: "100vh",
          bg: "steel.dark",
          color: "text.primary",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "h2",
        })}
      >
        {t.notFound}
      </div>
    );
  }

  const hotel = result.hotel;
  const avgPrice =
    hotels2026.reduce((sum, r) => sum + r.hotel.price_eur, 0) / hotels2026.length;
  const pctCheaper =
    hotel.price_eur < avgPrice
      ? Math.round(((avgPrice - hotel.price_eur) / avgPrice) * 100)
      : 0;

  const hasRealReviews = (hotel.review_count ?? 0) > 0;
  const reviews = (hotel.reviews ?? []).filter((r) => r.is_representative);
  // Only show reviews from real sources when available; otherwise show description-based analysis
  const allReviews = hasRealReviews
    ? (hotel.reviews ?? []).filter((r) => r.source !== "ml-analysis")
    : (hotel.reviews ?? []).filter((r) => r.source === "description");

  const gallery = hotel.gallery ?? [];
  const hasGallery = gallery.length > 0;
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(
    () => setLightboxIdx((i) => (i !== null ? (i - 1 + gallery.length) % gallery.length : null)),
    [gallery.length],
  );
  const nextImage = useCallback(
    () => setLightboxIdx((i) => (i !== null ? (i + 1) % gallery.length : null)),
    [gallery.length],
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, closeLightbox, prevImage, nextImage]);

  return (
    <div
      className={css({
        minH: "100vh",
        bg: "steel.dark",
        color: "text.primary",
      })}
    >
      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <div
          className={css({
            position: "fixed",
            inset: "0",
            zIndex: 100,
            bg: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          })}
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className={css({
              position: "absolute",
              top: "4",
              right: "4",
              w: "10",
              h: "10",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              rounded: "full",
              bg: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "h3",
              cursor: "pointer",
              border: "none",
              _hover: { bg: "rgba(255,255,255,0.2)" },
            })}
          >
            &times;
          </button>
          {gallery.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className={css({
                  position: "absolute",
                  left: "4",
                  w: "10",
                  h: "10",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  rounded: "full",
                  bg: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "h3",
                  cursor: "pointer",
                  border: "none",
                  _hover: { bg: "rgba(255,255,255,0.2)" },
                })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className={css({
                  position: "absolute",
                  right: "4",
                  w: "10",
                  h: "10",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  rounded: "full",
                  bg: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "h3",
                  cursor: "pointer",
                  border: "none",
                  _hover: { bg: "rgba(255,255,255,0.2)" },
                })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </>
          )}
          <img
            src={gallery[lightboxIdx]}
            alt={`${hotel.name} photo ${lightboxIdx + 1}`}
            onClick={(e) => e.stopPropagation()}
            className={css({
              maxW: "90vw",
              maxH: "85vh",
              rounded: "lg",
              objectFit: "contain",
            })}
          />
          <span
            className={css({
              position: "absolute",
              bottom: "4",
              fontSize: "meta",
              color: "rgba(255,255,255,0.5)",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {lightboxIdx + 1} / {gallery.length}
          </span>
        </div>
      )}

      {/* ── Hero ── */}
      <div
        className={css({
          position: "relative",
          h: { base: "250px", md: "360px" },
          overflow: "hidden",
        })}
      >
        {hasGallery ? (
          <img
            src={gallery[0]}
            alt={hotel.name}
            onClick={() => setLightboxIdx(0)}
            className={css({
              w: "100%",
              h: "100%",
              objectFit: "cover",
              cursor: "pointer",
            })}
          />
        ) : (
          <iframe
            src={`https://www.google.com/maps?q=${hotel.lat},${hotel.lng}&z=16&t=k&output=embed&hl=en`}
            title={`${hotel.name} satellite view`}
            className={css({
              w: "100%",
              h: "100%",
              border: "none",
              pointerEvents: "none",
            })}
            loading="lazy"
          />
        )}
        <div
          className={css({
            position: "absolute",
            inset: "0",
            pointerEvents: "none",
          })}
          style={{
            background:
              "linear-gradient(to top, #12100E 0%, rgba(18,16,14,0.4) 50%, transparent 100%)",
          }}
        />

        {/* Back button */}
        <Link
          href="/greece"
          className={css({
            position: "absolute",
            top: { base: "4", md: "6" },
            left: { base: "4", md: "8" },
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
            px: "3",
            py: "1.5",
            rounded: "pill",
            fontSize: "meta",
            fontWeight: "600",
            bg: "rgba(0,0,0,0.4)",
            color: "white",
            textDecoration: "none",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.2s",
            _hover: { bg: "rgba(0,0,0,0.6)" },
            zIndex: 10,
          })}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {t.back}
        </Link>

        {/* Hero info overlay */}
        <div
          className={css({
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            px: { base: "5", md: "8", xl: "12" },
            pb: { base: "6", md: "8" },
            w: "100%",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "2",
              mb: "2",
            })}
          >
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                px: "2",
                py: "0.5",
                rounded: "pill",
                fontSize: "meta",
                fontWeight: "600",
                bg: "amber.glow",
                color: "amber.warm",
                border: "1px solid rgba(201, 146, 42, 0.25)",
              })}
            >
              {"★".repeat(hotel.star_rating)}
            </span>
            {/* Badge threshold: NEW_HOTEL_MIN_YEAR from @/lib/constants.
                To change the "new" window, update that constant only —
                never hardcode a year here. */}
            {hotel.opened_year && hotel.opened_year >= NEW_HOTEL_MIN_YEAR && (
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
                })}
              >
                NEW {hotel.opened_year}
              </span>
            )}
            <span
              className={css({
                px: "2",
                py: "0.5",
                rounded: "pill",
                fontSize: "meta",
                fontWeight: "600",
                color: "copper.light",
                bg: "rgba(160, 94, 50, 0.12)",
                border: "1px solid rgba(160, 94, 50, 0.2)",
              })}
            >
              {hotel.board_type}
            </span>
          </div>

          <h1
            className={css({
              fontSize: { base: "h2", md: "h1" },
              fontWeight: "800",
              fontFamily: "display",
              lineHeight: "h1",
              letterSpacing: "h1",
              color: "text.primary",
            })}
          >
            {hotel.name}
          </h1>

          <div
            className={css({
              display: "flex",
              alignItems: "baseline",
              gap: "4",
              mt: "2",
              flexWrap: "wrap",
            })}
          >
            <div className={css({ display: "flex", alignItems: "baseline", gap: "1" })}>
              <span
                className={css({
                  fontSize: "h2",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "text.primary",
                })}
              >
                {"\u20AC"}{hotel.price_eur}
              </span>
              <span className={css({ fontSize: "meta", color: "text.muted" })}>
                /{t.night}
              </span>
            </div>
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
          </div>
        </div>
      </div>

      {/* ── Gallery Thumbnails ── */}
      {hasGallery && gallery.length > 1 && (
        <div
          className={css({
            w: "100%",
            px: { base: "5", md: "8", xl: "12" },
            pt: "4",
            display: "flex",
            gap: "2",
            overflowX: "auto",
          })}
        >
          {gallery.slice(0, 6).map((url, i) => (
            <button
              key={i}
              onClick={() => setLightboxIdx(i)}
              className={css({
                flex: "0 0 auto",
                w: { base: "80px", md: "110px" },
                h: { base: "56px", md: "74px" },
                rounded: "md",
                overflow: "hidden",
                border: "2px solid",
                borderColor: "steel.border",
                cursor: "pointer",
                opacity: "0.75",
                transition: "all 0.2s",
                _hover: { opacity: "1", borderColor: "amber.warm" },
                bg: "transparent",
                p: "0",
              })}
            >
              <img
                src={url}
                alt={`${hotel.name} photo ${i + 1}`}
                className={css({
                  w: "100%",
                  h: "100%",
                  objectFit: "cover",
                })}
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <main
        className={css({
          w: "100%",
          px: { base: "5", md: "8", xl: "12" },
          py: { base: "8", md: "12" },
          display: "flex",
          flexDirection: "column",
          gap: "8",
        })}
      >
        {/* ── Description ── */}
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
          })}
        >
          {hotel.description}
        </p>

        {/* ── Scores Row ── */}
        {(hotel.sentiment_score !== undefined ||
          hotel.value_score !== undefined ||
          hotel.discovery_score !== undefined) && (
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
              gap: "6",
              p: { base: "5", md: "6" },
              bg: "steel.surface",
              rounded: "card",
              border: "1px solid",
              borderColor: "steel.border",
            })}
          >
            {hotel.discovery_score !== undefined && (
              <SentimentGauge
                score={hotel.discovery_score / 100}
                label={t.discovery}
              />
            )}
            {hotel.sentiment_score !== undefined && (
              <SentimentGauge
                score={hotel.sentiment_score}
                label={t.sentiment}
              />
            )}
            {hotel.value_score !== undefined && (
              <SentimentGauge
                score={hotel.value_score / 100}
                label={t.value}
              />
            )}
          </div>
        )}

        {/* ── Review Rating + Count (only when real data exists) ── */}
        {(hotel.review_rating !== undefined && hotel.review_rating > 0 && (hotel.review_count ?? 0) > 0) && (
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "4",
              p: "4",
              bg: "rgba(201, 146, 42, 0.06)",
              rounded: "card",
              border: "1px solid rgba(201, 146, 42, 0.12)",
            })}
          >
            <span
              className={css({
                fontSize: "h2",
                fontWeight: "800",
                fontFamily: "display",
                color: "amber.warm",
              })}
            >
              {hotel.review_rating.toFixed(1)}
            </span>
            <div>
              <span className={css({ fontSize: "meta", color: "text.secondary", fontWeight: "600" })}>
                /10 {t.reviewRating}
              </span>
              {hotel.review_count !== undefined && hotel.review_count > 0 && (
                <p className={css({ fontSize: "meta", color: "text.muted", mt: "0.5" })}>
                  {hotel.review_count.toLocaleString()} {t.reviewCount.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Price Context ── */}
        {pctCheaper > 0 && (
          <div
            className={css({
              p: "4",
              bg: "rgba(90, 122, 92, 0.08)",
              rounded: "card",
              border: "1px solid rgba(90, 122, 92, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: "3",
            })}
          >
            <span
              className={css({
                fontSize: "h3",
                fontWeight: "800",
                fontFamily: "display",
                color: "#8BC48A",
              })}
            >
              {pctCheaper}%
            </span>
            <span className={css({ fontSize: "meta", color: "text.secondary" })}>
              {t.cheaperThanAvg} ({"\u20AC"}{Math.round(avgPrice)}/night avg)
            </span>
          </div>
        )}

        {/* ── Aspect Bars ── */}
        {hotel.aspect_scores &&
          Object.keys(hotel.aspect_scores).length > 0 && (
            <div
              className={css({
                p: { base: "5", md: "6" },
                bg: "steel.surface",
                rounded: "card",
                border: "1px solid",
                borderColor: "steel.border",
              })}
            >
              <AspectBars scores={hotel.aspect_scores} label={t.aspects} />
            </div>
          )}

        {/* ── Pros / Cons ── */}
        {((hotel.pros && hotel.pros.length > 0) ||
          (hotel.cons && hotel.cons.length > 0)) && (
          <div
            className={css({
              p: { base: "5", md: "6" },
              bg: "steel.surface",
              rounded: "card",
              border: "1px solid",
              borderColor: "steel.border",
            })}
          >
            <ProsCons
              pros={hotel.pros ?? []}
              cons={hotel.cons ?? []}
              prosLabel={t.pros}
              consLabel={t.cons}
            />
          </div>
        )}

        {/* ── Review Highlights ── */}
        {allReviews.length > 0 && (
          <div>
            <h3
              className={css({
                fontSize: "meta",
                fontWeight: "600",
                fontFamily: "display",
                color: "text.secondary",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                mb: "4",
              })}
            >
              {hasRealReviews
                ? `${t.reviews} (${hotel.review_count})`
                : `${t.reviews} (${lang === "ro" ? "analiză" : "analysis"})`}
            </h3>
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", md: "1fr 1fr", xl: "repeat(3, 1fr)" },
                gap: "4",
              })}
            >
              {allReviews.slice(0, 6).map((review, i) => {
                const sentColor =
                  review.sentiment > 0.1
                    ? "#8BC48A"
                    : review.sentiment < -0.05
                      ? "#C45A5A"
                      : "#C9922A";
                return (
                  <div
                    key={i}
                    className={css({
                      p: "4",
                      bg: "steel.surface",
                      rounded: "card",
                      border: "1px solid",
                      borderColor: review.is_representative
                        ? "rgba(74, 122, 155, 0.4)"
                        : "steel.border",
                      position: "relative",
                    })}
                  >
                    {review.is_representative && (
                      <span
                        className={css({
                          position: "absolute",
                          top: "-8px",
                          left: "12px",
                          px: "2",
                          py: "0.5",
                          rounded: "pill",
                          fontSize: "11px",
                          fontWeight: "600",
                          bg: "rgba(74, 122, 155, 0.15)",
                          color: "#4a7a9b",
                          border: "1px solid rgba(74, 122, 155, 0.3)",
                        })}
                      >
                        {t.representative}
                      </span>
                    )}
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "2",
                        mb: "2",
                      })}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: sentColor,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        className={css({
                          fontSize: "11px",
                          color: "text.faint",
                          fontFamily: "display",
                        })}
                      >
                        {review.source}
                      </span>
                      {review.aspects.length > 0 && (
                        <span
                          className={css({
                            fontSize: "11px",
                            color: "text.faint",
                            ml: "auto",
                          })}
                        >
                          {review.aspects.join(", ")}
                        </span>
                      )}
                    </div>
                    <p
                      className={css({
                        fontSize: "meta",
                        color: "text.secondary",
                        lineHeight: "body",
                      })}
                    >
                      {review.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Amenities ── */}
        {hotel.amenities.length > 0 && (
          <div>
            <h3
              className={css({
                fontSize: "meta",
                fontWeight: "600",
                fontFamily: "display",
                color: "text.secondary",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                mb: "4",
              })}
            >
              {t.amenities}
            </h3>
            <div
              className={css({
                display: "flex",
                flexWrap: "wrap",
                gap: "2",
              })}
            >
              {hotel.amenities.map((a) => (
                <span
                  key={a}
                  className={css({
                    px: "3",
                    py: "1",
                    rounded: "pill",
                    fontSize: "meta",
                    color: "text.secondary",
                    bg: "steel.raised",
                    border: "1px solid",
                    borderColor: "steel.border",
                    whiteSpace: "nowrap",
                  })}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Google Maps ── */}
        <div>
          <h3
            className={css({
              fontSize: "meta",
              fontWeight: "600",
              fontFamily: "display",
              color: "text.secondary",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              mb: "4",
            })}
          >
            {t.location}
          </h3>
          <div
            className={css({
              rounded: "card",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "steel.border",
              h: { base: "250px", md: "350px" },
            })}
          >
            <iframe
              src={`https://www.google.com/maps?q=${hotel.lat},${hotel.lng}&z=15&t=k&output=embed&hl=en`}
              title={`${hotel.name} location`}
              className={css({
                w: "100%",
                h: "100%",
                border: "none",
              })}
              loading="lazy"
              allowFullScreen
            />
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              mt: "3",
              fontSize: "meta",
              color: "text.muted",
              textDecoration: "none",
              transition: "color 0.2s",
              _hover: { color: "amber.warm" },
            })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Open in Google Maps
          </a>
        </div>

        {/* ── Hotel Meta ── */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "4",
            p: { base: "5", md: "6" },
            bg: "steel.surface",
            rounded: "card",
            border: "1px solid",
            borderColor: "steel.border",
          })}
        >
          <div>
            <span
              className={css({
                fontSize: "11px",
                color: "text.faint",
                textTransform: "uppercase",
                fontFamily: "display",
                letterSpacing: "0.05em",
              })}
            >
              {t.region}
            </span>
            <p
              className={css({
                fontSize: "meta",
                color: "text.primary",
                fontWeight: "600",
                mt: "1",
              })}
            >
              {hotel.region}
            </p>
          </div>
          <div>
            <span
              className={css({
                fontSize: "11px",
                color: "text.faint",
                textTransform: "uppercase",
                fontFamily: "display",
                letterSpacing: "0.05em",
              })}
            >
              {t.boardType}
            </span>
            <p
              className={css({
                fontSize: "meta",
                color: "text.primary",
                fontWeight: "600",
                mt: "1",
              })}
            >
              {hotel.board_type}
            </p>
          </div>
          {hotel.opened_year && (
            <div>
              <span
                className={css({
                  fontSize: "11px",
                  color: "text.faint",
                  textTransform: "uppercase",
                  fontFamily: "display",
                  letterSpacing: "0.05em",
                })}
              >
                {t.openedIn}
              </span>
              <p
                className={css({
                  fontSize: "meta",
                  color: "#8BC48A",
                  fontWeight: "600",
                  mt: "1",
                })}
              >
                {hotel.opened_year}
              </p>
            </div>
          )}
          <div>
            <span
              className={css({
                fontSize: "11px",
                color: "text.faint",
                textTransform: "uppercase",
                fontFamily: "display",
                letterSpacing: "0.05em",
              })}
            >
              Coords
            </span>
            <p
              className={css({
                fontSize: "meta",
                color: "text.muted",
                fontVariantNumeric: "tabular-nums",
                mt: "1",
              })}
            >
              {hotel.lat.toFixed(4)}, {hotel.lng.toFixed(4)}
            </p>
          </div>
        </div>

        {/* ── CTA ── */}
        <a
          href={hotel.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2",
            alignSelf: "flex-start",
            px: "6",
            py: "3",
            rounded: "pill",
            fontSize: "body",
            fontWeight: "700",
            fontFamily: "display",
            letterSpacing: "0.03em",
            border: "1px solid",
            borderColor: "amber.warm",
            color: "amber.warm",
            bg: "rgba(201, 146, 42, 0.08)",
            textDecoration: "none",
            transition: "all 0.2s ease",
            cursor: "pointer",
            _hover: {
              bg: "rgba(201, 146, 42, 0.18)",
              transform: "translateY(-1px)",
            },
          })}
        >
          {t.cta}
          <svg
            width="14"
            height="14"
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

        {/* ── Pipeline disclosure ── */}
        <div
          className={css({
            mt: "4",
            pt: "6",
            borderTop: "1px solid",
            borderColor: "steel.border",
          })}
        >
          <p
            className={css({
              fontSize: "meta",
              color: "text.faint",
              opacity: "0.6",
              fontFamily: "display",
              letterSpacing: "0.02em",
            })}
          >
            {t.pipeline} — {t.pipelineDesc}
          </p>
        </div>
      </main>
    </div>
  );
}
