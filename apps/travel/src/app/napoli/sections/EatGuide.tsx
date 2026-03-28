"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { DAYS } from "../constants";

const T = {
  ro: {
    label: "Mâncare & Băutură",
    title: "Ghid de prețuri",
    subtitle: `Napoli · ${DAYS} zile · buget alocat €180`,
    priceRef: "Referință prețuri",
    dailyStrategy: "Strategie zilnică",
    recommended: "RECOMANDAT",
    budgetTarget: `€180 din €1.000 = €${Math.round(180 / DAYS)}/zi pentru ${DAYS} zile. Realizabil pe strategia echilibrata.`,
    etiquetteTitle: "Eticheta cafelei napolitane",
    etiquetteBody:
      "Bea întotdeauna espresso-ul stând la bar. A sta pe scaun costă de 2–3 ori mai mult. Espresso-ul din Napoli este cel mai bun din Italia — nu e un sacrificiu.",
    items: [
      { label: "Espresso la bar",         price: "€1,10" },
      { label: "Sfogliatella",            price: "€1,50–2" },
      { label: "Pizza (în picioare)",     price: "€4–6" },
      { label: "Pizza (la masă)",         price: "€6–8" },
      { label: "Cuoppo fritto",           price: "€3–5" },
      { label: "Frittatina di pasta",     price: "€1,50–2,50" },
      { label: "Prânz la trattoria",      price: "€12–18" },
      { label: "Cină cu vin",             price: "€20–35" },
      { label: "Limoncello",              price: "€2–3" },
      { label: "Înghețată (2 mingi)",     price: "€2,50–3,50" },
    ],
    tiers: [
      {
        key: "frugal",
        label: "Econom",
        range: "€20–25/zi",
        items: [
          "Mic dejun la bar (€2,50)",
          "Pizza stradală (€5)",
          "Cină de la supermarket (€8)",
        ],
      },
      {
        key: "balanced",
        label: "Echilibrat",
        range: "€30–35/zi",
        items: [
          "Espresso + patiserie la bar (€3)",
          "Pizza la masă, prânz (€8)",
          "Cină la trattoria (€20)",
        ],
      },
      {
        key: "relaxed",
        label: "Relaxat",
        range: "€45–55/zi",
        items: [
          "Mic dejun la cafenea (€6)",
          "Prânz la restaurant (€15)",
          "Cină cu vin (€30)",
        ],
      },
    ],
  },
  en: {
    label: "Food & Drink",
    title: "Price guide",
    subtitle: `Naples · ${DAYS} days · budget allocation €180`,
    priceRef: "Price reference",
    dailyStrategy: "Daily strategy",
    recommended: "RECOMMENDED",
    budgetTarget:
      `€180 of €1,000 = €${Math.round(180 / DAYS)}/day for ${DAYS} days. Achievable on the 'balanced' strategy.`,
    etiquetteTitle: "Rules of Neapolitan coffee etiquette",
    etiquetteBody:
      "Always drink espresso standing at the bar. Sitting costs 2–3x more. The espresso in Naples is the best in Italy — this is not a sacrifice.",
    items: [
      { label: "Espresso at the bar",     price: "€1.10" },
      { label: "Sfogliatella",            price: "€1.50–2" },
      { label: "Pizza (standing)",        price: "€4–6" },
      { label: "Pizza (sit-down)",        price: "€6–8" },
      { label: "Cuoppo fritto",           price: "€3–5" },
      { label: "Frittatina di pasta",     price: "€1.50–2.50" },
      { label: "Trattoria lunch",         price: "€12–18" },
      { label: "Dinner with wine",        price: "€20–35" },
      { label: "Limoncello",              price: "€2–3" },
      { label: "Gelato (2 scoops)",       price: "€2.50–3.50" },
    ],
    tiers: [
      {
        key: "frugal",
        label: "Frugal",
        range: "€20–25/day",
        items: [
          "Bar breakfast (€2.50)",
          "Street pizza (€5)",
          "Supermarket dinner (€8)",
        ],
      },
      {
        key: "balanced",
        label: "Balanced",
        range: "€30–35/day",
        items: [
          "Bar espresso + pastry (€3)",
          "Sit-down pizza lunch (€8)",
          "Trattoria dinner (€20)",
        ],
      },
      {
        key: "relaxed",
        label: "Relaxed",
        range: "€45–55/day",
        items: [
          "Cafe breakfast (€6)",
          "Restaurant lunch (€15)",
          "Dinner with wine (€30)",
        ],
      },
    ],
  },
};

