"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { useEffect, useState } from "react";
import { NIGHTS, DATE_RANGE_LABEL } from "../constants";

type Status = "Ok" | "Warning" | "Over";

interface PriceItem {
  name_en: string;
  name_ro: string;
  amount: number;
}

interface Category {
  name_en: string;
  name_ro: string;
  budgeted: number;
  actual: number;
  status: Status;
  items: PriceItem[];
}

const T = {
  en: {
    sectionLabel: "Price Validation",
    sectionTitle: "Live Price Check",
    subtitle: `2 adults + 1 child · ${DATE_RANGE_LABEL.en} · All amounts in EUR`,
    budgetedLabel: "Budgeted",
    actualLabel: "Actual",
    statusLabels: {
      Ok: "On budget",
      Warning: "Warning",
      Over: "Over budget",
    },
    totalLabel: "Total",
    withinBudgetLabel: "Within budget",
    noteText:
      "Children under 18 free at all state museums. City tax not included in activities budget.",
  },
  ro: {
    sectionLabel: "Validare Preturi",
    sectionTitle: "Verificare Preturi Live",
    subtitle: `2 adulti + 1 copil · ${DATE_RANGE_LABEL.ro} · Toate sumele in EUR`,
    mlBadge: ML_BADGE.ro,
    budgetedLabel: "Bugetat",
    actualLabel: "Real",
    statusLabels: {
      Ok: "In buget",
      Warning: "Atentie",
      Over: "Depasit",
    },
    totalLabel: "Total",
    withinBudgetLabel: "In limita bugetului",
    noteText:
      "Copiii sub 18 ani intra gratuit la toate muzeele de stat. Taxa de sejur nu este inclusa in bugetul de activitati.",
  },
};

const CATEGORIES: Category[] = [
  {
    name_en: "Flights",
    name_ro: "Zboruri",
    budgeted: 300,
    actual: 300,
    status: "Ok",
    items: [
      { name_en: "Adult 1 return flight", name_ro: "Zbor adult 1 (dus-intors)", amount: 110 },
      { name_en: "Adult 2 return flight", name_ro: "Zbor adult 2 (dus-intors)", amount: 110 },
      { name_en: "Child return flight", name_ro: "Zbor copil (dus-intors)", amount: 80 },
    ],
  },
  {
    name_en: "Accommodation",
    name_ro: "Cazare",
    budgeted: 300,
    actual: 320,
    status: "Warning",
    items: [
      {
        name_en: `Family room B&B (${NIGHTS} nights x €60)`,
        name_ro: `Camera familie B&B (${NIGHTS} nopti x €60)`,
        amount: 300,
      },
      {
        name_en: `City tax (2 adults x ${NIGHTS} nights x €2)`,
        name_ro: `Taxa de sejur (2 adulti x ${NIGHTS} nopti)`,
        amount: 20,
      },
    ],
  },
  {
    name_en: "Activities",
    name_ro: "Activitati",
    budgeted: 60,
    actual: 68,
    status: "Over",
    items: [
      {
        name_en: "MANN Museum (2 adults, child free)",
        name_ro: "Muzeu MANN (2 adulti, copil gratuit)",
        amount: 30,
      },
      {
        name_en: "Certosa di San Martino (2 adults)",
        name_ro: "Certosa di San Martino (2 adulti)",
        amount: 12,
      },
      {
        name_en: "Napoli Sotterranea (2 adults)",
        name_ro: "Napoli Sotterranea (2 adulti)",
        amount: 18,
      },
      {
        name_en: "Pompeii audio guide (family)",
        name_ro: "Audioghid Pompei (familie)",
        amount: 8,
      },
    ],
  },
  {
    name_en: "Transport",
    name_ro: "Transport",
    budgeted: 50,
    actual: 37.1,
    status: "Ok",
    items: [
      {
        name_en: "ANM 3-day pass x 2 adults",
        name_ro: "Abonament ANM 3 zile x 2 adulti",
        amount: 24.0,
      },
      { name_en: "Funicular rides", name_ro: "Calatorii funicular", amount: 4.4 },
      {
        name_en: "Circumvesuviana (3 persons)",
        name_ro: "Circumvesuviana (3 persoane)",
        amount: 8.7,
      },
    ],
  },
  {
    name_en: "Capri day trip",
    name_ro: "Excursie Capri",
    budgeted: 90,
    actual: 66,
    status: "Ok",
    items: [
      {
        name_en: "Traditional ferry return (2 adults)",
        name_ro: "Ferry traditional retur (2 adulti)",
        amount: 28,
      },
      {
        name_en: "Traditional ferry return (child)",
        name_ro: "Ferry traditional retur (copil)",
        amount: 14,
      },
      {
        name_en: "Bus to Anacapri (3 persons)",
        name_ro: "Autobuz Anacapri (3 persoane)",
        amount: 9,
      },
      { name_en: "Beach/gelato", name_ro: "Plaja/inghetata", amount: 15 },
    ],
  },
];

