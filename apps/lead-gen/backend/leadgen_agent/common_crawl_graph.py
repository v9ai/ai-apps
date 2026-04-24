"""Common Crawl seed discovery — CDX query, WARC fetch, contact extraction.

Ported from the Rust `common-crawl` crate. Provides a small library surface
(``seed_domain``, ``fetch_domain``, ``backfill_domains``) plus an optional
LangGraph ``graph`` that wraps ``fetch_domain`` so the pipeline can drive
crawl-based discovery from the same runtime as the other graphs.

The pipeline:

1. Resolve the latest Common Crawl index IDs from
   ``https://index.commoncrawl.org/collinfo.json`` (with a fallback list).
2. Query the CDX API for status-200 text/html captures on ``<domain>/*``.
3. Filter + score pages (team/about/contact > homepage > other).
4. Range-request each WARC record from ``data.commoncrawl.org`` and decompress
   the gzipped record via ``warcio``.
5. Extract page title, description, visible text, emails, persons (JSON-LD,
   schema.org microdata, then a DOM heuristic on team/about pages only) and
   same-domain outbound links.
6. Upsert rows into ``company_snapshots``, ``company_facts``, ``contacts``
   and update ``companies.last_seen_*``.
7. Depth-1: live-fetch a handful of high-score links that are not in CC.

Schema/table conventions match the Rust crate exactly — see
``backend/leadgen_agent/common_crawl_graph.py`` SQL strings for the source of
truth.

# Requires: warcio, beautifulsoup4, httpx, psycopg
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable

import httpx
import psycopg
from bs4 import BeautifulSoup, NavigableString, Tag

try:  # optional dependency — only needed for `fetch` / `backfill`
    from warcio.archiveiterator import ArchiveIterator
except Exception:  # pragma: no cover - warcio missing only blocks WARC fetch
    ArchiveIterator = None  # type: ignore[assignment]

log = logging.getLogger(__name__)

# ── Constants (mirror Rust) ─────────────────────────────────────────────────

CDX_BASE = "https://index.commoncrawl.org"
S3_BASE = "https://data.commoncrawl.org"

MAX_INDICES = 3
FALLBACK_CRAWL_IDS: tuple[str, ...] = (
    "CC-MAIN-2026-12",
    "CC-MAIN-2025-51",
    "CC-MAIN-2025-40",
)

USER_AGENT = "CCBot/2.0 (research)"
HTTP_TIMEOUT = 30.0

WARC_CONCURRENCY = 8
LIVE_CONCURRENCY = 4
CDX_LIMIT = 500
MAX_DEPTH1_PAGES = 5

EXTRACTOR_VERSION = "common-crawl-py/0.1"

TIER1_PATHS: tuple[str, ...] = (
    "/team", "/our-team", "/the-team", "/meet-the-team", "/people", "/staff",
    "/leadership", "/management", "/about/team", "/about/people",
)
TIER2_PATHS: tuple[str, ...] = (
    "/about", "/about-us", "/about_us", "/who-we-are", "/company",
    "/company/about",
)
TIER3_PATHS: tuple[str, ...] = (
    "/contact", "/contact-us", "/careers", "/jobs", "/services",
    "/what-we-do", "/solutions",
)

NOISE_SUBDOMAINS: tuple[str, ...] = (
    "careers.", "jobs.", "apply.", "talent.", "hire.",
    "blog.", "news.", "press.", "media.",
    "api.", "cdn.", "assets.", "static.", "img.", "images.",
    "help.", "support.", "docs.", "developers.", "dev.",
    "shop.", "store.", "ecommerce.",
    "mail.", "webmail.", "smtp.",
)

TRACKING_PARAMS: frozenset[str] = frozenset({
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "ref", "source", "fbclid", "gclid", "msclkid", "ref_src",
})

ACRONYM_TOKENS: frozenset[str] = frozenset({
    "AI", "ML", "IT", "HR", "VP", "UK", "US", "EU", "PR",
    "QA", "PM", "BI", "UX", "UI", "BD", "CX", "AR", "VR",
})
FUNCTION_WORDS: frozenset[str] = frozenset({
    "The", "Our", "Your", "Their", "Its", "This", "That", "These", "Those",
    "An", "And", "Or", "But", "For", "With", "From", "Into", "About",
    "How", "Why", "What", "When", "Where", "Who",
    "Explore", "Meet", "Join", "Learn", "Get", "Find", "See", "View",
    "New", "All", "More", "Less", "Best",
})
TITLE_ONLY_TOKENS: tuple[str, ...] = (
    "CEO", "CTO", "CFO", "COO", "CMO", "VP", "Director", "Manager",
    "Engineer", "Head", "Lead", "Partner", "Principal",
)
TITLE_KEYWORDS: tuple[str, ...] = (
    "ceo", "cto", "coo", "cfo", "cmo", "chief", "founder", "co-founder",
    "president", "vp", "vice president", "director", "head of", "head,",
    "partner", "principal", "manager", "lead", "senior", "engineer",
    "scientist", "researcher", "analyst", "designer", "officer",
)

ORG_TYPES: frozenset[str] = frozenset({
    "Organization", "LocalBusiness", "Corporation", "ProfessionalService",
    "Consulting", "LegalService", "FinancialService", "GovernmentOrganization",
    "NGO", "ResearchOrganization", "EducationalOrganization",
})


# ── Dataclasses ─────────────────────────────────────────────────────────────


@dataclass(slots=True)
class CdxRecord:
    url: str
    timestamp: str
    crawl_id: str
    filename: str = ""
    offset: int = 0
    length: int = 0


@dataclass(slots=True)
class Person:
    name: str
    title: str | None = None
    email: str | None = None
    source: str = "heuristic"  # one of: jsonld, microdata, heuristic


@dataclass(slots=True)
class PageContent:
    title: str | None = None
    description: str | None = None
    text: str = ""
    emails: list[str] = field(default_factory=list)
    persons: list[Person] = field(default_factory=list)
    page_type: str | None = None  # team | about | contact | general
    links: list[str] = field(default_factory=list)
    content_hash: str = ""


@dataclass(slots=True)
class OrgFacts:
    description: str | None = None
    founded_year: str | None = None
    location: str | None = None
    social_links: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RunStats:
    domain: str
    crawl_id: str
    pages_fetched: int = 0
    pages_skipped_dedup: int = 0
    persons_found: int = 0
    emails_found: int = 0
    contacts_upserted: int = 0
    snapshots_written: int = 0


# ── Env / DSN ───────────────────────────────────────────────────────────────


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set — cannot connect to Neon."
        )
    return dsn


def _connect() -> psycopg.Connection:
    return psycopg.connect(_dsn(), autocommit=True, connect_timeout=10)


# ── URL helpers ─────────────────────────────────────────────────────────────


def url_path(url: str) -> str:
    after = url.split("://", 1)
    rest = after[1] if len(after) == 2 else url
    slash = rest.find("/")
    if slash == -1:
        return "/"
    path = rest[slash:]
    qpos = path.find("?")
    if qpos != -1:
        path = path[:qpos]
    return path or "/"


def page_score(url: str) -> float:
    path = url_path(url).lower()
    for t in TIER1_PATHS:
        if path == t or path.startswith(t + "/"):
            return 1.0
    for t in TIER2_PATHS:
        if path == t or path.startswith(t + "/"):
            return 0.7
    for t in TIER3_PATHS:
        if path == t or path.startswith(t + "/"):
            return 0.4
    if path == "/":
        return 0.3
    return 0.0


def is_interesting(url: str) -> bool:
    after = url.split("://", 1)
    rest = after[1] if len(after) == 2 else url
    host = rest.split("/", 1)[0].lower()
    if any(host.startswith(p) for p in NOISE_SUBDOMAINS):
        return False
    qpos = url.find("?")
    if qpos != -1:
        qs = url[qpos + 1:]
        if qs:
            non_tracking = 0
            for part in qs.split("&"):
                key = part.split("=", 1)[0]
                if key not in TRACKING_PARAMS:
                    non_tracking += 1
            if non_tracking == 0:
                return False
    return page_score(url) > 0.0


def _extract_base_domain(url: str) -> str:
    after = url.split("://", 1)
    rest = after[1] if len(after) == 2 else url
    host = rest.split("/", 1)[0]
    if host.startswith("www."):
        host = host[4:]
    return host.lower()


def _resolve_url(base: str, href: str) -> str | None:
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("//"):
        scheme = "https:" if base.startswith("https") else "http:"
        return f"{scheme}{href}"
    if href.startswith("/"):
        parts = base.split("://", 1)
        if len(parts) != 2:
            return None
        rest = parts[1]
        slash = rest.find("/")
        origin = rest[:slash] if slash != -1 else rest
        if not origin:
            return None
        scheme = "https" if base.startswith("https") else "http"
        return f"{scheme}://{origin}{href}"
    return None


def _synthetic_record(url: str, crawl_id: str) -> CdxRecord:
    return CdxRecord(
        url=url,
        timestamp=datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        crawl_id=crawl_id,
    )


# ── CDX index resolution + querying ─────────────────────────────────────────


async def recent_crawl_ids(client: httpx.AsyncClient, n: int = MAX_INDICES) -> list[str]:
    try:
        resp = await client.get(f"{CDX_BASE}/collinfo.json")
        if resp.status_code == 200:
            infos = resp.json()
            ids = [c["id"] for c in infos if isinstance(c, dict) and "id" in c]
            if ids:
                return ids[:n]
    except Exception as e:  # noqa: BLE001
        log.warning("collinfo.json unavailable (%s) — using fallback crawl IDs", e)
    return list(FALLBACK_CRAWL_IDS[:n])


def _coerce_int(v: Any) -> int:
    if isinstance(v, bool):
        raise ValueError("bool is not int")
    if isinstance(v, int):
        return v
    if isinstance(v, str):
        return int(v)
    if isinstance(v, float):
        return int(v)
    raise ValueError(f"cannot coerce {v!r} to int")


def _parse_cdx_line(line: str, crawl_id: str) -> CdxRecord | None:
    try:
        raw = json.loads(line)
    except json.JSONDecodeError:
        return None
    try:
        return CdxRecord(
            url=raw["url"],
            timestamp=raw["timestamp"],
            crawl_id=crawl_id,
            filename=raw["filename"],
            offset=_coerce_int(raw["offset"]),
            length=_coerce_int(raw["length"]),
        )
    except (KeyError, ValueError) as e:
        log.debug("skipping CDX line: %s (%s)", line, e)
        return None


async def _query_one_index(
    client: httpx.AsyncClient,
    crawl_id: str,
    domain: str,
    limit: int,
) -> list[CdxRecord]:
    endpoint = (
        f"{CDX_BASE}/{crawl_id}-index"
        f"?url={domain}/*"
        "&matchType=domain"
        "&output=json"
        f"&limit={limit}"
        "&filter=status:200"
        "&filter=mime:text/html"
    )
    resp = await client.get(endpoint)
    resp.raise_for_status()
    out: list[CdxRecord] = []
    for line in resp.text.splitlines():
        line = line.strip()
        if not line:
            continue
        rec = _parse_cdx_line(line, crawl_id)
        if rec and is_interesting(rec.url):
            out.append(rec)
    return out


async def query_domain_multi(
    client: httpx.AsyncClient,
    domain: str,
    per_index_limit: int = CDX_LIMIT,
) -> tuple[str, list[CdxRecord]]:
    """Query CDX across recent indices, deduping by URL. Returns (primary, records)."""
    ids = await recent_crawl_ids(client, MAX_INDICES)
    primary = ids[0] if ids else ""
    seen: set[str] = set()
    all_records: list[CdxRecord] = []
    for crawl_id in ids:
        try:
            batch = await _query_one_index(client, crawl_id, domain, per_index_limit)
        except Exception as e:  # noqa: BLE001
            log.warning("CDX index %s query failed for %s: %s", crawl_id, domain, e)
            continue
        for rec in batch:
            if rec.url not in seen:
                seen.add(rec.url)
                all_records.append(rec)
        if all_records:
            break
    all_records.sort(key=lambda r: r.timestamp, reverse=True)
    return primary, all_records


# ── WARC + live fetch ───────────────────────────────────────────────────────


async def fetch_warc_html(client: httpx.AsyncClient, record: CdxRecord) -> str:
    if ArchiveIterator is None:
        raise RuntimeError("warcio is not installed — cannot decompress WARC records")
    end = record.offset + record.length - 1
    headers = {"Range": f"bytes={record.offset}-{end}"}
    resp = await client.get(f"{S3_BASE}/{record.filename}", headers=headers)
    resp.raise_for_status()
    return _parse_warc_bytes(resp.content)


def _parse_warc_bytes(compressed: bytes) -> str:
    """Decompress one gzipped WARC record and return the HTTP response body."""
    if ArchiveIterator is None:
        raise RuntimeError("warcio is not installed")
    stream = io.BytesIO(compressed)
    for record in ArchiveIterator(stream):
        if record.rec_type == "response":
            payload = record.content_stream().read()
            if isinstance(payload, bytes):
                return payload.decode("utf-8", errors="replace")
            return str(payload)
    raise ValueError("no WARC response record found in payload")


async def fetch_live_html(client: httpx.AsyncClient, url: str) -> str:
    resp = await client.get(
        url,
        headers={"Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"},
    )
    resp.raise_for_status()
    return resp.text


# ── Extraction ──────────────────────────────────────────────────────────────


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


_EMAIL_CHAR_STRIP = re.compile(r"^[^A-Za-z0-9@.+_-]+|[^A-Za-z0-9@.+_-]+$")


def _is_valid_email(s: str) -> bool:
    parts = s.split("@", 1)
    if len(parts) != 2:
        return False
    local, domain = parts
    if not local or len(local) > 64:
        return False
    if not all(c.isalnum() or c in ".-+_" for c in local):
        return False
    if "/" in domain or ":" in domain or "@" in domain:
        return False
    if len(domain) < 4 or len(domain) > 253:
        return False
    tld = domain.rsplit(".", 1)[-1] if "." in domain else ""
    if not (2 <= len(tld) <= 6) or not tld.isalpha():
        return False
    return True


def _scan_emails_in_text(text: str) -> list[str]:
    out: list[str] = []
    for word in text.split():
        stripped = _EMAIL_CHAR_STRIP.sub("", word)
        if _is_valid_email(stripped):
            out.append(stripped.lower())
    return out


def _looks_like_name(s: str) -> bool:
    words = s.split()
    if not (2 <= len(words) <= 4):
        return False
    if any(w in ACRONYM_TOKENS or w in FUNCTION_WORDS for w in words):
        return False
    if any(len(w) > 2 and w.isupper() for w in words):
        return False
    for w in words:
        if len(w) < 2:
            return False
        if not w[0].isupper():
            return False
        if not all(c.isalpha() or c in "-'." for c in w):
            return False
    if any(tok in s for tok in TITLE_ONLY_TOKENS):
        return False
    return True


def _visible_text(soup: BeautifulSoup) -> str:
    skip = {"script", "style", "noscript", "template", "svg", "canvas"}
    parts: list[str] = []
    for node in soup.descendants:
        if isinstance(node, NavigableString):
            parent = node.parent
            if parent is not None and parent.name in skip:
                continue
            # also skip nested under skip tags
            skip_hit = False
            for anc in node.parents:
                if getattr(anc, "name", None) in skip:
                    skip_hit = True
                    break
            if skip_hit:
                continue
            s = str(node).strip()
            if s:
                parts.append(s)
    return " ".join(parts)


def _classify_page_type(url: str, html: str) -> str:
    path = url_path(url).lower()
    html_lower = html.lower()
    if any(tok in path for tok in ("team", "people", "staff", "leadership", "management")):
        return "team"
    if any(tok in path for tok in ("about", "who-we-are", "company")):
        return "about"
    if "contact" in path:
        return "contact"
    is_careers = any(tok in path for tok in ("career", "job", "vacanc", "opening"))
    if not is_careers:
        team_signals = (
            html_lower.count("cto")
            + html_lower.count("ceo")
            + html_lower.count("director")
            + html_lower.count("founder")
        )
        if team_signals >= 3:
            return "team"
    return "general"


def _extract_jsonld_persons(soup: BeautifulSoup) -> list[Person]:
    out: list[Person] = []
    for el in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = el.string or el.get_text() or ""
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        _collect_jsonld_persons(data, out)
    return out


def _collect_jsonld_persons(v: Any, out: list[Person]) -> None:
    if isinstance(v, dict):
        type_val = v.get("@type")
        type_str = type_val if isinstance(type_val, str) else ""
        if type_str == "Person":
            p = _parse_jsonld_person(v)
            if p is not None:
                out.append(p)
        for key, val in v.items():
            if key == "@context":
                continue
            _collect_jsonld_persons(val, out)
    elif isinstance(v, list):
        for item in v:
            _collect_jsonld_persons(item, out)


def _parse_jsonld_person(obj: dict[str, Any]) -> Person | None:
    name_val = obj.get("name")
    if not isinstance(name_val, str):
        return None
    name = name_val.strip()
    if not _looks_like_name(name):
        return None
    title_val = obj.get("jobTitle")
    title = title_val.strip() if isinstance(title_val, str) else None
    email_val = obj.get("email")
    email = None
    if isinstance(email_val, str):
        email = email_val.removeprefix("mailto:").strip().lower() or None
    return Person(name=name, title=title, email=email, source="jsonld")


def _extract_microdata_persons(soup: BeautifulSoup) -> list[Person]:
    out: list[Person] = []
    for el in soup.find_all(attrs={"itemtype": True}):
        itemtype = el.get("itemtype", "")
        if "schema.org/Person" not in itemtype:
            continue
        name_el = el.find(attrs={"itemprop": "name"})
        if name_el is None:
            continue
        name = name_el.get_text(strip=True)
        if not _looks_like_name(name):
            continue
        title_el = el.find(attrs={"itemprop": "jobTitle"})
        title = title_el.get_text(strip=True) if title_el is not None else None
        if title == "":
            title = None
        email_el = el.find(attrs={"itemprop": "email"})
        email = None
        if email_el is not None:
            href = email_el.get("href") if isinstance(email_el, Tag) else None
            raw = href if isinstance(href, str) else email_el.get_text(strip=True)
            if raw:
                email = raw.removeprefix("mailto:").strip().lower() or None
        out.append(Person(name=name, title=title, email=email, source="microdata"))
    return out


def _find_nearby_title(heading: Tag) -> str | None:
    parent = heading.parent
    if parent is not None:
        for child in parent.children:
            if not isinstance(child, Tag) or child is heading:
                continue
            text = child.get_text(" ", strip=True)
            lower = text.lower()
            if any(kw in lower for kw in TITLE_KEYWORDS) and len(lower) < 80:
                return text
    grand = parent.parent if parent is not None else None
    if isinstance(grand, Tag):
        for el in grand.find_all(("p", "span", "div")):
            text = el.get_text(" ", strip=True)
            lower = text.lower()
            if any(kw in lower for kw in TITLE_KEYWORDS) and 3 < len(lower) < 80:
                return text
    return None


def _find_nearby_email(heading: Tag) -> str | None:
    grand = heading.parent.parent if heading.parent is not None else None
    if not isinstance(grand, Tag):
        return None
    a = grand.find("a", href=lambda h: isinstance(h, str) and h.startswith("mailto:"))
    if a is None:
        return None
    href = a.get("href") or ""
    if not isinstance(href, str):
        return None
    email = href.removeprefix("mailto:").split("?", 1)[0].strip().lower()
    return email or None


def _extract_persons_heuristic(soup: BeautifulSoup) -> list[Person]:
    out: list[Person] = []
    for heading in soup.find_all(("h2", "h3", "h4")):
        name = heading.get_text(" ", strip=True)
        if not _looks_like_name(name):
            continue
        title = _find_nearby_title(heading)
        if title is None:
            # Require a confirmed title to avoid picking up section headings
            continue
        email = _find_nearby_email(heading)
        out.append(Person(name=name, title=title, email=email, source="heuristic"))
    return out


def _select_meta(soup: BeautifulSoup, name: str) -> str | None:
    el = soup.find("meta", attrs={"name": name})
    if el is None:
        return None
    content = el.get("content")
    if not isinstance(content, str):
        return None
    content = content.strip()
    return content or None


def _select_meta_property(soup: BeautifulSoup, prop: str) -> str | None:
    el = soup.find("meta", attrs={"property": prop})
    if el is None:
        return None
    content = el.get("content")
    if not isinstance(content, str):
        return None
    content = content.strip()
    return content or None


def extract(html: str, source_url: str) -> PageContent:
    content = PageContent()
    content.content_hash = _sha256_hex(html.encode("utf-8"))
    content.page_type = _classify_page_type(source_url, html)

    soup = BeautifulSoup(html, "html.parser")

    title_el = soup.find("title")
    if title_el is not None:
        t = title_el.get_text(strip=True)
        if t:
            content.title = t

    content.description = (
        _select_meta(soup, "description")
        or _select_meta_property(soup, "og:description")
    )

    content.text = _visible_text(soup)

    # Emails from mailto links
    emails: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a.get("href") or ""
        if not isinstance(href, str) or not href.startswith("mailto:"):
            continue
        email = href.removeprefix("mailto:").split("?", 1)[0].strip()
        if email and "@" in email:
            emails.append(email.lower())
    emails.extend(_scan_emails_in_text(content.text))
    content.emails = sorted(set(emails))

    # JSON-LD persons (highest quality)
    content.persons.extend(_extract_jsonld_persons(soup))
    # Microdata persons — dedup by name
    existing_names = {p.name for p in content.persons}
    for p in _extract_microdata_persons(soup):
        if p.name not in existing_names:
            content.persons.append(p)
            existing_names.add(p.name)

    # DOM heuristic — only on team/about pages
    if content.page_type in ("team", "about"):
        for p in _extract_persons_heuristic(soup):
            if p.name not in existing_names:
                content.persons.append(p)
                existing_names.add(p.name)

    # Same-domain outbound links
    base_domain = _extract_base_domain(source_url)
    links: list[str] = []
    for a in soup.find_all("a", href=True):
        href = a.get("href") or ""
        if not isinstance(href, str):
            continue
        resolved = _resolve_url(source_url, href)
        if resolved and _extract_base_domain(resolved) == base_domain:
            links.append(resolved)
    content.links = sorted(set(links))

    return content


# ── Organization JSON-LD facts ──────────────────────────────────────────────


def extract_org_facts(html: str) -> OrgFacts:
    soup = BeautifulSoup(html, "html.parser")
    for el in soup.find_all("script", attrs={"type": "application/ld+json"}):
        raw = el.string or el.get_text() or ""
        if not raw.strip():
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        facts = _collect_jsonld_org(data)
        if facts is not None:
            return facts
    return OrgFacts()


def _is_org_type(s: str) -> bool:
    return s in ORG_TYPES


def _collect_jsonld_org(v: Any) -> OrgFacts | None:
    if isinstance(v, dict):
        type_val = v.get("@type")
        is_org = False
        if isinstance(type_val, str):
            is_org = _is_org_type(type_val)
        elif isinstance(type_val, list):
            is_org = any(
                isinstance(t, str) and _is_org_type(t) for t in type_val
            )
        if is_org:
            facts = OrgFacts()
            desc = v.get("description")
            if isinstance(desc, str) and desc.strip():
                facts.description = desc.strip()
            founded = v.get("foundingDate")
            if isinstance(founded, str) and founded.strip():
                facts.founded_year = founded.strip()
            addr = v.get("address")
            if addr is not None:
                loc = _extract_address_text(addr)
                if loc:
                    facts.location = loc
            same_as = v.get("sameAs")
            if isinstance(same_as, list):
                for link in same_as:
                    if isinstance(link, str):
                        facts.social_links.append(link)
            elif isinstance(same_as, str):
                facts.social_links.append(same_as)
            if (
                facts.description
                or facts.founded_year
                or facts.location
                or facts.social_links
            ):
                return facts
        for key, val in v.items():
            if key == "@context":
                continue
            nested = _collect_jsonld_org(val)
            if nested is not None:
                return nested
    elif isinstance(v, list):
        for item in v:
            nested = _collect_jsonld_org(item)
            if nested is not None:
                return nested
    return None


def _extract_address_text(addr: Any) -> str:
    if isinstance(addr, str):
        return addr.strip()
    if isinstance(addr, dict):
        parts = []
        for key in ("streetAddress", "addressLocality", "addressRegion", "addressCountry"):
            val = addr.get(key)
            if isinstance(val, str):
                parts.append(val)
        return ", ".join(parts)
    return ""


# ── DB layer ────────────────────────────────────────────────────────────────


def company_id_by_domain(conn: psycopg.Connection, domain: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM companies WHERE canonical_domain = %s OR key = %s LIMIT 1",
            (domain, domain),
        )
        row = cur.fetchone()
    return int(row[0]) if row else None


def update_last_seen(conn: psycopg.Connection, domain: str, record: CdxRecord) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE companies
               SET last_seen_crawl_id          = %s,
                   last_seen_capture_timestamp = %s,
                   last_seen_source_url        = %s,
                   updated_at                  = now()::text
             WHERE canonical_domain = %s OR key = %s
            """,
            (record.crawl_id, record.timestamp, record.url, domain, domain),
        )
        return cur.rowcount or 0


