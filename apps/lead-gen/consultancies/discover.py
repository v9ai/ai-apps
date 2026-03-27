"""
AI Consultancy Discovery Engine
================================
Async parallel scraping -> MLX classification -> LanceDB storage

Stack: aiohttp + asyncio + BeautifulSoup + MLX LM + LanceDB + bge-small
Target: M1 Mac, 16GB RAM, Qwen3 8B (Q4_K_M)

Usage:
    python discover.py                    # Run full discovery pipeline
    python discover.py --search-only      # Only scrape, skip LLM classification
    python discover.py --enrich-only      # Only enrich existing records with LLM
    python discover.py --query "NLP"      # Search your LanceDB for matches
"""

import asyncio
import aiohttp
import json
import re
import time
import argparse
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_CONCURRENT_REQUESTS = 15          # semaphore limit (be polite)
REQUEST_TIMEOUT = 20                  # seconds per request
RATE_LIMIT_DELAY = 0.5               # seconds between bursts
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
DB_PATH = Path("./data/consultancies.lance")
LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"

logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("discover")


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Company:
    name: str
    website: str
    source: str                              # where we found it
    description: str = ""
    location: str = ""
    employee_range: str = ""
    specialties: str = ""                    # comma-separated
    remote_policy: str = "unknown"           # remote / hybrid / onsite / unknown
    is_ai_consultancy: bool = True
    confidence: float = 0.0                  # LLM confidence 0-1


# ---------------------------------------------------------------------------
# 1. ASYNC SCRAPING LAYER
# ---------------------------------------------------------------------------

async def fetch(session: aiohttp.ClientSession, url: str, sem: asyncio.Semaphore) -> str:
    """Fetch a URL with semaphore-limited concurrency."""
    async with sem:
        try:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                headers={"User-Agent": USER_AGENT},
                ssl=False,
            ) as resp:
                if resp.status == 200:
                    return await resp.text()
                log.warning(f"HTTP {resp.status} for {url}")
                return ""
        except Exception as e:
            log.warning(f"Fetch error {url}: {e}")
            return ""


# --- Source: Google Search (via SearXNG or direct) -----------------------

def build_search_queries() -> list[str]:
    """Generate targeted search queries for AI consultancies."""
    base_terms = [
        "AI consulting company",
        "machine learning consultancy",
        "NLP consulting services",
        "computer vision consulting",
        "GenAI consulting",
        "MLOps consulting company",
        "artificial intelligence consulting firm",
        "deep learning consulting",
        "LLM consulting services",
        "data science consultancy",
    ]
    regions = [
        # Major markets
        "Europe", "UK", "United Kingdom", "Germany", "France", "Netherlands",
        "Switzerland", "Sweden", "Denmark", "Norway", "Finland",
        "Spain", "Italy", "Portugal", "Ireland", "Belgium", "Austria",
        "Poland", "Romania", "Czech Republic", "Hungary", "Bulgaria",
        "Croatia", "Serbia", "Greece", "Estonia", "Latvia", "Lithuania",
        "Slovakia", "Slovenia", "Luxembourg", "Malta", "Cyprus", "Iceland",
        # Sub-regions
        "DACH", "Nordics", "Scandinavia", "Benelux", "Baltics",
        "Central Europe", "Eastern Europe", "Western Europe", "Southern Europe",
        "remote Europe", "EU remote",
    ]
    queries = []
    for term in base_terms:
        queries.append(term)  # broad
        for region in regions:
            queries.append(f"{term} {region}")
    return queries


async def scrape_searxng(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    query: str,
    searxng_url: str = "http://localhost:8080",
) -> list[dict]:
    """
    Query a local SearXNG instance.
    Falls back gracefully if SearXNG is not running.
    Returns list of {title, url, snippet}.
    """
    params = {
        "q": query,
        "format": "json",
        "categories": "general",
        "engines": "google,bing,duckduckgo",
    }
    try:
        async with sem:
            async with session.get(
                f"{searxng_url}/search",
                params=params,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "snippet": r.get("content", ""),
                        }
                        for r in data.get("results", [])[:10]
                    ]
    except Exception:
        pass  # SearXNG not running -- that's fine
    return []


# --- Source: Clutch.co ---------------------------------------------------

