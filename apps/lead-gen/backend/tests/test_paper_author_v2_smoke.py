"""Smoke tests for the v2 paper-author enrichment graph.

These are pure-Python tests — they exercise the new helpers and the topology
shape without hitting the network or DB. Full integration coverage (mocked
HTTPX, mocked psycopg) lives in sibling files; this file's job is to keep
the public surface honest.
"""

from __future__ import annotations

import pytest

from leadgen_agent.buyer_fit_classifier import classify_buyer_fit
from leadgen_agent.contact_enrich_paper_author_graph import (
    _build_github_profile_v2,
    _canonical_linkedin_url,
    _classify_url_kind,
    _extract_emails_from_pdf_text,
    _gh_score_candidate,
    _has_industry_org_signal,
    _institution_token,
    _merge_tags_with_topics,
    _score_homepage_url,
    build_graph,
)
from leadgen_agent.topic_taxonomy import (
    TIER1_TOPIC_TAGS,
    normalize_topics_to_tags,
)


# ─── Topology ────────────────────────────────────────────────────────────────


def test_v2_graph_has_six_branches() -> None:
    """The compiled graph must contain all six fan-out branches + Teams A/B/C."""
    g = build_graph()
    expected = {
        "load_contact",
        "resolve_openalex_author",
        "synthesize",
        "resolve_github_handle",
        "enrich_github_profile",
        "enrich_orcid_profile",
        "enrich_semantic_scholar_author",
        "scrape_personal_homepage",
        "extract_email_from_paper_pdf",
        "resolve_linkedin_url",
        "classify_affiliation",
        "classify_buyer_fit_node",
        "auto_flag_unreachable_node",
    }
    assert expected.issubset(g.nodes.keys())


# ─── Topic taxonomy ──────────────────────────────────────────────────────────


def test_topic_taxonomy_has_26_tier1_tags() -> None:
    assert len(TIER1_TOPIC_TAGS) == 26
    assert "llm" in TIER1_TOPIC_TAGS
    assert "rag" in TIER1_TOPIC_TAGS
    assert "agents" in TIER1_TOPIC_TAGS


def test_normalize_topics_direct_keyword_hit() -> None:
    assert normalize_topics_to_tags(["Large Language Models"]) == ["topic:llm"]


def test_normalize_topics_multi_source_merge() -> None:
    out = normalize_topics_to_tags(
        openalex_concepts=["Computer vision"],
        github_topics=["llm-inference"],
    )
    assert out == ["topic:computer-vision", "topic:llm"]


def test_normalize_topics_stem_match() -> None:
    out = normalize_topics_to_tags(["Recurrent neural networks"])
    assert out == ["topic:neural-networks"]


def test_normalize_topics_controlled_vocab_miss() -> None:
    assert normalize_topics_to_tags(["Customer churn prediction in banking"]) == []


def test_normalize_topics_idempotent_through_merge() -> None:
    """Re-running the merger should converge — old prefix gets stripped."""
    existing = ["topic:llm", "openalex:topic:Old Concept", "papers"]
    merged = _merge_tags_with_topics(existing, ["topic:llm", "topic:rag"])
    assert sorted(merged) == ["papers", "topic:llm", "topic:rag"]
    # Run again — same input, same output (idempotent).
    again = _merge_tags_with_topics(merged, ["topic:llm", "topic:rag"])
    assert sorted(again) == ["papers", "topic:llm", "topic:rag"]


# ─── Buyer-fit gh boost path ─────────────────────────────────────────────────


def test_buyer_fit_backward_compat_no_gh() -> None:
    """gh=None must be byte-identical to the pre-GH version."""
    out_a = classify_buyer_fit(
        {"institution_type": "education", "institution": "MIT"},
        affiliation_type="academic",
    )
    out_b = classify_buyer_fit(
        {"institution_type": "education", "institution": "MIT"},
        affiliation_type="academic",
        gh=None,
    )
    out_c = classify_buyer_fit(
        {"institution_type": "education", "institution": "MIT"},
        affiliation_type="academic",
        gh={},
    )
    assert out_a == out_b == out_c


