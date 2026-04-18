"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { css } from "styled-system/css";
import { createHub, type HubStatus, type PybricksHub } from "@/lib/pybricks-ble";
import { useLanguage } from "@/lib/language";

const LABELS = {
  en: {
    noHub: "No hub connected",
    connecting: "Connecting...",
    connectedTo: "Connected to",
    deploying: "Deploying...",
    runningOn: "Running on",
    error: "Error",
    connectHub: "Connect Hub",
    deploy: "Deploy",
    stop: "Stop",
    disconnect: "Disconnect",
    waiting: "Waiting for Bluetooth...",
    uploading: "Uploading...",
    hubOutput: "Hub Output",
    clear: "Clear",
    hub: "hub",
  },
  ro: {
    noHub: "Niciun hub conectat",
    connecting: "Se conectează...",
    connectedTo: "Conectat la",
    deploying: "Se încarcă...",
    runningOn: "Rulează pe",
    error: "Eroare",
    connectHub: "Conectează hub",
    deploy: "Rulează",
    stop: "Oprește",
    disconnect: "Deconectează",
    waiting: "Se așteaptă Bluetooth...",
    uploading: "Se încarcă...",
    hubOutput: "Ieșirea hub-ului",
    clear: "Șterge",
    hub: "hub",
  },
} as const;

