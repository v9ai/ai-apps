"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const T = {
  en: {
    title: "Budget Breakdown",
    subtitle: "Where to spend, where to save, and what to expect.",
    col1Title: "Where to Save",
    col2Title: "Where to Splurge",
    col3Title: "Good to Know",
    save: [
      "Always stand at the bar for espresso. Sitting costs 2–3x more.",
      "Avoid restaurants on Capri. Pack lunch or eat on the ferry.",
      "Use the 3-day ANM pass (€12) instead of single tickets.",
      "Shoulder season flights are 30–40% cheaper (Oct–Nov, Mar–Apr).",
      "Buy combined Pompeii + Herculaneum ticket: €22 vs €33 separate.",
    ],
    splurge: [
      "One proper sit-down dinner in Naples (€25–35). Worth it.",
      "Hydrofoil to Capri over ferry — 30 min faster, more comfortable.",
      "MANN museum: don't rush it. Give it half a day.",
      "A pastry from Pasticceria Capriccio or Pintauro sfogliatelle.",
    ],
    know: [
      "Solo: €1,000 is very comfortable in shoulder season.",
      "Two people: €1,000 total (€500 each) works in low season.",
      "July–August adds ~30% to hotel and ferry prices.",
      "Most attractions near Spaccanapoli are free or under €18.",
      "The city is cash-heavy — carry small bills.",
    ],
    seasonTitle: "Seasonal Pricing",
    seasonHeaders: ["Season", "Flights", "Hotels", "Crowds", "Verdict"],
    seasons: [
      {
        name: "Spring (Apr–May)",
        flights: "down",
        hotels: "down-down",
        crowds: "down",
        verdict: "Best Value",
        highlight: false,
      },
      {
        name: "Summer (Jun–Aug)",
        flights: "neutral",
        hotels: "up-up",
        crowds: "up-up",
        verdict: "Avoid if budget-conscious",
        highlight: true,
      },
      {
        name: "Autumn (Sep–Oct)",
        flights: "down",
        hotels: "down",
        crowds: "down",
        verdict: "Excellent",
        highlight: false,
      },
      {
        name: "Winter (Nov–Mar)",
        flights: "down-down",
        hotels: "down-down",
        crowds: "down-down",
        verdict: "Cheapest",
        highlight: false,
      },
    ],
  },
  ro: {
    title: "Planificare Buget",
    subtitle: "Unde cheltuiesti, unde economisesti si la ce sa te astepti.",
    col1Title: "Unde Economisesti",
    col2Title: "Unde Merită",
    col3Title: "Util de Stiut",
    save: [
      "Bea espresso la bar, nu la masa. La masa costă de 2–3x mai mult.",
      "Evita restaurantele din Capri. Ia prânzul cu tine sau manânca pe feribot.",
      "Foloseste abonamentul ANM de 3 zile (€12) în loc de bilete individuale.",
      "Zborurile în extrasezon sunt cu 30–40% mai ieftine (oct–nov, mar–apr).",
      "Cumpara biletul combinat Pompei + Herculaneum: €22 față de €33 separat.",
    ],
    splurge: [
      "O cina adevarata la restaurant în Napoli (€25–35). Merită.",
      "Hidrofolia spre Capri în loc de feribot — cu 30 min mai rapid, mai confortabil.",
      "Muzeul MANN: nu-l grabi. Rezerva-i jumătate de zi.",
      "O prajitura de la Pasticceria Capriccio sau sfogliatelle de la Pintauro.",
    ],
    know: [
      "Solo: €1.000 e foarte confortabil în extrasezon.",
      "Doi oameni: €1.000 total (€500 fiecare) merge în sezon slab.",
      "Iulie–august adaugă ~30% la pretul hotelurilor si feriboturilor.",
      "Majoritatea atractiilor din zona Spaccanapoli sunt gratuite sau sub €18.",
      "Orasul functioneaza mult pe numerar — ai bancnote mici la tine.",
    ],
    seasonTitle: "Preturi pe Sezoane",
    seasonHeaders: ["Sezon", "Zboruri", "Hoteluri", "Aglomeratie", "Concluzie"],
    seasons: [
      {
        name: "Primavara (apr–mai)",
        flights: "down",
        hotels: "down-down",
        crowds: "down",
        verdict: "Cea mai buna valoare",
        highlight: false,
      },
      {
        name: "Vara (iun–aug)",
        flights: "neutral",
        hotels: "up-up",
        crowds: "up-up",
        verdict: "Evita daca ai buget redus",
        highlight: true,
      },
      {
        name: "Toamna (sep–oct)",
        flights: "down",
        hotels: "down",
        crowds: "down",
        verdict: "Excelent",
        highlight: false,
      },
      {
        name: "Iarna (nov–mar)",
        flights: "down-down",
        hotels: "down-down",
        crowds: "down-down",
        verdict: "Cel mai ieftin",
        highlight: false,
      },
    ],
  },
};

