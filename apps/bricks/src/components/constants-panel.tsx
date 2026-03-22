"use client";

import { css } from "styled-system/css";
import { ParsedScript } from "@/lib/parser";

export function ConstantsPanel({ script }: { script: ParsedScript }) {
  if (script.constants.length === 0) return null;

  return (
    <div>
      <h3
        className={css({
          fontSize: "sm",
          fontWeight: "600",
          color: "ink.muted",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          mb: "3",
        })}
      >
        Constants
      </h3>
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5",
        })}
      >
        {script.constants.map((c) => (
          <div
            key={c.name}
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bg: "plate.surface",
              rounded: "sm",
              px: "2.5",
              py: "1.5",
              border: "1px solid",
              borderColor: "plate.border",
            })}
          >
            <span
              className={css({
                fontSize: "xs",
                fontFamily: "mono",
                color: "lego.yellow",
              })}
            >
              {c.name}
            </span>
            <span
              className={css({
                fontSize: "xs",
                fontFamily: "mono",
                color: "ink.secondary",
              })}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
