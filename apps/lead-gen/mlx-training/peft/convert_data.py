"""Convert the MLX outreach-email dataset to Mistral-tokenizer-ready JSONL.

The source file `../data/outreach-email/resend.jsonl` holds examples in the
OpenAI chat format: `{"messages": [{role, content}, ...]}` where the
assistant message includes Qwen3's `<think>...</think>` preamble.

This script:
  1. Strips `<think>...</think>` from assistant messages so Mistral learns to
     emit JSON directly with no reasoning prefix.
  2. Splits 90/10 into train / valid with a deterministic shuffle.
  3. Applies Mistral-v0.2's chat template via `tokenizer.apply_chat_template`
     to produce a single `text` field per row, ready for `mlx_lm.lora`.

Output filenames (`train.jsonl` / `valid.jsonl`) match what `mlx_lm.lora`
expects when `--data <dir>` is passed.

Run once before training:
    python convert_data.py --out ../data/outreach-email-mistral
Emits:
    <out>/train.jsonl
    <out>/valid.jsonl
"""

from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path

THINK_RE = re.compile(r"<think>.*?</think>\s*", flags=re.DOTALL)


def strip_think(content: str) -> str:
    return THINK_RE.sub("", content).strip()


def load_rows(src: Path) -> list[dict]:
    rows: list[dict] = []
    with src.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            msgs = obj.get("messages") or []
            # Strip reasoning preambles from assistant turns so Mistral learns
            # the clean JSON-only target.
            cleaned = []
            for m in msgs:
                if m.get("role") == "assistant":
                    cleaned.append({"role": "assistant", "content": strip_think(m["content"])})
                else:
                    cleaned.append({"role": m["role"], "content": m["content"]})
            rows.append({"messages": cleaned})
    return rows


def render_mistral(rows: list[dict], tokenizer) -> list[dict]:
    # Mistral-v0.2 does not have a "system" role in its chat template; merge
    # the system message into the first user turn, which is the convention
    # used in the official mistral-inference reference.
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


def split(rows: list[dict], seed: int, valid_frac: float) -> tuple[list[dict], list[dict]]:
    rng = random.Random(seed)
    shuffled = rows[:]
    rng.shuffle(shuffled)
    n_valid = max(1, int(len(shuffled) * valid_frac))
    return shuffled[n_valid:], shuffled[:n_valid]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", type=Path, default=Path(__file__).parent.parent / "data" / "outreach-email" / "resend.jsonl")
    parser.add_argument("--out", type=Path, default=Path(__file__).parent.parent / "data" / "outreach-email-mistral")
    parser.add_argument("--base-model", default="mistralai/Mistral-7B-Instruct-v0.2")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--valid-frac", type=float, default=0.1)
    args = parser.parse_args()

    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)

    rows = load_rows(args.src)
    rendered = render_mistral(rows, tokenizer)
    train, valid = split(rendered, args.seed, args.valid_frac)

    args.out.mkdir(parents=True, exist_ok=True)
    for name, split_rows in (("train.jsonl", train), ("valid.jsonl", valid)):
        path = args.out / name
        with path.open("w") as f:
            for row in split_rows:
                f.write(json.dumps(row, ensure_ascii=False))
                f.write("\n")
        print(f"wrote {len(split_rows)} rows to {path}")


if __name__ == "__main__":
    main()
