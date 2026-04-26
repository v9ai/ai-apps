const DEPLOY_SERVER = "http://localhost:2026";

export const SIDE = {
  TOP: 0,
  BOTTOM: 1,
  FRONT: 2,
  BACK: 3,
  LEFT: 4,
  RIGHT: 5,
} as const;

export interface ImuFrame {
  pitch: number;
  roll: number;
  ax: number;
  ay: number;
  az: number;
  heading: number;
  rotZ: number;
  avZ: number;
  up: number;
  stationary: boolean;
  accelMag: number;
}

export interface ParserCallbacks {
  onFrame: (f: ImuFrame) => void;
  onOrientation?: (m: number[]) => void;
  onReady?: () => void;
}

export interface TelemetryParser {
  feed(text: string): void;
  reset(): void;
}

export function createTelemetryParser(cb: ParserCallbacks): TelemetryParser {
  let buffer = "";

  function parseLine(line: string) {
    if (!line) return;
    if (line === "READY") {
      cb.onReady?.();
      return;
    }
    if (line.startsWith("T ")) {
      const p = line.split(/\s+/);
      if (p.length < 11) return;
      const ax = parseFloat(p[3]);
      const ay = parseFloat(p[4]);
      const az = parseFloat(p[5]);
      cb.onFrame({
        pitch: parseFloat(p[1]),
        roll: parseFloat(p[2]),
        ax,
        ay,
        az,
        heading: parseFloat(p[6]),
        rotZ: parseFloat(p[7]),
        avZ: parseFloat(p[8]),
        up: parseInt(p[9], 10),
        stationary: p[10] === "1",
        accelMag: Math.sqrt(ax * ax + ay * ay + az * az),
      });
      return;
    }
    if (line.startsWith("O ") && cb.onOrientation) {
      const nums = line
        .split(/\s+/)
        .slice(1)
        .map((s) => parseFloat(s));
      if (nums.length === 9) cb.onOrientation(nums);
    }
  }

  return {
    feed(text: string) {
      if (!text) return;
      buffer += text;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        parseLine(line);
      }
    },
    reset() {
      buffer = "";
    },
  };
}

// --- HTTP poll transport (used in local-server mode) -------------------

export interface ImuStreamHandle {
  stop(): void;
  ready: Promise<void>;
}

interface HttpStreamCallbacks extends ParserCallbacks {
  onStatus?: (status: "polling" | "ready" | "error") => void;
}

export function startImuStream(cb: HttpStreamCallbacks): ImuStreamHandle {
  let stopped = false;
  let cursor = 0;
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((res) => {
    resolveReady = res;
  });

  const parser = createTelemetryParser({
    onFrame: cb.onFrame,
    onOrientation: cb.onOrientation,
    onReady: () => {
      cb.onStatus?.("ready");
      cb.onReady?.();
      resolveReady();
    },
  });

  cb.onStatus?.("polling");

  async function poll() {
    while (!stopped) {
      try {
        const r = await fetch(`${DEPLOY_SERVER}/status`);
        if (r.ok) {
          const data = (await r.json()) as { output?: string };
          const full = data.output ?? "";
          if (full.length < cursor) {
            cursor = 0;
            parser.reset();
          }
          const tail = full.slice(cursor);
          cursor = full.length;
          parser.feed(tail);
        } else {
          cb.onStatus?.("error");
        }
      } catch {
        cb.onStatus?.("error");
      }
      await new Promise((res) => setTimeout(res, 50));
    }
  }

  void poll();

  return {
    stop() {
      stopped = true;
    },
    ready,
  };
}

// --- Inline script source ---------------------------------------------
// Kept in sync with apps/bricks/scripts/imu_quest.py — used by the local-mode
// "Deploy & play" button to upload via the Python deploy server.
export const IMU_QUEST_SCRIPT = `from pybricks.hubs import EssentialHub
from pybricks.parameters import Color, Side, Axis
from pybricks.tools import wait

hub = EssentialHub()

hub.imu.settings(
    angular_velocity_threshold=2.0,
    acceleration_threshold=200,
)

SIDE_CODE = {
    Side.TOP: 0, Side.BOTTOM: 1,
    Side.FRONT: 2, Side.BACK: 3,
    Side.LEFT: 4, Side.RIGHT: 5,
}

hub.light.blink(Color.YELLOW, [200, 200])
while not hub.imu.ready():
    wait(50)
hub.light.off()

hub.light.on(Color.WHITE)
still_for = 0
while still_for < 500:
    if hub.imu.stationary():
        still_for += 50
    else:
        still_for = 0
    wait(50)

hub.imu.reset_heading(0)
hub.light.on(Color.GREEN)
print("READY")

tick = 0
while True:
    pitch, roll = hub.imu.tilt()
    ax, ay, az = hub.imu.acceleration()
    heading = hub.imu.heading()
    rot_z = hub.imu.rotation(Axis.Z)
    av_z = hub.imu.angular_velocity(Axis.Z)
    up = SIDE_CODE.get(hub.imu.up(), -1)
    still = 1 if hub.imu.stationary() else 0

    print("T", pitch, roll, ax, ay, az, heading, rot_z, av_z, up, still)

    if tick % 20 == 0:
        m = hub.imu.orientation()
        print(
            "O",
            m[0, 0], m[0, 1], m[0, 2],
            m[1, 0], m[1, 1], m[1, 2],
            m[2, 0], m[2, 1], m[2, 2],
        )

    if still:
        hub.light.on(Color.GREEN)
    elif abs(roll) > 25 or abs(pitch) > 25:
        hub.light.on(Color.ORANGE)
    else:
        hub.light.on(Color.CYAN)

    tick += 1
    wait(50)
`;
