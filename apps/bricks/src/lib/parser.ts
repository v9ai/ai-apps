export type HubType =
  | "EssentialHub"
  | "TechnicHub"
  | "MoveHub"
  | "PrimeHub"
  | "CityHub";

export const HUB_TYPE_SLUG: Record<HubType, string> = {
  CityHub: "city",
  TechnicHub: "technic",
  MoveHub: "move",
  PrimeHub: "prime",
  EssentialHub: "essential",
};

export const HUB_SLUG_TO_TYPE: Record<string, HubType> = Object.fromEntries(
  Object.entries(HUB_TYPE_SLUG).map(([k, v]) => [v, k as HubType]),
) as Record<string, HubType>;

export type DeviceType =
  | "Motor"
  | "DCMotor"
  | "Light"
  | "ColorSensor"
  | "ColorLightMatrix"
  | "UltrasonicSensor"
  | "ForceSensor"
  | "InfraredSensor";

export interface PortDevice {
  port: string; // A, B, C, D
  deviceType: DeviceType;
  varName: string;
  direction?: string;
}

export interface ButtonAction {
  button: string;
  action: string;
}

export interface Constant {
  name: string;
  value: string;
}

export interface ParsedScript {
  filename: string;
  hubType: HubType | null;
  devices: PortDevice[];
  hasRemote: boolean;
  buttonActions: ButtonAction[];
  constants: Constant[];
  usesCarApi: boolean;
  colors: string[];
  code: string;
  lesson: string | null;
  lessonTitle: string | null;
  lessonRo: string | null;
  lessonTitleRo: string | null;
  heroImage: string | null;
  lessonSourceUrl: string | null;
}

export function slugify(filename: string): string {
  return filename.replace(/\.py$/, "").toLowerCase().replace(/_/g, "-");
}

export const DEVICE_IMG_MAP: Record<string, string> = {
  Motor: "/devices/pupdevice-motors.png",
  DCMotor: "/devices/pupdevice-dcmotors.png",
  Light: "/devices/pupdevice-light.png",
  ColorSensor: "/devices/pupdevice-color.png",
  ColorLightMatrix: "/devices/sensor_colorlightmatrix.png",
  UltrasonicSensor: "/devices/pupdevice-ultrasonic.png",
  ForceSensor: "/devices/pupdevice-force.png",
};

const HUB_PATTERN =
  /(\w+)\s*=\s*(EssentialHub|TechnicHub|MoveHub|PrimeHub|CityHub)\(\)/;
const DEVICE_PATTERN =
  /(\w+)\s*=\s*(Motor|DCMotor|Light|ColorSensor|ColorLightMatrix|UltrasonicSensor|ForceSensor)\(Port\.([A-Z])(?:,\s*Direction\.(\w+))?\)/g;
