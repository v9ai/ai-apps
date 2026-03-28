"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  ro: {
    title: "Cum te deplasezi",
    subtitle: "Napoli · 5 zile · buget transport €60",
    sectionAnm: "Reteaua ANM — in interiorul Napolului",
    sectionAirport: "Aeroport",
    sectionDayTrips: "Excursii cu trenul",
    sectionCapri: "Catre Capri",
    sectionBudget: "Defalcare buget 5 zile",
    walkingNote:
      "Centro Storico se strabate in 30 de minute pe jos. Orasul este extrem de prietenos pentru pietoni — pastreaza abonamentele pentru Vomero si Capri.",
    validLabel: "valabil",
    minLabel: "min",
    fromLabel: "din",
    returnLabel: "dus-intors",
    oneWayLabel: "dus",
    bestValue: "CEL MAI BUN PRET",
    totalLabel: "Total estimat",
    withinBudget: "in limita bugetului (€60 + rezerva)",
    budgetItems: [
      { label: "Abonament ANM 3 zile", amount: "€12.00" },
      { label: "2 bilete individuale", amount: "€2.20" },
      { label: "Circumvesuviana retur", amount: "€5.80" },
      { label: "Hidrobarca Capri retur", amount: "€44.00" },
      { label: "Naveta aeroport (Alibus)", amount: "€5.00" },
    ],
    totalAmount: "€69.00",
    includes: "Include",
    funicular: "Toate cele 4 linii de funicular incluse in abonamente",
  },
  en: {
    title: "Getting Around",
    subtitle: "Naples · 5 days · transport budget €60",
    sectionAnm: "ANM Network — Within Naples",
    sectionAirport: "Airport",
    sectionDayTrips: "Day Trips by Train",
    sectionCapri: "To Capri",
    sectionBudget: "5-Day Budget Breakdown",
    walkingNote:
      "The Centro Storico is 30 min end-to-end on foot. The city is highly walkable — save the passes for Vomero and Capri.",
    validLabel: "valid",
    minLabel: "min",
    fromLabel: "from",
    returnLabel: "return",
    oneWayLabel: "one-way",
    bestValue: "BEST VALUE",
    totalLabel: "Estimated Total",
    withinBudget: "within budget (€60 + buffer)",
    budgetItems: [
      { label: "3-day ANM pass", amount: "€12.00" },
      { label: "2 single tickets", amount: "€2.20" },
      { label: "Circumvesuviana return", amount: "€5.80" },
      { label: "Capri hydrofoil return", amount: "€44.00" },
      { label: "Airport shuttle (Alibus)", amount: "€5.00" },
    ],
    totalAmount: "€69.00",
    includes: "Includes",
    funicular: "All 4 funicular lines included in passes",
  },
};

type Lang = "en" | "ro";

interface TransportRow {
  name: (t: (typeof T)[Lang]) => string;
  price: string;
  detail: (t: (typeof T)[Lang]) => string;
  badge?: (t: (typeof T)[Lang]) => string;
}

const ANM_ROWS: TransportRow[] = [
  {
    name: () => "Biglietto integrato",
    price: "€1.10",
    detail: (t) => `90 min ${t.validLabel} · metro + buses + funicular`,
  },
  {
    name: () => "Biglietto giornaliero",
    price: "€4.50",
    detail: (t) => `1 day ${t.validLabel}`,
  },
  {
    name: () => "Abbonamento 3 giorni",
    price: "€12.00",
    detail: (t) => `3 days ${t.validLabel}`,
    badge: (t) => t.bestValue,
  },
];

const AIRPORT_ROWS: TransportRow[] = [
  {
    name: () => "Alibus (NAP → P. Garibaldi)",
    price: "€5.00",
    detail: (t) => `20–30 ${t.minLabel}`,
  },
  {
    name: () => "Taxi (tariffa fissa)",
    price: "€25–35",
    detail: () => "central Naples",
  },
  {
    name: () => "ANM Line 3S",
    price: "€1.10",
    detail: (t) => `slower · budget option`,
  },
];

const DAYTRIP_ROWS: TransportRow[] = [
  {
    name: () => "Circumvesuviana → Pompeii",
    price: "€2.90",
    detail: (t) =>
      `${t.oneWayLabel} · 40 ${t.minLabel} · ${t.fromLabel} Napoli Garibaldi`,
  },
  {
    name: () => "Circumvesuviana → Herculaneum",
    price: "€2.90",
    detail: (t) =>
      `${t.oneWayLabel} · 20 ${t.minLabel} · ${t.fromLabel} Napoli Garibaldi`,
  },
];

const CAPRI_ROWS: TransportRow[] = [
  {
    name: () => "Aliscafo (hydrofoil)",
    price: "€22–25",
    detail: (t) =>
      `${t.returnLabel} · 50 ${t.minLabel} · Molo Beverello`,
  },
  {
    name: () => "Traghetto (ferry)",
    price: "€14–18",
    detail: (t) =>
      `${t.returnLabel} · 75–80 ${t.minLabel} · Molo Beverello`,
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
  row: TransportRow;
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
      {/* Left: name + detail */}
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
            {row.name(t)}
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

export function TransportGuide() {
  const { lang } = useLang();
  const t = T[lang];

  const sections: Array<{ label: string; rows: TransportRow[] }> = [
    { label: t.sectionAnm, rows: ANM_ROWS },
    { label: t.sectionAirport, rows: AIRPORT_ROWS },
    { label: t.sectionDayTrips, rows: DAYTRIP_ROWS },
    { label: t.sectionCapri, rows: CAPRI_ROWS },
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
        },
        transition: "border-color 0.2s",
      })}
    >
      {/* ── Header ── */}
      <div
        className={css({
          mb: "6",
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

      {/* ── Transport sections ── */}
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

      {/* ── Funicular note ── */}
      <p
        className={css({
          fontSize: "xs",
          color: "text.faint",
          mt: "4",
          lineHeight: "1.5",
        })}
      >
        {t.includes}: {t.funicular}
      </p>

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
          <div>
            <span
              className={css({
                fontSize: "label",
                fontFamily: "display",
                fontWeight: "700",
                color: "text.primary",
                display: "block",
              })}
            >
              {t.totalLabel}
            </span>
            <span
              className={css({
                fontSize: "xs",
                color: "text.faint",
              })}
            >
              {t.withinBudget}
            </span>
          </div>
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

      {/* ── Walking note ── */}
      <p
        className={css({
          fontSize: "xs",
          color: "text.faint",
          borderTop: "1px solid",
          borderColor: "steel.border",
          mt: "6",
          pt: "4",
          lineHeight: "1.6",
          fontStyle: "italic",
        })}
      >
        {t.walkingNote}
      </p>
    </div>
  );
}
