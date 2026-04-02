"use client";

import { css } from "styled-system/css";
import type { KatowiceHotel } from "@/lib/types";

const T = {
  ro: {
    eyebrow: "Hoteluri in Katowice",
    subtitle: "Comparatie completa · 3 apartamente verificate pentru familii",
    cta: "Rezerva pe Booking.com",
    topPick: "RECOMANDAREA NOASTRA",
    perNight: "noapte",
    reviews: "recenzii",
    rating: "evaluare",
    amenities: "Facilitati",
    reviews_section: "Ce spun oaspetii",
    comparison: "Comparatie",
    bestFor: "Cel mai bun pentru",
  },
  en: {
    eyebrow: "Katowice Hotels",
    subtitle: "Complete comparison · 3 verified apartments for families",
    cta: "Book on Booking.com",
    topPick: "TOP PICK",
    perNight: "night",
    reviews: "reviews",
    rating: "rating",
    amenities: "Amenities",
    reviews_section: "What guests say",
    comparison: "Comparison",
    bestFor: "Best for",
  },
};

interface KatowiceHotelsProps {
  hotels: KatowiceHotel[];
  lang: "ro" | "en";
}

export function KatowiceHotels({ hotels, lang }: KatowiceHotelsProps) {
  const t = T[lang];

  // Sort by rating (descending), then by review count (descending)
  const sortedHotels = [...hotels].sort(
    (a, b) => b.rating - a.rating || b.review_count - a.review_count
  );

  // Find the recommended hotel
  const recommendedHotel = hotels.find((h) => h.is_recommended) || sortedHotels[0];

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

      {/* ── Top Pick Highlight ── */}
      <div
        className={css({
          mb: "8",
          p: { base: "5", md: "6" },
          bg: "rgba(201, 146, 42, 0.08)",
          border: "2px solid",
          borderColor: "amber.warm",
          rounded: "card",
          position: "relative",
          overflow: "hidden",
        })}
      >
        {/* Decorative badge */}
        <div
          className={css({
            position: "absolute",
            top: "0",
            right: "0",
            px: "3",
            py: "1",
            bg: "amber.warm",
            color: "#1a1814",
            fontSize: "xs",
            fontWeight: "800",
            fontFamily: "display",
            rounded: "sm",
          })}
          style={{
            clipPath: "polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)",
          }}
        >
          ★ {t.topPick}
        </div>

        <div
          className={css({
            display: { base: "block", md: "flex" },
            gap: "6",
            alignItems: "center",
          })}
        >
          {/* Hotel name and details */}
          <div className={css({ flex: "1" })}>
            <h3
              className={css({
                fontSize: { base: "lg", md: "xl" },
                fontWeight: "800",
                fontFamily: "display",
                color: "text.primary",
                mb: "2",
              })}
            >
              {recommendedHotel.name}
            </h3>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "4",
                flexWrap: "wrap",
                mb: "3",
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
                  bg: "rgba(139, 196, 138, 0.15)",
                  color: "#8BC48A",
                  border: "1px solid rgba(139, 196, 138, 0.3)",
                })}
              >
                {recommendedHotel.rating}/10 {t.rating}
              </span>
              <span
                className={css({
                  fontSize: "meta",
                  color: "text.muted",
                })}
              >
                {recommendedHotel.review_count.toLocaleString()} {t.reviews}
              </span>
              <span
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1",
                  fontSize: "h3",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "amber.warm",
                })}
              >
                €{recommendedHotel.price_eur}
                <span
                  className={css({
                    fontSize: "meta",
                    fontWeight: "500",
                    color: "text.muted",
                  })}
                >
                  /{t.perNight}
                </span>
              </span>
            </div>
            <p
              className={css({
                fontSize: "body",
                color: "text.secondary",
                lineHeight: "1.6",
              })}
            >
              {recommendedHotel.recommendation_reason}
            </p>
          </div>

          {/* CTA Button */}
          <a
            href={recommendedHotel.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2",
              px: "6",
              py: "3",
              rounded: "pill",
              fontSize: "body",
              fontWeight: "700",
              fontFamily: "display",
              bg: "amber.warm",
              color: "#1a1814",
              textDecoration: "none",
              border: "2px solid",
              borderColor: "amber.warm",
              transition: "all 0.2s ease",
              cursor: "pointer",
              whiteSpace: "nowrap",
              mt: { base: "4", md: "0" },
              _hover: {
                bg: "rgba(201, 146, 42, 0.85)",
                borderColor: "rgba(201, 146, 42, 0.85)",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(201, 146, 42, 0.3)",
              },
            })}
          >
            {t.cta}
            <svg
              width="16"
              height="16"
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

      {/* ── Comparison Table ── */}
      <div
        className={css({
          mb: "8",
          overflowX: "auto",
        })}
      >
        <table
          className={css({
            w: "100%",
            borderCollapse: "collapse",
            fontSize: "meta",
          })}
        >
          <thead>
            <tr
              className={css({
                borderBottom: "2px solid",
                borderColor: "steel.border",
              })}
            >
              <th
                className={css({
                  py: "3",
                  pr: "4",
                  textAlign: "left",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "text.primary",
                })}
              >
                {t.comparison}
              </th>
              {sortedHotels.map((hotel) => (
                <th
                  key={hotel.hotel_id}
                  className={css({
                    py: "3",
                    px: "4",
                    textAlign: "center",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    minW: "140px",
                    ...(hotel.is_recommended
                      ? { color: "amber.warm" }
                      : {}),
                  })}
                >
                  {hotel.name}
                  {hotel.is_recommended && (
                    <span
                      className={css({
                        display: "block",
                        mt: "1",
                        fontSize: "2xs",
                        fontWeight: "600",
                        color: "amber.warm",
                      })}
                    >
                      ★ {t.topPick}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Rating */}
            <tr
              className={css({
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              <td
                className={css({
                  py: "3",
                  pr: "4",
                  fontWeight: "600",
                  color: "text.secondary",
                })}
              >
                {t.rating}
              </td>
              {sortedHotels.map((hotel) => (
                <td
                  key={hotel.hotel_id}
                  className={css({
                    py: "3",
                    px: "4",
                    textAlign: "center",
                  })}
                >
                  <span
                    className={css({
                      fontWeight: "700",
                      color:
                        hotel.rating >= 9.0
                          ? "#8BC48A"
                          : hotel.rating >= 8.0
                            ? "#C9922A"
                            : "#C45A5A",
                    })}
                  >
                    {hotel.rating}/10
                  </span>
                </td>
              ))}
            </tr>

            {/* Reviews */}
            <tr
              className={css({
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              <td
                className={css({
                  py: "3",
                  pr: "4",
                  fontWeight: "600",
                  color: "text.secondary",
                })}
              >
                {t.reviews}
              </td>
              {sortedHotels.map((hotel) => (
                <td
                  key={hotel.hotel_id}
                  className={css({
                    py: "3",
                    px: "4",
                    textAlign: "center",
                    color: "text.muted",
                  })}
                >
                  {hotel.review_count.toLocaleString()}
                </td>
              ))}
            </tr>

            {/* Price */}
            <tr
              className={css({
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              <td
                className={css({
                  py: "3",
                  pr: "4",
                  fontWeight: "600",
                  color: "text.secondary",
                })}
              >
                Price / {t.perNight}
              </td>
              {sortedHotels.map((hotel) => (
                <td
                  key={hotel.hotel_id}
                  className={css({
                    py: "3",
                    px: "4",
                    textAlign: "center",
                    fontWeight: "700",
                    color: "amber.warm",
                  })}
                >
                  €{hotel.price_eur}
                </td>
              ))}
            </tr>

            {/* Best For */}
            <tr
              className={css({
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              <td
                className={css({
                  py: "3",
                  pr: "4",
                  fontWeight: "600",
                  color: "text.secondary",
                })}
              >
                {t.bestFor}
              </td>
              {sortedHotels.map((hotel) => (
                <td
                  key={hotel.hotel_id}
                  className={css({
                    py: "3",
                    px: "4",
                    textAlign: "center",
                    fontSize: "xs",
                    color: "text.secondary",
                  })}
                >
                  {hotel.recommendation_reason}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Hotel Cards Grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
          gap: { base: "5", md: "6" },
        })}
      >
        {sortedHotels.map((hotel) => (
          <div
            key={hotel.hotel_id}
            className={css({
              bg: "steel.surface",
              rounded: "card",
              border: hotel.is_recommended
                ? "2px solid"
                : "1px solid",
              borderColor: hotel.is_recommended ? "amber.warm" : "steel.border",
              overflow: "hidden",
              boxShadow: hotel.is_recommended ? "0 0 20px rgba(201, 146, 42, 0.2)" : "card",
              display: "flex",
              flexDirection: "column",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
              _hover: {
                borderColor: hotel.is_recommended ? "amber.warm" : "steel.borderHover",
                boxShadow: hotel.is_recommended
                  ? "0 0 24px rgba(201, 146, 42, 0.3)"
                  : "card.hover",
                transform: "translateY(-3px)",
              },
              position: "relative",
            })}
          >
            {/* Recommended badge */}
            {hotel.is_recommended && (
              <div
                className={css({
                  position: "absolute",
                  top: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  px: "3",
                  py: "1",
                  bg: "amber.warm",
                  color: "#1a1814",
                  fontSize: "xs",
                  fontWeight: "800",
                  fontFamily: "display",
                  rounded: "sm",
                  zIndex: "10",
                })}
              >
                ★ {t.topPick}
              </div>
            )}

            {/* Body */}
            <div
              className={css({
                p: { base: "5", md: "6" },
                display: "flex",
                flexDirection: "column",
                flex: "1",
                gap: "3",
                mt: hotel.is_recommended ? "6" : "0",
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

              {/* Rating and reviews */}
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
                    bg:
                      hotel.rating >= 9.0
                        ? "rgba(139, 196, 138, 0.15)"
                        : hotel.rating >= 8.0
                          ? "rgba(201, 146, 42, 0.1)"
                          : "rgba(196, 90, 90, 0.1)",
                    color:
                      hotel.rating >= 9.0
                        ? "#8BC48A"
                        : hotel.rating >= 8.0
                          ? "#C9922A"
                          : "#C45A5A",
                    border: "1px solid",
                    borderColor:
                      hotel.rating >= 9.0
                        ? "rgba(139, 196, 138, 0.3)"
                        : hotel.rating >= 8.0
                          ? "rgba(201, 146, 42, 0.2)"
                          : "rgba(196, 90, 90, 0.2)",
                  })}
                >
                  {hotel.rating}/10
                </span>
                <span
                  className={css({
                    fontSize: "meta",
                    color: "text.muted",
                  })}
                >
                  {hotel.review_count.toLocaleString()} {t.reviews}
                </span>
              </div>

              {/* Price */}
              <div
                className={css({
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
                    color: "amber.warm",
                    lineHeight: "1",
                  })}
                >
                  €{hotel.price_eur}
                </span>
                <span
                  className={css({
                    fontSize: "meta",
                    color: "text.muted",
                  })}
                >
                  /{t.perNight}
                </span>
              </div>

              {/* Amenities */}
              <div
                className={css({
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1.5",
                  mt: "1",
                })}
              >
                {hotel.amenities.slice(0, 5).map((amenity) => (
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

              {/* Review snippet */}
              {hotel.review_texts && hotel.review_texts.length > 0 && (
                <div
                  className={css({
                    mt: "2",
                    p: "3",
                    bg: "steel.raised",
                    rounded: "sm",
                    border: "1px solid",
                    borderColor: "steel.border",
                  })}
                >
                  <p
                    className={css({
                      fontSize: "xs",
                      color: "text.secondary",
                      lineHeight: "1.5",
                      fontStyle: "italic",
                    })}
                  >
                    "{hotel.review_texts[0]}"
                  </p>
                </div>
              )}

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
        ))}
      </div>

      {/* ── All Reviews Section ── */}
      <div
        className={css({
          mt: "12",
          pt: "8",
          borderTop: "1px solid",
          borderColor: "steel.border",
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
            {t.reviews_section}
          </span>
          <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
        </div>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
            gap: { base: "3", md: "4" },
          })}
        >
          {sortedHotels.map((hotel) =>
            hotel.review_texts && hotel.review_texts.map((review, idx) => (
              <div
                key={`${hotel.hotel_id}-review-${idx}`}
                className={css({
                  bg: "steel.surface",
                  rounded: "card",
                  border: "1px solid",
                  borderColor: "steel.border",
                  p: "3",
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
                  <div
                    className={css({
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5",
                      px: "1.5",
                      py: "0.5",
                      rounded: "pill",
                      fontSize: "2xs",
                      fontWeight: "700",
                      bg: "rgba(139, 196, 138, 0.15)",
                      color: "#8BC48A",
                      border: "1px solid rgba(139, 196, 138, 0.3)",
                    })}
                  >
                    {hotel.rating}/10
                  </div>
                  <span
                    className={css({
                      fontSize: "2xs",
                      color: "text.muted",
                      fontWeight: "600",
                      fontFamily: "display",
                      maxW: "120px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {hotel.name}
                  </span>
                </div>
                <p
                  className={css({
                    fontSize: "2xs",
                    color: "text.secondary",
                    lineHeight: "1.5",
                    fontStyle: "italic",
                  })}
                >
                  "{review}"
                </p>
              </div>
            ))
          )}
        </div>
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
        Affiliate links — booking earns us a commission at no extra cost to you.
      </p>
    </section>
  );
}