CLUTCH_URLS = [
    "https://clutch.co/developers/artificial-intelligence",
    "https://clutch.co/developers/machine-learning",
    "https://clutch.co/developers/natural-language-processing",
    "https://clutch.co/uk/developers/artificial-intelligence",
    "https://clutch.co/de/developers/artificial-intelligence",
    "https://clutch.co/fr/developers/artificial-intelligence",
    "https://clutch.co/nl/developers/artificial-intelligence",
    "https://clutch.co/se/developers/artificial-intelligence",
    "https://clutch.co/ie/developers/artificial-intelligence",
    "https://clutch.co/ch/developers/artificial-intelligence",
    "https://clutch.co/pl/developers/artificial-intelligence",
    "https://clutch.co/es/developers/artificial-intelligence",
]

async def scrape_clutch(
    session: aiohttp.ClientSession, sem: asyncio.Semaphore
) -> list[Company]:
    """Scrape AI consultancy listings from Clutch.co."""
    companies = []
    for url in CLUTCH_URLS:
        html = await fetch(session, url, sem)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")

        for card in soup.select(".provider-row, .provider-info, [data-provider]"):
            name_el = card.select_one(
                "h3.company_info a, .company-name a, a.provider-name, "
                "[data-link-to-profile]"
            )
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            href = name_el.get("href", "")
            website = urljoin("https://clutch.co", href) if href else ""

            loc_el = card.select_one(".locality, .location")
            location = loc_el.get_text(strip=True) if loc_el else ""

            desc_el = card.select_one(".company-description, .tagline")
            desc = desc_el.get_text(strip=True) if desc_el else ""

            size_el = card.select_one(".company-size, [data-employees]")
            size = size_el.get_text(strip=True) if size_el else ""

            companies.append(Company(
                name=name,
                website=website,
                source="clutch.co",
                description=desc,
                location=location,
                employee_range=size,
            ))
        await asyncio.sleep(RATE_LIMIT_DELAY)

    log.info(f"Clutch: found {len(companies)} companies")
    return companies


# --- Source: GoodFirms.co ------------------------------------------------

GOODFIRMS_URLS = [
    "https://www.goodfirms.co/artificial-intelligence/companies",
    "https://www.goodfirms.co/machine-learning/companies",
    "https://www.goodfirms.co/artificial-intelligence/companies/uk",
    "https://www.goodfirms.co/artificial-intelligence/companies/germany",
    "https://www.goodfirms.co/artificial-intelligence/companies/france",
    "https://www.goodfirms.co/artificial-intelligence/companies/netherlands",
]

async def scrape_goodfirms(
    session: aiohttp.ClientSession, sem: asyncio.Semaphore
) -> list[Company]:
    """Scrape AI consultancy listings from GoodFirms."""
    companies = []
    for url in GOODFIRMS_URLS:
        html = await fetch(session, url, sem)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")

        for card in soup.select(".firm-card, .profile-main, .company-profile"):
            name_el = card.select_one(
                "h3 a, .firm-name a, .company-name a, [itemprop='name']"
            )
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            href = name_el.get("href", "")
            website = urljoin("https://www.goodfirms.co", href) if href else ""

            loc_el = card.select_one(".location, .firm-location, [itemprop='address']")
            location = loc_el.get_text(strip=True) if loc_el else ""

            desc_el = card.select_one(".firm-description, .tagline, .summary")
            desc = desc_el.get_text(strip=True) if desc_el else ""

            companies.append(Company(
                name=name,
                website=website,
                source="goodfirms.co",
                description=desc,
                location=location,
            ))
        await asyncio.sleep(RATE_LIMIT_DELAY)

    log.info(f"GoodFirms: found {len(companies)} companies")
    return companies


# --- Source: Wellfound (AngelList) -- remote-focused ----------------------

async def scrape_wellfound(
    session: aiohttp.ClientSession, sem: asyncio.Semaphore
) -> list[Company]:
    """Scrape AI companies from Wellfound that offer remote roles."""
    companies = []
    urls = [
        "https://wellfound.com/companies?markets[]=Artificial+Intelligence&company_sizes[]=1-10&company_sizes[]=11-50&company_sizes[]=51-200",
        "https://wellfound.com/companies?markets[]=Machine+Learning",
    ]
    for url in urls:
        html = await fetch(session, url, sem)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")

        for card in soup.select(
            "[data-test='StartupResult'], .startup-link, .company-card"
        ):
            name_el = card.select_one("h4, .startup-name, .company-name")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            href = card.get("href") or ""
            if not href:
                link = card.select_one("a[href*='/company/']")
                href = link.get("href", "") if link else ""
            website = urljoin("https://wellfound.com", href) if href else ""

            desc_el = card.select_one(".tagline, .pitch, .company-tagline")
            desc = desc_el.get_text(strip=True) if desc_el else ""

            companies.append(Company(
                name=name,
                website=website,
                source="wellfound.com",
                description=desc,
                remote_policy="likely_remote",
            ))
        await asyncio.sleep(RATE_LIMIT_DELAY)

    log.info(f"Wellfound: found {len(companies)} companies")
    return companies


