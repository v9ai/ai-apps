"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { GreeceRentals } from "@/components/GreeceRentals";
import { longStay2026 } from "@/lib/data";
import { LONG_STAY_MAX_MONTHLY_EUR, LONG_STAY_MIN_NIGHTS } from "@/lib/constants";

const T = {
  ro: {
    title: "Grecia — Inchirieri pe Termen Lung",
    subtitle: `Case si apartamente langa plaja cu parcare — ${LONG_STAY_MIN_NIGHTS}+ nopti, sub €${LONG_STAY_MAX_MONTHLY_EUR.toLocaleString()}/luna`,
    tech: "Pipeline: Scrape → extract → hard filter (parcare + plaja + buget) → scoring ML",
    back: "Inapoi la Grecia",
  },
  en: {
    title: "Greece — Long-Stay Rentals",
    subtitle: `Houses and apartments near the beach with parking — ${LONG_STAY_MIN_NIGHTS}+ nights, under €${LONG_STAY_MAX_MONTHLY_EUR.toLocaleString()}/month`,
    tech: "Pipeline: Scrape → extract → hard filter (parking + beach + budget) → ML scoring",
    back: "Back to Greece Hotels",
  },
};

export function LongStayPageContent() {
  const { lang } = useLang();
  const t = T[lang];

  return (
    <div
      className={css({
        minH: "100vh",
        bg: "steel.dark",
        color: "text.primary",
      })}
    >
      {/* ── Header ── */}
      <header
        className={css({
          mx: "auto",
          pt: { base: "16", md: "20" },
          pb: "10",
          px: { base: "5", md: "8" },
          textAlign: "center",
        })}
      >
        <a
          href="/greece"
          className={css({
            fontSize: "meta",
            color: "text.muted",
            textDecoration: "none",
            _hover: { color: "amber.warm" },
            transition: "color 0.2s",
          })}
        >
          {"<-"} {t.back}
        </a>

        <h1
          className={css({
            mt: "6",
            fontSize: "h1",
            fontWeight: "800",
            fontFamily: "display",
            lineHeight: "h1",
            letterSpacing: "h1",
            color: "text.primary",
          })}
        >
          {t.title}
        </h1>

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

        <p
          className={css({
            mt: "2",
            fontSize: "meta",
            color: "text.faint",
            fontFamily: "display",
            letterSpacing: "0.05em",
          })}
        >
          {t.tech}
        </p>
      </header>

      {/* ── Rental grid ── */}
      <main
        className={css({
          mx: "auto",
          px: { base: "5", md: "8" },
          pb: "16",
        })}
      >
        <GreeceRentals results={longStay2026} lang={lang} />
      </main>
    </div>
  );
}
