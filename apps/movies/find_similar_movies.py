"""
LangGraph + ChromaDB pipeline to find movies similar to a given film,
available on Netflix and Disney+.
"""

import asyncio
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import TypedDict
from urllib.parse import quote

import chromadb
import httpx
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph
from rich import box
from rich.console import Console
from rich.table import Table

load_dotenv()

QUERY_MOVIE = "The Pursuit of Happyness"
MIN_IMDB_RATING = 7.0
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "similar_movies_results.json")

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, max_tokens=16384)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
chroma_client = chromadb.Client()
console = Console()

# Article words stripped when comparing titles for deduplication.
_ARTICLES = re.compile(r"^(the|a|an)\s+", re.IGNORECASE)


class State(TypedDict):
    query_movie: str
    movie_profile: str
    netflix_candidates: str
    disney_candidates: str
    similar_movies: list[dict]


# ---------------------------------------------------------------------------
# Parsing helpers
# ---------------------------------------------------------------------------

# Matches the start of a numbered list item, with optional leading/trailing bold markers.
# Handles: "1. Title", "1) Title", "**1. Title", "**1.** Title"
_LIST_ITEM = re.compile(r"^\**\s*\d{1,3}[.)]\**\s+\**")


def _split_numbered_list(text: str) -> list[str]:
    """Split a numbered-list LLM response into one string per item.

    Handles:  blank-line separators, bold markers (**N.** or **N. ), and
    multi-line items. Each numbered entry is joined into a single string.
    """
    items: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            # Blank line = end of current item
            if current:
                items.append(" ".join(current))
                current = []
            continue
        if _LIST_ITEM.match(stripped):
            if current:
                items.append(" ".join(current))
            current = [_LIST_ITEM.sub("", stripped).strip("* ")]
        elif current:
            current.append(stripped)
    if current:
        items.append(" ".join(current))
    return items


def _normalize_for_embed(raw: str) -> str:
    """Reformat a raw candidate string into a compact embedding-friendly form.

    Example output:
        "The Blind Side (2009): family support, overcoming adversity, drama. ..."
    """
    # Extract a leading title + year pattern if present.
    m = re.match(r"^(.+?)\s*[\(\[–-]?\s*((?:19|20)\d{2})\s*[\)\]]?[:\s–-]*(.*)", raw, re.DOTALL)
    if m:
        title, year, rest = m.group(1).strip(), m.group(2), m.group(3).strip()
        rest = " ".join(rest.split())  # collapse whitespace
        return f"{title} ({year}): {rest}"
    return " ".join(raw.split())  # fallback: collapse whitespace only


def _dedup_key(title: str) -> str:
    """Lower-cased, article-stripped title for deduplication."""
    return _ARTICLES.sub("", title.lower().strip())


def _extract_json(text: str) -> list:
    """Extract a JSON array from an LLM response, handling markdown fences and prose."""
    text = text.strip()
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Find the first [...] block in the response
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if m:
        return json.loads(m.group(0))
    raise ValueError("No JSON array found in LLM response")


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

def analyze_movie(state: State) -> dict:
    resp = llm.invoke(
        f"""Analyze the movie "{state['query_movie']}" and produce a detailed profile including:
- Genre(s)
- Key themes (e.g., perseverance, father-son bond, poverty, ambition)
- Emotional tone
- Target audience
- Similar narrative patterns

Return a structured text profile that can be used for similarity matching."""
    )
    return {"movie_profile": resp.content}


def _search(platform: str, movie: str, profile: str) -> str:
    resp = llm.invoke(
        f"""Based on this movie profile for "{movie}":
{profile}

List 25-30 movies currently or recently available on {platform} that are similar.
Focus on movies that share themes of: struggle, perseverance, family bonds,
overcoming adversity, biographical/true stories, drama.
Do NOT include "{movie}" itself.

For each movie provide:
- Title
- Year
- Brief description (1-2 sentences focusing on thematic similarity)
- Why it's similar to {movie}

Format as a numbered list. Be exhaustive."""
    )
    return resp.content


def search_netflix(state: State) -> dict:
    return {"netflix_candidates": _search("Netflix", state["query_movie"], state["movie_profile"])}


def search_disney(state: State) -> dict:
    return {"disney_candidates": _search("Disney+", state["query_movie"], state["movie_profile"])}


