"""Shared TypedDict state definitions for LangGraph pipelines."""

from __future__ import annotations

from typing import Literal, TypedDict


class PressState(TypedDict, total=False):
    """Unified orchestrator state — routes to any sub-pipeline.

    The ``pipeline`` field selects the sub-graph.  All other fields are
    optional and passed through to the chosen pipeline.
    """

    pipeline: Literal["blog", "article", "counter", "review"]

    # Shared across most pipelines
    output_dir: str
    publish: bool
    git_push: bool

    # blog
    niche: str
    count: int

    # article / counter
    topic: str

    # counter
    source_url: str
    source_content: str

    # article (optional — enables deep-dive mode when set)
    title: str
    input_file: str
    enable_paper_search: bool

    # review
    research_file: str
    seo_file: str

    # common outputs (populated by sub-graphs)
    draft: str
    research_output: str
    seo_output: str
    editor_output: str
    approved: bool
    revision_rounds: int
    paper_count: int
    reference_report: str
    reference_issues: list[str]
    broken_links: list[str]
    scout_output: str
    picker_output: str
    topics: list[dict]
    eval_scores: dict[str, float]
    eval_summary: str
    review_report: str


class BlogState(TypedDict, total=False):
    niche: str
    count: int
    output_dir: str
    publish: bool
    git_push: bool
    scout_output: str
    picker_output: str
    topics: list[dict]


class ArticleState(TypedDict, total=False):
    """Unified article pipeline — merges journalism + deep-dive.

    If ``input_file`` is set the pipeline reads source material and produces
    a long-form deep-dive (2500-3500 words).  Otherwise it
    runs a topic-only journalism flow (1200-1800 words).
    """

    topic: str
    title: str
    niche: str
    input_file: str
    output_dir: str
    publish: bool
    git_push: bool
    enable_paper_search: bool
    source_content: str
    research_output: str
    seo_output: str
    draft: str
    editor_output: str
    approved: bool
    revision_rounds: int
    paper_count: int
    reference_report: str
    reference_issues: list[str]
    broken_links: list[str]


class CounterArticleState(TypedDict, total=False):
    source_url: str
    source_content: str
    topic: str
    output_dir: str
    publish: bool
    git_push: bool
    research_output: str
    seo_output: str
    draft: str
    editor_output: str
    approved: bool
    revision_rounds: int
    paper_count: int
    reference_report: str
    reference_issues: list[str]
    broken_links: list[str]


class ReviewState(TypedDict, total=False):
    input_file: str
    research_file: str
    seo_file: str
    output_dir: str
    draft: str
    research_output: str
    seo_output: str
    reference_report: str
    reference_issues: list[str]
    broken_links: list[str]
    eval_scores: dict[str, float]
    eval_summary: str
    publication_fit: str
    editor_output: str
    review_report: str