def test_buyer_fit_industry_capped_at_095() -> None:
    """company + GH-strong should saturate at GH_SCORE_CAP=0.95."""
    v, s, r = classify_buyer_fit(
        {"institution_type": "company", "institution": "Acme", "institution_ror": ""},
        affiliation_type="industry",
        gh={"company_org": "openai", "hireable": True, "hireable_known": True},
    )
    assert v == "buyer"
    assert s == 0.95
    assert any("gh.org: openai" in reason for reason in r)


def test_buyer_fit_academic_with_strong_gh_does_not_flip_below_06() -> None:
    """academic+GH-industry should stay not_buyer when boosted score < 0.6."""
    # Academic base = 0.10. Boosts: org +0.20, topics +0.15, bio +0.10 = 0.55.
    # Below 0.6 threshold so verdict stays not_buyer per hard-academic floor.
    v, s, r = classify_buyer_fit(
        {"institution_type": "education", "institution": "MIT"},
        affiliation_type="academic",
        gh={
            "company_org": "anthropic",
            "ai_topic_hits": ["llm", "agents"],
            "bio": "Research engineer at Anthropic",
        },
    )
    assert v == "not_buyer"
    assert 0.5 < s < 0.6
    assert any("gh.org: anthropic" in reason for reason in r)


def test_industry_org_signal_detection() -> None:
    matched, name = _has_industry_org_signal({"company_org": "anthropic"})
    assert matched is True
    assert name == "anthropic"

    matched, name = _has_industry_org_signal({"org_logins": ["openai"]})
    assert matched is True
    assert name == "openai"

    matched, name = _has_industry_org_signal({"company_org": "random-startup-inc"})
    assert matched is False


# ─── Helper purity ───────────────────────────────────────────────────────────


def test_institution_token_aliases() -> None:
    assert _institution_token("Massachusetts Institute of Technology") == "MIT"
    assert _institution_token("Stanford University") == "Stanford"
    # Falls through to longest non-stopword token.
    assert _institution_token("Anthropic") == "Anthropic"


def test_classify_url_kind() -> None:
    assert _classify_url_kind("https://github.com/foo") == "github"
    assert _classify_url_kind("https://www.linkedin.com/in/bar") == "linkedin"
    assert _classify_url_kind("https://x.com/baz") == "twitter"
    assert _classify_url_kind("https://scholar.google.com/citations?user=AbC") == "scholar"
    assert _classify_url_kind("https://example.com") == "homepage"


def test_canonical_linkedin_url_strips_tracking() -> None:
    assert _canonical_linkedin_url(
        "https://www.linkedin.com/in/jane-doe-9a7b3c?trk=public&utm_source=x"
    ) == "https://www.linkedin.com/in/jane-doe-9a7b3c"
    assert _canonical_linkedin_url(
        "https://linkedin.com/company/foo"
    ) == ""  # company pages rejected
    assert _canonical_linkedin_url("not a url") == ""


def test_homepage_url_ranking() -> None:
    """`.edu` > `.github.io` > generic `.com`; blog hosts negative."""
    edu = _score_homepage_url("https://cs.stanford.edu/~smith/", "openalex", "smith")
    gh_io = _score_homepage_url("https://smith.github.io/", "github", "smith")
    com = _score_homepage_url("https://example.com/about", "openalex", "smith")
    medium = _score_homepage_url("https://medium.com/@smith", "openalex", "smith")
    assert edu > gh_io > com
    assert medium < 0


def test_gh_score_surname_gate() -> None:
    """Surname must appear in login OR name — else score=0."""
    score, _ = _gh_score_candidate(
        {"login": "randomguy42", "name": "Bob Generic"},
        first="Alice", last="Researcher",
        orcid="", institution_token="",
        top_topic="", top_repo_languages=[],
    )
    assert score == 0.0


def test_gh_score_orcid_short_circuits_to_hit() -> None:
    """ORCID literal in bio is identity proof — score forced to 0.95."""
    score, evidence = _gh_score_candidate(
        {
            "login": "researcher",
            "name": "Alice Researcher",
            "bio": "PhD candidate. ORCID: 0000-0001-2345-6789",
        },
        first="Alice", last="Researcher",
        orcid="0000-0001-2345-6789",
        institution_token="",
        top_topic="",
        top_repo_languages=["Python"],
    )
    assert score >= 0.95
    assert evidence["orcid_in_bio"] == 1.0


