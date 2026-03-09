#!/usr/bin/env python3
"""Citation verifier grader for Harbor eval framework.

Reads agent markdown files from the output directory, extracts DOI patterns
and Semantic Scholar IDs, verifies format validity via regex (no API calls),
and produces a 0-1 score based on citation density and format correctness.

Usage:
    OUTPUT_DIR=research-output/therapeutic python3 citation_verifier.py

Output (stdout): JSON  {"score": 0-1, "details": {...}}
"""

import json
import os
import re
import sys
from pathlib import Path

# --- Citation patterns ---

# DOI: 10.NNNN/... (standard DOI format)
DOI_PATTERN = re.compile(
    r"(?:doi(?:\.org)?[:/\s]*|https?://doi\.org/)"
    r"(10\.\d{4,9}/[^\s,;)\]\"']+)",
    re.IGNORECASE,
)

# Standalone DOI without prefix (e.g., in reference lists)
DOI_BARE_PATTERN = re.compile(
    r"\b(10\.\d{4,9}/[A-Za-z0-9_./:;\-()]+)\b"
)

# Semantic Scholar corpus ID: S2CID or CorpusID
S2_PATTERN = re.compile(
    r"(?:S2CID|CorpusID|Semantic\s*Scholar)[:\s]*(\d{5,})",
    re.IGNORECASE,
)

# PubMed ID
PMID_PATTERN = re.compile(
    r"(?:PMID|PubMed)[:\s]*(\d{5,})",
    re.IGNORECASE,
)

# arXiv ID
ARXIV_PATTERN = re.compile(
    r"arXiv[:\s]*([\d]{4}\.\d{4,5}(?:v\d+)?)",
    re.IGNORECASE,
)

# Author-year inline citation: (AuthorName et al., 2021) or (AuthorName, 2021)
AUTHOR_YEAR_PATTERN = re.compile(
    r"\(([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+))?),?\s*(\d{4})\)"
)

# Reference list entry: AuthorName et al. (2021) or AuthorName (2021)
REF_LIST_PATTERN = re.compile(
    r"(?:^|\n)\s*\d*\.?\s*\*?\*?([A-Z][a-z]+(?:\s+(?:et\s+al\.?|&\s+[A-Z][a-z]+))?)"
    r"\s*\(?\*?\*?\s*\((\d{4})\)",
    re.MULTILINE,
)


def validate_doi(doi: str) -> bool:
    """Check that a DOI string follows the expected format."""
    # Must start with 10. and have a registrant code + suffix
    return bool(re.match(r"^10\.\d{4,9}/.+$", doi))


def extract_citations(text: str) -> dict:
    """Extract all citation-like patterns from text."""
    dois_prefixed = set(DOI_PATTERN.findall(text))
    dois_bare = set(DOI_BARE_PATTERN.findall(text))
    dois = dois_prefixed | dois_bare

    s2_ids = set(S2_PATTERN.findall(text))
    pmids = set(PMID_PATTERN.findall(text))
    arxiv_ids = set(ARXIV_PATTERN.findall(text))
    author_year = set(AUTHOR_YEAR_PATTERN.findall(text))
    ref_list = set(REF_LIST_PATTERN.findall(text))

    # Combine author-year from both inline and reference list patterns
    all_author_year = set()
    for author, year in author_year:
        all_author_year.add(f"{author}, {year}")
    for author, year in ref_list:
        all_author_year.add(f"{author}, {year}")

    valid_dois = {d for d in dois if validate_doi(d)}
    invalid_dois = dois - valid_dois

    return {
        "dois": valid_dois,
        "invalid_dois": invalid_dois,
        "s2_ids": s2_ids,
        "pmids": pmids,
        "arxiv_ids": arxiv_ids,
        "author_year_citations": all_author_year,
    }


