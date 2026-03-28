"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";

const T = {
  ro: {
    title: "Buget estimativ",
    group: "2 adulți + 1 copil",
    subtitle: "5 zile în Napoli · 2 adulți + 1 copil · sezon mediu (apr–mai)",
    note: "Estimări 2025. Copiii sub 18 ani intră GRATUIT la toate muzeele de stat (MANN, Pompei, Herculaneum, Certosa). Copiii sub 10 ani călătoresc gratuit în rețeaua ANM.",
    categories: [
      "Zboruri (3 bilete)",
      "Cazare (cameră familie, 5 nopți)",
      "Activități (adulți; copil gratuit)",
      "Mâncare & Băutură",
      "Transport local",
      "Excursie Capri (3 pers.)",
    ],
  },
  en: {
    title: "Estimated Budget",
    group: "2 adults + 1 child",
    subtitle: "5 days in Naples · 2 adults + 1 child · shoulder season (Apr–May)",
    note: "2025 estimates. Children under 18 enter FREE at all Italian state museums (MANN, Pompeii, Herculaneum, Certosa). Children under 10 travel free on the ANM network.",
    categories: [
      "Flights (3 tickets)",
      "Accommodation (family room, 5 nights)",
      "Activities (adults; child free)",
      "Food & Drink",
      "Local transport",
      "Capri day trip (3 people)",
    ],
  },
};

const BUDGET_ITEMS = [
  { amount: 300, percent: 30, color: "#42A5F5" },
  { amount: 300, percent: 30, color: "#C9922A" },
  { amount: 60,  percent: 6,  color: "#7B68EE" },
  { amount: 200, percent: 20, color: "#FF7043" },
  { amount: 50,  percent: 5,  color: "#4CAF50" },
  { amount: 90,  percent: 9,  color: "#AB8B6B" },
];

export function BudgetOverview() {
  const { lang } = useLang();
  const t = T[lang];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={css({
        bg: "steel.surface",
        border: "1px solid",
        borderColor: "steel.border",
        rounded: "card",
        p: { base: "6", md: "10" },
        animation: "fadeUp 0.6s ease-out",
        _hover: {
          borderColor: "steel.borderHover",
        },
        transition: "border-color 0.2s",
      })}
    >
      {/* ── Header ── */}
      <div
        className={css({
          mb: "8",
        })}
      >
        <p
          className={css({
            fontSize: "meta",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            mb: "2",
          })}
        >
          {t.title}
        </p>

        <p
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "1",
            color: "amber.warm",
            letterSpacing: "-0.02em",
            mb: "2",
          })}
        >
          €1,000
        </p>

        <div className={css({ display: "flex", alignItems: "center", gap: "2", mt: "3" })}>
          <span className={css({
            fontSize: "label",
            fontWeight: "700",
            fontFamily: "display",
            letterSpacing: "label",
            textTransform: "uppercase",
            color: "amber.warm",
            bg: "rgba(201,146,42,0.1)",
            border: "1px solid rgba(201,146,42,0.25)",
            rounded: "pill",
            px: "3",
            py: "1",
          })}>
            {t.group}
          </span>
        </div>

        <p
          className={css({
            fontSize: "meta",
            color: "text.muted",
            lineHeight: "1.5",
            mt: "2",
          })}
        >
          {t.subtitle}
        </p>
      </div>

      {/* ── Bar rows ── */}
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          gap: "5",
          mb: "8",
        })}
      >
        {BUDGET_ITEMS.map((item, i) => (
          <div key={i}>
            {/* Label row */}
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                mb: "2",
              })}
            >
              <span
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "1",
                })}
              >
                {t.categories[i]}
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  color: "text.primary",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "monospace",
                  lineHeight: "1",
                })}
              >
                €{item.amount}
              </span>
            </div>

            {/* Bar track */}
            <div
              className={css({
                w: "full",
                h: "1",
                bg: "steel.raised",
                rounded: "full",
                overflow: "hidden",
              })}
            >
              <div
                style={{
                  width: mounted ? `${item.percent}%` : "0%",
                  height: "100%",
                  backgroundColor: item.color,
                  borderRadius: "9999px",
                  transition: `width 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 60}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Note ── */}
      <p
        className={css({
          fontSize: "xs",
          color: "text.faint",
          borderTop: "1px solid",
          borderColor: "steel.border",
          pt: "4",
          lineHeight: "1.6",
        })}
      >
        {t.note}
      </p>
    </div>
  );
}
