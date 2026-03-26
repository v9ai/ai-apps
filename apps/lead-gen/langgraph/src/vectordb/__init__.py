"""LanceDB-backed semantic search over contacts, LinkedIn posts, and jobs.

Usage:
    from src.vectordb import sync_contacts, search_contacts, sync_jobs, search_jobs

    sync_contacts(full=True)
    results = search_contacts("AI recruiter hiring LLM engineers in EU", top_k=20)
    sync_jobs(eu_remote_only=True)
    results = search_jobs(eu_remote_only=True, min_salary=80000)
"""

from .audit import audit_contacts
from .search import search_contacts, search_jobs, search_posts
from .sync import sync_contacts, sync_jobs, sync_posts

__all__ = [
    "sync_contacts",
    "sync_posts",
    "sync_jobs",
    "search_contacts",
    "search_posts",
    "search_jobs",
    "audit_contacts",
]
