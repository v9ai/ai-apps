"""extract_stack: deep required-stack extraction from a job description.

Five-node pipeline that turns ``raw_jd`` into a structured ``JobSkill[]``
matching the Zod schema at ``src/lib/skills/schema.ts``::

    segment_jd -> mine_mentions -> canonicalize -> score_levels -> synthesize

* DeepSeek-V4-Pro thinking mode (``make_llm(provider="deepseek", tier="deep")``)
  for every LLM-bearing node. Canonicalization runs purely against the local
  taxonomy + a small LLM tiebreak only for phrases that the loader rejects.
* All output fields are declared on ``ExtractStackState`` so LangGraph won't
  silently drop them (see the ``langgraph_typeddict_drops_fields`` memory).
* Output: ``{skills, summary, confidence, model, graph_meta}`` where each
  skill is ``{tag, level, confidence, evidence, escoLabel?}`` — a superset of
  the TS ``JobSkillsOutput`` shape, capped at 30 skills.
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, deepseek_model_name, make_llm
from .skill_taxonomy_loader import (
    SKILL_TAXONOMY,
    canonicalize_phrase,
    esco_label,
)
from .state import ExtractStackState

log = logging.getLogger(__name__)

_MAX_JD_CHARS = 16_000
_MAX_MENTIONS = 80
_MAX_OUTPUT_SKILLS = 30
_VALID_LEVELS = {"required", "nice_to_have", "optional"}
_VALID_SECTIONS = {"required", "nice_to_have", "responsibilities", "other"}


def _truncate(text: str, n: int) -> str:
    if not text:
        return ""
    return text if len(text) <= n else text[:n]


def _section_to_level(section: str) -> str:
    if section == "required":
        return "required"
    if section == "nice_to_have":
        return "nice_to_have"
    return "optional"


def _clamp01(x: Any) -> float:
    try:
        v = float(x)
    except (TypeError, ValueError):
        return 0.0
    if v < 0.0:
        return 0.0
    if v > 1.0:
        return 1.0
    return round(v, 3)


# ── Node 1: segment_jd ─────────────────────────────────────────────────────
async def segment_jd(state: ExtractStackState) -> dict:
    """Split the JD into required / nice-to-have / responsibilities / other.

    The LLM returns plain text per section so downstream nodes can quote
    sentences verbatim into ``evidence``. We keep the raw text rather than a
    list of bullets to preserve the surrounding context that the scorer uses.
    """
    raw = _truncate(state.get("raw_jd") or "", _MAX_JD_CHARS)
    title = state.get("title") or ""
    if not raw:
        return {"sections": {"required": "", "nice_to_have": "", "responsibilities": "", "other": ""}}

    llm = make_llm(provider="deepseek", tier="deep")
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You segment a job description into four sections. Return JSON "
                    '{"required": "...", "nice_to_have": "...", "responsibilities": "...", "other": "..."}. '
                    "Each value is plain text copied or paraphrased from the JD — preserve sentences "
                    "so a downstream node can quote them as evidence. If a section is absent, return "
                    'an empty string. Do NOT add commentary outside the four keys.'
                ),
            },
            {
                "role": "user",
                "content": f"Title: {title}\n\nJob description:\n{raw}",
            },
        ],
    )

    sections = {k: "" for k in _VALID_SECTIONS}
    if isinstance(result, dict):
        for k in _VALID_SECTIONS:
            v = result.get(k)
            if isinstance(v, str):
                sections[k] = _truncate(v.strip(), _MAX_JD_CHARS // 2)
    return {"sections": sections}


# ── Node 2: mine_mentions ──────────────────────────────────────────────────
async def mine_mentions(state: ExtractStackState) -> dict:
    """Extract every concrete tech mention with its surrounding sentence.

    Returns up to ``_MAX_MENTIONS`` entries. Each is ``{phrase, sentence, section}``
    where ``section`` is one of ``required``/``nice_to_have``/``responsibilities``/``other``
    so the scorer can decide ``level`` without re-reading the JD.
    """
    sections = state.get("sections") or {}
    if not any(sections.values()):
        return {"raw_mentions": []}

    llm = make_llm(provider="deepseek", tier="deep")
    payload = "\n\n".join(
        f"## {k}\n{sections.get(k, '')}" for k in ("required", "nice_to_have", "responsibilities", "other")
    )
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Extract every concrete tech / tool / framework / language / platform mention from "
                    "the segmented JD below. Return JSON "
                    '{"mentions": [{"phrase": "<as written>", "sentence": "<full sentence>", '
                    '"section": "required|nice_to_have|responsibilities|other"}]}. '
                    "Skip generic words (e.g. 'computer', 'software', 'cloud') and skip role titles. "
                    "Limit output to at most 80 entries."
                ),
            },
            {"role": "user", "content": payload},
        ],
    )

    mentions: list[dict[str, Any]] = []
    if isinstance(result, dict):
        raw_list = result.get("mentions")
        if isinstance(raw_list, list):
            for item in raw_list[:_MAX_MENTIONS]:
                if not isinstance(item, dict):
                    continue
                phrase = item.get("phrase")
                sentence = item.get("sentence")
                section = item.get("section")
                if not isinstance(phrase, str) or not phrase.strip():
                    continue
                if not isinstance(sentence, str) or not sentence.strip():
                    continue
                section_norm = section if section in _VALID_SECTIONS else "other"
                mentions.append(
                    {
                        "phrase": phrase.strip(),
                        "sentence": sentence.strip(),
                        "section": section_norm,
                    }
                )
    return {"raw_mentions": mentions}


# ── Node 3: canonicalize ───────────────────────────────────────────────────
async def canonicalize(state: ExtractStackState) -> dict:
    """Map each raw phrase to a canonical SKILL_TAXONOMY tag.

    Two-pass: (1) local synonym/substring match via ``canonicalize_phrase``;
    (2) one batched LLM tiebreak for the leftover phrases, constrained to
    return tags that exist in ``SKILL_TAXONOMY``. Phrases that fail both are
    dropped — better to under-extract than to invent tags outside the taxonomy.
    """
    mentions = state.get("raw_mentions") or []
    if not mentions:
        return {"canonical": []}

    resolved: list[dict[str, Any]] = []
    unresolved_idx: list[int] = []
    for i, m in enumerate(mentions):
        tag = canonicalize_phrase(m["phrase"])
        if tag:
            resolved.append({**m, "tag": tag})
        else:
            unresolved_idx.append(i)

    if unresolved_idx and SKILL_TAXONOMY:
        # LLM tiebreak, batched. Constrained to the existing taxonomy.
        candidate_phrases = [mentions[i]["phrase"] for i in unresolved_idx]
        # Cap the prompt — taxonomy has ~160 entries which fits comfortably.
        taxonomy_listing = ", ".join(sorted(SKILL_TAXONOMY.keys()))
        llm = make_llm(provider="deepseek", tier="standard")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "Map each input phrase to the closest matching tag from the allowed taxonomy "
                        "below. Return JSON "
                        '{"matches": [{"phrase": "<input>", "tag": "<taxonomy tag or null>"}]}. '
                        "Only use tags that appear in the allowed list. If no tag is a confident "
                        "match, return null for that phrase. Do NOT invent tags."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Allowed tags: {taxonomy_listing}\n\n"
                        f"Phrases: {candidate_phrases}"
                    ),
                },
            ],
        )
        mapped: dict[str, str] = {}
        if isinstance(result, dict):
            for item in result.get("matches", []) or []:
                if not isinstance(item, dict):
                    continue
                phrase = item.get("phrase")
                tag = item.get("tag")
                if isinstance(phrase, str) and isinstance(tag, str) and tag in SKILL_TAXONOMY:
                    mapped[phrase.strip().lower()] = tag
        for i in unresolved_idx:
            m = mentions[i]
            tag = mapped.get(m["phrase"].strip().lower())
            if tag:
                resolved.append({**m, "tag": tag})

    return {"canonical": resolved}


# ── Node 4: score_levels ───────────────────────────────────────────────────
async def score_levels(state: ExtractStackState) -> dict:
    """Assign ``level`` and ``confidence`` to each canonical skill.

    Strategy: for each unique tag, take the strongest section it appeared in
    (``required`` > ``nice_to_have`` > ``responsibilities`` > ``other``), then
    ask DeepSeek to set a 0..1 confidence per tag using the cited sentence.
    The LLM only adjusts confidence and may downgrade the level when language
    contradicts the section header (e.g. "would be a plus" inside Required).
    """
    canonical = state.get("canonical") or []
    if not canonical:
        return {"canonical": []}

    # Aggregate by tag, picking the strongest-section evidence.
    section_rank = {"required": 3, "nice_to_have": 2, "responsibilities": 1, "other": 0}
    by_tag: dict[str, dict[str, Any]] = {}
    for c in canonical:
        tag = c.get("tag")
        if not isinstance(tag, str):
            continue
        prev = by_tag.get(tag)
        if prev is None or section_rank.get(c["section"], 0) > section_rank.get(prev["section"], 0):
            by_tag[tag] = c

    items = list(by_tag.values())
    if not items:
        return {"canonical": []}

    llm = make_llm(provider="deepseek", tier="deep")
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "For each item below, assign a level and confidence. Levels: "
                    "'required' (must-have), 'nice_to_have' (preferred / bonus), "
                    "'optional' (mentioned in responsibilities or other context). "
                    "Confidence is 0..1 based on how unambiguous the language is. "
                    "If wording contradicts the section header (e.g. 'a plus' inside Required), "
                    "downgrade the level. Return JSON "
                    '{"items": [{"tag": "...", "level": "required|nice_to_have|optional", '
                    '"confidence": 0.0..1.0}]}. Keep the same order as input.'
                ),
            },
            {
                "role": "user",
                "content": "\n".join(
                    f"- tag={c['tag']!s} | section={c['section']!s} | sentence={c['sentence']!s}"
                    for c in items
                ),
            },
        ],
    )

    overrides: dict[str, dict[str, Any]] = {}
    if isinstance(result, dict):
        for item in result.get("items", []) or []:
            if not isinstance(item, dict):
                continue
            tag = item.get("tag")
            if not isinstance(tag, str):
                continue
            level = item.get("level")
            level = level if level in _VALID_LEVELS else None
            conf = _clamp01(item.get("confidence", 0.5))
            overrides[tag] = {"level": level, "confidence": conf}

    out: list[dict[str, Any]] = []
    for c in items:
        ov = overrides.get(c["tag"], {})
        level = ov.get("level") or _section_to_level(c["section"])
        conf = ov.get("confidence")
        if conf is None:
            conf = 0.7 if c["section"] == "required" else 0.5
        out.append({**c, "level": level, "confidence": conf})
    return {"canonical": out}


# ── Node 5: synthesize ─────────────────────────────────────────────────────
async def synthesize(state: ExtractStackState) -> dict:
    """Final shape: dedupe, attach ESCO labels, sort, cap, and summarize."""
    canonical = state.get("canonical") or []
    seen: set[str] = set()
    skills: list[dict[str, Any]] = []
    for c in canonical:
        tag = c.get("tag")
        if not isinstance(tag, str) or tag in seen:
            continue
        seen.add(tag)
        skill: dict[str, Any] = {
            "tag": tag,
            "level": c.get("level") or "optional",
            "confidence": _clamp01(c.get("confidence", 0.5)),
            "evidence": str(c.get("sentence") or "")[:400],
        }
        label = esco_label(tag)
        if label:
            skill["escoLabel"] = label
        skills.append(skill)

    level_rank = {"required": 0, "nice_to_have": 1, "optional": 2}
    skills.sort(key=lambda s: (level_rank.get(s["level"], 99), -s["confidence"]))
    skills = skills[:_MAX_OUTPUT_SKILLS]

    required = [s for s in skills if s["level"] == "required"]
    nice = [s for s in skills if s["level"] == "nice_to_have"]
    if required:
        labels = ", ".join(SKILL_TAXONOMY.get(s["tag"], s["tag"]) for s in required[:8])
        summary = f"Required: {labels}."
    elif nice:
        labels = ", ".join(SKILL_TAXONOMY.get(s["tag"], s["tag"]) for s in nice[:8])
        summary = f"Nice-to-have: {labels}."
    else:
        summary = "No required stack identified."

    overall = (
        round(sum(s["confidence"] for s in skills) / len(skills), 3)
        if skills
        else 0.0
    )
    model_name = deepseek_model_name("deep")
    graph_meta = {
        "version": "v1",
        "model": model_name,
        "counts": {
            "mentions": len(state.get("raw_mentions") or []),
            "canonical": len(canonical),
            "skills": len(skills),
            "required": len(required),
            "nice_to_have": len(nice),
        },
    }

    return {
        "skills": skills,
        "summary": summary,
        "confidence": overall,
        "model": model_name,
        "graph_meta": graph_meta,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ExtractStackState)
    builder.add_node("segment_jd", segment_jd)
    builder.add_node("mine_mentions", mine_mentions)
    builder.add_node("canonicalize", canonicalize)
    builder.add_node("score_levels", score_levels)
    builder.add_node("synthesize", synthesize)
    builder.add_edge(START, "segment_jd")
    builder.add_edge("segment_jd", "mine_mentions")
    builder.add_edge("mine_mentions", "canonicalize")
    builder.add_edge("canonicalize", "score_levels")
    builder.add_edge("score_levels", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
