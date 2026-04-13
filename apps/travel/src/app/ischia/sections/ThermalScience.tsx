"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

interface InfoCard {
  stat: string;
  label: string;
  detail: string;
}

const T = {
  en: {
    sectionLabel: "Volcanic Wellness",
    sectionTitle: "Why Ischia",
    sectionSubtitle:
      "An island sitting on a magma chamber \u2014 103 thermal springs, 69 fumarole groups, and 2,000 years of documented healing.",
    cards: [
      {
        stat: "103",
        label: "Thermal Springs",
        detail:
          "Fed by Mount Epomeo\u2019s underground magma chamber. The highest density of thermal springs in the Mediterranean.",
      },
      {
        stat: "15\u00b0C \u2013 90\u00b0C",
        label: "Temperature Spectrum",
        detail:
          "From cool drinking springs (Nitrodi, 28\u00b0C) to scalding volcanic vents (Sorgeto, 90\u00b0C). Most therapeutic pools are 33\u201340\u00b0C.",
      },
      {
        stat: "69",
        label: "Fumarole Groups",
        detail:
          "Active volcanic steam vents visible at Maronti beach and Sant\u2019Angelo. The heat source for all thermal parks on the island\u2019s southern coast.",
      },
      {
        stat: "3",
        label: "Mineral Compositions",
        detail:
          "Sodium-chloride (joints, muscles), sulfate (respiratory, skin), bicarbonate (digestive, liver). Different springs serve different therapeutic needs.",
      },
      {
        stat: "Fango",
        label: "Volcanic Mud Therapy",
        detail:
          "Volcanic clay matured in thermal water for 6\u201312 months, then applied as warm body wraps. Documented since Pliny the Elder (79 AD). Treats arthritis, psoriasis, and chronic pain.",
      },
    ] as InfoCard[],
  },
  ro: {
    sectionLabel: "Wellness Vulcanic",
    sectionTitle: "De Ce Ischia",
    sectionSubtitle:
      "O insul\u0103 situat\u0103 pe o camer\u0103 magmatic\u0103 \u2014 103 izvoare termale, 69 grupuri de fumarole \u0219i 2.000 de ani de vindecare documentat\u0103.",
    cards: [
      {
        stat: "103",
        label: "Izvoare Termale",
        detail:
          "Alimentate de camera magmatic\u0103 subteran\u0103 a Muntelui Epomeo. Cea mai mare densitate de izvoare termale din Mediterana.",
      },
      {
        stat: "15\u00b0C \u2013 90\u00b0C",
        label: "Spectrul de Temperaturi",
        detail:
          "De la izvoare reci de b\u0103ut (Nitrodi, 28\u00b0C) la guri vulcanice fierbinți (Sorgeto, 90\u00b0C). Cele mai terapeutice bazine sunt 33\u201340\u00b0C.",
      },
      {
        stat: "69",
        label: "Grupuri de Fumarole",
        detail:
          "Guri active de abur vulcanic vizibile la plaja Maronti \u0219i Sant\u2019Angelo. Sursa de c\u0103ldur\u0103 pentru toate parcurile termale de pe coasta sudic\u0103 a insulei.",
      },
      {
        stat: "3",
        label: "Compozi\u021bii Minerale",
        detail:
          "Clorur\u0103 de sodiu (articula\u021bii, mu\u0219chi), sulfat (respirator, piele), bicarbonat (digestiv, ficat). Izvoare diferite servesc nevoi terapeutice diferite.",
      },
      {
        stat: "Fango",
        label: "Terapia cu N\u0103mol Vulcanic",
        detail:
          "Argil\u0103 vulcanic\u0103 maturat\u0103 \u00een ap\u0103 termal\u0103 timp de 6\u201312 luni, apoi aplicat\u0103 ca \u00eempachet\u0103ri calde de corp. Documentat de la Pliniu cel B\u0103tr\u00e2n (79 d.Hr.). Trateaz\u0103 artrita, psoriazisul \u0219i durerea cronic\u0103.",
      },
    ] as InfoCard[],
  },
};

export function ThermalScience() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <section
      className={css({
        maxW: "5xl",
        mx: "auto",
        mb: { base: "14", md: "20" },
        animation: "fadeUp 0.6s ease-out",
      })}
    >
      {/* -- Section header -- */}
      <div className={css({ mb: { base: "10", md: "14" } })}>
        <p
          className={css({
            fontSize: "label",
            fontFamily: "display",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "amber.warm",
            mb: "3",
          })}
        >
          {t.sectionLabel}
        </p>
        <h2
          className={css({
            fontSize: "h2",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "h2",
            letterSpacing: "h2",
            color: "text.primary",
            mb: "4",
          })}
        >
          {t.sectionTitle}
        </h2>
        <p
          className={css({
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
            maxW: "600px",
          })}
        >
          {t.sectionSubtitle}
        </p>
      </div>

      {/* -- Info cards grid -- */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: {
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
          gap: { base: "4", md: "6" },
        })}
      >
        {t.cards.map((card) => (
          <div
            key={card.label}
            className={css({
              bg: "steel.surface",
              border: "1px solid",
              borderColor: "steel.border",
              rounded: "card",
              boxShadow: "card",
              p: { base: "6", md: "7" },
              display: "flex",
              flexDir: "column",
              gap: "3",
              transition: "border-color 0.2s, box-shadow 0.2s",
              _hover: {
                borderColor: "steel.borderHover",
                boxShadow: "card.hover",
              },
            })}
          >
            {/* Stat number */}
            <p
              className={css({
                fontSize: "h1",
                fontWeight: "800",
                fontFamily: "display",
                color: "amber.warm",
                lineHeight: "1.1",
              })}
            >
              {card.stat}
            </p>

            {/* Label */}
            <p
              className={css({
                fontSize: "label",
                fontFamily: "display",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "text.muted",
              })}
            >
              {card.label}
            </p>

            {/* Detail */}
            <p
              className={css({
                fontSize: "meta",
                color: "text.secondary",
                lineHeight: "1.55",
              })}
            >
              {card.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
