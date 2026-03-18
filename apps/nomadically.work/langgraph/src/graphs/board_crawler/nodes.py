"""Board Crawler graph nodes — Common Crawl CDX crawling and persistence.

Ported from workers/ashby-crawler. Pure HTTP + DB operations.
"""

from __future__ import annotations

import logging

from src.db.connection import get_connection

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


def persist_node(state: BoardCrawlerState) -> dict:
    """Persist discovered boards to ats_boards table."""
    conn = get_connection()
    try:
        boards = state.get("discovered", [])
        upserted = 0

        for board in boards:
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO ats_boards (vendor, board_slug, url, source_type, source_url,
                                              method, is_active, first_seen_at, last_seen_at,
                                              created_at, updated_at)
                       VALUES (%s, %s, %s, 'common_crawl', %s, 'crawl', true, now(), now(), now(), now())
                       ON CONFLICT (vendor, board_slug) DO UPDATE SET
                           last_seen_at = now(),
                           updated_at = now()""",
                    [board["provider"], board["token"], board["url"], board["url"]],
                )
                upserted += 1
        conn.commit()

        return {
            "stats": {
                **state.get("stats", {}),
                "upserted": upserted,
            },
        }
    finally:
        conn.close()
