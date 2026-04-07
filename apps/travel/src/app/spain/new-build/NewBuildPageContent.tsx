"use client";

import { css } from "styled-system/css";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { NewBuildData } from "@/lib/newbuild";

function fmtPrice(n: number) {
  return n.toLocaleString("de-DE");
}

export function NewBuildPageContent({ data }: { data: NewBuildData }) {
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
    [router, searchParams]
  );

  const maxPrice = data.filters.maxPrice;

  return (
    <div className={css({ minH: "100vh", bg: "steel.dark", color: "text.primary" })}>
      {/* ── Hero ── */}
      <header
        className={css({
          textAlign: "center",
          maxW: "3xl",
          mx: "auto",
          pt: { base: "16", md: "20" },
          pb: "8",
          px: { base: "5", md: "8" },
          animation: "fadeUp 0.6s ease-out",
        })}
      >
        <a
          href="/spain"
          className={css({
            fontSize: "meta",
            color: "text.muted",
            textDecoration: "none",
            _hover: { color: "amber.warm" },
            transition: "color 0.2s",
          })}
        >
          {"<-"} Înapoi la Spania
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
          <span className={css({ display: "block", w: "6", h: "1px", bg: "amber.warm", animation: "coalSeam 3s ease-in-out infinite" })} />
          <p className={css({ fontSize: "label", fontWeight: "600", fontFamily: "display", color: "amber.warm", letterSpacing: "label", textTransform: "uppercase" })}>
            Obra Nueva
          </p>
          <span className={css({ display: "block", w: "6", h: "1px", bg: "amber.warm", animation: "coalSeam 3s ease-in-out infinite" })} />
        </div>

        <h1 className={css({ fontSize: "h1", fontWeight: "800", fontFamily: "display", letterSpacing: "h1", color: "text.primary", lineHeight: "h1" })}>
          Complexe noi lângă mare
        </h1>

        <p className={css({ mt: "4", fontSize: "body", color: "text.secondary", lineHeight: "body" })}>
          Apartamente în complexe noi (2023-2026) pe coastă — sortate după valoare
        </p>

        <p className={css({ mt: "2", fontSize: "meta", fontFamily: "display", color: "text.muted", textTransform: "uppercase", letterSpacing: "0.04em" })}>
          {data.stats.total} proprietăți · {data.stats.zones.join(" · ")} · €{fmtPrice(data.stats.priceRange[0])} – €{fmtPrice(data.stats.priceRange[1])}
        </p>

        {/* ── Price slider ── */}
        <div className={css({ mt: "6", display: "flex", alignItems: "center", justifyContent: "center", gap: "4" })}>
          <label className={css({ fontSize: "meta", fontFamily: "display", color: "text.muted", fontWeight: "600", letterSpacing: "0.04em", textTransform: "uppercase" })}>
            Max preț
          </label>
          <input
            type="range"
            min={50000}
            max={200000}
            step={5000}
            defaultValue={maxPrice}
            onMouseUp={(e) => navigate("max_price", (e.target as HTMLInputElement).value)}
            onTouchEnd={(e) => navigate("max_price", (e.target as HTMLInputElement).value)}
            onChange={(e) => {
              const d = (e.target as HTMLElement).parentElement?.querySelector("[data-price-display]");
              if (d) d.textContent = `€${Number(e.target.value).toLocaleString("de-DE")}`;
            }}
            className={css({ w: "40", accentColor: "#c9922a", cursor: "pointer" })}
          />
          <span
            data-price-display
            className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "amber.warm", fontVariantNumeric: "tabular-nums", minW: "8ch", textAlign: "right" })}
          >
            €{fmtPrice(maxPrice)}
          </span>
        </div>

        {/* ── Zone filters ── */}
        <div className={css({ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "2", mt: "5" })}>
          <button
            onClick={() => navigate("zone", "")}
            className={css({
              fontSize: "meta", fontFamily: "display", fontWeight: "600", letterSpacing: "0.04em",
              color: !data.filters.zone ? "steel.dark" : "amber.warm",
              bg: !data.filters.zone ? "amber.warm" : "rgba(201, 146, 42, 0.1)",
              border: "1px solid rgba(201, 146, 42, 0.3)",
              rounded: "pill", px: "3", py: "1", cursor: "pointer",
              transition: "all 0.15s",
            })}
          >
            Toate
          </button>
          {["Costa Blanca", "Costa Cálida", "Costa del Sol", "Valencia"].map((z) => (
            <button
              key={z}
              onClick={() => navigate("zone", data.filters.zone === z.toLowerCase() ? "" : z.toLowerCase())}
              className={css({
                fontSize: "meta", fontFamily: "display", fontWeight: "600", letterSpacing: "0.04em",
                color: data.filters.zone === z.toLowerCase() ? "steel.dark" : "amber.warm",
                bg: data.filters.zone === z.toLowerCase() ? "amber.warm" : "rgba(201, 146, 42, 0.1)",
                border: "1px solid rgba(201, 146, 42, 0.3)",
                rounded: "pill", px: "3", py: "1", cursor: "pointer",
                transition: "all 0.15s",
              })}
            >
              {z}
            </button>
          ))}
        </div>
      </header>

      {/* ── Listings ── */}
      <main
        className={css({
          mx: "auto", maxW: "6xl", px: { base: "5", md: "8" }, pb: "20",
          opacity: isPending ? "0.6" : "1", transition: "opacity 0.15s",
        })}
      >
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "5",
          })}
        >
          {data.listings.map((l, i) => (
            <article
              key={l.id}
              className={css({
                bg: "steel.surface",
                border: "1px solid",
                borderColor: "steel.border",
                rounded: "card",
                p: "6",
                transition: "all 0.2s ease",
                _hover: { borderColor: "steel.borderHover", shadow: "card.hover", transform: "translateY(-2px)" },
              })}
            >
              {/* ── Header ── */}
              <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: "2" })}>
                <div className={css({ display: "flex", alignItems: "baseline", gap: "2" })}>
                  <span className={css({ fontSize: "meta", fontFamily: "display", color: "text.faint", fontWeight: "600" })}>
                    #{i + 1}
                  </span>
                  <h2 className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary", letterSpacing: "h3" })}>
                    {l.complex_name ?? l.name.split("—")[0].trim()}
                  </h2>
                </div>
                <span className={css({ fontSize: "meta", fontFamily: "display", color: "amber.warm", fontWeight: "700", fontVariantNumeric: "tabular-nums", flexShrink: 0, ml: "3" })}>
                  {l.score.total.toFixed(1)}
                </span>
              </div>

              {/* ── City + zone ── */}
              <p className={css({ fontSize: "meta", color: "text.secondary", mb: "3" })}>
                {l.city} · {l.zone}
              </p>

              {/* ── Key metrics ── */}
              <div className={css({ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3", mb: "4" })}>
                <div>
                  <p className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "amber.warm" })}>
                    €{fmtPrice(l.price_eur)}
                  </p>
                  <p className={css({ fontSize: "11px", color: "text.faint", fontFamily: "display", textTransform: "uppercase", letterSpacing: "0.06em" })}>
                    Preț
                  </p>
                </div>
                <div>
                  <p className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary" })}>
                    {l.sqm ? `${l.sqm}m²` : "—"}
                  </p>
                  <p className={css({ fontSize: "11px", color: "text.faint", fontFamily: "display", textTransform: "uppercase", letterSpacing: "0.06em" })}>
                    Suprafață
                  </p>
                </div>
                <div>
                  <p className={css({ fontSize: "h3", fontWeight: "700", fontFamily: "display", color: "text.primary" })}>
                    {l.sea_distance_km !== null ? `${l.sea_distance_km}km` : "—"}
                  </p>
                  <p className={css({ fontSize: "11px", color: "text.faint", fontFamily: "display", textTransform: "uppercase", letterSpacing: "0.06em" })}>
                    La mare
                  </p>
                </div>
              </div>

              {/* ── Details row ── */}
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mb: "3", fontSize: "meta", color: "text.secondary" })}>
                {l.bedrooms && <span>{l.bedrooms} dormit.</span>}
                {l.bathrooms && <span>{l.bathrooms} băi</span>}
                {l.build_year && <span>Construit {l.build_year}</span>}
                {l.price_per_sqm && <span>€{fmtPrice(Math.round(l.price_per_sqm))}/m²</span>}
              </div>

              {/* ── Tags ── */}
              <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5", mb: "3" })}>
                {l.has_pool && (
                  <span className={css({ fontSize: "11px", color: "amber.warm", bg: "rgba(201, 146, 42, 0.1)", border: "1px solid rgba(201, 146, 42, 0.2)", rounded: "pill", px: "2", py: "0.5", fontFamily: "display" })}>
                    Pool
                  </span>
                )}
                {l.has_parking && (
                  <span className={css({ fontSize: "11px", color: "text.muted", bg: "rgba(255,255,255,0.05)", border: "1px solid", borderColor: "steel.border", rounded: "pill", px: "2", py: "0.5", fontFamily: "display" })}>
                    Parking
                  </span>
                )}
                {l.has_terrace && (
                  <span className={css({ fontSize: "11px", color: "text.muted", bg: "rgba(255,255,255,0.05)", border: "1px solid", borderColor: "steel.border", rounded: "pill", px: "2", py: "0.5", fontFamily: "display" })}>
                    Terasă
                  </span>
                )}
                {l.amenities.filter((a) => !["Pool", "Parking", "Terrace"].includes(a)).slice(0, 4).map((a) => (
                  <span
                    key={a}
                    className={css({ fontSize: "11px", color: "text.muted", bg: "rgba(255,255,255,0.05)", border: "1px solid", borderColor: "steel.border", rounded: "pill", px: "2", py: "0.5", fontFamily: "display" })}
                  >
                    {a}
                  </span>
                ))}
              </div>

              {/* ── Score breakdown ── */}
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

        {data.listings.length === 0 && (
          <p className={css({ textAlign: "center", py: "12", fontSize: "body", color: "text.muted" })}>
            Nicio proprietate găsită cu aceste filtre.
          </p>
        )}
      </main>
    </div>
  );
}
