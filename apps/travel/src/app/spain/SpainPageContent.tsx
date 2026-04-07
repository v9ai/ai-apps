"use client";

import { css } from "styled-system/css";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { useLang } from "@/components/LanguageSwitcher";
import type { AirbnbData } from "@/lib/airbnb";
import type { NewBuildData } from "@/lib/newbuild";

// ── Helpers ─────────────────────────────────────────────────────────────

function fmtPrice(n: number) {
  return n.toLocaleString("de-DE");
}

// ── Static data ─────────────────────────────────────────────────────────

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
    regions: "Regiuni",
  },
  en: {
    eyebrow: "Travel Guide",
    title: "Spain",
    subtitle: "Regions, cities, and essential places",
    tagline: (n: number) =>
      `${n} regions\u00a0\u00a0·\u00a0\u00a0Mediterranean, Atlantic & Interior`,
    back: "Back to Katowice",
    cities: "Cities",
    regions: "Regions",
  },
};

const AIRBNB_FILTERS = ["Pool", "Casă întreagă", "1-30 Iunie 2026"];

// ── Shared styles ───────────────────────────────────────────────────────

const sectionHeading = css({
  fontSize: "h2",
  fontWeight: "700",
  fontFamily: "display",
  color: "text.primary",
  letterSpacing: "h2",
  mb: "2",
});

const sectionDivider = css({
  borderBottom: "1px solid",
  borderColor: "steel.border",
  pb: "3",
  mb: "6",
});

const pill = css({
  fontSize: "meta",
  color: "amber.warm",
  bg: "rgba(201, 146, 42, 0.1)",
  border: "1px solid rgba(201, 146, 42, 0.2)",
  rounded: "pill",
  px: "3",
  py: "1",
  fontWeight: "600",
  fontFamily: "display",
  letterSpacing: "0.04em",
});

const tagMuted = css({
  fontSize: "11px",
  color: "text.muted",
  bg: "rgba(255, 255, 255, 0.05)",
  border: "1px solid",
  borderColor: "steel.border",
  rounded: "pill",
  px: "2",
  py: "0.5",
  fontFamily: "display",
  letterSpacing: "0.04em",
});

const cardBase = css({
  bg: "steel.surface",
  border: "1px solid",
  borderColor: "steel.border",
  rounded: "card",
  p: "5",
  transition: "all 0.2s ease",
  _hover: {
    borderColor: "steel.borderHover",
    shadow: "card.hover",
    transform: "translateY(-2px)",
  },
});

// ── Component ───────────────────────────────────────────────────────────

interface Props {
  airbnbData: AirbnbData;
  newBuildData: NewBuildData;
}

