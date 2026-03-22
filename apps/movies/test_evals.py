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
QUERY_MOVIE = "The Pursuit of Happyness"


@pytest.fixture(scope="module")
def results():
    assert os.path.exists(RESULTS_PATH), f"Results file not found: {RESULTS_PATH}"
    with open(RESULTS_PATH) as f:
        return json.load(f)


@pytest.fixture(scope="module")
def movies(results):
    return results["results"]


class TestSchema:
    def test_top_level_keys(self, results):
        required = {"query_movie", "generated_at", "platforms", "total_results", "results"}
        assert required.issubset(results.keys())

    def test_query_movie(self, results):
        assert results["query_movie"] == QUERY_MOVIE

    def test_platforms_listed(self, results):
        assert "Netflix" in results["platforms"]
        assert "Disney+" in results["platforms"]

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

    def test_ranks_sequential(self, movies):
        ranks = [m["rank"] for m in movies]
        assert ranks == list(range(1, len(movies) + 1)), "Ranks should be sequential 1..N"

    def test_year_is_plausible(self, movies):
        for m in movies:
            assert 1950 <= m["year"] <= 2026, f"Year {m['year']} for '{m['title']}' is implausible"

    def test_age_rating_is_7_plus(self, movies):
        allowed = {"G", "PG", "PG-13", "TV-Y7", "TV-G", "TV-PG", "TV-14"}
        for m in movies:
            assert m["age_rating"] in allowed, \
                f"'{m['title']}' has age rating '{m['age_rating']}' (expected 7+ suitable: {allowed})"


class TestQuantity:
    def test_minimum_15_results(self, movies):
        """Age 7+ filter is stricter, so 15 is the minimum."""
        assert len(movies) >= 15, f"Expected >= 15 movies, got {len(movies)}"

    def test_netflix_has_results(self, movies):
        netflix = [m for m in movies if m["platform"] == "Netflix"]
        assert len(netflix) >= 2, f"Expected >= 2 Netflix movies, got {len(netflix)}"

    def test_disney_has_results(self, movies):
        disney = [m for m in movies if m["platform"] == "Disney+"]
        assert len(disney) >= 5, f"Expected >= 5 Disney+ movies, got {len(disney)}"


class TestDeduplication:
    def test_no_duplicate_titles(self, movies):
        titles = [m["title"].lower().strip() for m in movies]
        duplicates = [t for t in titles if titles.count(t) > 1]
        assert not duplicates, f"Duplicate titles found: {set(duplicates)}"

    def test_query_movie_excluded(self, movies):
        for m in movies:
            title = m["title"].lower().strip()
            assert "pursuit of happyness" not in title, \
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
            if m["platform"] == "Netflix":
                assert "netflix.com" in url, f"Netflix movie has wrong URL domain: {url}"
            elif m["platform"] == "Disney+":
                assert "disneyplus.com" in url, f"Disney+ movie has wrong URL domain: {url}"

    def test_imdb_url_format(self, movies):
        for m in movies:
            url = m["imdb_url"]
            assert url.startswith("https://www.imdb.com/"), \
                f"Invalid IMDB URL for '{m['title']}': {url}"

    def test_imdb_urls_unique(self, movies):
        urls = [m["imdb_url"] for m in movies]
        assert len(urls) == len(set(urls)), "Duplicate IMDB URLs found"


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
    def test_both_platforms_represented(self, movies):
        platforms = {m["platform"] for m in movies}
        assert "Netflix" in platforms
        assert "Disney+" in platforms

    def test_platform_values_valid(self, movies):
        valid = {"Netflix", "Disney+"}
        for m in movies:
            assert m["platform"] in valid, f"Invalid platform '{m['platform']}'"

    def test_balanced_platform_distribution(self, movies):
        netflix = sum(1 for m in movies if m["platform"] == "Netflix")
        ratio = netflix / len(movies)
        assert 0.10 <= ratio <= 0.90, \
            f"Imbalanced: Netflix has {netflix}/{len(movies)} ({ratio:.0%})"
