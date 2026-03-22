"use client";

import { useState } from "react";
import { ParsedScript, hubColor, hubDisplayName } from "@/lib/parser";
import { HubDiagram } from "./hub-diagram";
import { RemoteControl } from "./remote-control";
import { ConstantsPanel } from "./constants-panel";
import { CodeViewer } from "./code-viewer";
import { css } from "styled-system/css";

export function ScriptViewer({ scripts }: { scripts: ParsedScript[] }) {
  const [selected, setSelected] = useState(0);
  const script = scripts[selected];

  return (
    <div className={css({ display: "flex", h: "100vh" })}>
      {/* Sidebar */}
      <nav
        className={css({
          w: "64",
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "plate.border",
          bg: "plate.base",
          overflowY: "auto",
        })}
      >
        <div
          className={css({
            p: "4",
            borderBottom: "1px solid",
            borderColor: "plate.border",
          })}
        >
          <a
            href="/"
            className={css({
              fontSize: "lg",
              fontWeight: "800",
              fontFamily: "display",
              color: "ink.primary",
              letterSpacing: "-0.02em",
              textDecoration: "none",
            })}
          >
            Bricks
          </a>
          <p
            className={css({
              fontSize: "xs",
              color: "ink.muted",
              mt: "0.5",
            })}
          >
            Pybricks Visualizer
          </p>
        </div>
        <ul className={css({ py: "2" })}>
          {scripts.map((s, i) => {
            const active = i === selected;
            const color = hubColor(s.hubType);
            return (
              <li key={s.filename}>
                <button
                  onClick={() => setSelected(i)}
                  className={css({
                    w: "100%",
                    textAlign: "left",
                    px: "4",
                    py: "2.5",
                    transition: "colors",
                    cursor: "pointer",
                    borderLeft: "2px solid",
                    borderColor: "transparent",
                    bg: "transparent",
                    _hover: { bg: "plate.hover" },
                  })}
                  style={
                    active
                      ? {
                          borderLeftColor: color,
                          background:
                            "rgba(255,255,255,0.04)",
                        }
                      : undefined
                  }
                >
                  <span
                    className={css({
                      fontSize: "sm",
                      fontWeight: "500",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: active ? "ink.primary" : "ink.muted",
                    })}
                  >
                    {s.filename.replace(".py", "")}
                  </span>
                  <span
                    className={css({
                      fontSize: "xs",
                      color: "ink.faint",
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5",
                      mt: "0.5",
                    })}
                  >
                    <span
                      className={css({
                        w: "1.5",
                        h: "1.5",
                        rounded: "full",
                      })}
                      style={{ backgroundColor: color }}
                    />
                    {hubDisplayName(s.hubType)}
                    {s.hasRemote && " + Remote"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Main content */}
      <main
        className={css({
          flex: 1,
          overflowY: "auto",
          p: "8",
          bg: "plate.base",
        })}
      >
        <div
          className={css({
            maxW: "4xl",
            mx: "auto",
            display: "flex",
            flexDir: "column",
            gap: "8",
          })}
        >
          {/* Title */}
          <div>
            <h2
              className={css({
                fontSize: "2xl",
                fontWeight: "800",
                fontFamily: "display",
                color: "ink.primary",
              })}
            >
              {script.filename.replace(".py", "")}
            </h2>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                mt: "2",
              })}
            >
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "500",
                  px: "2",
                  py: "0.5",
                  rounded: "full",
                })}
                style={{
                  backgroundColor: hubColor(script.hubType) + "20",
                  color: hubColor(script.hubType),
                  border: `1px solid ${hubColor(script.hubType)}40`,
                }}
              >
                {hubDisplayName(script.hubType)}
              </span>
              {script.hasRemote && (
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "500",
                    px: "2",
                    py: "0.5",
                    rounded: "full",
                    bg: "rgba(167, 139, 250, 0.1)",
                    color: "#a78bfa",
                    border: "1px solid rgba(167, 139, 250, 0.2)",
                  })}
                >
                  Remote
                </span>
              )}
              {script.usesCarApi && (
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "500",
                    px: "2",
                    py: "0.5",
                    rounded: "full",
                    bg: "rgba(59, 130, 246, 0.1)",
                    color: "#60a5fa",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                  })}
                >
                  Car API
                </span>
              )}
              <span className={css({ fontSize: "xs", color: "ink.faint" })}>
                {script.devices.length} device
                {script.devices.length !== 1 && "s"} ·{" "}
                {script.code.split("\n").length} lines
              </span>
            </div>
          </div>

          {/* Diagram + Remote side by side */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "8",
              lg: { gridTemplateColumns: "1fr 1fr" },
            })}
          >
            <HubDiagram script={script} />
            <RemoteControl script={script} />
          </div>

          {/* Constants */}
          <ConstantsPanel script={script} />

          {/* Code */}
          <CodeViewer code={script.code} filename={script.filename} />
        </div>
      </main>
    </div>
  );
}
