"use client";

import { useState } from "react";
import { css } from "styled-system/css";

interface Step {
  step_number: number;
  description: string;
  parts_used: string[];
  notes: string;
}

const STEP_COLORS = [
  "#E3000B", "#006CB7", "#00852B", "#FE8A18", "#FFD500",
  "#8B4798", "#003A70", "#58AB41", "#E3000B", "#006CB7",
];

export function BuildSteps({ steps }: { steps: Step[] }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (!steps || steps.length === 0) return null;

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
            bg: "lego.blue",
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
          Building Steps
        </h2>
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "700",
            color: "lego.blue",
            bg: "rgba(0, 108, 183, 0.1)",
            px: "2",
            py: "0.5",
            rounded: "md",
          })}
        >
          {steps.length} steps
        </span>
      </div>

      <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
        {steps.map((step) => {
          const isExpanded = expandedStep === step.step_number;
          const studColor =
            STEP_COLORS[(step.step_number - 1) % STEP_COLORS.length];

          return (
            <div
              key={step.step_number}
              className={css({
                rounded: "brick",
                border: "1px solid",
                borderColor: isExpanded ? "plate.borderHover" : "plate.border",
                bg: "plate.surface",
                boxShadow: isExpanded ? "brick" : "plate",
                transition: "all 0.2s ease",
                _hover: {
                  borderColor: "plate.borderHover",
                  boxShadow: "brick",
                },
              })}
            >
              <button
                onClick={() =>
                  setExpandedStep(isExpanded ? null : step.step_number)
                }
                className={css({
                  display: "flex",
                  w: "full",
                  alignItems: "flex-start",
                  gap: "3",
                  px: "4",
                  py: "3",
                  textAlign: "left",
                  cursor: "pointer",
                  rounded: "brick",
                  transition: "background 0.15s ease",
                  _hover: { bg: "plate.hover" },
                })}
              >
                {/* Stud-shaped step number */}
                <div
                  className={css({
                    w: "8",
                    h: "8",
                    rounded: "stud",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "sm",
                    fontWeight: "900",
                    fontFamily: "display",
                    color: "white",
                    flexShrink: 0,
                    boxShadow: "stud",
                    transition: "transform 0.15s ease",
                  })}
                  style={{ background: studColor }}
                >
                  {step.step_number}
                </div>

                <div className={css({ flex: 1, pt: "1" })}>
                  <span
                    className={css({
                      fontSize: "sm",
                      color: "ink.primary",
                      lineHeight: "1.5",
                    })}
                  >
                    {step.description}
                  </span>
                </div>

                {/* Expand chevron */}
                <span
                  className={css({
                    color: "ink.muted",
                    fontSize: "lg",
                    transition: "transform 0.2s ease",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    mt: "1",
                  })}
                >
                  ▾
                </span>
              </button>

              {isExpanded && (
                <div
                  className={css({
                    borderTop: "1px solid",
                    borderColor: "plate.border",
                    px: "4",
                    py: "3",
                    ml: "11",
                  })}
                >
                  {step.parts_used && step.parts_used.length > 0 && (
                    <div className={css({ mb: "2" })}>
                      <span
                        className={css({
                          fontSize: "xs",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "ink.muted",
                        })}
                      >
                        Parts needed
                      </span>
                      <div
                        className={css({
                          mt: "1.5",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "1.5",
                        })}
                      >
                        {step.parts_used.map((p, i) => (
                          <span
                            key={i}
                            className={css({
                              rounded: "md",
                              bg: "plate.raised",
                              border: "1px solid",
                              borderColor: "plate.border",
                              px: "2.5",
                              py: "1",
                              fontSize: "xs",
                              fontWeight: "500",
                              color: "ink.secondary",
                            })}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {step.notes && (
                    <p
                      className={css({
                        fontSize: "xs",
                        color: "ink.muted",
                        fontStyle: "italic",
                        mt: "1",
                      })}
                    >
                      {step.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
