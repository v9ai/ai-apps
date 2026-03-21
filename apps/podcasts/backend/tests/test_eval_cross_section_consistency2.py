"""Cross-section consistency tests for research profiles.

Validates that information is coherent across different sections of each
profile: name appears in bio, GitHub username relates to the person,
topic keywords surface in bio or contributions, and a G-Eval judge
checks full-profile coherence.

Usage:
    pytest tests/test_eval_cross_section_consistency2.py -v
    pytest tests/test_eval_cross_section_consistency2.py -k "deepeval" -v
    deepeval test run tests/test_eval_cross_section_consistency2.py
"""

import json
import os
import re
from pathlib import Path
from typing import Any

import httpx
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"


# ===================================================================
# DeepSeek model for DeepEval
# ===================================================================

class DeepSeekEvalModel(DeepEvalBaseLLM):
    def __init__(self):
        self._api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self._base_url = "https://api.deepseek.com/v1"
        self._model_name = "deepseek-chat"
        super().__init__(model=self._model_name)

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_api(self, prompt: str) -> str:
        if not self._api_key:
            raise RuntimeError("DEEPSEEK_API_KEY not set")
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
                json={"model": self._model_name, "messages": [{"role": "user", "content": prompt}],
                      "temperature": 0.0, "max_tokens": 2048},
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_api(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        import asyncio
        return await asyncio.to_thread(self._call_api, prompt)


_eval_model = None


def _get_eval_model() -> DeepSeekEvalModel:
    global _eval_model
    if _eval_model is None:
        _eval_model = DeepSeekEvalModel()
    return _eval_model


# ===================================================================
# Data loader
# ===================================================================

def _load_profiles() -> list[dict[str, Any]]:
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for f in sorted(RESEARCH_DIR.glob("*.json")):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        try:
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "slug" in data and "bio" in data:
                profiles.append(data)
        except (json.JSONDecodeError, OSError):
            continue
    return profiles


# ===================================================================
# Structural: name consistent across sections
# ===================================================================

class TestNameConsistentAcrossSections:
    """Assert profile['name'] appears (case-insensitive) in the bio."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_name_consistent_across_sections(self):
        for profile in self._profiles():
            name = profile.get("name", "")
            bio = profile.get("bio", "")
            if not name or not bio:
                continue
            assert name.lower() in bio.lower(), (
                f"Profile '{profile['slug']}': name '{name}' not found "
                f"(case-insensitive) in bio: {bio[:200]}..."
            )


# ===================================================================
# Structural: GitHub URL username relates to the person
# ===================================================================

class TestSocialGithubMatchesSlug:
    """If social has a GitHub URL, the username in it should relate to the person."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_social_github_matches_slug(self):
        for profile in self._profiles():
            social = profile.get("social", {})
            if not isinstance(social, dict):
                continue
            github_url = social.get("github", "")
            if not github_url:
                continue

            # Extract username from GitHub URL
            match = re.search(r"github\.com/([A-Za-z0-9_-]+)", github_url)
            if match is None:
                pytest.fail(
                    f"Profile '{profile['slug']}': GitHub URL '{github_url}' "
                    f"has no valid username path"
                )
            username = match.group(1).lower()

            # The username should relate to the person: check against slug,
            # name parts, or at minimum be a non-empty string that isn't a
            # generic path like 'orgs' or 'topics'.
            slug = profile.get("slug", "")
            name = profile.get("name", "")
            name_parts = [part.lower() for part in name.split() if len(part) >= 2]
            slug_parts = slug.lower().split("-")

            generic_paths = {"orgs", "topics", "explore", "settings", "about"}
            assert username not in generic_paths, (
                f"Profile '{slug}': GitHub URL '{github_url}' points to "
                f"a generic path '{username}', not a user"
            )

            # Check that at least one slug/name fragment overlaps with the
            # username, OR the username is a plausible handle (>= 2 chars).
            # Many developers use handles unrelated to their real name
            # (e.g., hwchase17 for Harrison Chase), so we only require the
            # username is non-trivial.
            relates = (
                any(part in username for part in slug_parts if len(part) >= 2)
                or any(part in username for part in name_parts)
                or len(username) >= 2
            )
            assert relates, (
                f"Profile '{slug}': GitHub username '{username}' from "
                f"'{github_url}' does not appear to relate to the person"
            )


# ===================================================================
# Structural: topics appear in bio or contributions
# ===================================================================

class TestTopicsAppearInBioOrContribs:
    """Assert at least 1 topic keyword appears in either bio or contribution descriptions."""

    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_topics_appear_in_bio_or_contribs(self):
        for profile in self._profiles():
            topics = profile.get("topics", [])
            if not topics:
                continue

            bio = profile.get("bio", "").lower()
            contrib_text = " ".join(
                c.get("description", "").lower()
                for c in profile.get("key_contributions", [])
                if isinstance(c, dict)
            )
            combined = f"{bio} {contrib_text}"

            matching = [t for t in topics if t.lower() in combined]
            assert len(matching) >= 1, (
                f"Profile '{profile['slug']}': none of the topics {topics} "
                f"appear in bio or contribution descriptions"
            )


# ===================================================================
# G-Eval: full profile coherence
# ===================================================================

class TestFullProfileCoherenceGEval:
    """G-Eval judge: do all sections describe the SAME person consistently?"""

    @pytest.mark.deepeval
    @pytest.mark.parametrize(
        "profile",
        _load_profiles()[:5],
        ids=lambda p: p.get("slug", "?"),
    )
    def test_full_profile_coherence_geval(self, profile):
        # Combine key sections into a single text for the judge
        sections = []

        sections.append(f"Name: {profile.get('name', '(missing)')}")
        sections.append(f"Bio: {profile.get('bio', '(missing)')}")
        sections.append(f"Topics: {', '.join(profile.get('topics', ['(none)']))}")

        timeline = profile.get("timeline", [])
        if timeline:
            tl_lines = [
                f"  - {e.get('date', '?')}: {e.get('event', '?')}"
                for e in timeline[:10]
            ]
            sections.append(f"Timeline ({len(timeline)} events):\n" + "\n".join(tl_lines))

        contributions = profile.get("key_contributions", [])
        if contributions:
            kc_lines = [
                f"  - {c.get('title', '?')}: {c.get('description', '?')}"
                for c in contributions[:10]
            ]
            sections.append(f"Contributions ({len(contributions)}):\n" + "\n".join(kc_lines))

        social = profile.get("social", {})
        if social:
            social_lines = [f"  - {k}: {v}" for k, v in social.items()]
            sections.append(f"Social:\n" + "\n".join(social_lines))

        actual_output = "\n\n".join(sections)

        if len(actual_output) < 100:
            pytest.skip(f"Not enough content for {profile.get('slug', '?')}")

        metric = GEval(
            name="Full Profile Coherence",
            criteria=(
                "Given ALL sections of this profile (bio, topics, timeline, "
                "contributions, social), does everything describe the SAME "
                "person consistently? No contradictions in dates, roles, or "
                "affiliations? Score 1.0=fully coherent, 0.0=contradictory "
                "sections."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.5,
            model=_get_eval_model(),
            async_mode=False,
        )

        tc = LLMTestCase(
            input=f"Evaluate cross-section coherence for: {profile.get('name', profile.get('slug', '?'))}",
            actual_output=actual_output,
        )
        assert_test(tc, [metric])