export function EatGuide() {
  const { lang } = useLang();
  const t = T[lang];

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
      <div className={css({ mb: "8" })}>
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
          {t.label}
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
          {t.title}
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

      {/* ── Price reference ── */}
      <div className={css({ mb: "8" })}>
        <p
          className={css({
            fontSize: "xs",
            color: "text.faint",
            fontFamily: "display",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: "3",
          })}
        >
          {t.priceRef}
        </p>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0",
            border: "1px solid",
            borderColor: "steel.border",
            rounded: "pill",
            overflow: "hidden",
          })}
        >
          {t.items.map((item, i) => (
            <div
              key={i}
              className={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                px: "4",
                py: "2.5",
                bg: i % 2 === 0 ? "steel.surface" : "steel.raised",
                borderBottom: i < t.items.length - 2 ? "1px solid" : "none",
                borderColor: "steel.border",
                gap: "4",
              })}
            >
              <span
                className={css({
                  fontSize: "xs",
                  color: "text.secondary",
                  lineHeight: "1.3",
                })}
              >
                {item.label}
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  color: "amber.warm",
                  fontVariantNumeric: "tabular-nums",
                  fontFamily: "monospace",
                  whiteSpace: "nowrap",
                  lineHeight: "1.3",
                  flexShrink: "0",
                })}
              >
                {item.price}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily strategy ── */}
      <div className={css({ mb: "8" })}>
        <p
          className={css({
            fontSize: "xs",
            color: "text.faint",
            fontFamily: "display",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            mb: "3",
          })}
        >
          {t.dailyStrategy}
        </p>

        <div
          className={css({
            display: "flex",
            flexDir: "column",
            gap: "3",
          })}
        >
          {t.tiers.map((tier) => {
            const isBalanced = tier.key === "balanced";
            return (
              <div
                key={tier.key}
                className={css({
                  border: "1px solid",
                  borderColor: isBalanced ? "amber.warm" : "steel.border",
                  rounded: "card",
                  p: "4",
                  bg: isBalanced ? "steel.raised" : "steel.surface",
                  position: "relative",
                  transition: "border-color 0.2s",
                })}
              >
                {/* Tier header */}
                <div
                  className={css({
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: "2",
                  })}
                >
                  <span
                    className={css({
                      fontSize: "meta",
                      fontWeight: "700",
                      color: isBalanced ? "amber.warm" : "text.primary",
                      fontFamily: "display",
                      letterSpacing: "0.01em",
                    })}
                  >
                    {tier.label}
                  </span>

                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "3",
                    })}
                  >
                    {isBalanced && (
                      <span
                        className={css({
                          fontSize: "2xs",
                          color: "steel.dark",
                          bg: "amber.warm",
                          px: "2",
                          py: "0.5",
                          rounded: "pill",
                          fontFamily: "display",
                          letterSpacing: "0.06em",
                          fontWeight: "700",
                        })}
                      >
                        {t.recommended}
                      </span>
                    )}
                    <span
                      className={css({
                        fontSize: "xs",
                        color: isBalanced ? "amber.bright" : "text.muted",
                        fontVariantNumeric: "tabular-nums",
                        fontFamily: "monospace",
                      })}
                    >
                      {tier.range}
                    </span>
                  </div>
                </div>

                {/* Tier breakdown */}
                <div
                  className={css({
                    display: "flex",
                    flexDir: "column",
                    gap: "1",
                  })}
                >
                  {tier.items.map((item, j) => (
                    <span
                      key={j}
                      className={css({
                        fontSize: "xs",
                        color: "text.secondary",
                        lineHeight: "1.5",
                      })}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Budget target ── */}
      <div
        className={css({
          bg: "steel.raised",
          border: "1px solid",
          borderColor: "steel.border",
          rounded: "card",
          px: "5",
          py: "4",
          mb: "6",
        })}
      >
        <p
          className={css({
            fontSize: "xs",
            color: "text.secondary",
            lineHeight: "1.6",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          {t.budgetTarget}
        </p>
      </div>

      {/* ── Etiquette note ── */}
      <div
        className={css({
          borderTop: "1px solid",
          borderColor: "steel.border",
          pt: "5",
        })}
      >
        <p
          className={css({
            fontSize: "xs",
            color: "text.muted",
            fontFamily: "display",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            mb: "2",
          })}
        >
          {t.etiquetteTitle}
        </p>
        <p
          className={css({
            fontSize: "xs",
            color: "text.faint",
            lineHeight: "1.7",
          })}
        >
          {t.etiquetteBody}
        </p>
      </div>
    </div>
  );
}
