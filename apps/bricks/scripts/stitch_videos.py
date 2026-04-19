#!/usr/bin/env python3
"""
Stitch two videos end-to-end using ffmpeg.

Strategy:
  1. Fast path — concat demuxer with `-c copy`. Zero re-encode. Requires
     both inputs to share codec, resolution, fps, and timebase. For clips
     from the same camera this always works.
  2. Fallback — concat filter with libx264 + aac re-encode. Handles any
     pair of inputs, slower.

Usage:
  python stitch_videos.py --a path/to/a.mp4 --b path/to/b.mp4 --out out.mp4
"""

from __future__ import annotations

import argparse
import os
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path


def run_ffmpeg(args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args],
        capture_output=True,
        text=True,
    )
    return proc.returncode, proc.stderr


def stitch(a: Path, b: Path, out: Path) -> None:
    for p in (a, b):
        if not p.is_file():
            raise FileNotFoundError(p)

    out.parent.mkdir(parents=True, exist_ok=True)

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

        print(f"[stitch] stream-copy failed, re-encoding. stderr:\n{err}", file=sys.stderr)

        code, err = run_ffmpeg([
            "-i", str(a),
            "-i", str(b),
            "-filter_complex",
            "[0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[v][a]",
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
            print(f"[stitch] re-encode concat → {out}")
            return

        print(f"[stitch] re-encode with audio failed:\n{err}", file=sys.stderr)

        code, err = run_ffmpeg([
            "-i", str(a),
            "-i", str(b),
            "-filter_complex",
            "[0:v:0][1:v:0]concat=n=2:v=1:a=0[v]",
            "-map", "[v]",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            str(out),
        ])
        if code == 0:
            print(f"[stitch] video-only re-encode → {out}")
            return

        raise RuntimeError(f"all ffmpeg attempts failed; last stderr:\n{err}")

    finally:
        try:
            list_path.unlink()
        except OSError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Stitch two videos end-to-end.")
    parser.add_argument("--a", required=True, help="First clip")
    parser.add_argument("--b", required=True, help="Second clip")
    parser.add_argument("--out", required=True, help="Output path")
    args = parser.parse_args()

    stitch(Path(args.a), Path(args.b), Path(args.out))
    size = os.path.getsize(args.out)
    print(f"[stitch] done: {size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
