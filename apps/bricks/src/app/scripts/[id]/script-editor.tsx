"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { css } from "styled-system/css";
import { hubDisplayName, hubColor, hubPorts, HubType, DeviceType } from "@/lib/parser";
import { generateCode } from "@/lib/codegen";
import {
  createHub,
  type HubStatus,
  type PybricksHub,
} from "@/lib/pybricks-ble";

interface ScriptRow {
  id: number;
  hub: string;
  template: string;
  devices: { port: string; device: string; varName: string }[];
  hasRemote: number;
  instructions: string;
  code: string;
  createdAt: string;
}

const HUB_OPTIONS: { type: HubType; img: string }[] = [
  { type: "CityHub", img: "/hubs/hub-city.png" },
  { type: "TechnicHub", img: "/hubs/hub-technic.png" },
  { type: "MoveHub", img: "/hubs/hub-move.png" },
  { type: "PrimeHub", img: "/hubs/hub-prime.png" },
  { type: "EssentialHub", img: "/hubs/hub-essential.png" },
];

const DEVICE_IMG_MAP: Record<string, string> = {
  Motor: "/devices/pupdevice-motors.png",
  DCMotor: "/devices/pupdevice-dcmotors.png",
  Light: "/devices/pupdevice-light.png",
  ColorSensor: "/devices/pupdevice-color.png",
  ColorLightMatrix: "/devices/sensor_colorlightmatrix.png",
  UltrasonicSensor: "/devices/pupdevice-ultrasonic.png",
  ForceSensor: "/devices/pupdevice-force.png",
};

