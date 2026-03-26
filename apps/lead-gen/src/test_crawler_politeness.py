"""Tests for PolitenessManager and ContentExtractor link normalisation."""
from __future__ import annotations

import time
from collections import deque
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from crawler_engine import ContentExtractor, CrawlerConfig, PolitenessManager


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def config():
    return CrawlerConfig(
        default_crawl_delay=2.0,
        min_crawl_delay=0.5,
        max_crawl_delay=30.0,
        backoff_base=1.0,
        backoff_factor=2.0,
        backoff_max=60.0,
    )


@pytest.fixture
def manager(config):
    return PolitenessManager(config)


@pytest.fixture
def extractor(config):
    return ContentExtractor(config)


# ---------------------------------------------------------------------------
# TestPolitenessManager
# ---------------------------------------------------------------------------

class TestPolitenessManager:

    def test_parse_robots_basic_disallow(self, manager):
        text = (
            "User-Agent: *\n"
            "Disallow: /admin\n"
            "Disallow: /private/\n"
        )
        result = manager._parse_robots(text)
        assert result["allowed"] is True
        assert "/admin" in result["disallow_patterns"]
        assert "/private/" in result["disallow_patterns"]

    def test_parse_robots_crawl_delay(self, manager):
        text = (
            "User-Agent: *\n"
            "Crawl-delay: 5\n"
        )
        result = manager._parse_robots(text)
        assert result["crawl_delay"] == 5.0

    def test_parse_robots_scrapusbot_specific(self, manager):
        """ScrapusBot-specific rules should override the * wildcard block."""
        text = (
            "User-Agent: *\n"
            "Disallow: /public-blocked\n"
            "Crawl-delay: 10\n"
            "\n"
            "User-Agent: ScrapusBot\n"
            "Disallow: /bot-only-blocked\n"
            "Crawl-delay: 3\n"
        )
        result = manager._parse_robots(text)
        # Should use ScrapusBot block, not *
        assert result["crawl_delay"] == 3.0
        assert "/bot-only-blocked" in result["disallow_patterns"]
        assert "/public-blocked" not in result["disallow_patterns"]

    def test_parse_robots_wildcard_fallback(self, manager):
        """When no ScrapusBot block exists, fall back to * rules."""
        text = (
            "User-Agent: *\n"
            "Disallow: /secret\n"
            "Crawl-delay: 4\n"
        )
        result = manager._parse_robots(text)
        assert result["crawl_delay"] == 4.0
        assert "/secret" in result["disallow_patterns"]

    def test_parse_robots_disallow_all(self, manager):
        text = (
            "User-Agent: *\n"
            "Disallow: /\n"
        )
        result = manager._parse_robots(text)
        assert result["allowed"] is False

    def test_parse_robots_empty(self, manager):
        """Empty robots.txt means allow all with default delay."""
        result = manager._parse_robots("")
        assert result["allowed"] is True
        assert result["disallow_patterns"] == []
        assert result["crawl_delay"] == manager.config.default_crawl_delay

    def test_parse_robots_comments_ignored(self, manager):
        text = (
            "# This is a comment\n"
            "User-Agent: *\n"
            "# Another comment\n"
            "Disallow: /blocked\n"
            "# Crawl-delay: 999\n"
        )
        result = manager._parse_robots(text)
        assert "/blocked" in result["disallow_patterns"]
        # The commented-out crawl-delay should not be parsed
        assert result["crawl_delay"] == manager.config.default_crawl_delay

    def test_is_url_allowed_true(self, manager):
        robots = {
            "allowed": True,
            "disallow_patterns": ["/admin", "/private/"],
        }
        assert manager.is_url_allowed("https://example.com/jobs/123", robots) is True
        assert manager.is_url_allowed("https://example.com/", robots) is True

    def test_is_url_allowed_false_disallowed_path(self, manager):
        robots = {
            "allowed": True,
            "disallow_patterns": ["/admin", "/private/"],
        }
        assert manager.is_url_allowed("https://example.com/admin/users", robots) is False
        assert manager.is_url_allowed("https://example.com/private/data", robots) is False

    def test_is_url_allowed_false_site_blocked(self, manager):
        """When allowed is False (Disallow: /), all URLs are blocked."""
        robots = {
            "allowed": False,
            "disallow_patterns": [],
        }
        assert manager.is_url_allowed("https://example.com/", robots) is False
        assert manager.is_url_allowed("https://example.com/anything", robots) is False

    def test_record_outcome_success_resets_backoff(self, manager):
        # Simulate some failures first
        manager.record_outcome("example.com", success=False)
        manager.record_outcome("example.com", success=False)
        assert manager._backoff_state["example.com"] == 2

        # Success resets consecutive failure count
        manager.record_outcome("example.com", success=True)
        assert manager._backoff_state["example.com"] == 0

    def test_record_outcome_failure_increments(self, manager):
        manager.record_outcome("example.com", success=False)
        assert manager._backoff_state["example.com"] == 1
        manager.record_outcome("example.com", success=False)
        assert manager._backoff_state["example.com"] == 2
        manager.record_outcome("example.com", success=False)
        assert manager._backoff_state["example.com"] == 3

    def test_adaptive_delay_increases_on_failures(self, manager):
        """When failure rate exceeds 10%, adaptive delay should increase."""
        domain = "slow.com"
        # Fill the failure window with > 10% failures
        # 12 outcomes: 8 success + 4 failure = 33% failure rate
        for _ in range(8):
            manager._failure_windows[domain].append(0)  # success
        for _ in range(4):
            manager._failure_windows[domain].append(1)  # failure

        window = manager._failure_windows[domain]
        failure_rate = sum(window) / len(window)
        assert failure_rate > 0.1

        # The adaptive delay formula: base_delay * (1 + failure_rate * 5)
        base_delay = manager.config.default_crawl_delay
        expected_adaptive = base_delay * (1.0 + failure_rate * 5.0)
        assert expected_adaptive > base_delay

    def test_exponential_backoff_on_consecutive_failures(self, manager):
        domain = "broken.com"
        manager._backoff_state[domain] = 3
        # backoff = backoff_base * (backoff_factor ** consec)
        # = 1.0 * (2.0 ** 3) = 8.0
        expected = manager.config.backoff_base * (manager.config.backoff_factor ** 3)
        assert expected == 8.0

    def test_backoff_capped_at_max(self, manager):
        domain = "dead.com"
        manager._backoff_state[domain] = 20  # Very high consecutive failures
        backoff = min(
            manager.config.backoff_base * (manager.config.backoff_factor ** 20),
            manager.config.backoff_max,
        )
        assert backoff == manager.config.backoff_max  # 60.0

    @pytest.mark.asyncio
    async def test_fetch_robots_txt_success(self, manager):
        """Successful robots.txt fetch should parse and cache the result."""
        robots_text = (
            "User-Agent: *\n"
            "Disallow: /api\n"
            "Crawl-delay: 3\n"
        )
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = robots_text

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await manager.fetch_robots_txt("example.com")

        assert result["crawl_delay"] == 3.0
        assert "/api" in result["disallow_patterns"]
        assert result["allowed"] is True
        # Should be cached
        assert "example.com" in manager._robots_cache

    @pytest.mark.asyncio
    async def test_fetch_robots_txt_404_uses_defaults(self, manager):
        """A 404 response means no robots.txt; use defaults (allow all)."""
        mock_response = MagicMock()
        mock_response.status_code = 404

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await manager.fetch_robots_txt("norobots.com")

        assert result["allowed"] is True
        assert result["disallow_patterns"] == []
        assert result["crawl_delay"] == manager.config.default_crawl_delay

    @pytest.mark.asyncio
    async def test_fetch_robots_txt_cached(self, manager):
        """Second call for the same domain should return cached result."""
        cached = {
            "crawl_delay": 5.0,
            "disallow_patterns": ["/cached"],
            "allowed": True,
        }
        manager._robots_cache["cached.com"] = (cached, time.time())

        result = await manager.fetch_robots_txt("cached.com")
        assert result is cached

    def test_parse_robots_crawl_delay_clamped_to_min(self, manager):
        """Crawl-delay below min_crawl_delay should be clamped."""
        text = (
            "User-Agent: *\n"
            "Crawl-delay: 0.1\n"
        )
        result = manager._parse_robots(text)
        assert result["crawl_delay"] == manager.config.min_crawl_delay

    def test_parse_robots_crawl_delay_clamped_to_max(self, manager):
        """Crawl-delay above max_crawl_delay should be clamped."""
        text = (
            "User-Agent: *\n"
            "Crawl-delay: 999\n"
        )
        result = manager._parse_robots(text)
        assert result["crawl_delay"] == manager.config.max_crawl_delay


