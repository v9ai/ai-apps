"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { css } from "styled-system/css";
import { createHub, type HubStatus, type PybricksHub } from "@/lib/pybricks-ble";
import {
  startImuStream,
  type ImuFrame,
  type ImuStreamHandle,
  type BatteryReading,
  IMU_QUEST_SCRIPT,
  SIDE,
} from "@/lib/imu-stream";

type GameStatus = "idle" | "calibrating" | "playing" | "paused" | "gameover";

interface Asteroid {
  x: number;
  y: number;
  r: number;
  vy: number;
}

interface Missile {
  x: number;
  y: number;
}

const CANVAS_W = 720;
const CANVAS_H = 480;
const PLAYER_Y = CANVAS_H - 60;
const PLAYER_R = 14;
const SHAKE_THRESHOLD = 12000;
const SPIN_THRESHOLD = 220;

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hubRef = useRef<PybricksHub | null>(null);
  const streamRef = useRef<ImuStreamHandle | null>(null);
  const frameRef = useRef<ImuFrame | null>(null);
  const orientationRef = useRef<number[] | null>(null);

  const [hubStatus, setHubStatus] = useState<HubStatus>("disconnected");
  const [hubError, setHubError] = useState<string | null>(null);
  const [hubName, setHubName] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [hudFrame, setHudFrame] = useState<ImuFrame | null>(null);
  const [battery, setBattery] = useState<BatteryReading | null>(null);

  // --- Hub lifecycle -----------------------------------------------------
  useEffect(() => {
    const hub = createHub();
    hub.onStatusChange = (s) => {
      setHubStatus(s);
      setHubError(hub.error);
      setHubName(hub.name);
    };
    hubRef.current = hub;
    return () => {
      streamRef.current?.stop();
      void hub.stop().catch(() => {});
    };
  }, []);

  async function handleConnect() {
    const hub = hubRef.current;
    if (!hub) return;
    await hub.connect();
  }

  async function handlePlay() {
    const hub = hubRef.current;
    if (!hub) return;
    streamRef.current?.stop();
    streamRef.current = null;
    frameRef.current = null;
    setBattery(null);
    setGameStatus("calibrating");

    await hub.deploy(IMU_QUEST_SCRIPT);
    if (hub.status === "error") {
      setGameStatus("idle");
      return;
    }

    const stream = startImuStream({
      onFrame: (f) => {
        frameRef.current = f;
      },
      onOrientation: (m) => {
        orientationRef.current = m;
      },
      onBattery: (b) => {
        setBattery(b);
      },
    });
    streamRef.current = stream;
    await stream.ready;
    startGame();
  }

  async function handleStop() {
    streamRef.current?.stop();
    streamRef.current = null;
    setGameStatus("idle");
    await hubRef.current?.stop().catch(() => {});
  }

  // --- Game loop ---------------------------------------------------------
  const stateRef = useRef<{
    asteroids: Asteroid[];
    missiles: Missile[];
    spawnTimer: number;
    shakeCooldown: number;
    spinCooldown: number;
    invuln: number;
    pauseHold: number;
    startedAt: number;
    score: number;
    status: GameStatus;
  }>({
    asteroids: [],
    missiles: [],
    spawnTimer: 0,
    shakeCooldown: 0,
    spinCooldown: 0,
    invuln: 0,
    pauseHold: 0,
    startedAt: 0,
    score: 0,
    status: "idle",
  });

  function startGame() {
    stateRef.current = {
      asteroids: [],
      missiles: [],
      spawnTimer: 0,
      shakeCooldown: 0,
      spinCooldown: 0,
      invuln: 60,
      pauseHold: 0,
      startedAt: performance.now(),
      score: 0,
      status: "playing",
    };
    setGameStatus("playing");
    setScore(0);
  }

  useEffect(() => {
    stateRef.current.status = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    function loop(now: number) {
      const dt = Math.min(50, now - last);
      last = now;

      const canvas = canvasRef.current;
      const frame = frameRef.current;
      const st = stateRef.current;

      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Drive sim only while playing
          if (st.status === "playing" && frame) {
            tick(st, frame, dt);
            if (st.status !== stateRef.current.status) {
              // tick may have changed status (e.g. pause/gameover)
            }
          } else if (st.status === "paused" && frame) {
            // allow leaving pause
            if (frame.up !== SIDE.TOP) {
              st.pauseHold = 0;
              st.status = "playing";
              setGameStatus("playing");
            }
          }
          render(ctx, st, frame, hudFrame);
        }
      }

      // Sync HUD ~10 Hz so React doesn't re-render every frame
      if (frame && (!hudFrame || now - (hudFrame as ImuFrame & { _t?: number })._t! > 100)) {
        const tagged = { ...frame, _t: now } as ImuFrame & { _t: number };
        setHudFrame(tagged);
      }

      if (st.status === "playing" || st.status === "paused") {
        const newScore = Math.floor((now - st.startedAt) / 100) + st.score;
        if (newScore !== score) setScore(newScore);
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist best score across runs in this tab
  useEffect(() => {
    if (gameStatus === "gameover") {
      setBestScore((b) => Math.max(b, score));
    }
  }, [gameStatus, score]);

  // --- Render ------------------------------------------------------------
  return (
    <main className={css({ mx: "auto", maxW: "5xl", px: "4", py: "8" })}>
      <div className={css({ mb: "4", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
        <div>
          <h1 className={css({ fontSize: "2xl", fontWeight: "900", fontFamily: "display", letterSpacing: "-0.02em", color: "ink.primary" })}>
            IMU Quest — Tilt Pilot
          </h1>
          <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
            Tilt to steer. Shake to fire. Spin fast for a barrel roll. Hold the hub upright (TOP face up) to pause.
          </p>
        </div>
        <Link href="/games" className={css({ fontSize: "xs", fontWeight: "700", fontFamily: "display", color: "ink.muted", textDecoration: "none", _hover: { color: "lego.orange" } })}>
          ← all games
        </Link>
      </div>

      <ConnectionBar
        status={hubStatus}
        error={hubError}
        hubName={hubName}
        gameStatus={gameStatus}
        onConnect={handleConnect}
        onPlay={handlePlay}
        onStop={handleStop}
      />

      <div className={css({ position: "relative", mt: "4", rounded: "brick", overflow: "hidden", border: "1px solid", borderColor: "plate.border", boxShadow: "brick", bg: "#0b0f1a" })}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className={css({ display: "block", w: "full", h: "auto", aspectRatio: `${CANVAS_W} / ${CANVAS_H}` })}
        />
        <Overlay status={gameStatus} score={score} bestScore={bestScore} onPlay={handlePlay} canPlay={hubStatus === "connected" || hubStatus === "running"} />
      </div>

      <Hud frame={hudFrame} battery={battery} score={score} bestScore={bestScore} />
    </main>
  );
}

// --- Sim & render ------------------------------------------------------

function tick(
  st: ReturnType<typeof emptyState>,
  f: ImuFrame,
  dt: number,
) {
  // Pause if held upright
  if (f.up === SIDE.TOP) {
    st.pauseHold += dt;
    if (st.pauseHold > 400) {
      st.status = "paused";
      return;
    }
  } else {
    st.pauseHold = 0;
  }

  st.shakeCooldown = Math.max(0, st.shakeCooldown - dt);
  st.spinCooldown = Math.max(0, st.spinCooldown - dt);
  st.invuln = Math.max(0, st.invuln - dt);

  // Shake -> fire missile
  if (f.accelMag > SHAKE_THRESHOLD && st.shakeCooldown <= 0) {
    st.missiles.push({ x: playerX(f), y: PLAYER_Y - PLAYER_R });
    st.shakeCooldown = 350;
  }

  // Fast spin -> barrel roll (1s invuln + clear missiles outward)
  if (Math.abs(f.avZ) > SPIN_THRESHOLD && st.spinCooldown <= 0) {
    st.invuln = 1000;
    st.spinCooldown = 1500;
  }

  // Spawn asteroids — rate ramps with time
  const elapsed = (performance.now() - st.startedAt) / 1000;
  const spawnEvery = Math.max(220, 800 - elapsed * 12);
  st.spawnTimer += dt;
  while (st.spawnTimer > spawnEvery) {
    st.spawnTimer -= spawnEvery;
    st.asteroids.push({
      x: 30 + Math.random() * (CANVAS_W - 60),
      y: -30,
      r: 12 + Math.random() * 18,
      vy: 0.12 + Math.random() * 0.1 + elapsed * 0.004,
    });
  }

  // Move asteroids
  for (const a of st.asteroids) a.y += a.vy * dt;
  st.asteroids = st.asteroids.filter((a) => a.y - a.r < CANVAS_H + 40);

  // Move missiles
  for (const m of st.missiles) m.y -= 0.7 * dt;
  st.missiles = st.missiles.filter((m) => m.y > -20);

  // Missile vs asteroid
  for (const m of st.missiles) {
    for (const a of st.asteroids) {
      const dx = m.x - a.x;
      const dy = m.y - a.y;
      if (dx * dx + dy * dy < (a.r + 5) * (a.r + 5)) {
        a.r = -1; // mark dead
        m.y = -100; // mark dead
        st.score += 10;
      }
    }
  }
  st.asteroids = st.asteroids.filter((a) => a.r > 0);

  // Player vs asteroid
  if (st.invuln <= 0) {
    const px = playerX(f);
    for (const a of st.asteroids) {
      const dx = px - a.x;
      const dy = PLAYER_Y - a.y;
      if (dx * dx + dy * dy < (a.r + PLAYER_R) * (a.r + PLAYER_R)) {
        st.status = "gameover";
        return;
      }
    }
  }
}

function playerX(f: ImuFrame): number {
  // Roll ±30° → full canvas width
  const norm = Math.max(-1, Math.min(1, f.roll / 30));
  return CANVAS_W / 2 + norm * (CANVAS_W / 2 - PLAYER_R - 10);
}

function render(
  ctx: CanvasRenderingContext2D,
  st: ReturnType<typeof emptyState>,
  f: ImuFrame | null,
  _hud: ImuFrame | null,
) {
  // Background
  ctx.fillStyle = "#0b0f1a";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Starfield: deterministic dots that scroll with elapsed time
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  const t = performance.now() / 1000;
  for (let i = 0; i < 60; i++) {
    const sx = (i * 97) % CANVAS_W;
    const sy = ((i * 53 + t * 40) % CANVAS_H + CANVAS_H) % CANVAS_H;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Asteroids
  for (const a of st.asteroids) {
    ctx.beginPath();
    ctx.fillStyle = "#94a3b8";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Missiles
  ctx.fillStyle = "#f59e0b";
  for (const m of st.missiles) {
    ctx.fillRect(m.x - 2, m.y - 8, 4, 12);
  }

  // Player ship
  if (f) {
    const px = playerX(f);
    ctx.save();
    ctx.translate(px, PLAYER_Y);
    // tilt the ship visually with roll
    ctx.rotate((f.roll / 60) * Math.PI / 4);
    ctx.fillStyle = st.invuln > 0 ? "#22d3ee" : "#0ea5e9";
    ctx.beginPath();
    ctx.moveTo(0, -PLAYER_R);
    ctx.lineTo(PLAYER_R, PLAYER_R);
    ctx.lineTo(0, PLAYER_R * 0.4);
    ctx.lineTo(-PLAYER_R, PLAYER_R);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  } else {
    // No frame yet — draw placeholder
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2, PLAYER_Y, PLAYER_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // HUD: heading compass top-right
  if (f) {
    const cx = CANVAS_W - 50;
    const cy = 50;
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.stroke();
    const ang = (-f.heading * Math.PI) / 180 - Math.PI / 2;
    ctx.beginPath();
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * 24, cy + Math.sin(ang) * 24);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("HDG", cx, cy + 44);
  }

  // Status overlay text drawn in DOM, not canvas
}

function emptyState() {
  return {
    asteroids: [] as Asteroid[],
    missiles: [] as Missile[],
    spawnTimer: 0,
    shakeCooldown: 0,
    spinCooldown: 0,
    invuln: 0,
    pauseHold: 0,
    startedAt: 0,
    score: 0,
    status: "idle" as GameStatus,
  };
}

// --- UI bits -----------------------------------------------------------

function ConnectionBar({
  status,
  error,
  hubName,
  gameStatus,
  onConnect,
  onPlay,
  onStop,
}: {
  status: HubStatus;
  error: string | null;
  hubName: string | null;
  gameStatus: GameStatus;
  onConnect: () => void;
  onPlay: () => void;
  onStop: () => void;
}) {
  const connected = status === "connected" || status === "running" || status === "deploying";
  const playing = gameStatus === "playing" || gameStatus === "paused" || gameStatus === "calibrating";

  return (
    <div className={css({ display: "flex", alignItems: "center", gap: "3", flexWrap: "wrap", p: "3", rounded: "brick", border: "1px solid", borderColor: "plate.border", bg: "plate.surface" })}>
      <StatusDot status={status} />
      <div className={css({ fontSize: "sm", fontFamily: "display", fontWeight: "700", color: "ink.primary" })}>
        {connected ? hubName ?? "Hub connected" : statusLabel(status)}
      </div>
      <div className={css({ flex: 1 })} />
      {!connected && (
        <button
          onClick={onConnect}
          disabled={status === "connecting"}
          className={css({ px: "4", py: "2", rounded: "brick", border: "1px solid", borderColor: "plate.border", bg: "plate.raised", fontFamily: "display", fontWeight: "700", fontSize: "sm", color: "ink.primary", cursor: "pointer", _hover: { borderColor: "plate.borderHover" }, _disabled: { opacity: 0.5, cursor: "not-allowed" } })}
        >
          {status === "connecting" ? "Connecting…" : "Connect Essential Hub"}
        </button>
      )}
      {connected && !playing && (
        <button
          onClick={onPlay}
          className={css({ px: "4", py: "2", rounded: "brick", border: "1px solid", borderColor: "lego.orange", bg: "lego.orange", fontFamily: "display", fontWeight: "800", fontSize: "sm", color: "white", cursor: "pointer", _hover: { opacity: 0.9 } })}
        >
          Deploy & play
        </button>
      )}
      {playing && (
        <button
          onClick={onStop}
          className={css({ px: "4", py: "2", rounded: "brick", border: "1px solid", borderColor: "plate.border", bg: "plate.raised", fontFamily: "display", fontWeight: "700", fontSize: "sm", color: "ink.primary", cursor: "pointer" })}
        >
          Stop
        </button>
      )}
      {error && (
        <div className={css({ width: "full", fontSize: "xs", color: "lego.red", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace" })}>
          {error}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: HubStatus }) {
  const color =
    status === "connected" || status === "running" ? "#22c55e" :
    status === "connecting" || status === "deploying" ? "#f59e0b" :
    status === "error" ? "#ef4444" :
    "#64748b";
  return (
    <span
      aria-hidden="true"
      className={css({ display: "inline-block", w: "2.5", h: "2.5", rounded: "full" })}
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

function statusLabel(s: HubStatus): string {
  switch (s) {
    case "disconnected": return "No hub connected";
    case "connecting":   return "Connecting…";
    case "connected":    return "Connected";
    case "deploying":    return "Deploying script…";
    case "running":      return "Running";
    case "error":        return "Error";
  }
}

function Overlay({
  status,
  score,
  bestScore,
  onPlay,
  canPlay,
}: {
  status: GameStatus;
  score: number;
  bestScore: number;
  onPlay: () => void;
  canPlay: boolean;
}) {
  if (status === "playing") return null;

  let title = "";
  let body: string | null = null;
  let cta: string | null = null;

  if (status === "idle") {
    title = "Tilt Pilot";
    body = canPlay ? "Hit Deploy & play to start." : "Connect your Essential Hub to begin.";
  } else if (status === "calibrating") {
    title = "Calibrating…";
    body = "Place the hub flat. Hold still until the light turns green.";
  } else if (status === "paused") {
    title = "Paused";
    body = "Tilt the hub off TOP to resume.";
  } else if (status === "gameover") {
    title = "Game over";
    body = `Score ${score} · best ${Math.max(score, bestScore)}`;
    cta = "Play again";
  }

  return (
    <div
      className={css({
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "3",
        bg: "rgba(11,15,26,0.78)",
        color: "white",
        textAlign: "center",
        p: "6",
      })}
    >
      <h2 className={css({ fontSize: "3xl", fontWeight: "900", fontFamily: "display", letterSpacing: "-0.02em" })}>
        {title}
      </h2>
      {body && <p className={css({ fontSize: "sm", color: "rgba(255,255,255,0.75)", maxW: "sm" })}>{body}</p>}
      {cta && (
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className={css({ mt: "2", px: "5", py: "2.5", rounded: "brick", border: "1px solid", borderColor: "lego.orange", bg: "lego.orange", color: "white", fontFamily: "display", fontWeight: "800", fontSize: "sm", cursor: "pointer", _hover: { opacity: 0.9 }, _disabled: { opacity: 0.5, cursor: "not-allowed" } })}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function Hud({
  frame,
  battery,
  score,
  bestScore,
}: {
  frame: ImuFrame | null;
  battery: BatteryReading | null;
  score: number;
  bestScore: number;
}) {
  return (
    <div className={css({ mt: "4", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "3" })}>
      <Stat label="Score" value={String(score)} />
      <Stat label="Best" value={String(bestScore)} />
      <Battery reading={battery} />
      <Stat label="Pitch" value={fmt(frame?.pitch)} unit="°" />
      <Stat label="Roll" value={fmt(frame?.roll)} unit="°" />
      <Stat label="Heading" value={fmt(frame?.heading)} unit="°" />
      <Stat label="Spin Z" value={fmt(frame?.avZ)} unit="°/s" />
      <Stat label="Accel" value={fmt(frame?.accelMag, 0)} unit="mm/s²" />
      <Stat label="Up face" value={frame ? sideName(frame.up) : "—"} />
    </div>
  );
}

const BATTERY_EMPTY_MV = 6500;
const BATTERY_FULL_MV = 8200;

function Battery({ reading }: { reading: BatteryReading | null }) {
  const pct = reading
    ? Math.max(0, Math.min(1, (reading.voltageMv - BATTERY_EMPTY_MV) / (BATTERY_FULL_MV - BATTERY_EMPTY_MV)))
    : 0;
  const pctInt = Math.round(pct * 100);
  const fillColor =
    !reading ? "rgba(255,255,255,0.15)" :
    pct >= 0.5 ? "#22c55e" :
    pct >= 0.2 ? "#f59e0b" :
    "#ef4444";

  const showCurrent = reading && Math.abs(reading.currentMa) >= 5;
  const charging = reading ? reading.currentMa > 0 : false;

  return (
    <div className={css({ p: "2.5", rounded: "brick", border: "1px solid", borderColor: "plate.border", bg: "plate.surface" })}>
      <div className={css({ fontSize: "10px", fontFamily: "display", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "ink.faint" })}>
        Battery
      </div>

      <div className={css({ mt: "1.5", display: "flex", alignItems: "center", gap: "2" })}>
        {/* Battery body */}
        <div
          className={css({
            position: "relative",
            flex: 1,
            h: "4",
            rounded: "sm",
            border: "1px solid",
            borderColor: "rgba(255,255,255,0.25)",
            bg: "rgba(255,255,255,0.05)",
            overflow: "hidden",
          })}
        >
          <div
            className={css({ position: "absolute", top: 0, left: 0, bottom: 0, transition: "width 0.4s ease, background 0.4s ease" })}
            style={{ width: `${pctInt}%`, background: fillColor }}
          />
        </div>
        {/* Battery cap */}
        <div
          aria-hidden="true"
          className={css({ w: "1", h: "2", rounded: "sm", bg: "rgba(255,255,255,0.25)" })}
        />
      </div>

      <div className={css({ mt: "1", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "2" })}>
        <span className={css({ fontFamily: "ui-monospace, monospace", fontSize: "sm", color: "ink.primary" })}>
          {reading ? `${(reading.voltageMv / 1000).toFixed(2)} V` : "—"}
          <span className={css({ ml: "1.5", color: "ink.muted", fontSize: "xs" })}>
            {reading ? `${pctInt}%` : ""}
          </span>
        </span>
        {showCurrent && reading && (
          <span
            className={css({ fontFamily: "ui-monospace, monospace", fontSize: "10px" })}
            style={{ color: charging ? "#22c55e" : "rgba(255,255,255,0.55)" }}
          >
            {charging ? "+" : ""}{Math.round(reading.currentMa)} mA
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className={css({ p: "2.5", rounded: "brick", border: "1px solid", borderColor: "plate.border", bg: "plate.surface" })}>
      <div className={css({ fontSize: "10px", fontFamily: "display", fontWeight: "800", letterSpacing: "0.08em", textTransform: "uppercase", color: "ink.faint" })}>{label}</div>
      <div className={css({ mt: "0.5", fontFamily: "ui-monospace, monospace", fontSize: "sm", color: "ink.primary" })}>
        {value}{unit ? <span className={css({ ml: "1", color: "ink.muted", fontSize: "xs" })}>{unit}</span> : null}
      </div>
    </div>
  );
}

function fmt(n: number | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

function sideName(code: number): string {
  switch (code) {
    case SIDE.TOP: return "TOP";
    case SIDE.BOTTOM: return "BOTTOM";
    case SIDE.FRONT: return "FRONT";
    case SIDE.BACK: return "BACK";
    case SIDE.LEFT: return "LEFT";
    case SIDE.RIGHT: return "RIGHT";
    default: return "—";
  }
}
