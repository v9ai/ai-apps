#!/usr/bin/env python3
"""Upload each agent-bundles/<slug>/ tree to HuggingFace as its own model repo.

One repo per agent — Unix philosophy: one role, one system prompt, one tool
allow-list, composable via `huggingface_hub.snapshot_download()`.

Target naming:
  v9ai/qwen-hoa-<slug>       for research_pipeline + regen debate agents
  v9ai/qwen-course-<slug>    for course-review expert personas

Auth: reads HF token from `huggingface_hub` cache (already set via `hf auth login`).

Usage:
  python scripts/upload_agents.py                 # upload all
  python scripts/upload_agents.py --dry-run       # print what would upload
  python scripts/upload_agents.py --only bio hf-data  # subset
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BUNDLES_DIR = REPO / "agent-bundles"

HF_ORG = "v9ai"
HOA_PREFIX = "qwen-hoa-"
COURSE_PREFIX = "qwen-course-"


def detect_family(bundle_dir: Path) -> str:
    """`course` if README says extracted from course-review, else `hoa`."""
    readme = bundle_dir / "README.md"
    if readme.exists() and "Extracted from `crates/course-review" in readme.read_text():
        return "course"
    return "hoa"


def repo_id(slug: str, family: str) -> str:
    prefix = COURSE_PREFIX if family == "course" else HOA_PREFIX
    return f"{HF_ORG}/{prefix}{slug}"


def iter_bundles(only: list[str] | None = None):
    for d in sorted(BUNDLES_DIR.iterdir()):
        if not (d.is_dir() and (d / "system_prompt.txt").is_file()):
            continue
        if only and d.name not in only:
            continue
        yield d


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", nargs="*", help="upload only these slugs")
    ap.add_argument("--private", action="store_true", help="create as private repo")
    args = ap.parse_args()

    bundles = list(iter_bundles(args.only))
    if not bundles:
        print("No bundles found.", file=sys.stderr)
        return 1

    print(f"Found {len(bundles)} bundle(s) under {BUNDLES_DIR}")

    if args.dry_run:
        for d in bundles:
            family = detect_family(d)
            print(f"  [dry-run] {d.name:30s} -> {repo_id(d.name, family)}")
        return 0

    from huggingface_hub import HfApi
    from huggingface_hub.utils import HfHubHTTPError

    api = HfApi()

    failures: list[tuple[str, str]] = []
    for d in bundles:
        family = detect_family(d)
        rid = repo_id(d.name, family)
        print(f"  uploading {d.name:30s} -> {rid} ...", end=" ", flush=True)
        try:
            api.create_repo(
                rid,
                repo_type="model",
                private=args.private,
                exist_ok=True,
            )
            api.upload_folder(
                folder_path=str(d),
                repo_id=rid,
                repo_type="model",
                commit_message=f"Sync {d.name} bundle",
            )
            print(f"OK  https://huggingface.co/{rid}")
        except HfHubHTTPError as e:
            print(f"FAIL ({e})")
            failures.append((rid, str(e)))
        except Exception as e:
            print(f"FAIL ({type(e).__name__}: {e})")
            failures.append((rid, str(e)))

    if failures:
        print(f"\n{len(failures)} upload(s) failed:", file=sys.stderr)
        for rid, err in failures:
            print(f"  {rid}: {err}", file=sys.stderr)
        return 2

    print(f"\nAll {len(bundles)} bundles uploaded to {HF_ORG}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
