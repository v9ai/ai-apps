"use client";

import { css } from "styled-system/css";
import { napoliData } from "@/lib/data";
import { MapOverview } from "@/components/MapOverview";
import { Footer } from "@/components/Footer";
import { HotelPicks } from "@/components/HotelPicks";
import { PlaceCard } from "@/components/PlaceCard";
import { useLang } from "@/components/LanguageSwitcher";
import { BudgetOverview } from "./sections/BudgetOverview";
import { DayItinerary } from "./sections/DayItinerary";
import { FlightGuide } from "./sections/FlightGuide";
import { SleepGuide } from "./sections/SleepGuide";
import { EatGuide } from "./sections/EatGuide";
import { TransportGuide } from "./sections/TransportGuide";
import { PompeiiGuide } from "./sections/PompeiiGuide";
import { TripSummary } from "./sections/TripSummary";
import { FamilyBudget } from "@/components/FamilyBudget";

const T = {
  ro: {
    eyebrow: "Ghid de Calatorie \u2014 Italia",
    tagline: (n: number) =>
      `Napoli, Italia\u00a0\u00a0·\u00a0\u00a02 Adulți · 1 Copil\u00a0\u00a0·\u00a0\u00a0${n} locuri esențiale`,
    overview: "Prezentare general\u0103",
    map: "Exploreaz\u0103 harta",
    places: "Locuri de vizitat",
    hotels: "Unde s\u0103 stai",
    capriTitle: "Cum ajungi la Capri",
    capriSubtitle: "Excursia perfect\u0103 de o zi pe insul\u0103",
    ferries: [
      {
        label: "Molo Beverello \u2192 Marina Grande",
        type: "Hidroglisor",
        duration: "50 min",
        price: "2 adulți + copil: ~€58",
        frequency: "8\u201310 curse/zi",
        tip: "Cel mai rapid. Rezerv\u0103 din timp vara.",
      },
      {
        label: "Molo Beverello \u2192 Marina Grande",
        type: "Ferry tradi\u0163ional",
        duration: "75\u201380 min",
        price: "2 adulți + copil: ~€38",
        frequency: "6\u20138 curse/zi",
        tip: "Mai ieftin, accepta biciclete \u015fi bagaje mari.",
      },
      {
        label: "Mergellina \u2192 Marina Grande",
        type: "Hidroglisor",
        duration: "55 min",
        price: "2 adulți + copil: ~€52",
        frequency: "4\u20136 curse/zi",
        tip: "Pleac\u0103 din cartierul Chiaia; mai pu\u0163in aglomerat.",
      },
    ],
    capriTips: [
      "Pleac\u0103 devreme \u2014 prima curs\u0103 (07:00\u201308:00) evit\u0103 aglomera\u0163ia.",
      "Rezerv\u0103 biletele online la Caremar, SNAV sau Alilauro.",
      "Ia biletul de \u00edntoarcere imediat la sosire \u2014 cursele de sear\u0103 se epuizeaz\u0103.",
      "Vara, limita de pasageri pe insul\u0103 se aplic\u0103 din 2024 \u2014 verific\u0103 restric\u0163iile.",
    ],
    budget: "Bugetul Călătoriei",
    budgetTag: "€1.000 · 5 zile",
    backLink: "\u2190 \u00cenapoiuri la Napoli",
    familyTitle: "Călătorie cu un Copil",
    familySubtitle: "Scor ML pentru prietenie cu copiii · 2 adulți + 1 copil · Napoli 2026",
    familyBudget: "Buget de familie",
    familyBudgetNote: "Total estimat pentru 2 adulți + 1 copil la toate cele 10 locuri",
    kidFriendly: "Prietenos cu copiii",
    mlScore: "Scor ML",
  },
  en: {
    eyebrow: "Travel Guide \u2014 Italy",
    tagline: (n: number) =>
      `Naples, Italy\u00a0\u00a0·\u00a0\u00a02 Adults · 1 Child\u00a0\u00a0·\u00a0\u00a0${n} essential places`,
    overview: "City Overview",
    map: "Explore the Map",
    places: "Places to Visit",
    hotels: "Where to Stay",
    capriTitle: "How to Get to Capri",
    capriSubtitle: "The perfect island day trip from Naples",
    ferries: [
      {
        label: "Molo Beverello \u2192 Marina Grande",
        type: "Hydrofoil",
        duration: "50 min",
        price: "2 adults + child: ~€58",
        frequency: "8\u201310 daily",
        tip: "Fastest option. Book ahead in summer.",
      },
      {
        label: "Molo Beverello \u2192 Marina Grande",
        type: "Traditional ferry",
        duration: "75\u201380 min",
        price: "2 adults + child: ~€38",
        frequency: "6\u20138 daily",
        tip: "Cheaper, accepts bikes and large luggage.",
      },
      {
        label: "Mergellina \u2192 Marina Grande",
        type: "Hydrofoil",
        duration: "55 min",
        price: "2 adults + child: ~€52",
        frequency: "4\u20136 daily",
        tip: "Departs from Chiaia neighbourhood; less crowded.",
      },
    ],
    capriTips: [
      "Leave early \u2014 the first sailing (07:00\u201308:00) beats the day-trip crowds.",
      "Book tickets online via Caremar, SNAV or Alilauro.",
      "Buy your return ticket immediately on arrival \u2014 evening sailings sell out.",
      "Summer passenger limits apply to Capri since 2024 \u2014 check current restrictions.",
    ],
    budget: "Trip Budget",
    budgetTag: "€1,000 · 5 days",
    backLink: "\u2190 Back to Home",
    familyTitle: "Traveling with a Child",
    familySubtitle: "ML-scored kid-friendliness · 2 adults + 1 child · Napoli 2026",
    familyBudget: "Family trip budget",
    familyBudgetNote: "Estimated total for 2 adults + 1 child across all 10 places",
    kidFriendly: "Kid-friendly",
    mlScore: "ML score",
  },
};

