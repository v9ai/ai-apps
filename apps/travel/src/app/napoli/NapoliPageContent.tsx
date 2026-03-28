"use client";

import { css } from "styled-system/css";
import { napoliData } from "@/lib/data";
import { Footer } from "@/components/Footer";
import { useLang } from "@/components/LanguageSwitcher";
import { SleepGuide } from "./sections/SleepGuide";
import { HotelLinks } from "./sections/HotelLinks";

const T = {
  ro: {
    eyebrow: "Ghid de Calatorie \u2014 Italia",
    tagline: (n: number) =>
      `Napoli, Italia\u00a0\u00a0·\u00a0\u00a02 Adulți · 1 Copil\u00a0\u00a0·\u00a0\u00a0${n} locuri esențiale`,
  },
  en: {
    eyebrow: "Travel Guide \u2014 Italy",
    tagline: (n: number) =>
      `Naples, Italy\u00a0\u00a0·\u00a0\u00a02 Adults · 1 Child\u00a0\u00a0·\u00a0\u00a0${n} essential places`,
  },
};

export function NapoliPageContent() {
  const { lang } = useLang();
  const t = T[lang];
  const { city, places } = napoliData;

  return (
    <>
      <main
        className={css({
          position: "relative",
          zIndex: 1,
          mx: "auto",
          px: { base: "4", sm: "6", md: "10", lg: "16", xl: "20" },
          pt: { base: "10", sm: "16", md: "24" },
          pb: { base: "12", md: "20" },
        })}
      >
        {/* ── Hero ─────────────────────────────────────────── */}
        <header
          className={css({
            textAlign: "center",
            maxW: "3xl",
            mx: "auto",
            mb: { base: "10", sm: "16", md: "20" },
            animation: "fadeUp 0.6s ease-out",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3",
              mb: "6",
            })}
          >
            <span
              className={css({
                display: "block",
                w: "6",
                h: "1px",
                bg: "amber.warm",
                animation: "coalSeam 3s ease-in-out infinite",
                transformOrigin: "center",
              })}
            />
            <p
              className={css({
                fontSize: "label",
                fontWeight: "600",
                fontFamily: "display",
                color: "amber.warm",
                letterSpacing: "label",
                textTransform: "uppercase",
              })}
            >
              {t.eyebrow}
            </p>
            <span
              className={css({
                display: "block",
                w: "6",
                h: "1px",
                bg: "amber.warm",
                animation: "coalSeam 3s ease-in-out infinite",
                transformOrigin: "center",
              })}
            />
          </div>

          <h1
            className={css({
              fontSize: "h1",
              fontWeight: "800",
              fontFamily: "display",
              letterSpacing: "h1",
              color: "text.primary",
              lineHeight: "h1",
            })}
          >
            {city}
          </h1>

          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "4",
              my: "5",
              maxW: "xs",
              mx: "auto",
            })}
          >
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
            <span
              className={css({
                fontSize: "meta",
                fontFamily: "display",
                color: "text.faint",
                letterSpacing: "0.1em",
                fontWeight: "600",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              40&deg;50&prime;N 14&deg;15&prime;E
            </span>
            <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
          </div>

          <p
            className={css({
              fontSize: { base: "meta", md: "body" },
              fontFamily: "display",
              color: "text.muted",
              fontWeight: "400",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            })}
          >
            {t.tagline(places.length)}
          </p>
        </header>
      </main>

      {/* ── Accommodation ────────────────────────────────── */}
      <SleepGuide />

      {/* ── Booking Links ────────────────────────────────── */}
      <HotelLinks />

      <Footer city={city} count={places.length} />
    </>
  );
}