const REMOTE_PATTERN = /remote\s*=\s*Remote\(/i;
const CAR_PATTERN = /car\s*=\s*Car\(/;
const CONSTANT_PATTERN =
  /^([A-Z][A-Z_0-9]+)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:#.*)?$/gm;
const COLOR_PATTERN = /Color\.([A-Z]+)/g;

// Button action patterns — match if/elif blocks with Button references
const BUTTON_BLOCK_PATTERN =
  /(?:if|elif)\s+Button\.(\w+)\s+in\s+(?:pressed|new_presses).*?:\s*\n((?:[ \t]+.*\n)*)/g;

function extractButtonActions(code: string): ButtonAction[] {
  const actions: ButtonAction[] = [];
  const seen = new Set<string>();

  for (const match of code.matchAll(BUTTON_BLOCK_PATTERN)) {
    const button = match[1];
    const block = match[2];

    if (seen.has(button)) continue;
    seen.add(button);

    const action = summarizeBlock(block, button);
    if (action) {
      actions.push({ button: formatButton(button), action });
    }
  }

  // Also check single-line patterns like car.steer(... if Button.X in pressed ...)
  const inlinePattern =
    /car\.(steer|drive_power)\(.*?Button\.(\w+)\s+in\s+pressed.*?\)/g;
  for (const match of code.matchAll(inlinePattern)) {
    const method = match[1];
    const button = match[2];
    const key = button;
    if (seen.has(key)) continue;
    seen.add(key);

    if (method === "steer") {
      actions.push({
        button: formatButton(button),
        action: button.includes("PLUS") ? "Steer left" : "Steer right",
      });
    } else if (method === "drive_power") {
      actions.push({
        button: formatButton(button),
        action: button.includes("PLUS") ? "Drive forward" : "Drive reverse",
      });
    }
  }

  return actions;
}

function formatButton(raw: string): string {
  return raw
    .replace("LEFT_PLUS", "Left +")
    .replace("LEFT_MINUS", "Left -")
    .replace("RIGHT_PLUS", "Right +")
    .replace("RIGHT_MINUS", "Right -")
    .replace("LEFT", "Left (red)")
    .replace("RIGHT", "Right (red)")
    .replace("CENTER", "Center (green)");
}

function summarizeBlock(block: string, button: string): string | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("print"));

  if (lines.length === 0) return null;

  const summaries: string[] = [];

  for (const line of lines) {
    if (/\.dc\(\s*-?\d+\s*\)/.test(line) || /\.run\(\s*-?\d+\s*\)/.test(line)) {
      const speed = line.match(/-?\d+/);
      const varName = line.split(".")[0];
      if (speed && parseInt(speed[0]) < 0) {
        summaries.push(`${varName} reverse`);
      } else if (speed && parseInt(speed[0]) === 0) {
        summaries.push(`${varName} stop`);
      } else {
        summaries.push(`${varName} forward`);
      }
    } else if (/\.stop\(\)/.test(line)) {
      const varName = line.split(".")[0];
      summaries.push(`${varName} stop`);
    } else if (/\.run_target\(/.test(line)) {
      const angle = line.match(/,\s*(-?\d+)/);
      if (angle) {
        const deg = parseInt(angle[1]);
        if (deg > 0) summaries.push("Steer right");
        else if (deg < 0) summaries.push("Steer left");
        else summaries.push("Steer center");
      }
    } else if (/\.on\(/.test(line) && /Color\./.test(line)) {
      const color = line.match(/Color\.(\w+)/);
      if (color) summaries.push(`Light ${color[1].toLowerCase()}`);
    } else if (/\.off\(\)/.test(line)) {
      summaries.push("Light off");
    } else if (/current_speed\s*=/.test(line)) {
      if (/min\(/.test(line)) summaries.push("Speed up");
      else if (/max\(/.test(line)) summaries.push("Speed down");
      else if (/= 0/.test(line)) summaries.push("Stop");
    } else if (/current_brightness\s*=/.test(line)) {
      if (/min\(/.test(line)) summaries.push("Brightness up");
      else if (/max\(/.test(line)) summaries.push("Brightness down");
    }
  }

  if (summaries.length === 0) {
    // Fallback: emergency stop pattern
    if (
      button === "CENTER" ||
      button === "LEFT" ||
      button === "RIGHT"
    ) {
      if (lines.some((l) => /= 0/.test(l) || /\.stop\(/.test(l))) {
        return "Emergency stop";
      }
    }
    return null;
  }

  return [...new Set(summaries)].join(", ");
}

export function parseScript(filename: string, code: string): ParsedScript {
  const hubMatch = code.match(HUB_PATTERN);
  const hubType = hubMatch ? (hubMatch[2] as HubType) : null;

  const devices: PortDevice[] = [];
  for (const match of code.matchAll(DEVICE_PATTERN)) {
    devices.push({
      varName: match[1],
      deviceType: match[2] as DeviceType,
      port: match[3],
      direction: match[4] || undefined,
    });
  }

  const hasRemote = REMOTE_PATTERN.test(code);
  const usesCarApi = CAR_PATTERN.test(code);

  const constants: Constant[] = [];
  for (const match of code.matchAll(CONSTANT_PATTERN)) {
    constants.push({ name: match[1], value: match[2] });
  }

  const colors: string[] = [];
  const colorsSeen = new Set<string>();
  for (const match of code.matchAll(COLOR_PATTERN)) {
    if (!colorsSeen.has(match[1])) {
      colorsSeen.add(match[1]);
      colors.push(match[1]);
    }
  }

  const buttonActions = hasRemote ? extractButtonActions(code) : [];

  return {
    filename,
    hubType,
    devices,
    hasRemote,
    buttonActions,
    constants,
    usesCarApi,
    colors,
    code,
    lesson: null,
    lessonTitle: null,
    lessonRo: null,
    lessonTitleRo: null,
    heroImage: null,
    lessonSourceUrl: null,
  };
}

// Pybricks Color enum → display hex. Approximates how the LED renders.
export const PYBRICKS_COLOR_HEX: Record<string, string> = {
  RED: "#e3000b",
  ORANGE: "#fe8a18",
  YELLOW: "#ffd500",
  GREEN: "#00852b",
  CYAN: "#00b5e2",
  BLUE: "#006cb7",
  MAGENTA: "#c239b3",
  WHITE: "#ffffff",
  BLACK: "#000000",
  NONE: "transparent",
  GRAY: "#5d5d5d",
};

// Extract the 9-cell color matrix from `lights.on([...])` / `<var>.on([...])`
// in a Pybricks script. Resolves named constants (e.g. ALB = Color.BLUE) to
// their underlying Color value. Returns null if no 9-cell list is found.
export function extractMatrixColors(code: string): string[] | null {
  const constMap: Record<string, string> = {};
  const constPattern = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*Color\.([A-Z_]+)\s*$/gm;
  for (const m of code.matchAll(constPattern)) {
    constMap[m[1]] = m[2].toUpperCase();
  }

  const onMatch = code.match(/\.on\(\s*\[([\s\S]*?)\]\s*\)/);
  if (!onMatch) return null;

  const items = onMatch[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const colors: string[] = [];
  for (const raw of items) {
    const colorMatch = raw.match(/Color\.([A-Z_]+)/);
    if (colorMatch) {
      colors.push(colorMatch[1].toUpperCase());
      continue;
    }
    const ident = raw.match(/^([A-Z_][A-Z0-9_]*)$/);
    if (ident && constMap[ident[1]]) {
      colors.push(constMap[ident[1]]);
      continue;
    }
    return null;
  }

  return colors.length === 9 ? colors : null;
}

export function hubDisplayName(hub: HubType | null): string {
  switch (hub) {
    case "EssentialHub":
      return "Essential Hub";
    case "TechnicHub":
      return "Technic Hub";
    case "MoveHub":
      return "Move Hub";
    case "PrimeHub":
      return "Prime Hub";
    case "CityHub":
      return "City Hub";
    default:
      return "Unknown Hub";
  }
}

export function hubPorts(hub: HubType | null): string[] {
  switch (hub) {
    case "MoveHub":
      return ["A", "B", "C", "D"];
    case "TechnicHub":
      return ["A", "B", "C", "D"];
    case "PrimeHub":
      return ["A", "B", "C", "D", "E", "F"];
    case "EssentialHub":
      return ["A", "B"];
    case "CityHub":
      return ["A", "B"];
    default:
      return ["A", "B", "C", "D"];
  }
}

export function hubColor(hub: HubType | null): string {
  switch (hub) {
    case "EssentialHub":
      return "#4ade80"; // green
    case "TechnicHub":
      return "#60a5fa"; // blue
    case "MoveHub":
      return "#a78bfa"; // purple
    case "PrimeHub":
      return "#fbbf24"; // yellow
    case "CityHub":
      return "#f87171"; // red
    default:
      return "#9ca3af";
  }
}

export function deviceIcon(type: DeviceType): string {
  switch (type) {
    case "Motor":
    case "DCMotor":
      return "M"; // motor
    case "Light":
      return "L"; // light
    case "ColorSensor":
      return "CS";
    case "ColorLightMatrix":
      return "CLM";
    case "UltrasonicSensor":
      return "US";
    case "ForceSensor":
      return "FS";
    default:
      return "?";
  }
}
