"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import Link from "next/link";

const KATOWICE_HOTELS = [
  { id: "kima-apartamenty-atal-szybowcowa-33", name: "KIMA Apartamenty Atal Szybowcowa 33" },
  { id: "kima-apartament-bazantow", name: "Kima Apartament Bażantów" },
  { id: "katowice-gallery-center", name: "Katowice Gallery Center" },
];

const ALL_HOTELS = [
  ...KATOWICE_HOTELS,
  { id: "casa-cook-rethymno", name: "Casa Cook Rethymno" },
  { id: "domes-zeen-chania", name: "Domes Zeen Chania" },
  { id: "numo-ierapetra", name: "Numo Ierapetra Beach Resort" },
  { id: "w-hotel-crete", name: "W Crete" },
  { id: "santorini-canaves-oia-epitome", name: "Canaves Oia Epitome" },
  { id: "costa-navarino-mandarin", name: "Mandarin Oriental Costa Navarino" },
  { id: "six-senses-crete", name: "Six Senses Crete" },
  { id: "one-and-only-kea", name: "One&Only Kea" },
  { id: "aman-elounda", name: "Aman Elounda" },
];

const T = {
  ro: {
    back: "Înapoi",
    title: "Recenzii Hoteluri",
    subtitle: "Toate recenziile analizate cu ML pentru hotelurile din baza de date",
    searchPlaceholder: "Caută recenzii...",
    filterByHotel: "Filtrează după hotel",
    allHotels: "Toate hotelurile",
    showAll: "Arată toate",
    reviews: "recenzii",
    sentiment: "Sentiment",
    source: "Sursă",
    aspects: "Aspecte",
    representative: "Reprezentativ",
    noReviews: "Nicio recenzie găsită",
  },
  en: {
    back: "Back",
    title: "Hotel Reviews",
    subtitle: "All ML-analyzed reviews from hotels in the database",
    searchPlaceholder: "Search reviews...",
    filterByHotel: "Filter by hotel",
    allHotels: "All hotels",
    showAll: "Show all",
    reviews: "reviews",
    sentiment: "Sentiment",
    source: "Source",
    aspects: "Aspects",
    representative: "Representative",
    noReviews: "No reviews found",
  },
};

// Sample review data (in production, this would come from an API)
const SAMPLE_REVIEWS = [
  {
    hotel_id: "kima-apartamenty-atal-szybowcowa-33",
    text: "This hotel offers Balcony.",
    source: "ml-analysis",
    sentiment: 0.66,
    aspects: [],
    is_representative: true,
  },
  {
    hotel_id: "kima-apartamenty-atal-szybowcowa-33",
    text: "Exceptional cleanliness throughout the apartment.",
    source: "verified-guest",
    sentiment: 0.78,
    aspects: ["Cleanliness"],
    is_representative: true,
  },
  {
    hotel_id: "kima-apartament-bazantow",
    text: "Perfect for families with children, very spacious and well-equipped.",
    source: "verified-guest",
    sentiment: 0.74,
    aspects: ["Family"],
    is_representative: true,
  },
  {
    hotel_id: "katowice-gallery-center",
    text: "Perfect location in the city center, walking distance to shops and restaurants.",
    source: "verified-guest",
    sentiment: 0.72,
    aspects: ["Location"],
    is_representative: true,
  },
];

