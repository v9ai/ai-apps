import operator
from typing import Annotated, TypedDict


CATEGORIES = ["technical", "behavioral", "system_design", "company_culture"]


class ParsedJD(TypedDict):
    tech_stack: list[str]
    requirements: list[str]
    role_type: str  # e.g. "frontend", "backend", "fullstack", "ml"
    seniority: str  # e.g. "senior", "mid", "junior"


class QAPair(TypedDict):
    question: str
    answer: str   # suggested answer (or "what to listen for" in company_culture)


class QuestionSet(TypedDict):
    category: str        # one of CATEGORIES
    qa_pairs: list[QAPair]


class InterviewPrepState(TypedDict):
    # Input
    application_id: int
    job_title: str
    company_name: str
    company_key: str          # DB lookup key for fetching all company jobs
    job_description: str

    # After parse_jd node
    parsed: ParsedJD | None
    company_context: str      # compiled context from all company jobs in DB

    # Parallel fan-out — each generate_questions node appends one QuestionSet
    question_sets: Annotated[list[QuestionSet], operator.add]

    # Final report string
    report: str
