"use client";

import { css } from "styled-system/css";

interface Phase {
  name: string;
  description: string;
  step_range: [number, number];
}

interface Scheme {
  phases: Phase[];
  summary: string;
}

const PHASE_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

export function BuildScheme({ scheme }: { scheme: Scheme }) {
  if (!scheme || !scheme.phases) return null;

  return (
    <div>
      {/* Section header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "2",
          mb: "4",
        })}
      >
        <div
          className={css({
            w: "5",
            h: "5",
            rounded: "stud",
            bg: "lego.red",
            boxShadow: "stud",
            flexShrink: 0,
          })}
        />
        <h2
          className={css({
            fontSize: "md",
            fontWeight: "800",
            fontFamily: "display",
            color: "ink.primary",
            letterSpacing: "-0.01em",
          })}
        >
          Build Overview
        </h2>
      </div>

      {scheme.summary && (
        <p
          className={css({
            mb: "5",
            fontSize: "sm",
            color: "ink.secondary",
            lineHeight: "1.7",
            bg: "plate.surface",
            rounded: "brick",
            px: "4",
            py: "3",
            border: "1px solid",
            borderColor: "plate.border",
            boxShadow: "plate",
          })}
        >
          {scheme.summary}
        </p>
      )}

      {/* Phase timeline — like instruction booklet sections */}
      <div className={css({ display: "flex", flexDir: "column", gap: "0" })}>
        {scheme.phases.map((phase, i) => {
          const color = PHASE_COLORS[i % PHASE_COLORS.length];
          const isLast = i === scheme.phases.length - 1;

          return (
            <div
              key={i}
              className={css({ display: "flex", gap: "4" })}
            >
              {/* Timeline track */}
              <div
                className={css({
                  display: "flex",
                  flexDir: "column",
                  alignItems: "center",
                  w: "8",
                  flexShrink: 0,
                })}
              >
                {/* Stud marker */}
                <div
                  className={css({
                    w: "8",
                    h: "8",
                    rounded: "stud",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "xs",
                    fontWeight: "900",
                    fontFamily: "display",
                    color: "white",
                    boxShadow: "stud",
                    flexShrink: 0,
                  })}
                  style={{ background: color }}
                >
                  {i + 1}
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={css({
                      w: "2px",
                      flex: 1,
                      minH: "4",
                      opacity: 0.2,
                    })}
                    style={{ background: color }}
                  />
                )}
              </div>

              {/* Phase content */}
              <div className={css({ pb: isLast ? "0" : "5", flex: 1 })}>
                <h3
                  className={css({
                    fontSize: "sm",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "ink.primary",
                  })}
                >
                  {phase.name}
                </h3>
                <p
                  className={css({
                    mt: "1",
                    fontSize: "xs",
                    color: "ink.muted",
                    lineHeight: "1.6",
                  })}
                >
                  {phase.description}
                </p>
                {phase.step_range && (
                  <span
                    className={css({
                      mt: "1.5",
                      display: "inline-block",
                      fontSize: "xs",
                      fontWeight: "600",
                      px: "2",
                      py: "0.5",
                      rounded: "md",
                      bg: "rgba(255,255,255,0.04)",
                      border: "1px solid",
                      borderColor: "plate.border",
                    })}
                    style={{ color }}
                  >
                    Steps {phase.step_range[0]}–{phase.step_range[1]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
