"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";
import {
  HubType,
  DeviceType,
  hubDisplayName,
  hubPorts,
  hubColor,
  deviceIcon,
} from "@/lib/parser";
import { generateCode, generateAICode } from "@/lib/codegen";

/* ── Hub metadata ──────────────────────────────────────────────── */

const HUBS: { type: HubType; desc: string; img: string }[] = [
  { type: "CityHub", desc: "2 ports — trains, simple builds", img: "/hubs/hub-city.png" },
  { type: "TechnicHub", desc: "4 ports — Technic vehicles, robots", img: "/hubs/hub-technic.png" },
  { type: "MoveHub", desc: "4 ports — Boost set, basic robotics", img: "/hubs/hub-move.png" },
  { type: "PrimeHub", desc: "6 ports — Spike Prime, Inventor", img: "/hubs/hub-prime.png" },
  { type: "EssentialHub", desc: "2 ports — Spike Essential", img: "/hubs/hub-essential.png" },
];

const DEVICE_OPTIONS: { type: DeviceType; label: string; img: string }[] = [
  { type: "Motor", label: "Motor", img: "/devices/pupdevice-motors.png" },
  { type: "DCMotor", label: "DC Motor", img: "/devices/pupdevice-dcmotors.png" },
  { type: "Light", label: "Light", img: "/devices/pupdevice-light.png" },
  { type: "ColorSensor", label: "Color Sensor", img: "/devices/pupdevice-color.png" },
  { type: "ColorLightMatrix", label: "Color Light Matrix", img: "/devices/sensor_colorlightmatrix.png" },
  { type: "UltrasonicSensor", label: "Ultrasonic Sensor", img: "/devices/pupdevice-ultrasonic.png" },
  { type: "ForceSensor", label: "Force Sensor", img: "/devices/pupdevice-force.png" },
];

const DEVICE_IMG_MAP: Record<string, string> = Object.fromEntries(
  DEVICE_OPTIONS.map((d) => [d.type, d.img])
);

interface PortConfig {
  port: string;
  device: DeviceType | null;
  varName: string;
}

/* ── Templates ─────────────────────────────────────────────────── */

type TemplateId = "lights" | "remote-car" | "train" | "sensor" | "custom";

interface Template {
  id: TemplateId;
  label: string;
  desc: string;
  icon: string;
  color: string;
  remote: boolean;
  /** Device assignments keyed by port letter. Only first N ports of the hub are used. */
  devices: { device: DeviceType; varName: string }[];
}