def upsert_snapshot(
    conn: psycopg.Connection,
    company_id: int,
    record: CdxRecord,
    content: PageContent,
) -> int | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM company_snapshots WHERE company_id = %s AND content_hash = %s LIMIT 1",
            (company_id, content.content_hash),
        )
        if cur.fetchone() is not None:
            return None

        text_sample = content.text[:500]
        # Drizzle enum (see packages/company-intel/src/schema.ts) is
        # {"COMMONCRAWL","LIVE_FETCH","MANUAL","PARTNER","BRAVE_SEARCH"} —
        # use "LIVE_FETCH" so TypeScript consumers type-check against this row.
        source_type = "LIVE_FETCH" if not record.filename else "COMMONCRAWL"
        cur.execute(
            """
            INSERT INTO company_snapshots
                (company_id, source_url, crawl_id, capture_timestamp, fetched_at,
                 http_status, mime, content_hash, text_sample,
                 source_type, method, extractor_version,
                 warc_filename, warc_offset, warc_length)
            VALUES (%s, %s, %s, %s, now()::text,
                    200, 'text/html', %s, %s,
                    %s, 'HEURISTIC', %s,
                    %s, %s, %s)
            RETURNING id
            """,
            (
                company_id,
                record.url,
                record.crawl_id,
                record.timestamp,
                content.content_hash,
                text_sample,
                source_type,
                EXTRACTOR_VERSION,
                record.filename,
                int(record.offset),
                int(record.length),
            ),
        )
        row = cur.fetchone()
    return int(row[0]) if row else None


