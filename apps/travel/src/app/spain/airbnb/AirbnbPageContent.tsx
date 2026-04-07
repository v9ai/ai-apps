"use client";

import { css } from "styled-system/css";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { AirbnbData } from "@/lib/airbnb";

const FILTER_LABELS = ["Pool", "Casă întreagă", "1-30 Iunie 2026"];

export function AirbnbPageContent({ data }: { data: AirbnbData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const priceMax = data.filters.priceMax;

  const onPriceChange = useCallback(
    (value: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("price_max", String(value));
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

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
            Airbnb Spania
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
          Iunie 2026
        </h1>

        <p
          className={css({
            mt: "4",
            fontSize: "body",
            color: "text.secondary",
            lineHeight: "body",
          })}
        >
          Link-uri directe cu filtre pre-setate — click și vezi prețuri instant
        </p>

        <p
          className={css({
            mt: "2",
            fontSize: "meta",
            fontFamily: "display",
            color: "text.muted",
            fontWeight: "400",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          })}
        >
          {data.stats.regions} regiuni · {data.stats.cities} orașe · Piscină · Casă întreagă
        </p>

        {/* ── Filter pills ── */}
        <div
          className={css({
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "2",
            mt: "6",
          })}
        >
          {FILTER_LABELS.map((f) => (
            <span
              key={f}
              className={css({
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
              })}
            >
              {f}
            </span>
          ))}
          <span
            className={css({
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
            })}
          >
            max €{priceMax}/noapte
          </span>
        </div>

        {/* ── Price slider ── */}
        <div
          className={css({
            mt: "6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4",
          })}
        >
          <label
            className={css({
              fontSize: "meta",
              fontFamily: "display",
              color: "text.muted",
              fontWeight: "600",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            })}
          >
            Max/noapte
          </label>
          <input
            type="range"
            min={20}
            max={100}
            defaultValue={priceMax}
            onMouseUp={(e) => onPriceChange(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => onPriceChange(Number((e.target as HTMLInputElement).value))}
            onChange={(e) => {
              // Update the displayed value immediately via sibling
              const display = (e.target as HTMLElement).parentElement?.querySelector("[data-price]");
              if (display) display.textContent = `€${e.target.value}`;
              // Update total display
              const total = document.querySelector("[data-total]");
              if (total) total.textContent = `~€${Number(e.target.value) * data.filters.nights} total / ${data.filters.nights} nopți (fără cleaning fee)`;
            }}
            className={css({
              w: "32",
              accentColor: "#c9922a",
              cursor: "pointer",
            })}
          />
          <span
            data-price
            className={css({
              fontSize: "h3",
              fontWeight: "700",
              fontFamily: "display",
              color: "amber.warm",
              letterSpacing: "h3",
              fontVariantNumeric: "tabular-nums",
              minW: "4ch",
              textAlign: "right",
            })}
          >
            €{priceMax}
          </span>
        </div>
        <p
          data-total
          className={css({
            mt: "1",
            fontSize: "meta",
            color: "text.faint",
            fontFamily: "display",
          })}
        >
          ~€{priceMax * data.filters.nights} total / {data.filters.nights} nopți (fără cleaning fee)
        </p>
      </header>

      {/* ── Regions ── */}
      <main
        className={css({
          mx: "auto",
          maxW: "6xl",
          px: { base: "5", md: "8" },
          pb: "12",
          opacity: isPending ? "0.6" : "1",
          transition: "opacity 0.15s",
        })}
      >
        {data.regions.map((region) => (
          <section key={region.region} className={css({ mb: "10" })}>
            <h2
              className={css({
                fontSize: "h2",
                fontWeight: "700",
                fontFamily: "display",
                color: "text.primary",
                letterSpacing: "h2",
                mb: "4",
                pb: "3",
                borderBottom: "1px solid",
                borderColor: "steel.border",
              })}
            >
              {region.regionRo}
            </h2>

            <div
              className={css({
                display: "grid",
                gridTemplateColumns: {
                  base: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                },
                gap: "4",
              })}
            >
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
                    _hover: {
                      borderColor: "amber.warm",
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
                      mb: "2",
                    })}
                  >
                    <h3
                      className={css({
                        fontSize: "h3",
                        fontWeight: "700",
                        fontFamily: "display",
                        color: "text.primary",
                        letterSpacing: "h3",
                      })}
                    >
                      {city.city}
                    </h3>
                    <span
                      className={css({
                        fontSize: "meta",
                        fontFamily: "display",
                        color: "amber.warm",
                        fontWeight: "700",
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                        ml: "3",
                      })}
                    >
                      max €{city.priceMax}/n
                    </span>
                  </div>

                  {city.note && (
                    <p
                      className={css({
                        fontSize: "meta",
                        color: "text.secondary",
                        lineHeight: "body",
                        mb: "2",
                      })}
                    >
                      {city.note}
                    </p>
                  )}

                  <p
                    className={css({
                      fontSize: "meta",
                      color: "text.faint",
                      fontFamily: "display",
                      mb: "2",
                    })}
                  >
                    ~€{city.estimatedTotal} total
                  </p>

                  <div
                    className={css({
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "1.5",
                    })}
                  >
                    {["Pool", "Casă întreagă", "Iunie 2026"].map((tag) => (
                      <span
                        key={tag}
                        className={css({
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
                        })}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p
                    className={css({
                      mt: "3",
                      fontSize: "meta",
                      color: "amber.warm",
                      fontWeight: "600",
                      fontFamily: "display",
                      letterSpacing: "0.04em",
                    })}
                  >
                    Deschide pe Airbnb →
                  </p>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ── Tips ── */}
      <section
        className={css({
          mx: "auto",
          maxW: "3xl",
          px: { base: "5", md: "8" },
          pb: "20",
        })}
      >
        <h2
          className={css({
            fontSize: "h3",
            fontWeight: "700",
            fontFamily: "display",
            color: "text.primary",
            letterSpacing: "h3",
            mb: "4",
            pb: "3",
            borderBottom: "1px solid",
            borderColor: "steel.border",
          })}
        >
          Sfaturi practice
        </h2>

        <ul className={css({ listStyle: "none", p: "0", m: "0" })}>
          {data.tips.map((tip, i) => (
            <li
              key={i}
              className={css({
                fontSize: "body",
                color: "text.secondary",
                lineHeight: "body",
                py: "3",
                borderBottom: "1px solid",
                borderColor: "steel.border",
                _last: { borderBottom: "none" },
              })}
            >
              <span className={css({ color: "amber.warm", mr: "2", fontWeight: "700" })}>·</span>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
