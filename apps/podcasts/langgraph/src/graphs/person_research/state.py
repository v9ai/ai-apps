"""State definitions for the person research pipeline."""

import operator
from typing import Annotated, TypedDict


class OrcidWork(TypedDict):
    title: str
    year: str
    doi: str
    url: str


class OrcidData(TypedDict, total=False):
    orcid_id: str
    name: str
    other_names: list[str]
    biography: str
    keywords: list[str]
    urls: list[dict[str, str]]
    works: list[OrcidWork]


class EvalScore(TypedDict):
    score: int  # 1-10
    reasoning: str


class EvalResult(TypedDict):
    bio_quality: EvalScore
    source_coverage: EvalScore
    timeline_completeness: EvalScore
    contributions_depth: EvalScore
    name_disambiguation: EvalScore
    overall_score: int
    summary: str


class WebResult(TypedDict):
    title: str
    url: str
    snippet: str


class GitHubRepo(TypedDict):
    name: str
    description: str
    url: str
    stars: int
    language: str


class GitHubProfile(TypedDict, total=False):
    login: str
    name: str
    bio: str
    company: str
    location: str
    blog: str
    twitter_username: str
    public_repos: int
    followers: int
    avatar_url: str


class TimelineEvent(TypedDict):
    date: str
    event: str
    url: str


class Contribution(TypedDict):
    title: str
    description: str
    url: str


class Quote(TypedDict):
    text: str
    source: str
    url: str


class PersonResearch(TypedDict):
    slug: str
    name: str
    generated_at: str
    bio: str
    topics: list[str]
    timeline: list[TimelineEvent]
    key_contributions: list[Contribution]
    quotes: list[Quote]
    social: dict[str, str]
    sources: list[dict[str, str]]


class UrlContent(TypedDict):
    content: str
    status_code: int


class PersonResearchState(TypedDict):
    # Input
    person_name: str
    person_slug: str
    person_role: str
    person_org: str
    person_github: str       # GitHub username (optional)

    # After generate_queries
    search_queries: list[str]

    # After search (accumulated via reducer)
    web_results: Annotated[list[WebResult], operator.add]

    # After check_urls
    url_content: dict[str, UrlContent]

    # After fetch_github
    github_profile: GitHubProfile
    github_repos: list[GitHubRepo]

    # After fetch_orcid
    person_orcid: str           # ORCID ID (optional input)
    orcid_data: OrcidData

    # After synthesize
    research: PersonResearch

    # After evaluate
    eval_result: EvalResult

    # After export
    export_path: str
