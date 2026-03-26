import operator
from typing import Annotated, TypedDict

from pydantic import BaseModel


class Job(TypedDict):
    id: str
    title: str
    description: str
    company_name: str
    location: str | None
    workplace_type: str | None
    url: str | None


class JobClassification(BaseModel):
    job_id: str
    company_name: str
    job_url: str | None
    is_ai_company: bool
    is_fully_remote: bool
    ai_confidence: str        # "high" | "medium" | "low"
    remote_confidence: str    # "high" | "medium" | "low"
    ai_reason: str
    remote_reason: str


class RemoteAICompany(TypedDict):
    name: str
    job_count: int
    sample_titles: list[str]
    sample_urls: list[str]
    ai_confidence: str
    remote_confidence: str


class PipelineState(TypedDict):
    jobs: list[Job]
    # operator.add reducer enables parallel fan-out via Send
    classifications: Annotated[list[JobClassification], operator.add]
    remote_ai_companies: list[RemoteAICompany]
