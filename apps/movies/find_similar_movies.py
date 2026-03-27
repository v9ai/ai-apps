"""
LangGraph + ChromaDB pipeline to find movies similar to any given film,
available on selected streaming platforms.

Usage:
    uv run find_similar_movies.py --movie "The Pursuit of Happyness"
    uv run find_similar_movies.py --movie "Interstellar" --platforms netflix prime
    uv run find_similar_movies.py --movie "Coco" --min-rating 7.5 --format md
"""

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from typing import TypedDict
from urllib.parse import quote

import chromadb
import httpx
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph
from rich.console import Console
from rich.table import Table
from rich import box

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, max_tokens=16384)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
chroma_client = chromadb.Client()
console = Console()

PLATFORM_CONFIG = {
    "netflix": {
        "label": "Netflix",
        "search_url": "https://www.netflix.com/search?q={title}",
    },
    "disney": {
        "label": "Disney+",
        "search_url": "https://www.disneyplus.com/search?q={title}",
    },
    "prime": {
        "label": "Prime Video",
        "search_url": "https://www.amazon.com/s?k={title}&i=instant-video",
    },
    "appletv": {
        "label": "Apple TV+",
        "search_url": "https://tv.apple.com/search?term={title}",
    },
}

PLATFORM_ALIASES = {
    "netflix": "netflix",
    "disney": "disney",
    "disney+": "disney",
    "prime": "prime",
    "prime_video": "prime",
    "primevideo": "prime",
    "amazon": "prime",
    "appletv": "appletv",
    "apple": "appletv",
    "apple_tv": "appletv",
    "appletvplus": "appletv",
}


class State(TypedDict):
    query_movie: str
    platforms: list[str]          # e.g. ["netflix", "disney"]
    min_rating: float
    movie_profile: str
    platform_candidates: dict      # {platform_key: candidates_text}
    similar_movies: list[dict]
    output_file: str


def analyze_movie(state: State) -> dict:
    resp = llm.invoke(
        f"""Analyze the movie "{state['query_movie']}" and produce a detailed profile including:
- Genre(s)
- Key themes (e.g., perseverance, family bonds, ambition, redemption)
- Emotional tone
- Target audience
- Similar narrative patterns

Return a structured text profile that can be used for similarity matching."""
    )
    return {"movie_profile": resp.content}


def _search_one_platform(platform_key: str, movie: str, profile: str) -> str:
    label = PLATFORM_CONFIG[platform_key]["label"]
    resp = llm.invoke(
        f"""Based on this movie profile for "{movie}":
{profile}

List 25-30 movies currently or recently available on {label} that are similar.
Focus on movies that share the same themes, emotional tone, and narrative patterns.
Do NOT include "{movie}" itself.

For each movie provide:
- Title
- Year
- Brief description (1-2 sentences focusing on thematic similarity)
- Why it's similar to {movie}

Format as a numbered list. Be exhaustive."""
    )
    return resp.content


def search_platforms(state: State) -> dict:
    """Search all selected platforms, parallelised via threads."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=len(state["platforms"])) as pool:
        futures = {
            pool.submit(
                _search_one_platform,
                pk,
                state["query_movie"],
                state["movie_profile"],
            ): pk
            for pk in state["platforms"]
        }
        for fut in as_completed(futures):
            pk = futures[fut]
            results[pk] = fut.result()
            console.print(f"  [green]✓[/green] {PLATFORM_CONFIG[pk]['label']} search done")
    return {"platform_candidates": results}


def rank_with_chromadb(state: State) -> dict:
    collection = chroma_client.get_or_create_collection(
        name="movie_similarity",
        metadata={"hnsw:space": "cosine"},
    )

    existing = collection.get()
    if existing["ids"]:
        collection.delete(ids=existing["ids"])

    all_candidates = []
    for pk, text in state["platform_candidates"].items():
        label = PLATFORM_CONFIG[pk]["label"]
        lines = text.strip().split("\n")
        current_movie: list[str] = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current_movie:
                    all_candidates.append({"platform": label, "text": "\n".join(current_movie)})
                    current_movie = []
                continue
            if stripped and len(stripped) > 2 and stripped[0].isdigit() and (
                "." in stripped[:4] or ")" in stripped[:4]
            ):
                if current_movie:
                    all_candidates.append({"platform": label, "text": "\n".join(current_movie)})
                current_movie = [stripped]
            else:
                current_movie.append(stripped)
        if current_movie:
            all_candidates.append({"platform": label, "text": "\n".join(current_movie)})

    if not all_candidates:
        return {"similar_movies": []}

    query_embedding = embeddings.embed_query(state["movie_profile"])
    candidate_texts = [c["text"] for c in all_candidates]
    candidate_embeddings = embeddings.embed_documents(candidate_texts)

    collection.add(
        ids=[f"movie_{i}" for i in range(len(all_candidates))],
        embeddings=candidate_embeddings,
        documents=candidate_texts,
        metadatas=[{"platform": c["platform"]} for c in all_candidates],
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
            "description": doc,
            "similarity_score": round(1 - results["distances"][0][i], 4),
        })

    console.print(f"  ChromaDB returned [bold]{len(ranked)}[/bold] candidates")
    return {"similar_movies": ranked}


def _parse_json(content: str) -> list:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        content = content.strip()
    return json.loads(content)


def _refine_batch(batch: list[dict], query_movie: str) -> list[dict]:
    batch_json = json.dumps(batch, indent=2)
    resp = llm.invoke(
        f"""Extract movie info from these candidates. Return a JSON array.

