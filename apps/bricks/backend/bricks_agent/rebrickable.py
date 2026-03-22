"""Parse Rebrickable MOC URLs to extract metadata.

The Rebrickable API does NOT have MOC endpoints, so we extract metadata
from the URL slug structure:
    https://rebrickable.com/mocs/MOC-154803/JKBrickworks/rapid-fire-spring-launcher/
"""

from __future__ import annotations

import re
from urllib.parse import unquote


def parse_moc_url(url: str) -> dict:
    """Extract MOC metadata from a Rebrickable MOC URL.

    Returns dict with keys: moc_id, designer, name, url.
    Raises ValueError if the URL doesn't match the expected pattern.
    """
    url = url.strip().rstrip("/")
    pattern = r"rebrickable\.com/mocs/(MOC-\d+)/([^/]+)/([^/]+)"
    match = re.search(pattern, url)
    if not match:
        raise ValueError(f"Invalid Rebrickable MOC URL: {url}")

    moc_id = match.group(1)
    designer = unquote(match.group(2))
    name_slug = unquote(match.group(3))
    name = name_slug.replace("-", " ").title()

    return {
        "moc_id": moc_id,
        "designer": designer,
        "name": name,
        "url": url,
    }
