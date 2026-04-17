"""
spotify_podcast_search.py
─────────────────────────
Local-first pipeline: Spotify → LanceDB → Semantic Search → DeepEval

LanceDB is the central local store. The JSON export is a projection of
what's in LanceDB for the Next.js frontend to consume. Run this script
manually to refresh data.

Setup:
    pip install -r requirements.txt

Commands:
    python spotify_podcast_search.py fetch                    # Spotify → local JSON
    python spotify_podcast_search.py ingest                   # JSON → LanceDB (embed + index)
    python spotify_podcast_search.py refresh                  # fetch + ingest + export in one go
    python spotify_podcast_search.py export                   # LanceDB → enriched JSON for Next.js
    python spotify_podcast_search.py search "AGI timelines"
    python spotify_podcast_search.py search "future of coding" --guest "Boris Cherny" --latest-first
    python spotify_podcast_search.py similar <spotify_id>     # find similar episodes via LanceDB
    python spotify_podcast_search.py stats                    # LanceDB table statistics
    python spotify_podcast_search.py timeline --person "Dario Amodei"
    python spotify_podcast_search.py eval                     # full DeepEval suite (all categories)
    python spotify_podcast_search.py eval --category builders # category-specific eval
    python spotify_podcast_search.py tune                     # sweep chunk_size × top_k
    python spotify_podcast_search.py serve                    # local HTTP API for Next.js
"""

import argparse
import json
import os
import re
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import lancedb
import pyarrow as pa
import spotipy
from sentence_transformers import SentenceTransformer
from spotipy.oauth2 import SpotifyClientCredentials
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import track