const trendLabel: Record<string, string> = {
  "down-down": "↓↓",
  down: "↓",
  neutral: "→",
  up: "↑",
  "up-up": "↑↑",
};

const trendColor: Record<string, string> = {
  "down-down": "token(colors.amber.warm)",
  down: "token(colors.amber.warm)",
  neutral: "token(colors.text.secondary)",
  up: "token(colors.text.muted)",
  "up-up": "token(colors.text.muted)",
};

export function TripSummary() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        bg: "steel.dark",
        color: "text.primary",
        py: { base: "12", md: "20" },
        px: { base: "5", md: "8" },
      })}
    >
      {/* ── Section header ── */}
      <div
        className={css({
          mb: { base: "10", md: "14" },
        })}
      >
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "h2",
            letterSpacing: "h2",
            color: "text.primary",
          })}
        >
          {t.title}
        </h2>
        <p
          className={css({
            mt: "3",
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
          })}
        >
          {t.subtitle}
        </p>
      </div>

      {/* ── 3-column grid ── */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
          gap: { base: "4", md: "6" },
          mb: { base: "10", md: "14" },
        })}
      >
        {/* Column 1 — Where to Save */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            borderRadius: "card",
            boxShadow: "card",
            p: { base: "6", md: "7" },
            _hover: {
              borderColor: "steel.borderHover",
              boxShadow: "card.hover",
            },
            transition: "border-color 0.2s, box-shadow 0.2s",
          })}
        >
          <h3
            className={css({
              fontSize: "h4",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              mb: "5",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            })}
          >
            {t.col1Title}
          </h3>
          <ul
            className={css({
              listStyle: "none",
              m: "0",
              p: "0",
              display: "flex",
              flexDir: "column",
              gap: "4",
            })}
          >
            {t.save.map((item, i) => (
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
                    w: "1",
                    h: "1",
                    minW: "6px",
                    minH: "6px",
                    borderRadius: "full",
                    bg: "amber.warm",
                    display: "block",
                    mt: "7px",
                  })}
                />
                <span
                  className={css({
                    fontSize: "label",
                    color: "text.secondary",
                    lineHeight: "label",
                  })}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2 — Where to Splurge */}
        <div
          className={css({
            bg: "steel.raised",
            border: "1px solid",
            borderColor: "amber.warm",
            borderRadius: "card",
            boxShadow: "card",
            p: { base: "6", md: "7" },
            _hover: {
              borderColor: "amber.bright",
              boxShadow: "card.hover",
            },
            transition: "border-color 0.2s, box-shadow 0.2s",
          })}
        >
          <h3
            className={css({
              fontSize: "h4",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.bright",
              mb: "5",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            })}
          >
            {t.col2Title}
          </h3>
          <ul
            className={css({
              listStyle: "none",
              m: "0",
              p: "0",
              display: "flex",
              flexDir: "column",
              gap: "4",
            })}
          >
            {t.splurge.map((item, i) => (
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
                    borderRadius: "full",
                    bg: "amber.bright",
                    display: "block",
                    mt: "7px",
                    minW: "6px",
                    minH: "6px",
                  })}
                />
                <span
                  className={css({
                    fontSize: "label",
                    color: "text.secondary",
                    lineHeight: "label",
                  })}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Good to Know */}
        <div
          className={css({
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "steel.border",
            borderRadius: "card",
            boxShadow: "card",
            p: { base: "6", md: "7" },
            _hover: {
              borderColor: "steel.borderHover",
              boxShadow: "card.hover",
            },
            transition: "border-color 0.2s, box-shadow 0.2s",
          })}
        >
          <h3
            className={css({
              fontSize: "h4",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              mb: "5",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            })}
          >
            {t.col3Title}
          </h3>
          <ul
            className={css({
              listStyle: "none",
              m: "0",
              p: "0",
              display: "flex",
              flexDir: "column",
              gap: "4",
            })}
          >
            {t.know.map((item, i) => (
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
                    borderRadius: "full",
                    bg: "amber.warm",
                    display: "block",
                    mt: "7px",
                    minW: "6px",
                    minH: "6px",
                  })}
                />
                <span
                  className={css({
                    fontSize: "label",
                    color: "text.secondary",
                    lineHeight: "label",
                  })}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Seasonal pricing table ── */}
      <div
        className={css({
          bg: "steel.surface",
          border: "1px solid",
          borderColor: "steel.border",
          borderRadius: "card",
          overflow: "hidden",
        })}
      >
        <div
          className={css({
            px: { base: "5", md: "7" },
            py: { base: "4", md: "5" },
            borderBottom: "1px solid",
            borderColor: "steel.border",
          })}
        >
          <h3
            className={css({
              fontSize: "h4",
              fontWeight: "700",
              fontFamily: "display",
              color: "text.primary",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            })}
          >
            {t.seasonTitle}
          </h3>
        </div>

        {/* Table header */}
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr",
            px: { base: "5", md: "7" },
            py: "3",
            borderBottom: "1px solid",
            borderColor: "steel.border",
            bg: "steel.raised",
          })}
        >
          {t.seasonHeaders.map((header) => (
            <span
              key={header}
              className={css({
                fontSize: "xs",
                fontWeight: "600",
                fontFamily: "display",
                color: "text.muted",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              })}
            >
              {header}
            </span>
          ))}
        </div>

        {/* Table rows */}
        {t.seasons.map((row, i) => (
          <div
            key={i}
            className={css({
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr",
              px: { base: "5", md: "7" },
              py: { base: "3", md: "4" },
              borderBottom:
                i < t.seasons.length - 1 ? "1px solid" : undefined,
              borderColor: "steel.border",
              bg: row.highlight ? "steel.raised" : "transparent",
              _hover: { bg: "steel.raised" },
              transition: "background 0.15s",
              alignItems: "center",
            })}
          >
            <span
              className={css({
                fontSize: "label",
                fontWeight: "600",
                color: "text.primary",
              })}
            >
              {row.name}
            </span>
            <span
              className={css({
                fontSize: "label",
                fontWeight: "700",
                fontFamily: "display",
              })}
              style={{ color: trendColor[row.flights] }}
            >
              {trendLabel[row.flights]}
            </span>
            <span
              className={css({
                fontSize: "label",
                fontWeight: "700",
                fontFamily: "display",
              })}
              style={{ color: trendColor[row.hotels] }}
            >
              {trendLabel[row.hotels]}
            </span>
            <span
              className={css({
                fontSize: "label",
                fontWeight: "700",
                fontFamily: "display",
              })}
              style={{ color: trendColor[row.crowds] }}
            >
              {trendLabel[row.crowds]}
            </span>
            <span
              className={css({
                fontSize: "meta",
                fontWeight: "600",
                color: row.highlight ? "text.muted" : "amber.warm",
                fontFamily: "display",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              })}
            >
              {row.verdict}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
