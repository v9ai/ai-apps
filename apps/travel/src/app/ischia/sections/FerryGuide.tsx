"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  en: {
    title: "Getting to Ischia",
    subtitle:
      "All routes go through Naples — fly to NAP, then ferry to Ischia Porto or Casamicciola",
    sectionHydrofoil: "Hydrofoil (Aliscafo)",
    sectionSlowFerry: "Slow Ferry (Traghetto)",
    sectionBudget: "Ferry Budget Summary",
    oneWayLabel: "one-way",
    minLabel: "min",
    bestValue: "BEST VALUE",
    cheapest: "CHEAPEST",
    familyTipTitle: "Family Tip",
    familyTip:
      "Take the slow ferry with young children — less rocking, cheaper, and the car deck lets kids walk around. Book morning departures (8:00–9:00) to maximize your first day on the island.",
    budgetItems: [
      { label: "Return ferry (3 people, slow)", amount: "€75" },
      { label: "Return ferry (3 people, hydrofoil)", amount: "€114–120" },
    ],
    totalLabel: "Budget pick (slow ferry)",
    totalAmount: "€75",
  },
  ro: {
    title: "Cum ajungi la Ischia",
    subtitle:
      "Toate rutele trec prin Napoli — zbor la NAP, apoi feribot la Ischia Porto sau Casamicciola",
    sectionHydrofoil: "Hidrobarcă (Aliscafo)",
    sectionSlowFerry: "Feribot lent (Traghetto)",
    sectionBudget: "Sumar buget feribot",
    oneWayLabel: "dus",
    minLabel: "min",
    bestValue: "CEL MAI BUN PREȚ",
    cheapest: "CEL MAI IEFTIN",
    familyTipTitle: "Sfat pentru familii",
    familyTip:
      "Luați feribotul lent cu copii mici — se leagănă mai puțin, este mai ieftin și puntea auto le permite copiilor să se plimbe. Rezervați plecări dimineața (8:00–9:00) pentru a maximiza prima zi pe insulă.",
    budgetItems: [
      { label: "Feribot retur (3 persoane, lent)", amount: "€75" },
      { label: "Feribot retur (3 persoane, hidrobarcă)", amount: "€114–120" },
    ],
    totalLabel: "Varianta economică (feribot lent)",
    totalAmount: "€75",
  },
};

type Lang = "en" | "ro";

interface FerryRow {
  name: string;
  route: string;
  price: string;
  detail: (t: (typeof T)[Lang]) => string;
  badge?: (t: (typeof T)[Lang]) => string;
}

const HYDROFOIL_ROWS: FerryRow[] = [
  {
    name: "Alilauro",
    route: "Molo Beverello → Ischia Porto",
    price: "€20",
    detail: (t) => `${t.oneWayLabel} · 60 ${t.minLabel}`,
  },
  {
    name: "SNAV",
    route: "Molo Beverello → Casamicciola",
    price: "€19",
    detail: (t) => `${t.oneWayLabel} · 55 ${t.minLabel}`,
    badge: (t) => t.bestValue,
  },
];

const SLOW_FERRY_ROWS: FerryRow[] = [
  {
    name: "Medmar",
    route: "Calata Porto di Massa → Ischia Porto",
    price: "€13",
    detail: (t) => `${t.oneWayLabel} · 90 ${t.minLabel}`,
  },
  {
    name: "Caremar",
    route: "Calata Porto di Massa → Ischia Porto",
    price: "€12.50",
    detail: (t) => `${t.oneWayLabel} · 90 ${t.minLabel}`,
  },
  {
    name: "Caremar (Pozzuoli)",
    route: "Pozzuoli → Ischia",
    price: "€10",
    detail: (t) => `${t.oneWayLabel} · 60 ${t.minLabel}`,
    badge: (t) => t.cheapest,
  },
];

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      className={css({
        fontSize: "meta",
        color: "text.muted",
        fontFamily: "display",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        mb: "3",
        mt: "7",
        _first: { mt: "0" },
      })}
    >
      {label}
    </p>
  );
}