console = Console()


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split text into chunks of chunk_size with chunk_overlap between them."""
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start : start + chunk_size])
        start += chunk_size - chunk_overlap
    return chunks


# ═══════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════

SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
SPOTIFY_MARKET = "US"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LANCE_DIR = str(PROJECT_ROOT / "lance_podcasts")
EPISODES_TABLE = "episodes"              # full episode metadata
CHUNKS_TABLE = "episode_chunks"          # embedded chunks for search
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 80
TOP_K = 5
EPISODES_FILE = str(PROJECT_ROOT / "spotify_episodes.json")

# ── All 36 personalities from the AI Podcast Index ────────────────────────

AI_PEOPLE = [
    # Lab Leaders & Founders
    "Sam Altman", "Dario Amodei", "Jensen Huang",
    "Liang Wenfeng", "Yang Zhilin",
    # Builders & Technical Leaders
    "Andrej Karpathy", "Boris Cherny", "Harrison Chase", "Jerry Liu",
    "Ilya Sutskever", "Joao Moura", "Samuel Colvin",
    # Researchers & Thinkers
    "Yann LeCun", "Demis Hassabis", "Fei-Fei Li", "Geoffrey Hinton",
    "Athos Georgiou",
    # Podcast Hosts & AI Personalities
    "Dwarkesh Patel",
    # Rising Infrastructure & Product Leaders
    "Amjad Masad", "Mustafa Suleyman", "Amanda Askell", "Noam Shazeer",
    # AI Infrastructure & Inference
    "Swami Sivasubramanian", "Woosuk Kwon", "Jeffrey Morgan",
    "Alex Atallah", "Yagil Burowski", "Krrish Dholakia", "Rohit Agarwal",
    # Vector Database Founders
    "Jeff Huber", "Bob van Luijt", "Andre Zayarni",
    "Vasilije Markovic", "Shay Banon", "Andrew Kane",
    "Chang She",
]

PERSON_SLUGS = {
    "Sam Altman": "sam-altman", "Dario Amodei": "dario-amodei",
    "Jensen Huang": "jensen-huang",
    "Liang Wenfeng": "liang-wenfeng", "Yang Zhilin": "yang-zhilin",
    "Andrej Karpathy": "andrej-karpathy", "Boris Cherny": "boris-cherny",
    "Harrison Chase": "harrison-chase", "Jerry Liu": "jerry-liu",
    "Ilya Sutskever": "ilya-sutskever", "Joao Moura": "joao-moura",
    "Samuel Colvin": "samuel-colvin",
    "Yann LeCun": "yann-lecun", "Demis Hassabis": "demis-hassabis",
    "Fei-Fei Li": "fei-fei-li", "Geoffrey Hinton": "geoffrey-hinton",
    "Athos Georgiou": "athos-georgiou",
    "Dwarkesh Patel": "dwarkesh-patel",
    "Amjad Masad": "amjad-masad", "Mustafa Suleyman": "mustafa-suleyman",
    "Amanda Askell": "amanda-askell", "Noam Shazeer": "noam-shazeer",
    "Swami Sivasubramanian": "swami-sivasubramanian",
    "Woosuk Kwon": "woosuk-kwon", "Jeffrey Morgan": "jeffrey-morgan",
    "Alex Atallah": "alex-atallah", "Yagil Burowski": "yagil-burowski",
    "Rohit Agarwal": "rohit-agarwal",
    "Jeff Huber": "jeff-huber", "Bob van Luijt": "bob-van-luijt",
    "Andre Zayarni": "andre-zayarni", "Vasilije Markovic": "vasilije-markovic",
    "Shay Banon": "shay-banon", "Andrew Kane": "andrew-kane",
    "Chang She": "chang-she",
}

PERSON_CATEGORIES = {
    "Sam Altman": "lab-leaders", "Dario Amodei": "lab-leaders",
    "Jensen Huang": "lab-leaders",
    "Liang Wenfeng": "lab-leaders", "Yang Zhilin": "lab-leaders",
    "Andrej Karpathy": "builders", "Boris Cherny": "builders",
    "Harrison Chase": "builders", "Jerry Liu": "builders",
    "Ilya Sutskever": "builders", "Joao Moura": "builders",
    "Samuel Colvin": "builders",
    "Yann LeCun": "researchers", "Demis Hassabis": "researchers",
    "Fei-Fei Li": "researchers", "Geoffrey Hinton": "researchers",
    "Athos Georgiou": "researchers",
    "Dwarkesh Patel": "hosts",
    "Amjad Masad": "rising-leaders", "Mustafa Suleyman": "rising-leaders",
    "Amanda Askell": "rising-leaders", "Noam Shazeer": "rising-leaders",
    "Swami Sivasubramanian": "infrastructure", "Woosuk Kwon": "infrastructure",
    "Jeffrey Morgan": "infrastructure", "Alex Atallah": "infrastructure",
    "Yagil Burowski": "infrastructure", "Krrish Dholakia": "infrastructure",
    "Rohit Agarwal": "infrastructure",
    "Jeff Huber": "vector-dbs", "Bob van Luijt": "vector-dbs",
    "Andre Zayarni": "vector-dbs", "Vasilije Markovic": "vector-dbs",
    "Shay Banon": "vector-dbs", "Andrew Kane": "vector-dbs",
    "Chang She": "vector-dbs",
}

# Extra search queries per person to widen episode coverage.
# The person's own name is always searched; these are additional queries.
PERSON_ALT_QUERIES: dict[str, list[str]] = {
    "Jerry Liu": ["Jerry Liu LlamaIndex", "LlamaIndex CEO", "LlamaIndex Jerry"],
    "Harrison Chase": ["Harrison Chase LangChain", "LangChain CEO"],
    "Boris Cherny": ["Boris Cherny Claude Code", "Boris Cherny Anthropic"],
    "Joao Moura": ["Joao Moura CrewAI", "CrewAI CEO"],
    "Samuel Colvin": ["Samuel Colvin Pydantic", "Pydantic AI"],
    "Jeff Huber": ["Jeff Huber Chroma", "Chroma vector database"],
    "Bob van Luijt": ["Bob van Luijt Weaviate", "Weaviate CEO"],
    "Woosuk Kwon": ["Woosuk Kwon vLLM"],
    "Krrish Dholakia": ["Krrish Dholakia LiteLLM", "LiteLLM BerriAI"],
    "Vasilije Markovic": ["Vasilije Markovic Cognee"],
    "Jeffrey Morgan": ["Jeffrey Morgan Ollama", "Ollama founder"],
    "Yagil Burowski": ["Yagil Burowski LM Studio", "LM Studio founder"],
    "Andrew Kane": ["Andrew Kane pgvector"],
    "Andre Zayarni": ["Andre Zayarni Qdrant", "Qdrant CEO"],
    "Yang Zhilin": ["Yang Zhilin Moonshot", "Kimi Moonshot AI", "Zhilin Yang Kimi"],
    "Chang She": ["Chang She LanceDB", "LanceDB CEO", "LanceDB multimodal"],
}

# Alternate name forms for filtering (person's name may appear differently)
PERSON_NAME_VARIANTS: dict[str, list[str]] = {
    "Yang Zhilin": ["yang zhilin", "zhilin yang"],
    "Joao Moura": ["joao moura", "joão moura"],
    "Fei-Fei Li": ["fei-fei li", "feifei li"],
}

# Known false positives: episodes wrongly attributed to a person.
# Used by eval and audit to validate filtering accuracy.
# Format: { "person-slug": ["spotify_id", ...] }
KNOWN_FALSE_POSITIVES: dict[str, list[str]] = {
    "jerry-liu": [
        "4FbFLzOVKtari4qhFnVplS",  # DataFramed #337 "Best Moments of 2025" — compilation, not a guest
    ],
    "joao-moura": [
        "43asLqWQK2sesyjvhoWlgh",  # "João Moura e os bifes da vazia" — different person (Portuguese cooking)
    ],
}

KNOWN_SHOWS = {
    "Lex Fridman Podcast": "2MAi0BvDc6GTFvKFPXnkCL",
    "Dwarkesh Podcast": "4JH4tybY1zX6e5hjCwU6gF",
    "Lenny's Podcast": "2dR1MUZEHCOnz1LVfNac0j",
    "No Priors": "0O65xhqvGVhpgdIrrdlEYk",
    "Latent Space": "2p7zZVwVF6Yk0Zsb4QmT7t",
    "This Week in Startups": "6ULQ0ewYf5zmsDgBchlkr9",
}

ALL_CATEGORIES = [
    "lab-leaders", "builders", "researchers", "hosts",
    "rising-leaders", "infrastructure", "vector-dbs",
]


# ═══════════════════════════════════════════════════════════════════════════
# LANCEDB HELPERS — LanceDB as central local store
# ═══════════════════════════════════════════════════════════════════════════

EPISODES_SCHEMA = pa.schema([
    pa.field("spotify_id", pa.utf8()),
    pa.field("name", pa.utf8()),
    pa.field("document", pa.utf8()),
    pa.field("show_name", pa.utf8()),
    pa.field("show_id", pa.utf8()),
    pa.field("publisher", pa.utf8()),
    pa.field("release_date", pa.utf8()),
    pa.field("duration_min", pa.float64()),
    pa.field("guest_query", pa.utf8()),
    pa.field("guest_slug", pa.utf8()),
    pa.field("category", pa.utf8()),
    pa.field("url", pa.utf8()),
    pa.field("image", pa.utf8()),
])


def get_db():
    return lancedb.connect(LANCE_DIR)


def get_episodes_table(db=None):
    """Document store — one row per episode, metadata-rich, no embeddings."""
    d = db or get_db()
    return d.open_table(EPISODES_TABLE)


def get_chunks_table(db=None):
    """Vector store — chunked + embedded episode text for semantic search."""
    d = db or get_db()
    return d.open_table(CHUNKS_TABLE)


def episode_metadata(ep):
    """Standard metadata dict from an episode record."""
    return {
        "spotify_id": ep["spotify_id"],
        "name": ep["name"][:200],
        "show_name": ep["show_name"],
        "show_id": ep.get("show_id", ""),
        "publisher": ep.get("publisher", ""),
        "release_date": ep["release_date"],
        "duration_min": ep["duration_min"],
        "guest_query": ep["guest_query"],
        "guest_slug": ep.get("guest_slug", ""),
        "category": ep.get("category", ""),
        "url": ep["url"],
        "image": ep.get("image", ""),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 1. FETCH — Spotify API → local JSON
# ═══════════════════════════════════════════════════════════════════════════

def get_spotify_client():
    return spotipy.Spotify(
        auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET,
        ),
        requests_timeout=10,
    )


# Patterns that indicate compilation / recap episodes
_COMPILATION_RE = re.compile(
    r"best\s+(of|moments)|highlights|year\s+in\s+review|top\s+episodes|"
    r"distilled|recap|roundup|round-up|greatest\s+hits",
    re.IGNORECASE,
)


_AI_RELEVANCE_TERMS = {
    "ai", "artificial intelligence", "machine learning", "deep learning",
    "llm", "gpt", "agent", "model", "neural", "transformer", "ml",
    "crewai", "langchain", "llamaindex", "openai", "anthropic", "nvidia",
    "inference", "training", "rag", "vector", "embedding", "prompt",
    "autonomous", "workflow", "multi-agent", "automation", "software",
    "engineering", "data science", "startup", "founder", "ceo", "cto",
    "tech", "technology", "developer", "programming", "code", "api",
}


def _is_relevant_match(name_variants: list[str], title: str, description: str,
                       *, guest_slug: str = "") -> bool:
    """Return True if this episode is a genuine appearance, not a passing mention.

    Rules:
      1. Known false positive → always reject.
      2. Description is trivially short (≤ len(title) + 20) and has no
         AI/tech terms → reject (likely a different person with the same name).
      3. Name in title → accept (unless rule 2 triggered).
      4. Name only in description AND title looks like a compilation → reject.
      5. Name only in description but title is normal → accept.
    """
    # Rule 1: known false positive list
    # (checked by caller via spotify_id; this is a structural comment)

    title_lower = title.lower()
    desc_lower = description.lower()

    # Rule 2: description-quality gate — if the description is essentially
    # just the title (or empty), require at least one AI/tech term in the
    # combined text to avoid wrong-person matches.
    combined = f"{title_lower} {desc_lower}"
    desc_is_trivial = len(description.strip()) <= len(title.strip()) + 20
    if desc_is_trivial and not any(term in combined for term in _AI_RELEVANCE_TERMS):
        return False

    in_title = any(v in title_lower for v in name_variants)
    if in_title:
        return True
    # Name is only in the description — check for compilation patterns
    if _COMPILATION_RE.search(title):
        return False
    return True


def search_person_episodes(sp, query, limit=10, *, name_filter=None):
    """Search Spotify for episodes matching *query*, filtering to those
    whose title or description contain *name_filter* (defaults to query)."""
    results = sp.search(q=query, type="episode", limit=limit, market=SPOTIFY_MARKET)
    episodes = []
    person = name_filter or query
    name_variants = [person.lower()] + PERSON_NAME_VARIANTS.get(person, [])
    slug = PERSON_SLUGS.get(person, "")
    known_fps = set(KNOWN_FALSE_POSITIVES.get(slug, []))
    for item in results.get("episodes", {}).get("items", []) or []:
        if item["id"] in known_fps:
            continue
        title = item.get("name", "")
        desc = item.get("description", "")
        text = (title + " " + desc).lower()
        if not any(v in text for v in name_variants):
            continue
        if not _is_relevant_match(name_variants, title, desc, guest_slug=slug):
            continue
        show = item.get("show") or {}
        episodes.append({
            "spotify_id": item["id"],
            "name": title,
            "description": desc[:2000],
            "show_name": show.get("name", ""),
            "show_id": show.get("id", ""),
            "publisher": show.get("publisher", ""),
            "release_date": item.get("release_date", ""),
            "duration_ms": item.get("duration_ms", 0),
            "duration_min": round(item.get("duration_ms", 0) / 60000, 1),
            "url": item.get("external_urls", {}).get("spotify", ""),
            "image": (item.get("images") or [{}])[0].get("url", ""),
            "guest_query": query,
            "guest_slug": PERSON_SLUGS.get(query, ""),
            "category": PERSON_CATEGORIES.get(query, ""),
        })
    return episodes


def fetch_show_episodes(sp, show_id, show_name, limit=50):
    results = sp.show_episodes(show_id, limit=limit, market=SPOTIFY_MARKET)
    episodes = []
    for item in results.get("items", []) or []:
        episodes.append({
            "spotify_id": item["id"],
            "name": item["name"],
            "description": item.get("description", "")[:2000],
            "show_name": show_name,
            "show_id": show_id,
            "publisher": "",
            "release_date": item.get("release_date", ""),
            "duration_ms": item.get("duration_ms", 0),
            "duration_min": round(item.get("duration_ms", 0) / 60000, 1),
            "url": item.get("external_urls", {}).get("spotify", ""),
            "image": (item.get("images") or [{}])[0].get("url", ""),
            "guest_query": "",
            "guest_slug": "",
            "category": "",
        })
    return episodes


def cmd_fetch(args):
    sp = get_spotify_client()
    seen_ids = set()
    all_episodes = []

    console.print(f"\n[bold cyan]Fetching episodes for {len(AI_PEOPLE)} AI personalities...[/]\n")
    for person in track(AI_PEOPLE, description="Searching people..."):
        queries = [person] + PERSON_ALT_QUERIES.get(person, [])
        for query in queries:
            try:
                for ep in search_person_episodes(sp, query, limit=10, name_filter=person):
                    ep["guest_query"] = person
                    ep["guest_slug"] = PERSON_SLUGS.get(person, "")
                    ep["category"] = PERSON_CATEGORIES.get(person, "")
                    if ep["spotify_id"] not in seen_ids:
                        seen_ids.add(ep["spotify_id"])
                        all_episodes.append(ep)
                time.sleep(0.3)
            except Exception as e:
                console.print(f"  [yellow]! {person} ({query}): {e}[/]")

    console.print(f"\n[bold cyan]Fetching from {len(KNOWN_SHOWS)} known AI podcast shows...[/]\n")
    for show_name, show_id in track(KNOWN_SHOWS.items(), description="Fetching shows..."):
        try:
            for ep in fetch_show_episodes(sp, show_id, show_name, limit=50):
                if ep["spotify_id"] not in seen_ids:
                    seen_ids.add(ep["spotify_id"])
                    all_episodes.append(ep)
            time.sleep(0.3)
        except Exception as e:
            console.print(f"  [yellow]! {show_name}: {e}[/]")

    # Chronological order (newest first)
    all_episodes.sort(key=lambda e: e["release_date"], reverse=True)

    with open(EPISODES_FILE, "w") as f:
        json.dump(all_episodes, f, indent=2)

    person_counts = {}
    for ep in all_episodes:
        g = ep["guest_query"]
        if g:
            person_counts[g] = person_counts.get(g, 0) + 1

    console.print(f"\n[bold green]Saved {len(all_episodes)} unique episodes to {EPISODES_FILE}[/]\n")

    person_table = Table(title="Episodes per Personality")
    person_table.add_column("Person", style="white", width=25)
    person_table.add_column("Category", style="dim", width=18)
    person_table.add_column("Episodes", style="cyan", justify="right", width=10)
    for person in AI_PEOPLE:
        count = person_counts.get(person, 0)
        style = "green" if count > 0 else "red"
        person_table.add_row(person, PERSON_CATEGORIES.get(person, ""),
                             f"[{style}]{count}[/{style}]")
    console.print(person_table)


# ═══════════════════════════════════════════════════════════════════════════
# 2. INGEST — JSON → LanceDB (two tables: episodes + chunks)
# ═══════════════════════════════════════════════════════════════════════════

def cmd_ingest(args):
    if not Path(EPISODES_FILE).exists():
        console.print(f"[red]Run 'fetch' first — {EPISODES_FILE} not found.[/]")
        return

    with open(EPISODES_FILE) as f:
        episodes = json.load(f)

    db = get_db()

    if args.reset:
        for name in [EPISODES_TABLE, CHUNKS_TABLE]:
            try:
                db.drop_table(name)
                console.print(f"[yellow]Deleted table: {name}[/]")
            except Exception:
                pass

    # ── Episodes table (metadata store, no embedding needed) ──
    console.print(f"\n[bold cyan]Indexing {len(episodes)} episodes into LanceDB '{EPISODES_TABLE}'...[/]")

    ep_rows = []
    for ep in episodes:
        meta = episode_metadata(ep)
        meta["document"] = f"{ep['name']}\n\n{ep['description']}"
        ep_rows.append(meta)

    db.create_table(EPISODES_TABLE, ep_rows, schema=EPISODES_SCHEMA, mode="overwrite")
    ep_table = get_episodes_table(db)
    console.print(f"  [green]Episodes table: {ep_table.count_rows()} rows[/]")

    # ── Chunks table (embedded for semantic search) ──
    console.print(f"\n[bold cyan]Loading embedding model:[/] {EMBEDDING_MODEL}")
    model = SentenceTransformer(EMBEDDING_MODEL)

    chunk_rows = []

    for ep in track(episodes, description="Chunking + embedding..."):
        text = f"{ep['name']}\n\n{ep['description']}"
        if len(text.strip()) < 30:
            continue

        chunks = _split_text(text, args.chunk_size, CHUNK_OVERLAP)
        for i, chunk in enumerate(chunks):
            meta = episode_metadata(ep)
            meta["id"] = f"{ep['spotify_id']}_{i}"
            meta["text"] = chunk
            meta["vector"] = model.encode(chunk).tolist()
            meta["chunk_index"] = i
            meta["total_chunks"] = len(chunks)
            chunk_rows.append(meta)

    db.create_table(CHUNKS_TABLE, chunk_rows, mode="overwrite")
    chunk_table = get_chunks_table(db)
    console.print(f"  [green]Chunks table: {chunk_table.count_rows()} rows[/]")
    console.print(f"\n[bold green]Ingest complete.[/]\n")


# ═══════════════════════════════════════════════════════════════════════════
# 3. EXPORT — LanceDB → enriched JSON for Next.js frontend
# ═══════════════════════════════════════════════════════════════════════════

def cmd_export(args):
    try:
        ep_table = get_episodes_table()
    except Exception:
        console.print("[red]Episodes table not found — run 'ingest' first.[/]")
        return

    count = ep_table.count_rows()
    if count == 0:
        console.print("[red]Episodes table empty — run 'ingest' first.[/]")
        return

    console.print(f"\n[bold cyan]Exporting {count} episodes from LanceDB...[/]")

    rows = ep_table.to_pandas().to_dict("records")

    episodes = []
    for row in rows:
        doc = row.get("document", "")
        parts = doc.split("\n\n", 1)
        episodes.append({
            "spotify_id": row["spotify_id"],
            "name": parts[0] if parts else row.get("name", ""),
            "description": parts[1] if len(parts) > 1 else "",
            "show_name": row.get("show_name", ""),
            "show_id": row.get("show_id", ""),
            "publisher": row.get("publisher", ""),
            "release_date": row.get("release_date", ""),
            "duration_ms": 0,
            "duration_min": row.get("duration_min", 0),
            "url": row.get("url", ""),
            "image": row.get("image", ""),
            "guest_query": row.get("guest_query", ""),
            "guest_slug": row.get("guest_slug", ""),
            "category": row.get("category", ""),
        })

    episodes.sort(key=lambda e: e["release_date"], reverse=True)

    with open(EPISODES_FILE, "w") as f:
        json.dump(episodes, f, indent=2)

    console.print(f"[bold green]Exported {len(episodes)} episodes to {EPISODES_FILE}[/]\n")


# ═══════════════════════════════════════════════════════════════════════════
# 4. REFRESH — fetch + ingest + export in one go
# ═══════════════════════════════════════════════════════════════════════════

def cmd_refresh(args):
    console.print("\n[bold cyan]=== REFRESH: fetch → ingest → export ===[/]\n")
    cmd_fetch(args)
    args.reset = True
    args.chunk_size = CHUNK_SIZE
    cmd_ingest(args)
    cmd_export(args)
    console.print("[bold green]=== Refresh complete ===[/]\n")


# ═══════════════════════════════════════════════════════════════════════════
# 5. SEARCH — semantic search via LanceDB with filters
# ═══════════════════════════════════════════════════════════════════════════

class PodcastSearch:
    def __init__(self, embedding_model=EMBEDDING_MODEL):
        self.model = SentenceTransformer(embedding_model)
        db = get_db()
        self.chunks = get_chunks_table(db)
        self.episodes = get_episodes_table(db)

    def search(self, query, top_k=TOP_K, guest=None, show=None,
               date_from=None, category=None, latest_first=False,
               min_score=0.0):
        where = self._build_where(guest, show, date_from, category)
        fetch_k = top_k * 3 if latest_first else top_k
        if self.chunks.count_rows() == 0:
            return []

        q = self.chunks.search(self.model.encode(query).tolist()).metric("cosine").limit(fetch_k)
        if where:
            q = q.where(where, prefilter=True)

        raw = q.to_list()
        results = []
        seen_episodes = set()

        for row in raw:
            score = round(1 - row["_distance"], 3)
            if score < min_score:
                continue

            sid = row["spotify_id"]
            if sid in seen_episodes:
                continue
            seen_episodes.add(sid)

            results.append({
                "text": row["text"],
                "metadata": {k: row[k] for k in
                             ["spotify_id", "name", "show_name", "show_id",
                              "publisher", "release_date", "duration_min",
                              "guest_query", "guest_slug", "category", "url", "image"]},
                "score": score,
            })

        if latest_first:
            results.sort(key=lambda r: r["metadata"].get("release_date", ""), reverse=True)

        return results[:top_k]

    def find_similar(self, spotify_id, top_k=TOP_K):
        """Find episodes similar to a given episode using LanceDB."""
        rows = self.chunks.search().where(
            f"spotify_id = '{_sql_escape(spotify_id)}'", prefilter=True
        ).limit(1).to_list()
        if not rows:
            return []

        embedding = rows[0]["vector"]
        raw = self.chunks.search(embedding).metric("cosine").limit(top_k * 3).to_list()

        results = []
        seen = {spotify_id}
        for row in raw:
            sid = row["spotify_id"]
            if sid in seen:
                continue
            seen.add(sid)
            results.append({
                "text": row["text"],
                "metadata": {k: row[k] for k in
                             ["spotify_id", "name", "show_name", "show_id",
                              "publisher", "release_date", "duration_min",
                              "guest_query", "guest_slug", "category", "url", "image"]},
                "score": round(1 - row["_distance"], 3),
            })

        return results[:top_k]

    def get_by_person(self, guest_slug, limit=50):
        """Get all episodes for a person from LanceDB, chronological."""
        df = self.episodes.to_pandas()
        filtered = df[df["guest_slug"] == guest_slug].head(limit)
        episodes = filtered.to_dict("records")
        episodes.sort(key=lambda m: m.get("release_date", ""), reverse=True)
        return [{k: v for k, v in ep.items() if k != "document"} for ep in episodes]

    def get_by_category(self, category, limit=100):
        """Get all episodes for a category from LanceDB, chronological."""
        df = self.episodes.to_pandas()
        filtered = df[df["category"] == category].head(limit)
        episodes = filtered.to_dict("records")
        episodes.sort(key=lambda m: m.get("release_date", ""), reverse=True)
        return [{k: v for k, v in ep.items() if k != "document"} for ep in episodes]

    @staticmethod
    def _build_where(guest, show, date_from, category):
        conds = []
        if guest:
            conds.append(f"guest_query = '{_sql_escape(guest)}'")
        if show:
            conds.append(f"show_name = '{_sql_escape(show)}'")
        if date_from:
            conds.append(f"release_date >= '{_sql_escape(date_from)}'")
        if category:
            conds.append(f"category = '{_sql_escape(category)}'")
        if not conds:
            return None
        return " AND ".join(conds)


def _sql_escape(val: str) -> str:
    """Escape single quotes for LanceDB SQL filter expressions."""
    return val.replace("'", "''")


def cmd_search(args):
    query = " ".join(args.query)
    if not query:
        console.print("[red]Provide a search query.[/]")
        return

    searcher = PodcastSearch()
    if searcher.chunks.count_rows() == 0:
        console.print("[red]Chunks table empty — run 'ingest' first.[/]")
        return

    results = searcher.search(
        query=query, top_k=args.top_k, guest=args.guest,
        show=args.show, date_from=args.date_from,
        category=args.category, latest_first=args.latest_first,
        min_score=args.min_score,
    )

    console.print(f"\n[bold]Query:[/] {query}")
    filters = []
    if args.guest:
        filters.append(f"guest={args.guest}")
    if args.show:
        filters.append(f"show={args.show}")
    if args.category:
        filters.append(f"category={args.category}")
    if args.min_score > 0:
        filters.append(f"min_score={args.min_score}")
    if args.latest_first:
        filters.append("chronological")
    if filters:
        console.print(f"[dim]   Filters: {', '.join(filters)}[/]")
    console.print()

    if not results:
        console.print("[yellow]No results found.[/]")
        return

    for i, r in enumerate(results, 1):
        m = r["metadata"]
        subtitle_parts = []
        if m.get("guest_query"):
            subtitle_parts.append(f"Person: {m['guest_query']}")
        if m.get("category"):
            subtitle_parts.append(f"Category: {m['category']}")
        subtitle = " | ".join(subtitle_parts) if subtitle_parts else ""

        console.print(Panel(
            f"[bold]{m.get('name', '')}[/]\n\n"
            f"{r['text'][:300]}{'...' if len(r['text']) > 300 else ''}\n\n"
            f"[dim]{m.get('url', '')}[/]",
            title=(f"#{i}  [green]{m.get('show_name', '')}[/] "
                   f"[yellow]{m.get('release_date', '')}[/] "
                   f"score={r['score']} {m.get('duration_min', '?')}min"),
            subtitle=subtitle,
            border_style="cyan" if i == 1 else "dim",
        ))


# ═══════════════════════════════════════════════════════════════════════════
# 6. SIMILAR — find similar episodes via LanceDB embeddings
# ═══════════════════════════════════════════════════════════════════════════

def cmd_similar(args):
    searcher = PodcastSearch()
    results = searcher.find_similar(args.spotify_id, top_k=args.top_k)

    if not results:
        console.print(f"[yellow]No similar episodes found for {args.spotify_id}.[/]")
        return

    console.print(f"\n[bold]Similar to:[/] {args.spotify_id}\n")
    for i, r in enumerate(results, 1):
        m = r["metadata"]
        console.print(Panel(
            f"[bold]{m.get('name', '')}[/]\n\n"
            f"{r['text'][:200]}...\n\n"
            f"[dim]{m.get('url', '')}[/]",
            title=f"#{i}  [green]{m.get('show_name', '')}[/] [yellow]{m.get('release_date', '')}[/] score={r['score']}",
            border_style="cyan" if i == 1 else "dim",
        ))


# ═══════════════════════════════════════════════════════════════════════════
# 7. STATS — LanceDB table statistics
# ═══════════════════════════════════════════════════════════════════════════

def cmd_stats(args):
    db = get_db()
    try:
        ep_table = get_episodes_table(db)
        ep_count = ep_table.count_rows()
    except Exception:
        ep_count = 0
        ep_table = None
    try:
        chunk_table = get_chunks_table(db)
        chunk_count = chunk_table.count_rows()
    except Exception:
        chunk_count = 0

    console.print(f"\n[bold cyan]LanceDB Store: {LANCE_DIR}[/]\n")

    table = Table(title="Tables")
    table.add_column("Table", style="white")
    table.add_column("Rows", style="cyan", justify="right")
    table.add_row(EPISODES_TABLE, str(ep_count))
    table.add_row(CHUNKS_TABLE, str(chunk_count))
    console.print(table)

    if ep_count == 0:
        console.print("\n[dim]Run 'ingest' to populate tables.[/]\n")
        return

    ep_df = ep_table.to_pandas()

    # Per-person stats
    person_table = Table(title="\nEpisodes per Person (from LanceDB)")
    person_table.add_column("Person", style="white", width=25)
    person_table.add_column("Category", style="dim", width=18)
    person_table.add_column("Episodes", style="cyan", justify="right", width=10)

    for person in AI_PEOPLE:
        slug = PERSON_SLUGS.get(person, "")
        if not slug:
            continue
        count = int((ep_df["guest_slug"] == slug).sum())
        style = "green" if count > 0 else "red"
        person_table.add_row(person, PERSON_CATEGORIES.get(person, ""),
                             f"[{style}]{count}[/{style}]")
    console.print(person_table)

    # Per-category stats
    chunk_df = get_chunks_table(db).to_pandas() if chunk_count > 0 else None
    cat_table = Table(title="\nEpisodes per Category (from LanceDB)")
    cat_table.add_column("Category", style="white", width=20)
    cat_table.add_column("Episodes", style="cyan", justify="right", width=10)
    cat_table.add_column("Chunks", style="yellow", justify="right", width=10)

    for cat in ALL_CATEGORIES:
        ep_n = int((ep_df["category"] == cat).sum())
        ch_n = int((chunk_df["category"] == cat).sum()) if chunk_df is not None else 0
        cat_table.add_row(cat, str(ep_n), str(ch_n))
    console.print(cat_table)

    # Show distribution
    show_counts = ep_df["show_name"].value_counts()
    show_table = Table(title="\nTop Shows (from LanceDB)")
    show_table.add_column("Show", style="white", width=35)
    show_table.add_column("Episodes", style="cyan", justify="right", width=10)
    for show, count in show_counts.head(15).items():
        show_table.add_row(show, str(count))
    console.print(show_table)
    console.print()


# ═══════════════════════════════════════════════════════════════════════════
# 8. TIMELINE — chronological view from LanceDB
# ═══════════════════════════════════════════════════════════════════════════

def cmd_timeline(args):
    try:
        ep_table = get_episodes_table()
    except Exception:
        console.print("[red]Episodes table not found — run 'ingest' first.[/]")
        return

    if ep_table.count_rows() == 0:
        console.print("[red]Episodes table empty — run 'ingest' first.[/]")
        return

    ep_df = ep_table.to_pandas()
    if args.person:
        slug = PERSON_SLUGS.get(args.person, args.person)
        ep_df = ep_df[ep_df["guest_slug"] == slug]
    elif args.category:
        ep_df = ep_df[ep_df["category"] == args.category]

    episodes = ep_df.drop(columns=["document"], errors="ignore").to_dict("records")

    if not episodes:
        console.print("[yellow]No episodes found.[/]")
        return

    episodes.sort(key=lambda m: m.get("release_date", ""), reverse=True)
    if args.limit:
        episodes = episodes[:args.limit]

    title = "All Episodes (Chronological)"
    if args.person:
        title = f"{args.person} — Podcast Timeline"
    elif args.category:
        title = f"Category: {args.category} — Podcast Timeline"

    table = Table(title=title, show_lines=True)
    table.add_column("#", style="dim", width=4)
    table.add_column("Date", style="yellow", width=12)
    table.add_column("Episode", width=50)
    table.add_column("Show", style="cyan", width=25)
    table.add_column("Person", style="magenta", width=18)
    table.add_column("Min", style="dim", justify="right", width=6)

    for i, m in enumerate(episodes, 1):
        name = m.get("name", "")
        table.add_row(
            str(i),
            m.get("release_date", ""),
            name[:48] + ".." if len(name) > 50 else name,
            (m.get("show_name", ""))[:23],
            m.get("guest_query", "") or "",
            str(m.get("duration_min", "")),
        )

    console.print(f"\n")
    console.print(table)
    console.print(f"\n[dim]{len(episodes)} episodes[/]\n")


# ═══════════════════════════════════════════════════════════════════════════
# 9a. VALIDATE — fast data-quality checks (no LLM, no LanceDB)
# ═══════════════════════════════════════════════════════════════════════════

def cmd_validate(args):
    """Run data-quality checks on spotify_episodes.json. No LLM required."""
    if not Path(EPISODES_FILE).exists():
        console.print(f"[red]{EPISODES_FILE} not found — run 'fetch' first.[/]")
        return

    with open(EPISODES_FILE) as f:
        episodes = json.load(f)

    console.print(f"\n[bold cyan]Validating {len(episodes)} episodes...[/]\n")
    warnings = []
    errors = []

    # ── 1. Person coverage ──────────────────────────────────────────────
    person_eps: dict[str, list] = {slug: [] for slug in PERSON_SLUGS.values()}
    for ep in episodes:
        slug = ep.get("guest_slug")
        if slug and slug in person_eps:
            person_eps[slug].append(ep)

    covered = sum(1 for eps in person_eps.values() if eps)
    total = len(PERSON_SLUGS)
    coverage_pct = round(100 * covered / total, 1) if total else 0

    cov_table = Table(title=f"Person Coverage: {covered}/{total} ({coverage_pct}%)")
    cov_table.add_column("Person", width=25)
    cov_table.add_column("Slug", style="dim", width=22)
    cov_table.add_column("Episodes", justify="right", width=10)
    cov_table.add_column("Status", width=8)

    # Reverse lookup: slug → name
    slug_to_name = {v: k for k, v in PERSON_SLUGS.items()}
    for slug in sorted(person_eps, key=lambda s: len(person_eps[s])):
        count = len(person_eps[slug])
        name = slug_to_name.get(slug, slug)
        status = "[green]OK[/]" if count >= 3 else "[yellow]LOW[/]" if count > 0 else "[red]MISS[/]"
        cov_table.add_row(name, slug, str(count), status)
        if count == 0:
            errors.append(f"No episodes for {name} ({slug})")
        elif count < 3:
            warnings.append(f"Only {count} episode(s) for {name} ({slug})")

    console.print(cov_table)
    console.print()

    # ── 2. Duplicate detection ──────────────────────────────────────────
    id_counts: dict[str, int] = {}
    for ep in episodes:
        sid = ep["spotify_id"]
        id_counts[sid] = id_counts.get(sid, 0) + 1
    dupes = {k: v for k, v in id_counts.items() if v > 1}
    if dupes:
        errors.append(f"{len(dupes)} duplicate spotify_id(s)")
        for sid, cnt in list(dupes.items())[:5]:
            errors.append(f"  {sid} appears {cnt}x")
    else:
        console.print("[green]No duplicate episode IDs.[/]")

    # ── 3. Missing fields ───────────────────────────────────────────────
    # Episodes from show fetches have no guest_slug — separate them
    tagged = [ep for ep in episodes if ep.get("guest_slug")]
    untagged = [ep for ep in episodes if not ep.get("guest_slug")]

    core_fields = ["spotify_id", "name", "release_date"]
    optional_fields = ["show_name", "url", "image", "duration_min"]
    missing_core = 0
    missing_optional: dict[str, int] = {f: 0 for f in optional_fields}

    for ep in episodes:
        for field in core_fields:
            if not ep.get(field):
                missing_core += 1
                errors.append(f"Missing {field} in episode: {ep.get('name', '?')[:40]}")
                break
        for field in optional_fields:
            if not ep.get(field):
                missing_optional[field] += 1

    if missing_core == 0:
        console.print("[green]All core fields present.[/]")
    if untagged:
        warnings.append(f"{len(untagged)} episodes from show fetches have no guest_slug (expected)")
    for field, cnt in missing_optional.items():
        if cnt > 0:
            pct = round(100 * cnt / len(episodes), 1)
            warnings.append(f"{cnt} episodes ({pct}%) missing '{field}'")

    # ── 4. Name-match accuracy (spot-check) ─────────────────────────────
    false_positives = 0
    for ep in episodes:
        guest = ep.get("guest_query", "")
        if not guest:
            continue
        text = (ep.get("name", "") + " " + ep.get("description", "")).lower()
        variants = [guest.lower()] + PERSON_NAME_VARIANTS.get(guest, [])
        if not any(v in text for v in variants):
            false_positives += 1
            warnings.append(f"Possible false positive: '{ep['name'][:50]}' tagged as {guest}")
    if false_positives == 0:
        console.print("[green]All episodes pass name-match filter.[/]")

    # ── 5. Date sanity ──────────────────────────────────────────────────
    bad_dates = 0
    for ep in episodes:
        d = ep.get("release_date", "")
        if d and (d < "2015-01-01" or d > "2027-01-01"):
            bad_dates += 1
    if bad_dates:
        warnings.append(f"{bad_dates} episodes have suspicious dates (outside 2015-2027)")
    else:
        console.print("[green]All dates in expected range.[/]")

    # ── 6. Duration sanity ──────────────────────────────────────────────
    short_eps = [ep for ep in episodes if ep.get("duration_min", 0) < 3 and ep.get("duration_min", 0) > 0]
    long_eps = [ep for ep in episodes if ep.get("duration_min", 0) > 300]
    if short_eps:
        warnings.append(f"{len(short_eps)} episode(s) under 3 minutes (clips?)")
    if long_eps:
        warnings.append(f"{len(long_eps)} episode(s) over 5 hours")

    # ── 7. Attribution precision (compilation false positives) ──────────
    compilation_fps = []
    for ep in tagged:
        slug = ep.get("guest_slug", "")
        guest = ep.get("guest_query", "")
        if not guest:
            continue
        title = ep.get("name", "")
        desc = ep.get("description", "")
        variants = [guest.lower()] + PERSON_NAME_VARIANTS.get(guest, [])

        # Check 1: known false positive list
        if slug in KNOWN_FALSE_POSITIVES and ep["spotify_id"] in KNOWN_FALSE_POSITIVES[slug]:
            compilation_fps.append((ep, guest, "known false positive"))
            continue

        # Check 2: compilation title + name only in description
        if not any(v in title.lower() for v in variants):
            if _COMPILATION_RE.search(title):
                compilation_fps.append((ep, guest, "compilation pattern"))

    if compilation_fps:
        errors.append(f"{len(compilation_fps)} likely false positive(s) from compilation episodes")
        fp_table = Table(title=f"Attribution False Positives ({len(compilation_fps)})")
        fp_table.add_column("Guest", width=18)
        fp_table.add_column("Episode", width=50)
        fp_table.add_column("Reason", width=22)
        for ep, guest, reason in compilation_fps:
            fp_table.add_row(guest, ep["name"][:50], reason)
        console.print(fp_table)
    else:
        console.print("[green]No compilation false positives detected.[/]")

    # ── 8. Category distribution ────────────────────────────────────────
    cat_counts: dict[str, int] = {}
    for ep in episodes:
        cat = ep.get("category", "")
        if cat:
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

    cat_table = Table(title="Category Distribution")
    cat_table.add_column("Category", width=20)
    cat_table.add_column("Episodes", justify="right", width=10)
    for cat in ALL_CATEGORIES:
        cat_table.add_row(cat, str(cat_counts.get(cat, 0)))
    # Untagged (from show fetches)
    untagged = len([ep for ep in episodes if not ep.get("category")])
    if untagged:
        cat_table.add_row("[dim]untagged[/]", str(untagged))
    console.print()
    console.print(cat_table)

    # ── Summary ─────────────────────────────────────────────────────────
    console.print()
    if errors:
        console.print(f"[bold red]ERRORS ({len(errors)}):[/]")
        for e in errors:
            console.print(f"  [red]✗[/] {e}")
    if warnings:
        console.print(f"\n[bold yellow]WARNINGS ({len(warnings)}):[/]")
        for w in warnings:
            console.print(f"  [yellow]![/] {w}")
    if not errors and not warnings:
        console.print("[bold green]All checks passed![/]")
    elif not errors:
        console.print(f"\n[bold green]No errors.[/] {len(warnings)} warning(s).")
    console.print()


# ═══════════════════════════════════════════════════════════════════════════
# 9b. EVAL-FILTER — unit tests for the relevance filter (no LLM, no LanceDB)
# ═══════════════════════════════════════════════════════════════════════════

# (name_variants, title, desc, expected_accept, label)
FILTER_EVAL_CASES = [
    # ── True positives: should ACCEPT ───────────────────────────────────
    (["jerry liu"],
     "RAG Is A Hack - with Jerry Liu from LlamaIndex",
     "Jerry Liu, CEO of LlamaIndex, discusses why RAG is a hack...",
     True, "Name in title — clear guest appearance"),
    (["jerry liu"],
     "Document AI Workflows: Automating Real-World Document Work with Jerry Liu",
     "Jerry Liu discusses the shift from RAG frameworks...",
     True, "Name in title with 'with' pattern"),
    (["jerry liu"],
     "Data augmentation with LlamaIndex",
     "In this episode we talk to Jerry Liu about using LlamaIndex...",
     True, "Name in desc only, non-compilation title — accept"),
    (["boris cherny"],
     "How Claude Code Claude Codes",
     "Boris Cherny, head of Claude Code at Anthropic, explains...",
     True, "Creative title, name in desc only, not a compilation"),
    (["amanda askell"],
     "The Philosopher Teaching AI to Be Good",
     "Amanda Askell leads Claude's character design at Anthropic...",
     True, "Descriptive title about the guest, name in desc"),
    (["joao moura", "joão moura"],
     "João Moura on Multi-Agent Systems",
     "João Moura, CEO of CrewAI, discusses multi-agent systems...",
     True, "Accented name variant in title"),
    # ── True negatives: should REJECT ───────────────────────────────────
    (["jerry liu"],
     "#337 DataFramed, Distilled. The Best Moments of 2025 with Richie Cotton",
     "2025 was the year AI stopped being a curiosity... Jerry Liu joined us...",
     False, "Compilation 'Best Moments' + 'Distilled' — name only in desc"),
    (["jerry liu"],
     "The Best of DataFramed 2024: Year in Review",
     "Looking back at our favourite episodes... Jerry Liu, Harrison Chase...",
     False, "Year-in-review compilation — name among many guests"),
    (["sam altman"],
     "Top Episodes and Greatest Hits from 2025",
     "Sam Altman, Jensen Huang, and Dario Amodei all appeared this year...",
     False, "Greatest hits compilation"),
    (["boris cherny"],
     "Best of AI Podcasts 2026: Highlights and Recap",
     "Boris Cherny talked about Claude Code in episode 12...",
     False, "Highlights recap compilation"),
    (["andrej karpathy"],
     "2025 Roundup: The Biggest AI Moments",
     "Andrej Karpathy's Software 3.0 keynote was a standout...",
     False, "Roundup compilation"),
    # ── Wrong-person false positives: should REJECT ────────────────────
    (["joao moura", "joão moura"],
     "João Moura e os bifes da vazia - Extremamente Desagradável",
     "João Moura e os bifes da vazia - Extremamente Desagradável",
     False, "Different person — Portuguese cooking podcast, no AI terms"),
    (["joao moura", "joão moura"],
     "João Moura ao vivo no Coliseu",
     "João Moura ao vivo no Coliseu",
     False, "Different person — concert, trivial desc, no AI terms"),
    # ── Same-name but AI-relevant: should ACCEPT ───────────────────────
    (["joao moura", "joão moura"],
     "João Moura on Multi-Agent Systems",
     "João Moura, CEO of CrewAI, discusses multi-agent AI systems...",
     True, "Correct person — AI terms in description"),
    (["joao moura", "joão moura"],
     "CrewAI Founder João Moura",
     "CrewAI Founder João Moura",
     True, "Correct person — trivial desc but 'founder' is a tech term"),
]


def cmd_eval_filter(args):
    """Run unit tests on the relevance filter. No LLM or LanceDB required."""
    console.print("\n[bold cyan]Running relevance-filter eval...[/]\n")

    passed, failed = 0, 0
    for variants, title, desc, expected, label in FILTER_EVAL_CASES:
        result = _is_relevant_match(variants, title, desc)
        ok = result == expected
        if ok:
            passed += 1
            status = "[green]PASS[/]"
        else:
            failed += 1
            status = "[red]FAIL[/]"
        expected_str = "accept" if expected else "reject"
        actual_str = "accept" if result else "reject"
        console.print(f"  {status} [{expected_str}→{actual_str}] {label}")

    console.print(f"\n[bold]Results: {passed} passed, {failed} failed out of {passed + failed}[/]")
    if failed == 0:
        console.print("[bold green]All filter eval cases passed![/]\n")
    else:
        console.print(f"[bold red]{failed} case(s) failed.[/]\n")
    return failed


# ═══════════════════════════════════════════════════════════════════════════
# 9c. EVAL — comprehensive DeepEval suite across all categories
# ═══════════════════════════════════════════════════════════════════════════

GOLDEN_TESTS = [
    # ── Lab Leaders ─────────────────────────────────────────────────────
    {
        "input": "Sam Altman OpenAI strategy GPT models AGI",
        "expected_output": "Sam Altman discusses OpenAI's mission to build AGI safely and make it broadly beneficial.",
        "guest": "Sam Altman", "category": "lab-leaders",
    },
    {
        "input": "Dario Amodei AGI predictions timeline scaling",
        "expected_output": "Dario Amodei predicts country of geniuses in a data center within 1-3 years. 90% confident by 2035.",
        "guest": "Dario Amodei", "category": "lab-leaders",
    },
    {
        "input": "Jensen Huang NVIDIA GPU AI infrastructure data centers",
        "expected_output": "Jensen Huang on NVIDIA's role powering AI revolution with GPU infrastructure and CUDA ecosystem.",
        "guest": "Jensen Huang", "category": "lab-leaders",
    },
    {
        "input": "Liang Wenfeng DeepSeek R1 training cost efficient",
        "expected_output": "Liang Wenfeng built DeepSeek-R1 for $5.6M, challenging Western AI labs with radical efficiency.",
        "guest": "Liang Wenfeng", "category": "lab-leaders",
    },
    # ── Builders ────────────────────────────────────────────────────────
    {
        "input": "Boris Cherny future of coding AI Claude Code",
        "expected_output": "Boris Cherny predicts software engineer title disappears by 2026. 100% of his code written by Claude Code.",
        "guest": "Boris Cherny", "category": "builders",
    },
    {
        "input": "Andrej Karpathy software 3.0 programming future",
        "expected_output": "Andrej Karpathy describes Software 3.0 where natural language is the programming interface.",
        "guest": "Andrej Karpathy", "category": "builders",
    },
    {
        "input": "Harrison Chase context engineering agents LangChain",
        "expected_output": "Harrison Chase defines context engineering as bringing the right information in the right format to the LLM at the right time.",
        "guest": "Harrison Chase", "category": "builders",
    },
    {
        "input": "Jerry Liu RAG enterprise agents LlamaIndex",
        "expected_output": "Jerry Liu says best AI agents are assistive. Quantifying uncertainty critical for enterprise adoption.",
        "guest": "Jerry Liu", "category": "builders",
    },
    {
        "input": "Jerry Liu document AI workflows LlamaIndex parsing",
        "expected_output": "Jerry Liu discusses the shift from RAG frameworks to document AI workflows for real-world document processing.",
        "guest": "Jerry Liu", "category": "builders",
    },
    {
        "input": "Joao Moura CrewAI multi-agent autonomous",
        "expected_output": "Joao Moura built CrewAI into 475M+ agent automations per month for enterprise AI workflows.",
        "guest": "Joao Moura", "category": "builders",
    },
    {
        "input": "Samuel Colvin Pydantic validation Python AI",
        "expected_output": "Samuel Colvin created Pydantic, bringing type-safe validation to Python AI applications and agent frameworks.",
        "guest": "Samuel Colvin", "category": "builders",
    },
    {
        "input": "Ilya Sutskever pre-training scaling laws SSI",
        "expected_output": "Ilya Sutskever warned that the age of pre-training was ending, calling training data the fossil fuel of AI.",
        "guest": "Ilya Sutskever", "category": "builders",
    },
    # ── Researchers ─────────────────────────────────────────────────────
    {
        "input": "Geoffrey Hinton AI safety existential risk neural networks",
        "expected_output": "Geoffrey Hinton warns about existential risks from AI and the need for safety research.",
        "guest": "Geoffrey Hinton", "category": "researchers",
    },
    {
        "input": "Yann LeCun self-supervised learning Meta AI future",
        "expected_output": "Yann LeCun advocates for self-supervised learning and argues current LLM approaches are limited.",
        "guest": "Yann LeCun", "category": "researchers",
    },
    {
        "input": "Demis Hassabis AlphaFold protein structure DeepMind",
        "expected_output": "Demis Hassabis on AlphaFold solving protein structure prediction and winning the Nobel Prize.",
        "guest": "Demis Hassabis", "category": "researchers",
    },
    {
        "input": "Fei-Fei Li computer vision ImageNet spatial intelligence",
        "expected_output": "Fei-Fei Li pioneered large-scale visual recognition with ImageNet and advocates for human-centered AI.",
        "guest": "Fei-Fei Li", "category": "researchers",
    },
    # ── Hosts ───────────────────────────────────────────────────────────
    {
        "input": "Dwarkesh Patel podcast AGI scaling interviews",
        "expected_output": "Dwarkesh Patel hosts long-form technical interviews on AI scaling and AGI timelines.",
        "guest": "Dwarkesh Patel", "category": "hosts",
    },
    # ── Rising Leaders ──────────────────────────────────────────────────
    {
        "input": "Amjad Masad Replit vibe coding AI development",
        "expected_output": "Amjad Masad on AI-native development and making programming accessible through Replit.",
        "guest": "Amjad Masad", "category": "rising-leaders",
    },
    {
        "input": "Mustafa Suleyman DeepMind Inflection Microsoft AI",
        "expected_output": "Mustafa Suleyman on the journey from co-founding DeepMind to leading Microsoft AI.",
        "guest": "Mustafa Suleyman", "category": "rising-leaders",
    },
    {
        "input": "Amanda Askell Claude personality alignment Anthropic",
        "expected_output": "Amanda Askell leads Claude's character design and discusses AI alignment and prompt engineering philosophy.",
        "guest": "Amanda Askell", "category": "rising-leaders",
    },
    {
        "input": "Noam Shazeer Transformer architecture attention mechanism",
        "expected_output": "Noam Shazeer co-authored the Transformer paper introducing the attention mechanism that powers modern AI.",
        "guest": "Noam Shazeer", "category": "rising-leaders",
    },
    # ── Infrastructure ──────────────────────────────────────────────────
    {
        "input": "Woosuk Kwon vLLM inference optimization serving",
        "expected_output": "Woosuk Kwon co-created vLLM, the most adopted open-source LLM inference engine.",
        "guest": "Woosuk Kwon", "category": "infrastructure",
    },
    {
        "input": "Swami Sivasubramanian AWS Bedrock SageMaker agentic AI",
        "expected_output": "Swami Sivasubramanian built DynamoDB, SageMaker, and Bedrock at AWS with 250+ patents.",
        "guest": "Swami Sivasubramanian", "category": "infrastructure",
    },
    {
        "input": "Alex Atallah OpenRouter LLM API aggregation",
        "expected_output": "Alex Atallah co-founded OpenRouter to aggregate 400+ LLMs behind a single API.",
        "guest": "Alex Atallah", "category": "infrastructure",
    },
    {
        "input": "Rohit Agarwal Portkey AI gateway production",
        "expected_output": "Rohit Agarwal built Portkey as a unified control plane for production AI applications.",
        "guest": "Rohit Agarwal", "category": "infrastructure",
    },
    # ── Vector DBs ──────────────────────────────────────────────────────
    {
        "input": "Jeff Huber Chroma embeddings vector database AI",
        "expected_output": "Jeff Huber built Chroma as the leading open-source AI-native embeddings database.",
        "guest": "Jeff Huber", "category": "vector-dbs",
    },
    {
        "input": "Bob van Luijt Weaviate vector search semantic",
        "expected_output": "Bob van Luijt built Weaviate into a central AI infrastructure component for vector search.",
        "guest": "Bob van Luijt", "category": "vector-dbs",
    },
    {
        "input": "Andre Zayarni Qdrant vector search Rust",
        "expected_output": "Andre Zayarni built Qdrant as a purpose-built open-source vector search engine written in Rust.",
        "guest": "Andre Zayarni", "category": "vector-dbs",
    },
    {
        "input": "Vasilije Markovic Cognee AI memory graph",
        "expected_output": "Vasilije Markovic built Cognee as an open-source AI memory engine combining graph and vector databases.",
        "guest": "Vasilije Markovic", "category": "vector-dbs",
    },
    {
        "input": "Shay Banon Elasticsearch search infrastructure",
        "expected_output": "Shay Banon created Elasticsearch and built Elastic into a public company.",
        "guest": "Shay Banon", "category": "vector-dbs",
    },
]


def cmd_eval(args):
    from deepeval import evaluate as deepeval_run
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import (
        ContextualPrecisionMetric,
        ContextualRecallMetric,
        ContextualRelevancyMetric,
        FaithfulnessMetric,
        AnswerRelevancyMetric,
    )

    searcher = PodcastSearch()
    if searcher.chunks.count_rows() == 0:
        console.print("[red]Chunks table empty — run 'ingest' first.[/]")
        return

    tests = GOLDEN_TESTS
    if args.category:
        tests = [t for t in tests if t.get("category") == args.category]
        console.print(f"[dim]Running eval for category: {args.category} ({len(tests)} tests)[/]")
    if args.guest:
        tests = [t for t in tests if t.get("guest") == args.guest]
        console.print(f"[dim]Running eval for guest: {args.guest} ({len(tests)} tests)[/]")

    if not tests:
        console.print("[red]No matching test cases.[/]")
        return

    cases = []
    for tc in track(tests, description="Building test cases from LanceDB..."):
        results = searcher.search(
            tc["input"], top_k=args.top_k, guest=tc.get("guest"),
        )
        ctx = [r["text"] for r in results]
        if not ctx:
            console.print(f"  [yellow]No results for: {tc['input'][:50]}...[/]")
            continue
        cases.append(LLMTestCase(
            input=tc["input"],
            actual_output=ctx[0],
            retrieval_context=ctx,
            expected_output=tc["expected_output"],
        ))

    if not cases:
        console.print("[red]No test cases could be built.[/]")
        return

    console.print(f"\n[bold cyan]Running DeepEval with {len(cases)} test cases...[/]\n")

    metrics = [
        ContextualPrecisionMetric(threshold=0.7),
        ContextualRecallMetric(threshold=0.7),
        ContextualRelevancyMetric(threshold=0.7),
    ]

    if args.full:
        metrics.extend([
            FaithfulnessMetric(threshold=0.7),
            AnswerRelevancyMetric(threshold=0.7),
        ])

    deepeval_run(cases, metrics=metrics)


# ═══════════════════════════════════════════════════════════════════════════
# 10. TUNE — sweep chunk_size × top_k with DeepEval scoring
# ═══════════════════════════════════════════════════════════════════════════

def cmd_tune(args):
    from deepeval.test_case import LLMTestCase
    from deepeval.metrics import ContextualRelevancyMetric, ContextualPrecisionMetric

    db = get_db()
    model = SentenceTransformer(EMBEDDING_MODEL)

    if not Path(EPISODES_FILE).exists():
        console.print("[red]Run 'fetch' first.[/]")
        return

    with open(EPISODES_FILE) as f:
        episodes = json.load(f)

    chunk_sizes = [300, 500, 800]
    top_ks = [3, 5, 7, 10]

    table = Table(title="Tuning: chunk_size x top_k (Relevancy | Precision)", show_lines=True)
    table.add_column("chunk_size", justify="center", style="bold")
    for k in top_ks:
        table.add_column(f"k={k}", justify="center", width=18)

    for cs in chunk_sizes:
        temp_name = f"tune_cs{cs}"
        try:
            db.drop_table(temp_name)
        except Exception:
            pass

        rows = []
        for ep in episodes:
            text = f"{ep['name']}\n\n{ep['description']}"
            if len(text.strip()) < 30:
                continue
            for i, chunk in enumerate(_split_text(text, cs, 80)):
                meta = episode_metadata(ep)
                meta["id"] = f"{ep['spotify_id']}_{i}"
                meta["text"] = chunk
                meta["vector"] = model.encode(chunk).tolist()
                rows.append(meta)

        temp_table = db.create_table(temp_name, rows, mode="overwrite")

        row_data = [str(cs)]
        for k in top_ks:
            rel_scores, prec_scores = [], []
            rel_metric = ContextualRelevancyMetric(threshold=0.7)
            prec_metric = ContextualPrecisionMetric(threshold=0.7)

            for tc in GOLDEN_TESTS[:5]:  # use first 5 for speed
                query_emb = model.encode(tc["input"]).tolist()

                q = temp_table.search(query_emb).metric("cosine").limit(k)
                if tc.get("guest"):
                    q = q.where(f"guest_query = '{_sql_escape(tc['guest'])}'", prefilter=True)

                raw = q.to_list()
                ctx = [r["text"] for r in raw]
                if not ctx:
                    continue

                case = LLMTestCase(
                    input=tc["input"], actual_output=ctx[0],
                    retrieval_context=ctx, expected_output=tc["expected_output"],
                )
                try:
                    rel_metric.measure(case)
                    rel_scores.append(rel_metric.score)
                except Exception:
                    pass
                try:
                    prec_metric.measure(case)
                    prec_scores.append(prec_metric.score)
                except Exception:
                    pass

            rel_avg = f"{sum(rel_scores)/len(rel_scores):.2f}" if rel_scores else "—"
            prec_avg = f"{sum(prec_scores)/len(prec_scores):.2f}" if prec_scores else "—"
            row_data.append(f"[yellow]{rel_avg}[/] | [cyan]{prec_avg}[/]")

        table.add_row(*row_data)

        try:
            db.drop_table(temp_name)
        except Exception:
            pass

    console.print(table)


# ═══════════════════════════════════════════════════════════════════════════
# 11. SERVE — local HTTP API wrapping LanceDB for the Next.js frontend
# ═══════════════════════════════════════════════════════════════════════════

class PodcastAPIHandler(BaseHTTPRequestHandler):
    searcher = None

    def do_GET(self):
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)

        if parsed.path == "/api/search":
            self._handle_search(qs)
        elif parsed.path == "/api/person":
            self._handle_person(qs)
        elif parsed.path == "/api/category":
            self._handle_category(qs)
        elif parsed.path == "/api/similar":
            self._handle_similar(qs)
        elif parsed.path == "/api/stats":
            self._handle_stats()
        else:
            self._json_response({"endpoints": [
                "/api/search?q=...&top_k=5&guest=...&show=...&category=...&latest_first=1",
                "/api/person?slug=boris-cherny",
                "/api/category?slug=builders",
                "/api/similar?id=<spotify_id>",
                "/api/stats",
            ]})

    def _handle_search(self, qs):
        query = qs.get("q", [""])[0]
        if not query:
            self._json_response({"error": "q parameter required"}, 400)
            return
        results = self.searcher.search(
            query=query,
            top_k=int(qs.get("top_k", ["5"])[0]),
            guest=qs.get("guest", [None])[0],
            show=qs.get("show", [None])[0],
            category=qs.get("category", [None])[0],
            latest_first=qs.get("latest_first", ["0"])[0] == "1",
        )
        self._json_response({"results": results, "count": len(results)})

    def _handle_person(self, qs):
        slug = qs.get("slug", [""])[0]
        if not slug:
            self._json_response({"error": "slug parameter required"}, 400)
            return
        episodes = self.searcher.get_by_person(slug)
        self._json_response({"episodes": episodes, "count": len(episodes)})

    def _handle_category(self, qs):
        slug = qs.get("slug", [""])[0]
        if not slug:
            self._json_response({"error": "slug parameter required"}, 400)
            return
        episodes = self.searcher.get_by_category(slug)
        self._json_response({"episodes": episodes, "count": len(episodes)})

    def _handle_similar(self, qs):
        spotify_id = qs.get("id", [""])[0]
        if not spotify_id:
            self._json_response({"error": "id parameter required"}, 400)
            return
        results = self.searcher.find_similar(spotify_id,
                                              top_k=int(qs.get("top_k", ["5"])[0]))
        self._json_response({"results": results, "count": len(results)})

    def _handle_stats(self):
        ep_count = self.searcher.episodes.count_rows()
        chunk_count = self.searcher.chunks.count_rows()
        self._json_response({
            "episodes": ep_count,
            "chunks": chunk_count,
            "embedding_model": EMBEDDING_MODEL,
        })

    def _json_response(self, data, status=200):
        body = json.dumps(data, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *a):
        console.print(f"[dim]{self.address_string()} {format % a}[/]")


def cmd_serve(args):
    PodcastAPIHandler.searcher = PodcastSearch()
    server = HTTPServer(("127.0.0.1", args.port), PodcastAPIHandler)
    console.print(f"\n[bold green]Podcast API running on http://127.0.0.1:{args.port}[/]")
    console.print("[dim]Endpoints: /api/search, /api/person, /api/similar, /api/category, /api/stats[/]\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        console.print("\n[dim]Shutting down.[/]")


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="AI Podcast Search — local-first LanceDB + DeepEval pipeline")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("fetch", help="Spotify API → local JSON")

    p_ingest = sub.add_parser("ingest", help="JSON → LanceDB (episodes + chunks)")
    p_ingest.add_argument("--reset", action="store_true", help="Delete existing collections first")
    p_ingest.add_argument("--chunk-size", type=int, default=CHUNK_SIZE)

    sub.add_parser("export", help="LanceDB → enriched JSON for Next.js")
    sub.add_parser("refresh", help="fetch + ingest + export in one go")

    p_search = sub.add_parser("search", help="Semantic search via LanceDB")
    p_search.add_argument("query", nargs="+")
    p_search.add_argument("--top-k", type=int, default=TOP_K)
    p_search.add_argument("--guest", help="Filter by person name")
    p_search.add_argument("--show", help="Filter by show name")
    p_search.add_argument("--category", help="Filter by category slug")
    p_search.add_argument("--date-from", help="From date YYYY-MM-DD")
    p_search.add_argument("--latest-first", action="store_true")
    p_search.add_argument("--min-score", type=float, default=0.0,
                          help="Minimum similarity score (0-1)")

    p_similar = sub.add_parser("similar", help="Find similar episodes via LanceDB embeddings")
    p_similar.add_argument("spotify_id", help="Source episode Spotify ID")
    p_similar.add_argument("--top-k", type=int, default=TOP_K)

    sub.add_parser("stats", help="LanceDB table statistics")

    p_timeline = sub.add_parser("timeline", help="Chronological view from LanceDB")
    p_timeline.add_argument("--person", help="Filter by person name")
    p_timeline.add_argument("--category", help="Filter by category slug")
    p_timeline.add_argument("--limit", type=int, help="Max episodes")

    sub.add_parser("validate", help="Fast data-quality checks on episodes JSON (no LLM)")
    sub.add_parser("eval-filter", help="Unit tests for the relevance filter (no LLM)")

    p_eval = sub.add_parser("eval", help=f"DeepEval suite ({len(GOLDEN_TESTS)} golden tests across all categories)")
    p_eval.add_argument("--top-k", type=int, default=TOP_K)
    p_eval.add_argument("--category", help="Run only tests for this category")
    p_eval.add_argument("--guest", help="Run only tests for this guest")
    p_eval.add_argument("--full", action="store_true",
                        help="Include Faithfulness + AnswerRelevancy metrics")

    sub.add_parser("tune", help="Sweep chunk_size x top_k with DeepEval")

    p_serve = sub.add_parser("serve", help="Local HTTP API wrapping LanceDB")
    p_serve.add_argument("--port", type=int, default=3939)

    args = parser.parse_args()
    cmds = {
        "fetch": cmd_fetch, "ingest": cmd_ingest, "export": cmd_export,
        "refresh": cmd_refresh, "search": cmd_search, "similar": cmd_similar,
        "stats": cmd_stats, "timeline": cmd_timeline,
        "validate": cmd_validate, "eval-filter": cmd_eval_filter,
        "eval": cmd_eval, "tune": cmd_tune, "serve": cmd_serve,
    }

    if args.command in cmds:
        cmds[args.command](args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