# --- Source: Search engine results (SearXNG or curated) ------------------

async def discover_from_search(
    session: aiohttp.ClientSession, sem: asyncio.Semaphore
) -> list[Company]:
    """Use SearXNG or curated lists to find companies via search queries."""
    companies = []
    queries = build_search_queries()

    tasks = [scrape_searxng(session, sem, q) for q in queries[:30]]
    results = await asyncio.gather(*tasks)

    seen_domains = set()
    for result_list in results:
        for r in result_list:
            domain = urlparse(r["url"]).netloc
            skip = {"clutch.co", "goodfirms.co", "linkedin.com", "twitter.com",
                    "facebook.com", "youtube.com", "wikipedia.org", "crunchbase.com",
                    "glassdoor.com", "indeed.com", "wellfound.com", "g2.com"}
            if any(s in domain for s in skip):
                continue
            if domain in seen_domains:
                continue
            seen_domains.add(domain)

            companies.append(Company(
                name=r["title"].split(" | ")[0].split(" - ")[0].strip(),
                website=r["url"],
                source="search",
                description=r["snippet"],
            ))

    log.info(f"Search: found {len(companies)} companies")
    return companies


# --- Source: Curated seed list -------------------------------------------

SEED_COMPANIES = [
    # UK
    ("Faculty AI", "https://faculty.ai/", "UK"),
    ("Datatonic", "https://datatonic.com/", "UK"),
    ("Cambridge Consultants", "https://www.cambridgeconsultants.com/", "UK"),
    ("Deeper Insights", "https://deeper-insights.com/", "UK"),
    ("Peak AI", "https://peak.ai/", "UK"),
    ("Profusion", "https://profusion.com/", "UK"),
    ("QuantumBlack", "https://www.quantumblack.com/", "UK"),
    ("Kin + Carta", "https://www.kinandcarta.com/", "UK"),
    ("Polymatica", "https://polymatica.com/", "UK"),
    ("Satalia", "https://www.satalia.com/", "UK"),
    ("Secondmind", "https://www.secondmind.ai/", "UK"),
    # Germany
    ("Explosion AI", "https://explosion.ai/", "Germany"),
    ("Rasa", "https://rasa.com/", "Germany"),
    ("AI Superior", "https://aisuperior.com/", "Germany"),
    ("Alexander Thamm", "https://www.2000.com/", "Germany"),
    ("Adesso SE", "https://www.adesso.de/", "Germany"),
    ("d-fine", "https://www.d-fine.com/", "Germany"),
    ("INFORM GmbH", "https://www.inform-software.com/", "Germany"),
    ("appliedAI", "https://www.appliedai.de/", "Germany"),
    ("Merantix", "https://www.merantix.com/", "Germany"),
    ("Aleph Alpha", "https://aleph-alpha.com/", "Germany"),
    ("MHP", "https://www.mhp.com/", "Germany"),
    ("Comma Soft", "https://www.2000.com/", "Germany"),
    ("Datarevenue", "https://datarevenue.com/", "Germany"),
    # France
    ("Artefact", "https://artefact.com/", "France"),
    ("Devoteam AI", "https://devoteam.com/", "France"),
    ("Heuritech", "https://www.heuritech.com/", "France"),
    ("Dataiku", "https://www.dataiku.com/", "France"),
    ("Ekimetrics", "https://ekimetrics.com/", "France"),
    ("Kernix", "https://www.kernix.com/", "France"),
    ("LightOn", "https://www.lighton.ai/", "France"),
    ("Sicara", "https://www.sicara.fr/", "France"),
    ("Craft AI", "https://www.craft.ai/", "France"),
    # Netherlands
    ("Xomnia", "https://xomnia.com/", "Netherlands"),
    ("Ortec", "https://ortec.com/", "Netherlands"),
    ("Xebia AI", "https://xebia.com/", "Netherlands"),
    ("Zeta Alpha", "https://www.zeta-alpha.com/", "Netherlands"),
    ("Axyon AI", "https://www.axyon.ai/", "Netherlands"),
    ("Aindo", "https://www.aindo.com/", "Italy"),
    # Nordics
    ("Peltarion", "https://peltarion.com/", "Sweden"),
    ("Acoustic AI", "https://www.acousticai.com/", "Sweden"),
    ("Silo AI", "https://www.silo.ai/", "Finland"),
    ("Futurice", "https://futurice.com/", "Finland"),
    ("Computas", "https://computas.com/", "Norway"),
    # Switzerland
    ("Zuhlke", "https://www.2000.com/", "Switzerland"),
    ("Modulos", "https://www.modulos.ai/", "Switzerland"),
    ("DeepCode", "https://www.deepcode.ai/", "Switzerland"),
    # CEE
    ("Nordeus Data", "https://nordeus.com/", "Serbia"),
    ("Netguru", "https://www.netguru.com/", "Poland"),
    ("Deepsense.ai", "https://deepsense.ai/", "Poland"),
    ("Infermedica", "https://infermedica.com/", "Poland"),
    ("UiPath", "https://www.uipath.com/", "Romania"),
    # Iberia
    ("BigML", "https://bigml.com/", "Spain"),
    ("Quostar", "https://www.quostar.com/", "Spain"),
    # Ireland
    ("Accenture The Dock", "https://www.accenture.com/", "Ireland"),
    ("CeADAR", "https://ceadar.ie/", "Ireland"),
    # Big 4 / MBB Europe
    ("BCG Gamma", "https://www.bcg.com/beyond-consulting/bcg-gamma/", "Global/Europe"),
    ("McKinsey QuantumBlack", "https://www.mckinsey.com/capabilities/quantumblack/", "Global/Europe"),
    ("Sopra Steria AI", "https://www.soprasteria.com/", "France/Europe"),
    ("Capgemini AI", "https://www.capgemini.com/", "France/Europe"),
    ("Reply AI", "https://www.reply.com/", "Italy/Europe"),
]

