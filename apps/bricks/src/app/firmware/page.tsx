"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { css } from "styled-system/css";
import { HubType, hubDisplayName, hubColor } from "@/lib/parser";

const DEPLOY_SERVER = "http://localhost:2026";

const HUB_OPTIONS: {
  type: HubType;
  img: string;
  ports: string;
  desc: string;
}[] = [
  { type: "CityHub", img: "/hubs/hub-city.png", ports: "2 ports", desc: "Trains, simple builds" },
  { type: "TechnicHub", img: "/hubs/hub-technic.png", ports: "4 ports", desc: "Vehicles, robots" },
  { type: "MoveHub", img: "/hubs/hub-move.png", ports: "4 ports", desc: "Boost set, robotics" },
  { type: "PrimeHub", img: "/hubs/hub-prime.png", ports: "6 ports", desc: "Spike Prime, Inventor" },
  { type: "EssentialHub", img: "/hubs/hub-essential.png", ports: "2 ports", desc: "Spike Essential" },
];

type FlashStatus = "idle" | "downloading" | "flashing" | "done" | "error";

export default function FirmwarePage() {
  const [hubType, setHubType] = useState<HubType>("CityHub");
  const [status, setStatus] = useState<FlashStatus>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [serverUp, setServerUp] = useState<boolean | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  const checkServer = useCallback(async () => {
    try {
      const r = await fetch(`${DEPLOY_SERVER}/status`, { signal: AbortSignal.timeout(2000) });
      setServerUp(r.ok);
    } catch {
      setServerUp(false);
    }
  }, []);

  useEffect(() => {
    checkServer();
    return () => stopPolling();
  }, [checkServer]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [output]);

  async function handleFlash() {
    setOutput("");
    setError(null);
    setStatus("downloading");

    try {
      const res = await fetch(`${DEPLOY_SERVER}/firmware/flash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hub_type: hubType }),
      });

      if (!res.ok) {
        setError("Deploy server not reachable.");
        setStatus("error");
        setServerUp(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${DEPLOY_SERVER}/firmware/status`);
          if (!r.ok) return;
          const data = await r.json();
          setOutput(data.output || "");
          if (data.error) setError(data.error);
          if (data.status === "done" || data.status === "error") {
            setStatus(data.status);
            stopPolling();
          } else {
            setStatus(data.status);
          }
        } catch {
          // server busy flashing
        }
      }, 1000);
    } catch {
      setError("Deploy server not reachable.");
      setStatus("error");
      setServerUp(false);
    }
  }

  const busy = status === "downloading" || status === "flashing";
  const selectedColor = hubColor(hubType);

  return (
    <main className={css({ mx: "auto", maxW: "4xl", px: "4", py: "12" })}>
      {/* Header */}
      <div className={css({ mb: "8" })}>
        <div className={css({ display: "flex", alignItems: "center", gap: "3", mb: "2" })}>
          <div
            className={css({
              w: "10",
              h: "10",
              rounded: "stud",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "lg",
              flexShrink: 0,
              boxShadow: "stud",
              bg: "lego.orange",
            })}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h1
              className={css({
                fontSize: "2xl",
                fontWeight: "900",
                fontFamily: "display",
                letterSpacing: "-0.03em",
                color: "ink.primary",
              })}
            >
              Fix Firmware
            </h1>
            <p className={css({ fontSize: "sm", color: "ink.muted" })}>
              Re-flash Pybricks firmware when your hub gets stuck or disconnects
            </p>
          </div>
        </div>
      </div>

      {/* Server status banner */}
      {serverUp === false && (
        <div
          className={css({
            mb: "5",
            rounded: "brick",
            border: "2px solid",
            borderColor: "rgba(254,138,24,0.3)",
            bg: "rgba(254,138,24,0.08)",
            px: "4",
            py: "3",
            display: "flex",
            alignItems: "flex-start",
            gap: "3",
          })}
        >
          <div
            className={css({
              w: "6",
              h: "6",
              rounded: "stud",
              bg: "lego.orange",
              boxShadow: "stud",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xs",
              fontWeight: "900",
              color: "white",
              mt: "0.5",
            })}
          >
            !
          </div>
          <div>
            <p className={css({ fontSize: "sm", fontWeight: "700", fontFamily: "display", color: "#FE8A18" })}>
              Deploy server offline
            </p>
            <p className={css({ fontSize: "xs", color: "ink.muted", mt: "0.5" })}>
              Start it with:{" "}
              <code
                className={css({
                  fontFamily: "mono",
                  fontSize: "xs",
                  bg: "rgba(254,138,24,0.12)",
                  px: "1.5",
                  py: "0.5",
                  rounded: "md",
                  color: "#FE8A18",
                })}
              >
                cd backend && uv run python deploy_server.py
              </code>
            </p>
            <button
              onClick={checkServer}
              className={css({
                mt: "2",
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "#FE8A18",
                bg: "rgba(254,138,24,0.12)",
                border: "1px solid rgba(254,138,24,0.25)",
                px: "3",
                py: "1",
                rounded: "md",
                cursor: "pointer",
                _hover: { bg: "rgba(254,138,24,0.2)" },
              })}
            >
              Retry connection
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Select hub */}
      <div
        className={css({
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          p: "5",
          mb: "4",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: "2", mb: "4" })}>
          <span
            className={css({
              w: "6",
              h: "6",
              rounded: "stud",
              bg: "lego.blue",
              boxShadow: "stud",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xs",
              fontWeight: "900",
              color: "white",
              flexShrink: 0,
            })}
          >
            1
          </span>
          <p
            className={css({
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "ink.primary",
            })}
          >
            Select your hub
          </p>
        </div>
        <div className={css({ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2" })}>
          {HUB_OPTIONS.map((h) => {
            const active = hubType === h.type;
            const color = hubColor(h.type);
            return (
              <button
                key={h.type}
                onClick={() => setHubType(h.type)}
                disabled={busy}
                className={css({
                  display: "flex",
                  flexDir: "column",
                  alignItems: "center",
                  gap: "2",
                  p: "3",
                  pb: "2.5",
                  rounded: "brick",
                  border: "2px solid",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  bg: "transparent",
                  _hover: { transform: "translateY(-2px)" },
                  _disabled: { opacity: 0.4, cursor: "not-allowed", transform: "none" },
                })}
                style={{
                  borderColor: active ? color : "rgba(255,255,255,0.06)",
                  backgroundColor: active ? color + "12" : undefined,
                  boxShadow: active
                    ? `0 0 0 1px ${color}30, 0 4px 12px ${color}15`
                    : undefined,
                }}
              >
                <img
                  src={h.img}
                  alt={h.type}
                  className={css({
                    w: "16",
                    h: "16",
                    objectFit: "contain",
                    transition: "transform 0.2s ease",
                  })}
                  style={{ transform: active ? "scale(1.1)" : undefined }}
                />
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "800",
                    fontFamily: "display",
                    transition: "color 0.15s",
                  })}
                  style={{ color: active ? color : undefined }}
                >
                  {hubDisplayName(h.type)}
                </span>
                <span
                  className={css({
                    fontSize: "10px",
                    color: "ink.faint",
                    lineHeight: "1.2",
                    textAlign: "center",
                  })}
                >
                  {h.ports}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Instructions + flash button */}
      <div
        className={css({
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          p: "5",
          mb: "4",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: "2", mb: "4" })}>
          <span
            className={css({
              w: "6",
              h: "6",
              rounded: "stud",
              bg: "lego.blue",
              boxShadow: "stud",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xs",
              fontWeight: "900",
              color: "white",
              flexShrink: 0,
            })}
          >
            2
          </span>
          <p
            className={css({
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "ink.primary",
            })}
          >
            Put hub in update mode & flash
          </p>
        </div>

        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "5",
            alignItems: "start",
          })}
        >
          <ol
            className={css({
              fontSize: "sm",
              color: "ink.muted",
              pl: "5",
              display: "flex",
              flexDir: "column",
              gap: "2",
              listStyleType: "decimal",
              "& li::marker": { color: "ink.faint", fontWeight: "700" },
            })}
          >
            <li>
              Turn the hub <strong className={css({ color: "ink.secondary" })}>off</strong>
            </li>
            <li>
              Hold the button until the light blinks{" "}
              <span
                className={css({
                  px: "1.5",
                  py: "0.5",
                  rounded: "md",
                  fontSize: "xs",
                  fontWeight: "700",
                  bg: "rgba(200,100,200,0.15)",
                  color: "#D580D5",
                })}
              >
                pink / purple
              </span>
            </li>
            <li>Release — the hub is now in bootloader mode</li>
            <li>
              Click{" "}
              <strong className={css({ color: "ink.secondary" })}>Flash Firmware</strong>
            </li>
          </ol>

          <button
            onClick={handleFlash}
            disabled={busy || serverUp === false}
            className={css({
              rounded: "brick",
              px: "6",
              py: "3",
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "white",
              cursor: "pointer",
              transition: "all 0.15s ease",
              border: "none",
              whiteSpace: "nowrap",
              _hover: { transform: "translateY(-1px)" },
              _active: { transform: "translateY(1px)" },
              _disabled: { opacity: 0.4, cursor: "not-allowed", transform: "none" },
            })}
            style={{
              background: selectedColor,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 ${selectedColor}80, 0 3px 8px rgba(0,0,0,0.3)`,
            }}
          >
            {busy
              ? status === "downloading"
                ? "Downloading..."
                : "Flashing..."
              : "Flash Firmware"}
          </button>
        </div>
      </div>

      {/* Output log */}
      {(output || error || busy) && (
        <div
          className={css({
            bg: "plate.surface",
            rounded: "brick",
            border: "2px solid",
            boxShadow: "brick",
            overflow: "hidden",
          })}
          style={{
            borderColor:
              status === "done"
                ? "rgba(0,133,43,0.4)"
                : status === "error"
                  ? "rgba(227,0,11,0.3)"
                  : `${selectedColor}30`,
          }}
        >
          {/* Log header bar */}
          <div
            className={css({
              px: "4",
              py: "2.5",
              display: "flex",
              alignItems: "center",
              gap: "2",
              borderBottom: "1px solid",
              borderColor: "plate.border",
            })}
          >
            <div
              className={css({ w: "2", h: "2", rounded: "full", flexShrink: 0 })}
              style={{
                backgroundColor:
                  status === "done"
                    ? "#00852B"
                    : status === "error"
                      ? "#E3000B"
                      : selectedColor,
                boxShadow: busy
                  ? `0 0 6px ${selectedColor}60`
                  : status === "done"
                    ? "0 0 6px rgba(0,133,43,0.4)"
                    : undefined,
                animation: busy ? "pulse 1.5s ease-in-out infinite" : undefined,
              }}
            />
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              })}
            >
              {status === "done"
                ? "Complete"
                : status === "error"
                  ? "Failed"
                  : status === "downloading"
                    ? "Downloading firmware..."
                    : status === "flashing"
                      ? "Flashing..."
                      : "Log"}
            </span>
          </div>

          {/* Log body */}
          <pre
            ref={logRef}
            className={css({
              px: "4",
              py: "3",
              fontSize: "xs",
              fontFamily: "mono",
              color: "ink.muted",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxH: "260px",
              overflow: "auto",
              lineHeight: "1.7",
              m: 0,
            })}
          >
            {output || (busy ? "Connecting to deploy server...\n" : "")}
          </pre>

          {error && (
            <div
              className={css({
                mx: "4",
                mb: "4",
                rounded: "md",
                bg: "rgba(227, 0, 11, 0.08)",
                border: "1px solid rgba(227, 0, 11, 0.2)",
                px: "3",
                py: "2",
                fontSize: "xs",
                color: "#FF6B6B",
                whiteSpace: "pre-wrap",
              })}
            >
              {error}
            </div>
          )}

          {status === "done" && (
            <div
              className={css({
                mx: "4",
                mb: "4",
                rounded: "md",
                bg: "rgba(0, 133, 43, 0.08)",
                border: "1px solid rgba(0, 133, 43, 0.2)",
                px: "3",
                py: "2",
                display: "flex",
                alignItems: "center",
                gap: "2",
              })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00852B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className={css({ fontSize: "sm", fontWeight: "700", color: "#00852B" })}>
                Firmware restored — reconnect and deploy scripts.
              </span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
