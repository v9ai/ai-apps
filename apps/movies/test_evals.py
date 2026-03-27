"""
Evals for the movie similarity pipeline.
Tests run against the saved results file (similar_movies_results.json).

Run with: uv run pytest test_evals.py -v
"""

import json
import os
import re

import pytest

RESULTS_PATH = os.path.join(os.path.dirname(__file__), "similar_movies_results.json")
VALID_PLATFORMS = {"Netflix", "Disney+"}


@pytest.fixture(scope="module")
def results():
    assert os.path.exists(RESULTS_PATH), f"Results file not found: {RESULTS_PATH}"
    with open(RESULTS_PATH) as f:
        return json.load(f)


@pytest.fixture(scope="module")
def movies(results):
    return results["results"]


@pytest.fixture(scope="module")
def query_movie(results):
    return results["query_movie"]


class TestSchema:
    def test_top_level_keys(self, results):
        required = {"query_movie", "generated_at", "platforms", "total_results", "results"}
        assert required.issubset(results.keys())

    def test_query_movie_is_string(self, results):
        assert isinstance(results["query_movie"], str)
        assert len(results["query_movie"]) > 0

    def test_platforms_are_netflix_and_disney(self, results):
        assert set(results["platforms"]) == {"Netflix", "Disney+"}

    def test_total_results_matches(self, results, movies):
        assert results["total_results"] == len(movies)

    def test_movie_fields(self, movies):
        required = {
            "rank", "title", "year", "platform", "similarity_score", "final_score",
            "imdb_rating", "age_rating", "why_similar", "url", "imdb_url",
            "romanian_audio", "genre", "director",
        }
        for m in movies:
            missing = required - set(m.keys())
            assert not missing, f"'{m.get('title', '?')}' missing: {missing}"

    def test_ranks_sequential(self, movies):
        assert [m["rank"] for m in movies] == list(range(1, len(movies) + 1))

    def test_year_plausible(self, movies):
        for m in movies:
            assert 1920 <= m["year"] <= 2027, f"Implausible year {m['year']} for '{m['title']}'"

    def test_age_rating_7plus(self, movies):
        allowed = {"G", "PG", "PG-13", "TV-Y7", "TV-G", "TV-PG", "TV-14"}
        for m in movies:
            assert m["age_rating"] in allowed, \
                f"'{m['title']}' rating '{m['age_rating']}' not in {allowed}"

    def test_genre_is_nonempty_list(self, movies):
        for m in movies:
            assert isinstance(m["genre"], list) and len(m["genre"]) >= 1, \
                f"Bad genre for '{m['title']}': {m.get('genre')}"

    def test_director_is_string(self, movies):
        for m in movies:
            assert isinstance(m["director"], str), \
                f"director not a string for '{m['title']}'"

    def test_min_rating_in_metadata(self, results):
        assert "min_rating" in results
        assert isinstance(results["min_rating"], (int, float))


class TestQuantity:
    def test_minimum_10_results(self, movies):
        assert len(movies) >= 10, f"Expected ≥10 movies, got {len(movies)}"

    def test_both_platforms_present(self, movies):
        platforms = {m["platform"] for m in movies}
        assert "Netflix" in platforms
        assert "Disney+" in platforms


class TestDeduplication:
    def test_no_duplicate_titles(self, movies):
        titles = [m["title"].lower().strip() for m in movies]
        dupes = [t for t in set(titles) if titles.count(t) > 1]
        assert not dupes, f"Duplicate titles: {dupes}"

    def test_query_movie_excluded(self, movies, query_movie):
        q = query_movie.lower().strip()
        for m in movies:
            assert m["title"].lower().strip() != q, \
                f"Query movie in results: '{m['title']}'"


class TestSimilarity:
    def test_similarity_scores_in_range(self, movies):
        for m in movies:
            assert 0 <= m["similarity_score"] <= 1, \
                f"similarity_score={m['similarity_score']} out of range for '{m['title']}'"

    def test_final_scores_in_range(self, movies):
        for m in movies:
            assert 0 <= m["final_score"] <= 1, \
                f"final_score={m['final_score']} out of range for '{m['title']}'"

    def test_final_scores_descending(self, movies):
        scores = [m["final_score"] for m in movies]
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], \
                f"final_score not descending at rank {i + 1}: {scores[i]} < {scores[i + 1]}"

    def test_top_score_above_threshold(self, movies):
        assert movies[0]["final_score"] >= 0.2, \
            f"Top final_score too low: {movies[0]['final_score']}"


class TestURLs:
    def test_url_https(self, movies):
        for m in movies:
            assert m["url"].startswith("https://"), f"Non-HTTPS url for '{m['title']}'"

    def test_url_domain_matches_platform(self, movies):
        for m in movies:
            if m["platform"] == "Netflix":
                assert "netflix.com" in m["url"], f"Netflix URL wrong: {m['url']}"
            elif m["platform"] == "Disney+":
                assert "disneyplus.com" in m["url"], f"Disney+ URL wrong: {m['url']}"

    def test_imdb_url_format(self, movies):
        for m in movies:
            assert m["imdb_url"].startswith("https://www.imdb.com/"), \
                f"Bad IMDB URL for '{m['title']}': {m['imdb_url']}"

    def test_imdb_urls_unique(self, movies):
        urls = [m["imdb_url"] for m in movies]
        assert len(urls) == len(set(urls)), "Duplicate IMDB URLs"


class TestRatings:
    def test_imdb_above_min(self, results, movies):
        min_r = results.get("min_rating", 7.0)
        for m in movies:
            assert m["imdb_rating"] >= min_r - 0.5, \
                f"'{m['title']}' rating {m['imdb_rating']} well below min {min_r}"

    def test_imdb_rating_numeric(self, movies):
        for m in movies:
            assert isinstance(m["imdb_rating"], (int, float)), \
                f"imdb_rating not numeric for '{m['title']}'"


class TestRomanianAudio:
    def test_boolean(self, movies):
        for m in movies:
            assert isinstance(m["romanian_audio"], bool), \
                f"romanian_audio not bool for '{m['title']}'"

    def test_at_least_one(self, movies):
        assert any(m["romanian_audio"] for m in movies), \
            "Expected at least 1 movie with Romanian audio"


class TestEnglishOutput:
    def test_why_similar_english(self, movies):
        english = {"the", "and", "of", "in", "a", "is", "to", "with", "that", "for"}
        count = sum(
            1 for m in movies
            if len(set(re.findall(r'\b\w+\b', m["why_similar"].lower())) & english) >= 2
        )
        ratio = count / len(movies)
        assert ratio >= 0.8, f"Only {count}/{len(movies)} ({ratio:.0%}) why_similar are English"


class TestPlatformCoverage:
    def test_platform_values_valid(self, movies):
        for m in movies:
            assert m["platform"] in VALID_PLATFORMS, f"Invalid platform '{m['platform']}'"

    def test_balanced_distribution(self, movies):
        netflix_ratio = sum(1 for m in movies if m["platform"] == "Netflix") / len(movies)
        assert 0.10 <= netflix_ratio <= 0.90, \
            f"Imbalanced platform split: Netflix={netflix_ratio:.0%}"
