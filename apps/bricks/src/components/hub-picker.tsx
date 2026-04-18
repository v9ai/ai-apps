"use client";

import { css } from "styled-system/css";

export type HubChoice =
  | "EssentialHub"
  | "PrimeHub"
  | "InventorHub"
  | "TechnicHub"
  | "CityHub"
  | "MoveHub";

const HUB_OPTIONS: { value: HubChoice; label: string; image: string }[] = [
  { value: "EssentialHub", label: "Essential", image: "/hubs/hub-essential.png" },
  { value: "PrimeHub", label: "Prime", image: "/hubs/hub-prime.png" },
  { value: "InventorHub", label: "Inventor", image: "/hubs/hub-prime.png" },
  { value: "TechnicHub", label: "Technic", image: "/hubs/hub-technic.png" },
  { value: "CityHub", label: "City", image: "/hubs/hub-city.png" },
  { value: "MoveHub", label: "Move", image: "/hubs/hub-move.png" },
];

export function HubPicker({
  value,
  onChange,
  label,
}: {
  value: HubChoice;
  onChange: (hub: HubChoice) => void;
  label: string;
}) {
  return (
    <div className={css({ mb: "6" })}>
      <h3
        className={css({
          fontSize: "sm",
          fontWeight: "700",
          fontFamily: "display",
          color: "ink.muted",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          mb: "3",
        })}
      >
        {label}
      </h3>
      <div
        role="radiogroup"
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "3",
        })}
      >
        {HUB_OPTIONS.map((opt) => {
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
                className={css({
                  w: "16",
                  h: "16",
                  objectFit: "contain",
                })}
              />
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: selected ? "ink.primary" : "ink.secondary",
                })}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HUB_IMPORT_RE =
  /^(\s*)(#\s*)?from pybricks\.hubs import (\w+) as Hub\s*$/;

export function detectActiveHub(code: string): HubChoice | null {
  for (const line of code.split("\n")) {
    const m = line.match(HUB_IMPORT_RE);
    if (m && !m[2]) {
      return m[3] as HubChoice;
    }
  }
  return null;
}

export function setActiveHub(code: string, hub: HubChoice): string {
  return code
    .split("\n")
    .map((line) => {
      const m = line.match(HUB_IMPORT_RE);
      if (!m) return line;
      const indent = m[1];
      const importedHub = m[3];
      if (importedHub === hub) {
        return `${indent}from pybricks.hubs import ${importedHub} as Hub`;
      }
      return `${indent}# from pybricks.hubs import ${importedHub} as Hub`;
    })
    .join("\n");
}
