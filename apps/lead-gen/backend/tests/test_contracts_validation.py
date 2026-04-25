"""Contract round-trip + schema-version drift tests for leadgen_agent/contracts.py.

Covers shape validation on every Input/Output pair, the SCHEMA_VERSION format,
and the behaviour of validate_remote_call() at the version-drift boundary.

No HTTP, no DB, no torch — pure Pydantic.
"""

from __future__ import annotations

import re

import pytest
from pydantic import ValidationError

from leadgen_agent.contracts import (
    SCHEMA_VERSION,
    AgenticSearchCitation,
    AgenticSearchInput,
    AgenticSearchOutput,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
    CommonCrawlInput,
    CommonCrawlOutput,
    CommonCrawlStats,
    ContractsVersionMismatch,
    GhPatternsInput,
    GhPatternsOutput,
    JobbertNerInput,
    JobbertNerOutput,
    JobbertNerSpan,
    LeadPapersInput,
    LeadPapersOutput,
    ResearchAgentInput,
    ResearchAgentOutput,
    ScholarInput,
    ScholarOutput,
    validate_remote_call,
)


def test_schema_version_is_dated() -> None:
    """SCHEMA_VERSION must be a YYYY-MM-DD.N tag so deploy drift is unambiguous."""
    assert re.match(r"^\d{4}-\d{2}-\d{2}\.\d+$", SCHEMA_VERSION), (
        f"SCHEMA_VERSION={SCHEMA_VERSION!r} does not match YYYY-MM-DD.N"
    )


def test_jobbert_round_trip() -> None:
    inp = JobbertNerInput(text="react developer", max_len=64)
    dumped = inp.model_dump()
    re_inp = JobbertNerInput.model_validate(dumped)
    assert re_inp.text == "react developer"
    assert re_inp.max_len == 64

    span = JobbertNerSpan(span="react", label="SKILL", score=0.99, start=0, end=5)
    out = JobbertNerOutput(spans=[span])
    re_out = JobbertNerOutput.model_validate(out.model_dump())
    assert re_out.schema_version == SCHEMA_VERSION
    assert len(re_out.spans) == 1
    assert re_out.spans[0].span == "react"


def test_bge_m3_round_trip() -> None:
    inp = BgeM3EmbedInput(texts=["hello world", "second doc"])
    re_inp = BgeM3EmbedInput.model_validate(inp.model_dump())
    assert re_inp.texts == ["hello world", "second doc"]

    out = BgeM3EmbedOutput(vectors=[[0.0] * 1024, [0.1] * 1024])
    re_out = BgeM3EmbedOutput.model_validate(out.model_dump())
    assert re_out.dim == 1024
    assert re_out.model == "BAAI/bge-m3"
    assert re_out.schema_version == SCHEMA_VERSION
    assert len(re_out.vectors) == 2


def test_all_outputs_embed_schema_version() -> None:
    """Every *Output model defaults its schema_version field to SCHEMA_VERSION."""
    out_specs: list[tuple[type, dict]] = [
        (JobbertNerOutput, {"spans": []}),
        (BgeM3EmbedOutput, {"vectors": [[0.0] * 1024]}),
        (ResearchAgentOutput, {"report": "ok"}),
        (ScholarOutput, {}),
        (LeadPapersOutput, {}),
        (CommonCrawlOutput, {}),
        (AgenticSearchOutput, {}),
        (GhPatternsOutput, {}),
    ]
    for cls, kwargs in out_specs:
        instance = cls(**kwargs)
        assert getattr(instance, "schema_version") == SCHEMA_VERSION, (
            f"{cls.__name__} did not default schema_version to {SCHEMA_VERSION}"
        )


def test_jobbert_input_text_required_nonempty() -> None:
    """text has min_length=1, so empty string must raise."""
    with pytest.raises(ValidationError):
        JobbertNerInput(text="")


def test_jobbert_input_text_max_4000() -> None:
    with pytest.raises(ValidationError):
        JobbertNerInput(text="x" * 4001)


def test_bge_m3_texts_min_1() -> None:
    with pytest.raises(ValidationError):
        BgeM3EmbedInput(texts=[])


def test_bge_m3_texts_max_128() -> None:
    with pytest.raises(ValidationError):
        BgeM3EmbedInput(texts=["x"] * 129)


def test_research_agent_invalid_mode() -> None:
    with pytest.raises(ValidationError):
        ResearchAgentInput(mode="invalid", query="x")  # type: ignore[arg-type]


def test_validate_remote_call_returns_tuple() -> None:
    raw_in = {"text": "react", "max_len": 32}
    inp, out = validate_remote_call(JobbertNerInput, JobbertNerOutput, raw_in, None)
    assert isinstance(inp, JobbertNerInput)
    assert out is None

    raw_out = {"schema_version": SCHEMA_VERSION, "spans": []}
    inp2, out2 = validate_remote_call(
        JobbertNerInput, JobbertNerOutput, raw_in, raw_out
    )
    assert isinstance(inp2, JobbertNerInput)
    assert isinstance(out2, JobbertNerOutput)
    assert out2.schema_version == SCHEMA_VERSION


def test_schema_version_drift_raises() -> None:
    """A wrong schema_version on the output must be caught before state corruption.

    NOTE: ``JobbertNerOutput.schema_version`` is currently a plain ``str`` field
    (not ``Literal[SCHEMA_VERSION]``), so validate_remote_call's explicit
    ContractsVersionMismatch branch IS reachable. If a future refactor pins it
    with Literal, model_validate would raise ValidationError first — which is
    also an acceptable failure mode. We accept either to keep the contract
    "drift fails fast" intact.
    """
    raw_in = {"text": "react"}
    raw_out = {"schema_version": "1999-01-01.0", "spans": []}
    with pytest.raises((ContractsVersionMismatch, ValidationError)):
        validate_remote_call(JobbertNerInput, JobbertNerOutput, raw_in, raw_out)


def test_common_crawl_stats_default_zeroed() -> None:
    """CommonCrawlOutput auto-builds an all-zero stats object on default ctor."""
    out = CommonCrawlOutput()
    assert isinstance(out.stats, CommonCrawlStats)
    assert out.stats.cdx_records == 0
    assert out.stats.contacts_upserted == 0


def test_agentic_search_citation_optional_fields() -> None:
    """AgenticSearchCitation.line_range is optional; None is the default."""
    cit = AgenticSearchCitation(path="x.py")
    assert cit.line_range is None
    assert cit.snippet is None

    out = AgenticSearchOutput(citations=[cit])
    assert out.citations[0].path == "x.py"


def test_scholar_invalid_command() -> None:
    with pytest.raises(ValidationError):
        ScholarInput(command="not_a_command")  # type: ignore[arg-type]


def test_lead_papers_limit_bounds() -> None:
    with pytest.raises(ValidationError):
        LeadPapersInput(command="run", limit=0)
    with pytest.raises(ValidationError):
        LeadPapersInput(command="run", limit=10001)
    # In-bounds is fine.
    LeadPapersInput(command="run", limit=500)


def test_gh_patterns_round_trip() -> None:
    inp = GhPatternsInput(command="scan_orgs", orgs=["anthropic", "openai"])
    re_inp = GhPatternsInput.model_validate(inp.model_dump())
    assert re_inp.orgs == ["anthropic", "openai"]
    out = GhPatternsOutput(orgs_scanned=2, contributors_indexed=42)
    assert out.candidates == []
    assert out.schema_version == SCHEMA_VERSION
