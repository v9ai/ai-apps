#!/usr/bin/env python3
"""
Rotate a video by 90, 180, or 270 degrees and write a new file.

Produces a re-encoded mp4 (libx264 + aac). For 180° this is equivalent to
hflip + vflip; for 90/270 it uses transpose with aspect ratio reset.

Usage:
  python rotate_video.py --in A.mp4 --out A-rot180.mp4 --degrees 180
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


ROTATIONS = {90, 180, 270}


def vf_for(deg: int) -> str:
    if deg == 90:
        return "transpose=1"  # 90° clockwise
    if deg == 180:
        return "hflip,vflip"
    if deg == 270:
        return "transpose=2"  # 90° counter-clockwise
    raise ValueError(f"Unsupported rotation: {deg}")


def _detect_video_codec(src: Path) -> str:
    proc = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=codec_name",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(src),
        ],
        capture_output=True,
        text=True,
    )
    return proc.stdout.strip().lower() if proc.returncode == 0 else ""


def _encoder_for(codec: str) -> tuple[list[str], str]:
    """Pick a hardware encoder where possible. Returns (args, label)."""
    if codec == "hevc":
        return (
            [
                "-c:v", "hevc_videotoolbox",
                "-tag:v", "hvc1",
                "-q:v", "55",  # roughly visually-lossless at 4K
            ],
            "hevc_videotoolbox",
        )
    return (
        [
            "-c:v", "h264_videotoolbox",
            "-q:v", "55",
        ],
        "h264_videotoolbox",
    )


def rotate(src: Path, dst: Path, deg: int) -> None:
    if not src.is_file():
        raise FileNotFoundError(src)
    if deg not in ROTATIONS:
        raise ValueError("Rotation must be 90, 180, or 270")

    dst.parent.mkdir(parents=True, exist_ok=True)
    codec = _detect_video_codec(src)
    enc_args, enc_label = _encoder_for(codec)

    base = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel", "error",
        "-stats",
        "-y",
        "-i", str(src),
        "-vf", vf_for(deg),
        "-metadata:s:v:0", "rotate=0",
        *enc_args,
        # Force standard MPEG timebase so later concat-demuxer stream-copy
        # works against clips that use 1/90000 (see boundary PTS bug when
        # mixing 1/15360 output from videotoolbox with 1/90000 inputs).
        "-video_track_timescale", "90000",
        "-c:a", "copy",
        str(dst),
    ]

    print(f"[rotate] encoder={enc_label} src-codec={codec or 'unknown'}")
    proc = subprocess.run(base, capture_output=True, text=True)
    if proc.returncode != 0:
        # Retry with audio re-encode in case copy failed.
        retry = base[:-2] + ["-c:a", "aac", "-b:a", "192k", str(dst)]
        proc = subprocess.run(retry, capture_output=True, text=True)
        if proc.returncode != 0:
            # Last resort: software libx264 with audio copy.
            sw = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-stats", "-y",
                "-i", str(src),
                "-vf", vf_for(deg),
                "-metadata:s:v:0", "rotate=0",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "aac", "-b:a", "192k",
                str(dst),
            ]
            proc = subprocess.run(sw, capture_output=True, text=True)
            if proc.returncode != 0:
                raise RuntimeError(f"ffmpeg failed:\n{proc.stderr}")
    print(f"[rotate] {deg}° → {dst}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Rotate a video.")
    parser.add_argument("--in", dest="src", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--degrees", type=int, required=True, choices=sorted(ROTATIONS))
    args = parser.parse_args()
    rotate(Path(args.src), Path(args.out), args.degrees)
    size = os.path.getsize(args.out)
    print(f"[rotate] done: {size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
