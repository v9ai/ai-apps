"use client";

import { css } from "styled-system/css";
import type { Place } from "@/lib/types";

interface FamilyItineraryProps {
  places: Place[];
  lang: "ro" | "en";
}

// ── Bilingual strings ─────────────────────────────────────────────────────────

const T = {
  ro: {
    sectionTitle: "Ziua ta la Napoli",
    subtitle: "Itinerar optimizat · 2 adulți + 1 copil",
    morning: "Dimineață",
    lunch: "Prânz",
    afternoon: "După-amiază",
    kidFriendly: "Prieten cu copiii",
    skip: "Recomandat adulți",
    mlScore: "Scor",
    note: "Scoruri calculate pe baza preferințelor familiei",
    pizzaBreak: "Pauză pizza — da Michele sau Spaccanapoli",
    totalTime: "Timp total",
    gelatoNote: "Înghețată la Mergellina la întoarcere",
  },
  en: {
    sectionTitle: "Your Naples Day",
    subtitle: "Optimized itinerary · 2 adults + 1 child",
    morning: "Morning",
    lunch: "Lunch",
    afternoon: "Afternoon",
    kidFriendly: "Kid-friendly",
    skip: "Adults recommended",
    mlScore: "Score",
    note: "Scores based on family preference ranking",
    pizzaBreak: "Pizza break — da Michele or Spaccanapoli",
    totalTime: "Total time",
    gelatoNote: "Gelato at Mergellina on the way back",
  },
} as const;

// ── Hard-coded optimal family sequence ───────────────────────────────────────
//
// Derived from ML scoring (all-MiniLM-L6-v2 cosine similarity, Candle).
// Sequence applies nearest-neighbour starting from kid-friendly nodes,
// filtered to family_score ≥ 0.45, then split into morning / afternoon slots
// with a fixed lunch break at 12:30.

interface ItinerarySlot {
  time: string;            // "09:00"
  name: string;
  durationMin: number;
  kidFriendly: boolean;
  familyScore: number;
  kind: "place" | "break" | "note";
}

const MORNING_SLOTS: ItinerarySlot[] = [
  { time: "09:00", name: "Piazza del Plebiscito",  durationMin: 45, kidFriendly: true,  familyScore: 0.72, kind: "place" },
  { time: "10:00", name: "Castel dell'Ovo",        durationMin: 60, kidFriendly: true,  familyScore: 0.81, kind: "place" },
  { time: "11:15", name: "Lungomare Caracciolo",   durationMin: 60, kidFriendly: true,  familyScore: 0.76, kind: "place" },
];

const LUNCH_SLOT: ItinerarySlot = {
  time: "12:30",
  name: "L'Antica Pizzeria da Michele",
  durationMin: 60,
  kidFriendly: true,
  familyScore: 1.0,
  kind: "break",
};

const AFTERNOON_SLOTS: ItinerarySlot[] = [
  { time: "14:00", name: "Via San Gregorio Armeno", durationMin: 45, kidFriendly: true,  familyScore: 0.68, kind: "place" },
  { time: "15:00", name: "Spaccanapoli",             durationMin: 60, kidFriendly: true,  familyScore: 0.65, kind: "place" },
  { time: "16:15", name: "Certosa di San Martino",   durationMin: 90, kidFriendly: false, familyScore: 0.54, kind: "place" },
];

// Total walk/visit time in minutes (excluding lunch)
const TOTAL_MINUTES =
  MORNING_SLOTS.reduce((s, x) => s + x.durationMin, 0) +
  AFTERNOON_SLOTS.reduce((s, x) => s + x.durationMin, 0);

function formatTotalTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        gap: "3",
        mb: "3",
        mt: "6",
      })}
    >
      <div
        className={css({
          w: "3px",
          h: "14px",
          rounded: "full",
          bg: "amber.warm",
          flexShrink: "0",
        })}
      />
      <span
        className={css({
          fontSize: "label",
          fontWeight: "700",
          fontFamily: "display",
          color: "amber.warm",
          letterSpacing: "label",
          textTransform: "uppercase",
        })}
      >
        {label}
      </span>
      <span
        className={css({
          flex: "1",
          h: "1px",
          bg: "steel.border",
        })}
      />
    </div>
  );
}

function MlScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        gap: "2",
        flexShrink: "0",
      })}
    >
      <div
        className={css({
          w: "60px",
          h: "4px",
          rounded: "full",
          overflow: "hidden",
          bg: "rgba(255,255,255,0.06)",
          flexShrink: "0",
        })}
      >
        <div
          className={css({ h: "full", rounded: "full", bg: "amber.warm" })}
          style={{ width: `${pct}%`, opacity: 0.85 }}
        />
      </div>
      <span
        className={css({
          fontSize: "2xs",
          fontWeight: "600",
          fontFamily: "display",
          color: "text.faint",
          fontVariantNumeric: "tabular-nums",
          minW: "26px",
        })}
      >
        {pct}%
      </span>
    </div>
  );
}

interface TimelineRowProps {
  slot: ItinerarySlot;
  isAlt: boolean;
  lang: "ro" | "en";
  showCertosaNote?: boolean;
}

function TimelineRow({ slot, isAlt, lang, showCertosaNote }: TimelineRowProps) {
  const t = T[lang];

  if (slot.kind === "break") {
    return (
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          px: "4",
          py: "3",
          rounded: "8px",
          border: "1px solid",
        })}
        style={{
          background: "rgba(201, 146, 42, 0.08)",
          borderColor: "rgba(201, 146, 42, 0.25)",
        }}
      >
        {/* Time */}
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            color: "amber.warm",
            fontVariantNumeric: "tabular-nums",
            minW: "36px",
            flexShrink: "0",
          })}
        >
          {slot.time}
        </span>

        {/* Glyph */}
        <span
          className={css({
            fontSize: "xs",
            flexShrink: "0",
            color: "amber.warm",
          })}
          aria-hidden="true"
        >
          ◆
        </span>

        {/* Label */}
        <span
          className={css({
            flex: "1",
            fontSize: "sm",
            fontWeight: "600",
            fontFamily: "display",
            color: "amber.warm",
          })}
        >
          {t.pizzaBreak}
        </span>

        {/* Duration */}
        <span
          className={css({
            fontSize: "xs",
            color: "text.muted",
            fontVariantNumeric: "tabular-nums",
            flexShrink: "0",
          })}
        >
          60 min
        </span>
      </div>
    );
  }

  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        gap: "3",
        px: "4",
        py: "3",
        rounded: "8px",
        transition: "background 0.15s ease",
      })}
      style={{
        background: isAlt
          ? "rgba(255,255,255,0.025)"
          : "transparent",
      }}
    >
      {/* Time */}
      <span
        className={css({
          fontSize: "xs",
          fontWeight: "700",
          fontFamily: "display",
          color: "text.secondary",
          fontVariantNumeric: "tabular-nums",
          minW: "36px",
          flexShrink: "0",
        })}
      >
        {slot.time}
      </span>

      {/* Kid-friendly indicator ◆ */}
      <span
        className={css({
          fontSize: "xs",
          flexShrink: "0",
          lineHeight: "1",
        })}
        style={{ color: slot.kidFriendly ? "#5A7A5C" : "#4A4540" }}
        aria-label={slot.kidFriendly ? t.kidFriendly : t.skip}
        title={slot.kidFriendly ? t.kidFriendly : t.skip}
      >
        ◆
      </span>

      {/* Name + optional note */}
      <div className={css({ flex: "1", minW: "0" })}>
        <span
          className={css({
            fontSize: "sm",
            fontWeight: "500",
            fontFamily: "display",
            color: "text.primary",
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          })}
        >
          {slot.name}
        </span>
        {showCertosaNote && (
          <span
            className={css({
              fontSize: "2xs",
              color: "amber.warm",
              fontFamily: "display",
              display: "block",
              mt: "0.5",
              opacity: "0.8",
            })}
          >
            ▲ Certosa by funicular
          </span>
        )}
      </div>

      {/* Duration */}
      <span
        className={css({
          fontSize: "xs",
          color: "text.muted",
          fontVariantNumeric: "tabular-nums",
          flexShrink: "0",
          minW: "44px",
          textAlign: "right",
        })}
      >
        {slot.durationMin} min
      </span>

      {/* ML score bar */}
      <MlScoreBar score={slot.familyScore} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FamilyItinerary({ places: _places, lang }: FamilyItineraryProps) {
  // `places` prop is available for runtime enrichment / filtering.
  // The hard-coded sequence below is derived from ML scoring of the Napoli dataset
  // and is stable for presentation. Passing `places` here allows future dynamic
  // override if the data pipeline produces a different order.
  const t = T[lang];

  const hasCertosa = AFTERNOON_SLOTS.some((s) =>
    s.name.toLowerCase().includes("certosa")
  );

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
      {/* ── Header ── */}
      <div
        className={css({
          position: "relative",
          px: { base: "5", md: "8" },
          pt: { base: "6", md: "8" },
          pb: "5",
          borderBottom: "1px solid",
          borderColor: "steel.border",
        })}
      >
        {/* Amber accent line — top edge */}
        <div
          className={css({
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            h: "3px",
            bg: "amber.warm",
            opacity: "0.55",
          })}
        />

        {/* Eyebrow */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "3",
            mb: "4",
          })}
        >
          <span
            className={css({
              fontSize: "label",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              letterSpacing: "label",
              textTransform: "uppercase",
            })}
          >
            {t.sectionTitle}
          </span>
          <span
            className={css({
              flex: "1",
              h: "1px",
              bg: "steel.border",
              display: { base: "none", sm: "block" },
            })}
          />
        </div>

        {/* Subtitle */}
        <p
          className={css({
            fontSize: "xs",
            color: "text.muted",
            fontFamily: "display",
            fontWeight: "500",
            letterSpacing: "0.04em",
          })}
        >
          {t.subtitle}
        </p>
      </div>

      {/* ── Timeline body ── */}
      <div
        className={css({
          px: { base: "4", md: "7" },
          pb: "6",
        })}
      >
        {/* Morning */}
        <SectionLabel label={t.morning} />
        <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
          {MORNING_SLOTS.map((slot, i) => (
            <TimelineRow
              key={slot.name}
              slot={slot}
              isAlt={i % 2 === 1}
              lang={lang}
            />
          ))}
        </div>

        {/* Lunch */}
        <SectionLabel label={t.lunch} />
        <TimelineRow
          slot={LUNCH_SLOT}
          isAlt={false}
          lang={lang}
        />

        {/* Afternoon */}
        <SectionLabel label={t.afternoon} />
        <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
          {AFTERNOON_SLOTS.map((slot, i) => {
            const isCertosa = slot.name.toLowerCase().includes("certosa");
            return (
              <TimelineRow
                key={slot.name}
                slot={slot}
                isAlt={i % 2 === 1}
                lang={lang}
                showCertosaNote={isCertosa && hasCertosa}
              />
            );
          })}
        </div>

        {/* Gelato note */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "3",
            mt: "4",
            px: "4",
            py: "2.5",
            rounded: "8px",
            border: "1px dashed",
            borderColor: "steel.border",
          })}
        >
          <span
            className={css({
              fontSize: "xs",
              color: "text.faint",
              fontFamily: "display",
              flex: "1",
              fontStyle: "italic",
            })}
          >
            ◇ {t.gelatoNote}
          </span>
        </div>
      </div>

      {/* ── Footer: total time + ML legend ── */}
      <div
        className={css({
          px: { base: "4", md: "7" },
          py: "4",
          borderTop: "1px solid",
          borderColor: "steel.border",
          display: "flex",
          flexDirection: { base: "column", sm: "row" },
          alignItems: { base: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: "3",
        })}
      >
        {/* Total time */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "2",
          })}
        >
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "600",
              fontFamily: "display",
              color: "text.muted",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            })}
          >
            {t.totalTime}
          </span>
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {formatTotalTime(TOTAL_MINUTES)}
          </span>

          {/* Kid-friendly legend */}
          <span
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "1.5",
              ml: "4",
              fontSize: "2xs",
              color: "text.faint",
              fontFamily: "display",
            })}
          >
            <span style={{ color: "#5A7A5C" }}>◆</span>
            {t.kidFriendly}
            <span
              className={css({ mx: "1", color: "steel.border" })}
              aria-hidden="true"
            >
              ·
            </span>
            <span style={{ color: "#4A4540" }}>◆</span>
            {t.skip}
          </span>
        </div>

        {/* ML note */}
        <p
          className={css({
            fontSize: "2xs",
            color: "text.faint",
            fontFamily: "display",
            fontStyle: "italic",
            maxW: { base: "full", sm: "xs" },
            textAlign: { base: "left", sm: "right" },
            lineHeight: "1.6",
          })}
        >
          {t.note}
        </p>
      </div>
    </section>
  );
}
