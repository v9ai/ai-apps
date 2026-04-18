"use client";

import { useEffect, useState } from "react";
import { css } from "styled-system/css";

export type MotorChoice =
  | "spike-small"
  | "spike-medium"
  | "spike-large"
  | "technic-m"
  | "technic-l"
  | "technic-xl";

const MOTOR_OPTIONS: {
  value: MotorChoice;
  label: string;
  part: string;
  image: string;
  scale: number;
}[] = [
  {
    value: "spike-small",
    label: "SPIKE Small",
    part: "45607",
    image: "/devices/pupdevice-motors.png",
    scale: 0.6,
  },
  {
    value: "spike-medium",
    label: "SPIKE Medium",
    part: "45603",
    image: "/devices/pupdevice-motors.png",
    scale: 0.8,
  },
  {
    value: "spike-large",
    label: "SPIKE Large",
    part: "45602",
    image: "/devices/pupdevice-motors.png",
    scale: 1.0,
  },
  {
    value: "technic-m",
    label: "Technic M",
    part: "88018",
    image: "/devices/pupdevice-motors.png",
    scale: 0.7,
  },
  {
    value: "technic-l",
    label: "Technic L",
    part: "88008",
    image: "/devices/pupdevice-motors.png",
    scale: 0.9,
  },
  {
    value: "technic-xl",
    label: "Technic XL",
    part: "88011",
    image: "/devices/pupdevice-motors.png",
    scale: 1.1,
  },
];

function storageKey(slug: string) {
  return `bricks-motor-${slug}`;
}

export function useMotorChoice(
  slug: string,
  fallback: MotorChoice = "spike-medium",
): [MotorChoice, (choice: MotorChoice) => void] {
  const [choice, setChoice] = useState<MotorChoice>(fallback);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(slug));
      if (stored && MOTOR_OPTIONS.some((o) => o.value === stored)) {
        setChoice(stored as MotorChoice);
      }
    } catch {
      // ignore
    }
  }, [slug]);

  const update = (next: MotorChoice) => {
    setChoice(next);
    try {
      localStorage.setItem(storageKey(slug), next);
    } catch {
      // ignore
    }
  };

  return [choice, update];
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
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
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
              <div
                className={css({
                  w: "16",
                  h: "16",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                })}
              >
                <img
                  src={opt.image}
                  alt={opt.label}
                  loading="lazy"
                  className={css({
                    maxW: "100%",
                    maxH: "100%",
                    objectFit: "contain",
                  })}
                  style={{ transform: `scale(${opt.scale})` }}
                />
              </div>
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
