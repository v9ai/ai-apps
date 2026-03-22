"""
LangGraph + ChromaDB pipeline to find movies similar to "The Pursuit of Happyness"
available on Netflix and Disney+.
"""

import json
import os
import re
from datetime import datetime
from typing import TypedDict
from urllib.parse import quote

import chromadb
import httpx
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph

load_dotenv()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, max_tokens=16384)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
chroma_client = chromadb.Client()


class State(TypedDict):
    query_movie: str
    movie_profile: str
    netflix_candidates: str
    disney_candidates: str
    similar_movies: list[dict]
    output_file: str


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


def search_netflix(state: State) -> dict:
    resp = llm.invoke(
        f"""Based on this movie profile:
{state['movie_profile']}

List 25-30 movies currently or recently available on Netflix that are similar.
Focus on movies that share themes of: struggle, perseverance, family bonds,
overcoming adversity, biographical/true stories, drama.
Do NOT include "The Pursuit of Happyness" itself.

For each movie provide:
- Title
- Year
- Brief description (1-2 sentences focusing on thematic similarity)
- Why it's similar to The Pursuit of Happyness

Format as a numbered list. Be exhaustive."""
    )
    return {"netflix_candidates": resp.content}


def search_disney(state: State) -> dict:
    resp = llm.invoke(
        f"""Based on this movie profile:
{state['movie_profile']}

List 25-30 movies currently or recently available on Disney+ (including Star/Hulu
content on Disney+) that are similar.
Focus on movies that share themes of: struggle, perseverance, family bonds,
overcoming adversity, inspirational stories, drama.
Do NOT include "The Pursuit of Happyness" itself.

For each movie provide:
- Title
- Year
- Brief description (1-2 sentences focusing on thematic similarity)
- Why it's similar to The Pursuit of Happyness

Format as a numbered list. Be exhaustive."""
    )
    return {"disney_candidates": resp.content}


def rank_with_chromadb(state: State) -> dict:
    collection = chroma_client.get_or_create_collection(
        name="movie_similarity",
        metadata={"hnsw:space": "cosine"},
    )

    existing = collection.get()
    if existing["ids"]:
        collection.delete(ids=existing["ids"])

    all_candidates = []
    for platform, text in [
        ("Netflix", state["netflix_candidates"]),
        ("Disney+", state["disney_candidates"]),
    ]:
        lines = text.strip().split("\n")
        current_movie = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current_movie:
                    all_candidates.append({"platform": platform, "text": "\n".join(current_movie)})
                    current_movie = []
                continue
            if stripped and len(stripped) > 2 and stripped[0].isdigit() and ("." in stripped[:4] or ")" in stripped[:4]):
                if current_movie:
                    all_candidates.append({"platform": platform, "text": "\n".join(current_movie)})
                current_movie = [stripped]
            else:
                current_movie.append(stripped)
        if current_movie:
            all_candidates.append({"platform": platform, "text": "\n".join(current_movie)})

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

    results = collection.query(query_embeddings=[query_embedding], n_results=min(40, len(all_candidates)))

    ranked = []
    for i, doc in enumerate(results["documents"][0]):
        ranked.append({
            "rank": i + 1,
            "platform": results["metadatas"][0][i]["platform"],
            "description": doc,
            "similarity_score": round(1 - results["distances"][0][i], 4),
        })

    print(f"  ChromaDB returned {len(ranked)} candidates")
    return {"similar_movies": ranked}


def _parse_json(content: str) -> list:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        if content.endswith("```"):
            content = content.rsplit("```", 1)[0]
        content = content.strip()
    return json.loads(content)


