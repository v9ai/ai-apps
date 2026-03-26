import operator
from typing import Annotated, TypedDict

from pydantic import BaseModel


class CandidateCompany(TypedDict):
    name: str
    domain: str
    source_url: str
    source_query: str


class ATSBoardDetection(BaseModel):
    vendor: str  # "greenhouse" | "lever" | "ashby"
    board_slug: str
    url: str
    job_count: int


class CompanyResearchResult(BaseModel):
    name: str
    domain: str
    website_snippet: str
    careers_url: str | None
    ats_boards: list[ATSBoardDetection]
    is_ai_company: bool
    is_fully_remote: bool
    ai_tier: int  # 0 = not AI, 1 = AI-adjacent, 2 = AI-core
    confidence: str  # "high" | "medium" | "low"
    reasons: list[str]


class DiscoveryStats(TypedDict):
    total_searched: int
    candidates_found: int
    qualified: int
    persisted: int


class DiscoveryState(TypedDict):
    seed_topics: list[str]
    search_queries: list[str]
    search_results: Annotated[list[CandidateCompany], operator.add]
    candidates: list[CandidateCompany]
    research_results: Annotated[list[CompanyResearchResult], operator.add]
    persisted_companies: list[str]
    stats: DiscoveryStats
    dry_run: bool
    max_results: int
