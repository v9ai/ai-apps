"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  ro: {
    sectionLabel: "Excursii de o zi din Napoli",
    sectionTitle: "Pompei & Herculaneum",
    sectionSubtitle:
      "Două orase inghetate in timp, la 40 de minute cu trenul.",
    card1: {
      title: "Pompei",
      subtitle: "Lumea inghetata in 79 d.Hr.",
      transportLabel: "Cum ajungi",
      transport:
        "Circumvesuviana din Napoli Garibaldi → Pompei Scavi – Villa dei Misteri · 40 min · €2,90",
      entryLabel: "Intrare",
      entry: "€18 adulti, gratuit sub 18 ani",
      timeLabel: "Timp necesar",
      time: "3–5 ore",
      tipsLabel: "Sfaturi practice",
      tips: [
        "Ajunge la deschidere, ora 9 dimineata.",
        "Ia palarie, apa si protectie solara.",
        "Situl are 66 de hectare — incaltaminte comoda obligatorie.",
        "Audioghid: €8.",
        "Expozitia mulajelor din ipsos nu trebuie ratata.",
      ],
      budgetLabel: "Buget excursie",
      budget: "Tren €5,80 dus-intors + intrare €18 + mancare €10 = €34",
    },
    card2: {
      title: "Herculaneum",
      subtitle: "Mai mic. Mai putin vizitat. Mai bine conservat.",
      transportLabel: "Cum ajungi",
      transport:
        "Circumvesuviana din Napoli Garibaldi → Ercolano Scavi · 20 min · €2,90",
      entryLabel: "Intrare",
      entry: "€15 (sau €22 bilet combinat cu Pompei)",
      timeLabel: "Timp necesar",
      time: "1,5–2,5 ore",
      tipsLabel: "Sfaturi practice",
      tips: [
        "Conservarea organica este extraordinara — mobilier din lemn original, mancare in borcane, barca carbonizata.",
        "Combina cu Pompei in aceeasi zi folosind biletul combinat de €22.",
      ],
      budgetLabel: "Buget excursie",
      budget:
        "Tren €5,80 dus-intors + intrare €15 (sau €22 combinat) + mancare €10 = €31",
    },
    note: "Biletul combinat Pompei + Herculaneum (€22) este valabil 3 zile. Ambele situri sunt accesibile pe aceeasi linie Circumvesuviana din Napoli Garibaldi.",
  },
  en: {
    sectionLabel: "Day trips from Naples",
    sectionTitle: "Pompeii & Herculaneum",
    sectionSubtitle: "Two cities frozen in time, forty minutes away by train.",
    card1: {
      title: "Pompeii",
      subtitle: "The world frozen in 79 AD",
      transportLabel: "Getting there",
      transport:
        "Circumvesuviana from Napoli Garibaldi → Pompei Scavi – Villa dei Misteri · 40 min · €2.90",
      entryLabel: "Entry",
      entry: "€18 adults, free under 18",
      timeLabel: "Time needed",
      time: "3–5 hours",
      tipsLabel: "Practical tips",
      tips: [
        "Arrive at 9am opening.",
        "Bring hat, water, sunscreen.",
        "The site is 66 hectares — comfortable shoes essential.",
        "Audio guide: €8.",
        "Plaster cast exhibition not to be missed.",
      ],
      budgetLabel: "Day trip budget",
      budget: "Train €5.80 return + entry €18 + food €10 = €34",
    },
    card2: {
      title: "Herculaneum",
      subtitle: "Smaller. Less visited. Better preserved.",
      transportLabel: "Getting there",
      transport:
        "Circumvesuviana from Napoli Garibaldi → Ercolano Scavi · 20 min · €2.90",
      entryLabel: "Entry",
      entry: "€15 (or €22 combined with Pompeii ticket)",
      timeLabel: "Time needed",
      time: "1.5–2.5 hours",
      tipsLabel: "Practical tips",
      tips: [
        "The organic preservation here is extraordinary — original wooden furniture, food in jars, carbonised boat.",
        "Combine with Pompeii on the same day using the €22 combined ticket.",
      ],
      budgetLabel: "Day trip budget",
      budget:
        "Train €5.80 return + entry €15 (or €22 combined) + food €10 = €31",
    },
    note: "The combined Pompeii + Herculaneum ticket (€22) is valid for 3 days. Both sites are reachable on the same Circumvesuviana line from Napoli Garibaldi.",
  },
};

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={css({
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "3",
        alignItems: "baseline",
        py: "3",
        borderBottom: "1px solid",
        borderColor: "steel.border",
      })}
    >
      <span
        className={css({
          fontSize: "xs",
          color: "text.muted",
          fontFamily: "display",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          minW: "28",
        })}
      >
        {label}
      </span>
      <span
        className={css({
          fontSize: "meta",
          color: "text.secondary",
          lineHeight: "1.5",
        })}
      >
        {value}
      </span>
    </div>
  );
}

