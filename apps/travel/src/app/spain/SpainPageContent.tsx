"use client";

import { css } from "styled-system/css";
import { useLang } from "@/components/LanguageSwitcher";

const REGIONS = [
  {
    name: "Andalusia",
    nameRo: "Andaluzia",
    cities: ["Seville", "Granada", "Málaga", "Córdoba"],
    description: "Flamenco, Moorish palaces, and whitewashed villages along the southern coast.",
    descriptionRo: "Flamenco, palate maure și sate albe de-a lungul coastei sudice.",
    coordinates: "37°23′N 5°59′W",
  },
  {
    name: "Catalonia",
    nameRo: "Catalonia",
    cities: ["Barcelona", "Girona", "Tarragona"],
    description: "Gaudí's Barcelona, Costa Brava coves, and Pyrenean foothills.",
    descriptionRo: "Barcelona lui Gaudí, golfurile Costa Brava și poalele Pirineilor.",
    coordinates: "41°23′N 2°10′E",
  },
  {
    name: "Basque Country",
    nameRo: "Țara Bascilor",
    cities: ["San Sebastián", "Bilbao", "Vitoria-Gasteiz"],
    description: "Pintxos bars, the Guggenheim, and dramatic Atlantic coastline.",
    descriptionRo: "Baruri cu pintxos, Guggenheim și coasta dramatică a Atlanticului.",
    coordinates: "43°19′N 2°59′W",
  },
  {
    name: "Valencia",
    nameRo: "Valencia",
    cities: ["Valencia", "Alicante"],
    description: "Paella's birthplace, the City of Arts and Sciences, and Mediterranean beaches.",
    descriptionRo: "Locul de naștere al paellei, Orașul Artelor și Științelor și plaje mediteraneene.",
    coordinates: "39°28′N 0°22′W",
  },
  {
    name: "Balearic Islands",
    nameRo: "Insulele Baleare",
    cities: ["Palma de Mallorca", "Ibiza", "Menorca"],
    description: "Turquoise coves, hilltop villages, and year-round sun.",
    descriptionRo: "Golfuri turcoaz, sate pe dealuri și soare tot anul.",
    coordinates: "39°34′N 2°39′E",
  },
  {
    name: "Madrid & Central Spain",
    nameRo: "Madrid și Spania Centrală",
    cities: ["Madrid", "Toledo", "Segovia"],
    description: "The Prado, royal palaces, and Castilian plains stretching to the horizon.",
    descriptionRo: "Prado, palate regale și câmpiile Castiliei până la orizont.",
    coordinates: "40°25′N 3°42′W",
  },
];

const T = {
  ro: {
    eyebrow: "Ghid de Călătorie",
    title: "Spania",
    subtitle: "Regiuni, orașe și locuri esențiale",
    tagline: (n: number) =>
      `${n} regiuni\u00a0\u00a0·\u00a0\u00a0Mediterana, Atlantic & Interior`,
    back: "Înapoi la Katowice",
    cities: "Orașe",
  },
  en: {
    eyebrow: "Travel Guide",
    title: "Spain",
    subtitle: "Regions, cities, and essential places",
    tagline: (n: number) =>
      `${n} regions\u00a0\u00a0·\u00a0\u00a0Mediterranean, Atlantic & Interior`,
    back: "Back to Katowice",
    cities: "Cities",
  },
};

