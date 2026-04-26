"""Convert the opportunity-score dataset to Mistral-tokenizer-ready JSONL.

`export_opportunity_labels.py` writes
`../data/opportunity-score/{train,valid}.jsonl` in OpenAI chat format
(`{"messages": [{role, content}, ...]}`) with a stratified 90/10 split
across score buckets. We must preserve that split — re-shuffling would
collapse the score-bucket balancing.

This script renders each row through Mistral-v0.2's chat template into a
single `text` field per row, ready for `mlx_lm.lora --data <out-dir>`.

Run once before training:
    python convert_opportunity_data.py
Emits:
    ../data/opportunity-score-mistral/train.jsonl
    ../data/opportunity-score-mistral/valid.jsonl
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_rows(src: Path) -> list[dict]:
    rows: list[dict] = []
    with src.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def render_mistral(rows: list[dict], tokenizer) -> list[dict]:
    # Mistral-v0.2's chat template has no "system" role; merge system content
    # into the first user turn (the convention used in mistral-inference and
    # the sibling outreach-email converter).
    out: list[dict] = []
    for row in rows:
        msgs = row["messages"]
        system_parts = [m["content"] for m in msgs if m["role"] == "system"]
        non_system = [m for m in msgs if m["role"] != "system"]
        if system_parts and non_system and non_system[0]["role"] == "user":
            non_system[0] = {
                "role": "user",
                "content": "\n\n".join(system_parts + [non_system[0]["content"]]),
            }
        text = tokenizer.apply_chat_template(non_system, tokenize=False)
        out.append({"text": text})
    return out


def main() -> None:
    here = Path(__file__).parent
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--src-dir",
        type=Path,
        default=here.parent / "data" / "opportunity-score",
        help="Directory containing train.jsonl and valid.jsonl from export_opportunity_labels.py",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=here.parent / "data" / "opportunity-score-mistral",
    )
    parser.add_argument("--base-model", default="mistralai/Mistral-7B-Instruct-v0.2")
    args = parser.parse_args()

    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)

    args.out.mkdir(parents=True, exist_ok=True)
    for name in ("train.jsonl", "valid.jsonl"):
        src = args.src_dir / name
        if not src.exists():
            raise SystemExit(
                f"missing {src} — run `python3 mlx-training/export_opportunity_labels.py` first"
            )
        rows = load_rows(src)
        rendered = render_mistral(rows, tokenizer)
        dst = args.out / name
        with dst.open("w") as f:
            for row in rendered:
                f.write(json.dumps(row, ensure_ascii=False))
                f.write("\n")
        print(f"wrote {len(rendered)} rows to {dst}")


if __name__ == "__main__":
    main()