export function SpainPageContent({ airbnbData, newBuildData }: Props) {
  const { lang } = useLang();
  const t = T[lang];
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, startTransition]
  );

  const airbnbPrice = airbnbData.filters.priceMax;
  const nbPrice = newBuildData.filters.maxPrice;

  return (
    <div className={css({ minH: "100vh", bg: "steel.dark", color: "text.primary" })}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Hero                                               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
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
          <span className={css({ display: "block", w: "6", h: "1px", bg: "amber.warm", animation: "coalSeam 3s ease-in-out infinite", transformOrigin: "center" })} />
          <p className={css({ fontSize: "label", fontWeight: "600", fontFamily: "display", color: "amber.warm", letterSpacing: "label", textTransform: "uppercase" })}>
            {t.eyebrow}
          </p>
          <span className={css({ display: "block", w: "6", h: "1px", bg: "amber.warm", animation: "coalSeam 3s ease-in-out infinite", transformOrigin: "center" })} />
        </div>

        <h1 className={css({ fontSize: "h1", fontWeight: "800", fontFamily: "display", letterSpacing: "h1", color: "text.primary", lineHeight: "h1" })}>
          {t.title}
        </h1>

        <div className={css({ display: "flex", alignItems: "center", gap: "4", my: "5", maxW: "xs", mx: "auto" })}>
          <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
          <span className={css({ fontSize: "meta", fontFamily: "display", color: "text.faint", letterSpacing: "0.1em", fontWeight: "600", fontVariantNumeric: "tabular-nums" })}>
            40°26′N 3°42′W
          </span>
          <span className={css({ flex: "1", h: "1px", bg: "steel.border" })} />
        </div>

        <p className={css({ fontSize: "body", color: "text.secondary", lineHeight: "body" })}>
          {t.subtitle}
        </p>

        <p className={css({ mt: "2", fontSize: { base: "meta", md: "body" }, fontFamily: "display", color: "text.muted", fontWeight: "400", letterSpacing: "0.04em", textTransform: "uppercase" })}>
          {t.tagline(REGIONS.length)}
        </p>
      </header>

      <div className={css({ mx: "auto", maxW: "6xl", px: { base: "5", md: "8" }, pb: "20" })}>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: Airbnb Iunie 2026                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className={css({ mb: "16" })}>
          <div className={sectionDivider}>
            <h2 className={sectionHeading}>Airbnb — Iunie 2026</h2>
            <p className={css({ fontSize: "body", color: "text.secondary", lineHeight: "body" })}>
              Link-uri directe cu filtre pre-setate — click și vezi prețuri instant
            </p>
          </div>

          {/* Filters + slider */}
          <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3", mb: "5" })}>
            {AIRBNB_FILTERS.map((f) => (
              <span key={f} className={pill}>{f}</span>
            ))}
            <span className={pill}>max €{airbnbPrice}/noapte</span>

            <div className={css({ display: "flex", alignItems: "center", gap: "3", ml: { md: "auto" } })}>
              <input
                type="range"
                min={20}
                max={100}
                defaultValue={airbnbPrice}
                onMouseUp={(e) => navigate("price_max", (e.target as HTMLInputElement).value)}
                onTouchEnd={(e) => navigate("price_max", (e.target as HTMLInputElement).value)}
                onChange={(e) => {
                  const d = document.querySelector("[data-airbnb-price]");
                  if (d) d.textContent = `€${e.target.value}`;
                  const t = document.querySelector("[data-airbnb-total]");
                  if (t) t.textContent = `~€${Number(e.target.value) * airbnbData.filters.nights} / ${airbnbData.filters.nights} nopți`;
                }}
                className={css({ w: "28", accentColor: "#c9922a", cursor: "pointer" })}
              />
              <span
                data-airbnb-price
                className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "amber.warm", fontVariantNumeric: "tabular-nums", minW: "3ch" })}
              >
                €{airbnbPrice}
              </span>
            </div>
          </div>

          <p
            data-airbnb-total
            className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display", mb: "6" })}
          >
            ~€{airbnbPrice * airbnbData.filters.nights} / {airbnbData.filters.nights} nopți
          </p>

          {/* City cards by region */}
          <div className={css({ opacity: isPending ? "0.6" : "1", transition: "opacity 0.15s" })}>
            {airbnbData.regions.map((region) => (
              <div key={region.region} className={css({ mb: "8" })}>
                <h3 className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h3", mb: "3" })}>
                  {region.regionRo}
                </h3>
                <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: "4" })}>
                  {region.cities.map((city) => (
                    <a
                      key={city.city}
                      href={city.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={css({
                        display: "block",
                        bg: "steel.surface",
                        border: "1px solid",
                        borderColor: "steel.border",
                        rounded: "card",
                        p: "5",
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                        _hover: { borderColor: "amber.warm", shadow: "card.hover", transform: "translateY(-2px)" },
                      })}
                    >
                      <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: "2" })}>
                        <h4 className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h3" })}>
                          {city.city}
                        </h4>
                        <span className={css({ fontSize: "meta", fontFamily: "display", color: "amber.warm", fontWeight: "700", fontVariantNumeric: "tabular-nums", flexShrink: 0, ml: "3" })}>
                          max €{city.priceMax}/n
                        </span>
                      </div>
                      {city.note && (
                        <p className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "body", mb: "2" })}>
                          {city.note}
                        </p>
                      )}
                      <p className={css({ fontSize: "meta", color: "text.faint", fontFamily: "display", mb: "2" })}>
                        ~€{city.estimatedTotal} total
                      </p>
                      <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5" })}>
                        {["Pool", "Casă întreagă", "Iunie 2026"].map((tag) => (
                          <span key={tag} className={tagMuted}>{tag}</span>
                        ))}
                      </div>
                      <p className={css({ mt: "3", fontSize: "meta", color: "amber.warm", fontWeight: "600", fontFamily: "display", letterSpacing: "0.04em" })}>
                        Deschide pe Airbnb →
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className={css({ mt: "6", borderTop: "1px solid", borderColor: "steel.border", pt: "4" })}>
            <h3 className={css({ fontSize: "meta", fontFamily: "display", fontWeight: "600", color: "text.muted", letterSpacing: "0.06em", textTransform: "uppercase", mb: "3" })}>
              Sfaturi
            </h3>
            {airbnbData.tips.map((tip, i) => (
              <p key={i} className={css({ fontSize: "meta", color: "text.secondary", lineHeight: "body", mb: "1.5" })}>
                <span className={css({ color: "amber.warm", mr: "2", fontWeight: "700" })}>·</span>
                {tip}
              </p>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: Obra Nueva                                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section className={css({ mb: "16" })}>
          <div className={sectionDivider}>
            <h2 className={sectionHeading}>Obra Nueva — Complexe noi lângă mare</h2>
            <p className={css({ fontSize: "body", color: "text.secondary", lineHeight: "body" })}>
              Apartamente în complexe noi (2023-2026) pe coastă — sortate după valoare
            </p>
          </div>

          {/* Stats */}
          <p className={css({ fontSize: "meta", fontFamily: "display", color: "text.muted", textTransform: "uppercase", letterSpacing: "0.04em", mb: "4" })}>
            {newBuildData.stats.total} proprietăți · {newBuildData.stats.zones.join(" · ")} · €{fmtPrice(newBuildData.stats.priceRange[0])} – €{fmtPrice(newBuildData.stats.priceRange[1])}
          </p>

          {/* Price slider + zone filters */}
          <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3", mb: "5" })}>
            <input
              type="range"
              min={50000}
              max={200000}
              step={5000}
              defaultValue={nbPrice}
              onMouseUp={(e) => navigate("max_price", (e.target as HTMLInputElement).value)}
              onTouchEnd={(e) => navigate("max_price", (e.target as HTMLInputElement).value)}
              onChange={(e) => {
                const d = document.querySelector("[data-nb-price]");
                if (d) d.textContent = `€${Number(e.target.value).toLocaleString("de-DE")}`;
              }}
              className={css({ w: "36", accentColor: "#c9922a", cursor: "pointer" })}
            />
            <span
              data-nb-price
              className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "amber.warm", fontVariantNumeric: "tabular-nums", minW: "8ch" })}
            >
              €{fmtPrice(nbPrice)}
            </span>

            <div className={css({ display: "flex", flexWrap: "wrap", gap: "2", ml: { md: "auto" } })}>
              <button
                onClick={() => navigate("zone", "")}
                className={css({
                  fontSize: "meta", fontFamily: "display", fontWeight: "600", letterSpacing: "0.04em",
                  color: !newBuildData.filters.zone ? "steel.dark" : "amber.warm",
                  bg: !newBuildData.filters.zone ? "amber.warm" : "rgba(201, 146, 42, 0.1)",
                  border: "1px solid rgba(201, 146, 42, 0.3)",
                  rounded: "pill", px: "3", py: "1", cursor: "pointer", transition: "all 0.15s",
                })}
              >
                Toate
              </button>
              {["Costa Blanca", "Costa Cálida", "Costa del Sol", "Valencia"].map((z) => (
                <button
                  key={z}
                  onClick={() => navigate("zone", newBuildData.filters.zone === z.toLowerCase() ? "" : z.toLowerCase())}
                  className={css({
                    fontSize: "meta", fontFamily: "display", fontWeight: "600", letterSpacing: "0.04em",
                    color: newBuildData.filters.zone === z.toLowerCase() ? "steel.dark" : "amber.warm",
                    bg: newBuildData.filters.zone === z.toLowerCase() ? "amber.warm" : "rgba(201, 146, 42, 0.1)",
                    border: "1px solid rgba(201, 146, 42, 0.3)",
                    rounded: "pill", px: "3", py: "1", cursor: "pointer", transition: "all 0.15s",
                  })}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* Listing cards */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
              gap: "5",
              opacity: isPending ? "0.6" : "1",
              transition: "opacity 0.15s",
            })}
          >
            {newBuildData.listings.map((l, i) => (
              <article key={l.id} className={cardBase}>
                <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: "2" })}>
                  <div className={css({ display: "flex", alignItems: "baseline", gap: "2" })}>
                    <span className={css({ fontSize: "meta", fontFamily: "display", color: "text.faint", fontWeight: "600" })}>#{i + 1}</span>
                    <h3 className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h3" })}>
                      {l.complex_name ?? l.name.split("—")[0].trim()}
                    </h3>
                  </div>
                  <span className={css({ fontSize: "meta", fontFamily: "display", color: "amber.warm", fontWeight: "700", fontVariantNumeric: "tabular-nums", flexShrink: 0, ml: "3" })}>
                    {l.score.total.toFixed(1)}
                  </span>
                </div>

                <p className={css({ fontSize: "meta", color: "text.secondary", mb: "3" })}>
                  {l.city} · {l.zone}
                </p>

                <div className={css({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3", mb: "4" })}>
                  <div>
                    <p className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "amber.warm" })}>€{fmtPrice(l.price_eur)}</p>
                    <p className={css({ fontSize: "11px", color: "text.faint", fontFamily: "display", textTransform: "uppercase", letterSpacing: "0.06em" })}>Preț</p>
                  </div>
                  <div>
                    <p className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary" })}>{l.sqm ? `${l.sqm}m²` : "—"}</p>
                    <p className={css({ fontSize: "11px", color: "text.faint", fontFamily: "display", textTransform: "uppercase", letterSpacing: "0.06em" })}>Suprafață</p>
                  </div>
                  <div>
                    <p className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary" })}>{l.sea_distance_km !== null ? `${l.sea_distance_km}km` : "—"}</p>
                    <p className={css({ fontSize: "11px", color: "text.faint", fontFamily: "display", textTransform: "uppercase", letterSpacing: "0.06em" })}>La mare</p>
                  </div>
                </div>

                <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mb: "3", fontSize: "meta", color: "text.secondary" })}>
                  {l.bedrooms && <span>{l.bedrooms} dormit.</span>}
                  {l.bathrooms && <span>{l.bathrooms} băi</span>}
                  {l.build_year && <span>Construit {l.build_year}</span>}
                  {l.price_per_sqm && <span>€{fmtPrice(Math.round(l.price_per_sqm))}/m²</span>}
                </div>

                <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5", mb: "3" })}>
                  {l.has_pool && (
                    <span className={css({ fontSize: "11px", color: "amber.warm", bg: "rgba(201, 146, 42, 0.1)", border: "1px solid rgba(201, 146, 42, 0.2)", rounded: "pill", px: "2", py: "0.5", fontFamily: "display" })}>
                      Pool
                    </span>
                  )}
                  {l.has_parking && <span className={tagMuted}>Parking</span>}
                  {l.has_terrace && <span className={tagMuted}>Terasă</span>}
                  {l.amenities.filter((a) => !["Pool", "Parking", "Terrace"].includes(a)).slice(0, 4).map((a) => (
                    <span key={a} className={tagMuted}>{a}</span>
                  ))}
                </div>

                <div className={css({ borderTop: "1px solid", borderColor: "steel.border", pt: "3" })}>
                  <div className={css({ display: "flex", gap: "3", fontSize: "11px", fontFamily: "display", color: "text.faint" })}>
                    <span>Preț {(l.score.price_score * 100).toFixed(0)}%</span>
                    <span>Mare {(l.score.sea_score * 100).toFixed(0)}%</span>
                    <span>Nou {(l.score.newness_score * 100).toFixed(0)}%</span>
                    <span>Dotări {(l.score.amenity_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {newBuildData.listings.length === 0 && (
            <p className={css({ textAlign: "center", py: "12", fontSize: "body", color: "text.muted" })}>
              Nicio proprietate găsită cu aceste filtre.
            </p>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 4: Regions Grid                                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className={sectionDivider}>
            <h2 className={sectionHeading}>{t.regions}</h2>
          </div>

          <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: "5" })}>
            {REGIONS.map((region) => (
              <article key={region.name} className={cardBase} style={{ padding: "1.5rem" }}>
                <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: "3" })}>
                  <h3 className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h3" })}>
                    {lang === "ro" ? region.nameRo : region.name}
                  </h3>
                  <span className={css({ fontSize: "meta", fontFamily: "display", color: "text.faint", letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums", flexShrink: 0, ml: "3" })}>
                    {region.coordinates}
                  </span>
                </div>

                <p className={css({ fontSize: "body", color: "text.secondary", lineHeight: "body", mb: "4" })}>
                  {lang === "ro" ? region.descriptionRo : region.description}
                </p>

                <div className={css({ borderTop: "1px solid", borderColor: "steel.border", pt: "3" })}>
                  <p className={css({ fontSize: "meta", fontFamily: "display", fontWeight: "600", color: "text.muted", letterSpacing: "0.06em", textTransform: "uppercase", mb: "2" })}>
                    {t.cities}
                  </p>
                  <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
                    {region.cities.map((city) => (
                      <span key={city} className={pill}>{city}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
