"""Scoped state definitions for each agent and the orchestrator."""

from __future__ import annotations

import operator
from typing import Annotated

from typing_extensions import TypedDict

from how_it_works.models import (
    AppInfo,
    FileContent,
    HowItWorksData,
    ProcessResult,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Orchestrator (top-level graph)
# ═══════════════════════════════════════════════════════════════════════════════


class OrchestratorState(TypedDict, total=False):
    apps: list[AppInfo]
    results: Annotated[list[ProcessResult], operator.add]
    verbose: bool
    filter_app: str | None


# ═══════════════════════════════════════════════════════════════════════════════
# Scanner Agent
# ═══════════════════════════════════════════════════════════════════════════════


class ScannerState(TypedDict, total=False):
    filter_app: str | None
    discovered_apps: list[AppInfo]


# ═══════════════════════════════════════════════════════════════════════════════
# Per-App Pipeline (fan-out target for Send())
# ═══════════════════════════════════════════════════════════════════════════════


class AppProcessingState(TypedDict, total=False):
    app: AppInfo
    files: list[FileContent]
    analysis: str
    critique: str
    reflection_count: int
    data: HowItWorksData | None
    validation_errors: list[str]
    retry_count: int
    result: ProcessResult | None
    verbose: bool


# ═══════════════════════════════════════════════════════════════════════════════
# Individual Agent States (for independent testing)
# ═══════════════════════════════════════════════════════════════════════════════


class ReaderState(TypedDict, total=False):
    app: AppInfo
    files: list[FileContent]
    verbose: bool


class AnalystState(TypedDict, total=False):
    app: AppInfo
    files: list[FileContent]
    analysis: str
    critique: str
    reflection_count: int
    verbose: bool


class GeneratorState(TypedDict, total=False):
    app: AppInfo
    analysis: str
    data: HowItWorksData | None
    validation_errors: list[str]
    retry_count: int


class WriterState(TypedDict, total=False):
    app: AppInfo
    data: HowItWorksData
    result: ProcessResult | None
