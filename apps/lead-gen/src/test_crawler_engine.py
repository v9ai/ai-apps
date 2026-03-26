"""Tests for crawler engine core components: BloomFilter, DomainScheduler, URLFrontier."""
from __future__ import annotations

import os
import sqlite3
import tempfile
import time

import numpy as np
import pytest

from crawler_engine import BloomFilter, CrawlerConfig, DomainScheduler, URLFrontier


# ---------------------------------------------------------------------------
# BloomFilter
# ---------------------------------------------------------------------------

class TestBloomFilter:

    def test_add_and_contains(self):
        bf = BloomFilter(capacity=1000, error_rate=0.001)
        bf.add("https://example.com/page1")
        assert "https://example.com/page1" in bf

    def test_not_contains(self):
        bf = BloomFilter(capacity=1000, error_rate=0.001)
        bf.add("https://example.com/page1")
        # A different URL should almost certainly not be in the filter
        assert "https://totally-different.org/xyz" not in bf

    def test_count_tracking(self):
        bf = BloomFilter(capacity=1000, error_rate=0.001)
        assert len(bf) == 0
        bf.add("a")
        bf.add("b")
        bf.add("c")
        assert len(bf) == 3

    def test_false_positive_rate_within_bounds(self):
        """Insert N items, test M absent items — FP rate should be < 1%."""
        bf = BloomFilter(capacity=10_000, error_rate=0.001)
        for i in range(5000):
            bf.add(f"url-{i}")

        false_positives = sum(
            1 for i in range(5000, 10000) if f"url-{i}" in bf
        )
        fp_rate = false_positives / 5000
        assert fp_rate < 0.01, f"FP rate {fp_rate:.4f} exceeds 1%"

    def test_optimal_parameters(self):
        bf = BloomFilter(capacity=1_000_000, error_rate=0.001)
        # m should be large enough for the target error rate
        assert bf._m > 1_000_000
        assert bf._k >= 1


# ---------------------------------------------------------------------------
# DomainScheduler (UCB1)
# ---------------------------------------------------------------------------

class TestDomainScheduler:

    @pytest.fixture
    def scheduler(self, tmp_path):
        cfg = CrawlerConfig(domain_stats_db=str(tmp_path / "domain_stats.db"))
        return DomainScheduler(cfg)

    def test_register_and_select(self, scheduler):
        scheduler.register_domain("example.com")
        selected = scheduler.select_domain()
        assert selected == "example.com"

    def test_unvisited_domain_preferred(self, scheduler):
        scheduler.register_domain("visited.com")
        scheduler.update_domain("visited.com", reward=0.5)
        scheduler.register_domain("fresh.com")
        # Fresh (unvisited) domain should be returned
        selected = scheduler.select_domain()
        assert selected == "fresh.com"

    def test_ucb_score_infinity_for_unseen(self, scheduler):
        scheduler.register_domain("new.com")
        score = scheduler.get_ucb_score("new.com")
        assert score == float("inf")

    def test_update_increases_pages(self, scheduler):
        scheduler.register_domain("d.com")
        scheduler.update_domain("d.com", reward=1.0, is_lead=True)
        stats = scheduler.get_all_stats()
        assert len(stats) == 1
        assert stats[0]["pages_crawled"] == 1
        assert stats[0]["leads_found"] == 1

    def test_high_reward_domain_favoured(self, scheduler):
        scheduler.register_domain("good.com")
        scheduler.register_domain("bad.com")
        # Give good.com many high-reward pages
        for _ in range(20):
            scheduler.update_domain("good.com", reward=1.0)
            scheduler.update_domain("bad.com", reward=0.0)
        # UCB should favour good.com (higher avg reward)
        score_good = scheduler.get_ucb_score("good.com")
        score_bad = scheduler.get_ucb_score("bad.com")
        assert score_good > score_bad

    def test_empty_scheduler(self, scheduler):
        assert scheduler.select_domain() is None

    def test_close(self, scheduler):
        scheduler.register_domain("a.com")
        scheduler.close()
        assert scheduler._conn is None


# ---------------------------------------------------------------------------
# URLFrontier
# ---------------------------------------------------------------------------

class TestURLFrontier:

    @pytest.fixture
    def frontier(self, tmp_path):
        cfg = CrawlerConfig(
            frontier_db=str(tmp_path / "frontier.db"),
            bloom_capacity=10_000,
        )
        return URLFrontier(cfg)

    def test_add_url(self, frontier):
        added = frontier.add_url("https://a.com/1", "a.com", q_value=0.5)
        assert added is True

    def test_duplicate_rejected(self, frontier):
        frontier.add_url("https://a.com/1", "a.com")
        added = frontier.add_url("https://a.com/1", "a.com")
        assert added is False

    def test_batch_add(self, frontier):
        urls = [
            ("https://a.com/1", "a.com", 0.5, 0),
            ("https://a.com/2", "a.com", 0.3, 1),
            ("https://b.com/1", "b.com", 0.8, 0),
        ]
        count = frontier.add_urls_batch(urls)
        assert count == 3

    def test_batch_add_dedup(self, frontier):
        frontier.add_url("https://a.com/1", "a.com")
        urls = [
            ("https://a.com/1", "a.com", 0.5, 0),  # duplicate
            ("https://a.com/2", "a.com", 0.3, 1),   # new
        ]
        count = frontier.add_urls_batch(urls)
        assert count == 1

    def test_mark_completed(self, frontier):
        frontier.add_url("https://a.com/1", "a.com")
        frontier.mark_completed("https://a.com/1")
        row = frontier._conn.execute(
            "SELECT status FROM frontier WHERE url = ?",
            ("https://a.com/1",),
        ).fetchone()
        assert row[0] == "completed"

    def test_mark_failed(self, frontier):
        frontier.add_url("https://a.com/1", "a.com")
        frontier.mark_failed("https://a.com/1")
        row = frontier._conn.execute(
            "SELECT status FROM frontier WHERE url = ?",
            ("https://a.com/1",),
        ).fetchone()
        assert row[0] == "failed"

    def test_get_stats(self, frontier):
        frontier.add_url("https://a.com/1", "a.com")
        frontier.add_url("https://a.com/2", "a.com")
        frontier.mark_completed("https://a.com/1")
        stats = frontier.get_stats()
        assert stats.get("pending", 0) == 1
        assert stats.get("completed", 0) == 1
        assert stats["bloom_size"] == 2
