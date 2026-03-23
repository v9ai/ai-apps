"""GEval-based collaboration network quality tests.

Evaluates the collaboration_network section of a research profile using
deepeval's GEval metric with custom criteria. Each test targets a different
facet of network quality: collaborator context, co-founder naming, academic
lineage informativeness, and overall influence mapping.

Usage:
    pytest tests/test_metric_geval_collaboration.py -v
    deepeval test run tests/test_metric_geval_collaboration.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# -- 1. key_collaborators entries have name, relationship, and context ------


@skip_no_key
def test_collaborators_have_context(sample_collaboration):
    """Each key_collaborators entry must have a name, relationship, and context."""
    metric = GEval(
        name="Collaborator Context Completeness",
        criteria=(
            "Each collaborator entry in the list must include three fields: "
            "(1) a 'name' that is a real person's full name, not a placeholder or "
            "generic label; (2) a 'relationship' that describes the professional "
            "connection (e.g. co-founder, advisor, research collaborator); and "
            "(3) a 'context' that specifies the project, company, or setting where "
            "the collaboration took place. Entries missing any of these fields, or "
            "containing vague or empty values, score poorly."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="List key collaborators with their relationship and context for Harrison Chase.",
        actual_output=json.dumps(sample_collaboration["key_collaborators"]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Collaborator Context Completeness score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 2. co_founders is a list of actual names ------------------------------


@skip_no_key
def test_co_founders_named(sample_collaboration):
    """co_founders must be a list of real, specific person names."""
    metric = GEval(
        name="Co-Founders Named",
        criteria=(
            "The output must be a JSON list of real person names who co-founded "
            "a company or project with the subject. Each entry must be a specific "
            "full name (first and last) of an actual person, not a role title, "
            "placeholder, or generic label like 'co-founder 1'. An empty list is "
            "acceptable only if the person is a solo founder, but if names are "
            "present they must be plausible real names."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="List the co-founders of Harrison Chase's ventures.",
        actual_output=json.dumps(sample_collaboration["co_founders"]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Co-Founders Named score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 3. academic_lineage is informative or explicitly N/A -------------------


@skip_no_key
def test_academic_lineage_informative(sample_collaboration):
    """academic_lineage must provide useful info or explicitly state N/A."""
    metric = GEval(
        name="Academic Lineage Informativeness",
        criteria=(
            "The academic lineage field must either: (a) provide genuinely useful "
            "information about the person's academic background — naming specific "
            "advisors, institutions, PhD lineage, or notable academic mentors — or "
            "(b) explicitly state that academic lineage is not applicable (e.g. "
            "'N/A', 'not applicable', 'industry practitioner') with a brief reason "
            "why. The field must not be left empty, contain only whitespace, or use "
            "vague filler like 'unknown' without explanation. Either substantive "
            "content or a deliberate, reasoned N/A is acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Describe the academic lineage of Harrison Chase.",
        actual_output=sample_collaboration["academic_lineage"],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Academic Lineage Informativeness score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 4. overall network reveals sphere of influence -------------------------


@skip_no_key
def test_network_reveals_influence(sample_collaboration):
    """The full collaboration network must reveal the person's sphere of influence."""
    metric = GEval(
        name="Network Influence Mapping",
        criteria=(
            "The overall collaboration network — including co-founders, key "
            "collaborators, mentors, mentees, and academic lineage — should paint "
            "a coherent picture of the person's sphere of influence in their "
            "industry. The network should reveal: (1) who they built things with, "
            "(2) who influenced or mentored them, (3) who they have influenced in "
            "turn, and (4) the breadth of their professional connections. Even if "
            "some categories are empty, the populated fields together should "
            "convey the person's place in the broader professional ecosystem."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input=(
            "Map the professional collaboration network and sphere of influence "
            "for Harrison Chase, CEO of LangChain."
        ),
        actual_output=json.dumps(sample_collaboration, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Network Influence Mapping score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
