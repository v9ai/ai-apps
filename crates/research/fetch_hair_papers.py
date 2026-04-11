"""Fetch 100 hair-care-protocol-related papers from Semantic Scholar (2020+)."""

import json, time, urllib.request, urllib.parse, sys

BASE = "https://api.semanticscholar.org/graph/v1/paper/search"
FIELDS = "title,authors,year,url,abstract,venue,citationCount,externalIds"
MIN_YEAR = 2020

QUERIES = [
    "iron deficiency telogen effluvium hair loss ferritin",
    "vitamin D deficiency alopecia hair follicle",
    "zinc supplementation hair loss alopecia",
    "vitamin B12 folate deficiency hair loss",
    "magnesium hair follicle growth",
    "omega-3 fatty acids EPA DHA hair loss scalp",
    "topical finasteride androgenetic alopecia",
    "oral minoxidil androgenetic alopecia efficacy",
    "saw palmetto 5-alpha-reductase hair loss",
    "pumpkin seed oil hair growth DHT",
    "selenium thyroid autoimmune hair loss",
    "berberine insulin resistance androgenetic",
    "inositol PCOS hair loss",
    "low-level laser therapy LLLT hair growth",
    "microneedling dermaroller hair regrowth minoxidil",
    "DHT dihydrotestosterone androgenetic alopecia mechanism",
    "nutritional deficiency alopecia treatment systematic review",
    "hair loss biomarkers blood test panel",
]

seen = {}  # paperId -> paper dict

for i, q in enumerate(QUERIES):
    params = urllib.parse.urlencode({
        "query": q,
        "year": f"{MIN_YEAR}-",
        "limit": 20,
        "fields": FIELDS,
    })
    url = f"{BASE}?{params}"
    print(f"[{i+1}/{len(QUERIES)}] {q[:50]}...", file=sys.stderr)

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HairCareProtocol/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  error: {e}", file=sys.stderr)
        time.sleep(2)
        continue

    for paper in data.get("data", []):
        pid = paper.get("paperId")
        if not pid or pid in seen:
            continue
        year = paper.get("year")
        if year and year < MIN_YEAR:
            continue
        seen[pid] = {
            "paperId": pid,
            "title": paper.get("title", ""),
            "year": year,
            "venue": paper.get("venue", ""),
            "citationCount": paper.get("citationCount", 0),
            "authors": [a.get("name", "") for a in (paper.get("authors") or [])[:6]],
            "abstract": (paper.get("abstract") or "")[:600],
            "url": paper.get("url", ""),
            "doi": (paper.get("externalIds") or {}).get("DOI", ""),
        }

    print(f"  +{len(data.get('data', []))} papers, {len(seen)} unique total", file=sys.stderr)
    time.sleep(1.1)  # rate limit

# Sort by citations descending, take top 100
papers = sorted(seen.values(), key=lambda p: p.get("citationCount", 0) or 0, reverse=True)[:100]

print(json.dumps(papers, indent=2))
print(f"\nTotal: {len(papers)} papers (from {len(seen)} unique)", file=sys.stderr)