export function NapoliPageContent() {
  const { lang } = useLang();
  const t = T[lang];
  const { city, city_overview, city_overview_ro, places, booking_summary } =
    napoliData;
  const curatedHotels = booking_summary?.curated_hotels ?? [];
  const overview =
    lang === "ro" && city_overview_ro ? city_overview_ro : city_overview;

  return (
    <>
      <main
        className={css({
          position: "relative",
          zIndex: 1,
          mx: "auto",
          px: { base: "4", sm: "6", md: "10", lg: "16", xl: "20" },
          pt: { base: "10", sm: "16", md: "24" },
          pb: { base: "12", md: "20" },
        })}
      >
        {/* ── Hero ─────────────────────────────────────────── */}
        <header
          className={css({
            textAlign: "center",
            maxW: "3xl",
            mx: "auto",
            mb: { base: "10", sm: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3",
              mb: "6",
            })}
          >
            <span
              className={css({
                display: "block",
                w: "6",
                h: "1px",
                bg: "amber.warm",
                animation: "coalSeam 3s ease-in-out infinite",
                transformOrigin: "center",
              })}
            />
            <p
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
            </p>
            <span
              className={css({
                display: "block",
                w: "6",
                h: "1px",
                bg: "amber.warm",
                animation: "coalSeam 3s ease-in-out infinite",
                transformOrigin: "center",
              })}
            />
          </div>

          <h1
            className={css({
              fontSize: "h1",
              fontWeight: "800",
              fontFamily: "display",
              letterSpacing: "h1",
              color: "text.primary",
              lineHeight: "h1",
            })}
          >
            {city}
          </h1>

          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "4",
              my: "5",
              maxW: "xs",
              mx: "auto",
            })}
          >
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
            <span
              className={css({
                fontSize: "meta",
                fontFamily: "display",
                color: "text.faint",
                letterSpacing: "0.1em",
                fontWeight: "600",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              40&deg;50&prime;N 14&deg;15&prime;E
            </span>
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
          </div>

          <p
            className={css({
              fontSize: { base: "meta", md: "body" },
              fontFamily: "display",
              color: "text.muted",
              fontWeight: "400",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            })}
          >
            {t.tagline(places.length)}
          </p>
        </header>

        {/* ── Overview ────────────────────────────────────────── */}
        <div
          className={css({
            maxW: "5xl",
            mx: "auto",
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.05s both",
          })}
        >
          <hr
            className={css({
              border: "none",
              borderTop: "1px solid",
              borderColor: "steel.border",
              mb: { base: "10", md: "14" },
            })}
          />

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
              {t.overview}
            </span>
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
          </div>

          <div
            className={css({
              bg: "steel.surface",
              rounded: "card",
              border: "1px solid",
              borderColor: "steel.border",
              p: { base: "6", md: "10" },
              boxShadow: "card",
            })}
          >
            {overview.split("\n\n").map((para, i, arr) => {
              const isLede = i === 0;
              return (
                <div
                  key={i}
                  className={css({
                    display: "flex",
                    gap: isLede ? "4" : "0",
                    mb: i < arr.length - 1 ? (isLede ? "8" : "5") : "0",
                  })}
                >
                  {isLede && (
                    <div
                      className={css({
                        flexShrink: "0",
                        w: "3px",
                        rounded: "full",
                        alignSelf: "stretch",
                        bg: "amber.warm",
                        opacity: "0.6",
                      })}
                    />
                  )}
                  <p
                    className={css(
                      isLede
                        ? {
                            fontSize: { base: "body", md: "lg" },
                            lineHeight: "1.85",
                            color: "text.primary",
                            fontWeight: "400",
                          }
                        : {
                            fontSize: "body",
                            lineHeight: "body",
                            color: "text.secondary",
                          }
                    )}
                  >
                    {para}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Hotels ─────────────────────────────────────────── */}
        {curatedHotels.length > 0 && (
          <section
            className={css({
              maxW: "5xl",
              mx: "auto",
              mb: { base: "16", md: "20" },
              animation: "fadeUp 0.6s ease-out 0.1s both",
            })}
          >
            <HotelPicks hotels={curatedHotels} lang={lang} />
          </section>
        )}

        {/* ── Trip Budget ─────────────────────────────────── */}
        <section
          className={css({
            maxW: "5xl",
            mx: "auto",
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.12s both",
          })}
        >
          {/* Section header — same pattern as Map/Places headers */}
          <div className={css({ display: "flex", alignItems: "baseline", gap: "4", mb: "8" })}>
            <h2 className={css({ fontSize: "h2", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h2", lineHeight: "h2" })}>
              {t.budget}
            </h2>
            <span className={css({ fontSize: "label", fontWeight: "600", fontFamily: "display", color: "amber.warm", letterSpacing: "label", textTransform: "uppercase", flexShrink: "0" })}>
              {t.budgetTag}
            </span>
            <span className={css({ flex: "1", height: "1px", bg: "steel.border", display: { base: "none", md: "block" } })} />
          </div>

          {/* Budget breakdown */}
          <div className={css({ mb: { base: "8", md: "10" } })}>
            <BudgetOverview />
          </div>

          {/* Two-column grid: Flights + Accommodation */}
          <div className={css({ display: "grid", gap: { base: "6", md: "8" }, gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" }, mb: { base: "8", md: "10" } })}>
            <FlightGuide />
            <SleepGuide />
          </div>

          {/* Two-column grid: Food + Transport */}
          <div className={css({ display: "grid", gap: { base: "6", md: "8" }, gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" }, mb: { base: "8", md: "10" } })}>
            <EatGuide />
            <TransportGuide />
          </div>

          {/* Day trips: Pompeii */}
          <div className={css({ mb: { base: "8", md: "10" } })}>
            <PompeiiGuide />
          </div>

          {/* 5-day itinerary */}
          <div className={css({ mb: { base: "8", md: "10" } })}>
            <DayItinerary />
          </div>

          {/* Budget tips */}
          <TripSummary />
        </section>

        {/* ── Family Section ──────────────────────────────── */}
        <section
          className={css({
            maxW: "5xl",
            mx: "auto",
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.12s both",
          })}
        >
          <div className={css({ display: "flex", alignItems: "baseline", gap: "4", mb: "8" })}>
            <h2 className={css({ fontSize: "h2", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h2", lineHeight: "h2" })}>
              {t.familyTitle}
            </h2>
            <span className={css({ flex: "1", height: "1px", bg: "steel.border", display: { base: "none", md: "block" } })} />
          </div>

          {/* Group size + ML badge */}
          <div className={css({ display: "flex", gap: "3", mb: "8", flexWrap: "wrap" })}>
            <span className={css({
              display: "inline-flex", alignItems: "center", gap: "2",
              fontSize: "label", fontWeight: "700", fontFamily: "display",
              textTransform: "uppercase", letterSpacing: "label",
              bg: "rgba(201,146,42,0.12)", color: "amber.warm",
              border: "1px solid rgba(201,146,42,0.3)", rounded: "pill",
              px: "4", py: "1.5",
            })}>
              2 Adults · 1 Child
            </span>
            <span className={css({
              display: "inline-flex", alignItems: "center", gap: "2",
              fontSize: "label", fontWeight: "700", fontFamily: "display",
              textTransform: "uppercase", letterSpacing: "label",
              bg: "rgba(90,122,92,0.12)", color: "cat.nature",
              border: "1px solid rgba(90,122,92,0.3)", rounded: "pill",
              px: "4", py: "1.5",
            })}>
              ◈ ML-scored · all-MiniLM-L6-v2
            </span>
          </div>

          {/* Family budget card */}
          <div className={css({
            bg: "steel.surface", border: "1px solid", borderColor: "steel.border",
            rounded: "card", p: { base: "5", md: "8" }, boxShadow: "card", mb: "6",
            display: "flex", flexDirection: { base: "column", md: "row" },
            alignItems: { base: "flex-start", md: "center" }, gap: "6",
          })}>
            <div className={css({ flex: "1" })}>
              <p className={css({ fontSize: "label", fontWeight: "600", fontFamily: "display", color: "amber.warm", letterSpacing: "label", textTransform: "uppercase", mb: "2" })}>
                {t.familyBudget}
              </p>
              <p className={css({ fontSize: { base: "h2", md: "h1" }, fontWeight: "800", fontFamily: "display", color: "text.primary", lineHeight: "1" })}>
                €{booking_summary?.family_total_cost?.eur ?? 131}
              </p>
              <p className={css({ fontSize: "body", color: "text.secondary", mt: "2", lineHeight: "1.5" })}>
                {t.familyBudgetNote}
              </p>
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2", minW: "180px" })}>
              {[
                { label: lang === "ro" ? "Adulți (×2)" : "Adults (×2)", value: "€50" },
                { label: lang === "ro" ? "Copil (×1)" : "Child (×1)", value: "€28" },
                { label: lang === "ro" ? "Mâncare & Băuturi" : "Food & Drinks", value: "€53" },
              ].map((row) => (
                <div key={row.label} className={css({ display: "flex", justifyContent: "space-between", gap: "4" })}>
                  <span className={css({ fontSize: "xs", color: "text.muted", fontFamily: "display" })}>{row.label}</span>
                  <span className={css({ fontSize: "xs", fontWeight: "700", fontFamily: "display", color: "text.primary" })}>{row.value}</span>
                </div>
              ))}
              <div className={css({ borderTop: "1px solid", borderColor: "steel.border", pt: "2", display: "flex", justifyContent: "space-between", gap: "4" })}>
                <span className={css({ fontSize: "xs", fontWeight: "700", fontFamily: "display", color: "amber.warm", textTransform: "uppercase" })}>Total</span>
                <span className={css({ fontSize: "xs", fontWeight: "800", fontFamily: "display", color: "amber.warm" })}>€131</span>
              </div>
            </div>
          </div>

          {/* Kid-friendly places ML score grid */}
          <div className={css({ display: "grid", gap: "3", gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } })}>
            {places.filter(p => p.kid_friendly).map((place) => (
              <div key={place.name} className={css({
                bg: "steel.surface", border: "1px solid", borderColor: "steel.border",
                rounded: "card", p: "4", boxShadow: "card",
                position: "relative", overflow: "hidden",
                transition: "border-color 0.15s ease",
                _hover: { borderColor: "steel.borderHover" },
              })}>
                {/* ML score bar */}
                <div className={css({ position: "absolute", top: "0", left: "0", right: "0", h: "2px", bg: "steel.border" })}>
                  <div
                    className={css({ h: "full", bg: "cat.nature", transition: "width 0.3s ease" })}
                    style={{ width: `${Math.round((place.family_score ?? 0) * 100)}%` }}
                  />
                </div>
                <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: "2" })}>
                  <p className={css({ fontSize: "sm", fontWeight: "700", fontFamily: "display", color: "text.primary", lineHeight: "1.3" })}>
                    {place.name}
                  </p>
                  <span className={css({
                    flexShrink: "0", ml: "2",
                    fontSize: "xs", fontWeight: "800", fontFamily: "display",
                    color: "cat.nature",
                  })}>
                    {place.family_score != null ? `${Math.round(place.family_score * 100)}%` : "—"}
                  </span>
                </div>
                <div className={css({ display: "flex", alignItems: "center", gap: "2", mb: "2" })}>
                  <span className={css({
                    fontSize: "2xs", fontWeight: "700", fontFamily: "display",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    bg: "rgba(90,122,92,0.15)", color: "cat.nature",
                    border: "1px solid rgba(90,122,92,0.3)", rounded: "pill",
                    px: "1.5", py: "0.5",
                  })}>
                    ◈ {t.kidFriendly}
                  </span>
                  {place.family_cost && (
                    <span className={css({ fontSize: "xs", color: "text.muted", fontFamily: "display" })}>
                      {place.family_cost.total_eur === 0 ? (lang === "ro" ? "Gratuit" : "Free") : `€${place.family_cost.total_eur}`}
                    </span>
                  )}
                </div>
                {place.family_tips && (
                  <p className={css({ fontSize: "xs", color: "text.secondary", lineHeight: "1.55" })}>
                    {lang === "ro" && place.family_tips_ro ? place.family_tips_ro : place.family_tips}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Map ──────────────────────────────────────────── */}
        <section
          className={css({
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.15s both",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "baseline",
              gap: "4",
              mb: "8",
            })}
          >
            <h2
              className={css({
                fontSize: "h2",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                letterSpacing: "h2",
                lineHeight: "h2",
              })}
            >
              {t.map}
            </h2>
            <span
              className={css({
                flex: "1",
                height: "1px",
                bg: "steel.border",
                display: { base: "none", md: "block" },
              })}
            />
          </div>
          <MapOverview places={places} city={city} />
        </section>

        {/* ── How to Get to Capri ─────────────────────────── */}
        <section
          className={css({
            maxW: "5xl",
            mx: "auto",
            mb: { base: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out 0.2s both",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "baseline",
              gap: "4",
              mb: "8",
            })}
          >
            <h2
              className={css({
                fontSize: "h2",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                letterSpacing: "h2",
                lineHeight: "h2",
              })}
            >
              {t.capriTitle}
            </h2>
            <span
              className={css({
                flex: "1",
                height: "1px",
                bg: "steel.border",
                display: { base: "none", md: "block" },
              })}
            />
          </div>

          <p
            className={css({
              fontSize: "body",
              color: "text.secondary",
              lineHeight: "body",
              mb: "8",
            })}
          >
            {t.capriSubtitle}
          </p>

          {/* Ferry options grid */}
          <div
            className={css({
              display: "grid",
              gap: { base: "4", md: "6" },
              gridTemplateColumns: {
                base: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              mb: "8",
            })}
          >
            {t.ferries.map((ferry, i) => (
              <div
                key={i}
                className={css({
                  bg: "steel.surface",
                  border: "1px solid",
                  borderColor: "steel.border",
                  rounded: "card",
                  p: { base: "5", md: "6" },
                  boxShadow: "card",
                  position: "relative",
                  overflow: "hidden",
                  transition: "border-color 0.15s ease",
                  _hover: { borderColor: "steel.borderHover" },
                })}
              >
                {/* Top accent bar */}
                <div
                  className={css({
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    h: "2px",
                    bg: "linear-gradient(90deg, token(colors.amber.warm), transparent)",
                  })}
                />

                <p
                  className={css({
                    fontSize: "label",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "amber.warm",
                    letterSpacing: "label",
                    textTransform: "uppercase",
                    mb: "2",
                  })}
                >
                  {ferry.type}
                </p>

                <p
                  className={css({
                    fontSize: "xs",
                    color: "text.muted",
                    mb: "4",
                    lineHeight: "1.5",
                  })}
                >
                  {ferry.label}
                </p>

                <div
                  className={css({
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "3",
                    mb: "4",
                  })}
                >
                  <div>
                    <p
                      className={css({
                        fontSize: "2xs",
                        color: "text.faint",
                        fontFamily: "display",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        mb: "1",
                      })}
                    >
                      Duration
                    </p>
                    <p
                      className={css({
                        fontSize: "sm",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "text.primary",
                      })}
                    >
                      {ferry.duration}
                    </p>
                  </div>
                  <div>
                    <p
                      className={css({
                        fontSize: "2xs",
                        color: "text.faint",
                        fontFamily: "display",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        mb: "1",
                      })}
                    >
                      Price
                    </p>
                    <p
                      className={css({
                        fontSize: "sm",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "text.primary",
                      })}
                    >
                      {ferry.price}
                    </p>
                  </div>
                  <div className={css({ gridColumn: "span 2" })}>
                    <p
                      className={css({
                        fontSize: "2xs",
                        color: "text.faint",
                        fontFamily: "display",
                        fontWeight: "600",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        mb: "1",
                      })}
                    >
                      Frequency
                    </p>
                    <p
                      className={css({
                        fontSize: "sm",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "text.primary",
                      })}
                    >
                      {ferry.frequency}
                    </p>
                  </div>
                </div>

                <p
                  className={css({
                    fontSize: "xs",
                    color: "text.secondary",
                    lineHeight: "1.6",
                    borderTop: "1px solid",
                    borderColor: "steel.border",
                    pt: "3",
                  })}
                >
                  {ferry.tip}
                </p>
              </div>
            ))}
          </div>

          {/* Practical tips */}
          <div
            className={css({
              bg: "steel.surface",
              border: "1px solid",
              borderColor: "steel.border",
              rounded: "card",
              p: { base: "5", md: "8" },
              boxShadow: "card",
            })}
          >
            <p
              className={css({
                fontSize: "label",
                fontWeight: "600",
                fontFamily: "display",
                color: "amber.warm",
                letterSpacing: "label",
                textTransform: "uppercase",
                mb: "4",
              })}
            >
              {lang === "ro" ? "Sfaturi practice" : "Practical tips"}
            </p>
            <ul
              className={css({
                listStyle: "none",
                p: "0",
                m: "0",
                display: "flex",
                flexDirection: "column",
                gap: "3",
              })}
            >
              {t.capriTips.map((tip, i) => (
                <li
                  key={i}
                  className={css({
                    display: "flex",
                    gap: "3",
                    alignItems: "flex-start",
                  })}
                >
                  <span
                    className={css({
                      flexShrink: "0",
                      mt: "0.5",
                      w: "5",
                      h: "5",
                      rounded: "full",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2xs",
                      fontWeight: "800",
                      fontFamily: "display",
                      bg: "rgba(201, 146, 42, 0.15)",
                      color: "amber.warm",
                      border: "1px solid",
                      borderColor: "rgba(201, 146, 42, 0.3)",
                    })}
                  >
                    {i + 1}
                  </span>
                  <p
                    className={css({
                      fontSize: "body",
                      color: "text.secondary",
                      lineHeight: "1.65",
                    })}
                  >
                    {tip}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Traveling with a Child ──────────────────────── */}
        <section className={css({ maxW: "5xl", mx: "auto", mb: { base: "16", md: "20" }, animation: "fadeUp 0.6s ease-out 0.225s both" })}>
          <div className={css({ display: "flex", alignItems: "baseline", gap: "4", mb: "8" })}>
            <h2 className={css({ fontSize: "h2", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h2", lineHeight: "h2" })}>
              {t.familyTitle}
            </h2>
            <span className={css({ flex: "1", height: "1px", bg: "steel.border", display: { base: "none", md: "block" } })} />
          </div>
          <p className={css({ fontSize: "body", color: "text.secondary", lineHeight: "body", mb: "8" })}>
            {t.familySubtitle}
          </p>

          {/* ML Score overview cards */}
          <div className={css({ display: "grid", gap: { base: "3", md: "4" }, gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, mb: "8" })}>
            {places
              .filter((place) => place.family_score !== undefined)
              .sort((a, b) => (b.family_score ?? 0) - (a.family_score ?? 0))
              .slice(0, 5)
              .map((place) => (
                <div key={place.name} className={css({ bg: "steel.surface", border: "1px solid", borderColor: "steel.border", rounded: "card", p: "4", boxShadow: "card" })}>
                  <p className={css({ fontSize: "label", fontWeight: "700", fontFamily: "display", color: "text.primary", mb: "2" })}>{place.name}</p>
                  {/* Score bar */}
                  <div className={css({ h: "2px", bg: "steel.border", rounded: "full", mb: "2", overflow: "hidden" })}>
                    <div className={css({ h: "full", bg: "amber.warm", rounded: "full" })} style={{ width: `${(place.family_score ?? 0) * 100}%` }} />
                  </div>
                  <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
                    <span className={css({ fontSize: "xs", color: place.kid_friendly ? "amber.warm" : "text.faint" })}>
                      {place.kid_friendly ? `◆ ${t.kidFriendly}` : `◇ ${lang === "ro" ? "Adulți recomandat" : "Adults recommended"}`}
                    </span>
                    <span className={css({ fontSize: "meta", fontWeight: "700", fontFamily: "display", color: "text.muted", fontVariantNumeric: "tabular-nums" })}>
                      {t.mlScore}: {place.family_score?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
          </div>

        </section>

        {/* ── Places ────────────────────────────────────────── */}
        <section
          className={css({
            animation: "fadeUp 0.6s ease-out 0.25s both",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "baseline",
              gap: "4",
              mb: "8",
            })}
          >
            <h2
              className={css({
                fontSize: "h2",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                letterSpacing: "h2",
                lineHeight: "h2",
              })}
            >
              {t.places}
            </h2>
            <span
              className={css({
                flex: "1",
                height: "1px",
                bg: "steel.border",
                display: { base: "none", md: "block" },
              })}
            />
          </div>

          <div
            className={css({
              display: "grid",
              gap: { base: "4", sm: "6", md: "8" },
              gridTemplateColumns: {
                base: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(3, 1fr)",
              },
              "& > *": { animation: "fadeUp 0.35s ease-out both" },
              "& > *:nth-child(3n+2)": { animationDelay: "0.07s" },
              "& > *:nth-child(3n+3)": { animationDelay: "0.14s" },
              "& > *:nth-child(n+4)": { animationDelay: "0.12s" },
              "& > *:nth-child(n+7)": { animationDelay: "0.18s" },
            })}
          >
            {places.map((place, i) => (
              <PlaceCard
                key={place.name}
                place={place}
                index={i}
                lang={lang}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer city={city} count={places.length} />
    </>
  );
}
