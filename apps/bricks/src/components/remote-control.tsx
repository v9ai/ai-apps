"use client";

import { css } from "styled-system/css";
import { ParsedScript } from "@/lib/parser";

interface ButtonSlot {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  rx: number;
}

const REMOTE_BUTTONS: ButtonSlot[] = [
  { id: "Left +", label: "+", x: 30, y: 50, w: 44, h: 30, color: "#6b7280", rx: 6 },
  { id: "Left (red)", label: "Stop", x: 30, y: 90, w: 44, h: 24, color: "#ef4444", rx: 4 },
  { id: "Left -", label: "-", x: 30, y: 124, w: 44, h: 30, color: "#6b7280", rx: 6 },
  { id: "Right +", label: "+", x: 106, y: 50, w: 44, h: 30, color: "#6b7280", rx: 6 },
  { id: "Right (red)", label: "Stop", x: 106, y: 90, w: 44, h: 24, color: "#ef4444", rx: 4 },
  { id: "Right -", label: "-", x: 106, y: 124, w: 44, h: 30, color: "#6b7280", rx: 6 },
  { id: "Center (green)", label: "Center", x: 62, y: 168, w: 56, h: 22, color: "#22c55e", rx: 11 },
];

export function RemoteControl({ script }: { script: ParsedScript }) {
  if (!script.hasRemote) return null;

  const actionMap = new Map(
    script.buttonActions.map((ba) => [ba.button, ba.action])
  );

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
        Remote Control
      </h3>
      <div
        className={css({
          display: "flex",
          gap: "6",
          alignItems: "flex-start",
        })}
      >
        <svg
          viewBox="0 0 180 210"
          className={css({ w: "44", flexShrink: 0 })}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x={15}
            y={10}
            width={150}
            height={190}
            rx={20}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={2}
          />
          <circle cx={90} cy={30} r={4} fill="#a78bfa" opacity={0.6} />
          <text x={52} y={44} textAnchor="middle" fill="#9ca3af" fontSize={9}>
            LEFT
          </text>
          <text x={128} y={44} textAnchor="middle" fill="#9ca3af" fontSize={9}>
            RIGHT
          </text>
          <line
            x1={90}
            y1={48}
            x2={90}
            y2={160}
            stroke="#334155"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          {REMOTE_BUTTONS.map((btn) => {
            const hasAction = actionMap.has(btn.id);
            return (
              <g key={btn.id}>
                <rect
                  x={btn.x}
                  y={btn.y}
                  width={btn.w}
                  height={btn.h}
                  rx={btn.rx}
                  fill={hasAction ? btn.color + "30" : "#0f172a"}
                  stroke={hasAction ? btn.color : "#334155"}
                  strokeWidth={hasAction ? 2 : 1}
                />
                <text
                  x={btn.x + btn.w / 2}
                  y={btn.y + btn.h / 2 + 4}
                  textAnchor="middle"
                  fill={hasAction ? btn.color : "#4b5563"}
                  fontSize={btn.label === "Center" ? 9 : 12}
                  fontWeight="bold"
                >
                  {btn.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div
          className={css({
            display: "flex",
            flexDir: "column",
            gap: "2",
            fontSize: "sm",
            minW: 0,
          })}
        >
          {script.buttonActions.length > 0 ? (
            script.buttonActions.map((ba) => (
              <div
                key={ba.button}
                className={css({
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "2",
                  bg: "plate.surface",
                  rounded: "lg",
                  px: "3",
                  py: "2",
                  border: "1px solid",
                  borderColor: "plate.border",
                })}
              >
                <span
                  className={css({
                    fontSize: "xs",
                    fontFamily: "mono",
                    color: "#a78bfa",
                    flexShrink: 0,
                    mt: "0.5",
                    bg: "rgba(167, 139, 250, 0.1)",
                    px: "1.5",
                    py: "0.5",
                    rounded: "sm",
                  })}
                >
                  {ba.button}
                </span>
                <span
                  className={css({
                    color: "ink.secondary",
                    fontSize: "xs",
                  })}
                >
                  {ba.action}
                </span>
              </div>
            ))
          ) : (
            <p
              className={css({
                color: "ink.faint",
                fontSize: "xs",
                fontStyle: "italic",
              })}
            >
              No button actions parsed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
