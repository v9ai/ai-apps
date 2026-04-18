"use client";

import { useState } from "react";
import { css } from "styled-system/css";

export type MotorChoice =
  | "spike-small"
  | "spike-medium"
  | "spike-large"
  | "mindstorms-large"
  | "technic-l"
  | "technic-xl";

const MOTOR_OPTIONS: {
  value: MotorChoice;
  label: string;
  part: string;
  image: string;
}[] = [
  {
    value: "spike-small",
    label: "SPIKE Small",
    part: "68488",
    image: "https://cdn.rebrickable.com/media/parts/elements/6305270.jpg",
  },
  {
    value: "spike-medium",
    label: "SPIKE Medium",
    part: "54696",
    image: "https://cdn.rebrickable.com/media/parts/elements/6359216.jpg",
  },
  {
    value: "spike-large",
    label: "SPIKE Large",
    part: "54675",
    image: "https://cdn.rebrickable.com/media/parts/elements/6265698.jpg",
  },
  {
    value: "mindstorms-large",
    label: "MINDSTORMS Large",
    part: "69730",
    image: "https://cdn.rebrickable.com/media/parts/elements/6317490.jpg",
  },
  {
    value: "technic-l",
    label: "Technic L",
    part: "22169",
    image: "https://cdn.rebrickable.com/media/parts/elements/6214085.jpg",
  },
  {
    value: "technic-xl",
    label: "Technic XL",
    part: "22172",
    image: "https://cdn.rebrickable.com/media/parts/elements/6214088.jpg",
  },
];

const MOTOR_TAG_RE = /^\s*#\s*bricks:motor\s*=\s*([a-z-]+)\s*$/;
const VALID_CHOICES = new Set(MOTOR_OPTIONS.map((o) => o.value));

export function detectActiveMotor(code: string): MotorChoice | null {
  for (const line of code.split("\n")) {
    const m = line.match(MOTOR_TAG_RE);
    if (m && VALID_CHOICES.has(m[1] as MotorChoice)) {
      return m[1] as MotorChoice;
    }
  }
  return null;
}

export function setActiveMotor(code: string, motor: MotorChoice): string {
  const lines = code.split("\n");
  const tagLine = `# bricks:motor=${motor}`;

  const existingIdx = lines.findIndex((l) => MOTOR_TAG_RE.test(l));
  if (existingIdx >= 0) {
    lines[existingIdx] = tagLine;
    return lines.join("\n");
  }

  const motorIdx = lines.findIndex((l) =>
    /=\s*Motor\(Port\.[A-Z]/.test(l),
  );
  if (motorIdx < 0) return code;

  lines.splice(motorIdx, 0, tagLine);
  return lines.join("\n");
}

export function MotorPicker({
  value,
  onChange,
  heading,
  portLabel,
  port,
}: {
  value: MotorChoice;
  onChange: (motor: MotorChoice) => void;
  heading: string;
  portLabel: string;
  port: string;
}) {
  return (
    <div className={css({ mb: "6" })}>
      <div
        className={css({
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          mb: "3",
          gap: "3",
        })}
      >
        <h3
          className={css({
            fontSize: "sm",
            fontWeight: "700",
            fontFamily: "display",
            color: "ink.muted",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          })}
        >
          {heading}
        </h3>
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "600",
            color: "ink.faint",
            fontFamily: "mono, monospace",
          })}
        >
          {portLabel} {port}
        </span>
      </div>
      <div
        role="radiogroup"
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "3",
        })}
      >
        {MOTOR_OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={css({
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2",
                p: "3",
                rounded: "brick",
                bg: "plate.surface",
                border: "2px solid",
                borderColor: selected ? "lego.orange" : "plate.border",
                cursor: "pointer",
                transition: "all 0.15s",
                _hover: {
                  borderColor: selected ? "lego.orange" : "ink.faint",
                  transform: "translateY(-1px)",
                },
              })}
              style={
                selected
                  ? { boxShadow: "0 0 0 3px rgba(254, 138, 24, 0.15)" }
                  : undefined
              }
            >
              <img
                src={opt.image}
                alt={opt.label}
                loading="lazy"
                referrerPolicy="no-referrer"
                className={css({
                  w: "32",
                  h: "32",
                  objectFit: "contain",
                })}
              />
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: selected ? "ink.primary" : "ink.secondary",
                  textAlign: "center",
                  lineHeight: "1.2",
                })}
              >
                {opt.label}
              </span>
              <span
                className={css({
                  fontSize: "2xs",
                  color: "ink.faint",
                  fontFamily: "mono, monospace",
                })}
              >
                {opt.part}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