export function HubDeployPanel({ code }: { code: string }) {
  const { language } = useLanguage();
  const t = LABELS[language === "ro" ? "ro" : "en"];

  const hubRef = useRef<PybricksHub | null>(null);
  const [hubStatus, setHubStatus] = useState<HubStatus>("disconnected");
  const [hubName, setHubName] = useState<string | null>(null);
  const [hubError, setHubError] = useState<string | null>(null);
  const [hubOutput, setHubOutput] = useState("");

  useEffect(() => {
    const h = createHub();
    h.onStatusChange = (s) => {
      setHubStatus(s);
      setHubName(h.name);
      setHubError(h.error);
    };
    h.onOutput = () => setHubOutput(h.output);
    hubRef.current = h;
    return () => {
      h.disconnect();
    };
  }, []);

  const connectHub = useCallback(async () => {
    await hubRef.current?.connect();
  }, []);

  const disconnectHub = useCallback(async () => {
    await hubRef.current?.disconnect();
  }, []);

  const deployToHub = useCallback(async () => {
    if (!hubRef.current) return;
    setHubOutput("");
    await hubRef.current.deploy(code);
  }, [code]);

  const stopHub = useCallback(async () => {
    await hubRef.current?.stop();
  }, []);

  return (
    <div
      className={css({
        mb: "6",
        p: "5",
        rounded: "brick",
        bg: "plate.surface",
        border: "1.5px solid",
        borderColor:
          hubStatus === "connected" || hubStatus === "running"
            ? "rgba(0, 133, 43, 0.3)"
            : hubStatus === "deploying"
              ? "rgba(254, 138, 24, 0.3)"
              : hubStatus === "error"
                ? "rgba(227, 0, 11, 0.3)"
                : "plate.border",
        transition: "border-color 0.15s ease",
      })}
    >
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          flexWrap: "wrap",
        })}
      >
        <span
          className={css({ w: "2.5", h: "2.5", rounded: "stud", flexShrink: 0 })}
          style={{
            background:
              hubStatus === "connected"
                ? "#22c55e"
                : hubStatus === "running"
                  ? "#3b82f6"
                  : hubStatus === "deploying"
                    ? "#f97316"
                    : hubStatus === "connecting"
                      ? "#eab308"
                      : hubStatus === "error"
                        ? "#ef4444"
                        : "#6b7280",
            boxShadow:
              hubStatus === "running"
                ? "0 0 8px rgba(59, 130, 246, 0.5)"
                : hubStatus === "connected"
                  ? "0 0 8px rgba(34, 197, 94, 0.4)"
                  : "none",
          }}
        />
        <span
          className={css({
            fontSize: "sm",
            fontWeight: "700",
            fontFamily: "display",
            color: "ink.primary",
          })}
        >
          {hubStatus === "disconnected" && t.noHub}
          {hubStatus === "connecting" && t.connecting}
          {hubStatus === "connected" && `${t.connectedTo} ${hubName || t.hub}`}
          {hubStatus === "deploying" && t.deploying}
          {hubStatus === "running" && `${t.runningOn} ${hubName || t.hub}`}
          {hubStatus === "error" && t.error}
        </span>

        <div className={css({ display: "flex", gap: "2", ml: "auto" })}>
          {hubStatus === "disconnected" || hubStatus === "error" ? (
            <button
              onClick={connectHub}
              className={css({
                fontSize: "sm",
                fontWeight: "800",
                fontFamily: "display",
                color: "white",
                bg: "lego.blue",
                rounded: "brick",
                px: "5",
                py: "2",
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s ease",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A7C, 0 3px 6px rgba(0,0,0,0.3)",
                _hover: {
                  transform: "translateY(-1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #004A7C, 0 5px 10px rgba(0,0,0,0.35)",
                },
                _active: {
                  transform: "translateY(1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #004A7C",
                },
              })}
            >
              {t.connectHub}
            </button>
          ) : hubStatus === "connecting" || hubStatus === "deploying" ? (
            <span
              className={css({
                fontSize: "sm",
                color: "ink.faint",
                fontWeight: "600",
              })}
            >
              {hubStatus === "connecting" ? t.waiting : t.uploading}
            </span>
          ) : (
            <>
              <button
                onClick={deployToHub}
                className={css({
                  fontSize: "sm",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "white",
                  bg: "lego.green",
                  rounded: "brick",
                  px: "5",
                  py: "2",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.15s ease",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #005C1F, 0 3px 6px rgba(0,0,0,0.3)",
                  _hover: {
                    transform: "translateY(-1px)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #005C1F, 0 5px 10px rgba(0,0,0,0.35)",
                  },
                  _active: {
                    transform: "translateY(1px)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #005C1F",
                  },
                })}
              >
                {t.deploy}
              </button>
              {hubStatus === "running" && (
                <button
                  onClick={stopHub}
                  className={css({
                    fontSize: "sm",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "white",
                    bg: "lego.red",
                    rounded: "brick",
                    px: "5",
                    py: "2",
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s ease",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
                    _hover: {
                      transform: "translateY(-1px)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #A30008, 0 5px 10px rgba(0,0,0,0.35)",
                    },
                    _active: {
                      transform: "translateY(1px)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #A30008",
                    },
                  })}
                >
                  {t.stop}
                </button>
              )}
              <button
                onClick={disconnectHub}
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.faint",
                  bg: "transparent",
                  border: "1px solid",
                  borderColor: "plate.border",
                  px: "3",
                  py: "1.5",
                  rounded: "brick",
                  cursor: "pointer",
                  _hover: {
                    color: "ink.secondary",
                    borderColor: "plate.borderHover",
                  },
                })}
              >
                {t.disconnect}
              </button>
            </>
          )}
        </div>
      </div>

      {hubStatus === "error" && hubError && (
        <pre
          className={css({
            mt: "4",
            p: "4",
            rounded: "brick",
            border: "1.5px solid",
            borderColor: "rgba(227, 0, 11, 0.3)",
            bg: "rgba(227, 0, 11, 0.06)",
            fontSize: "xs",
            lineHeight: "1.6",
            color: "#FF6B6B",
            fontFamily: "mono, monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            m: "0",
          })}
        >
          {hubError}
        </pre>
      )}

      {hubOutput && (
        <div
          className={css({
            mt: "4",
            bg: "#0d0d12",
            rounded: "brick",
            border: "1px solid",
            borderColor: "plate.border",
            overflow: "hidden",
          })}
        >
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: "3",
              py: "1.5",
              borderBottom: "1px solid",
              borderColor: "plate.border",
              bg: "plate.surface",
            })}
          >
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "600",
                color: "ink.faint",
              })}
            >
              {t.hubOutput}
            </span>
            <button
              onClick={() => setHubOutput("")}
              className={css({
                fontSize: "xs",
                color: "ink.faint",
                bg: "transparent",
                border: "none",
                cursor: "pointer",
                _hover: { color: "ink.secondary" },
              })}
            >
              {t.clear}
            </button>
          </div>
          <pre
            className={css({
              p: "3",
              fontSize: "xs",
              lineHeight: "1.6",
              color: "#4ade80",
              fontFamily: "mono, monospace",
              maxH: "200px",
              overflowY: "auto",
              m: "0",
              whiteSpace: "pre-wrap",
            })}
          >
            {hubOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
