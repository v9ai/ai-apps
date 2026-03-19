import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ro,ru,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def detect_source(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    if "999.md" in domain:
        return "999md"
    elif "imobiliare.ro" in domain:
        return "imobiliare"
    return "unknown"


async def scrape_listing(url: str) -> dict:
    """Fetch a listing page and return cleaned text for LLM extraction."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30.0) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "iframe"]):
        tag.decompose()

    source = detect_source(url)
    if source == "999md":
        return _extract_999md(soup, url)
    elif source == "imobiliare":
        return _extract_imobiliare(soup, url)
    else:
        return {
            "source": "unknown",
            "url": url,
            "text": soup.get_text(separator="\n", strip=True)[:8000],
        }


def _extract_999md(soup: BeautifulSoup, url: str) -> dict:
    blocks = []

    title = soup.find("h1")
    if title:
        blocks.append(f"Title: {title.get_text(strip=True)}")

    # Price block
    for el in soup.find_all(class_=lambda c: c and "price" in c.lower()):
        text = el.get_text(strip=True)
        if any(ch.isdigit() for ch in text):
            blocks.append(f"Price: {text}")
            break

    # Characteristics table (key-value rows)
    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            val = cells[1].get_text(strip=True)
            if key and val:
                blocks.append(f"{key}: {val}")

    # Description
    for cls in ["descr", "description", "js-description"]:
        desc = soup.find(class_=lambda c: c and cls in c.lower())
        if desc:
            blocks.append(f"Description: {desc.get_text(separator=' ', strip=True)[:1500]}")
            break

    # Fallback to main content
    if len(blocks) < 4:
        main = soup.find("main") or soup.find(id="main") or soup.body
        if main:
            blocks.append(main.get_text(separator="\n", strip=True)[:6000])

    return {"source": "999md", "url": url, "text": "\n".join(blocks)}


def _extract_imobiliare(soup: BeautifulSoup, url: str) -> dict:
    blocks = []

    title = soup.find("h1")
    if title:
        blocks.append(f"Title: {title.get_text(strip=True)}")

    # Price
    for el in soup.find_all(class_=lambda c: c and ("price" in c.lower() or "pret" in c.lower())):
        text = el.get_text(strip=True)
        if any(ch.isdigit() for ch in text):
            blocks.append(f"Price: {text}")
            break

    # Property detail lists
    for el in soup.find_all(["ul", "dl", "table"]):
        for item in el.find_all(["li", "dt", "dd", "tr"]):
            text = item.get_text(strip=True)
            if text and len(text) < 300:
                blocks.append(text)

    # Description
    for cls in ["description", "descriere", "caracteristici", "detalii"]:
        desc = soup.find(class_=lambda c: c and cls in c.lower())
        if desc:
            blocks.append(f"Description: {desc.get_text(separator=' ', strip=True)[:1500]}")
            break

    if len(blocks) < 4:
        main = soup.find("main") or soup.find(id="content") or soup.body
        if main:
            blocks.append(main.get_text(separator="\n", strip=True)[:6000])

    return {"source": "imobiliare", "url": url, "text": "\n".join(blocks)}