def load_seed_companies() -> list[Company]:
    return [
        Company(name=name, website=url, source="seed", location=loc)
        for name, url, loc in SEED_COMPANIES
    ]


# ---------------------------------------------------------------------------
# 2. WEBSITE SCRAPING -- get actual company pages
# ---------------------------------------------------------------------------

async def scrape_company_website(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    company: Company,
) -> Company:
    """Visit a company's website and extract About/Services text."""
    base = company.website
    if not base or "clutch.co" in base or "goodfirms.co" in base:
        return company

    targets = [base]
    for path in ["/about", "/about-us", "/services", "/what-we-do", "/solutions"]:
        targets.append(urljoin(base, path))

    texts = []
    for url in targets[:3]:
        html = await fetch(session, url, sem)
        if not html:
            continue
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup.select("nav, footer, script, style, header, .cookie"):
            tag.decompose()
        body_text = soup.get_text(separator=" ", strip=True)
        texts.append(body_text[:2000])
        await asyncio.sleep(RATE_LIMIT_DELAY)

    company.description = " | ".join(texts)[:4000]
    return company


# ---------------------------------------------------------------------------
# 3. MLX LLM CLASSIFICATION (Qwen3 8B via mlx-lm)
# ---------------------------------------------------------------------------

def classify_with_mlx(companies: list[Company]) -> list[Company]:
    """
    Use Qwen3 8B via MLX to classify and extract structured data.
    Runs on Metal GPU -- batches companies for efficiency.
    """
    try:
        from mlx_lm import load, generate
    except ImportError:
        log.warning(
            "mlx-lm not installed. Skipping LLM classification.\n"
            "Install with: pip install mlx-lm"
        )
        return companies

    log.info("Loading Qwen3 8B on Metal GPU...")
    model, tokenizer = load("mlx-community/Qwen3-8B-4bit")
    log.info("Model loaded. Classifying companies...")

    for i, c in enumerate(companies):
        if not c.description or len(c.description) < 50:
            continue

        prompt = f"""Analyze this company and respond ONLY with valid JSON, no other text.

Company: {c.name}
Text from their website: {c.description[:1500]}

Return JSON with these exact keys:
{{
  "is_ai_consultancy": true/false,
  "confidence": 0.0-1.0,
  "specialties": ["list", "of", "AI/ML", "subfields"],
  "employee_range": "1-10 | 11-50 | 51-200 | 201-500 | 500+",
  "remote_policy": "remote | hybrid | onsite | unknown",
  "one_line_summary": "What they do in 15 words or less"
}}

Rules:
- is_ai_consultancy = true only if they SELL AI/ML consulting services to other companies
- A company that just uses AI internally is NOT a consultancy
- Be precise with specialties: NLP, CV, GenAI, MLOps, recommendation systems, etc.
/no_think"""

        messages = [{"role": "user", "content": prompt}]
        prompt_text = tokenizer.apply_chat_template(
            messages, add_generation_prompt=True
        )

        try:
            response = generate(
                model, tokenizer, prompt=prompt_text, max_tokens=300, verbose=False
            )
            json_match = re.search(r"\{[^{}]*\}", response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                c.is_ai_consultancy = data.get("is_ai_consultancy", True)
                c.confidence = data.get("confidence", 0.0)
                c.specialties = ", ".join(data.get("specialties", []))
                c.employee_range = data.get("employee_range", "")
                c.remote_policy = data.get("remote_policy", "unknown")
                if data.get("one_line_summary"):
                    c.description = data["one_line_summary"]
        except Exception as e:
            log.warning(f"LLM classify error for {c.name}: {e}")

        if (i + 1) % 10 == 0:
            log.info(f"Classified {i + 1}/{len(companies)}")

    classified = [c for c in companies if c.is_ai_consultancy]
    log.info(
        f"Classification done. {len(classified)}/{len(companies)} confirmed as AI consultancies"
    )
    return classified


# ---------------------------------------------------------------------------
# 4. LANCEDB STORAGE + EMBEDDING
# ---------------------------------------------------------------------------

def store_in_lancedb(companies: list[Company]):
    """
    Embed company descriptions and store in LanceDB.
    Hybrid search: vector (semantic) + full-text + SQL filters.
    """
    try:
        import lancedb
        import pyarrow as pa
    except ImportError:
        log.warning(
            "lancedb not installed. Saving to JSON fallback.\n"
            "Install with: pip install lancedb"
        )
        _save_json_fallback(companies)
        return

    vectors = _embed_companies(companies)

    records = []
    for c, vec in zip(companies, vectors):
        rec = asdict(c)
        rec["vector"] = vec
        records.append(rec)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = lancedb.connect(str(DB_PATH))

    if "companies" in db.table_names():
        tbl = db.open_table("companies")
        tbl.add(records)
        log.info(f"Appended {len(records)} records to existing table")
    else:
        tbl = db.create_table("companies", records)
        log.info(f"Created new table with {len(records)} records")

    try:
        tbl.create_fts_index("description", replace=True)
        tbl.create_fts_index("specialties", replace=True)
    except Exception:
        pass

    log.info(f"LanceDB: {tbl.count_rows()} total records in table")


def _embed_companies(companies: list[Company]) -> list[list[float]]:
    """Generate embeddings for company descriptions using bge-small."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        texts = [
            f"{c.name}. {c.specialties}. {c.description[:500]}"
            for c in companies
        ]
        log.info(f"Embedding {len(texts)} company descriptions...")
        vectors = model.encode(texts, show_progress_bar=True, batch_size=32)
        return vectors.tolist()
    except ImportError:
        log.warning(
            "sentence-transformers not installed. Using zero vectors.\n"
            "Install with: pip install sentence-transformers"
        )
        return [[0.0] * 384 for _ in companies]


def _save_json_fallback(companies: list[Company]):
    Path("./data").mkdir(exist_ok=True)
    out = Path("./data/consultancies.json")
    records = [asdict(c) for c in companies]
    with open(out, "w") as f:
        json.dump(records, f, indent=2)
    log.info(f"Saved {len(records)} companies to {out}")


# ---------------------------------------------------------------------------
# 5. QUERY INTERFACE
# ---------------------------------------------------------------------------

def query_db(query: str, top_k: int = 20, where: str = ""):
    """
    Search your consultancy database.
    Supports hybrid search: semantic + SQL filters.

    Examples:
        query_db("NLP consulting remote Europe")
        query_db("computer vision", where="remote_policy = 'remote'")
        query_db("GenAI MLOps", where="employee_range = '11-50'")
    """
    try:
        import lancedb
        from sentence_transformers import SentenceTransformer
    except ImportError:
        log.error("lancedb and sentence-transformers required for querying")
        return

    db = lancedb.connect(str(DB_PATH))
    tbl = db.open_table("companies")

    embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
    q_vec = embedder.encode([query])[0].tolist()

    search = tbl.search(q_vec).limit(top_k)
    if where:
        search = search.where(where)

    results = search.to_pandas()
    print(f"\n{'='*70}")
    print(f"  Top {len(results)} matches for: \"{query}\"")
    if where:
        print(f"  Filter: {where}")
    print(f"{'='*70}\n")

    for i, row in results.iterrows():
        score = row.get("_distance", 0)
        print(f"  {i+1}. {row['name']}")
        print(f"     Website:     {row['website']}")
        print(f"     Specialties: {row['specialties']}")
        print(f"     Location:    {row['location']}")
        print(f"     Remote:      {row['remote_policy']}")
        print(f"     Size:        {row['employee_range']}")
        print(f"     Similarity:  {1 - score:.3f}")
        print()


# ---------------------------------------------------------------------------
# 6. DEDUPLICATION
# ---------------------------------------------------------------------------

def deduplicate(companies: list[Company]) -> list[Company]:
    seen = {}
    unique = []
    for c in companies:
        domain = urlparse(c.website).netloc.lower().replace("www.", "")
        name_key = re.sub(r"[^a-z0-9]", "", c.name.lower())
        key = domain or name_key
        if key and key not in seen:
            seen[key] = True
            unique.append(c)
    log.info(f"Dedup: {len(companies)} -> {len(unique)} unique companies")
    return unique


# ---------------------------------------------------------------------------
# MAIN PIPELINE
# ---------------------------------------------------------------------------

async def run_discovery(skip_llm: bool = False):
    """Full discovery pipeline: scrape -> deduplicate -> classify -> store."""
    t0 = time.time()
    sem = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

    async with aiohttp.ClientSession() as session:
        # Phase 1: Parallel scraping from all sources
        log.info("Phase 1: Scraping directories in parallel...")
        results = await asyncio.gather(
            scrape_clutch(session, sem),
            scrape_goodfirms(session, sem),
            scrape_wellfound(session, sem),
            discover_from_search(session, sem),
            return_exceptions=True,
        )

        all_companies = load_seed_companies()
        for r in results:
            if isinstance(r, list):
                all_companies.extend(r)
            elif isinstance(r, Exception):
                log.error(f"Scraper error: {r}")

        log.info(f"Phase 1 complete: {len(all_companies)} raw companies")

        # Phase 2: Deduplicate
        all_companies = deduplicate(all_companies)

        # Phase 3: Scrape actual company websites
        log.info("Phase 3: Scraping company websites for descriptions...")
        tasks = [
            scrape_company_website(session, sem, c)
            for c in all_companies
        ]
        enriched = []
        batch_size = 20
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i : i + batch_size]
            batch_results = await asyncio.gather(*batch, return_exceptions=True)
            for r in batch_results:
                if isinstance(r, Company):
                    enriched.append(r)
            log.info(f"  Scraped {min(i + batch_size, len(tasks))}/{len(tasks)} websites")

        all_companies = enriched

    # Phase 4: LLM Classification (runs on Metal GPU)
    if not skip_llm:
        log.info("Phase 4: MLX LLM classification...")
        all_companies = classify_with_mlx(all_companies)
    else:
        log.info("Phase 4: Skipped (--search-only mode)")

    # Phase 5: Store in LanceDB
    log.info("Phase 5: Storing in LanceDB with embeddings...")
    store_in_lancedb(all_companies)

    elapsed = time.time() - t0
    log.info(f"\nDone! {len(all_companies)} companies stored in {elapsed:.1f}s")
    log.info(f"Database: {DB_PATH}")


def main():
    parser = argparse.ArgumentParser(description="AI Consultancy Discovery Engine")
    parser.add_argument("--search-only", action="store_true",
                        help="Only scrape, skip LLM classification")
    parser.add_argument("--enrich-only", action="store_true",
                        help="Re-run LLM classification on existing data")
    parser.add_argument("--query", type=str, default="",
                        help="Search your database (e.g. --query 'NLP remote')")
    parser.add_argument("--where", type=str, default="",
                        help="SQL filter for query (e.g. --where \"remote_policy='remote'\")")
    parser.add_argument("--top-k", type=int, default=20,
                        help="Number of results to return")
    args = parser.parse_args()

    if args.query:
        query_db(args.query, top_k=args.top_k, where=args.where)
    elif args.enrich_only:
        log.info("Re-running LLM classification on existing data...")
        path = Path("./data/consultancies.json")
        if path.exists():
            with open(path) as f:
                data = json.load(f)
            companies = [Company(**d) for d in data]
            companies = classify_with_mlx(companies)
            store_in_lancedb(companies)
    else:
        asyncio.run(run_discovery(skip_llm=args.search_only))


if __name__ == "__main__":
    main()