export function ReviewsPage() {
  const [lang] = useState<"ro" | "en">("ro");
  const [selectedHotel, setSelectedHotel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const t = T[lang];

  // Filter reviews
  const filteredReviews = SAMPLE_REVIEWS.filter((review) => {
    const matchesHotel = selectedHotel === "all" || review.hotel_id === selectedHotel;
    const matchesSearch = searchQuery === "" || 
      review.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.aspects.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesHotel && matchesSearch;
  });

  const displayReviews = showAll ? filteredReviews : filteredReviews.slice(0, 20);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.6) return "#8BC48A";
    if (sentiment >= 0.4) return "#C9922A";
    return "#C45A5A";
  };

  const getSentimentEmoji = (sentiment: number) => {
    if (sentiment >= 0.6) return "😊";
    if (sentiment >= 0.4) return "😐";
    return "😞";
  };

  const getHotelName = (hotelId: string) => {
    return ALL_HOTELS.find((h) => h.id === hotelId)?.name || hotelId;
  };

  return (
    <main
      className={css({
        position: "relative",
        zIndex: 1,
        mx: "auto",
        px: { base: "4", sm: "6", md: "10", lg: "16", xl: "20" },
        pt: { base: "10", sm: "16", md: "24" },
        pb: { base: "12", md: "20" },
        maxW: "6xl",
      })}
    >
      {/* Header */}
      <header
        className={css({
          mb: "10",
          animation: "fadeUp 0.6s ease-out",
        })}
      >
        <Link
          href="/katowice/bookings"
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          {t.back}
        </Link>

        <h1
          className={css({
            fontSize: "h1",
            fontWeight: "800",
            fontFamily: "display",
            color: "text.primary",
            mb: "2",
          })}
        >
          {t.title}
        </h1>

        <p
          className={css({
            fontSize: "body",
            color: "text.muted",
          })}
        >
          {t.subtitle}
        </p>
      </header>

      {/* Filters */}
      <section
        className={css({
          mb: "8",
          p: "6",
          bg: "steel.surface",
          rounded: "card",
          border: "1px solid",
          borderColor: "steel.border",
          animation: "fadeUp 0.6s ease-out 0.1s both",
        })}
      >
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
            gap: "4",
          })}
        >
          {/* Hotel filter */}
          <div>
            <label
              className={css({
                display: "block",
                fontSize: "label",
                fontWeight: "600",
                fontFamily: "display",
                color: "text.muted",
                mb: "2",
                textTransform: "uppercase",
                letterSpacing: "label",
              })}
            >
              {t.filterByHotel}
            </label>
            <select
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
              className={css({
                w: "100%",
                px: "4",
                py: "2.5",
                rounded: "md",
                fontSize: "body",
                fontFamily: "display",
                bg: "steel.raised",
                border: "1px solid",
                borderColor: "steel.border",
                color: "text.primary",
                cursor: "pointer",
                _hover: { borderColor: "amber.warm" },
              })}
            >
              <option value="all">{t.allHotels}</option>
              {ALL_HOTELS.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label
              className={css({
                display: "block",
                fontSize: "label",
                fontWeight: "600",
                fontFamily: "display",
                color: "text.muted",
                mb: "2",
                textTransform: "uppercase",
                letterSpacing: "label",
              })}
            >
              {t.searchPlaceholder}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={css({
                w: "100%",
                px: "4",
                py: "2.5",
                rounded: "md",
                fontSize: "body",
                fontFamily: "display",
                bg: "steel.raised",
                border: "1px solid",
                borderColor: "steel.border",
                color: "text.primary",
                _hover: { borderColor: "amber.warm" },
              })}
            />
          </div>
        </div>
      </section>

      {/* Reviews list */}
      <section>
        {displayReviews.length === 0 ? (
          <div
            className={css({
              textAlign: "center",
              py: "16",
              color: "text.muted",
            })}
          >
            {t.noReviews}
          </div>
        ) : (
          <>
            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "4",
              })}
            >
              {displayReviews.map((review, idx) => (
                <article
                  key={`${review.hotel_id}-${idx}`}
                  className={css({
                    bg: "steel.surface",
                    rounded: "card",
                    border: "1px solid",
                    borderColor: "steel.border",
                    p: "5",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                    _hover: {
                      borderColor: "amber.warm",
                      transform: "translateY(-2px)",
                    },
                  })}
                >
                  {/* Header row */}
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: "3",
                      flexWrap: "wrap",
                      gap: "2",
                    })}
                  >
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "2",
                      })}
                    >
                      {review.is_representative && (
                        <span
                          className={css({
                            fontSize: "lg",
                          })}
                        >
                          ⭐
                        </span>
                      )}
                      <span
                        className={css({
                          fontSize: "xl",
                        })}
                      >
                        {getSentimentEmoji(review.sentiment)}
                      </span>
                      <span
                        className={css({
                          fontSize: "meta",
                          fontFamily: "display",
                          fontWeight: "600",
                          color: "text.muted",
                        })}
                      >
                        {getHotelName(review.hotel_id)}
                      </span>
                    </div>

                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "3",
                      })}
                    >
                      <span
                        className={css({
                          px: "2",
                          py: "0.5",
                          rounded: "pill",
                          fontSize: "2xs",
                          fontFamily: "display",
                          fontWeight: "600",
                          bg: `${getSentimentColor(review.sentiment)}20`,
                          color: getSentimentColor(review.sentiment),
                          border: `1px solid ${getSentimentColor(review.sentiment)}40`,
                        })}
                      >
                        {t.sentiment}: {(review.sentiment * 100).toFixed(0)}%
                      </span>
                      <span
                        className={css({
                          fontSize: "2xs",
                          fontFamily: "display",
                          color: "text.faint",
                          textTransform: "capitalize",
                        })}
                      >
                        {t.source}: {review.source}
                      </span>
                    </div>
                  </div>

                  {/* Review text */}
                  <p
                    className={css({
                      fontSize: "body",
                      color: "text.secondary",
                      lineHeight: "1.6",
                      mb: "3",
                    })}
                  >
                    {review.text}
                  </p>

                  {/* Aspects */}
                  {review.aspects.length > 0 && (
                    <div
                      className={css({
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "1.5",
                      })}
                    >
                      {review.aspects.map((aspect) => (
                        <span
                          key={aspect}
                          className={css({
                            px: "2",
                            py: "0.5",
                            rounded: "sm",
                            fontSize: "2xs",
                            fontFamily: "display",
                            fontWeight: "600",
                            bg: "rgba(201, 146, 42, 0.1)",
                            color: "amber.warm",
                            border: "1px solid rgba(201, 146, 42, 0.2)",
                          })}
                        >
                          {aspect}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            {/* Show more */}
            {filteredReviews.length > 20 && !showAll && (
              <div
                className={css({
                  textAlign: "center",
                  mt: "6",
                })}
              >
                <button
                  onClick={() => setShowAll(true)}
                  className={css({
                    px: "6",
                    py: "3",
                    rounded: "pill",
                    fontSize: "meta",
                    fontWeight: "700",
                    fontFamily: "display",
                    bg: "amber.warm",
                    color: "steel.dark",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    _hover: {
                      bg: "amber.bright",
                      transform: "scale(1.03)",
                    },
                  })}
                >
                  {t.showAll} ({filteredReviews.length} {t.reviews})
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
