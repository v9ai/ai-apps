"use client";

import { css } from "styled-system/css";
import type { Place } from "@/lib/types";

interface FamilyBudgetProps {
  places: Place[];
  adults: number;
  kids: number;
  lang: "ro" | "en";
}

// Abbreviate a place name to ~10 characters for the chart axis labels
function abbrev(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 10);
  // Use first letter of each word, up to 4 words
  return words
    .slice(0, 4)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const T = {
  ro: {
    title: "Buget de Familie",
    subtitle: (adults: number, kids: number, count: number) =>
      `Total estimat pentru ${adults} adult${adults !== 1 ? "i" : ""} + ${kids} cop${kids !== 1 ? "ii" : "il"} · ${count} locuri`,
    colPlace: "Loc",
    colAdults: "Adulți",
    colKids: "Copii",
    colTotal: "Total",
    colKid: "Copii OK",
    rowTotal: "TOTAL",
    free: "Gratuit",
    adultsOnly: "(doar adulți)",
    unsuitable: "\u25C9 Nerecomandat copiilor",
    mlNote:
      "\u25C8 Scoruri calculate pe baza a 5 ancore semantice de prietenie pentru copii",
    chartTitle: "Scoruri prietenie copii",
  },
  en: {
    title: "Family Trip Budget",
    subtitle: (adults: number, kids: number, count: number) =>
      `Estimated total for ${adults} adult${adults !== 1 ? "s" : ""} + ${kids} child${kids !== 1 ? "ren" : ""} \u00b7 ${count} places`,
    colPlace: "Place",
    colAdults: "Adults",
    colKids: "Child",
    colTotal: "Total",
    colKid: "Kids OK",
    rowTotal: "TOTAL",
    free: "Free",
    adultsOnly: "(adults only)",
    unsuitable: "\u25C9 Not suitable for children",
    mlNote:
      "\u25C8 Scores computed across 5 semantic kid-friendliness anchors",
    chartTitle: "Kid-friendliness scores",
  },
};

