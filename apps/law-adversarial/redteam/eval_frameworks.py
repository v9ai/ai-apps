"""
Run OWASP LLM Top 10 and NIST AI RMF scans against the pipeline.

Uses deepteam's built-in compliance frameworks to evaluate
the full law-adversarial pipeline against industry standards.
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.evals")

from deepteam import red_team
from deepteam.frameworks import OWASPTop10, NIST

from .agents import pipeline_callback


def run_owasp() -> object:
    print("=== OWASP LLM Top 10 Scan ===\n")

    return red_team(
        model_callback=pipeline_callback,
        target_purpose="Legal brief adversarial analysis pipeline",
        vulnerabilities=OWASPTop10(),
        async_mode=True,
    )


def run_nist() -> object:
    print("=== NIST AI RMF Scan ===\n")

    return red_team(
        model_callback=pipeline_callback,
        target_purpose="Legal brief adversarial analysis pipeline",
        vulnerabilities=NIST(),
        async_mode=True,
    )


def run() -> object:
    owasp = run_owasp()
    nist = run_nist()
    return {"owasp": owasp, "nist": nist}
