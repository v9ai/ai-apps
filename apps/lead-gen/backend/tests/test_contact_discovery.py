"""Tests for `contact_discovery_graph` — pure helpers + papers_branch guards.

Regression scope: the 2026-04-27 Durlston Partners incident, where
`papers_branch` over-matched the word "Partners" in unrelated AI papers and
inserted 18 false-positive "Researcher" contacts with malformed
`@durlstonpartners.com` email guesses (e.g. `jorge.luis morton@…` with a
space in the local part, `g..c. cooke@…` with double dots).

The fixes covered here:
  - `_email_guesses` runs each name fragment through `_sanitize_local`, so
    multi-token last names and dotted initials no longer leak into the
    address.
  - `_has_unique_anchor` skips the search when the company name is composed
    only of generic stopwords (Capital Partners, AI Group, …).
  - `papers_branch` short-circuits when the company category is one where
    paper-authorship structurally cannot indicate employment
    (STAFFING / AGENCY / CONSULTANCY).
"""

from __future__ import annotations

import pytest

from leadgen_agent.contact_discovery_graph import (
    PAPERS_BRANCH_BLOCKED_CATEGORIES,
    _email_guesses,
    _has_unique_anchor,
    _name_key,
    _sanitize_local,
    papers_branch,
)


# --------------------------------------------------------------------------- #
# _sanitize_local
# --------------------------------------------------------------------------- #


def test_sanitize_local_strips_whitespace():
    assert _sanitize_local("Luis Morton") == "luismorton"


def test_sanitize_local_collapses_double_dots():
    assert _sanitize_local("G. C.") == "g.c"


def test_sanitize_local_preserves_hyphens():
    assert _sanitize_local("Sang-Hwan") == "sang-hwan"


def test_sanitize_local_drops_unicode_diacritics():
    # Diacritics are not in [a-z0-9._-]; we drop them rather than transliterate.
    # Tradeoff: under-guess > malformed address.
    assert _sanitize_local("Jan-René") == "jan-rn"


def test_sanitize_local_trims_leading_trailing_dots():
    assert _sanitize_local(".jane.") == "jane"


def test_sanitize_local_empty_returns_empty():
    assert _sanitize_local("") == ""
    assert _sanitize_local("   ") == ""


# --------------------------------------------------------------------------- #
# _email_guesses — regression for the Durlston incident
# --------------------------------------------------------------------------- #


def test_email_guesses_basic_clean_name():
    assert _email_guesses("Jane", "Doe", "acme.com") == [
        "jane.doe@acme.com",
        "jane@acme.com",
        "jdoe@acme.com",
    ]


def test_email_guesses_multi_token_last_name_has_no_space():
    """Regression: "Jorge Luis Morton" produced "jorge.luis morton@…" before
    the sanitize fix."""
    out = _email_guesses("Jorge", "Luis Morton", "durlstonpartners.com")
    for addr in out:
        assert " " not in addr
    assert "jorge.luismorton@durlstonpartners.com" in out


def test_email_guesses_dotted_initial_has_no_double_dots():
    """Regression: "G. C. Cooke" produced "g..c. cooke@…" before the fix."""
    out = _email_guesses("G. C.", "Cooke", "durlstonpartners.com")
    for addr in out:
        assert ".." not in addr
        assert " " not in addr
    assert "g.c.cooke@durlstonpartners.com" in out


def test_email_guesses_hyphenated_first_name_preserved():
    out = _email_guesses("Sang-Hwan", "Kim", "acme.com")
    assert "sang-hwan.kim@acme.com" in out
    # f[0] is "s", so the abbrev form should be "skim".
    assert "skim@acme.com" in out


def test_email_guesses_returns_empty_when_domain_missing():
    assert _email_guesses("Jane", "Doe", "") == []


def test_email_guesses_returns_empty_when_first_or_last_missing():
    assert _email_guesses("", "Doe", "acme.com") == []
    assert _email_guesses("Jane", "", "acme.com") == []


def test_email_guesses_returns_empty_when_name_only_punctuation():
    """`"..."` sanitizes to `""`, so we should bail rather than emit `@acme.com`."""
    assert _email_guesses("...", "Doe", "acme.com") == []


# --------------------------------------------------------------------------- #
# _name_key
# --------------------------------------------------------------------------- #


def test_name_key_is_case_insensitive():
    assert _name_key("Jane", "Doe") == _name_key("jane", "DOE")


def test_name_key_strips_whitespace():
    assert _name_key("  Jane ", " Doe  ") == ("jane", "doe")


# --------------------------------------------------------------------------- #
# _has_unique_anchor
# --------------------------------------------------------------------------- #


@pytest.mark.parametrize(
    "name",
    [
        "Anthropic",
        "DeepMind",
        "Durlston Partners",  # "durlston" anchors despite the stopword
        "Acme AI",  # "acme" anchors
        "OpenAI Labs",  # "openai" anchors
    ],
)
def test_has_unique_anchor_true_for_specific_names(name: str):
    assert _has_unique_anchor(name) is True


@pytest.mark.parametrize(
    "name",
    [
        "AI Group",
        "Capital Partners",
        "The Solutions",
        "Tech Solutions",  # "tech" is in the stopword set
        "Global Ventures",
        "",  # empty
        "AI",  # too short and stopword
        "A B C",  # no token meets length threshold
    ],
)
def test_has_unique_anchor_false_for_generic_names(name: str):
    assert _has_unique_anchor(name) is False


# --------------------------------------------------------------------------- #
# papers_branch — guard paths only (no live research_client)
# --------------------------------------------------------------------------- #


async def test_papers_branch_skips_when_error_is_set():
    state = {"_error": "company id 999 not found"}
    result = await papers_branch(state)
    assert result == {"papers": []}


async def test_papers_branch_skips_when_no_company_name():
    state = {"company": {"id": 1, "name": "", "canonical_domain": "x.com"}}
    result = await papers_branch(state)
    assert result["papers"] == []


@pytest.mark.parametrize("category", sorted(PAPERS_BRANCH_BLOCKED_CATEGORIES))
async def test_papers_branch_skips_blocked_categories(category: str):
    """Recruiters / agencies / consultancies don't employ paper authors."""
    state = {
        "company": {
            "id": 1,
            "name": "Durlston Partners",
            "canonical_domain": "durlstonpartners.com",
            "category": category,
        }
    }
    result = await papers_branch(state)
    assert result["papers"] == []


async def test_papers_branch_skips_when_no_unique_anchor():
    """A name like "Capital Partners" would substring-match unrelated papers
    on "partners". Skip rather than send the query."""
    state = {
        "company": {
            "id": 1,
            "name": "Capital Partners",
            "canonical_domain": "capitalpartners.com",
            "category": "UNKNOWN",
        }
    }
    result = await papers_branch(state)
    assert result["papers"] == []


async def test_papers_branch_normalises_category_case():
    """`papers_branch` upper-cases the category before checking the blocked
    set, so a row stored as "staffing" still skips. Regression for any
    legacy rows pre-dating the canonical UPPER convention."""
    state = {
        "company": {
            "id": 1,
            "name": "Durlston Partners",
            "canonical_domain": "durlstonpartners.com",
            "category": "staffing",
        }
    }
    result = await papers_branch(state)
    assert result["papers"] == []
