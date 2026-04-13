"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { DAYS } from "../constants";

const T = {
  en: {
    title: "Getting Around the Island",
    subtitle: "Ischia · buses, water taxis, and walking",
    sectionBus: "EAV Bus Network",
    sectionWaterTaxi: "Water Taxis",
    sectionMicrotaxi: "Microtaxis",
    sectionBudget: `${DAYS}-Day Transport Budget`,
    validLabel: "valid",
    minLabel: "min",
    bestValue: "BEST VALUE",
    perPerson: "per person",
    perBoat: "per boat",
    perRide: "per ride",
    busNote:
      "Two circular lines cover the entire island: CD (clockwise via Forio) and CS (counter-clockwise via Barano). Buses run 5:30–midnight, every 15–20 min.",
    waterTaxiNote: "Last return from Sorgeto at 23:00 in summer",
    microtaxiNote:
      "Sant'Angelo is car-free — microtaxis carry luggage to hotels. Fun ride for kids.",
    totalLabel: "Estimated Total",
    totalAmount: "€75–90",
    budgetItems: [
      { label: "Week bus pass (×3)", amount: "€45" },
      { label: "Water taxis (3 trips)", amount: "€30–45" },
    ],
  },
  ro: {
    title: "Deplasarea pe Insulă",
    subtitle: "Ischia · autobuze, taxiuri nautice și mers pe jos",
    sectionBus: "Rețeaua de autobuze EAV",
    sectionWaterTaxi: "Taxiuri nautice",
    sectionMicrotaxi: "Microtaxiuri",
    sectionBudget: `Buget transport ${DAYS} zile`,
    validLabel: "valabil",
    minLabel: "min",
    bestValue: "CEL MAI BUN PREȚ",
    perPerson: "per persoană",
    perBoat: "per barcă",
    perRide: "per cursă",
    busNote:
      "Două linii circulare acoperă întreaga insulă: CD (orar prin Forio) și CS (antiorar prin Barano). Autobuzele circulă 5:30–miezul nopții, la fiecare 15–20 min.",
    waterTaxiNote: "Ultima cursă de retur de la Sorgeto la 23:00 vara",
    microtaxiNote:
      "Sant'Angelo este fără mașini — microtaxiurile transportă bagajele la hoteluri. Plimbare distractivă pentru copii.",
    totalLabel: "Total estimat",
    totalAmount: "€75–90",
    budgetItems: [
      { label: "Abonament săptămânal autobuz (×3)", amount: "€45" },
      { label: "Taxiuri nautice (3 curse)", amount: "€30–45" },
    ],
  },
};

type Lang = "en" | "ro";

interface TransportRow {
  name: (t: (typeof T)[Lang]) => string;
  price: string;
  detail: (t: (typeof T)[Lang]) => string;
  badge?: (t: (typeof T)[Lang]) => string;
}

const BUS_ROWS: TransportRow[] = [
  {
    name: () => "Single ticket",
    price: "€1.50",
    detail: (t) => `90 ${t.minLabel} ${t.validLabel}`,
  },
  {
    name: () => "Day pass",
    price: "€6.00",
    detail: () => "unlimited rides",
    badge: (t) => t.bestValue,
  },
  {
    name: () => "Week pass",
    price: "€15.00",
    detail: () => "unlimited rides",
  },
];

const WATER_TAXI_ROWS: TransportRow[] = [
  {
    name: () => "Sant'Angelo → Maronti Beach",
    price: "€5",
    detail: (t) => t.perPerson,
  },
  {
    name: () => "Sant'Angelo → Sorgeto Bay",
    price: "€7",
    detail: (t) => t.perPerson,
  },
  {
    name: () => "Ischia Porto → Sorgeto (charter)",
    price: "€60–80",
    detail: (t) => t.perBoat,
  },
];

const MICROTAXI_ROWS: TransportRow[] = [
  {
    name: () => "Ape three-wheelers (Sant'Angelo)",
    price: "€3–5",
    detail: (t) => t.perRide,
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

function SectionNote({ text }: { text: string }) {
  return (
    <p
      className={css({
        fontSize: "xs",
        color: "text.faint",
        lineHeight: "1.6",
        fontStyle: "italic",
        mt: "2",
        mb: "2",
      })}
    >
      {text}
    </p>
  );
}

export function IslandTransport() {
  const { lang } = useLang();
  const t = T[lang];

  const sections: Array<{
    label: string;
    rows: TransportRow[];
    note?: string;
  }> = [
    { label: t.sectionBus, rows: BUS_ROWS, note: t.busNote },
    { label: t.sectionWaterTaxi, rows: WATER_TAXI_ROWS, note: t.waterTaxiNote },
    { label: t.sectionMicrotaxi, rows: MICROTAXI_ROWS, note: t.microtaxiNote },
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
          {section.note && <SectionNote text={section.note} />}
        </div>
      ))}

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
