"""State definitions for the merged application prep pipeline."""

import operator
from typing import Annotated, TypedDict


CATEGORIES = ["technical", "behavioral", "system_design", "company_culture"]


class ParsedJD(TypedDict):
    tech_stack: list[str]
    requirements: list[str]
    role_type: str
    seniority: str


class CompanyResearch(TypedDict):
    """Structured company intelligence for interview prep."""
    company_overview: str           # what the company does, mission, market position
    product_focus: list[str]        # main products/services (max 5)
    engineering_culture: list[str]  # engineering team signals (max 5)
    tech_investment_signals: list[str]  # AI tier, tech stack signals (max 5)
    competitive_landscape: str      # key competitors and differentiation
    talking_points: list[str]       # specific things to reference in interview (max 5)
    red_flags: list[str]            # potential concerns to probe (max 3)


class RoleDepth(TypedDict):
    """Deep signals extracted from the JD that go beyond simple parsing."""
    team_signals: list[str]       # e.g. "small team", "high autonomy", "cross-functional"
    technical_maturity: str       # "early_stage" | "scaling" | "mature" | "legacy"
    growth_stage: str             # "startup" | "scaleup" | "enterprise"
    hidden_requirements: list[str]  # things implied but not stated
    key_challenges: list[str]     # specific challenges the role will face
    interview_focus: list[str]    # what interviewers likely care about most
    culture_signals: list[str]    # culture indicators from the JD


class QAScore(TypedDict):
    """Score for a single Q&A pair from the self-evaluation node."""
    question_idx: int
    specificity: float    # 0-1: how specific to this role vs generic
    difficulty: float     # 0-1: appropriate for the seniority level
    answer_quality: float # 0-1: substantive, actionable, specific
    overall: float        # 0-1: combined score
    feedback: str         # why it scored low (empty if good)


class QAPair(TypedDict):
    question: str
    answer: str


class QuestionSet(TypedDict):
    category: str
    qa_pairs: list[QAPair]


class ExtractedTech(TypedDict):
    tag: str
    label: str
    category: str
    relevance: str


class GeneratedContent(TypedDict):
    tag: str
    label: str
    category: str
    slug: str
    title: str
    content: str
    word_count: int
    subtopics: list[str]


class ApplicationPrepState(TypedDict):
    # Input
    application_id: int
    job_title: str
    company_name: str
    company_key: str
    job_description: str

    # After parse_jd
    parsed: ParsedJD | None
    company_context: str

    # After analyze_role_depth
    role_depth: RoleDepth | None

    # After research_company
    company_research: CompanyResearch | None

    # After extract_technologies
    technologies: list[ExtractedTech]

    # After organize_hierarchy
    organized: list[ExtractedTech]
    existing_slugs: list[str]

    # Parallel fan-out results
    question_sets: Annotated[list[QuestionSet], operator.add]
    generated: Annotated[list[GeneratedContent], operator.add]

    # After score_and_refine
    qa_scores: list[dict]  # per-category scoring results
    refined_count: int      # how many answers were regenerated

    # Final
    report: str

    # URL validation (from validate_urls node)
    knowledge_db_ok: bool

    # Control
    dry_run: bool
    exclude_tags: list[str]
    stats: dict
