"""Job type definitions."""

from typing import TypedDict


class Job(TypedDict):
    """Job record from the database."""
    id: str
    title: str
    description: str
    company_name: str
    location: str | None
    workplace_type: str | None
    url: str | None
