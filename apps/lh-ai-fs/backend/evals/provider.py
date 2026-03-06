#!/usr/bin/env python3
"""Promptfoo Python provider for BS Detector.

Uses file-based caching so the pipeline runs once across all promptfoo workers.
Each worker reads the cached report from disk.
"""
import asyncio
import fcntl
import json
import os
import sys
import logging
import time
from typing import Optional

_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_DIR)
sys.path.insert(0, _BACKEND_DIR)
os.chdir(_BACKEND_DIR)

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.WARNING, stream=sys.stderr)

from evals.test_cases import CLEAN_DOCUMENTS

_CACHE_FILE = os.path.join(_DIR, ".report_cache.json")
_LOCK_FILE = os.path.join(_DIR, ".report_cache.lock")
_CACHE_TTL = 3600  # 1 hour — run_evals.py warms cache before promptfoo

_log = logging.getLogger("provider")


def _run_pipeline(documents: Optional[dict] = None) -> dict:
    _log.warning("Running pipeline (cache miss)")
    async def _inner():
        from agents.orchestrator import PipelineOrchestrator
        orch = PipelineOrchestrator()
        if documents:
            return await orch.analyze(documents=documents, case_id="clean_test")
        return await orch.analyze()
    return asyncio.run(_inner())


def _get_report(cache_key: str = "default", documents: Optional[dict] = None) -> dict:
    """Get report, using file cache to share across promptfoo workers."""
    cache_file = _CACHE_FILE if cache_key == "default" else f"{_CACHE_FILE}.{cache_key}"
    lock_file = _LOCK_FILE if cache_key == "default" else f"{_LOCK_FILE}.{cache_key}"

    # Check if fresh cache exists
    if os.path.exists(cache_file):
        age = time.time() - os.path.getmtime(cache_file)
        if age < _CACHE_TTL:
            _log.warning(f"Cache hit: {cache_file} (age={age:.0f}s)")
            with open(cache_file) as f:
                return json.load(f)
        else:
            _log.warning(f"Cache stale: {cache_file} (age={age:.0f}s, ttl={_CACHE_TTL}s)")
    else:
        _log.warning(f"Cache miss: {cache_file} does not exist")

    # Acquire lock and run pipeline (or wait for another worker)
    lock_fd = open(lock_file, "w")
    try:
        fcntl.flock(lock_fd, fcntl.LOCK_EX)
        # Double-check after acquiring lock
        if os.path.exists(cache_file):
            age = time.time() - os.path.getmtime(cache_file)
            if age < _CACHE_TTL:
                _log.warning(f"Cache hit after lock: {cache_file}")
                with open(cache_file) as f:
                    return json.load(f)
        # Run pipeline
        report = _run_pipeline(documents=documents)
        with open(cache_file, "w") as f:
            json.dump(report, f, default=str)
        return report
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        lock_fd.close()


def call_api(prompt: str, options: dict, context: dict) -> dict:
    """Called by promptfoo for every test case."""
    vars_ = context.get("vars", {})
    mode = vars_.get("mode", "default")

    if mode == "clean":
        report = _get_report(cache_key="clean", documents=CLEAN_DOCUMENTS)
    else:
        report = _get_report()

    return {"output": {"report": report}}


if __name__ == "__main__":
    # Direct invocation for debugging
    result = call_api("", {}, {})
    json.dump(result, sys.stdout, default=str)
    print()
