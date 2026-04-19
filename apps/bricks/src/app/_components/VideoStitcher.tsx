"use client";

import { useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

type Clip = {
  file: File;
  url: string;
};

type Stage = "idle" | "loading-core" | "stitching" | "done";

const CORE_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

export function VideoStitcher() {
  const [clipA, setClipA] = useState<Clip | null>(null);
  const [clipB, setClipB] = useState<Clip | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    return () => {
      if (clipA) URL.revokeObjectURL(clipA.url);
      if (clipB) URL.revokeObjectURL(clipB.url);
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

  function pickClip(slot: "A" | "B") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const next = { file, url };
      if (slot === "A") {
        if (clipA) URL.revokeObjectURL(clipA.url);
        setClipA(next);
      } else {
        if (clipB) URL.revokeObjectURL(clipB.url);
        setClipB(next);
      }
      setOutputUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setStage("idle");
      setError(null);
    };
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
      const nameA = `a.${extOf(clipA.file.name)}`;
      const nameB = `b.${extOf(clipB.file.name)}`;

      await ff.writeFile(nameA, await fetchFile(clipA.file));
      await ff.writeFile(nameB, await fetchFile(clipB.file));

      // Attempt 1: fast concat demuxer with stream copy.
      // Works only when both inputs share codec, resolution, fps, and timebase.
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
        // Attempt 2: re-encode with concat filter. Assumes both have audio.
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
        // Attempt 3: re-encode, video only (in case a clip has no audio).
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

  const canStitch = !!clipA && !!clipB && stage !== "stitching" && stage !== "loading-core";

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
        <ClipSlot label="Clip A" clip={clipA} onChange={pickClip("A")} />
        <ClipSlot label="Clip B" clip={clipB} onChange={pickClip("B")} />
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
              : "Stitch videos"}
        </button>
      </div>

      {(stage === "loading-core" || stage === "stitching") && (
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
                animation: stage === "loading-core" ? "pulse 1.2s infinite" : undefined,
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

function ClipSlot({
  label,
  clip,
  onChange,
}: {
  label: string;
  clip: Clip | null;
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
        <span className={css({ fontSize: "xs", color: "ink.faint" })}>
          {clip ? truncate(clip.file.name, 28) : "Choose file"}
        </span>
      </div>
      {clip ? (
        <video
          src={clip.url}
          controls
          className={css({
            w: "full",
            aspectRatio: "16/9",
            rounded: "lg",
            bg: "black",
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