export function SpainPageContent() {
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
      {/* ── Hero ── */}
      <header
        className={css({
          textAlign: "center",
          maxW: "3xl",
          mx: "auto",
          pt: { base: "16", md: "20" },
          pb: "10",
          px: { base: "5", md: "8" },
          animation: "fadeUp 0.6s ease-out",
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

        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3",
            mt: "8",
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
          {t.title}
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
            40°26′N 3°42′W
          </span>
          <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
        </div>

        <p
          className={css({
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
            fontSize: { base: "meta", md: "body" },
            fontFamily: "display",
            color: "text.muted",
            fontWeight: "400",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          })}
        >
          {t.tagline(REGIONS.length)}
        </p>
      </header>

      {/* ── Airbnb CTA ── */}
      <div
        className={css({
          mx: "auto",
          maxW: "6xl",
          px: { base: "5", md: "8" },
          mb: "8",
        })}
      >
        <a
          href="/spain/airbnb"
          className={css({
            display: "block",
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: "6",
            textDecoration: "none",
            textAlign: "center",
            transition: "all 0.2s ease",
            _hover: {
              shadow: "card.hover",
              transform: "translateY(-2px)",
            },
          })}
        >
          <p
            className={css({
              fontSize: "h3",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              letterSpacing: "h3",
              mb: "2",
            })}
          >
            Airbnb Iunie 2026
          </p>
          <p
            className={css({
              fontSize: "body",
              color: "text.secondary",
              lineHeight: "body",
            })}
          >
            {lang === "ro"
              ? "14 orașe · piscină · casă întreagă · max 50€/noapte → link-uri directe"
              : "14 cities · pool · entire home · max €50/night → direct links"}
          </p>
        </a>

        <a
          href="/spain/new-build"
          className={css({
            display: "block",
            bg: "steel.surface",
            border: "1px solid",
            borderColor: "amber.warm",
            rounded: "card",
            p: "6",
            textDecoration: "none",
            textAlign: "center",
            transition: "all 0.2s ease",
            _hover: {
              shadow: "card.hover",
              transform: "translateY(-2px)",
            },
          })}
        >
          <p
            className={css({
              fontSize: "h3",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              letterSpacing: "h3",
              mb: "2",
            })}
          >
            Obra Nueva — Complexe noi lângă mare
          </p>
          <p
            className={css({
              fontSize: "body",
              color: "text.secondary",
              lineHeight: "body",
            })}
          >
            {lang === "ro"
              ? "Apartamente noi (2023-2026) · Costa Blanca, Murcia, Costa del Sol · de la €89.900"
              : "New-build apartments (2023-2026) · Costa Blanca, Murcia, Costa del Sol · from €89,900"}
          </p>
        </a>
      </div>

      {/* ── Regions Grid ── */}
      <main
        className={css({
          mx: "auto",
          maxW: "6xl",
          px: { base: "5", md: "8" },
          pb: "20",
        })}
      >
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: "5",
          })}
        >
          {REGIONS.map((region) => (
            <article
              key={region.name}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                p: "6",
                transition: "all 0.2s ease",
                _hover: {
                  borderColor: "steel.borderHover",
                  shadow: "card.hover",
                  transform: "translateY(-2px)",
                },
              })}
            >
              <div
                className={css({
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  mb: "3",
                })}
              >
                <h2
                  className={css({
                    fontSize: "h3",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "text.primary",
                    letterSpacing: "h3",
                  })}
                >
                  {lang === "ro" ? region.nameRo : region.name}
                </h2>
                <span
                  className={css({
                    fontSize: "meta",
                    fontFamily: "display",
                    color: "text.faint",
                    letterSpacing: "0.06em",
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                    ml: "3",
                  })}
                >
                  {region.coordinates}
                </span>
              </div>

              <p
                className={css({
                  fontSize: "body",
                  color: "text.secondary",
                  lineHeight: "body",
                  mb: "4",
                })}
              >
                {lang === "ro" ? region.descriptionRo : region.description}
              </p>

              <div
                className={css({
                  borderTop: "1px solid",
                  borderColor: "steel.border",
                  pt: "3",
                })}
              >
                <p
                  className={css({
                    fontSize: "meta",
                    fontFamily: "display",
                    fontWeight: "600",
                    color: "text.muted",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    mb: "2",
                  })}
                >
                  {t.cities}
                </p>
                <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
                  {region.cities.map((city) => (
                    <span
                      key={city}
                      className={css({
                        fontSize: "meta",
                        color: "amber.warm",
                        bg: "rgba(201, 146, 42, 0.1)",
                        border: "1px solid rgba(201, 146, 42, 0.2)",
                        rounded: "pill",
                        px: "2.5",
                        py: "0.5",
                        fontWeight: "600",
                        fontFamily: "display",
                        letterSpacing: "0.04em",
                      })}
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
