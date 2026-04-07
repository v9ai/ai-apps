"""salescue/publish.py — Publish modules to HuggingFace Hub.

Usage:
    # Publish a single module
    python3 -m salescue.publish spam

    # Publish multiple modules
    python3 -m salescue.publish spam score intent

    # Publish all compatible modules
    python3 -m salescue.publish --all

    # Dry run (save locally, don't push)
    python3 -m salescue.publish spam --dry-run

    # Publish under a different org
    python3 -m salescue.publish spam --org vadimnicolai
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile

# Modules that work with the standard predict(text) flow
# icp accepts JSON: {"icp": "...", "prospect": "..."}
# subject accepts JSON array: ["Subject A", "Subject B"]
PUBLISHABLE_MODULES = [
    "spam", "score", "intent", "reply", "triggers",
    "objection", "sentiment", "entities", "call",
    "icp", "subject",
]

# Modules that require special input (not standard text prediction)
SKIPPED_MODULES = {
    "emailgen": "uses Qwen backbone (separate from DeBERTa)",
}

DEFAULT_ORG = "v9ai"


def _test_input(module_name: str) -> str:
    """Return an appropriate test input for verification of the given module."""
    if module_name == "icp":
        return json.dumps({"icp": "Mid-market B2B SaaS", "prospect": "300-person fintech"})
    if module_name == "subject":
        return json.dumps(["Quick question about Q3", "URGENT: Limited time offer!!!"])
    return "test input for verification"


def publish_module(
    module_name: str,
    org: str = DEFAULT_ORG,
    dry_run: bool = False,
    trained: bool = False,
) -> str | None:
    """Publish a single module to HF Hub.

    Returns the HF URL on success, None on dry run.
    """
    from .config import ALL_CONFIGS
    from .hub import SalesCueModel
    from .modules import MODULE_CLASSES

    if module_name not in MODULE_CLASSES:
        print(f"  ERROR: Unknown module '{module_name}'")
        return None

    if module_name in SKIPPED_MODULES:
        print(f"  SKIP: {module_name} — {SKIPPED_MODULES[module_name]}")
        return None

    config = ALL_CONFIGS.get(module_name)
    if config is None:
        print(f"  ERROR: No config for '{module_name}'")
        return None

    # Instantiate module with random init
    module_cls = MODULE_CLASSES[module_name]
    module = module_cls(hidden=config.hidden_size)
    model = SalesCueModel(module, config)

    repo_id = f"{org}/salescue-{module_name}-v{config.version}"

    if dry_run:
        out_dir = os.path.join(tempfile.gettempdir(), f"salescue-{module_name}")
        model.save_pretrained(out_dir, trained=trained)
        print(f"  DRY RUN: saved to {out_dir}")

        # Verify round-trip
        loaded = SalesCueModel.from_pretrained(out_dir)
        test_input = _test_input(module_name)
        result = loaded.predict(test_input)
        print(f"  VERIFY: round-trip OK — {list(result.keys())}")
        return None

    print(f"  Publishing {repo_id}...")
    url = model.push_to_hub(repo_id, trained=trained)
    print(f"  OK: {url}")

    # Verify from Hub
    try:
        loaded = SalesCueModel.from_pretrained(repo_id)
        result = loaded.predict(_test_input(module_name))
        print(f"  VERIFY: Hub round-trip OK")
    except Exception as e:
        print(f"  WARN: Hub verification failed: {e}")

    return url


def main():
    parser = argparse.ArgumentParser(description="Publish SalesCue modules to HF Hub")
    parser.add_argument("modules", nargs="*", help="Module names to publish")
    parser.add_argument("--all", action="store_true", help="Publish all compatible modules")
    parser.add_argument("--dry-run", action="store_true", help="Save locally, don't push")
    parser.add_argument("--org", default=DEFAULT_ORG, help=f"HF org (default: {DEFAULT_ORG})")
    parser.add_argument("--trained", action="store_true", help="Mark as trained (vs untrained)")
    args = parser.parse_args()

    if args.all:
        modules = PUBLISHABLE_MODULES
    elif args.modules:
        modules = args.modules
    else:
        parser.print_help()
        print(f"\nPublishable modules: {', '.join(PUBLISHABLE_MODULES)}")
        print(f"Skipped modules: {', '.join(f'{k} ({v})' for k, v in SKIPPED_MODULES.items())}")
        sys.exit(1)

    print(f"Publishing {len(modules)} module(s) to {args.org}/")
    print()

    results = {}
    for name in modules:
        print(f"[{name}]")
        url = publish_module(name, org=args.org, dry_run=args.dry_run, trained=args.trained)
        results[name] = url
        print()

    # Summary
    published = {k: v for k, v in results.items() if v}
    skipped = {k: v for k, v in results.items() if v is None}

    if published:
        print("Published:")
        for name, url in published.items():
            print(f"  {name}: {url}")

    if skipped and not args.dry_run:
        print(f"Skipped: {', '.join(skipped.keys())}")


if __name__ == "__main__":
    main()