def upsert_fact(
    conn: psycopg.Connection,
    company_id: int,
    field_name: str,
    value_text: str,
    record: CdxRecord,
    confidence: float,
) -> None:
    with conn.cursor() as cur:
        try:
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM company_facts WHERE company_id=%s AND field=%s AND value_text=%s)",
                (company_id, field_name, value_text),
            )
            exists_row = cur.fetchone()
            if exists_row and bool(exists_row[0]):
                return
        except Exception as e:  # noqa: BLE001
            log.debug("company_facts exists-check failed: %s", e)

        cur.execute(
            """
            INSERT INTO company_facts
                (company_id, field, value_text, confidence,
                 source_type, source_url, crawl_id, capture_timestamp,
                 observed_at, method, extractor_version,
                 warc_filename, warc_offset, warc_length)
            VALUES (%s, %s, %s, %s,
                    'COMMONCRAWL', %s, %s, %s,
                    now()::text, 'HEURISTIC', %s,
                    %s, %s, %s)
            """,
            (
                company_id,
                field_name,
                value_text,
                confidence,
                record.url,
                record.crawl_id,
                record.timestamp,
                EXTRACTOR_VERSION,
                record.filename,
                int(record.offset),
                int(record.length),
            ),
        )


def _split_name(full: str) -> tuple[str, str]:
    parts = full.strip().split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    if len(parts) == 1 and parts[0]:
        return parts[0], ""
    return "", ""


