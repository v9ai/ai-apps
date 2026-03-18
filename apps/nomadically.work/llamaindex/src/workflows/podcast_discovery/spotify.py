"""Spotify API client — reads tokens from knowledge DB, auto-refreshes via refresh_token."""

import os
from datetime import datetime, timedelta, timezone

import httpx


async def get_access_token() -> str:
    """Get a valid Spotify access token.

    Reads the token from the knowledge DB's spotify_tokens table.
    If expired, uses the refresh_token to get a new one.
    """
    from src.workflows.tech_knowledge.knowledge_db import get_knowledge_connection

    conn = get_knowledge_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT access_token, refresh_token, expires_at FROM spotify_tokens WHERE id = 'default'"
        )
        row = cur.fetchone()

    if not row:
        conn.close()
        raise RuntimeError(
            "No Spotify token found. Visit /api/spotify/login on the knowledge app to authenticate."
        )

    expires_at = row["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    # If token is still valid (with 60s buffer), use it directly
    now = datetime.now(timezone.utc)
    if expires_at > now + timedelta(seconds=60):
        conn.close()
        return row["access_token"]

    # Token expired — refresh it
    refresh_token = row["refresh_token"]
    if not refresh_token:
        conn.close()
        raise RuntimeError(
            "Token expired and no refresh_token available. Re-authenticate via /api/spotify/login."
        )

    client_id = os.environ.get("SPOTIFY_CLIENT_ID", "")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        conn.close()
        raise RuntimeError(
            "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required to refresh token."
        )

    import base64
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://accounts.spotify.com/api/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
        )
        resp.raise_for_status()
        tokens = resp.json()

    new_access = tokens["access_token"]
    new_refresh = tokens.get("refresh_token", refresh_token)
    new_expires = now + timedelta(seconds=tokens["expires_in"])

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE spotify_tokens
            SET access_token = %s, refresh_token = %s, expires_at = %s, updated_at = now()
            WHERE id = 'default'
            """,
            [new_access, new_refresh, new_expires],
        )
    conn.commit()
    conn.close()

    print(f"  Spotify token refreshed, expires {new_expires.isoformat()}")
    return new_access


async def search_podcasts(
    query: str,
    access_token: str,
    limit: int = 5,
    market: str = "US",
) -> list[dict]:
    """Search Spotify for podcast shows and episodes matching a query.

    Returns a merged list of shows and episodes, each with:
    - spotify_id, type (show/episode), name, description, publisher,
      image_url, external_url, total_episodes (shows only),
      duration_ms (episodes only), show_name (episodes only)
    """
    results = []

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.spotify.com/v1/search",
            params={
                "q": query,
                "type": "show,episode",
                "limit": limit,
                "market": market,
            },
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()

    # Parse shows
    for show in (data.get("shows", {}).get("items") or []):
        if not show:
            continue
        images = show.get("images") or []
        results.append({
            "spotify_id": show["id"],
            "type": "show",
            "name": show["name"],
            "description": (show.get("description") or "")[:500],
            "publisher": show.get("publisher", ""),
            "image_url": images[0]["url"] if images else None,
            "external_url": show.get("external_urls", {}).get("spotify", ""),
            "total_episodes": show.get("total_episodes"),
        })

    # Parse episodes
    for ep in (data.get("episodes", {}).get("items") or []):
        if not ep:
            continue
        images = ep.get("images") or []
        results.append({
            "spotify_id": ep["id"],
            "type": "episode",
            "name": ep["name"],
            "description": (ep.get("description") or "")[:500],
            "publisher": "",
            "image_url": images[0]["url"] if images else None,
            "external_url": ep.get("external_urls", {}).get("spotify", ""),
            "duration_ms": ep.get("duration_ms"),
            "show_name": (ep.get("show") or {}).get("name", ""),
        })

    return results