export function ScriptEditor({ id }: { id: string }) {
  const [script, setScript] = useState<ScriptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [editHub, setEditHub] = useState<HubType>("CityHub");
  const [editInstructions, setEditInstructions] = useState("");
  const [editCode, setEditCode] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // BLE hub
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
    return () => { h.disconnect(); };
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
    await hubRef.current.deploy(editCode);
  }, [editCode]);

  const stopHub = useCallback(async () => {
    await hubRef.current?.stop();
  }, []);

  useEffect(() => {
    fetch(`/api/scripts/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ScriptRow | null) => {
        setScript(data);
        if (data) {
          setEditHub(data.hub as HubType);
          setEditInstructions(data.instructions);
          setEditCode(data.code);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-save with debounce
  const save = useCallback(
    (hub: string, instructions: string, code: string) => {
      setSaving(true);
      setSaved(false);
      fetch(`/api/scripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hub, instructions, code }),
      })
        .then((r) => {
          if (r.ok) {
            setDirty(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }
        })
        .finally(() => setSaving(false));
    },
    [id]
  );

  const scheduleAutoSave = useCallback(
    (hub: string, instructions: string, code: string) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(hub, instructions, code), 1500);
    },
    [save]
  );

  const onHubChange = useCallback(
    (val: HubType) => {
      setEditHub(val);
      // Rewrite the hub import in the code
      const updatedCode = editCode.replace(
        /from pybricks\.hubs import \w+/,
        `from pybricks.hubs import ${val}`
      ).replace(
        /hub = \w+Hub\(\)/,
        `hub = ${val}()`
      );
      setEditCode(updatedCode);
      scheduleAutoSave(val, editInstructions, updatedCode);
    },
    [editInstructions, editCode, scheduleAutoSave]
  );

  const onInstructionsChange = useCallback(
    (val: string) => {
      setEditInstructions(val);
      scheduleAutoSave(editHub, val, editCode);
    },
    [editHub, editCode, scheduleAutoSave]
  );

  const onCodeChange = useCallback(
    (val: string) => {
      setEditCode(val);
      scheduleAutoSave(editHub, editInstructions, val);
    },
    [editHub, editInstructions, scheduleAutoSave]
  );

  const [detecting, setDetecting] = useState(false);

  const regenerateCode = useCallback(() => {
    if (!script) return;
    const devices = script.devices.map((d) => ({
      port: d.port,
      device: d.device as DeviceType | null,
      varName: d.varName,
    }));
    const newCode = generateCode(editHub, devices, script.hasRemote === 1);
    setEditCode(newCode);
    scheduleAutoSave(editHub, editInstructions, newCode);
  }, [script, editHub, editInstructions, scheduleAutoSave]);

  // Pybricks device ID → DeviceType + default var name
  const DEVICE_ID_MAP: Record<number, { type: DeviceType; name: string }> = {
    1: { type: "Motor", name: "motor" },
    2: { type: "Motor", name: "motor" },
    8: { type: "Light", name: "light" },
    34: { type: "Motor", name: "motor" },
    37: { type: "ColorSensor", name: "color_sensor" },
    38: { type: "UltrasonicSensor", name: "ultrasonic" },
    40: { type: "Motor", name: "motor" },
    46: { type: "Motor", name: "motor" },
    48: { type: "Motor", name: "motor" },
    49: { type: "ForceSensor", name: "force_sensor" },
    54: { type: "DCMotor", name: "dc_motor" },
    61: { type: "ColorSensor", name: "color_sensor" },
    62: { type: "UltrasonicSensor", name: "ultrasonic" },
    64: { type: "ColorLightMatrix", name: "matrix" },
    65: { type: "Motor", name: "motor" },
    75: { type: "Motor", name: "motor" },
    76: { type: "Motor", name: "motor" },
  };

  const detectPorts = useCallback(async () => {
    if (!script) return;
    setDetecting(true);
    setHubOutput("");

    const ports = hubPorts(editHub);
    const portList = ports.map((p) => `("${p}", Port.${p})`).join(", ");
    const detectCode = `from pybricks.hubs import ${editHub}
from pybricks.parameters import Port
from pybricks.iodevices import PUPDevice
from pybricks.tools import wait

hub = ${editHub}()

for name, port in [${portList}]:
    try:
        dev = PUPDevice(port)
        info = dev.info()
        print(name + ":" + str(info["id"]))
    except OSError:
        print(name + ":empty")

wait(100)
`;

    try {
      const res = await fetch("http://localhost:2026/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: detectCode }),
      });
      const data = await res.json();

      if (data.success && data.output) {
        const newDevices: typeof script.devices = [];
        const lines = (data.output as string).split("\n").map((l: string) => l.trim()).filter(Boolean);

        for (const line of lines) {
          const match = line.match(/^([A-F]):(\d+|empty)$/);
          if (!match) continue;
          const port = match[1];
          const val = match[2];
          if (val === "empty") continue;

          const deviceId = parseInt(val, 10);
          const mapped = DEVICE_ID_MAP[deviceId];
          if (mapped) {
            newDevices.push({
              port,
              device: mapped.type,
              varName: `${mapped.name}_${port.toLowerCase()}`,
            });
          }
        }

        // Update script devices and regenerate code
        script.devices = newDevices;
        const codeDevices = newDevices.map((d) => ({
          port: d.port,
          device: d.device as DeviceType | null,
          varName: d.varName,
        }));
        const newCode = generateCode(editHub, codeDevices, script.hasRemote === 1);
        setEditCode(newCode);

        // Save devices + code to DB
        fetch(`/api/scripts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ devices: newDevices, code: newCode, hub: editHub }),
        });

        setHubOutput(`Detected ${newDevices.length} device(s). Code regenerated.`);
      } else {
        setHubOutput(data.error || data.output || "Detection failed");
      }
    } catch {
      setHubOutput("Deploy server not reachable");
    } finally {
      setDetecting(false);
    }
  }, [script, editHub, id, DEVICE_ID_MAP]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(editCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editCode]);

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    save(editHub, editInstructions, editCode);
  }, [save, editHub, editInstructions, editCode]);

  if (loading) {
    return (
      <div
        className={css({
          maxW: "6xl",
          mx: "auto",
          px: "5",
          py: "10",
          color: "ink.muted",
        })}
      >
        Loading...
      </div>
    );
  }

  if (!script) {
    return (
      <div
        className={css({
          maxW: "6xl",
          mx: "auto",
          px: "5",
          py: "10",
          color: "ink.muted",
        })}
      >
        Script not found.
      </div>
    );
  }

  const color = hubColor(editHub);

  return (
    <div
      className={css({
        maxW: "6xl",
        mx: "auto",
        px: "5",
        py: "10",
      })}
    >
      {/* Breadcrumb */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: "2",
        })}
      >
        <a
          href="/scripts"
          className={css({
            fontSize: "sm",
            color: "ink.faint",
            textDecoration: "none",
            _hover: { color: "ink.secondary" },
          })}
        >
          Scripts
        </a>
        <span className={css({ color: "ink.faint", fontSize: "sm" })}>/</span>
        <span
          className={css({
            fontSize: "sm",
            color: "ink.secondary",
            fontWeight: "600",
          })}
        >
          #{script.id}
        </span>
      </div>

      {/* Title + save status */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: "6",
        })}
      >
        <h1
          className={css({
            fontSize: "2xl",
            fontWeight: "900",
            fontFamily: "display",
            color: "ink.primary",
            letterSpacing: "-0.02em",
          })}
        >
          Script #{script.id}
        </h1>
        <span
          className={css({
            fontSize: "xs",
            color: saving
              ? "ink.faint"
              : saved
                ? "lego.green"
                : dirty
                  ? "lego.orange"
                  : "ink.faint",
            fontWeight: "600",
            transition: "color 0.15s ease",
          })}
        >
          {saving ? "Saving..." : saved ? "Saved" : dirty ? "Unsaved" : ""}
        </span>
        {dirty && !saving && (
          <button
            onClick={saveNow}
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "white",
              bg: "lego.green",
              border: "none",
              rounded: "brick",
              px: "3",
              py: "1",
              cursor: "pointer",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 0 #005C1F",
              _hover: { transform: "translateY(-1px)" },
            })}
          >
            Save now
          </button>
        )}
      </div>

      {/* Hub picker */}
      <div
        className={css({
          display: "flex",
          gap: "2",
          mb: "6",
          flexWrap: "wrap",
          alignItems: "center",
        })}
      >
        {HUB_OPTIONS.map((h) => {
          const active = editHub === h.type;
          const hColor = hubColor(h.type);
          return (
            <button
              key={h.type}
              onClick={() => onHubChange(h.type)}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "2",
                px: "3",
                py: "2",
                rounded: "brick",
                border: "2px solid",
                cursor: "pointer",
                transition: "all 0.15s ease",
                bg: active ? hColor + "15" : "plate.surface",
                borderColor: active ? hColor : "plate.border",
                _hover: {
                  borderColor: hColor,
                  bg: hColor + "10",
                },
              })}
            >
              <img
                src={h.img}
                alt={hubDisplayName(h.type)}
                className={css({
                  w: "8",
                  h: "8",
                  objectFit: "contain",
                })}
              />
              <span
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                })}
                style={{ color: active ? hColor : undefined }}
              >
                {hubDisplayName(h.type)}
              </span>
            </button>
          );
        })}

        {/* Other badges */}
        <div className={css({ display: "flex", gap: "2", ml: "auto", alignItems: "center" })}>
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "600",
              px: "2.5",
              py: "1",
              rounded: "full",
              bg: "rgba(255,255,255,0.04)",
              color: "ink.muted",
              border: "1px solid",
              borderColor: "plate.border",
            })}
          >
            {script.template}
          </span>
          {script.devices.length > 0 && (
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "600",
                px: "2.5",
                py: "1",
                rounded: "full",
                bg: "rgba(254, 138, 24, 0.1)",
                color: "lego.orange",
                border: "1px solid rgba(254, 138, 24, 0.25)",
              })}
            >
              {script.devices.length} device
              {script.devices.length !== 1 && "s"}
            </span>
          )}
          {script.hasRemote === 1 && (
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "600",
                px: "2.5",
                py: "1",
                rounded: "full",
                bg: "rgba(167, 139, 250, 0.1)",
                color: "#a78bfa",
                border: "1px solid rgba(167, 139, 250, 0.2)",
              })}
            >
              Remote
            </span>
          )}
          <span className={css({ fontSize: "xs", color: "ink.faint" })}>
            {new Date(script.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Hub connection + deploy */}
      {(
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
            {/* Status indicator */}
            <span
              className={css({
                w: "2.5",
                h: "2.5",
                rounded: "stud",
                flexShrink: 0,
              })}
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
              {hubStatus === "disconnected" && "No hub connected"}
              {hubStatus === "connecting" && "Connecting..."}
              {hubStatus === "connected" &&
                `Connected to ${hubName || "hub"}`}
              {hubStatus === "deploying" && "Deploying..."}
              {hubStatus === "running" &&
                `Running on ${hubName || "hub"}`}
              {hubStatus === "error" && "Error"}
            </span>

            <div
              className={css({
                display: "flex",
                gap: "2",
                ml: "auto",
              })}
            >
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
                  Connect Hub
                </button>
              ) : hubStatus === "connecting" || hubStatus === "deploying" ? (
                <span
                  className={css({
                    fontSize: "sm",
                    color: "ink.faint",
                    fontWeight: "600",
                  })}
                >
                  {hubStatus === "connecting"
                    ? "Waiting for Bluetooth..."
                    : "Uploading..."}
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
                    Deploy
                  </button>
                  <button
                    onClick={detectPorts}
                    disabled={detecting}
                    className={css({
                      fontSize: "sm",
                      fontWeight: "800",
                      fontFamily: "display",
                      color: "white",
                      bg: "lego.orange",
                      rounded: "brick",
                      px: "5",
                      py: "2",
                      cursor: "pointer",
                      border: "none",
                      transition: "all 0.15s ease",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #C06A00, 0 3px 6px rgba(0,0,0,0.3)",
                      _hover: {
                        transform: "translateY(-1px)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #C06A00, 0 5px 10px rgba(0,0,0,0.35)",
                      },
                      _active: {
                        transform: "translateY(1px)",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #C06A00",
                      },
                      _disabled: {
                        opacity: 0.6,
                        cursor: "default",
                      },
                    })}
                  >
                    {detecting ? "Detecting..." : "Detect Ports"}
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
                      Stop
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
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error details */}
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

          {/* Hub output console */}
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
                  Hub Output
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
                  Clear
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
      )}

      {/* Devices */}
      {script.devices.length > 0 && (
        <div className={css({ mb: "6" })}>
          <h2
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
            Devices
          </h2>
          <div
            className={css({
              display: "flex",
              gap: "3",
              flexWrap: "wrap",
            })}
          >
            {script.devices.map((d, i) => (
              <div
                key={i}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  p: "3",
                  rounded: "brick",
                  bg: "plate.surface",
                  border: "1.5px solid",
                  borderColor: color + "30",
                })}
              >
                {DEVICE_IMG_MAP[d.device] && (
                  <img
                    src={DEVICE_IMG_MAP[d.device]}
                    alt={d.device}
                    className={css({
                      w: "10",
                      h: "10",
                      objectFit: "contain",
                    })}
                  />
                )}
                <div>
                  <span
                    className={css({
                      fontSize: "sm",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "ink.primary",
                      display: "block",
                    })}
                  >
                    Port {d.port}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                    {d.device}
                  </span>
                  <span
                    className={css({
                      fontSize: "xs",
                      color: "ink.faint",
                      fontFamily: "mono, monospace",
                      ml: "2",
                    })}
                  >
                    {d.varName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions — editable */}
      <div className={css({ mb: "6" })}>
        <h2
          className={css({
            fontSize: "sm",
            fontWeight: "700",
            fontFamily: "display",
            color: "ink.muted",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            mb: "2",
          })}
        >
          Instructions
        </h2>
        <textarea
          value={editInstructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Describe what the script should do..."
          rows={4}
          className={css({
            w: "100%",
            bg: "plate.surface",
            color: "ink.primary",
            border: "1.5px solid",
            borderColor: "plate.border",
            rounded: "brick",
            px: "4",
            py: "3",
            fontSize: "sm",
            fontFamily: "body",
            lineHeight: "1.6",
            resize: "vertical",
            _focus: {
              borderColor: "lego.orange",
              outline: "none",
            },
            _placeholder: {
              color: "ink.faint",
            },
          })}
        />
      </div>

      {/* Code — editable */}
      <div
        className={css({
          rounded: "brick",
          border: "1.5px solid",
          borderColor: "plate.border",
          bg: "#0d0d12",
          overflow: "hidden",
        })}
      >
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: "4",
            py: "2.5",
            borderBottom: "1px solid",
            borderColor: "plate.border",
            bg: "plate.surface",
          })}
        >
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "600",
              color: "ink.muted",
              fontFamily: "mono, monospace",
            })}
          >
            main.py
          </span>
          <div className={css({ display: "flex", gap: "2" })}>
          <button
            onClick={regenerateCode}
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "lego.orange",
              bg: "transparent",
              border: "1px solid",
              borderColor: "rgba(254, 138, 24, 0.3)",
              px: "3",
              py: "1",
              rounded: "brick",
              cursor: "pointer",
              transition: "all 0.15s ease",
              _hover: {
                color: "#FF9F33",
                borderColor: "rgba(254, 138, 24, 0.5)",
                bg: "rgba(254, 138, 24, 0.06)",
              },
            })}
          >
            Regenerate
          </button>
          <button
            onClick={copyCode}
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: copied ? "lego.green" : "ink.faint",
              bg: "transparent",
              border: "1px solid",
              borderColor: copied
                ? "rgba(0, 133, 43, 0.3)"
                : "plate.border",
              px: "3",
              py: "1",
              rounded: "brick",
              cursor: "pointer",
              transition: "all 0.15s ease",
              _hover: {
                color: "ink.secondary",
                borderColor: "plate.borderHover",
              },
            })}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          </div>
        </div>
        <textarea
          value={editCode}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          className={css({
            w: "100%",
            minH: "400px",
            p: "5",
            fontSize: "sm",
            lineHeight: "1.7",
            color: "ink.primary",
            fontFamily: "mono, monospace",
            bg: "transparent",
            border: "none",
            resize: "vertical",
            _focus: {
              outline: "none",
            },
          })}
        />
      </div>
    </div>
  );
}
