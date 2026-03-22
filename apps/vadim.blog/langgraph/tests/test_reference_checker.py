"""Unit tests for link_checker reference analysis — zero network calls."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from press.link_checker import (
    LinkResult,
    ReferenceReport,
    ReferenceResult,
    _anchor_quality,
    _check_one,
    _domain_tier,
    check_links,
    extract_inline_refs,
    extract_urls,
    find_bare_urls,
    format_reference_report,
)


class TestReferenceChecker:

    def test_extract_inline_refs_basic(self):
        md = "See [Stanford study](https://nber.org/papers/w18871) for details."
        refs = extract_inline_refs(md)
        assert refs == [("Stanford study", "https://nber.org/papers/w18871")]

    def test_extract_inline_refs_excludes_images(self):
        md = "![logo](https://example.com/img.png) and [source](https://example.com/page)"
        refs = extract_inline_refs(md)
        assert len(refs) == 1
        assert refs[0][0] == "source"

    def test_extract_inline_refs_deduplicates_urls(self):
        md = "[A](https://x.com) and [B](https://x.com)"
        refs = extract_inline_refs(md)
        assert len(refs) == 1  # same URL, first anchor wins

    def test_find_bare_urls_detects_unwrapped(self):
        md = "Read this: https://example.com/report and [linked](https://nber.org/p)"
        bare = find_bare_urls(md)
        assert "https://example.com/report" in bare
        assert "https://nber.org/p" not in bare

    def test_anchor_quality_good(self):
        assert _anchor_quality("Stanford study of 16,000 employees") == "good"
        assert _anchor_quality("GitLab 2023 DevSecOps Survey") == "good"
        assert _anchor_quality("Microsoft Work Trend Index") == "good"

    def test_anchor_quality_weak(self):
        assert _anchor_quality("here") == "weak"
        assert _anchor_quality("this") == "weak"
        assert _anchor_quality("click here") == "weak"
        assert _anchor_quality("read more") == "weak"
        assert _anchor_quality("link") == "weak"
        assert _anchor_quality("2023") == "weak"  # bare year

    def test_anchor_quality_short_is_weak(self):
        assert _anchor_quality("via") == "weak"
        assert _anchor_quality("ref") == "weak"

    def test_domain_tier_authoritative(self):
        assert _domain_tier("https://nber.org/papers/w18871") == "authoritative"
        assert _domain_tier("https://arxiv.org/abs/2301.00001") == "authoritative"
        assert _domain_tier("https://www.github.com/org/repo") == "authoritative"
        assert _domain_tier("https://research.mit.edu/study") == "authoritative"

    def test_domain_tier_credible(self):
        assert _domain_tier("https://stackoverflow.com/q/1234") == "credible"
        assert _domain_tier("https://techcrunch.com/article") == "credible"
        assert _domain_tier("https://mckinsey.com/report") == "credible"

    def test_domain_tier_generic(self):
        assert _domain_tier("https://example.com/page") == "generic"
        assert _domain_tier("https://myblog.wordpress.com") == "generic"

    def test_reference_report_no_refs(self):
        r = ReferenceReport(refs=[], bare_urls=[], word_count=500)
        assert r.total == 0
        assert r.score == 0.0
        assert any("no_inline_refs" in i for i in r.issues)

    def test_reference_report_few_refs(self):
        refs = [
            ReferenceResult("A study", "https://nber.org/p", "good", "authoritative",
                           LinkResult("https://nber.org/p", 200, True)),
            ReferenceResult("B post", "https://example.com", "good", "generic",
                           LinkResult("https://example.com", 200, True)),
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=1000)
        assert any("few_refs" in i for i in r.issues)

    def test_reference_report_broken_link_in_issues(self):
        refs = [
            ReferenceResult("Good source", "https://nber.org/p", "good", "authoritative",
                           LinkResult("https://nber.org/p", 404, False)),
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=500)
        assert r.broken == refs
        assert any("broken_links" in i for i in r.issues)

    def test_reference_report_bare_urls_in_issues(self):
        r = ReferenceReport(refs=[], bare_urls=["https://example.com"], word_count=100)
        assert any("bare_urls" in i for i in r.issues)

    def test_reference_report_weak_anchor_majority_flagged(self):
        def _ref(anchor, quality="weak"):
            return ReferenceResult(anchor, "https://nber.org/p", quality, "authoritative",
                                   LinkResult("https://nber.org/p", 200, True))

        refs = [_ref("here"), _ref("this"), _ref("Stanford study 2023", "good")]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=1000)
        assert any("weak_anchors" in i for i in r.issues)

    def test_reference_report_no_authoritative_flagged(self):
        def _ref(url):
            return ReferenceResult("Good anchor text here", url, "good", "generic",
                                   LinkResult(url, 200, True))

        refs = [_ref(f"https://blog{i}.com/post") for i in range(4)]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=1000)
        assert any("no_authoritative_sources" in i for i in r.issues)

    def test_reference_report_score_penalises_broken(self):
        ok_ref = ReferenceResult("Stanford study", "https://nber.org", "good", "authoritative",
                                 LinkResult("https://nber.org", 200, True))
        broken_ref = ReferenceResult("Fake study", "https://fake.example", "good", "generic",
                                     LinkResult("https://fake.example", 404, False))
        r_ok = ReferenceReport(refs=[ok_ref] * 5, bare_urls=[], word_count=1000)
        r_broken = ReferenceReport(refs=[broken_ref] * 5, bare_urls=[], word_count=1000)
        assert r_ok.score > r_broken.score

    def test_format_reference_report_contains_score(self):
        r = ReferenceReport(refs=[], bare_urls=[], word_count=0)
        md = format_reference_report(r)
        assert "score" in md.lower()
        assert "0.00" in md

    def test_format_reference_report_shows_tier_icons(self):
        ref = ReferenceResult("A good study from NBER", "https://nber.org/p", "good",
                              "authoritative", LinkResult("https://nber.org/p", 200, True))
        r = ReferenceReport(refs=[ref], bare_urls=[], word_count=500)
        md = format_reference_report(r)
        assert "\U0001f52c" in md  # authoritative tier icon

    def test_format_reference_report_shows_broken_icon(self):
        ref = ReferenceResult("Dead link", "https://gone.example/p", "good",
                              "generic", LinkResult("https://gone.example/p", 404, False))
        r = ReferenceReport(refs=[ref], bare_urls=[], word_count=500)
        md = format_reference_report(r)
        assert "\u274c" in md

    # ── Anchor quality edge cases ────────────────────────────────────────────

    def test_anchor_quality_url_as_anchor_is_weak(self):
        assert _anchor_quality("https://example.com/path") == "weak"
        assert _anchor_quality("http://nber.org/papers") == "weak"

    def test_anchor_quality_empty_is_weak(self):
        assert _anchor_quality("") == "weak"
        assert _anchor_quality("   ") == "weak"

    # ── Domain tier: subdomains ───────────────────────────────────────────────

    def test_domain_tier_subdomain_of_authoritative(self):
        assert _domain_tier("https://papers.nber.org/w18871") == "authoritative"
        assert _domain_tier("https://docs.python.org/3/library/") == "authoritative"
        assert _domain_tier("https://ai.stanford.edu/research") == "authoritative"

    def test_domain_tier_subdomain_of_credible(self):
        assert _domain_tier("https://blog.stackoverflow.com/post") == "credible"

    # ── extract_urls ─────────────────────────────────────────────────────────

    def test_extract_urls_basic(self):
        md = "See https://nber.org and https://example.com for details."
        urls = extract_urls(md)
        assert "https://nber.org" in urls
        assert "https://example.com" in urls

    def test_extract_urls_strips_trailing_punctuation(self):
        md = "See https://example.com/path. And https://other.com/page!"
        urls = extract_urls(md)
        assert "https://example.com/path" in urls
        assert "https://other.com/page" in urls

    def test_extract_urls_deduplicates(self):
        md = "A https://x.com/p B https://x.com/p C"
        urls = extract_urls(md)
        assert urls.count("https://x.com/p") == 1

    # ── ReferenceReport properties ────────────────────────────────────────────

    def test_reference_report_credible_includes_authoritative(self):
        auth = ReferenceResult("Auth src", "https://nber.org", "good", "authoritative",
                               LinkResult("https://nber.org", 200, True))
        cred = ReferenceResult("Cred src", "https://techcrunch.com", "good", "credible",
                               LinkResult("https://techcrunch.com", 200, True))
        genr = ReferenceResult("Generic", "https://randomblog.com", "good", "generic",
                               LinkResult("https://randomblog.com", 200, True))
        r = ReferenceReport(refs=[auth, cred, genr], bare_urls=[], word_count=500)
        assert len(r.credible) == 2  # authoritative + credible
        assert len(r.authoritative) == 1

    def test_reference_report_score_capped_at_one(self):
        refs = [
            ReferenceResult(f"NBER study {i}", f"https://nber.org/p{i}", "good",
                            "authoritative", LinkResult(f"https://nber.org/p{i}", 200, True))
            for i in range(10)
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=1000)
        assert r.score <= 1.0

    def test_reference_report_no_authoritative_not_flagged_for_few_refs(self):
        """< 3 refs should not trigger no_authoritative_sources (too few to judge)."""
        refs = [
            ReferenceResult("A blog", "https://randomblog.com", "good", "generic",
                            LinkResult("https://randomblog.com", 200, True)),
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=200)
        assert not any("no_authoritative_sources" in i for i in r.issues)

    def test_reference_report_citation_density_sparse_long_article(self):
        """800+ word article with 3 refs but target > 3 should flag density."""
        refs = [
            ReferenceResult(f"Study {i}", f"https://nber.org/p{i}", "good",
                            "authoritative", LinkResult(f"https://nber.org/p{i}", 200, True))
            for i in range(3)
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=1500)  # target = 5
        assert any("citation_density" in i for i in r.issues)

    def test_reference_report_citation_density_not_flagged_when_dense_enough(self):
        refs = [
            ReferenceResult(f"Study {i}", f"https://nber.org/p{i}", "good",
                            "authoritative", LinkResult(f"https://nber.org/p{i}", 200, True))
            for i in range(6)
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=1500)  # target = 5, actual = 6
        assert not any("citation_density" in i for i in r.issues)

    def test_reference_report_citation_density_not_flagged_short_article(self):
        """Short article (< 800 words) should not trigger density check."""
        refs = [
            ReferenceResult(f"Study {i}", f"https://nber.org/p{i}", "good",
                            "authoritative", LinkResult(f"https://nber.org/p{i}", 200, True))
            for i in range(3)
        ]
        r = ReferenceReport(refs=refs, bare_urls=[], word_count=600)  # under 800 threshold
        assert not any("citation_density" in i for i in r.issues)

    def test_find_bare_urls_empty_when_all_linked(self):
        md = "[NBER study](https://nber.org/p) and [GitLab survey](https://about.gitlab.com)"
        assert find_bare_urls(md) == []

    # ── check_links: mock HTTP ────────────────────────────────────────────────

    def test_check_links_ok_response(self):
        """check_links returns ok=True for 200 responses (mocks _check_one)."""
        async def fake_check(client, url):
            return LinkResult(url=url, status=200, ok=True)

        with patch("press.link_checker._check_one", fake_check):
            results = asyncio.run(check_links(["https://nber.org/papers/w18871"]))
        assert len(results) == 1
        assert results[0].ok is True
        assert results[0].status == 200

    def test_check_links_404_is_broken(self):
        async def fake_check(client, url):
            return LinkResult(url=url, status=404, ok=False)

        with patch("press.link_checker._check_one", fake_check):
            results = asyncio.run(check_links(["https://gone.example/page"]))
        assert results[0].ok is False
        assert results[0].status == 404

    def test_check_links_empty_input(self):
        results = asyncio.run(check_links([]))
        assert results == []

    def test_check_links_preserves_order(self):
        """Results are returned in the same order as input URLs."""
        urls = [f"https://example.com/{i}" for i in range(5)]

        async def fake_check(client, url):
            return LinkResult(url=url, status=200, ok=True)

        with patch("press.link_checker._check_one", fake_check):
            results = asyncio.run(check_links(urls))
        assert [r.url for r in results] == urls

    def test_check_one_lenient_domain_allows_403(self):
        """Bot-blocking domains (arxiv.org) should pass even on 403."""
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.url = "https://arxiv.org/abs/2301.00001"
        mock_resp.headers = MagicMock()
        mock_resp.headers.get = lambda k, d="": d

        mock_client = AsyncMock()
        mock_client.head = AsyncMock(return_value=mock_resp)

        result = asyncio.run(_check_one(mock_client, "https://arxiv.org/abs/2301.00001"))
        assert result.ok is True  # lenient domain — 403 passes

    def test_check_one_get_fallback_on_405(self):
        """HEAD 405 should trigger a GET retry."""
        head_resp = MagicMock()
        head_resp.status_code = 405
        head_resp.url = "https://example.com/page"
        head_resp.headers = MagicMock()
        head_resp.headers.get = lambda k, d="": d

        get_resp = MagicMock()
        get_resp.status_code = 200
        get_resp.url = "https://example.com/page"
        get_resp.headers = MagicMock()

        mock_client = AsyncMock()
        mock_client.head = AsyncMock(return_value=head_resp)
        mock_client.get = AsyncMock(return_value=get_resp)

        result = asyncio.run(_check_one(mock_client, "https://example.com/page"))
        assert result.ok is True
        mock_client.get.assert_called_once()  # GET fallback was triggered