const TEMPLATES: Template[] = [
  {
    id: "lights",
    label: "Status Light",
    desc: "Blink and animate the hub light with colors",
    icon: "L",
    color: "#eab308",
    remote: false,
    devices: [],
  },
  {
    id: "remote-car",
    label: "Remote Car",
    desc: "Drive two motors with a Powered Up Remote",
    icon: "RC",
    color: "#a78bfa",
    remote: true,
    devices: [
      { device: "Motor", varName: "drive" },
      { device: "Motor", varName: "steer" },
    ],
  },
  {
    id: "train",
    label: "Train",
    desc: "Simple train with DC motor on port A",
    icon: "T",
    color: "#f87171",
    remote: false,
    devices: [{ device: "DCMotor", varName: "train_motor" }],
  },
  {
    id: "sensor",
    label: "Sensor Bot",
    desc: "React to color sensor readings with a motor",
    icon: "S",
    color: "#22c55e",
    remote: false,
    devices: [
      { device: "Motor", varName: "motor" },
      { device: "ColorSensor", varName: "color_sensor" },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    desc: "Start from scratch — pick your own devices",
    icon: "+",
    color: "#9ca3af",
    remote: false,
    devices: [],
  },
];

function applyTemplate(template: Template, hubPorts: string[]): PortConfig[] {
  return hubPorts.map((port, i) => {
    const td = template.devices[i];
    return td
      ? { port, device: td.device, varName: `${td.varName}_${port.toLowerCase()}` }
      : { port, device: null, varName: "" };
  });
}


/* ── Default var name for device ───────────────────────────────── */

function defaultVarName(device: DeviceType, port: string): string {
  const base: Record<DeviceType, string> = {
    Motor: "motor",
    DCMotor: "dc_motor",
    Light: "light",
    ColorSensor: "color_sensor",
    ColorLightMatrix: "matrix",
    UltrasonicSensor: "ultrasonic",
    ForceSensor: "force_sensor",
    InfraredSensor: "ir_sensor",
  };
  return `${base[device]}_${port.toLowerCase()}`;
}

/* ── Component ─────────────────────────────────────────────────── */

export default function WizardPageWrapper() {
  return (
    <Suspense fallback={null}>
      <WizardPage />
    </Suspense>
  );
}

function WizardPage() {
  const [step, setStep] = useState(0);
  const [hub, setHub] = useState<HubType | null>(null);
  const [template, setTemplate] = useState<TemplateId | null>(null);
  const [ports, setPorts] = useState<PortConfig[]>([]);
  const [hasRemote, setHasRemote] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const mocId = searchParams.get("mocId");
    const mocName = searchParams.get("mocName");
    if (mocId && mocName) {
      setInstructions(`Generate a Pybricks script for the LEGO MOC: ${mocName} (${mocId})`);
    }
  }, [searchParams]);

  // Pre-select the hub when arriving from /hubs/[id] with ?hub=PrimeHub.
  // Only fires once on mount with a valid hub type — subsequent step changes
  // must not snap back to step 1.
  useEffect(() => {
    const hubParam = searchParams.get("hub");
    const valid: HubType[] = ["EssentialHub", "TechnicHub", "MoveHub", "PrimeHub", "CityHub"];
    if (hubParam && (valid as string[]).includes(hubParam)) {
      setHub(hubParam as HubType);
      setStep((s) => (s === 0 ? 1 : s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectHub = useCallback((h: HubType) => {
    setHub(h);
    setStep(1);
  }, []);

  const selectTemplate = useCallback(
    (t: Template) => {
      if (!hub) return;
      setTemplate(t.id);
      const hp = hubPorts(hub);
      setPorts(applyTemplate(t, hp));
      setHasRemote(t.remote);
      setStep(2);
    },
    [hub]
  );

  const setPortDevice = useCallback(
    (port: string, device: DeviceType | null) => {
      setPorts((prev) =>
        prev.map((p) =>
          p.port === port
            ? {
                ...p,
                device,
                varName: device ? defaultVarName(device, port) : "",
              }
            : p
        )
      );
    },
    []
  );

  const setPortVarName = useCallback((port: string, varName: string) => {
    setPorts((prev) =>
      prev.map((p) => (p.port === port ? { ...p, varName } : p))
    );
  }, []);

  return (
    <div
      className={css({
        maxW: "6xl",
        mx: "auto",
        px: "5",
        py: "10",
      })}
    >
      {/* Header */}
      <div className={css({ mb: "8" })}>
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
            New Script
          </span>
        </div>
        <h1
          className={css({
            fontSize: "2xl",
            fontWeight: "900",
            fontFamily: "display",
            color: "ink.primary",
            letterSpacing: "-0.02em",
          })}
        >
          Pybricks Wizard
        </h1>
        <p className={css({ color: "ink.muted", fontSize: "sm", mt: "1" })}>
          Pick a hub, wire up devices, get running code.
        </p>
      </div>

      {/* Steps indicator */}
      <div
        className={css({
          display: "flex",
          gap: "2",
          mb: "8",
        })}
      >
        {["Hub", "Template", "Devices"].map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={label}
              onClick={() => {
                if (i === 0) setStep(0);
                else if (i === 1 && hub) setStep(1);
                else if (i === 2 && hub && template) setStep(2);
              }}
              disabled={(i === 1 && !hub) || (i >= 2 && !template)}
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "2",
                px: "4",
                py: "2",
                rounded: "brick",
                fontSize: "sm",
                fontWeight: "700",
                fontFamily: "display",
                cursor: "pointer",
                border: "1.5px solid",
                transition: "all 0.15s ease",
                bg: active
                  ? "plate.raised"
                  : done
                    ? "rgba(0, 133, 43, 0.08)"
                    : "transparent",
                borderColor: active
                  ? "plate.borderHover"
                  : done
                    ? "rgba(0, 133, 43, 0.25)"
                    : "plate.border",
                color: active
                  ? "ink.primary"
                  : done
                    ? "lego.green"
                    : "ink.faint",
                _hover: {
                  bg: "plate.raised",
                },
                _disabled: {
                  opacity: 0.4,
                  cursor: "default",
                  _hover: { bg: "transparent" },
                },
              })}
            >
              <span
                className={css({
                  w: "5",
                  h: "5",
                  rounded: "stud",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "xs",
                  fontWeight: "800",
                  bg: active
                    ? "lego.yellow"
                    : done
                      ? "lego.green"
                      : "plate.raised",
                  color: active || done ? "#1B1B1B" : "ink.faint",
                  boxShadow: active ? "stud" : "none",
                })}
              >
                {done ? "\u2713" : i + 1}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Step 0: Hub selection ──────────────────────────────── */}
      {step === 0 && (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "3",
            md: { gridTemplateColumns: "1fr 1fr" },
          })}
        >
          {HUBS.map((h) => {
            const color = hubColor(h.type);
            const selected = hub === h.type;
            return (
              <button
                key={h.type}
                onClick={() => selectHub(h.type)}
                className={css({
                  textAlign: "left",
                  p: "5",
                  rounded: "brick",
                  border: "2px solid",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  bg: "plate.surface",
                  borderColor: selected ? color : "plate.border",
                  _hover: {
                    borderColor: color,
                    bg: "plate.raised",
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                  },
                })}
                style={
                  selected
                    ? { boxShadow: `0 0 0 1px ${color}, 0 4px 12px ${color}30` }
                    : undefined
                }
              >
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "3",
                    mb: "2",
                  })}
                >
                  <img
                    src={h.img}
                    alt={hubDisplayName(h.type)}
                    className={css({
                      w: "14",
                      h: "14",
                      objectFit: "contain",
                      flexShrink: 0,
                    })}
                  />
                  <span
                    className={css({
                      fontSize: "lg",
                      fontWeight: "800",
                      fontFamily: "display",
                      color: "ink.primary",
                    })}
                  >
                    {hubDisplayName(h.type)}
                  </span>
                </div>
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                  })}
                >
                  <span
                    className={css({
                      w: "2.5",
                      h: "2.5",
                      rounded: "stud",
                      flexShrink: 0,
                    })}
                    style={{ background: color }}
                  />
                  <span
                    className={css({
                      fontSize: "sm",
                      color: "ink.muted",
                    })}
                  >
                    {h.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Step 1: Template selection ──────────────────────────── */}
      {step === 1 && hub && (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "3",
            md: { gridTemplateColumns: "1fr 1fr" },
          })}
        >
          {TEMPLATES.map((t) => {
            const selected = template === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={css({
                  textAlign: "left",
                  p: "5",
                  rounded: "brick",
                  border: "2px solid",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  bg: "plate.surface",
                  borderColor: selected ? t.color : "plate.border",
                  _hover: {
                    bg: "plate.raised",
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
                  },
                })}
                style={
                  selected
                    ? { borderColor: t.color, boxShadow: `0 0 0 1px ${t.color}, 0 4px 12px ${t.color}30` }
                    : undefined
                }
              >
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "3",
                    mb: "2",
                  })}
                >
                  <span
                    className={css({
                      w: "10",
                      h: "10",
                      rounded: "brick",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "900",
                      fontFamily: "display",
                      fontSize: "sm",
                      flexShrink: 0,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 0 rgba(0,0,0,0.3)",
                    })}
                    style={{
                      background: t.color + "20",
                      color: t.color,
                      border: `1.5px solid ${t.color}40`,
                    }}
                  >
                    {t.icon}
                  </span>
                  <span
                    className={css({
                      fontSize: "lg",
                      fontWeight: "800",
                      fontFamily: "display",
                      color: "ink.primary",
                    })}
                  >
                    {t.label}
                  </span>
                </div>
                <span className={css({ fontSize: "sm", color: "ink.muted" })}>
                  {t.desc}
                </span>
                {t.devices.length > 0 && (
                  <div
                    className={css({
                      display: "flex",
                      gap: "1.5",
                      mt: "3",
                      flexWrap: "wrap",
                    })}
                  >
                    {t.devices.map((d, i) => (
                      <span
                        key={i}
                        className={css({
                          fontSize: "xs",
                          fontWeight: "600",
                          px: "2",
                          py: "0.5",
                          rounded: "full",
                          bg: "rgba(255,255,255,0.04)",
                          color: "ink.faint",
                          border: "1px solid",
                          borderColor: "plate.border",
                        })}
                      >
                        {d.device}
                      </span>
                    ))}
                    {t.remote && (
                      <span
                        className={css({
                          fontSize: "xs",
                          fontWeight: "600",
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
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Step 2: Device configuration ───────────────────────── */}
      {step === 2 && hub && (
        <div className={css({ display: "flex", flexDir: "column", gap: "4" })}>
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: "2",
            })}
          >
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
              })}
            >
              <span
                className={css({
                  w: "3",
                  h: "3",
                  rounded: "stud",
                  boxShadow: "stud",
                })}
                style={{ background: hubColor(hub) }}
              />
              <span
                className={css({
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "ink.primary",
                  fontSize: "lg",
                })}
              >
                {hubDisplayName(hub)}
              </span>
            </div>
            <button
              onClick={() => setStep(1)}
              className={css({
                fontSize: "xs",
                color: "ink.faint",
                bg: "transparent",
                border: "1px solid",
                borderColor: "plate.border",
                px: "3",
                py: "1",
                rounded: "brick",
                cursor: "pointer",
                _hover: { color: "ink.secondary", borderColor: "plate.borderHover" },
              })}
            >
              Change template
            </button>
          </div>

          {/* Port rows */}
          {ports.map((p) => (
            <div
              key={p.port}
              className={css({
                rounded: "brick",
                bg: "plate.surface",
                border: "1.5px solid",
                borderColor: p.device ? hubColor(hub) + "40" : "plate.border",
                transition: "all 0.15s ease",
                overflow: "hidden",
              })}
              style={
                p.device
                  ? { boxShadow: `inset 0 0 0 1px ${hubColor(hub)}10` }
                  : undefined
              }
            >
              {/* Port header with var name */}
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  px: "4",
                  py: "3",
                })}
              >
                <span
                  className={css({
                    w: "9",
                    h: "9",
                    rounded: "brick",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontFamily: "display",
                    fontSize: "md",
                    flexShrink: 0,
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 0 rgba(0,0,0,0.3)",
                  })}
                  style={{
                    background: p.device ? hubColor(hub) + "20" : "#1e1e24",
                    color: p.device ? hubColor(hub) : "#6b7280",
                    border: `1.5px solid ${p.device ? hubColor(hub) + "40" : "#333"}`,
                  }}
                >
                  {p.port}
                </span>
                <span
                  className={css({
                    fontSize: "sm",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: p.device ? "ink.primary" : "ink.faint",
                  })}
                >
                  Port {p.port}
                </span>
                {p.device && (
                  <input
                    type="text"
                    value={p.varName}
                    onChange={(e) => setPortVarName(p.port, e.target.value)}
                    placeholder="var_name"
                    className={css({
                      ml: "auto",
                      w: "36",
                      bg: "plate.raised",
                      color: "ink.primary",
                      border: "1.5px solid",
                      borderColor: "plate.border",
                      rounded: "brick",
                      px: "3",
                      py: "1.5",
                      fontSize: "xs",
                      fontFamily: "mono, monospace",
                      _focus: {
                        borderColor: "lego.orange",
                        outline: "none",
                      },
                    })}
                  />
                )}
                {p.device && (
                  <button
                    onClick={() => setPortDevice(p.port, null)}
                    className={css({
                      fontSize: "xs",
                      color: "ink.faint",
                      bg: "transparent",
                      border: "none",
                      cursor: "pointer",
                      px: "1",
                      _hover: { color: "lego.red" },
                    })}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Device picker grid */}
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "2",
                  px: "4",
                  pb: "3",
                })}
              >
                {DEVICE_OPTIONS.map((d) => {
                  const active = p.device === d.type;
                  return (
                    <button
                      key={d.type}
                      onClick={() =>
                        setPortDevice(p.port, active ? null : d.type)
                      }
                      title={d.label}
                      className={css({
                        display: "flex",
                        flexDir: "column",
                        alignItems: "center",
                        gap: "1.5",
                        p: "4",
                        rounded: "brick",
                        border: "1.5px solid",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        w: "100%",
                        bg: active ? hubColor(hub) + "15" : "plate.raised",
                        borderColor: active
                          ? hubColor(hub)
                          : "transparent",
                        _hover: {
                          borderColor: active
                            ? hubColor(hub)
                            : "plate.borderHover",
                          bg: active
                            ? hubColor(hub) + "20"
                            : "plate.hover",
                        },
                      })}
                    >
                      <img
                        src={d.img}
                        alt={d.label}
                        className={css({
                          w: "36",
                          h: "36",
                          objectFit: "contain",
                        })}
                      />
                      <span
                        className={css({
                          fontSize: "xs",
                          fontWeight: "600",
                          color: active ? hubColor(hub) : "ink.faint",
                          textAlign: "center",
                          lineHeight: "1.2",
                        })}
                        style={active ? { color: hubColor(hub) } : undefined}
                      >
                        {d.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Remote toggle */}
          <button
            onClick={() => setHasRemote(!hasRemote)}
            className={css({
              display: "flex",
              alignItems: "center",
              gap: "3",
              p: "4",
              rounded: "brick",
              border: "1.5px solid",
              cursor: "pointer",
              transition: "all 0.15s ease",
              bg: hasRemote ? "rgba(167, 139, 250, 0.06)" : "plate.surface",
              borderColor: hasRemote
                ? "rgba(167, 139, 250, 0.3)"
                : "plate.border",
              _hover: {
                borderColor: "rgba(167, 139, 250, 0.4)",
                bg: "rgba(167, 139, 250, 0.06)",
              },
            })}
          >
            <img
              src="/devices/pupdevice-remote.png"
              alt="Remote"
              className={css({
                w: "12",
                h: "12",
                objectFit: "contain",
                flexShrink: 0,
                opacity: hasRemote ? 1 : 0.4,
                transition: "opacity 0.15s ease",
              })}
            />
            <div className={css({ textAlign: "left" })}>
              <span
                className={css({
                  fontSize: "sm",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: hasRemote ? "#a78bfa" : "ink.secondary",
                  display: "block",
                })}
              >
                Powered Up Remote
              </span>
              <span
                className={css({ fontSize: "xs", color: "ink.faint" })}
              >
                {hasRemote ? "Connected" : "Click to add"}
              </span>
            </div>
            <span
              className={css({
                ml: "auto",
                w: "5",
                h: "5",
                rounded: "stud",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "xs",
                fontWeight: "800",
              })}
              style={{
                background: hasRemote ? "#a78bfa" : "#333",
                color: hasRemote ? "#1B1B1B" : "#6b7280",
              }}
            >
              {hasRemote ? "\u2713" : "+"}
            </span>
          </button>

          {/* Instructions */}
          <div>
            <label
              className={css({
                display: "block",
                fontSize: "sm",
                fontWeight: "700",
                fontFamily: "display",
                color: "ink.secondary",
                mb: "2",
              })}
            >
              Instructions
              <span className={css({ color: "ink.faint", fontWeight: "500" })}>
                {" "}
                — describe what the script should do
              </span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Drive forward when left + is pressed, turn right with right +, stop everything on center button..."
              rows={4}
              className={css({
                w: "100%",
                bg: "plate.raised",
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

          {/* Action buttons */}
          <div
            className={css({
              display: "flex",
              flexDir: "column",
              gap: "3",
              mt: "4",
            })}
          >
            <div
              className={css({
                display: "flex",
                justifyContent: "flex-end",
                gap: "3",
              })}
            >
              <button
                disabled={saving || generating || !session?.user}
                onClick={async () => {
                  if (!session?.user || !hub || !template) return;
                  setSaving(true);
                  try {
                    const generatedCode = generateCode(hub, ports, hasRemote);
                    const res = await fetch("/api/scripts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        hub,
                        template,
                        devices: ports.filter((p) => p.device),
                        hasRemote,
                        instructions,
                        code: generatedCode,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      router.push(`/scripts/${data.id}`);
                    }
                  } finally {
                    setSaving(false);
                  }
                }}
                className={css({
                  fontSize: "sm",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "white",
                  bg: "lego.red",
                  rounded: "brick",
                  px: "6",
                  py: "2.5",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: "none",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
                  _hover: {
                    bg: "#FF1A1A",
                    transform: "translateY(-1px)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #A30008, 0 5px 10px rgba(0,0,0,0.35)",
                  },
                  _active: {
                    transform: "translateY(1px)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #A30008",
                  },
                  _disabled: {
                    opacity: 0.5,
                    cursor: "default",
                  },
                })}
              >
                Quick Template
              </button>
              <button
                disabled={generating || saving || !session?.user || !instructions.trim()}
                onClick={async () => {
                  if (!session?.user || !hub || !template) return;
                  setGenerating(true);
                  setGenError(null);
                  try {
                    const aiCode = await generateAICode(hub, ports, hasRemote, instructions);
                    const res = await fetch("/api/scripts", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        hub,
                        template,
                        devices: ports.filter((p) => p.device),
                        hasRemote,
                        instructions,
                        code: aiCode,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      router.push(`/scripts/${data.id}`);
                    }
                  } catch (e) {
                    setGenError(e instanceof Error ? e.message : "AI generation failed");
                  } finally {
                    setGenerating(false);
                  }
                }}
                className={css({
                  fontSize: "sm",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "white",
                  bg: "#7c3aed",
                  rounded: "brick",
                  px: "6",
                  py: "2.5",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  border: "none",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #5b21b6, 0 3px 6px rgba(0,0,0,0.3)",
                  _hover: {
                    bg: "#8b5cf6",
                    transform: "translateY(-1px)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #5b21b6, 0 5px 10px rgba(0,0,0,0.35)",
                  },
                  _active: {
                    transform: "translateY(1px)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #5b21b6",
                  },
                  _disabled: {
                    opacity: 0.5,
                    cursor: "default",
                  },
                })}
              >
                {generating ? "AI Generating..." : "AI Generate"}
              </button>
            </div>
            {genError && (
              <p
                className={css({
                  fontSize: "sm",
                  color: "lego.red",
                  textAlign: "right",
                })}
              >
                {genError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 3 — navigates to /scripts/:id */}
    </div>
  );
}