def rank_with_chromadb(state: State) -> dict:
    # Use a fresh collection per invocation to avoid stale data from prior runs.
    coll_name = f"movies_{abs(hash(state['query_movie'])) % 10**8}"
    try:
        chroma_client.delete_collection(coll_name)
    except Exception:
        pass
    collection = chroma_client.create_collection(
        name=coll_name,
        metadata={"hnsw:space": "cosine"},
    )

    all_candidates: list[dict] = []
    for platform, text in [("Netflix", state["netflix_candidates"]), ("Disney+", state["disney_candidates"])]:
        for raw in _split_numbered_list(text):
            if len(raw) > 10:
                all_candidates.append({"platform": platform, "raw": raw, "text": _normalize_for_embed(raw)})

    if not all_candidates:
        return {"similar_movies": []}

    query_embedding = embeddings.embed_query(state["movie_profile"])
    candidate_embeddings = embeddings.embed_documents([c["text"] for c in all_candidates])

    collection.add(
        ids=[f"m{i}" for i in range(len(all_candidates))],
        embeddings=candidate_embeddings,
        documents=[c["text"] for c in all_candidates],
        metadatas=[{"platform": c["platform"], "raw": c["raw"]} for c in all_candidates],
    )

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(40, len(all_candidates)),
    )

    ranked = []
    for i, doc in enumerate(results["documents"][0]):
        ranked.append({
            "rank": i + 1,
            "platform": results["metadatas"][0][i]["platform"],
            "description": results["metadatas"][0][i]["raw"],
            "similarity_score": round(1 - results["distances"][0][i], 4),
        })

    console.print(f"  ChromaDB: [bold]{len(ranked)}[/bold] candidates ranked")
    return {"similar_movies": ranked}


def _refine_batch(batch: list[dict], query_movie: str) -> list[dict]:
    resp = llm.invoke(
        f"""Extract structured movie info from these candidates. Return a JSON array.

{json.dumps(batch, indent=2)}

For EACH entry, return:
- "title": movie title only (string)
- "year": release year (integer)
- "platform": keep from data
- "similarity_score": keep from data
- "imdb_rating": real IMDB rating as float (e.g. 7.8)
- "age_rating": US content rating (e.g. "G", "PG", "PG-13", "R")
- "why_similar": one English sentence about thematic connection to {query_movie}
- "genre": list of genre strings (e.g. ["Drama", "Biography"])
- "director": director name as a string

Process ALL entries. Do NOT include {query_movie} itself. Return ONLY the JSON array."""
    )
    try:
        return _extract_json(resp.content)
    except (json.JSONDecodeError, ValueError):
        return []


def refine_results(state: State) -> dict:
    candidates = state["similar_movies"]
    all_refined: list[dict] = []

    # Process in batches of 10 for better LLM accuracy
    for i in range(0, len(candidates), 10):
        batch = candidates[i : i + 10]
        out = _refine_batch(batch, state["query_movie"])
        all_refined.extend(out)
        console.print(f"  Batch {i // 10 + 1}: {len(batch)} → [cyan]{len(out)}[/cyan]")

    query_key = _dedup_key(state["query_movie"])
    seen: set[str] = set()
    deduped: list[dict] = []
    for m in all_refined:
        key = _dedup_key(m.get("title", ""))
        if key in seen or key == query_key:
            continue
        seen.add(key)
        deduped.append(m)

    allowed = {"g", "pg", "pg-13", "tv-y7", "tv-g", "tv-pg", "tv-14"}
    filtered = [m for m in deduped if m.get("age_rating", "").lower() in allowed]

    filtered.sort(key=lambda m: m.get("similarity_score", 0), reverse=True)
    for i, m in enumerate(filtered):
        m["rank"] = i + 1

    console.print(
        f"  Refine: {len(all_refined)} raw → {len(deduped)} unique → "
        f"[bold green]{len(filtered)}[/bold green] age-safe"
    )
    return {"similar_movies": filtered}


def enrich_results(state: State) -> dict:
    resp = llm.invoke(
        f"""For each movie in this JSON array, add exactly three new fields:
- "url": Netflix URL "https://www.netflix.com/title/<id>" or Disney+ URL
  "https://www.disneyplus.com/movies/<slug>" (use real IDs/slugs if known,
  else search fallback: netflix.com/search?q=... or disneyplus.com/search?q=...)
- "imdb_url": "https://www.imdb.com/title/<tt_id>/" with the real IMDB tt-id
- "romanian_audio": boolean, true if the film has Romanian dubbing in Romania

Keep ALL existing fields. Return ONLY the JSON array, no markdown.

{json.dumps(state["similar_movies"], ensure_ascii=False, indent=2)}"""
    )
    try:
        enriched = _extract_json(resp.content)
        # Guarantee search-fallback URLs for anything blank
        for m in enriched:
            if not m.get("url"):
                t = quote(m.get("title", ""))
                m["url"] = (
                    f"https://www.netflix.com/search?q={t}"
                    if m.get("platform") == "Netflix"
                    else f"https://www.disneyplus.com/search?q={t}"
                )
        return {"similar_movies": enriched}
    except (json.JSONDecodeError, ValueError):
        return {"similar_movies": state["similar_movies"]}


