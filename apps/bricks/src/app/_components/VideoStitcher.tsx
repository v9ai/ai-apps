"use client";

import { useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

type Clip =
  | { kind: "file"; name: string; previewUrl: string; size: number; source: File }
  | { kind: "remote"; name: string; previewUrl: string; size: number; source: string };

type LocalClip = { name: string; url: string; size: number };

type Stage = "idle" | "loading-core" | "stitching" | "server-stitching" | "done";

const CORE_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const WASM_SIZE_WARN = 1.5 * 1024 * 1024 * 1024; // 1.5 GB — single-threaded wasm starts OOM-ing around here

type Rotation = 0 | 90 | 180 | 270;

export function VideoStitcher() {
  const [clipA, setClipA] = useState<Clip | null>(null);
  const [clipB, setClipB] = useState<Clip | null>(null);
  const [rotA, setRotA] = useState<Rotation>(0);
  const [rotB, setRotB] = useState<Rotation>(0);
  const [localClips, setLocalClips] = useState<LocalClip[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    fetch("/api/clips")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items: LocalClip[] }) => setLocalClips(data.items ?? []))
      .catch(() => setLocalClips([]));
  }, []);

  useEffect(() => {
    return () => {
      if (clipA?.kind === "file") URL.revokeObjectURL(clipA.previewUrl);
      if (clipB?.kind === "file") URL.revokeObjectURL(clipB.previewUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [clipA, clipB, outputUrl]);

  async function ensureFFmpeg(): Promise<FFmpeg> {
    if (ffmpegRef.current) return ffmpegRef.current;
    setStage("loading-core");
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ff = new FFmpeg();
    ff.on("log", ({ message }) => setLog(message));
    ff.on("progress", ({ progress: p }) => {
      if (Number.isFinite(p)) setProgress(Math.max(0, Math.min(1, p)));
    });
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ff;
    return ff;
  }

  function setSlot(slot: "A" | "B", next: Clip | null) {
    const prev = slot === "A" ? clipA : clipB;
    if (prev?.kind === "file") URL.revokeObjectURL(prev.previewUrl);
    (slot === "A" ? setClipA : setClipB)(next);
    setOutputUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
    setStage("idle");
    setError(null);
  }

  function pickClip(slot: "A" | "B") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSlot(slot, {
        kind: "file",
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
        source: file,
      });
    };
  }

  function loadLocalClip(slot: "A" | "B", c: LocalClip) {
    setSlot(slot, {
      kind: "remote",
      name: c.name,
      size: c.size,
      previewUrl: c.url,
      source: c.url,
    });
  }

  function swap() {
    setClipA(clipB);
    setClipB(clipA);
  }

  async function stitch() {
    if (!clipA || !clipB) return;
    setError(null);
    setProgress(0);
    setOutputUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const ff = await ensureFFmpeg();
      setStage("stitching");

      const { fetchFile } = await import("@ffmpeg/util");
      const nameA = `a.${extOf(clipA.name)}`;
      const nameB = `b.${extOf(clipB.name)}`;

      await ff.writeFile(nameA, await fetchFile(clipA.source));
      await ff.writeFile(nameB, await fetchFile(clipB.source));

      const listText = `file '${nameA}'\nfile '${nameB}'\n`;
      await ff.writeFile("list.txt", new TextEncoder().encode(listText));

      let code = await ff.exec([
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "list.txt",
        "-c", "copy",
        "out.mp4",
      ]);

      if (code !== 0) {
        code = await ff.exec([
          "-y",
          "-i", nameA,
          "-i", nameB,
          "-filter_complex",
          "[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[v][a]",
          "-map", "[v]",
          "-map", "[a]",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "23",
          "-c:a", "aac",
          "-b:a", "128k",
          "out.mp4",
        ]);
      }

      if (code !== 0) {
        code = await ff.exec([
          "-y",
          "-i", nameA,
          "-i", nameB,
          "-filter_complex",
          "[0:v:0][1:v:0]concat=n=2:v=1:a=0[v]",
          "-map", "[v]",
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-crf", "23",
          "out.mp4",
        ]);
      }

      if (code !== 0) {
        throw new Error("ffmpeg exited with code " + code);
      }

      const data = await ff.readFile("out.mp4");
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setStage("done");

      await Promise.allSettled([
        ff.deleteFile(nameA),
        ff.deleteFile(nameB),
        ff.deleteFile("list.txt"),
        ff.deleteFile("out.mp4"),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stitching failed");
      setStage("idle");
    }
  }

  async function stitchServer() {
    if (!clipA || !clipB) return;
    if (clipA.kind !== "remote" || clipB.kind !== "remote") {
      setError("Server stitch only supports clips from public/clips.");
      return;
    }
    setError(null);
    setProgress(0);
    setOutputUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setStage("server-stitching");
    try {
      const res = await fetch("/api/stitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: clipA.name,
          b: clipB.name,
          rotateA: rotA,
          rotateB: rotB,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server stitch failed");
      setOutputUrl(data.url);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server stitch failed");
      setStage("idle");
    }
  }

  const busy = stage === "stitching" || stage === "loading-core" || stage === "server-stitching";
  const canStitch = !!clipA && !!clipB && !busy;
  const canServerStitch =
    !!clipA && !!clipB && clipA.kind === "remote" && clipB.kind === "remote" && !busy;
  const oversizeWarning =
    (clipA && clipA.size > WASM_SIZE_WARN) || (clipB && clipB.size > WASM_SIZE_WARN);

  return (
    <section className={css({ mt: "10" })}>
      <h2
        className={css({
          fontSize: "xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          mb: "2",
        })}
      >
        Video Stitcher
      </h2>
      <p className={css({ fontSize: "sm", color: "ink.muted", mb: "5" })}>
        Upload two clips. They&apos;ll be joined end-to-end in your browser — no upload to a server.
      </p>

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
          gap: "3",
        })}
      >
        <ClipSlot
          label="Clip A"
          clip={clipA}
          rotation={rotA}
          onRotate={() => setRotA((r) => nextRotation(r))}
          onChange={pickClip("A")}
        />
        <ClipSlot
          label="Clip B"
          clip={clipB}
          rotation={rotB}
          onRotate={() => setRotB((r) => nextRotation(r))}
          onChange={pickClip("B")}
        />
      </div>

      <div className={css({ display: "flex", gap: "2", mt: "4", flexWrap: "wrap" })}>
        <button
          onClick={swap}
          disabled={!clipA || !clipB || stage === "stitching"}
          className={secondaryBtn}
        >
          Swap order
        </button>
        <button
          onClick={stitch}
          disabled={!canStitch}
          className={primaryBtn}
        >
          {stage === "loading-core"
            ? "Loading engine..."
            : stage === "stitching"
              ? `Stitching ${Math.round(progress * 100)}%`
              : "Stitch in browser"}
        </button>
        <button
          onClick={stitchServer}
          disabled={!canServerStitch}
          className={primaryBtn}
          title={
            canServerStitch
              ? "Use local Python + system ffmpeg (fast, handles large files)"
              : "Both clips must come from public/clips"
          }
        >
          {stage === "server-stitching" ? "Stitching on server..." : "Stitch with Python"}
        </button>
      </div>

      {oversizeWarning && (
        <p
          className={css({
            mt: "3",
            fontSize: "xs",
            color: "#FFB84D",
            fontWeight: "600",
          })}
        >
          ⚠ One of your clips is larger than ~1.5 GB. The in-browser engine may run out of memory.
          Consider downscaling first, or stitching via system ffmpeg.
        </p>
      )}

      {localClips.length > 0 && (
        <div className={css({ mt: "6" })}>
          <h3
            className={css({
              fontSize: "xs",
              fontWeight: "800",
              fontFamily: "display",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "ink.muted",
              mb: "2",
            })}
          >
            From public/clips
          </h3>
          <div className={css({ display: "flex", flexDir: "column", gap: "2" })}>
            {localClips.map((c) => (
              <div
                key={c.name}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  bg: "plate.surface",
                  border: "2px solid",
                  borderColor: "plate.border",
                  rounded: "brick",
                  px: "4",
                  py: "3",
                })}
              >
                <div className={css({ flex: 1, minW: 0 })}>
                  <p
                    className={css({
                      fontSize: "sm",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "ink.primary",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {c.name}
                  </p>
                  <span className={css({ fontSize: "xs", color: "ink.faint" })}>
                    {formatBytes(c.size)}
                  </span>
                </div>
                <button
                  onClick={() => loadLocalClip("A", c)}
                  className={secondaryBtn}
                >
                  → A
                </button>
                <button
                  onClick={() => loadLocalClip("B", c)}
                  className={secondaryBtn}
                >
                  → B
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {busy && (
        <div className={css({ mt: "4" })}>
          <div
            className={css({
              h: "2",
              bg: "plate.surface",
              rounded: "full",
              border: "1.5px solid",
              borderColor: "plate.border",
              overflow: "hidden",
            })}
          >
            <div
              style={{
                width: stage === "stitching" ? `${Math.round(progress * 100)}%` : "100%",
              }}
              className={css({
                h: "full",
                bg: "lego.red",
                transition: "width 0.2s ease",
                animation:
                  stage === "loading-core" || stage === "server-stitching"
                    ? "pulse 1.2s infinite"
                    : undefined,
              })}
            />
          </div>
          {log && (
            <p
              className={css({
                mt: "2",
                fontSize: "xs",
                color: "ink.faint",
                fontFamily: "mono",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              })}
            >
              {log}
            </p>
          )}
        </div>
      )}

      {error && (
        <p
          className={css({
            mt: "3",
            fontSize: "sm",
            fontWeight: "500",
            color: "#FF6B6B",
          })}
        >
          {error}
        </p>
      )}

      {outputUrl && stage === "done" && (
        <div
          className={css({
            mt: "6",
            bg: "plate.surface",
            border: "2px solid",
            borderColor: "plate.border",
            rounded: "brick",
            p: "3",
            boxShadow: "brick",
          })}
        >
          <video
            src={outputUrl}
            controls
            className={css({
              w: "full",
              rounded: "lg",
              aspectRatio: "16/9",
              bg: "black",
            })}
          />
          <a
            href={outputUrl}
            download="stitched.mp4"
            className={css({
              mt: "3",
              display: "inline-block",
              rounded: "lg",
              bg: "lego.red",
              px: "5",
              py: "2",
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "white",
              textDecoration: "none",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
              _hover: { bg: "#FF1A1A", transform: "translateY(-1px)" },
              transition: "all 0.15s ease",
            })}
          >
            Download stitched.mp4
          </a>
        </div>
      )}
    </section>
  );
}

function nextRotation(r: Rotation): Rotation {
  return (((r + 90) % 360) as Rotation);
}

function ClipSlot({
  label,
  clip,
  rotation,
  onRotate,
  onChange,
}: {
  label: string;
  clip: Clip | null;
  rotation: Rotation;
  onRotate: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={css({
        display: "block",
        bg: "plate.surface",
        border: "2px solid",
        borderColor: "plate.border",
        rounded: "brick",
        p: "3",
        cursor: "pointer",
        transition: "all 0.15s ease",
        _hover: { borderColor: "plate.borderHover", boxShadow: "brick" },
      })}
    >
      <div
        className={css({
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: "2",
          gap: "2",
        })}
      >
        <span
          className={css({
            fontSize: "xs",
            fontWeight: "800",
            fontFamily: "display",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "ink.muted",
          })}
        >
          {label}
        </span>
        <div className={css({ display: "flex", alignItems: "center", gap: "2", minW: 0 })}>
          <span
            className={css({
              fontSize: "xs",
              color: "ink.faint",
              minW: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            })}
          >
            {clip ? `${truncate(clip.name, 20)} · ${formatBytes(clip.size)}` : "Choose file"}
          </span>
          {clip && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRotate();
              }}
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                bg: rotation === 0 ? "transparent" : "lego.red",
                color: rotation === 0 ? "ink.secondary" : "white",
                border: "1.5px solid",
                borderColor: rotation === 0 ? "plate.border" : "lego.red",
                rounded: "brick",
                px: "2",
                py: "0.5",
                cursor: "pointer",
                flexShrink: 0,
              })}
            >
              ↻ {rotation}°
            </button>
          )}
        </div>
      </div>
      {clip ? (
        <video
          src={clip.previewUrl}
          controls
          preload="metadata"
          style={{ transform: `rotate(${rotation}deg)` }}
          className={css({
            w: "full",
            aspectRatio: "16/9",
            rounded: "lg",
            bg: "black",
            transition: "transform 0.2s ease",
          })}
        />
      ) : (
        <div
          className={css({
            w: "full",
            aspectRatio: "16/9",
            rounded: "lg",
            border: "2px dashed",
            borderColor: "plate.border",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "sm",
            color: "ink.faint",
          })}
        >
          Drop or pick a video
        </div>
      )}
      <input
        type="file"
        accept="video/*"
        onChange={onChange}
        className={css({ display: "none" })}
      />
    </label>
  );
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0 || i === name.length - 1) return "mp4";
  return name.slice(i + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

const primaryBtn = css({
  rounded: "lg",
  bg: "lego.red",
  px: "5",
  py: "2",
  fontSize: "sm",
  fontWeight: "800",
  fontFamily: "display",
  color: "white",
  border: "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
  _hover: { bg: "#FF1A1A", transform: "translateY(-1px)" },
  _disabled: { opacity: 0.5, cursor: "not-allowed", transform: "none" },
});

const secondaryBtn = css({
  rounded: "brick",
  bg: "transparent",
  border: "1.5px solid",
  borderColor: "plate.border",
  px: "4",
  py: "2",
  fontSize: "sm",
  fontWeight: "700",
  fontFamily: "display",
  color: "ink.primary",
  cursor: "pointer",
  transition: "all 0.15s ease",
  _hover: { borderColor: "plate.borderHover", bg: "plate.surface" },
  _disabled: { opacity: 0.4, cursor: "not-allowed" },
});