{batch_json}

For EACH entry above, return:
- "title": movie title only
- "year": release year (integer)
- "platform": keep from data
- "similarity_score": keep from data
- "imdb_rating": real IMDB rating as float (e.g. 7.8)
- "age_rating": US content rating string (e.g. "G", "PG", "PG-13", "R"). Use real ratings.
- "why_similar": one English sentence about thematic connection to {query_movie}
- "genre": list of genre strings (e.g. ["Drama", "Biography"])
- "director": director name(s) as a string

Process ALL entries. Do NOT skip any. Do NOT include {query_movie} itself.
Return ONLY the JSON array."""
    )
    try:
        return _parse_json(resp.content)
    except (json.JSONDecodeError, ValueError):
        return []


def refine_results(state: State) -> dict:
    candidates = state["similar_movies"]
    all_refined = []

    for i in range(0, len(candidates), 15):
        batch = candidates[i:i + 15]
        result = _refine_batch(batch, state["query_movie"])
        all_refined.extend(result)
        console.print(
            f"  Refine batch {i // 15 + 1}: {len(batch)} in → [cyan]{len(result)}[/cyan] out"
        )

    query_lower = state["query_movie"].lower().strip()
    seen: set[str] = set()
    deduped = []
    for m in all_refined:
        key = m.get("title", "").lower().strip()
        if key in seen or key == query_lower:
            continue
        seen.add(key)
        deduped.append(m)

    # Filter by age rating (7+ only)
    allowed_ratings = {"g", "pg", "pg-13", "tv-y7", "tv-g", "tv-pg", "tv-14"}
    filtered = [m for m in deduped if m.get("age_rating", "").lower() in allowed_ratings]

    filtered.sort(key=lambda m: m.get("similarity_score", 0), reverse=True)
    for i, m in enumerate(filtered):
        m["rank"] = i + 1

    console.print(
        f"  Refine total: {len(all_refined)} → deduped: {len(deduped)} → "
        f"age 7+: [bold green]{len(filtered)}[/bold green]"
    )
    return {"similar_movies": filtered}


def _platform_search_url(platform_label: str, title: str) -> str:
    title_encoded = quote(title)
    for pk, cfg in PLATFORM_CONFIG.items():
        if cfg["label"] == platform_label:
            return cfg["search_url"].format(title=title_encoded)
    return f"https://www.google.com/search?q={title_encoded}+streaming"


def enrich_results(state: State) -> dict:
    movies_json = json.dumps(state["similar_movies"], ensure_ascii=False, indent=2)
    platform_labels = [PLATFORM_CONFIG[pk]["label"] for pk in state["platforms"]]
    resp = llm.invoke(
        f"""For each movie in this JSON array, add exactly three new fields.

Platforms searched: {platform_labels}

Fields to add:
- "url": direct URL to watch on its platform (use real content ID if known, else
  search fallback URL appropriate for the platform)
- "imdb_url": "https://www.imdb.com/title/<imdb_id>/" (use real IMDB ID like tt1234567)
- "romanian_audio": boolean -- true if the movie has Romanian audio dubbing
  (common for animated/Disney/Pixar films and major blockbusters in Romania). false otherwise.

Keep ALL existing fields unchanged. Return the complete JSON array.
Return ONLY the JSON array, no markdown fences.

