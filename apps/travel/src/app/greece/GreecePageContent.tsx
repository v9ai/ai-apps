"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";
import { GreeceHotels } from "@/components/GreeceHotels";
import { hotels2026 } from "@/lib/data";
const T = {
  ro: {
    title: "Grecia — Noi in 2026",
    subtitle:
      "Cele mai ieftine hoteluri noi — sentiment, aspecte si valoare prin Candle ML",
    tech: "Pipeline: Scrape → Candle embed → sentiment analysis → aspect extraction → value scoring → dedup",
    back: "Inapoi la Katowice",
  },
  en: {
    title: "Greece — New in 2026",
    subtitle:
      "Cheapest new hotels — sentiment, aspects and value analyzed via Candle ML",
    tech: "Pipeline: Scrape → Candle embed → sentiment analysis → aspect extraction → value scoring → dedup",
    back: "Back to Katowice",
  },
};

export function GreecePageContent() {
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
          href="/"
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

      {/* ── New 2026 Hotels ── */}
      <main
        className={css({
          mx: "auto",
          px: { base: "5", md: "8" },
          pb: "16",
        })}
      >
        <GreeceHotels results={hotels2026} lang={lang} />
      </main>
    </div>
  );
}