# ---------------------------------------------------------------------------
# IMDB verification — batched single GraphQL request
# ---------------------------------------------------------------------------

IMDB_GRAPHQL = "https://graphql.imdb.com/"


def _build_batch_query(id_map: dict[str, str]) -> str:
    """Build a single GraphQL query that fetches ratings for all IDs at once.

    Uses field aliases so each title result is keyed by its tt-id.
        { tt1234567: title(id: "tt1234567") { ratingsSummary { aggregateRating } } ... }
    """
    fields = " ".join(
        f'{alias}: title(id: "{tt_id}") {{ ratingsSummary {{ aggregateRating }} }}'
        for alias, tt_id in id_map.items()
    )
    return "{ " + fields + " }"


def check_imdb(state: State) -> dict:
    """Fetch all IMDB ratings in one batched GraphQL request, then filter."""
    movies = state["similar_movies"]

    # Build alias → (tt_id, movie_index) map
    id_map: dict[str, str] = {}   # alias → tt_id
    idx_map: dict[str, int] = {}  # alias → index in movies
    for i, movie in enumerate(movies):
        m = re.search(r"(tt\d+)", movie.get("imdb_url", ""))
        if m:
            alias = f"t{m.group(1)[2:]}"  # "tt1234567" → "t1234567" (valid GraphQL field name)
            id_map[alias] = m.group(1)
            idx_map[alias] = i

    ratings: dict[str, float] = {}
    if id_map:
        try:
            with httpx.Client(timeout=20) as client:
                resp = client.post(
                    IMDB_GRAPHQL,
                    json={"query": _build_batch_query(id_map)},
                    headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
                )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                for alias in id_map:
                    r = (data.get(alias) or {}).get("ratingsSummary", {}).get("aggregateRating")
                    if r is not None:
                        ratings[alias] = round(float(r), 1)
        except (httpx.HTTPError, json.JSONDecodeError, KeyError):
            pass

    # Apply verified ratings back to movies
    for alias, movie_idx in idx_map.items():
        if alias in ratings:
            movies[movie_idx]["imdb_rating"] = ratings[alias]
            movies[movie_idx]["imdb_rating_verified"] = ratings[alias]

    # Filter by minimum rating
    verified = [m for m in movies if m.get("imdb_rating", 0) >= MIN_IMDB_RATING]
    for m in movies:
        if m not in verified:
            console.print(
                f"  [dim]Dropped '{m.get('title')}' — IMDB {m.get('imdb_rating')} "
                f"< {MIN_IMDB_RATING}[/dim]"
            )

    # Deduplicate IMDB URLs
    seen_imdb: set[str] = set()
    for movie in verified:
        url = movie.get("imdb_url", "")
        if url in seen_imdb:
            movie["imdb_url"] = f"https://www.imdb.com/find/?q={quote(movie.get('title', ''))}"
        else:
            seen_imdb.add(url)

    # Composite re-rank: blend cosine similarity (70%) with normalised IMDB rating (30%)
    rating_range = 10.0 - MIN_IMDB_RATING
    for m in verified:
        cosine = m.get("similarity_score", 0)
        imdb_norm = max(0.0, (m.get("imdb_rating", MIN_IMDB_RATING) - MIN_IMDB_RATING) / rating_range)
        m["final_score"] = round(0.7 * cosine + 0.3 * imdb_norm, 4)

    verified.sort(key=lambda m: m["final_score"], reverse=True)
    for i, m in enumerate(verified):
        m["rank"] = i + 1

    console.print(
        f"  IMDB batch: {len(id_map)} IDs fetched — "
        f"[bold green]{len(verified)}[/bold green] kept (≥{MIN_IMDB_RATING})"
    )
    return {"similar_movies": verified}


# ---------------------------------------------------------------------------
# Async URL validation
# ---------------------------------------------------------------------------

async def _head(client: httpx.AsyncClient, url: str) -> tuple[int, bool]:
    try:
        r = await client.head(url, headers={"User-Agent": "Mozilla/5.0"})
        return r.status_code, r.status_code < 400
    except httpx.HTTPError:
        return 0, False


