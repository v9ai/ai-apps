"""Shared TypedDict state definitions for LangGraph pipelines."""

from __future__ import annotations

from typing import TypedDict


class BlogState(TypedDict, total=False):
    niche: str
    count: int
    output_dir: str
    publish: bool
    git_push: bool
    scout_output: str
    picker_output: str
    topics: list[dict]


class JournalismState(TypedDict, total=False):
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
    linkedin: str
    approved: bool
    revision_rounds: int
    paper_count: int
    reference_report: str
    reference_issues: list[str]
    broken_links: list[str]


class DeepDiveState(TypedDict, total=False):
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
    linkedin: str
    approved: bool
    revision_rounds: int
    paper_count: int
    reference_report: str
    reference_issues: list[str]
    broken_links: list[str]