def upsert_contact(
    conn: psycopg.Connection,
    company_id: int,
    person: Person,
) -> int | None:
    first, last = _split_name(person.name)
    if not first or not last:
        return None

    email = (person.email or "").strip() or None
    with conn.cursor() as cur:
        if email:
            cur.execute(
                """
                INSERT INTO contacts (first_name, last_name, position, email, company_id, tags)
                VALUES (%s, %s, %s, %s, %s, '["source:common-crawl"]')
                ON CONFLICT (email) DO UPDATE SET
                    position   = COALESCE(EXCLUDED.position, contacts.position),
                    company_id = COALESCE(EXCLUDED.company_id, contacts.company_id),
                    first_name = CASE WHEN contacts.first_name = '' THEN EXCLUDED.first_name ELSE contacts.first_name END,
                    last_name  = CASE WHEN contacts.last_name  = '' THEN EXCLUDED.last_name  ELSE contacts.last_name  END
                RETURNING id
                """,
                (first, last, person.title, email, company_id),
            )
            row = cur.fetchone()
            return int(row[0]) if row else None

        # No email — match by company + name first
        cur.execute(
            "SELECT id FROM contacts WHERE company_id = %s AND first_name ILIKE %s AND last_name ILIKE %s LIMIT 1",
            (company_id, first, last),
        )
        existing = cur.fetchone()
        if existing is not None:
            contact_id = int(existing[0])
            cur.execute(
                "UPDATE contacts SET position = COALESCE(%s, position) WHERE id = %s",
                (person.title, contact_id),
            )
            return contact_id

        cur.execute(
            """
            INSERT INTO contacts (first_name, last_name, position, email, company_id, tags)
            VALUES (%s, %s, %s, NULL, %s, '["source:common-crawl"]')
            RETURNING id
            """,
            (first, last, person.title, company_id),
        )
        row = cur.fetchone()
    return int(row[0]) if row else None


