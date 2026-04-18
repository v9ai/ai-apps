"use client";

import { useState } from "react";
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

export type HubPickerLabels = {
  heading: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
};

export function HubPicker({
  value,
  onChange,
  dirty = false,
  onSave,
  labels,
}: {
  value: HubChoice;
  onChange: (hub: HubChoice) => void;
  dirty?: boolean;
  onSave?: () => Promise<void>;
  labels: HubPickerLabels;
}) {
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const handleSave = async () => {
    if (!onSave || saveState === "saving") return;
    setSaveState("saving");
    try {
      await onSave();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const buttonLabel =
    saveState === "saving"
      ? labels.saving
      : saveState === "saved"
        ? labels.saved
        : saveState === "error"
          ? labels.saveError
          : labels.save;

  const saveVisible = onSave && (dirty || saveState !== "idle");

  return (
    <div className={css({ mb: "6" })}>
      <div
        className={css({
          display: "flex",
          alignItems: "center",
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
          {labels.heading}
        </h3>
        {saveVisible && (
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || !dirty}
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              px: "3",
              py: "1.5",
              rounded: "full",
              border: "1.5px solid",
              cursor: "pointer",
              transition: "all 0.15s",
              _disabled: {
                opacity: 0.6,
                cursor: "default",
              },
            })}
            style={{
              backgroundColor:
                saveState === "saved"
                  ? "rgba(74, 222, 128, 0.15)"
                  : saveState === "error"
                    ? "rgba(248, 113, 113, 0.15)"
                    : "rgba(254, 138, 24, 0.15)",
              borderColor:
                saveState === "saved"
                  ? "#4ade80"
                  : saveState === "error"
                    ? "#f87171"
                    : "#FE8A18",
              color:
                saveState === "saved"
                  ? "#4ade80"
                  : saveState === "error"
                    ? "#f87171"
                    : "#FE8A18",
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>
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