export function FamilyBudget({ places, adults, kids, lang }: FamilyBudgetProps) {
  const t = T[lang];

  // Places that have family_cost data, sorted by total_eur descending (free last)
  const rows = places
    .filter((p) => p.family_cost != null)
    .sort((a, b) => {
      const ta = a.family_cost!.total_eur;
      const tb = b.family_cost!.total_eur;
      return tb - ta;
    });

  // Grand totals — sum ALL family_cost rows regardless of kid_friendly
  const grandAdults = rows.reduce((s, p) => s + p.family_cost!.adults, 0);
  const grandKids = rows.reduce((s, p) => s + p.family_cost!.kids, 0);
  const grandTotal = rows.reduce((s, p) => s + p.family_cost!.total_eur, 0);

  // All places that have a family_score for the chart
  const chartPlaces = places.filter((p) => p.family_score != null);
  const maxScore = Math.max(...chartPlaces.map((p) => p.family_score!), 0.01);

  return (
    <section
      className={css({
        bg: "steel.surface",
        rounded: "card",
        border: "1px solid",
        borderColor: "steel.border",
        boxShadow: "card",
        overflow: "hidden",
      })}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        className={css({
          px: { base: "5", md: "8" },
          pt: { base: "6", md: "8" },
          pb: "5",
          borderBottom: "1px solid",
          borderColor: "steel.border",
        })}
      >
        {/* Amber accent line + title */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "3",
            mb: "3",
          })}
        >
          <span
            className={css({
              display: "block",
              w: "24px",
              h: "2px",
              bg: "amber.warm",
              flexShrink: "0",
              borderRadius: "full",
            })}
          />
          <h2
            className={css({
              fontSize: { base: "h3", md: "h2" },
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              lineHeight: "1.2",
              letterSpacing: "-0.02em",
            })}
          >
            {t.title}
          </h2>
        </div>

        <p
          className={css({
            fontSize: "meta",
            fontFamily: "display",
            color: "text.muted",
            letterSpacing: "0.03em",
            pl: "calc(24px + 0.75rem)", // indent past accent line + gap
          })}
        >
          {t.subtitle(adults, kids, rows.length)}
        </p>
      </div>

      {/* ── Cost table — desktop ──────────────────────────────────── */}
      <div
        className={css({
          display: { base: "none", md: "block" },
          overflowX: "auto",
        })}
      >
        <table
          className={css({
            w: "full",
            borderCollapse: "collapse",
          })}
        >
          <thead>
            <tr
              className={css({
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              {[
                { label: t.colPlace, align: "left" as const },
                { label: t.colAdults, align: "right" as const },
                { label: t.colKids, align: "right" as const },
                { label: t.colTotal, align: "right" as const },
                { label: t.colKid, align: "center" as const },
              ].map(({ label, align }) => (
                <th
                  key={label}
                  className={css({
                    px: { base: "4", md: "6" },
                    py: "3",
                    fontSize: "xs",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.faint",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                    textAlign: align,
                  })}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((place) => {
              const fc = place.family_cost!;
              const isFree = fc.total_eur === 0 && place.kid_friendly === true;
              const isAdultsOnly = place.kid_friendly === false && fc.adults > 0;
              const isSotterranea = place.name === "Napoli Sotterranea";

              return (
                <tr
                  key={place.name}
                  className={css({
                    borderBottom: "1px solid",
                    borderColor: "steel.border",
                    transition: "background 0.15s ease",
                    _hover: {
                      bg: "steel.raised",
                    },
                  })}
                >
                  {/* Place name */}
                  <td
                    className={css({
                      px: { base: "4", md: "6" },
                      py: "4",
                      textAlign: "left",
                      verticalAlign: "middle",
                    })}
                  >
                    <span
                      className={css({
                        fontSize: "body",
                        fontFamily: "display",
                        fontWeight: "500",
                        color: "text.primary",
                        display: "block",
                        lineHeight: "1.3",
                      })}
                    >
                      {place.name}
                    </span>

                    {/* Napoli Sotterranea warning badge */}
                    {isSotterranea && (
                      <span
                        className={css({
                          display: "inline-flex",
                          alignItems: "center",
                          mt: "1.5",
                          px: "2",
                          py: "0.5",
                          rounded: "pill",
                          fontSize: "xs",
                          fontWeight: "600",
                          fontFamily: "display",
                          letterSpacing: "0.04em",
                          color: "#C9922A",
                          bg: "rgba(201,146,42,0.12)",
                          border: "1px solid rgba(201,146,42,0.25)",
                        })}
                      >
                        {t.unsuitable}
                      </span>
                    )}

                    {/* Adults-only note */}
                    {isAdultsOnly && !isSotterranea && (
                      <span
                        className={css({
                          display: "block",
                          mt: "0.5",
                          fontSize: "xs",
                          color: "text.muted",
                          fontStyle: "italic",
                        })}
                      >
                        {t.adultsOnly}
                      </span>
                    )}
                  </td>

                  {/* Adults cost */}
                  <td
                    className={css({
                      px: { base: "4", md: "6" },
                      py: "4",
                      textAlign: "right",
                      verticalAlign: "middle",
                      fontSize: "body",
                      fontFamily: "display",
                      fontVariantNumeric: "tabular-nums",
                      color: fc.adults === 0 ? "text.faint" : "text.secondary",
                    })}
                  >
                    {fc.adults === 0 ? "\u20ac0" : `\u20ac${fc.adults}`}
                  </td>

                  {/* Kids cost */}
                  <td
                    className={css({
                      px: { base: "4", md: "6" },
                      py: "4",
                      textAlign: "right",
                      verticalAlign: "middle",
                      fontSize: "body",
                      fontFamily: "display",
                      fontVariantNumeric: "tabular-nums",
                      color: fc.kids === 0 ? "text.faint" : "text.secondary",
                    })}
                  >
                    {fc.kids === 0 ? "\u20ac0" : `\u20ac${fc.kids}`}
                  </td>

                  {/* Total */}
                  <td
                    className={css({
                      px: { base: "4", md: "6" },
                      py: "4",
                      textAlign: "right",
                      verticalAlign: "middle",
                    })}
                  >
                    {isFree ? (
                      <span
                        className={css({
                          fontSize: "body",
                          fontWeight: "700",
                          fontFamily: "display",
                          color: "cat.nature",
                        })}
                      >
                        {t.free}
                      </span>
                    ) : (
                      <span
                        className={css({
                          fontSize: "body",
                          fontWeight: "700",
                          fontFamily: "display",
                          fontVariantNumeric: "tabular-nums",
                          color: "text.primary",
                        })}
                      >
                        {fc.total_eur === 0 ? "\u20ac0" : `\u20ac${fc.total_eur}`}
                      </span>
                    )}
                  </td>

                  {/* Kid status glyph */}
                  <td
                    className={css({
                      px: { base: "4", md: "6" },
                      py: "4",
                      textAlign: "center",
                      verticalAlign: "middle",
                    })}
                  >
                    {place.kid_friendly === true ? (
                      <span
                        className={css({
                          fontSize: "sm",
                          color: "amber.warm",
                          lineHeight: "1",
                        })}
                        aria-label="Kid-friendly"
                      >
                        &#9670;
                      </span>
                    ) : (
                      <span
                        className={css({
                          fontSize: "sm",
                          color: "text.faint",
                          lineHeight: "1",
                        })}
                        aria-label="Not suitable for children"
                      >
                        &ndash;
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* ── Grand total row ── */}
          <tfoot>
            <tr
              className={css({
                borderTop: "2px solid",
                borderColor: "steel.borderHover",
              })}
            >
              <td
                className={css({
                  px: { base: "4", md: "6" },
                  py: "5",
                  textAlign: "left",
                  verticalAlign: "middle",
                  fontSize: "label",
                  fontWeight: "800",
                  fontFamily: "display",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "amber.warm",
                })}
              >
                {t.rowTotal}
              </td>
              <td
                className={css({
                  px: { base: "4", md: "6" },
                  py: "5",
                  textAlign: "right",
                  verticalAlign: "middle",
                  fontSize: "body",
                  fontWeight: "700",
                  fontFamily: "display",
                  fontVariantNumeric: "tabular-nums",
                  color: "text.secondary",
                })}
              >
                &euro;{grandAdults}
              </td>
              <td
                className={css({
                  px: { base: "4", md: "6" },
                  py: "5",
                  textAlign: "right",
                  verticalAlign: "middle",
                  fontSize: "body",
                  fontWeight: "700",
                  fontFamily: "display",
                  fontVariantNumeric: "tabular-nums",
                  color: "text.secondary",
                })}
              >
                &euro;{grandKids}
              </td>
              <td
                className={css({
                  px: { base: "4", md: "6" },
                  py: "5",
                  textAlign: "right",
                  verticalAlign: "middle",
                })}
              >
                <span
                  className={css({
                    fontSize: "h3",
                    fontWeight: "800",
                    fontFamily: "display",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                    color: "amber.warm",
                  })}
                >
                  &euro;{grandTotal}
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Cost cards — mobile ───────────────────────────────────── */}
      <div
        className={css({
          display: { base: "flex", md: "none" },
          flexDirection: "column",
          gap: "0",
        })}
      >
        {rows.map((place) => {
          const fc = place.family_cost!;
          const isFree = fc.total_eur === 0 && place.kid_friendly === true;
          const isAdultsOnly = place.kid_friendly === false && fc.adults > 0;
          const isSotterranea = place.name === "Napoli Sotterranea";

          return (
            <div
              key={place.name}
              className={css({
                px: "5",
                py: "4",
                borderBottom: "1px solid",
                borderColor: "steel.border",
                display: "flex",
                flexDirection: "column",
                gap: "2",
              })}
            >
              {/* Name row */}
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "3",
                })}
              >
                <div className={css({ flex: "1", minW: "0" })}>
                  <span
                    className={css({
                      fontSize: "body",
                      fontWeight: "600",
                      fontFamily: "display",
                      color: "text.primary",
                      display: "block",
                      lineHeight: "1.3",
                    })}
                  >
                    {place.name}
                  </span>

                  {isSotterranea && (
                    <span
                      className={css({
                        display: "inline-flex",
                        alignItems: "center",
                        mt: "1.5",
                        px: "2",
                        py: "0.5",
                        rounded: "pill",
                        fontSize: "xs",
                        fontWeight: "600",
                        fontFamily: "display",
                        letterSpacing: "0.04em",
                        color: "#C9922A",
                        bg: "rgba(201,146,42,0.12)",
                        border: "1px solid rgba(201,146,42,0.25)",
                      })}
                    >
                      {t.unsuitable}
                    </span>
                  )}

                  {isAdultsOnly && !isSotterranea && (
                    <span
                      className={css({
                        display: "block",
                        mt: "0.5",
                        fontSize: "xs",
                        color: "text.muted",
                        fontStyle: "italic",
                      })}
                    >
                      {t.adultsOnly}
                    </span>
                  )}
                </div>

                {/* Total + kid glyph */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    flexShrink: "0",
                  })}
                >
                  {isFree ? (
                    <span
                      className={css({
                        fontSize: "body",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "cat.nature",
                      })}
                    >
                      {t.free}
                    </span>
                  ) : (
                    <span
                      className={css({
                        fontSize: "body",
                        fontWeight: "700",
                        fontFamily: "display",
                        fontVariantNumeric: "tabular-nums",
                        color: "text.primary",
                      })}
                    >
                      {fc.total_eur === 0 ? "\u20ac0" : `\u20ac${fc.total_eur}`}
                    </span>
                  )}

                  {place.kid_friendly === true ? (
                    <span
                      className={css({ fontSize: "sm", color: "amber.warm", lineHeight: "1" })}
                      aria-label="Kid-friendly"
                    >
                      &#9670;
                    </span>
                  ) : (
                    <span
                      className={css({ fontSize: "sm", color: "text.faint", lineHeight: "1" })}
                      aria-label="Not suitable for children"
                    >
                      &ndash;
                    </span>
                  )}
                </div>
              </div>

              {/* Adults / kids cost pills */}
              <div
                className={css({
                  display: "flex",
                  gap: "3",
                })}
              >
                <span
                  className={css({
                    fontSize: "xs",
                    fontFamily: "display",
                    fontVariantNumeric: "tabular-nums",
                    color: "text.muted",
                  })}
                >
                  {t.colAdults}: {fc.adults === 0 ? "\u20ac0" : `\u20ac${fc.adults}`}
                </span>
                <span
                  className={css({
                    fontSize: "xs",
                    fontFamily: "display",
                    fontVariantNumeric: "tabular-nums",
                    color: "text.muted",
                  })}
                >
                  {t.colKids}: {fc.kids === 0 ? "\u20ac0" : `\u20ac${fc.kids}`}
                </span>
              </div>
            </div>
          );
        })}

        {/* Mobile grand total */}
        <div
          className={css({
            px: "5",
            py: "5",
            borderTop: "2px solid",
            borderColor: "steel.borderHover",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          })}
        >
          <span
            className={css({
              fontSize: "label",
              fontWeight: "800",
              fontFamily: "display",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "amber.warm",
            })}
          >
            {t.rowTotal}
          </span>
          <span
            className={css({
              fontSize: "h3",
              fontWeight: "800",
              fontFamily: "display",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
              color: "amber.warm",
            })}
          >
            &euro;{grandTotal}
          </span>
        </div>
      </div>

      {/* ── Score mini-chart ────────────────────────────────────── */}
      {chartPlaces.length > 0 && (
        <div
          className={css({
            px: { base: "5", md: "8" },
            pt: "6",
            pb: "5",
            borderTop: "1px solid",
            borderColor: "steel.border",
          })}
        >
          <p
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.muted",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              mb: "4",
            })}
          >
            {t.chartTitle}
          </p>

          <div
            className={css({
              display: "flex",
              alignItems: "flex-end",
              gap: { base: "2", sm: "3" },
              overflowX: "auto",
              pb: "1",
            })}
          >
            {chartPlaces.map((place) => {
              const score = place.family_score!;
              const heightPct = Math.max(8, Math.round((score / maxScore) * 100));
              const isKidFriendly = place.kid_friendly === true;

              return (
                <div
                  key={place.name}
                  className={css({
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2",
                    flex: "1",
                    minW: "32px",
                    maxW: "56px",
                  })}
                  title={`${place.name}: ${Math.round(score * 100)}%`}
                >
                  {/* Score value */}
                  <span
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      fontVariantNumeric: "tabular-nums",
                      color: isKidFriendly ? "amber.warm" : "text.faint",
                      lineHeight: "1",
                    })}
                  >
                    {Math.round(score * 100)}
                  </span>

                  {/* Bar track */}
                  <div
                    className={css({
                      w: "full",
                      h: "48px",
                      display: "flex",
                      alignItems: "flex-end",
                      rounded: "4px",
                      overflow: "hidden",
                      bg: "rgba(240,220,180,0.04)",
                    })}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        backgroundColor: isKidFriendly ? "#C9922A" : "rgba(240,220,180,0.12)",
                        borderRadius: "3px 3px 0 0",
                        transition: "height 0.4s ease",
                      }}
                    />
                  </div>

                  {/* Abbrev label */}
                  <span
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      color: "text.faint",
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      lineHeight: "1.2",
                      w: "full",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {abbrev(place.name)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Budget note ────────────────────────────────────────── */}
      <div
        className={css({
          mx: { base: "5", md: "8" },
          mb: { base: "5", md: "7" },
          mt: "4",
          px: "4",
          py: "3",
          rounded: "8px",
          bg: "amber.glow",
          borderLeft: "2px solid",
          borderColor: "amber.warm",
        })}
        style={{ border: "1px solid rgba(201,146,42,0.15)", borderLeftWidth: "2px", borderLeftColor: "#C9922A" }}
      >
        <p
          className={css({
            fontSize: "xs",
            color: "amber.bright",
            fontFamily: "display",
            lineHeight: "1.6",
            letterSpacing: "0.02em",
          })}
        >
          {t.mlNote}
        </p>
      </div>
    </section>
  );
}
