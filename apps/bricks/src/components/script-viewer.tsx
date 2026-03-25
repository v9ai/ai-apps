"use client";

import { useState, useEffect } from "react";
import { ParsedScript, hubColor, hubDisplayName, HubType } from "@/lib/parser";
import { HubDiagram } from "./hub-diagram";
import { RemoteControl } from "./remote-control";
import { ConstantsPanel } from "./constants-panel";
import { CodeViewer } from "./code-viewer";
import { css } from "styled-system/css";

interface SavedScript {
  id: number;
  hub: string;
  template: string;
  hasRemote: number;
  instructions: string;
  createdAt: string;
}

export function ScriptViewer({ scripts }: { scripts: ParsedScript[] }) {
  const [selected, setSelected] = useState(0);
  const script = scripts[selected];
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);

  useEffect(() => {
    fetch("/api/scripts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setSavedScripts(data))
      .catch(() => {});
  }, []);

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
          <a
            href="/scripts/new"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              mt: "3",
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "lego.green",
              textDecoration: "none",
              bg: "rgba(0, 133, 43, 0.08)",
              border: "1.5px solid rgba(0, 133, 43, 0.25)",
              px: "3",
              py: "1.5",
              rounded: "brick",
              transition: "all 0.15s ease",
              _hover: {
                bg: "rgba(0, 133, 43, 0.14)",
                borderColor: "rgba(0, 133, 43, 0.4)",
              },
            })}
          >
            + New Script
          </a>
        </div>

        {/* Saved scripts from DB */}
        {savedScripts.length > 0 && (
          <>
            <div
              className={css({
                px: "4",
                py: "2.5",
                borderBottom: "1px solid",
                borderColor: "plate.border",
              })}
            >
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.muted",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                })}
              >
                My Scripts
              </span>
            </div>
            <ul className={css({ py: "2" })}>
              {savedScripts.map((s) => {
                const color = hubColor(s.hub as HubType);
                return (
                  <li key={s.id}>
                    <a
                      href={`/scripts/${s.id}`}
                      className={css({
                        display: "block",
                        w: "100%",
                        textAlign: "left",
                        px: "4",
                        py: "2.5",
                        transition: "colors",
                        cursor: "pointer",
                        borderLeft: "2px solid transparent",
                        textDecoration: "none",
                        _hover: { bg: "plate.hover" },
                      })}
                    >
                      <span
                        className={css({
                          fontSize: "sm",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          gap: "2",
                          color: "ink.muted",
                        })}
                      >
                        <span
                          className={css({
                            fontSize: "xs",
                            fontWeight: "700",
                            fontFamily: "mono, monospace",
                            color: "ink.faint",
                            bg: "plate.raised",
                            px: "1.5",
                            py: "0.5",
                            rounded: "sm",
                          })}
                        >
                          #{s.id}
                        </span>
                        {s.template}
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
                        {hubDisplayName(s.hub as HubType)}
                        {s.hasRemote === 1 && " + Remote"}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* File-based scripts */}
        <div
          className={css({
            px: "4",
            py: "2.5",
            borderTop: "1px solid",
            borderBottom: "1px solid",
            borderColor: "plate.border",
          })}
        >
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "ink.muted",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            })}
          >
            Examples
          </span>
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