const TOTAL_BUDGETED = 800;
const TOTAL_ACTUAL = 791.1;

const STATUS_BAR_COLOR: Record<Status, string> = {
  Ok: "token(colors.amber.warm)",
  Warning: "token(colors.amber.bright)",
  Over: "token(colors.text.muted)",
};

const STATUS_BORDER_COLOR: Record<Status, string> = {
  Ok: "steel.border",
  Warning: "amber.bright",
  Over: "steel.border",
};

const STATUS_ICON: Record<Status, string> = {
  Ok: "checkmark",
  Warning: "warning",
  Over: "cross",
};

function StatusBadge({ status, label }: { status: Status; label: string }) {
  if (status === "Ok") {
    return (
      <span
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1",
          fontSize: "xs",
          fontWeight: "700",
          fontFamily: "display",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "amber.warm",
          bg: "rgba(201,146,42,0.12)",
          border: "1px solid rgba(201,146,42,0.3)",
          rounded: "pill",
          px: "2.5",
          py: "0.5",
        })}
      >
        <span style={{ fontSize: "10px" }}>&#10003;</span>
        {label}
      </span>
    );
  }
  if (status === "Warning") {
    return (
      <span
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1",
          fontSize: "xs",
          fontWeight: "700",
          fontFamily: "display",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "amber.bright",
          bg: "rgba(230,168,50,0.1)",
          border: "1px solid",
          borderColor: "amber.bright",
          rounded: "pill",
          px: "2.5",
          py: "0.5",
        })}
      >
        <span style={{ fontSize: "10px" }}>&#9888;</span>
        {label}
      </span>
    );
  }
  return (
    <span
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "1",
        fontSize: "xs",
        fontWeight: "700",
        fontFamily: "display",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "text.muted",
        bg: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.12)",
        rounded: "pill",
        px: "2.5",
        py: "0.5",
      })}
    >
      <span style={{ fontSize: "10px" }}>&#10007;</span>
      {label}
    </span>
  );
}

