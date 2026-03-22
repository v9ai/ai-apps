"""Verify anti_hallucination metric catches invented claims."""

import pytest

from press.evals import evaluate_article_sync
from press._fixtures import SAMPLE_RESEARCH_BRIEF


HALLUCINATED_ARTICLE = """\
---
title: "Remote Work Productivity Facts"
description: "The data on remote work."
date: 2026-03-16
tags: [remote-work]
status: draft
---

# Remote Work Productivity Facts

A [Harvard study of 50,000 employees](https://harvard.edu/fake) found that remote workers
are 47% more productive than their in-office counterparts. This finding was corroborated
by a [2024 McKinsey report](https://mckinsey.com/fake) showing $2.3 trillion in productivity
gains globally since the shift to remote work began.

## The Numbers Don't Lie

According to the [World Economic Forum](https://wef.org/fake), remote work has increased
GDP in 87 countries by an average of 4.2%. The [Global Remote Work Index 2025](https://fake.com)
ranked fully distributed teams as 3x more innovative than office-bound teams.
"""


@pytest.mark.eval
class TestLLMEvalHallucination:

    def test_hallucination_detected(self):
        result = evaluate_article_sync(
            HALLUCINATED_ARTICLE,
            research_brief=SAMPLE_RESEARCH_BRIEF,
            metrics_to_run=["anti_hallucination"],
        )
        m = result.metrics["anti_hallucination"]
        assert m.score <= 0.4, (
            f"Hallucinated article should fail anti_hallucination, got {m.score:.2f}: {m.reason}"
        )
