"""Board Crawler graph nodes — Common Crawl CDX crawling and persistence.

Ported from workers/ashby-crawler. Pure HTTP + DB operations.
"""

from __future__ import annotations

import logging

from .common_crawl import crawl_cdx_page, detect_latest_index
from .state import BoardCrawlerState

logger = logging.getLogger(__name__)


def detect_index_node(state: BoardCrawlerState) -> dict:
    """Detect the latest Common Crawl index."""
    index_id = detect_latest_index()
    logger.info(f"Using Common Crawl index: {index_id}")
    return {"stats": {"index_id": index_id}}


def crawl_pages_node(state: BoardCrawlerState) -> dict:
    """Crawl CDX pages for the specified provider."""
    index_id = state.get("stats", {}).get("index_id", "")
    provider = state["provider"]
    pages = state.get("pages_per_run", 3)

    all_boards = []
    for page in range(pages):
        try:
            boards = crawl_cdx_page(index_id, provider, page)
            all_boards.extend(boards)
            logger.info(f"Page {page}: found {len(boards)} boards")
            if not boards:
                break
        except Exception as e:
            logger.warning(f"Page {page} failed: {e}")
            break

    return {"discovered": all_boards}


def deduplicate_node(state: BoardCrawlerState) -> dict:
    """Deduplicate discovered boards by token."""
    seen = {}
    for board in state.get("discovered", []):
        token = board["token"]
        if token not in seen or board.get("timestamp", "") > seen[token].get("timestamp", ""):
            seen[token] = board

    unique = list(seen.values())
    return {
        "discovered": unique,
        "stats": {
            **state.get("stats", {}),
            "total_discovered": len(state.get("discovered", [])),
            "unique_boards": len(unique),
        },
    }


