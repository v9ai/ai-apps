"""DeepEval evaluation suite for bio disambiguation.

Tests that each generated bio is clearly about the correct person
(not a different person with the same name).

Usage:
    pytest tests/test_eval_bio_disambiguation.py -v
    pytest tests/test_eval_bio_disambiguation.py -k "geval" -v
    deepeval test run tests/test_eval_bio_disambiguation.py
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


# ═══════════════════════════════════════════════════════════════════════════
# DeepSeek model for DeepEval
# ═══════════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════════
# Data loader
# ═══════════════════════════════════════════════════════════════════════════

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


def _github_username(profile: dict) -> str:
    """Extract the GitHub username from a profile's social.github field."""
    gh = profile.get("social", {}).get("github", "")
    if not gh:
        return ""
    # Handle both full URLs and bare usernames
    return gh.rstrip("/").split("/")[-1]


# ═══════════════════════════════════════════════════════════════════════════
# 1. Bio contains the person's name or GitHub username
# ═══════════════════════════════════════════════════════════════════════════

class TestBioContainsNameOrGithub:
    def _profiles(self):
        p = _load_profiles()
        if not p:
            pytest.skip("No profiles -- run crew.py first")
        return p

    def test_bio_contains_name_or_github(self):
        """Assert that each bio contains the person's name or their GitHub username."""
        for profile in self._profiles():
            bio = profile.get("bio", "").lower()
            name = profile.get("name", "")
            slug = profile.get("slug", "")
            gh_user = _github_username(profile)

            # Check if the full name appears in the bio
            name_found = name.lower() in bio if name else False

            # Check if any part of the name (first or last) appears
            name_parts_found = False
            if name:
                parts = name.split()
                # At least the last name should appear (handles "Samuel Colvin" -> "Colvin")
                name_parts_found = any(
                    part.lower() in bio for part in parts if len(part) > 2
                )

            # Check if the GitHub username appears
            gh_found = gh_user.lower() in bio if gh_user else False

            assert name_found or name_parts_found or gh_found, (
                f"{slug}: bio does not mention name '{name}' or GitHub '{gh_user}'. "
                f"Bio starts with: {profile.get('bio', '')[:120]}..."
            )


# ═══════════════════════════════════════════════════════════════════════════
# 2. G-Eval: Bio describes THIS specific person (not someone else)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioNotAboutWrongPersonGEval:
    @pytest.mark.deepeval
    @pytest.mark.parametrize("profile", _load_profiles()[:10],
                             ids=lambda p: p.get("slug", "?"))
    def test_bio_not_about_wrong_person_geval(self, profile):
        bio = profile.get("bio", "")
        if len(bio) < 30:
            pytest.skip(f"Bio too short for {profile['slug']}")

        slug = profile.get("slug", "")
        name = profile.get("name", "")
        github = _github_username(profile)

        metric = GEval(
            name="Bio Person Disambiguation",
            criteria=(
                f"Given that this profile has slug '{slug}', name '{name}', "
                f"and GitHub '{github}', does this bio describe THIS specific person? "
                "Score 1.0=clearly about this person, 0.5=ambiguous, "
                "0.0=about someone else entirely."
            ),
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.6,
            model=_get_eval_model(),
            async_mode=False,
        )
        tc = LLMTestCase(
            input=(
                f"Profile metadata -- slug: '{slug}', name: '{name}', github: '{github}'. "
                f"Verify the bio below is about this specific person."
            ),
            actual_output=bio,
        )
        assert_test(tc, [metric])


# ═══════════════════════════════════════════════════════════════════════════
# 3. Bio mentions something related to their known work (for GitHub users)
# ═══════════════════════════════════════════════════════════════════════════

class TestBioMentionsOrg:
    def _profiles_with_github(self):
        profiles = _load_profiles()
        with_gh = [p for p in profiles if _github_username(p)]
        if not with_gh:
            pytest.skip("No profiles with GitHub usernames")
        return with_gh

    def test_bio_mentions_org(self):
        """For profiles where social has github, check bio mentions something
        related to their known work (org, project, role, or key contribution)."""
        for profile in self._profiles_with_github():
            bio = profile.get("bio", "").lower()
            slug = profile.get("slug", "")

            # Collect signals about the person's known work
            signals: list[str] = []

            # Key contributions titles
            for contrib in profile.get("key_contributions", []):
                title = contrib.get("title", "")
                if title and len(title) > 2:
                    signals.append(title.lower())

            # Topics
            for topic in profile.get("topics", []):
                if topic and len(topic) > 2:
                    signals.append(topic.lower())

            # Executive summary one-liner
            exec_summary = profile.get("executive_summary", {})
            if isinstance(exec_summary, dict):
                one_liner = exec_summary.get("one_liner", "")
                if one_liner:
                    # Extract notable proper nouns / project names from the one-liner
                    # by looking for capitalized words that aren't common English
                    words = re.findall(r"[A-Z][a-z]+(?:[A-Z][a-z]+)*", one_liner)
                    for w in words:
                        if len(w) > 2:
                            signals.append(w.lower())

            # Social website domain (often the org/project site)
            website = profile.get("social", {}).get("website", "")
            if website:
                # Extract domain name (e.g., "pydantic.dev" -> "pydantic")
                domain_match = re.search(r"https?://(?:www\.)?([^./]+)", website)
                if domain_match:
                    domain_name = domain_match.group(1)
                    if domain_name not in {"github", "twitter", "linkedin", "x", "medium", "substack"}:
                        signals.append(domain_name.lower())

            if not signals:
                # No work signals to check against -- skip this profile
                continue

            found = any(signal in bio for signal in signals)
            assert found, (
                f"{slug}: bio does not mention any known work signals. "
                f"Checked signals: {signals[:10]}. "
                f"Bio starts with: {profile.get('bio', '')[:120]}..."
            )