def domains_without_crawl(conn: psycopg.Connection, limit: int) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COALESCE(canonical_domain, key)
              FROM companies
             WHERE last_seen_crawl_id IS NULL
               AND (canonical_domain IS NOT NULL OR key IS NOT NULL)
               AND blocked = false
             ORDER BY updated_at DESC
             LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall() or []
    return [r[0] for r in rows if r[0]]


# ── Pipeline ────────────────────────────────────────────────────────────────


def _build_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT},
        timeout=HTTP_TIMEOUT,
        follow_redirects=True,
    )


async def _gather_limited(
    tasks: Iterable[Any],
    concurrency: int,
) -> list[Any]:
    sem = asyncio.Semaphore(concurrency)

    async def run(task):
        async with sem:
            return await task

    return await asyncio.gather(*(run(t) for t in tasks), return_exceptions=True)


def _persist_facts(
    conn: psycopg.Connection,
    company_id: int,
    record: CdxRecord,
    content: PageContent,
    org: OrgFacts,
) -> None:
    if org.description:
        try:
            upsert_fact(conn, company_id, "description", org.description, record, 0.85)
        except Exception as e:  # noqa: BLE001
            log.warning("upsert org description failed: %s", e)
    if org.founded_year:
        try:
            upsert_fact(conn, company_id, "founded_year", org.founded_year, record, 0.9)
        except Exception as e:  # noqa: BLE001
            log.warning("upsert founded_year failed: %s", e)
    if org.location:
        try:
            upsert_fact(conn, company_id, "location", org.location, record, 0.85)
        except Exception as e:  # noqa: BLE001
            log.warning("upsert location failed: %s", e)
    for link in org.social_links:
        try:
            upsert_fact(conn, company_id, "social_link", link, record, 0.9)
        except Exception as e:  # noqa: BLE001
            log.warning("upsert social_link failed: %s", e)
    if content.description:
        try:
            upsert_fact(conn, company_id, "description", content.description, record, 0.7)
        except Exception as e:  # noqa: BLE001
            log.warning("upsert meta description failed: %s", e)
    for email in content.emails:
        try:
            upsert_fact(conn, company_id, "email", email, record, 0.8)
        except Exception as e:  # noqa: BLE001
            log.warning("upsert email fact failed: %s", e)