{movies_json}"""
    )
    try:
        enriched = _parse_json(resp.content)
        # Fill in search fallback URLs for any movie missing a real URL
        for m in enriched:
            if not m.get("url"):
                m["url"] = _platform_search_url(m.get("platform", ""), m.get("title", ""))
        return {"similar_movies": enriched}
    except (json.JSONDecodeError, ValueError):
        return {"similar_movies": state["similar_movies"]}


IMDB_GRAPHQL = "https://graphql.imdb.com/"
IMDB_QUERY = '{ title(id: "%s") { ratingsSummary { aggregateRating } } }'


def check_imdb(state: State) -> dict:
    """Query IMDB GraphQL for each movie's real rating, filter below min_rating."""
    movies = state["similar_movies"]
    min_rating = state.get("min_rating", 7.0)
    verified = []

    with httpx.Client(timeout=15) as client:
        for movie in movies:
            imdb_url = movie.get("imdb_url", "")
            m = re.search(r"(tt\d+)", imdb_url) if imdb_url else None

            if not m:
                if movie.get("imdb_rating", 0) >= min_rating:
                    verified.append(movie)
                continue

            imdb_id = m.group(1)
            try:
                resp = client.post(
                    IMDB_GRAPHQL,
                    json={"query": IMDB_QUERY % imdb_id},
                    headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"},
                )
                if resp.status_code != 200:
                    if movie.get("imdb_rating", 0) >= min_rating:
                        verified.append(movie)
                    continue

                real_rating = (
                    resp.json()
                    .get("data", {})
                    .get("title", {})
                    .get("ratingsSummary", {})
                    .get("aggregateRating")
                )

                if real_rating is not None:
                    real_rating = round(float(real_rating), 1)
                    movie["imdb_rating_verified"] = real_rating
                    movie["imdb_rating"] = real_rating
                    if real_rating >= min_rating:
                        verified.append(movie)
                    else:
                        console.print(
                            f"  [dim]Filtered '{movie.get('title')}': "
                            f"IMDB {real_rating} < {min_rating}[/dim]"
                        )
                else:
                    if movie.get("imdb_rating", 0) >= min_rating:
                        verified.append(movie)

            except (httpx.HTTPError, json.JSONDecodeError, ValueError, KeyError):
                if movie.get("imdb_rating", 0) >= min_rating:
                    verified.append(movie)

    # Deduplicate IMDB URLs — keep first (higher similarity), fix duplicates
    seen_urls: dict[str, bool] = {}
    for movie in verified:
        url = movie.get("imdb_url", "")
        if url in seen_urls:
            title_encoded = quote(movie.get("title", ""))
            movie["imdb_url"] = f"https://www.imdb.com/find/?q={title_encoded}"
        else:
            seen_urls[url] = True

    verified.sort(key=lambda m: m.get("similarity_score", 0), reverse=True)
    for i, mv in enumerate(verified):
        mv["rank"] = i + 1

    console.print(
        f"  IMDB check: {len(movies)} → [bold green]{len(verified)}[/bold green] "
        f"movies ({min_rating}+ verified)"
    )
    return {"similar_movies": verified}


async def _check_url_async(client: httpx.AsyncClient, url: str) -> tuple[str, int, bool]:
    try:
        resp = await client.head(url, headers={"User-Agent": "Mozilla/5.0"})
        return url, resp.status_code, resp.status_code < 400
    except httpx.HTTPError:
        return url, 0, False


async def _validate_urls_async(movies: list[dict]) -> list[dict]:
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        tasks = []
        task_meta = []
        for idx, movie in enumerate(movies):
            for key in ("url", "imdb_url"):
                url = movie.get(key, "")
                if url:
                    tasks.append(_check_url_async(client, url))
                    task_meta.append((idx, key))

        results_raw = await asyncio.gather(*tasks, return_exceptions=True)

    for (idx, key), result in zip(task_meta, results_raw):
        movie = movies[idx]
        if isinstance(result, Exception):
            movie[f"{key}_status"] = 0
            movie[f"{key}_ok"] = False
        else:
            _, status, ok = result
            movie[f"{key}_status"] = status
            movie[f"{key}_ok"] = ok

        if not movie.get(f"{key}_ok", True):
            title_encoded = quote(movie.get("title", ""))
            if key == "url":
                movie[key] = _platform_search_url(movie.get("platform", ""), movie.get("title", ""))
            elif key == "imdb_url":
                movie[key] = f"https://www.imdb.com/find/?q={title_encoded}"

    return movies


