"use client";

import Link from "next/link";
import { css } from "styled-system/css";

interface Part {
  name: string;
  quantity: number;
  color: string;
  part_number: string;
}

const LEGO_COLOR_MAP: Record<string, string> = {
  red: "#E3000B",
  yellow: "#FFD500",
  blue: "#006CB7",
  green: "#00852B",
  orange: "#FE8A18",
  black: "#1B1B1B",
  white: "#F4F4F0",
  gray: "#6B6E6F",
  "light gray": "#C4C4C4",
  "dark gray": "#4C4E4F",
  tan: "#D7C599",
  brown: "#7B5B3A",
  "dark blue": "#003A70",
  "bright green": "#58AB41",
  "lime green": "#A6CA55",
  purple: "#8B4798",
  pink: "#F5C5D0",
};

function getColorHex(colorName: string): string | null {
  const lower = colorName.toLowerCase();
  return LEGO_COLOR_MAP[lower] ?? null;
}

export function PartsList({ parts }: { parts: Part[] }) {
  if (!parts || parts.length === 0) return null;

  const totalPieces = parts.reduce((sum, p) => sum + (p.quantity || 1), 0);

  return (
    <div>
      {/* Section header — instruction booklet style */}
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
            bg: "lego.green",
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
          Parts List
        </h2>
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "700",
            color: "lego.yellow",
            bg: "rgba(255, 213, 0, 0.1)",
            px: "2",
            py: "0.5",
            rounded: "md",
          })}
        >
          {totalPieces} pcs
        </span>
      </div>

      {/* Parts grid */}
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          gap: "1.5",
        })}
      >
        {parts.map((part, i) => {
          const hex = getColorHex(part.color);
          const partLink = part.part_number ? `/parts/${encodeURIComponent(part.part_number)}` : null;
          const Wrapper = partLink ? Link : "div";
          const wrapperProps = partLink ? { href: partLink } : {};
          return (
            <Wrapper
              key={i}
              {...wrapperProps as any}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                bg: "plate.surface",
                rounded: "brick",
                px: "3",
                py: "2.5",
                border: "1px solid",
                borderColor: "plate.border",
                boxShadow: "plate",
                textDecoration: "none",
                cursor: partLink ? "pointer" : "default",
                transition: "all 0.15s ease",
                _hover: {
                  bg: "plate.hover",
                  borderColor: "plate.borderHover",
                  transform: "translateY(-1px)",
                  boxShadow: "brick",
                },
              })}
            >
              {/* Color swatch — brick stud */}
              <div
                className={css({
                  w: "6",
                  h: "6",
                  rounded: "stud",
                  flexShrink: 0,
                  boxShadow: "stud",
                  border: "1px solid rgba(255,255,255,0.1)",
                })}
                style={{ background: hex || "#6B6E6F" }}
              />

              {/* Part info */}
              <div className={css({ flex: 1, minW: 0 })}>
                <div
                  className={css({
                    fontSize: "sm",
                    fontWeight: "600",
                    color: "ink.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  })}
                >
                  {part.name}
                </div>
                <div
                  className={css({
                    fontSize: "xs",
                    color: "ink.muted",
                    mt: "0.5",
                  })}
                >
                  {part.color}
                  {part.part_number ? ` · #${part.part_number}` : ""}
                </div>
              </div>

              {/* Quantity badge */}
              <div
                className={css({
                  fontSize: "sm",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "lego.yellow",
                  bg: "rgba(255, 213, 0, 0.08)",
                  px: "2.5",
                  py: "1",
                  rounded: "md",
                  minW: "8",
                  textAlign: "center",
                })}
              >
                ×{part.quantity}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