# ---------------------------------------------------------------------------
# TestContentExtractor
# ---------------------------------------------------------------------------

class TestContentExtractor:

    def test_normalise_link_strips_fragment(self, extractor):
        result = ContentExtractor._normalise_link(
            "https://example.com/page#section", "https://example.com/"
        )
        assert result is not None
        assert "#" not in result

    def test_normalise_link_skips_pdf(self, extractor):
        result = ContentExtractor._normalise_link(
            "https://example.com/file.pdf", "https://example.com/"
        )
        assert result is None

    def test_normalise_link_skips_images(self, extractor):
        for ext in (".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"):
            result = ContentExtractor._normalise_link(
                f"https://example.com/image{ext}", "https://example.com/"
            )
            assert result is None, f"Expected None for {ext}"

    def test_normalise_link_skips_javascript(self, extractor):
        result = ContentExtractor._normalise_link(
            "javascript:void(0)", "https://example.com/"
        )
        assert result is None

    def test_normalise_link_skips_mailto(self, extractor):
        result = ContentExtractor._normalise_link(
            "mailto:test@example.com", "https://example.com/"
        )
        assert result is None

    def test_normalise_link_resolves_relative(self, extractor):
        result = ContentExtractor._normalise_link(
            "/about/team", "https://example.com/jobs/"
        )
        assert result is not None
        assert "example.com" in result
        assert "/about/team" in result

    def test_normalise_link_skips_css(self, extractor):
        result = ContentExtractor._normalise_link(
            "https://example.com/styles.css", "https://example.com/"
        )
        assert result is None

    def test_normalise_link_skips_js_file(self, extractor):
        result = ContentExtractor._normalise_link(
            "https://example.com/app.js", "https://example.com/"
        )
        assert result is None

    def test_normalise_link_valid_http(self, extractor):
        result = ContentExtractor._normalise_link(
            "https://example.com/careers", "https://example.com/"
        )
        assert result is not None
        assert result.startswith("https://")