def validate_urls(state: State) -> dict:
    """Check URLs via async HTTP HEAD in parallel. Replace broken ones with search fallbacks."""
    movies = state["similar_movies"]
    movies = asyncio.run(_validate_urls_async(movies))
    ok_count = sum(1 for m in movies if m.get("url_ok") and m.get("imdb_url_ok"))
    console.print(f"  URL check: [bold]{ok_count}/{len(movies)}[/bold] fully valid")
    return {"similar_movies": movies}


def save_results(state: State) -> dict:
    output_path = state.get("output_file") or os.path.join(
        os.path.dirname(__file__), "similar_movies_results.json"
    )
    output = {
        "query_movie": state["query_movie"],
        "generated_at": datetime.now().isoformat(),
        "platforms": [PLATFORM_CONFIG[pk]["label"] for pk in state["platforms"]],
        "min_rating": state.get("min_rating", 7.0),
        "total_results": len(state["similar_movies"]),
        "results": state["similar_movies"],
    }
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    return {"output_file": output_path}


def build_graph():
    graph = StateGraph(State)
    graph.add_node("analyze_movie", analyze_movie)
    graph.add_node("search_platforms", search_platforms)
    graph.add_node("rank_with_chromadb", rank_with_chromadb)
    graph.add_node("refine_results", refine_results)
    graph.add_node("enrich_results", enrich_results)
    graph.add_node("check_imdb", check_imdb)
    graph.add_node("validate_urls", validate_urls)
    graph.add_node("save_results", save_results)

    graph.set_entry_point("analyze_movie")
    graph.add_edge("analyze_movie", "search_platforms")
    graph.add_edge("search_platforms", "rank_with_chromadb")
    graph.add_edge("rank_with_chromadb", "refine_results")
    graph.add_edge("refine_results", "enrich_results")
    graph.add_edge("enrich_results", "check_imdb")
    graph.add_edge("check_imdb", "validate_urls")
    graph.add_edge("validate_urls", "save_results")
    graph.add_edge("save_results", END)
    return graph.compile()


def print_rich_table(movies: list[dict], query_movie: str):
    table = Table(
        title=f"Movies Similar to [bold cyan]{query_movie}[/bold cyan]",
        box=box.ROUNDED,
        show_lines=True,
    )
    table.add_column("#", style="dim", width=3, justify="right")
    table.add_column("Title", style="bold white", min_width=20)
    table.add_column("Year", width=6, justify="center")
    table.add_column("Platform", width=11, justify="center")
    table.add_column("IMDB", width=5, justify="center")
    table.add_column("Rating", width=6, justify="center")
    table.add_column("Score", width=6, justify="center")
    table.add_column("Genre", style="dim", min_width=12)
    table.add_column("RO", width=3, justify="center")

    platform_styles = {
        "Netflix": "bold red",
        "Disney+": "bold blue",
        "Prime Video": "bold cyan",
        "Apple TV+": "bold white",
    }

    for m in movies:
        platform = m.get("platform", "?")
        plat_style = platform_styles.get(platform, "white")
        genres = m.get("genre", [])
        genre_str = ", ".join(genres[:2]) if isinstance(genres, list) else str(genres)
        ro = "✓" if m.get("romanian_audio") else ""
        imdb = str(m.get("imdb_rating", "?"))
        score = f"{m.get('similarity_score', 0):.3f}"

        table.add_row(
            str(m.get("rank", "?")),
            m.get("title", "?"),
            str(m.get("year", "?")),
            f"[{plat_style}]{platform}[/{plat_style}]",
            imdb,
            m.get("age_rating", "?"),
            score,
            genre_str,
            ro,
        )

    console.print()
    console.print(table)


def export_markdown(movies: list[dict], query_movie: str, output_path: str):
    lines = [
        f"# Movies Similar to *{query_movie}*",
        f"\n_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}_\n",
        "| # | Title | Year | Platform | IMDB | Rating | Score | Genre |",
        "|---|-------|------|----------|------|--------|-------|-------|",
    ]
    for m in movies:
        genres = m.get("genre", [])
        genre_str = ", ".join(genres[:2]) if isinstance(genres, list) else str(genres)
        lines.append(
            f"| {m.get('rank', '?')} "
            f"| [{m.get('title', '?')}]({m.get('url', '')}) "
            f"| {m.get('year', '?')} "
            f"| {m.get('platform', '?')} "
            f"| [{m.get('imdb_rating', '?')}]({m.get('imdb_url', '')}) "
            f"| {m.get('age_rating', '?')} "
            f"| {m.get('similarity_score', 0):.3f} "
            f"| {genre_str} |"
        )
    with open(output_path, "w") as f:
        f.write("\n".join(lines) + "\n")