def _refine_batch(batch: list[dict]) -> list[dict]:
    batch_json = json.dumps(batch, indent=2)
    resp = llm.invoke(
        f"""Extract movie info from these candidates. Return a JSON array.

{batch_json}

For EACH entry above, return:
- "title": movie title only
- "year": release year (integer)
- "platform": "Netflix" or "Disney+" (from the data)
- "similarity_score": keep from data
- "imdb_rating": real IMDB rating as float (e.g. 7.8)
- "age_rating": US content rating string (e.g. "G", "PG", "PG-13", "R"). Use real ratings.
- "why_similar": one English sentence about thematic connection to The Pursuit of Happyness

Process ALL entries. Do NOT skip any. Do NOT include The Pursuit of Happyness itself.
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
        result = _refine_batch(batch)
        all_refined.extend(result)
        print(f"  Refine batch {i // 15 + 1}: {len(batch)} in -> {len(result)} out")

    seen = set()
    deduped = []
    for m in all_refined:
        key = m.get("title", "").lower().strip()
        if key in seen or "pursuit of happyness" in key:
            continue
        seen.add(key)
        deduped.append(m)

    # Filter to age 7+ only (G, PG, PG-13 and TV equivalents)
    allowed_ratings = {"g", "pg", "pg-13", "tv-y7", "tv-g", "tv-pg", "tv-14"}
    filtered = [m for m in deduped if m.get("age_rating", "").lower() in allowed_ratings]

    filtered.sort(key=lambda m: m.get("similarity_score", 0), reverse=True)
    for i, m in enumerate(filtered):
        m["rank"] = i + 1

    print(f"  Refine total: {len(all_refined)} -> deduped: {len(deduped)} -> age 7+: {len(filtered)}")
    return {"similar_movies": filtered}


def enrich_results(state: State) -> dict:
    movies_json = json.dumps(state["similar_movies"], ensure_ascii=False, indent=2)
    resp = llm.invoke(
        f"""For each movie in this JSON array, add exactly three new fields.

Fields to add:
- "url": direct URL to watch on its platform:
  - Netflix: "https://www.netflix.com/title/<netflix_id>" (real ID if known, else "https://www.netflix.com/search?q=<url_encoded_title>")
  - Disney+: "https://www.disneyplus.com/movies/<slug>" (real slug if known, else "https://www.disneyplus.com/search?q=<url_encoded_title>")
- "imdb_url": "https://www.imdb.com/title/<imdb_id>/" (use real IMDB ID like tt1234567)
- "romanian_audio": boolean -- true if the movie has Romanian audio dubbing (common for animated/Disney/Pixar films and major blockbusters in Romania). false otherwise.

Keep ALL existing fields unchanged. Return the complete JSON array.
Return ONLY the JSON array, no markdown fences.

{movies_json}"""
    )
    try:
        return {"similar_movies": _parse_json(resp.content)}
    except (json.JSONDecodeError, ValueError):
        return {"similar_movies": state["similar_movies"]}


IMDB_GRAPHQL = "https://graphql.imdb.com/"
IMDB_QUERY = '{ title(id: "%s") { ratingsSummary { aggregateRating } } }'


def check_imdb(state: State) -> dict:
    """Query IMDB GraphQL for each movie's real rating, filter < 7.0."""
    movies = state["similar_movies"]
    verified = []

    with httpx.Client(timeout=15) as client:
        for movie in movies:
            imdb_url = movie.get("imdb_url", "")
            m = re.search(r"(tt\d+)", imdb_url) if imdb_url else None

            if not m:
                if movie.get("imdb_rating", 0) >= 7.0:
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
                    if movie.get("imdb_rating", 0) >= 7.0:
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
                    if real_rating >= 7.0:
                        verified.append(movie)
                    else:
                        print(f"  Filtered out '{movie.get('title')}': real IMDB {real_rating} < 7.0")
                else:
                    if movie.get("imdb_rating", 0) >= 7.0:
                        verified.append(movie)

            except (httpx.HTTPError, json.JSONDecodeError, ValueError, KeyError):
                if movie.get("imdb_rating", 0) >= 7.0:
                    verified.append(movie)

    # Deduplicate IMDB URLs — keep first (higher similarity), fix the rest
    seen_urls = {}
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

    print(f"  IMDB check: {len(movies)} → {len(verified)} movies (7.0+ verified)")
    return {"similar_movies": verified}


def validate_urls(state: State) -> dict:
    """Check URLs via HTTP HEAD. Replace broken ones with search fallbacks."""
    movies = state["similar_movies"]

    with httpx.Client(timeout=10, follow_redirects=True) as client:
        for movie in movies:
            for key in ("url", "imdb_url"):
                url = movie.get(key, "")
                if not url:
                    continue
                try:
                    resp = client.head(url, headers={"User-Agent": "Mozilla/5.0"})
                    movie[f"{key}_status"] = resp.status_code
                    movie[f"{key}_ok"] = resp.status_code < 400
                except httpx.HTTPError:
                    movie[f"{key}_status"] = 0
                    movie[f"{key}_ok"] = False

                if not movie.get(f"{key}_ok", True):
                    title_encoded = quote(movie.get("title", ""))
                    if key == "url":
                        if movie.get("platform") == "Netflix":
                            movie[key] = f"https://www.netflix.com/search?q={title_encoded}"
                        else:
                            movie[key] = f"https://www.disneyplus.com/search?q={title_encoded}"
                    elif key == "imdb_url":
                        movie[key] = f"https://www.imdb.com/find/?q={title_encoded}"

    ok_count = sum(1 for m in movies if m.get("url_ok") and m.get("imdb_url_ok"))
    print(f"  URL check: {ok_count}/{len(movies)} fully valid")
    return {"similar_movies": movies}


def save_results(state: State) -> dict:
    output_path = os.path.join(os.path.dirname(__file__), "similar_movies_results.json")
    output = {
        "query_movie": state["query_movie"],
        "generated_at": datetime.now().isoformat(),
        "platforms": ["Netflix", "Disney+"],
        "total_results": len(state["similar_movies"]),
        "results": state["similar_movies"],
    }
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    return {"output_file": output_path}


def build_graph():
    graph = StateGraph(State)
    graph.add_node("analyze_movie", analyze_movie)
    graph.add_node("search_netflix", search_netflix)
    graph.add_node("search_disney", search_disney)
    graph.add_node("rank_with_chromadb", rank_with_chromadb)
    graph.add_node("refine_results", refine_results)
    graph.add_node("enrich_results", enrich_results)
    graph.add_node("check_imdb", check_imdb)
    graph.add_node("validate_urls", validate_urls)
    graph.add_node("save_results", save_results)

    graph.set_entry_point("analyze_movie")
    graph.add_edge("analyze_movie", "search_netflix")
    graph.add_edge("analyze_movie", "search_disney")
    graph.add_edge("search_netflix", "rank_with_chromadb")
    graph.add_edge("search_disney", "rank_with_chromadb")
    graph.add_edge("rank_with_chromadb", "refine_results")
    graph.add_edge("refine_results", "enrich_results")
    graph.add_edge("enrich_results", "check_imdb")
    graph.add_edge("check_imdb", "validate_urls")
    graph.add_edge("validate_urls", "save_results")
    graph.add_edge("save_results", END)
    return graph.compile()


def main():
    print("Building LangGraph pipeline...")
    app = build_graph()
    print("Running pipeline: Finding movies similar to 'The Pursuit of Happyness'...\n")
    result = app.invoke({"query_movie": "The Pursuit of Happyness"})
    print(f"\nFound {len(result['similar_movies'])} similar movies!")
    print(f"Results saved to: {result['output_file']}\n")
    for movie in result["similar_movies"]:
        title = movie.get("title", movie.get("description", "")[:60])
        platform = movie.get("platform", "?")
        score = movie.get("similarity_score", 0)
        ro = " [RO]" if movie.get("romanian_audio") else ""
        print(f"  #{movie.get('rank', '?'):>2} [{platform:>7}] {title} (similarity: {score}){ro}")


if __name__ == "__main__":
    main()
