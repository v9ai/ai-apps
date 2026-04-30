"""One-shot scraper that enriches the Voxa kids' audiobook catalog with real
metadata (title, author, narrator, duration, description, cover URL, age band).

Reads:  research_agent/data/voxa_kids_catalog.json (slug + url + title_hint)
Writes: research_agent/data/voxa_kids_catalog.json (full enriched entries)

Run from the backend dir:
    .venv/bin/python -m research_agent.scripts.scrape_voxa_catalog

Voxa is a Nuxt SPA — content arrives after JS hydration, so we use Playwright
to render then extract via predictable Romanian-prefixed text patterns
("de: <author>", "Narator: <name>", "Durata: <duration>"). Pages that 500 are
flagged `broken: True` so the audiobooks_graph can exclude them.
"""
from __future__ import annotations

import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "voxa_kids_catalog.json"
CONCURRENCY = 6
NAV_TIMEOUT_MS = 30_000
HYDRATE_TIMEOUT_MS = 12_000
REQUEST_DELAY_S = 0.2  # polite to Voxa

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def parse_duration_to_minutes(text: str) -> Optional[int]:
    """Convert 'Durata: 1h 23m' or '17 min' → integer minutes."""
    if not text:
        return None
    text = text.lower()
    h_match = re.search(r"(\d+)\s*h", text)
    m_match = re.search(r"(\d+)\s*m(in)?", text)
    h = int(h_match.group(1)) if h_match else 0
    m = int(m_match.group(1)) if m_match else 0
    if h == 0 and m == 0:
        # Try "17 min" without 'm' or "1h"-only patterns
        bare = re.search(r"(\d+)\s*(?:min|minute)", text)
        if bare:
            return int(bare.group(1))
        return None
    return h * 60 + m


def infer_age_band(title: str, description: str, categories: str) -> Optional[str]:
    blob = (title + " " + description + " " + categories).lower()
    if any(k in blob for k in ["bebe", "creșă", "cresa", "0-3", "0–3", "primii ani"]):
        return "preschool"
    if any(k in blob for k in ["preșcolar", "prescolar", "3-6", "3–6", "4-6"]):
        return "preschool"
    if any(k in blob for k in [
        "copii", "copilărie", "copilarie", "biblioteca ilustrată", "noapte bună",
        "ficțiune pentru copii", "ficțiune copii", "disney", "povești", "povesti",
        "primele mele", "primele povești",
    ]):
        return "child"
    if any(k in blob for k in ["preadolescent", "11-14", "11–14"]):
        return "preteen"
    if any(k in blob for k in ["adolescent", "young adult", "tânăr"]):
        return "teen"
    return None