function SiteCard({
  title,
  subtitle,
  transportLabel,
  transport,
  entryLabel,
  entry,
  timeLabel,
  time,
  tipsLabel,
  tips,
  budgetLabel,
  budget,
  accent,
}: {
  title: string;
  subtitle: string;
  transportLabel: string;
  transport: string;
  entryLabel: string;
  entry: string;
  timeLabel: string;
  time: string;
  tipsLabel: string;
  tips: string[];
  budgetLabel: string;
  budget: string;
  accent: string;
}) {
  return (
    <div
      className={css({
        bg: "steel.surface",
        border: "1px solid",
        borderColor: "steel.border",
        rounded: "card",
        p: { base: "6", md: "8" },
        display: "flex",
        flexDir: "column",
        gap: "0",
        boxShadow: "card",
        transition: "border-color 0.2s, box-shadow 0.2s",
        _hover: {
          borderColor: "steel.borderHover",
          boxShadow: "card.hover",
        },
      })}
    >
      {/* ── Card header ── */}
      <div
        className={css({
          mb: "6",
        })}
      >
        <p
          className={css({
            fontSize: "xs",
            fontFamily: "display",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            mb: "2",
          })}
          style={{ color: accent }}
        >
          {subtitle}
        </p>
        <h3
          className={css({
            fontSize: "h3",
            fontWeight: "800",
            fontFamily: "display",
            letterSpacing: "-0.02em",
            lineHeight: "1",
            color: "text.primary",
          })}
        >
          {title}
        </h3>
      </div>

      {/* ── Data rows ── */}
      <div
        className={css({
          mb: "6",
        })}
      >
        <FieldRow label={transportLabel} value={transport} />
        <FieldRow label={entryLabel} value={entry} />
        <FieldRow label={timeLabel} value={time} />
      </div>

      {/* ── Tips ── */}
      <div
        className={css({
          mb: "6",
        })}
      >
        <p
          className={css({
            fontSize: "xs",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            mb: "3",
          })}
        >
          {tipsLabel}
        </p>
        <ul
          className={css({
            display: "flex",
            flexDir: "column",
            gap: "2",
            listStyle: "none",
            m: "0",
            p: "0",
          })}
        >
          {tips.map((tip, i) => (
            <li
              key={i}
              className={css({
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "3",
                alignItems: "start",
              })}
            >
              <span
                className={css({
                  w: "1",
                  h: "1",
                  rounded: "full",
                  bg: "steel.borderHover",
                  mt: "1.5",
                  flexShrink: "0",
                  display: "block",
                })}
              />
              <span
                className={css({
                  fontSize: "meta",
                  color: "text.secondary",
                  lineHeight: "1.6",
                })}
              >
                {tip}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Budget ── */}
      <div
        className={css({
          bg: "steel.raised",
          rounded: "pill",
          px: "4",
          py: "3",
          mt: "auto",
        })}
      >
        <p
          className={css({
            fontSize: "xs",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            mb: "1",
          })}
        >
          {budgetLabel}
        </p>
        <p
          className={css({
            fontSize: "meta",
            color: "text.primary",
            lineHeight: "1.5",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          {budget}
        </p>
      </div>
    </div>
  );
}

export function PompeiiGuide() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        animation: "fadeUp 0.6s ease-out",
      })}
    >
      {/* ── Section header ── */}
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
          {t.sectionLabel}
        </p>
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            letterSpacing: "-0.02em",
            lineHeight: "1",
            color: "text.primary",
            mb: "3",
          })}
        >
          {t.sectionTitle}
        </h2>
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* ── Two-col card grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
          gap: "5",
          mb: "6",
        })}
      >
        <SiteCard
          title={t.card1.title}
          subtitle={t.card1.subtitle}
          transportLabel={t.card1.transportLabel}
          transport={t.card1.transport}
          entryLabel={t.card1.entryLabel}
          entry={t.card1.entry}
          timeLabel={t.card1.timeLabel}
          time={t.card1.time}
          tipsLabel={t.card1.tipsLabel}
          tips={t.card1.tips}
          budgetLabel={t.card1.budgetLabel}
          budget={t.card1.budget}
          accent="var(--colors-amber-warm)"
        />
        <SiteCard
          title={t.card2.title}
          subtitle={t.card2.subtitle}
          transportLabel={t.card2.transportLabel}
          transport={t.card2.transport}
          entryLabel={t.card2.entryLabel}
          entry={t.card2.entry}
          timeLabel={t.card2.timeLabel}
          time={t.card2.time}
          tipsLabel={t.card2.tipsLabel}
          tips={t.card2.tips}
          budgetLabel={t.card2.budgetLabel}
          budget={t.card2.budget}
          accent="var(--colors-amber-bright)"
        />
      </div>

      {/* ── Footer note ── */}
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
    </section>
  );
}
