"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  ro: {
    sectionLabel: "Excursii de o zi din Napoli",
    sectionTitle: "Pompei & Herculaneum",
    sectionSubtitle:
      "Doua orase inghetate in timp, la 40 de minute cu trenul. Copiii sub 18 ani intra GRATUIT.",
    card1: {
      title: "Pompei",
      subtitle: "Lumea inghetata in 79 d.Hr.",
      transportLabel: "Cum ajungi",
      transport:
        "Circumvesuviana din Napoli Garibaldi → Pompei Scavi – Villa dei Misteri · 40 min · €2,90/pers.",
      entryLabel: "Intrare",
      entry: "2 adulti €36 · copil GRATUIT (sub 18 ani) · total familie: €36",
      timeLabel: "Timp necesar",
      time: "3–4 ore cu copilul",
      tipsLabel: "Sfaturi practice",
      tips: [
        "Ajunge la deschidere (ora 9) — situl devine cald si aglomerat pana la pranz.",
        "Ia 1,5L apa per persoana, palarii, protectie solara. Nu exista umbra pe sit.",
        "Sala mulajelor si Via dell'Abbondanza sunt punctele de atractie pentru copii.",
        "Audioghid (€8) are un traseu special pentru copii — merita.",
        "Cu copii mici, respecta circuitul principal — situl total are 66 ha.",
      ],
      budgetLabel: "Cost excursie familie",
      budget: "Tren 3×€2,90=€8,70 + intrare adulti €36 (copil gratuit) + mancare €15 = ~€60",
    },
    card2: {
      title: "Herculaneum",
      subtitle: "Mai mic. Mai putin vizitat. Mai bine conservat.",
      transportLabel: "Cum ajungi",
      transport:
        "Circumvesuviana din Napoli Garibaldi → Ercolano Scavi · 20 min · €2,90/pers.",
      entryLabel: "Intrare",
      entry: "2 adulti €30 · copil GRATUIT (sub 18 ani) · bilet combinat 2 adulti: €44",
      timeLabel: "Timp necesar",
      time: "1,5–2 ore",
      tipsLabel: "Sfaturi practice",
      tips: [
        "Mai putin expus decat Pompei — optiune mai buna pe caldura mare cu copilul.",
        "Mobilierul din lemn, resturile de mancare si barca sunt extraordinare chiar si pentru copii.",
        "Biletul combinat Pompei + Herculaneum (€22/adult) economiseste €11 per adult.",
      ],
      budgetLabel: "Cost excursie familie",
      budget: "Tren 3×€2,90=€8,70 + intrare adulti €30 (copil gratuit) + mancare €12 = ~€51",
    },
    note: "Ambele situri: copiii sub 18 ani GRATUIT. Biletul combinat pentru adulti (€22) valabil 3 zile acopera ambele situri. Aduci mancare din Napoli — cafenelele de pe sit sunt scumpe.",
  },
  en: {
    sectionLabel: "Day trips from Naples",
    sectionTitle: "Pompeii & Herculaneum",
    sectionSubtitle: "Two cities frozen in time, forty minutes away by train. Children under 18 enter FREE.",
    card1: {
      title: "Pompeii",
      subtitle: "The world frozen in 79 AD",
      transportLabel: "Getting there",
      transport:
        "Circumvesuviana from Napoli Garibaldi → Pompei Scavi – Villa dei Misteri · 40 min · €2.90/person",
      entryLabel: "Entry",
      entry: "2 adults €36 · child FREE (under 18) · family total: €36",
      timeLabel: "Time needed",
      time: "3–4 hours with a child",
      tipsLabel: "Practical tips",
      tips: [
        "Arrive at 9am opening — site gets hot and crowded by noon.",
        "Bring 1.5L water per person, hats, sunscreen. No shade on site.",
        "The plaster cast room and Via dell'Abbondanza are highlights for children.",
        "Audio guide (€8) has a children's trail — worth it.",
        "Stick to the main circuit with young children — the full site is 66 ha.",
      ],
      budgetLabel: "Family day trip cost",
      budget: "Train 3×€2.90=€8.70 + adults entry €36 (child free) + food €15 = ~€60",
    },
    card2: {
      title: "Herculaneum",
      subtitle: "Smaller. Less visited. Better preserved.",
      transportLabel: "Getting there",
      transport:
        "Circumvesuviana from Napoli Garibaldi → Ercolano Scavi · 20 min · €2.90/person",
      entryLabel: "Entry",
      entry: "2 adults €30 · child FREE (under 18) · combined ticket 2 adults: €44",
      timeLabel: "Time needed",
      time: "1.5–2 hours",
      tipsLabel: "Practical tips",
      tips: [
        "Less exposed than Pompeii — better option in summer heat with a child.",
        "The wooden furniture, food remains, and boat are extraordinary even for children.",
        "Combined Pompeii + Herculaneum ticket (€22/adult) saves €11 per adult.",
      ],
      budgetLabel: "Family day trip cost",
      budget: "Train 3×€2.90=€8.70 + adults entry €30 (child free) + food €12 = ~€51",
    },
    note: "Both sites: children under 18 FREE. Combined adult ticket (€22) valid 3 days covers both sites — best value if visiting both. Bring food from Naples — on-site cafes are overpriced.",
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
