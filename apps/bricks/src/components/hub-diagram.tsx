"use client";

import { css } from "styled-system/css";
import {
  ParsedScript,
  hubDisplayName,
  hubPorts,
  hubColor,
  deviceIcon,
} from "@/lib/parser";

const PYBRICKS_COLORS: Record<string, string> = {
  RED: "#ef4444",
  GREEN: "#22c55e",
  BLUE: "#3b82f6",
  YELLOW: "#eab308",
  ORANGE: "#f97316",
  WHITE: "#f5f5f5",
  CYAN: "#06b6d4",
  MAGENTA: "#d946ef",
  VIOLET: "#8b5cf6",
  NONE: "#374151",
};

export function HubDiagram({ script }: { script: ParsedScript }) {
  const ports = hubPorts(script.hubType);
  const color = hubColor(script.hubType);
  const portDeviceMap = new Map(script.devices.map((d) => [d.port, d]));

  const hubW = 180;
  const hubH = 60 + ports.length * 28;
  const cx = 200;
  const cy = hubH / 2 + 30;

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
        Hub & Ports
      </h3>
      <svg
        viewBox={`0 0 400 ${hubH + 60}`}
        className={css({ w: "100%", maxW: "md" })}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x={cx - hubW / 2}
          y={cy - hubH / 2}
          width={hubW}
          height={hubH}
          rx={12}
          fill="#1e293b"
          stroke={color}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy - hubH / 2 + 24}
          textAnchor="middle"
          fill={color}
          fontSize={14}
          fontWeight="bold"
        >
          {hubDisplayName(script.hubType)}
        </text>
        <circle
          cx={cx}
          cy={cy - hubH / 2 + 40}
          r={5}
          fill={color}
          opacity={0.6}
        />

        {ports.map((port, i) => {
          const device = portDeviceMap.get(port);
          const py = cy - hubH / 2 + 56 + i * 28;
          const portX = cx - hubW / 2;

          return (
            <g key={port}>
              <rect
                x={portX - 1}
                y={py - 10}
                width={24}
                height={20}
                rx={3}
                fill={device ? color : "#374151"}
                opacity={device ? 0.3 : 0.5}
              />
              <text
                x={portX + 11}
                y={py + 4}
                textAnchor="middle"
                fill={device ? color : "#6b7280"}
                fontSize={12}
                fontWeight="bold"
              >
                {port}
              </text>
              {device && (
                <>
                  <line
                    x1={portX - 2}
                    y1={py}
                    x2={portX - 40}
                    y2={py}
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.5}
                  />
                  <rect
                    x={portX - 140}
                    y={py - 14}
                    width={98}
                    height={28}
                    rx={6}
                    fill="#0f172a"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.8}
                  />
                  <rect
                    x={portX - 136}
                    y={py - 10}
                    width={20}
                    height={20}
                    rx={4}
                    fill={color}
                    opacity={0.2}
                  />
                  <text
                    x={portX - 126}
                    y={py + 5}
                    textAnchor="middle"
                    fill={color}
                    fontSize={10}
                    fontWeight="bold"
                  >
                    {deviceIcon(device.deviceType)}
                  </text>
                  <text
                    x={portX - 108}
                    y={py + 4}
                    fill="#e2e8f0"
                    fontSize={10}
                  >
                    {device.varName}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {script.usesCarApi && (
          <g>
            <rect
              x={cx + hubW / 2 + 10}
              y={cy - 14}
              width={60}
              height={28}
              rx={6}
              fill="#1e3a5f"
              stroke="#3b82f6"
              strokeWidth={1}
            />
            <text
              x={cx + hubW / 2 + 40}
              y={cy + 4}
              textAnchor="middle"
              fill="#60a5fa"
              fontSize={11}
              fontWeight="bold"
            >
              Car API
            </text>
          </g>
        )}

        {script.hasRemote && (
          <g>
            <rect
              x={cx + hubW / 2 + 10}
              y={cy - (script.usesCarApi ? 48 : 14)}
              width={70}
              height={28}
              rx={6}
              fill="#1e293b"
              stroke="#a78bfa"
              strokeWidth={1}
            />
            <text
              x={cx + hubW / 2 + 45}
              y={cy - (script.usesCarApi ? 48 : 14) + 18}
              textAnchor="middle"
              fill="#a78bfa"
              fontSize={11}
              fontWeight="bold"
            >
              Remote
            </text>
          </g>
        )}
      </svg>

      {script.colors.length > 0 && (
        <div className={css({ mt: "3" })}>
          <p className={css({ fontSize: "xs", color: "ink.faint", mb: "1.5" })}>
            Colors used
          </p>
          <div
            className={css({
              display: "flex",
              gap: "1.5",
              flexWrap: "wrap",
            })}
          >
            {script.colors.map((c) => (
              <span
                key={c}
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1",
                  px: "2",
                  py: "0.5",
                  rounded: "sm",
                  fontSize: "xs",
                })}
                style={{
                  backgroundColor:
                    (PYBRICKS_COLORS[c] || "#6b7280") + "20",
                  color: PYBRICKS_COLORS[c] || "#6b7280",
                  border: `1px solid ${(PYBRICKS_COLORS[c] || "#6b7280")}40`,
                }}
              >
                <span
                  className={css({ w: "2", h: "2", rounded: "full" })}
                  style={{
                    backgroundColor: PYBRICKS_COLORS[c] || "#6b7280",
                  }}
                />
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
