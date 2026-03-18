"""3-tier blood-test marker extraction — faithful port from parsers.ts.

Tier 1: HTML table parsing (standard lab panels)
Tier 2: Title + FormKeysValues pairs (Romanian/European lab format)
Tier 3: Free-text fallback (tab / multi-space separated)
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass


@dataclass
class Marker:
    name: str
    value: str
    unit: str
    reference_range: str
    flag: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


# ── flag computation ─────────────────────────────────────────────────


def compute_flag(value: str, reference_range: str) -> str:
    try:
        num = float(value.replace(",", "."))
    except (ValueError, AttributeError):
        return "normal"

    # "undetectable / negative" references
    if re.search(r"nedetectabil|undetectable|negativ|negative", reference_range, re.I):
        return "high" if num > 0 else "normal"

    # Less-than threshold
    lt = re.match(r"^[<＜≤]\s*([\d.,]+)", reference_range)
    if lt:
        return "high" if num >= float(lt.group(1).replace(",", ".")) else "normal"

    # Greater-than threshold
    gt = re.match(r"^[>＞≥]\s*([\d.,]+)", reference_range)
    if gt:
        return "low" if num <= float(gt.group(1).replace(",", ".")) else "normal"

    # Range: lo – hi
    rng = re.search(r"([\d.,]+)\s*[-–]\s*([\d.,]+)", reference_range)
    if rng:
        lo = float(rng.group(1).replace(",", "."))
        hi = float(rng.group(2).replace(",", "."))
        if num < lo:
            return "low"
        if num > hi:
            return "high"

    return "normal"


# ── helpers ──────────────────────────────────────────────────────────


def _strip_html(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&nbsp;", " ")
    return text.strip()


def _dedupe(markers: list[Marker]) -> list[Marker]:
    seen: set[str] = set()
    out: list[Marker] = []
    for m in markers:
        if m.name not in seen:
            seen.add(m.name)
            out.append(m)
    return out


# ── Tier 1: HTML tables ──────────────────────────────────────────────


def parse_html_table(html: str) -> list[Marker]:
    markers: list[Marker] = []
    for row_match in re.finditer(r"<tr[^>]*>([\s\S]*?)</tr>", html, re.I):
        cells = [_strip_html(c) for c in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row_match.group(1), re.I)]
        if len(cells) < 2:
            continue
        name = cells[0]
        value = cells[1]
        unit = cells[2] if len(cells) > 2 else ""
        reference_range = cells[3] if len(cells) > 3 else ""

        if not name or not re.search(r"\d", value) or re.match(r"^\d", name):
            continue

        markers.append(Marker(
            name=name.strip(),
            value=value.strip(),
            unit=unit.strip(),
            reference_range=reference_range.strip(),
            flag=compute_flag(value, reference_range),
        ))
    return markers


# ── Tier 2: Title + FormKeysValues ───────────────────────────────────

_SKIP_PATTERN = re.compile(
    r"^(RECOLTAT|LUCRAT|GENERAT|CNP|ADRESA|TRIMIS|ANTECEDENT|Data|Pagina)", re.I
)


def parse_form_key_values(elements: list[dict]) -> list[Marker]:
    markers: list[Marker] = []
    i = 0
    while i < len(elements) - 1:
        el = elements[i]
        nxt = elements[i + 1]

        if el.get("type") in ("Title", "NarrativeText") and nxt.get("type") == "FormKeysValues":
            name = (el.get("text") or "").strip()
            value_text = (nxt.get("text") or "").strip()

            if not name or not value_text or _SKIP_PATTERN.search(value_text):
                i += 1
                continue

            vm = re.search(r"([\d.,]+)\s*([\w/µ%µgLdlUIuimlog]+)", value_text)
            if not vm:
                i += 1
                continue

            value = vm.group(1)
            unit = vm.group(2)

            refs = list(re.finditer(r"\(([^)]+)\)", value_text))
            reference_range = refs[-1].group(1) if refs else ""

            markers.append(Marker(
                name=name,
                value=value,
                unit=unit,
                reference_range=reference_range,
                flag=compute_flag(value, reference_range),
            ))
            i += 2  # skip the FormKeysValues element
        else:
            i += 1

    return markers


# ── Tier 3: Free-text fallback ───────────────────────────────────────

_TEXT_PATTERN = re.compile(
    r"^([A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF0-9 \-/().]+?)"
    r"\s{2,}([\d.,]+)"
    r"\s+([\w/µ%µgLdlUIuIU]+)"
    r"\s+([\d.,]+\s*[-–]\s*[\d.,]+|[<>≤≥＜＞]\s*[\d.,]+)",
    re.MULTILINE,
)


def parse_text_markers(text: str) -> list[Marker]:
    markers: list[Marker] = []
    for m in _TEXT_PATTERN.finditer(text):
        name, value, unit, reference_range = m.group(1), m.group(2), m.group(3), m.group(4)
        markers.append(Marker(
            name=name.strip(),
            value=value.strip(),
            unit=unit.strip(),
            reference_range=reference_range.strip(),
            flag=compute_flag(value, reference_range),
        ))
    return markers


# ── Orchestrator ─────────────────────────────────────────────────────


def parse_markers(elements: list[dict]) -> list[Marker]:
    """Extract blood markers using the 3-tier strategy."""
    # 1. HTML tables
    table_markers: list[Marker] = []
    for el in elements:
        if el.get("type") == "Table" and el.get("metadata", {}).get("text_as_html"):
            table_markers.extend(parse_html_table(el["metadata"]["text_as_html"]))
    if table_markers:
        return _dedupe(table_markers)

    # 2. Title + FormKeysValues
    fkv = parse_form_key_values(elements)
    if fkv:
        return _dedupe(fkv)

    # 3. Text fallback
    text = "\n".join(el.get("text", "") for el in elements)
    return _dedupe(parse_text_markers(text))
