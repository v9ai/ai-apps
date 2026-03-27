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
VALID_PLATFORMS = {"Netflix", "Disney+", "Prime Video", "Apple TV+"}


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

    def test_platforms_listed(self, results):
        assert isinstance(results["platforms"], list)
        assert len(results["platforms"]) >= 1
        for p in results["platforms"]:
            assert p in VALID_PLATFORMS, f"Unknown platform in results: {p}"

    def test_total_results_matches(self, results, movies):
        assert results["total_results"] == len(movies)

    def test_movie_fields(self, movies):
        required_fields = {
            "rank", "title", "year", "platform", "similarity_score",
            "imdb_rating", "age_rating", "why_similar", "url", "imdb_url", "romanian_audio",
        }
        for movie in movies:
            missing = required_fields - set(movie.keys())
            assert not missing, f"Movie '{movie.get('title', '?')}' missing fields: {missing}"

    def test_new_fields_present(self, movies):
        """genre and director fields added in enhanced version."""
        for movie in movies:
            assert "genre" in movie, f"Missing 'genre' field for '{movie.get('title', '?')}'"
            assert "director" in movie, f"Missing 'director' field for '{movie.get('title', '?')}'"

    def test_genre_is_list(self, movies):
        for movie in movies:
            assert isinstance(movie.get("genre"), list), \
                f"'genre' should be a list for '{movie.get('title', '?')}'"
            assert len(movie["genre"]) >= 1, \
                f"'genre' list is empty for '{movie.get('title', '?')}'"

    def test_director_is_string(self, movies):
        for movie in movies:
            assert isinstance(movie.get("director"), str), \
                f"'director' should be a string for '{movie.get('title', '?')}'"

    def test_ranks_sequential(self, movies):
        ranks = [m["rank"] for m in movies]
        assert ranks == list(range(1, len(movies) + 1)), "Ranks should be sequential 1..N"

    def test_year_is_plausible(self, movies):
        for m in movies:
            assert 1920 <= m["year"] <= 2027, f"Year {m['year']} for '{m['title']}' is implausible"

    def test_age_rating_is_7_plus(self, movies):
        allowed = {"G", "PG", "PG-13", "TV-Y7", "TV-G", "TV-PG", "TV-14"}
        for m in movies:
            assert m["age_rating"] in allowed, \
                f"'{m['title']}' has age rating '{m['age_rating']}' (expected 7+ suitable: {allowed})"

    def test_min_rating_in_metadata(self, results):
        assert "min_rating" in results, "min_rating should be stored in output metadata"
        assert isinstance(results["min_rating"], (int, float))


class TestQuantity:
    def test_minimum_10_results(self, movies):
        """At least 10 results expected after filtering."""
        assert len(movies) >= 10, f"Expected >= 10 movies, got {len(movies)}"

    def test_each_platform_has_results(self, results, movies):
        for platform in results["platforms"]:
            count = sum(1 for m in movies if m["platform"] == platform)
            assert count >= 1, f"Expected >= 1 movie from {platform}, got {count}"


class TestDeduplication:
    def test_no_duplicate_titles(self, movies):
        titles = [m["title"].lower().strip() for m in movies]
        duplicates = [t for t in set(titles) if titles.count(t) > 1]
        assert not duplicates, f"Duplicate titles found: {duplicates}"

    def test_query_movie_excluded(self, movies, query_movie):
        query_lower = query_movie.lower().strip()
        for m in movies:
            title = m["title"].lower().strip()
            assert title != query_lower, \
                f"Query movie should not appear in results: '{m['title']}'"


class TestSimilarity:
    def test_scores_in_range(self, movies):
        for m in movies:
            assert 0 <= m["similarity_score"] <= 1, \
                f"Score {m['similarity_score']} out of [0,1] for '{m['title']}'"

    def test_scores_descending(self, movies):
        scores = [m["similarity_score"] for m in movies]
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], \
                f"Scores not descending at rank {i+1}: {scores[i]} < {scores[i+1]}"

    def test_top_score_above_threshold(self, movies):
        assert movies[0]["similarity_score"] >= 0.3, \
            f"Top score too low: {movies[0]['similarity_score']}"


class TestURLs:
    def test_url_is_valid_format(self, movies):
        for m in movies:
            url = m["url"]
            assert url.startswith("https://"), f"URL not HTTPS for '{m['title']}': {url}"
            platform = m["platform"]
            if platform == "Netflix":
                assert "netflix.com" in url, f"Netflix movie has wrong URL domain: {url}"
            elif platform == "Disney+":
                assert "disneyplus.com" in url, f"Disney+ movie has wrong URL domain: {url}"
            elif platform == "Prime Video":
                assert "amazon.com" in url, f"Prime Video movie has wrong URL domain: {url}"
            elif platform == "Apple TV+":
                assert "apple.com" in url or "tv.apple.com" in url, \
                    f"Apple TV+ movie has wrong URL domain: {url}"

    def test_imdb_url_format(self, movies):
        for m in movies:
            url = m["imdb_url"]
            assert url.startswith("https://www.imdb.com/"), \
                f"Invalid IMDB URL for '{m['title']}': {url}"

    def test_imdb_urls_unique(self, movies):
        urls = [m["imdb_url"] for m in movies]
        assert len(urls) == len(set(urls)), "Duplicate IMDB URLs found"


class TestRatings:
    def test_imdb_ratings_above_min(self, results, movies):
        min_rating = results.get("min_rating", 7.0)
        for m in movies:
            assert m.get("imdb_rating", 0) >= min_rating - 0.5, \
                f"'{m['title']}' IMDB {m.get('imdb_rating')} is well below min_rating {min_rating}"

    def test_imdb_rating_is_numeric(self, movies):
        for m in movies:
            assert isinstance(m.get("imdb_rating"), (int, float)), \
                f"imdb_rating is not numeric for '{m.get('title', '?')}'"


class TestRomanianAudio:
    def test_romanian_audio_is_boolean(self, movies):
        for m in movies:
            assert isinstance(m["romanian_audio"], bool), \
                f"romanian_audio should be bool for '{m['title']}', got {type(m['romanian_audio'])}"

    def test_some_have_romanian_audio(self, movies):
        with_audio = sum(1 for m in movies if m["romanian_audio"])
        assert with_audio >= 1, "Expected at least 1 movie with Romanian audio"


class TestEnglishOutput:
    def test_why_similar_in_english(self, movies):
        english_words = {"the", "and", "of", "in", "a", "is", "to", "with", "that", "for"}
        english_count = 0
        for m in movies:
            words = set(re.findall(r'\b\w+\b', m["why_similar"].lower()))
            if len(words.intersection(english_words)) >= 2:
                english_count += 1
        ratio = english_count / len(movies)
        assert ratio >= 0.8, \
            f"Only {english_count}/{len(movies)} ({ratio:.0%}) have English why_similar"


class TestPlatformCoverage:
    def test_platform_values_valid(self, movies):
        for m in movies:
            assert m["platform"] in VALID_PLATFORMS, f"Invalid platform '{m['platform']}'"

    def test_platforms_match_metadata(self, results, movies):
        """All movie platforms should be among the searched platforms."""
        searched = set(results["platforms"])
        for m in movies:
            assert m["platform"] in searched, \
                f"Movie '{m['title']}' on '{m['platform']}' which was not in searched platforms {searched}"
