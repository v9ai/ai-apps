"""Shared Pydantic contracts for RemoteGraph boundaries.

Every RemoteGraph call from ``leadgen-core`` into ``leadgen-ml`` or
``leadgen-research`` crosses a real HTTP boundary. Each leaf graph on the
ml/research side validates its initial state against the matching ``*Input``
model and its final state against ``*Output`` before returning. The core
side does the same through ``validate_remote_call``.

Cross-cutting rule: never put ``interrupt()`` inside a graph reachable via
``RemoteGraph``. The core hub owns all human-in-the-loop gates; ml and
research graphs run to completion.

──────────────────────────────────────────────────────────────────────────────
SCHEMA_VERSION bump policy
──────────────────────────────────────────────────────────────────────────────

Format: ``YYYY-MM-DD.N`` (UTC date + same-day counter).

CF Workers + Containers deploys are *not* atomic — there is always a window
where the core container is on version ``X`` and ml/research is on ``X+1``
(or vice versa). The bump policy below decides what that window looks like.

* **MAJOR (date change, e.g. 2026-04-24 → 2026-04-25):**
  Wire-incompatible — a removed field, a renamed field, a stricter type, or
  a removed enum variant. Both sides MUST redeploy in lock-step. The mismatch
  is caught at the first call by ``validate_remote_call`` (raises
  :class:`ContractsVersionMismatch`) — no silent corruption.

* **MINOR (suffix bump, e.g. 2026-04-24.1 → 2026-04-24.2):**
  Wire-compatible additive change — a *new optional output field with a
  default*, a new enum variant on an *input* (producer is permissive). Older
  consumers ignore extra output fields (we set ``extra="ignore"`` on every
  ``*Output``); the producer is the only side that needs the bump.

* **NO BUMP:**
  Doc/comment changes, internal refactors that do not change ``model_dump()``
  output, test-only changes.

Forward-compat guarantees enforced by this module:

1. Every ``*Input`` uses ``extra="forbid"``: a stale producer (older CF
   Worker) cannot accept a request from a newer consumer with extra fields.
   This is the *desired* failure mode — better to 422 than silently drop.
2. Every ``*Output`` uses ``extra="ignore"``: a newer producer rolling out
   ahead of consumers can add fields without breaking the older callers.
3. ``schema_version`` is pattern-validated (``YYYY-MM-DD.N``) at parse time,
   so junk values fail with ``ValidationError`` *before*
   ``validate_remote_call`` ever runs the manual equality check.

The wire carries ``schema_version`` in the response payload only. There is
*no* duplicate header — the payload is the single source of truth, so
header/body split-brain is impossible.
"""

from __future__ import annotations

from typing import Any, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, ValidationError

SCHEMA_VERSION = "2026-04-24.1"

# Pattern for the ``schema_version`` field on every ``*Output`` model. Must
# match the format documented above; enforced by ``Field(pattern=...)`` so a
# malformed version string fails at ``model_validate`` rather than slipping
# through to the manual equality check in ``validate_remote_call``.
_SCHEMA_VERSION_RE = r"^\d{4}-\d{2}-\d{2}\.\d+$"


# ─── Shared model_config presets ──────────────────────────────────────────
#
# ``_INPUT_CONFIG`` is strict (``extra="forbid"``): a stale producer must
# reject a request with unknown fields rather than silently dropping them.
# ``_OUTPUT_CONFIG`` is permissive (``extra="ignore"``): a newer producer can
# add fields ahead of a consumer rollout without breaking the older caller.

_INPUT_CONFIG = ConfigDict(extra="forbid")
_OUTPUT_CONFIG = ConfigDict(extra="ignore")


class ContractsVersionMismatch(RuntimeError):
    """Raised when a remote side returns a schema_version the caller does not recognize."""


# ─── ML: jobbert_ner ───────────────────────────────────────────────────────


class JobbertNerInput(BaseModel):
    model_config = _INPUT_CONFIG

    text: str = Field(min_length=1, max_length=4000)
    max_len: int = Field(default=64, ge=8, le=256)


class JobbertNerSpan(BaseModel):
    model_config = _OUTPUT_CONFIG

    span: str
    label: Literal["SKILL"]
    score: float = Field(ge=0.0, le=1.0)
    start: int = Field(ge=0)
    end: int = Field(ge=0)


class JobbertNerOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    spans: list[JobbertNerSpan] = Field(default_factory=list)


# ─── ML: bge_m3_embed ──────────────────────────────────────────────────────


class BgeM3EmbedInput(BaseModel):
    model_config = _INPUT_CONFIG

    texts: list[str] = Field(min_length=1, max_length=128)


class BgeM3EmbedOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    vectors: list[list[float]]
    dim: Literal[1024] = 1024
    model: Literal["BAAI/bge-m3"] = "BAAI/bge-m3"


# ─── Research: research_agent ──────────────────────────────────────────────


ResearchMode = Literal[
    "research",
    "remote_job_search",
    "lead_gen_prompt_1",
    "lead_gen_prompt_2",
    "lead_gen_prompt_3",
    "lead_gen_prompt_4",
    "lead_gen_prompt_5",
    "lead_gen_prompt_6",
    "lead_gen_prompt_7",
    "lead_gen_prompt_8",
    "lead_gen_prompt_9",
    "lead_gen_prompt_all",
]


class ResearchAgentInput(BaseModel):
    model_config = _INPUT_CONFIG

    mode: ResearchMode
    query: str = Field(min_length=1, max_length=4000)
    context: dict[str, Any] = Field(default_factory=dict)


class ResearchAgentOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    report: str
    citations: list[str] = Field(default_factory=list)


# ─── Research: scholar ─────────────────────────────────────────────────────


ScholarCommand = Literal[
    "migrate", "import_arxiv", "coauthors", "authors", "papers", "seed"
]


class ScholarInput(BaseModel):
    model_config = _INPUT_CONFIG

    command: ScholarCommand
    arxiv_id: str | None = None
    author_id: int | None = None


class ScholarOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    ok: bool = True
    message: str = ""
    # Shape varies by command; keep permissive
    payload: dict[str, Any] = Field(default_factory=dict)


# ─── Research: lead_papers ─────────────────────────────────────────────────


LeadPapersCommand = Literal["migrate", "match", "run", "promote", "dossier"]


class LeadPapersInput(BaseModel):
    model_config = _INPUT_CONFIG

    command: LeadPapersCommand
    contact_id: int | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)


class LeadPapersOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    ok: bool = True
    matched: int = 0
    promoted: int = 0
    dossier: dict[str, Any] | None = None


# ─── Research: common_crawl ────────────────────────────────────────────────


CommonCrawlCommand = Literal["seed", "fetch", "backfill"]


class CommonCrawlInput(BaseModel):
    model_config = _INPUT_CONFIG

    command: CommonCrawlCommand
    domain: str | None = None
    domains: list[str] | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)
    crawl: str | None = None


class CommonCrawlStats(BaseModel):
    model_config = _OUTPUT_CONFIG

    cdx_records: int = 0
    pages_fetched: int = 0
    pages_skipped_dedup: int = 0
    persons_found: int = 0
    emails_found: int = 0
    contacts_upserted: int = 0
    snapshots_written: int = 0


class CommonCrawlOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    ok: bool = True
    stats: CommonCrawlStats = Field(default_factory=CommonCrawlStats)


# ─── Research: agentic_search ──────────────────────────────────────────────


AgenticSearchMode = Literal["search", "discover"]


class AgenticSearchInput(BaseModel):
    model_config = _INPUT_CONFIG

    mode: AgenticSearchMode
    query: str | None = None
    root: str | None = None


class AgenticSearchCitation(BaseModel):
    model_config = _OUTPUT_CONFIG

    path: str
    line_range: tuple[int, int] | None = None
    snippet: str | None = None


class AgenticSearchOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    answer: str | None = None
    citations: list[AgenticSearchCitation] = Field(default_factory=list)
    discovery: dict[str, Any] | None = None


# ─── Research: gh_patterns ─────────────────────────────────────────────────


GhPatternsCommand = Literal[
    "scan_orgs",
    "match_paper_authors",
    "scrape_contributors",
    "export_contributors",
    "search_candidates",
]


class GhPatternsInput(BaseModel):
    model_config = _INPUT_CONFIG

    command: GhPatternsCommand
    orgs: list[str] | None = None
    query: str | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)


class GhPatternsOutput(BaseModel):
    model_config = _OUTPUT_CONFIG

    schema_version: str = Field(default=SCHEMA_VERSION, pattern=_SCHEMA_VERSION_RE)
    ok: bool = True
    orgs_scanned: int = 0
    contributors_indexed: int = 0
    candidates: list[dict[str, Any]] = Field(default_factory=list)


# ─── Validation helper ─────────────────────────────────────────────────────


_T_Input = TypeVar("_T_Input", bound=BaseModel)
_T_Output = TypeVar("_T_Output", bound=BaseModel)


def validate_remote_call(
    inp_cls: type[_T_Input],
    out_cls: type[_T_Output],
    raw_input: dict[str, Any],
    raw_output: dict[str, Any] | None = None,
) -> tuple[_T_Input, _T_Output | None]:
    """Validate input before an outbound RemoteGraph call and output when it returns.

    Intended for the core-side adapter that wraps ``RemoteGraph``. Raises
    ``pydantic.ValidationError`` on shape mismatch and ``ContractsVersionMismatch``
    when the response schema_version disagrees with the caller's SCHEMA_VERSION.
    """
    inp = inp_cls.model_validate(raw_input)
    out: _T_Output | None = None
    if raw_output is not None:
        out = out_cls.model_validate(raw_output)
        sv = getattr(out, "schema_version", None)
        if sv is not None and sv != SCHEMA_VERSION:
            raise ContractsVersionMismatch(
                f"{out_cls.__name__} schema_version={sv!r} "
                f"does not match caller {SCHEMA_VERSION!r}"
            )
    return inp, out


__all__ = [
    "SCHEMA_VERSION",
    "ContractsVersionMismatch",
    "ValidationError",
    # ml
    "JobbertNerInput",
    "JobbertNerOutput",
    "JobbertNerSpan",
    "BgeM3EmbedInput",
    "BgeM3EmbedOutput",
    # research
    "ResearchAgentInput",
    "ResearchAgentOutput",
    "ResearchMode",
    "ScholarInput",
    "ScholarOutput",
    "ScholarCommand",
    "LeadPapersInput",
    "LeadPapersOutput",
    "LeadPapersCommand",
    "CommonCrawlInput",
    "CommonCrawlOutput",
    "CommonCrawlStats",
    "CommonCrawlCommand",
    "AgenticSearchInput",
    "AgenticSearchOutput",
    "AgenticSearchCitation",
    "AgenticSearchMode",
    "GhPatternsInput",
    "GhPatternsOutput",
    "GhPatternsCommand",
    # helper
    "validate_remote_call",
]
