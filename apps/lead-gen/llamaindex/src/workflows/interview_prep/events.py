"""Events for the interview prep workflow."""

from llama_index.core.workflow import Event


class ParsedJDEvent(Event):
    """Emitted after the JD is parsed into structured fields."""
    tech_stack: list[str]
    requirements: list[str]
    role_type: str
    seniority: str
    company_context: str


class GenerateQuestionsEvent(Event):
    """Fan-out event — one per question category."""
    category: str
    job_title: str
    company_name: str
    job_description: str
    tech_stack: list[str]
    requirements: list[str]
    role_type: str
    seniority: str
    company_context: str


class QuestionSetCompleteEvent(Event):
    """Emitted when one category's Q&A pairs are generated."""
    category: str
    qa_pairs: list[dict]  # [{"question": str, "answer": str}, ...]