async def seed_domain(domain: str, limit: int = 50) -> tuple[str, list[CdxRecord]]:
    """Return (primary_crawl_id, records) without any DB writes."""
    async with _build_client() as client:
        return await query_domain_multi(client, domain, limit)


async def fetch_domain(
    domain: str,
    max_pages: int = 15,
    dry_run: bool = False,
) -> RunStats:
    """Fetch WARC snapshots for a domain, extract contacts, write to Neon."""
    async with _build_client() as client:
        crawl_id, records = await query_domain_multi(client, domain, CDX_LIMIT)
        if not records:
            log.info("no CC records found for %s", domain)
            return RunStats(domain=domain, crawl_id=crawl_id)

        records.sort(key=lambda r: page_score(r.url), reverse=True)
        records = records[:max_pages]

        log.info(
            "fetching %s WARC snapshots for %s (crawl_id=%s)",
            len(records), domain, crawl_id,
        )

        cdx_urls = {r.url for r in records}

        async def fetch_one(rec: CdxRecord) -> tuple[CdxRecord, str | None, Exception | None]:
            try:
                html = await fetch_warc_html(client, rec)
                return rec, html, None
            except Exception as e:  # noqa: BLE001
                return rec, None, e

        results = await _gather_limited(
            (fetch_one(r) for r in records),
            WARC_CONCURRENCY,
        )

        stats = RunStats(domain=domain, crawl_id=crawl_id)
        conn: psycopg.Connection | None = None
        company_id: int | None = None
        if not dry_run:
            conn = _connect()
            company_id = company_id_by_domain(conn, domain)

        try:
            anchor: CdxRecord | None = None
            if records:
                anchor = max(records, key=lambda r: r.timestamp)

            discovered_links: list[str] = []

            for item in results:
                if isinstance(item, Exception):
                    log.warning("fetch task raised: %s", item)
                    continue
                rec, html, err = item
                if err is not None or html is None:
                    log.warning("WARC fetch failed for %s: %s", rec.url, err)
                    continue

                stats.pages_fetched += 1
                content = extract(html, rec.url)
                stats.persons_found += len(content.persons)
                stats.emails_found += len(content.emails)
                discovered_links.extend(content.links)

                if dry_run:
                    log.info(
                        "dry_run url=%s page_type=%s persons=%s emails=%s title=%r",
                        rec.url, content.page_type,
                        len(content.persons), len(content.emails), content.title,
                    )
                    for p in content.persons:
                        log.info("  person name=%s title=%r source=%s", p.name, p.title, p.source)
                    for e in content.emails:
                        log.info("  email %s", e)
                    org_dry = extract_org_facts(html)
                    if org_dry.description or org_dry.founded_year:
                        log.info(
                            "  org_facts description=%r founded=%r location=%r social_links=%s",
                            org_dry.description, org_dry.founded_year,
                            org_dry.location, len(org_dry.social_links),
                        )
                    continue

                if conn is None or company_id is None:
                    continue

                try:
                    snap_id = upsert_snapshot(conn, company_id, rec, content)
                except Exception as e:  # noqa: BLE001
                    log.warning("snapshot write failed for %s: %s", rec.url, e)
                    continue
                if snap_id is None:
                    stats.pages_skipped_dedup += 1
                    continue
                stats.snapshots_written += 1

                org = extract_org_facts(html)
                _persist_facts(conn, company_id, rec, content, org)

                for person in content.persons:
                    try:
                        cid = upsert_contact(conn, company_id, person)
                        if cid is not None:
                            stats.contacts_upserted += 1
                    except Exception as e:  # noqa: BLE001
                        log.warning("contact upsert failed for %s: %s", person.name, e)

            # Depth-1 live fetch
            if not dry_run and company_id is not None and conn is not None:
                candidates = [
                    u for u in discovered_links
                    if u not in cdx_urls and page_score(u) >= 0.7
                ]
                # dedup + cap
                seen: set[str] = set()
                new_links: list[str] = []
                for u in sorted(candidates):
                    if u in seen:
                        continue
                    seen.add(u)
                    new_links.append(u)
                    if len(new_links) >= MAX_DEPTH1_PAGES:
                        break

                if new_links:
                    log.info("depth-1 live fetch: %s links for %s", len(new_links), domain)

                    async def live_one(url: str) -> tuple[str, str | None, Exception | None]:
                        try:
                            return url, await fetch_live_html(client, url), None
                        except Exception as e:  # noqa: BLE001
                            return url, None, e

                    live_results = await _gather_limited(
                        (live_one(u) for u in new_links),
                        LIVE_CONCURRENCY,
                    )

                    for item in live_results:
                        if isinstance(item, Exception):
                            log.warning("live fetch task raised: %s", item)
                            continue
                        url, html, err = item
                        if err is not None or html is None:
                            log.warning("live fetch failed for %s: %s", url, err)
                            continue
                        rec = _synthetic_record(url, crawl_id)
                        stats.pages_fetched += 1
                        content = extract(html, url)
                        stats.persons_found += len(content.persons)
                        stats.emails_found += len(content.emails)
                        try:
                            snap_id = upsert_snapshot(conn, company_id, rec, content)
                        except Exception as e:  # noqa: BLE001
                            log.warning("live snapshot failed for %s: %s", url, e)
                            continue
                        if snap_id is None:
                            stats.pages_skipped_dedup += 1
                            continue
                        stats.snapshots_written += 1

                        org = extract_org_facts(html)
                        _persist_facts(conn, company_id, rec, content, org)

                        for person in content.persons:
                            try:
                                cid_ret = upsert_contact(conn, company_id, person)
                                if cid_ret is not None:
                                    stats.contacts_upserted += 1
                            except Exception as e:  # noqa: BLE001
                                log.warning("contact upsert failed for %s: %s", person.name, e)

            if not dry_run and anchor is not None and conn is not None:
                try:
                    rows = update_last_seen(conn, domain, anchor)
                    if rows > 0:
                        log.info(
                            "last_seen updated for %s (crawl_id=%s ts=%s)",
                            domain, anchor.crawl_id, anchor.timestamp,
                        )
                except Exception as e:  # noqa: BLE001
                    log.warning("update_last_seen failed: %s", e)
        finally:
            if conn is not None:
                conn.close()

        log.info(
            "done domain=%s pages=%s persons=%s contacts_upserted=%s snapshots=%s",
            stats.domain, stats.pages_fetched, stats.persons_found,
            stats.contacts_upserted, stats.snapshots_written,
        )
        return stats