CACHE_DIR = os.path.join(os.path.dirname(__file__), ".cache")


def _cache_key(movie: str, platforms: list[str], min_rating: float) -> str:
    import hashlib
    key = f"{movie.lower().strip()}|{','.join(sorted(platforms))}|{min_rating}"
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def load_cache(movie: str, platforms: list[str], min_rating: float) -> dict | None:
    path = os.path.join(CACHE_DIR, f"{_cache_key(movie, platforms, min_rating)}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def save_cache(data: dict, movie: str, platforms: list[str], min_rating: float):
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = os.path.join(CACHE_DIR, f"{_cache_key(movie, platforms, min_rating)}.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Find movies similar to a given film on streaming platforms."
    )
    parser.add_argument(
        "--movie", "-m",
        default="The Pursuit of Happyness",
        help='Movie title to find similar films for (default: "The Pursuit of Happyness")',
    )
    parser.add_argument(
        "--platforms", "-p",
        nargs="+",
        default=["netflix", "disney"],
        choices=list(PLATFORM_ALIASES.keys()),
        metavar="PLATFORM",
        help=(
            "Streaming platforms to search. "
            f"Choices: {', '.join(PLATFORM_CONFIG.keys())} "
            "(default: netflix disney)"
        ),
    )
    parser.add_argument(
        "--min-rating", "-r",
        type=float,
        default=7.0,
        help="Minimum IMDB rating to include (default: 7.0)",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output JSON file path (default: similar_movies_results.json)",
    )
    parser.add_argument(
        "--format", "-f",
        choices=["json", "md", "both"],
        default="json",
        help="Output format: json, md (markdown), or both (default: json)",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Bypass cache and re-run the full pipeline even if cached results exist",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    # Resolve platform aliases and deduplicate
    resolved_platforms = list(dict.fromkeys(
        PLATFORM_ALIASES.get(p.lower(), p.lower()) for p in args.platforms
    ))
    # Ensure all resolved keys exist in PLATFORM_CONFIG
    for pk in resolved_platforms:
        if pk not in PLATFORM_CONFIG:
            console.print(f"[red]Unknown platform key: {pk}[/red]")
            sys.exit(1)

    output_file = args.output or os.path.join(
        os.path.dirname(__file__), "similar_movies_results.json"
    )

    platform_labels = [PLATFORM_CONFIG[pk]["label"] for pk in resolved_platforms]
    console.print(f"\n[bold]Movie Finder[/bold] — searching for films similar to [cyan]{args.movie!r}[/cyan]")
    console.print(f"Platforms: [yellow]{', '.join(platform_labels)}[/yellow]  |  Min IMDB: [yellow]{args.min_rating}[/yellow]\n")

    # Check cache first
    cached = None if args.no_cache else load_cache(args.movie, resolved_platforms, args.min_rating)
    if cached:
        movies = cached["results"]
        console.print(
            f"[dim]Loaded {len(movies)} results from cache "
            f"(generated {cached.get('generated_at', '?')[:10]}). "
            f"Use --no-cache to refresh.[/dim]\n"
        )
        # Still write to output file so downstream tools always have it
        with open(output_file, "w") as f:
            json.dump(cached, f, indent=2, ensure_ascii=False)
    else:
        console.print("[bold]Building LangGraph pipeline...[/bold]")
        app = build_graph()

        console.print("[bold]Running pipeline...[/bold]\n")
        result = app.invoke({
            "query_movie": args.movie,
            "platforms": resolved_platforms,
            "min_rating": args.min_rating,
            "output_file": output_file,
        })
        movies = result["similar_movies"]

        # Load the saved JSON (has all metadata) and cache it
        with open(output_file) as f:
            full_data = json.load(f)
        save_cache(full_data, args.movie, resolved_platforms, args.min_rating)

        console.print(f"\n[bold green]Found {len(movies)} similar movies![/bold green]")
        console.print(f"Results saved to: [underline]{output_file}[/underline]\n")

    print_rich_table(movies, args.movie)

    if args.format in ("md", "both"):
        md_path = output_file.replace(".json", ".md")
        export_markdown(movies, args.movie, md_path)
        console.print(f"\nMarkdown saved to: [underline]{md_path}[/underline]")


if __name__ == "__main__":
    main()
