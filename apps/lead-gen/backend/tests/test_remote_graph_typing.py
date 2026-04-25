"""Static-typing tests for ``core.remote_graphs._ValidatedRemoteGraph``.

These tests exercise the *runtime* type metadata that PEP 695 generics expose
via ``typing.get_type_hints`` and ``typing.get_args``. They are deliberately
zero-network: they neither construct adapters nor read env vars — they only
introspect the return-type annotations of the eight builder functions and
the two convenience helpers.

Why this matters: the adapter is generic over its Pydantic input/output
contracts (``_ValidatedRemoteGraph[InT, OutT]``) so a caller holding a
``get_jobbert_ner_adapter()`` reference can have a static checker prove the
output shape is ``JobbertNerOutput``, not just ``BaseModel``. If a future
refactor erases those parameters, the suite below fails immediately instead
of letting precise typing rot away across releases.
"""

from __future__ import annotations

import typing
from typing import get_args, get_type_hints

from pydantic import BaseModel

from core.remote_graphs import (
    _ValidatedRemoteGraph,
    build_all_remote_adapters,
    get_agentic_search_adapter,
    get_bge_m3_embed_adapter,
    get_common_crawl_adapter,
    get_gh_patterns_adapter,
    get_jobbert_ner_adapter,
    get_lead_papers_adapter,
    get_remote_adapter,
    get_research_agent_adapter,
    get_scholar_adapter,
)
from leadgen_agent.contracts import (
    AgenticSearchInput,
    AgenticSearchOutput,
    BgeM3EmbedInput,
    BgeM3EmbedOutput,
    CommonCrawlInput,
    CommonCrawlOutput,
    GhPatternsInput,
    GhPatternsOutput,
    JobbertNerInput,
    JobbertNerOutput,
    LeadPapersInput,
    LeadPapersOutput,
    ResearchAgentInput,
    ResearchAgentOutput,
    ScholarInput,
    ScholarOutput,
)


# (builder, expected_input_cls, expected_output_cls)
_BUILDER_EXPECTATIONS = [
    (get_jobbert_ner_adapter, JobbertNerInput, JobbertNerOutput),
    (get_bge_m3_embed_adapter, BgeM3EmbedInput, BgeM3EmbedOutput),
    (get_research_agent_adapter, ResearchAgentInput, ResearchAgentOutput),
    (get_lead_papers_adapter, LeadPapersInput, LeadPapersOutput),
    (get_scholar_adapter, ScholarInput, ScholarOutput),
    (get_common_crawl_adapter, CommonCrawlInput, CommonCrawlOutput),
    (get_agentic_search_adapter, AgenticSearchInput, AgenticSearchOutput),
    (get_gh_patterns_adapter, GhPatternsInput, GhPatternsOutput),
]


def test_builders_return_parameterized_adapter() -> None:
    """Each ``get_*_adapter`` annotates its return as a parameterized
    ``_ValidatedRemoteGraph[<Input>, <Output>]``. We assert both the origin
    (the generic class) and the type arguments (the contract classes)."""
    assert len(_BUILDER_EXPECTATIONS) == 8

    for builder, in_cls, out_cls in _BUILDER_EXPECTATIONS:
        hints = get_type_hints(builder)
        assert "return" in hints, f"{builder.__name__} missing return annotation"

        ret = hints["return"]
        origin = typing.get_origin(ret)
        assert origin is _ValidatedRemoteGraph, (
            f"{builder.__name__} return origin={origin!r}; "
            f"expected _ValidatedRemoteGraph"
        )

        args = get_args(ret)
        assert args == (in_cls, out_cls), (
            f"{builder.__name__} type args={args!r}; expected ({in_cls!r}, {out_cls!r})"
        )


def test_builder_args_are_pydantic_basemodels() -> None:
    """Defence-in-depth: every parameterization must be a BaseModel subclass.
    If somebody substitutes a TypedDict or a dict, this trips before the
    runtime call ever happens."""
    for builder, in_cls, out_cls in _BUILDER_EXPECTATIONS:
        assert issubclass(in_cls, BaseModel), (
            f"{builder.__name__} input {in_cls!r} is not a BaseModel"
        )
        assert issubclass(out_cls, BaseModel), (
            f"{builder.__name__} output {out_cls!r} is not a BaseModel"
        )


def test_get_remote_adapter_uses_loose_basemodel_typing() -> None:
    """The by-name lookup is the documented escape hatch — it returns
    ``_ValidatedRemoteGraph[BaseModel, BaseModel]`` so callers know they're
    opting out of precise parameterization."""
    hints = get_type_hints(get_remote_adapter)
    ret = hints["return"]
    origin = typing.get_origin(ret)
    args = get_args(ret)

    assert origin is _ValidatedRemoteGraph
    assert args == (BaseModel, BaseModel)


def test_build_all_returns_loose_dict_typing() -> None:
    """``build_all_remote_adapters`` returns a uniform dict whose value type
    is the loose ``_ValidatedRemoteGraph[BaseModel, BaseModel]``."""
    hints = get_type_hints(build_all_remote_adapters)
    ret = hints["return"]
    origin = typing.get_origin(ret)
    assert origin is dict

    key_t, val_t = get_args(ret)
    assert key_t is str

    val_origin = typing.get_origin(val_t)
    val_args = get_args(val_t)
    assert val_origin is _ValidatedRemoteGraph
    assert val_args == (BaseModel, BaseModel)


def test_class_is_pep695_generic() -> None:
    """``_ValidatedRemoteGraph`` exposes its PEP 695 type parameters via
    ``__type_params__``. Both should be bound to ``BaseModel``."""
    type_params = getattr(_ValidatedRemoteGraph, "__type_params__", None)
    assert type_params is not None, (
        "_ValidatedRemoteGraph is missing __type_params__ — was the PEP 695 "
        "generic syntax dropped?"
    )
    assert len(type_params) == 2, (
        f"expected 2 type parameters (InT, OutT); got {len(type_params)}"
    )
    for tp in type_params:
        bound = getattr(tp, "__bound__", None)
        assert bound is BaseModel, (
            f"type param {tp!r} bound={bound!r}; expected BaseModel"
        )
