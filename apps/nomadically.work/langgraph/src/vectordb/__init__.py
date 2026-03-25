"""LanceDB-backed semantic search over contacts and LinkedIn posts.

Usage:
    from src.vectordb import sync_contacts, search_contacts, sync_posts, search_posts

    sync_contacts(full=True)
    results = search_contacts("AI recruiter hiring LLM engineers in EU", top_k=20)
"""

from .search import search_contacts, search_posts
from .sync import sync_contacts, sync_posts

__all__ = ["sync_contacts", "sync_posts", "search_contacts", "search_posts"]