def score_file(filepath: Path) -> dict:
    """Score a single agent output file for citation quality."""
    text = filepath.read_text(encoding="utf-8", errors="replace")
    word_count = len(text.split())
    citations = extract_citations(text)

    # Count structured identifiers
    structured_count = (
        len(citations["dois"])
        + len(citations["s2_ids"])
        + len(citations["pmids"])
        + len(citations["arxiv_ids"])
    )

    # Count all citations including author-year
    total_citations = structured_count + len(citations["author_year_citations"])

    # Citation density: citations per 1000 words (target: >= 3 per 1000 words)
    density = (total_citations / max(word_count, 1)) * 1000

    # Format validity: ratio of valid structured IDs vs invalid
    total_identifiers = structured_count + len(citations["invalid_dois"])
    valid_ratio = (
        structured_count / max(total_identifiers, 1) if total_identifiers > 0 else 1.0
    )

    return {
        "file": filepath.name,
        "word_count": word_count,
        "total_citations": total_citations,
        "structured_ids": structured_count,
        "author_year_count": len(citations["author_year_citations"]),
        "valid_dois": len(citations["dois"]),
        "invalid_dois": len(citations["invalid_dois"]),
        "s2_ids": len(citations["s2_ids"]),
        "pmids": len(citations["pmids"]),
        "arxiv_ids": len(citations["arxiv_ids"]),
        "density_per_1k_words": round(density, 2),
        "valid_format_ratio": round(valid_ratio, 4),
    }


def main():
    output_dir = Path(os.environ.get("OUTPUT_DIR", "research-output/therapeutic"))

    if not output_dir.is_dir():
        print(
            json.dumps(
                {
                    "score": 0,
                    "details": {"error": f"Output directory not found: {output_dir}"},
                }
            )
        )
        sys.exit(0)

    # Find agent files
    agent_files = sorted(output_dir.glob("agent-*.md"))

    if not agent_files:
        print(
            json.dumps(
                {
                    "score": 0,
                    "details": {"error": "No agent output files found"},
                }
            )
        )
        sys.exit(0)

    file_scores = [score_file(f) for f in agent_files]

    # Aggregate metrics
    total_citations = sum(fs["total_citations"] for fs in file_scores)
    total_structured = sum(fs["structured_ids"] for fs in file_scores)
    unique_sources = set()
    for f in agent_files:
        text = f.read_text(encoding="utf-8", errors="replace")
        cites = extract_citations(text)
        unique_sources.update(cites["dois"])
        unique_sources.update(cites["s2_ids"])
        unique_sources.update(cites["pmids"])
        unique_sources.update(cites["arxiv_ids"])
        unique_sources.update(cites["author_year_citations"])

    avg_density = (
        sum(fs["density_per_1k_words"] for fs in file_scores) / len(file_scores)
    )
    avg_valid_ratio = (
        sum(fs["valid_format_ratio"] for fs in file_scores) / len(file_scores)
    )

    # Files with at least some citations
    files_with_citations = sum(1 for fs in file_scores if fs["total_citations"] > 0)
    coverage = files_with_citations / len(file_scores)

    # Composite score components:
    #   - citation_count_score: >=3 citations/1k words = 1.0, linearly scaled below
    #   - valid_format_score: direct ratio
    #   - coverage_score: all files should have citations
    #   - unique_sources_score: >=20 unique = 1.0
    density_target = 3.0
    citation_count_score = min(avg_density / density_target, 1.0)
    valid_format_score = avg_valid_ratio
    coverage_score = coverage
    unique_target = 20
    unique_sources_score = min(len(unique_sources) / unique_target, 1.0)

    # Weighted composite
    composite = (
        citation_count_score * 0.35
        + valid_format_score * 0.25
        + coverage_score * 0.20
        + unique_sources_score * 0.20
    )

    result = {
        "score": round(composite, 4),
        "details": {
            "citation_count": total_citations,
            "structured_ids": total_structured,
            "unique_sources": len(unique_sources),
            "valid_format_ratio": round(avg_valid_ratio, 4),
            "avg_density_per_1k_words": round(avg_density, 2),
            "file_coverage": round(coverage, 4),
            "sub_scores": {
                "citation_count_score": round(citation_count_score, 4),
                "valid_format_score": round(valid_format_score, 4),
                "coverage_score": round(coverage_score, 4),
                "unique_sources_score": round(unique_sources_score, 4),
            },
            "per_file": file_scores,
        },
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
