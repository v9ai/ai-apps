#!/usr/bin/env python3
"""
Stitch two videos end-to-end using ffmpeg, with optional per-clip rotation.

Strategy:
  - No rotation + matching codecs: stream-copy concat (zero re-encode).
  - Any rotation: re-encode with concat filter, applying the rotation to
    the corresponding input before concatenation.
  - Audio falls back to video-only if audio streams don't align.

Usage:
  python stitch_videos.py --a A.mp4 --b B.mp4 --out out.mp4
  python stitch_videos.py --a A.mp4 --b B.mp4 --out out.mp4 --rotate-a 180
"""

from __future__ import annotations

import argparse
import os
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path


ROTATIONS = {0, 90, 180, 270}


def run_ffmpeg(args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
        capture_output=True,
        text=True,
    )
    return proc.returncode, proc.stderr


def rotation_filter(deg: int) -> str | None:
    if deg == 0:
        return None
    if deg == 90:
        return "transpose=1"  # 90° clockwise
    if deg == 180:
        return "hflip,vflip"
    if deg == 270:
        return "transpose=2"  # 90° counter-clockwise
    raise ValueError(f"Unsupported rotation: {deg}")


def stitch(a: Path, b: Path, out: Path, rot_a: int, rot_b: int) -> None:
    for p in (a, b):
        if not p.is_file():
            raise FileNotFoundError(p)
    if rot_a not in ROTATIONS or rot_b not in ROTATIONS:
        raise ValueError("Rotation must be one of 0, 90, 180, 270")

    out.parent.mkdir(parents=True, exist_ok=True)

    # Fast path: no rotation → stream-copy concat demuxer.
    if rot_a == 0 and rot_b == 0:
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
            list_path = Path(f.name)
            f.write(f"file {shlex.quote(str(a.resolve()))}\n")
            f.write(f"file {shlex.quote(str(b.resolve()))}\n")
        try:
            code, err = run_ffmpeg([
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_path),
                "-c", "copy",
                str(out),
            ])
            if code == 0:
                print(f"[stitch] stream-copy concat → {out}")
                return
            print(f"[stitch] stream-copy failed, falling back to re-encode:\n{err}", file=sys.stderr)
        finally:
            try:
                list_path.unlink()
            except OSError:
                pass

    # Re-encode path (required for rotation or codec mismatch).
    fa = rotation_filter(rot_a)
    fb = rotation_filter(rot_b)
    v0 = f"[0:v]{fa}[v0]" if fa else None
    v1 = f"[1:v]{fb}[v1]" if fb else None
    va_ref = "[v0]" if fa else "[0:v:0]"
    vb_ref = "[v1]" if fb else "[1:v:0]"

    # Attempt with audio first.
    pre = ";".join(f for f in (v0, v1) if f)
    concat_av = f"{va_ref}[0:a:0]{vb_ref}[1:a:0]concat=n=2:v=1:a=1[v][a]"
    fc_av = f"{pre};{concat_av}" if pre else concat_av

    code, err = run_ffmpeg([
        "-i", str(a),
        "-i", str(b),
        "-filter_complex", fc_av,
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        str(out),
    ])
    if code == 0:
        print(f"[stitch] re-encode concat (rotate a={rot_a} b={rot_b}) → {out}")
        return

    print(f"[stitch] audio concat failed, retrying video-only:\n{err}", file=sys.stderr)

    concat_v = f"{va_ref}{vb_ref}concat=n=2:v=1:a=0[v]"
    fc_v = f"{pre};{concat_v}" if pre else concat_v

    code, err = run_ffmpeg([
        "-i", str(a),
        "-i", str(b),
        "-filter_complex", fc_v,
        "-map", "[v]",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        str(out),
    ])
    if code == 0:
        print(f"[stitch] video-only re-encode (rotate a={rot_a} b={rot_b}) → {out}")
        return

    raise RuntimeError(f"all ffmpeg attempts failed; last stderr:\n{err}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Stitch two videos end-to-end.")
    parser.add_argument("--a", required=True)
    parser.add_argument("--b", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--rotate-a", type=int, default=0, choices=sorted(ROTATIONS))
    parser.add_argument("--rotate-b", type=int, default=0, choices=sorted(ROTATIONS))
    args = parser.parse_args()

    stitch(Path(args.a), Path(args.b), Path(args.out), args.rotate_a, args.rotate_b)
    size = os.path.getsize(args.out)
    print(f"[stitch] done: {size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
