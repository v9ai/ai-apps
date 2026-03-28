"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";

const T = {
  ro: {
    title: "Buget estimativ",
    subtitle: "5 zile în Napoli · călător solo · sezon mediu (apr–mai)",
    note: "Estimări bazate pe prețuri medii 2025. Costurile reale variază.",
    categories: [
      "Zboruri",
      "Cazare",
      "Activități",
      "Mâncare & Băutură",
      "Transport",
      "Excursie Capri",
    ],
  },
  en: {
    title: "Estimated Budget",
    subtitle: "5 days in Naples · solo traveller · shoulder season (Apr–May)",
    note: "Based on average 2025 prices. Actual costs vary.",
    categories: [
      "Flights",
      "Accommodation",
      "Activities",
      "Food & Drink",
      "Transport",
      "Capri Day Trip",
    ],
  },
};

const BUDGET_ITEMS = [
  { amount: 280, percent: 28, color: "#42A5F5" },
  { amount: 350, percent: 35, color: "#C9922A" },
  { amount: 90,  percent: 9,  color: "#7B68EE" },
  { amount: 180, percent: 18, color: "#FF7043" },
  { amount: 60,  percent: 6,  color: "#4CAF50" },
  { amount: 80,  percent: 8,  color: "#AB8B6B" },
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

        <p
          className={css({
            fontSize: "meta",
            color: "text.muted",
            lineHeight: "1.5",
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