async def _validate_async(movies: list[dict]) -> list[dict]:
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        tasks, meta = [], []
        for i, m in enumerate(movies):
            for key in ("url", "imdb_url"):
                if m.get(key):
                    tasks.append(_head(client, m[key]))
                    meta.append((i, key))
        results = await asyncio.gather(*tasks, return_exceptions=True)

    for (i, key), res in zip(meta, results):
        m = movies[i]
        if isinstance(res, Exception):
            m[f"{key}_status"], m[f"{key}_ok"] = 0, False
        else:
            m[f"{key}_status"], m[f"{key}_ok"] = res
        if not m.get(f"{key}_ok", True):
            t = quote(m.get("title", ""))
            if key == "url":
                m[key] = (
                    f"https://www.netflix.com/search?q={t}"
                    if m.get("platform") == "Netflix"
                    else f"https://www.disneyplus.com/search?q={t}"
                )
            else:
                m[key] = f"https://www.imdb.com/find/?q={t}"
    return movies


def validate_urls(state: State) -> dict:
    movies = asyncio.run(_validate_async(state["similar_movies"]))
    ok = sum(1 for m in movies if m.get("url_ok") and m.get("imdb_url_ok"))
    console.print(f"  URLs: [bold]{ok}/{len(movies)}[/bold] fully valid")
    return {"similar_movies": movies}


# ---------------------------------------------------------------------------
# Save
# ---------------------------------------------------------------------------

def save_results(state: State) -> dict:
    out = {
        "query_movie": state["query_movie"],
        "generated_at": datetime.now().isoformat(),
        "platforms": ["Netflix", "Disney+"],
        "min_rating": MIN_IMDB_RATING,
        "total_results": len(state["similar_movies"]),
        "results": state["similar_movies"],
    }
    with open(OUTPUT_FILE, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    return {}


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

def build_graph():
    g = StateGraph(State)
    g.add_node("analyze_movie", analyze_movie)
    g.add_node("search_netflix", search_netflix)
    g.add_node("search_disney", search_disney)
    g.add_node("rank_with_chromadb", rank_with_chromadb)
    g.add_node("refine_results", refine_results)
    g.add_node("enrich_results", enrich_results)
    g.add_node("check_imdb", check_imdb)
    g.add_node("validate_urls", validate_urls)
    g.add_node("save_results", save_results)

    g.set_entry_point("analyze_movie")
    # Fan-out: both searches run in parallel after analysis
    g.add_edge("analyze_movie", "search_netflix")
    g.add_edge("analyze_movie", "search_disney")
    # Fan-in: rank only after both searches complete
    g.add_edge("search_netflix", "rank_with_chromadb")
    g.add_edge("search_disney", "rank_with_chromadb")
    g.add_edge("rank_with_chromadb", "refine_results")
    g.add_edge("refine_results", "enrich_results")
    g.add_edge("enrich_results", "check_imdb")
    g.add_edge("check_imdb", "validate_urls")
    g.add_edge("validate_urls", "save_results")
    g.add_edge("save_results", END)
    return g.compile()


# ---------------------------------------------------------------------------
# Display
# ---------------------------------------------------------------------------

def _print_table(movies: list[dict], query_movie: str):
    table = Table(
        title=f"Movies Similar to [bold cyan]{query_movie}[/bold cyan]",
        box=box.ROUNDED,
        show_lines=True,
    )
    table.add_column("#", style="dim", width=3, justify="right")
    table.add_column("Title", style="bold white", min_width=22)
    table.add_column("Year", width=6, justify="center")
    table.add_column("Platform", width=9, justify="center")
    table.add_column("IMDB", width=5, justify="center")
    table.add_column("Rating", width=6, justify="center")
    table.add_column("Score", width=6, justify="center")
    table.add_column("Genre", style="dim", min_width=14)
    table.add_column("RO", width=3, justify="center")

    for m in movies:
        plat = m.get("platform", "?")
        plat_str = f"[bold red]{plat}[/bold red]" if plat == "Netflix" else f"[bold blue]{plat}[/bold blue]"
        genres = m.get("genre", [])
        genre_str = ", ".join(genres[:2]) if isinstance(genres, list) else str(genres)
        table.add_row(
            str(m.get("rank", "?")),
            m.get("title", "?"),
            str(m.get("year", "?")),
            plat_str,
            str(m.get("imdb_rating", "?")),
            m.get("age_rating", "?"),
            f"{m.get('final_score', m.get('similarity_score', 0)):.3f}",
            genre_str,
            "✓" if m.get("romanian_audio") else "",
        )

    console.print()
    console.print(table)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    console.print(f"\n[bold]Movie Finder[/bold] — [cyan]{QUERY_MOVIE!r}[/cyan]\n")
    app = build_graph()
    result = app.invoke({"query_movie": QUERY_MOVIE})
    movies = result["similar_movies"]
    console.print(f"\n[bold green]✓ {len(movies)} movies[/bold green] → {OUTPUT_FILE}\n")
    _print_table(movies, QUERY_MOVIE)


if __name__ == "__main__":
    main()