async def scrape_one(page: Page, entry: dict) -> dict:
    out = dict(entry)
    url = entry["url"]
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
    except PWTimeout:
        out["broken"] = True
        out["error"] = "navigation timeout"
        return out
    except Exception as exc:
        out["broken"] = True
        out["error"] = f"goto failed: {exc.__class__.__name__}"
        return out

    # Wait for either the product cover or a known error string
    try:
        await page.wait_for_selector(
            "img[src*='voxa-production/uploads/resource'], h1",
            timeout=HYDRATE_TIMEOUT_MS,
        )
    except PWTimeout:
        pass
    await page.wait_for_timeout(800)

    try:
        body_text = await page.evaluate("document.body.innerText || ''")
    except Exception:
        body_text = ""

    if "A apărut o eroare" in body_text or "eroare 500" in body_text.lower():
        out["broken"] = True
        out["error"] = "voxa returned error page"
        return out

    # Cover image
    try:
        cover = await page.evaluate(
            "[...document.querySelectorAll('img')].find("
            "i => i.src && i.src.includes('voxa-production/uploads/resource')"
            ")?.src || null"
        )
    except Exception:
        cover = None

    # Title — sits between "Audiobook"/"Ebook" line and "Ascultă fragment"
    lines = [l.strip() for l in body_text.split("\n") if l.strip()]
    title: Optional[str] = None
    for i, line in enumerate(lines):
        if line in {"Audiobook", "Ebook", "Rezumat"} and i + 1 < len(lines):
            # Title can be the next line, or two lines down (some have "Ascultă fragment" first)
            for cand in lines[i + 1 : i + 4]:
                if cand and cand not in {"Ascultă fragment", "Audiobook", "Ebook"}:
                    title = cand
                    break
            if title:
                break

    # Authors / Narrators — "de: ..." and "Narator: ..." lines
    authors: list[str] = []
    narrators: list[str] = []
    duration_text: Optional[str] = None
    description: Optional[str] = None
    collection: Optional[str] = None
    publisher: Optional[str] = None

    for line in lines:
        if line.startswith("de:") or line.startswith("De:"):
            authors_str = line.split(":", 1)[1].strip()
            authors = [a.strip() for a in re.split(r",|și|&", authors_str) if a.strip()][:3]
        elif line.startswith("Narator:") or line.startswith("Naratori:"):
            n_str = line.split(":", 1)[1].strip()
            narrators = [n.strip() for n in re.split(r",|și|&", n_str) if n.strip()][:3]
        elif line.startswith("Durata:") or line.startswith("Lungime:"):
            duration_text = line.split(":", 1)[1].strip()
        elif line.startswith("Colecție:") or line.startswith("Colectie:"):
            collection = line.split(":", 1)[1].strip()
        elif line.startswith("Publicat de:"):
            publisher = line.split(":", 1)[1].strip()

    # Description — typically the longest line that's not nav/footer chrome
    chrome_strings = {
        "Explorează", "Voxa Cadou", "Voxa Business", "Încearcă 7 zile gratuit",
        "Contul meu", "Vezi întreaga descriere", "Se încadrează la",
        "Titluri Similare", "Vezi toate", "S-ar putea sǎ-ți placǎ și...",
        "Cum funcționează?", "Asculți fără internet",
    }
    candidates = [
        l for l in lines
        if len(l) > 80 and not l.startswith(("Companie", "Politic", "© ", "Ⓒ"))
        and l not in chrome_strings
        and "voxa.rofolosește" not in l
    ]
    if candidates:
        description = candidates[0][:1200]

    # Categories block — rendered as a single concatenated line like
    # "Ficțiune pentru copiiCopii și familieNoapte bunăDisney"
    categories_line = ""
    for line in lines:
        if any(t in line for t in ["Ficțiune pentru copii", "Copii și familie", "Noapte bună"]):
            categories_line = line
            break

    duration_min = parse_duration_to_minutes(duration_text or "")
    age_band = infer_age_band(title or "", description or "", categories_line)

    out.update({
        "title": title or entry.get("title_hint"),
        "authors": authors,
        "narrators": narrators,
        "duration_text": duration_text,
        "duration_minutes": duration_min,
        "description": description,
        "cover_url": cover,
        "collection": collection,
        "publisher": publisher,
        "categories": categories_line or None,
        "age_band": age_band,
        "broken": False,
    })
    return out


async def worker(q: asyncio.Queue, results: list[dict], browser_ctx, idx: int):
    page = await browser_ctx.new_page()
    while True:
        entry = await q.get()
        if entry is None:
            q.task_done()
            break
        try:
            enriched = await scrape_one(page, entry)
        except Exception as exc:
            enriched = dict(entry)
            enriched["broken"] = True
            enriched["error"] = f"{exc.__class__.__name__}: {exc}"[:200]
        results.append(enriched)
        if len(results) % 25 == 0:
            print(f"  [{len(results)}] last: {(enriched.get('title') or enriched.get('slug'))[:60]}", flush=True)
        await asyncio.sleep(REQUEST_DELAY_S)
        q.task_done()
    await page.close()


async def main():
    if not CATALOG_PATH.exists():
        print(f"Catalog not found at {CATALOG_PATH}", file=sys.stderr)
        sys.exit(1)
    with CATALOG_PATH.open(encoding="utf-8") as f:
        catalog = json.load(f)
    entries = catalog.get("audiobooks", [])
    print(f"Scraping {len(entries)} entries with concurrency {CONCURRENCY}…")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent=USER_AGENT, viewport={"width": 1280, "height": 900})

        q: asyncio.Queue = asyncio.Queue()
        for e in entries:
            q.put_nowait(e)
        for _ in range(CONCURRENCY):
            q.put_nowait(None)

        results: list[dict] = []
        workers = [asyncio.create_task(worker(q, results, ctx, i)) for i in range(CONCURRENCY)]
        await q.join()
        await asyncio.gather(*workers)
        await browser.close()

    # Preserve original ordering by slug for diff readability
    by_slug = {r["slug"]: r for r in results}
    ordered = [by_slug[e["slug"]] for e in entries if e["slug"] in by_slug]
    broken_count = sum(1 for r in ordered if r.get("broken"))
    print(f"Done. {len(ordered) - broken_count} good, {broken_count} broken.")

    payload = {
        "count": len(ordered),
        "good_count": len(ordered) - broken_count,
        "broken_count": broken_count,
        "source": "voxa.ro product pages (playwright scrape)",
        "audiobooks": ordered,
    }
    with CATALOG_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"Wrote {CATALOG_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
