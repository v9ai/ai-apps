"""Shared Pydantic contracts for RemoteGraph boundaries.

Every RemoteGraph call from ``leadgen-core`` into ``leadgen-ml`` or
``leadgen-research`` crosses a real HTTP boundary. Each leaf graph on the
ml/research side validates its initial state against the matching ``*Input``
model and its final state against ``*Output`` before returning. The core
side does the same through ``validate_remote_call``.

Change the shape of any model → bump ``SCHEMA_VERSION`` → both sides must
redeploy. A mismatch raises at the first call rather than partway through a
response stream.

Cross-cutting rule: never put ``interrupt()`` inside a graph reachable via
``RemoteGraph``. The core hub owns all human-in-the-loop gates; ml and
research graphs run to completion.
"""

from __future__ import annotations

from typing import Any, Literal, TypeVar

from pydantic import BaseModel, Field, ValidationError

SCHEMA_VERSION = "2026-04-24.1"


class ContractsVersionMismatch(RuntimeError):
    """Raised when a remote side returns a schema_version the caller does not recognize."""


# ─── ML: jobbert_ner ───────────────────────────────────────────────────────


class JobbertNerInput(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    max_len: int = Field(default=64, ge=8, le=256)


class JobbertNerSpan(BaseModel):
    span: str
    label: Literal["SKILL"]
    score: float = Field(ge=0.0, le=1.0)
    start: int = Field(ge=0)
    end: int = Field(ge=0)


class JobbertNerOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
    spans: list[JobbertNerSpan] = Field(default_factory=list)


# ─── ML: bge_m3_embed ──────────────────────────────────────────────────────


class BgeM3EmbedInput(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=128)


class BgeM3EmbedOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
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
    mode: ResearchMode
    query: str = Field(min_length=1, max_length=4000)
    context: dict[str, Any] = Field(default_factory=dict)


class ResearchAgentOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
    report: str
    citations: list[str] = Field(default_factory=list)


# ─── Research: scholar ─────────────────────────────────────────────────────


ScholarCommand = Literal[
    "migrate", "import_arxiv", "coauthors", "authors", "papers", "seed"
]


class ScholarInput(BaseModel):
    command: ScholarCommand
    arxiv_id: str | None = None
    author_id: int | None = None


class ScholarOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
    ok: bool = True
    message: str = ""
    # Shape varies by command; keep permissive
    payload: dict[str, Any] = Field(default_factory=dict)


# ─── Research: lead_papers ─────────────────────────────────────────────────


LeadPapersCommand = Literal["migrate", "match", "run", "promote", "dossier"]


class LeadPapersInput(BaseModel):
    command: LeadPapersCommand
    contact_id: int | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)


class LeadPapersOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
    ok: bool = True
    matched: int = 0
    promoted: int = 0
    dossier: dict[str, Any] | None = None


# ─── Research: common_crawl ────────────────────────────────────────────────


CommonCrawlCommand = Literal["seed", "fetch", "backfill"]


class CommonCrawlInput(BaseModel):
    command: CommonCrawlCommand
    domain: str | None = None
    domains: list[str] | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)
    crawl: str | None = None


class CommonCrawlStats(BaseModel):
    cdx_records: int = 0
    pages_fetched: int = 0
    pages_skipped_dedup: int = 0
    persons_found: int = 0
    emails_found: int = 0
    contacts_upserted: int = 0
    snapshots_written: int = 0


class CommonCrawlOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
    ok: bool = True
    stats: CommonCrawlStats = Field(default_factory=CommonCrawlStats)


# ─── Research: agentic_search ──────────────────────────────────────────────


AgenticSearchMode = Literal["search", "discover"]


class AgenticSearchInput(BaseModel):
    mode: AgenticSearchMode
    query: str | None = None
    root: str | None = None


class AgenticSearchCitation(BaseModel):
    path: str
    line_range: tuple[int, int] | None = None
    snippet: str | None = None


class AgenticSearchOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
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
    command: GhPatternsCommand
    orgs: list[str] | None = None
    query: str | None = None
    limit: int | None = Field(default=None, ge=1, le=10000)


class GhPatternsOutput(BaseModel):
    schema_version: str = Field(default=SCHEMA_VERSION)
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