function RowItem({
  row,
  t,
}: {
  row: FerryRow;
  t: (typeof T)[Lang];
}) {
  const badge = row.badge?.(t);
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "4",
        py: "3",
        borderBottom: "1px solid",
        borderColor: "steel.border",
        _last: { borderBottom: "none" },
      })}
    >
      {/* Left: name + route + detail */}
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          gap: "1",
          minW: "0",
        })}
      >
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
              fontSize: "body",
              color: "text.primary",
              lineHeight: "1.3",
            })}
          >
            {row.name}
          </span>
          {badge && (
            <span
              className={css({
                fontSize: "2xs",
                fontFamily: "display",
                letterSpacing: "0.08em",
                fontWeight: "700",
                color: "amber.warm",
                border: "1px solid",
                borderColor: "amber.warm",
                rounded: "pill",
                px: "2",
                py: "0.5",
                lineHeight: "1.4",
                whiteSpace: "nowrap",
              })}
            >
              {badge}
            </span>
          )}
        </div>
        <span
          className={css({
            fontSize: "xs",
            color: "text.secondary",
            lineHeight: "1.4",
          })}
        >
          {row.route}
        </span>
        <span
          className={css({
            fontSize: "xs",
            color: "text.muted",
            lineHeight: "1.4",
          })}
        >
          {row.detail(t)}
        </span>
      </div>

      {/* Right: price */}
      <span
        className={css({
          fontSize: "label",
          fontFamily: "display",
          fontVariantNumeric: "tabular-nums",
          color: "text.primary",
          whiteSpace: "nowrap",
          flexShrink: "0",
        })}
      >
        {row.price}
      </span>
    </div>
  );
}

export function FerryGuide() {
  const { lang } = useLang();
  const t = T[lang];

  const sections: Array<{ label: string; rows: FerryRow[] }> = [
    { label: t.sectionHydrofoil, rows: HYDROFOIL_ROWS },
    { label: t.sectionSlowFerry, rows: SLOW_FERRY_ROWS },
  ];

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
          boxShadow: "card.hover",
        },
        transition: "border-color 0.2s",
      })}
    >
      {/* ── Header ── */}
      <div className={css({ mb: "6" })}>
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
            fontSize: "h3",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "1.1",
            color: "text.primary",
            letterSpacing: "-0.02em",
          })}
        >
          {t.subtitle}
        </p>
      </div>

      {/* ── Ferry sections ── */}
      {sections.map((section) => (
        <div key={section.label}>
          <SectionLabel label={section.label} />
          <div
            className={css({
              bg: "steel.raised",
              rounded: "card",
              px: { base: "4", md: "5" },
              mb: "2",
            })}
          >
            {section.rows.map((row, i) => (
              <RowItem key={i} row={row} t={t} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Family Tip ── */}
      <div
        className={css({
          mt: "8",
          bg: "steel.raised",
          rounded: "card",
          borderLeft: "3px solid",
          borderColor: "amber.warm",
          px: { base: "5", md: "6" },
          py: "5",
        })}
      >
        <p
          className={css({
            fontSize: "meta",
            color: "amber.warm",
            fontFamily: "display",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: "700",
            mb: "2",
          })}
        >
          {t.familyTipTitle}
        </p>
        <p
          className={css({
            fontSize: "xs",
            color: "text.secondary",
            lineHeight: "1.7",
          })}
        >
          {t.familyTip}
        </p>
      </div>

      {/* ── Budget breakdown ── */}
      <div
        className={css({
          mt: "8",
          pt: "6",
          borderTop: "1px solid",
          borderColor: "steel.border",
        })}
      >
        <p
          className={css({
            fontSize: "meta",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            mb: "4",
          })}
        >
          {t.sectionBudget}
        </p>

        <div
          className={css({
            display: "flex",
            flexDir: "column",
            gap: "0",
          })}
        >
          {t.budgetItems.map((item, i) => (
            <div
              key={i}
              className={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                py: "2",
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              <span
                className={css({
                  fontSize: "xs",
                  color: "text.secondary",
                })}
              >
                {item.label}
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  fontFamily: "display",
                  fontVariantNumeric: "tabular-nums",
                  color: "text.primary",
                })}
              >
                {item.amount}
              </span>
            </div>
          ))}
        </div>

        {/* Total row */}
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            mt: "3",
            pt: "3",
          })}
        >
          <span
            className={css({
              fontSize: "label",
              fontFamily: "display",
              fontWeight: "700",
              color: "text.primary",
            })}
          >
            {t.totalLabel}
          </span>
          <span
            className={css({
              fontSize: "h3",
              fontFamily: "display",
              fontWeight: "800",
              fontVariantNumeric: "tabular-nums",
              color: "amber.warm",
              letterSpacing: "-0.02em",
            })}
          >
            {t.totalAmount}
          </span>
        </div>
      </div>
    </div>
  );
}