async def backfill_domains(
    limit: int = 500,
    pages_per_domain: int = 15,
    dry_run: bool = False,
) -> tuple[int, int, int]:
    """Process companies in Neon that have no last_seen_crawl_id.

    Returns (domains_processed, total_pages, total_contacts).
    """
    with _connect() as conn:
        domains = domains_without_crawl(conn, limit)
    log.info("backfill queued %s domains", len(domains))

    total_contacts = 0
    total_pages = 0
    for domain in domains:
        try:
            stats = await fetch_domain(domain, pages_per_domain, dry_run)
            total_contacts += stats.contacts_upserted
            total_pages += stats.pages_fetched
        except Exception as e:  # noqa: BLE001
            log.warning("skipping %s: %s", domain, e)
    log.info(
        "backfill complete: domains=%s total_pages=%s total_contacts=%s",
        len(domains), total_pages, total_contacts,
    )
    return len(domains), total_pages, total_contacts


# ── Optional LangGraph wrapper ──────────────────────────────────────────────


def _build_graph():
    """Build a minimal LangGraph graph around ``fetch_domain``.

    State keys: ``domain`` (required), ``max_pages`` (int, default 15),
    ``dry_run`` (bool, default False). Output key: ``stats`` — a dict with
    the ``RunStats`` fields.
    """
    from langgraph.graph import END, START, StateGraph

    async def run_node(state: dict[str, Any]) -> dict[str, Any]:
        domain = state.get("domain")
        if not isinstance(domain, str) or not domain:
            raise ValueError("domain is required")
        max_pages = int(state.get("max_pages") or 15)
        dry_run = bool(state.get("dry_run") or False)
        stats = await fetch_domain(domain, max_pages, dry_run)
        return {
            "stats": {
                "domain": stats.domain,
                "crawl_id": stats.crawl_id,
                "pages_fetched": stats.pages_fetched,
                "pages_skipped_dedup": stats.pages_skipped_dedup,
                "persons_found": stats.persons_found,
                "emails_found": stats.emails_found,
                "contacts_upserted": stats.contacts_upserted,
                "snapshots_written": stats.snapshots_written,
            }
        }

    g = StateGraph(dict)
    g.add_node("run", run_node)
    g.add_edge(START, "run")
    g.add_edge("run", END)
    return g.compile()


try:
    graph = _build_graph()
except Exception as _e:  # pragma: no cover - langgraph optional at import
    log.debug("common_crawl_graph: LangGraph wrapper unavailable (%s)", _e)
    graph = None