export function PriceCheck() {
  const { lang } = useLang();
  const t = T[lang];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className={css({
        bg: "steel.dark",
        color: "text.primary",
        py: { base: "12", md: "20" },
        px: { base: "5", md: "8" },
        animation: "fadeUp 0.6s ease-out",
      })}
    >
      {/* ── Section header ── */}
      <div
        className={css({
          mb: { base: "10", md: "14" },
        })}
      >
        <p
          className={css({
            fontSize: "meta",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            mb: "3",
          })}
        >
          {t.sectionLabel}
        </p>

        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "3",
            flexWrap: "wrap",
            mb: "3",
          })}
        >
          <h2
            className={css({
              fontSize: "h2",
              fontWeight: "800",
              fontFamily: "display",
              lineHeight: "1",
              letterSpacing: "-0.02em",
              color: "text.primary",
            })}
          >
            {t.sectionTitle}
          </h2>

          {/* ML Verified badge */}
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "amber.warm",
              bg: "rgba(201,146,42,0.1)",
              border: "1px solid rgba(201,146,42,0.25)",
              rounded: "pill",
              px: "3",
              py: "1",
              flexShrink: "0",
            })}
          >
            {t.mlBadge}
          </span>
        </div>

        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
          })}
        >
          {t.subtitle}
        </p>
      </div>

      {/* ── Category cards grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
          gap: { base: "4", md: "5" },
          mb: { base: "8", md: "10" },
        })}
      >
        {CATEGORIES.map((cat, i) => {
          const fillPct = Math.min((cat.actual / cat.budgeted) * 100, 100);
          const borderCol = STATUS_BORDER_COLOR[cat.status];
          const barColor = STATUS_BAR_COLOR[cat.status];
          const statusLabel = t.statusLabels[cat.status];
          const categoryName = lang === "ro" ? cat.name_ro : cat.name_en;

          return (
            <div
              key={i}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: borderCol,
                borderRadius: "card",
                boxShadow: "card",
                p: { base: "5", md: "6" },
                transition: "border-color 0.2s, box-shadow 0.2s",
                _hover: {
                  borderColor: "steel.borderHover",
                  boxShadow: "card.hover",
                },
                display: "flex",
                flexDir: "column",
                gap: "4",
              })}
            >
              {/* Card header: name + status */}
              <div
                className={css({
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "2",
                  flexWrap: "wrap",
                })}
              >
                <h4
                  className={css({
                    fontSize: "h4",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "amber.warm",
                    lineHeight: "1.2",
                    letterSpacing: "0.02em",
                  })}
                >
                  {categoryName}
                </h4>
                <StatusBadge status={cat.status} label={statusLabel} />
              </div>

              {/* Budgeted vs Actual */}
              <div
                className={css({
                  display: "flex",
                  gap: "5",
                })}
              >
                <div>
                  <p
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      color: "text.faint",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      mb: "0.5",
                    })}
                  >
                    {t.budgetedLabel}
                  </p>
                  <p
                    className={css({
                      fontSize: "h3",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "text.muted",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: "1",
                    })}
                  >
                    &euro;{cat.budgeted}
                  </p>
                </div>
                <div>
                  <p
                    className={css({
                      fontSize: "2xs",
                      fontFamily: "display",
                      color: "text.faint",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      mb: "0.5",
                    })}
                  >
                    {t.actualLabel}
                  </p>
                  <p
                    className={css({
                      fontSize: "h3",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "text.primary",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: "1",
                    })}
                  >
                    &euro;{cat.actual % 1 === 0 ? cat.actual : cat.actual.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className={css({
                  w: "full",
                  h: "1.5",
                  bg: "steel.raised",
                  rounded: "full",
                  overflow: "hidden",
                })}
              >
                <div
                  style={{
                    width: mounted ? `${fillPct}%` : "0%",
                    height: "100%",
                    backgroundColor: barColor,
                    borderRadius: "9999px",
                    transition: `width 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${i * 80}ms`,
                  }}
                />
              </div>

              {/* Itemized list */}
              <ul
                className={css({
                  listStyle: "none",
                  m: "0",
                  p: "0",
                  display: "flex",
                  flexDir: "column",
                  gap: "1.5",
                  borderTop: "1px solid",
                  borderColor: "steel.border",
                  pt: "3",
                })}
              >
                {cat.items.map((item, j) => {
                  const itemName = lang === "ro" ? item.name_ro : item.name_en;
                  return (
                    <li
                      key={j}
                      className={css({
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: "2",
                      })}
                    >
                      <span
                        className={css({
                          fontSize: "xs",
                          color: "text.secondary",
                          lineHeight: "1.4",
                          flex: "1",
                        })}
                      >
                        {itemName}
                      </span>
                      <span
                        className={css({
                          fontSize: "xs",
                          color: "text.primary",
                          fontVariantNumeric: "tabular-nums",
                          fontFamily: "monospace",
                          flexShrink: "0",
                          lineHeight: "1",
                        })}
                      >
                        &euro;{item.amount % 1 === 0 ? item.amount : item.amount.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Footer summary row ── */}
      <div
        className={css({
          bg: "steel.surface",
          border: "1px solid",
          borderColor: "steel.border",
          borderRadius: "card",
          p: { base: "5", md: "7" },
          boxShadow: "card",
        })}
      >
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            gap: { base: "6", md: "10" },
            alignItems: "center",
            mb: "4",
          })}
        >
          {/* Total budgeted */}
          <div>
            <p
              className={css({
                fontSize: "2xs",
                fontFamily: "display",
                color: "text.faint",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                mb: "1",
              })}
            >
              {t.totalLabel} {t.budgetedLabel}
            </p>
            <p
              className={css({
                fontSize: "h2",
                fontWeight: "800",
                fontFamily: "display",
                color: "text.muted",
                fontVariantNumeric: "tabular-nums",
                lineHeight: "1",
                letterSpacing: "-0.02em",
              })}
            >
              &euro;{TOTAL_BUDGETED}
            </p>
          </div>

          {/* Divider */}
          <div
            className={css({
              w: "1px",
              h: "10",
              bg: "steel.border",
              flexShrink: "0",
              display: { base: "none", md: "block" },
            })}
          />

          {/* Total actual */}
          <div>
            <p
              className={css({
                fontSize: "2xs",
                fontFamily: "display",
                color: "text.faint",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                mb: "1",
              })}
            >
              {t.totalLabel} {t.actualLabel}
            </p>
            <p
              className={css({
                fontSize: "h2",
                fontWeight: "800",
                fontFamily: "display",
                color: "amber.warm",
                fontVariantNumeric: "tabular-nums",
                lineHeight: "1",
                letterSpacing: "-0.02em",
              })}
            >
              &euro;{TOTAL_ACTUAL.toFixed(2)}
            </p>
          </div>

          {/* Status badge */}
          <div
            className={css({
              ml: { base: "0", md: "auto" },
            })}
          >
            <span
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1.5",
                fontSize: "label",
                fontWeight: "700",
                fontFamily: "display",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "amber.warm",
                bg: "rgba(201,146,42,0.12)",
                border: "1px solid rgba(201,146,42,0.3)",
                rounded: "pill",
                px: "4",
                py: "1.5",
              })}
            >
              <span style={{ fontSize: "12px" }}>&#10003;</span>
              {t.withinBudgetLabel}
            </span>
          </div>
        </div>

        {/* Note */}
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
          {t.noteText}
        </p>
      </div>
    </section>
  );
}
