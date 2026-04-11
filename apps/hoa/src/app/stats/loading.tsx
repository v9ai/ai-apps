import { css, cx } from "styled-system/css";
import {
  Skeleton,
  SkeletonStatCard,
  SkeletonBarRow,
  SkeletonListRow,
} from "../_components/skeleton";

export default function StatsLoading() {
  return (
    <main
      className={css({
        minH: "screen",
        bg: "#0B0B0F",
        color: "#E8E8ED",
        pt: "20",
        pb: "24",
      })}
    >
      {/* ── Header skeleton ─────────────────────────────────────── */}
      <header
        className={css({
          borderBottomWidth: "1px",
          borderColor: "rgba(255,255,255,0.06)",
        })}
      >
        <div className={css({ maxW: "6xl", mx: "auto", px: "6", py: "10" })}>
          {/* Back link */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "1.5",
              mb: "6",
            })}
          >
            <Skeleton className={css({ h: "4", w: "4", rounded: "md" })} delay={0} />
            <Skeleton className={css({ h: "3.5", w: "28" })} delay={40} />
          </div>

          {/* Dashboard label */}
          <Skeleton className={css({ h: "3", w: "16", mb: "2" })} delay={80} />

          {/* Title — ~200px on mobile, wider on sm/md (matches real page h1) */}
          <Skeleton
            className={css({ h: "10", w: "72", rounded: "lg", mb: "3", sm: { h: "12", w: "112" } })}
            delay={120}
          />

          {/* Subtitle */}
          <Skeleton
            className={css({ h: "4", w: "64", sm: { w: "96" } })}
            delay={180}
          />
        </div>
      </header>

      <div className={css({ maxW: "6xl", mx: "auto", px: "6" })}>
        {/* ── Stat cards — 2-col base, 4-col md (matches real page) ── */}
        <section
          className={css({
            mt: "10",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "4",
            md: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" },
          })}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonStatCard key={i} delay={i * 60} />
          ))}
        </section>

        {/* ── Category Breakdown ──────────────────────────────────── */}
        <section className={css({ mt: "16" })}>
          <div className={css({ mb: "6" })}>
            <Skeleton className={css({ h: "5", w: "48", mb: "1" })} delay={0} />
            <Skeleton className={css({ h: "3.5", w: "72" })} delay={60} />
          </div>

          <div
            className={css({
              bg: "#141418",
              borderWidth: "1px",
              borderColor: "rgba(255,255,255,0.06)",
              rounded: "xl",
              p: "6",
            })}
          >
            <div className={css({ display: "flex", flexDir: "column", gap: "4" })}>
              {["85%", "70%", "55%", "45%", "35%", "25%", "20%"].map((w, i) => (
                <SkeletonBarRow key={i} width={w} delay={i * 50} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Two-column: Top Repos + Language Distribution ───────── */}
        <div
          className={css({
            mt: "16",
            display: "grid",
            gap: "6",
            lg: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
          })}
        >
          {/* Top Repositories */}
          <section>
            <div className={css({ mb: "6" })}>
              <Skeleton className={css({ h: "5", w: "40", mb: "1" })} delay={0} />
              <Skeleton className={css({ h: "3.5", w: "64" })} delay={60} />
            </div>

            <div
              className={css({
                bg: "#141418",
                borderWidth: "1px",
                borderColor: "rgba(255,255,255,0.06)",
                rounded: "xl",
                overflow: "hidden",
              })}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "4",
                    px: "5",
                    py: "3.5",
                    borderTopWidth: i > 0 ? "1px" : undefined,
                    borderColor: "rgba(255,255,255,0.04)",
                  })}
                >
                  <Skeleton
                    className={css({ h: "3", w: "4", flexShrink: 0 })}
                    delay={i * 40}
                  />
                  <div className={css({ flex: "1", minW: "0" })}>
                    <Skeleton
                      className={css({ h: "3.5", w: "3/4", mb: "1" })}
                      delay={i * 40 + 20}
                    />
                    <Skeleton
                      className={css({ h: "2.5", w: "1/2" })}
                      delay={i * 40 + 40}
                    />
                  </div>
                  <div
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5",
                      flexShrink: 0,
                    })}
                  >
                    <Skeleton
                      className={css({ h: "3.5", w: "3.5", rounded: "md" })}
                      delay={i * 40 + 60}
                    />
                    <Skeleton
                      className={css({ h: "3.5", w: "10" })}
                      delay={i * 40 + 80}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Language Distribution */}
          <section>
            <div className={css({ mb: "6" })}>
              <Skeleton className={css({ h: "5", w: "48", mb: "1" })} delay={0} />
              <Skeleton className={css({ h: "3.5", w: "56" })} delay={60} />
            </div>

            <div
              className={css({
                bg: "#141418",
                borderWidth: "1px",
                borderColor: "rgba(255,255,255,0.06)",
                rounded: "xl",
                p: "6",
              })}
            >
              {/* Stacked bar placeholder */}
              <Skeleton
                className={css({ h: "5", w: "full", rounded: "full", mb: "6" })}
                delay={0}
              />

              {/* Legend grid */}
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  columnGap: "6",
                  rowGap: "2.5",
                })}
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    })}
                  >
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "2",
                        minW: "0",
                      })}
                    >
                      <Skeleton
                        className={css({ w: "2.5", h: "2.5", rounded: "full", flexShrink: 0 })}
                        delay={i * 30}
                      />
                      <Skeleton
                        className={css({ h: "3.5", w: "16" })}
                        delay={i * 30 + 15}
                      />
                    </div>
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "center",
                        gap: "2",
                        flexShrink: 0,
                        ml: "2",
                      })}
                    >
                      <Skeleton
                        className={css({ h: "3", w: "6" })}
                        delay={i * 30 + 30}
                      />
                      <Skeleton
                        className={css({ h: "3", w: "8" })}
                        delay={i * 30 + 45}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ── Most Prolific (3-column leaderboards) ───────────────── */}
        <section className={css({ mt: "16" })}>
          <div className={css({ mb: "6" })}>
            <Skeleton className={css({ h: "5", w: "32", mb: "1" })} delay={0} />
            <Skeleton className={css({ h: "3.5", w: "56" })} delay={60} />
          </div>

          <div
            className={css({
              display: "grid",
              gap: "4",
              md: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))" },
            })}
          >
            {[0, 1, 2].map((colIdx) => (
              <div
                key={colIdx}
                className={css({
                  bg: "#141418",
                  borderWidth: "1px",
                  borderColor: "rgba(255,255,255,0.06)",
                  rounded: "xl",
                  p: "5",
                })}
              >
                {/* Column header */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    mb: "4",
                  })}
                >
                  <Skeleton
                    className={css({ h: "4", w: "4", rounded: "md" })}
                    delay={colIdx * 80}
                  />
                  <Skeleton
                    className={css({ h: "3", w: "28" })}
                    delay={colIdx * 80 + 40}
                  />
                </div>

                {/* 5 list rows */}
                <div className={css({ display: "flex", flexDir: "column", gap: "3" })}>
                  {Array.from({ length: 5 }).map((_, rowIdx) => (
                    <SkeletonListRow
                      key={rowIdx}
                      delay={colIdx * 80 + rowIdx * 40}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className={css({ mt: "20", textAlign: "center" })}>
          <div
            className={cx("gradient-divider", css({ maxW: "xs", mx: "auto", mb: "6" }))}
          />
          <Skeleton className={css({ h: "3", w: "72", mx: "auto" })} delay={0} />
        </div>
      </div>
    </main>
  );
}