def test_pdf_email_extract_brace_expansion() -> None:
    """{a,b,c}@x.edu must expand into three candidates."""
    text = "Authors: Jane Smith, John Doe.  {jsmith,jdoe}@stanford.edu"
    candidates = _extract_emails_from_pdf_text(text, first="Jane", last="Smith")
    emails = {c["email"] for c in candidates}
    assert "jsmith@stanford.edu" in emails
    assert "jdoe@stanford.edu" in emails
    # Top candidate should be the one matching the contact's last name.
    assert candidates[0]["email"] == "jsmith@stanford.edu"
    assert candidates[0]["confidence"] == 1.0


def test_pdf_email_extract_at_dot_obfuscation() -> None:
    text = "Contact: jane [at] cs [dot] cmu [dot] edu for questions."
    candidates = _extract_emails_from_pdf_text(text, first="Jane", last="Doe")
    emails = {c["email"] for c in candidates}
    assert "jane@cs.cmu.edu" in emails


def test_build_github_profile_v2_aggregates() -> None:
    """v2 builder consumes a hydrated GraphQL User node (different shape)."""
    user = {
        "login": "alice",
        "databaseId": 12345,
        "url": "https://github.com/alice",
        "name": "Alice Researcher",
        "bio": "ML engineer",
        "company": "@anthropic",
        "location": "SF",
        "websiteUrl": "alice.dev",
        "twitterUsername": None,
        "email": None,
        "isHireable": True,
        "createdAt": "2015-01-01T00:00:00Z",
        "updatedAt": "2026-04-01T00:00:00Z",
        "socialAccounts": {"nodes": []},
        "organizations": {"nodes": [{"login": "anthropic", "name": "Anthropic"}]},
        "followers": {"totalCount": 500},
        "following": {"totalCount": 60},
        "publicRepositories": {"totalCount": 30},
        "publicGists": {"totalCount": 0},
        "contributionsCollection": {
            "totalCommitContributions": 0, "totalPullRequestContributions": 0,
            "totalIssueContributions": 0, "totalRepositoriesWithContributedCommits": 0,
            "contributionCalendar": {"totalContributions": 0},
        },
        "pinnedItems": {"nodes": []},
        "repositoriesContributedTo": {"nodes": []},
        "repositories": {
            "totalCount": 2,
            "nodes": [
                {
                    "name": "agents-llm", "nameWithOwner": "alice/agents-llm",
                    "url": "https://github.com/alice/agents-llm",
                    "description": "", "stargazerCount": 1000, "forkCount": 0,
                    "pushedAt": "2026-04-20T12:00:00Z",
                    "primaryLanguage": {"name": "Python"},
                    "languages": {"edges": [{"size": 50000, "node": {"name": "Python"}}]},
                    "repositoryTopics": {"nodes": [
                        {"topic": {"name": "llm"}}, {"topic": {"name": "agents"}},
                    ]},
                },
                {
                    "name": "rag-eval", "nameWithOwner": "alice/rag-eval",
                    "url": "https://github.com/alice/rag-eval",
                    "description": "", "stargazerCount": 200, "forkCount": 0,
                    "pushedAt": "2026-03-01T00:00:00Z",
                    "primaryLanguage": {"name": "Python"},
                    "languages": {"edges": [
                        {"size": 8000, "node": {"name": "Jupyter Notebook"}},
                    ]},
                    "repositoryTopics": {"nodes": [
                        {"topic": {"name": "rag"}}, {"topic": {"name": "evaluation"}},
                    ]},
                },
            ],
        },
        "sponsorshipsAsMaintainer": {"totalCount": 0},
        "sponsorsListing": None,
    }
    p = _build_github_profile_v2(user, {"cost": 7})
    assert p["login"] == "alice"
    assert p["company_org"] == "anthropic"
    assert p["last_push_at"] == "2026-04-20T12:00:00Z"
    assert p["status"] == "ok"
    assert p["schema_version"] == 2
    # ai_topic_hits should pick up llm + rag + agents.
    assert "llm" in p["ai_topic_hits"]
    assert "rag" in p["ai_topic_hits"]
    assert "agents" in p["ai_topic_hits"]
    # No actual pinnedItems → falls back to top stars.
    assert p["pinned_source"] == "stars_fallback"
    assert p["pinned_repos"][0]["name"] == "agents-llm"
    assert p["top_languages"][0]["name"] == "Python"
    # Bug fix: org_logins now populated.
    assert p["org_logins"] == ["anthropic"]
