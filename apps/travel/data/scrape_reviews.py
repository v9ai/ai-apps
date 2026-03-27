"""Playwright-based review scraper for Google Maps and Booking.com.

Uses headless Chromium to scrape real review data (rating, count, review texts)
for each hotel. Google Maps consent page handled automatically.

Output: data/scraped_reviews.json — consumed by the Rust pipeline.

Usage:
    python3 data/scrape_reviews.py
"""

import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

HOTELS = [
    {"id": "petra-view-meteora", "name": "Petra View Hotel Meteora", "region": "Kalambaka Meteora Greece"},
    {"id": "urban-athena-hotel", "name": "Urban Athena Hotel", "region": "Athens Greece"},
    {"id": "casa-cook-rethymno", "name": "Casa Cook Rethymno", "region": "Rethymno Crete Greece"},
    {"id": "domes-zeen-chania", "name": "Domes Zeen Chania", "region": "Chania Crete Greece"},
    {"id": "numo-ierapetra", "name": "Numo Ierapetra Beach Resort", "region": "Ierapetra Crete Greece"},
    {"id": "w-hotel-crete", "name": "W Crete", "region": "Chania Crete Greece"},
    {"id": "santorini-canaves-oia-epitome", "name": "Canaves Oia Epitome", "region": "Santorini Greece"},
    {"id": "costa-navarino-mandarin", "name": "Mandarin Oriental Costa Navarino", "region": "Peloponnese Greece"},
    {"id": "six-senses-crete", "name": "Six Senses Crete", "region": "Chania Crete Greece"},
    {"id": "one-and-only-kea", "name": "One&Only Kea Island", "region": "Kea Greece"},
    {"id": "aman-elounda", "name": "Aman Elounda", "region": "Elounda Crete Greece"},
]


def accept_google_consent(page):
    """Accept Google consent page (works for any locale)."""
    for btn_text in ["Acceptă tot", "Accept all", "Alle akzeptieren", "Aceptar todo", "Accepter tout", "Accetta tutto"]:
        try:
            page.click(f'button:has-text("{btn_text}")', timeout=3000)
            page.wait_for_timeout(2000)
            return True
        except Exception:
            pass
    return False


def parse_rating(text: str) -> float:
    """Parse a rating like '4,6' or '4.6' and convert /5 → /10."""
    text = text.replace(",", ".").strip()
    try:
        r = float(text)
        if 1.0 <= r <= 5.0:
            return round(r * 2, 1)
        if 5.0 < r <= 10.0:
            return round(r, 1)
    except ValueError:
        pass
    return 0.0


def parse_count(text: str) -> int:
    """Parse a count like '6.391' or '6,391' or '6391'."""
    # Remove dots/commas used as thousands separators
    cleaned = re.sub(r"[.\s]", "", text.replace(",", ""))
    try:
        return int(cleaned)
    except ValueError:
        return 0


def scrape_google_maps(page, hotel_name: str, region: str) -> dict:
    """Scrape Google Maps for hotel rating, reviews, and images using headless Playwright."""
    result = {"rating": 0.0, "count": 0, "texts": [], "images": [], "source": "google_maps"}

    query = f"{hotel_name} {region} hotel"
    url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(5000)
        accept_google_consent(page)
        page.wait_for_timeout(4000)

        # Get page text — contains ratings in format "4,6(6.391)" or "4.6 ★ (6,391)"
        visible_text = page.inner_text("body")

        # Extract rating from list items: "4,4(638)" or "4.6(6.391)"
        list_ratings = re.findall(r"(\d+[.,]\d+)\s*\((\d[\d.,]*)\)", visible_text)
        for r_str, c_str in list_ratings:
            r = parse_rating(r_str)
            c = parse_count(c_str)
            if r > result["rating"]:
                result["rating"] = r
            if c > result["count"]:
                result["count"] = c

        # Extract from detail panel: "4,6\n6.391 recenzii" or "4.6\n6,391 reviews"
        detail_pattern = re.findall(
            r"(\d+[.,]\d+)\s*(?:★.*?)?\n\s*(\d[\d.,]*)\s+(?:recenzii|reviews?|avis|Bewertungen|reseñas)",
            visible_text,
        )
        for r_str, c_str in detail_pattern:
            r = parse_rating(r_str)
            c = parse_count(c_str)
            if r > result["rating"]:
                result["rating"] = r
            if c > result["count"]:
                result["count"] = c

        # Also try: "N recenzii" standalone
        count_matches = re.findall(r"(\d[\d.,]*)\s+(?:recenzii|reviews?)", visible_text)
        for c_str in count_matches:
            c = parse_count(c_str)
            if c > result["count"]:
                result["count"] = c

        # Click first result to get detail panel + reviews
        try:
            first_link = page.locator("[role='feed'] > div a").first
            if first_link.is_visible(timeout=2000):
                first_link.click()
                page.wait_for_timeout(4000)

                detail_text = page.inner_text("body")

                # Re-extract from detail panel
                for r_str, c_str in re.findall(
                    r"(\d+[.,]\d+)\s*(?:★.*?)?\n\s*(\d[\d.,]*)\s+(?:recenzii|reviews?)",
                    detail_text,
                ):
                    r = parse_rating(r_str)
                    c = parse_count(c_str)
                    if r > result["rating"]:
                        result["rating"] = r
                    if c > result["count"]:
                        result["count"] = c

                # Try to find review texts in the detail panel
                review_els = page.locator(".wiI7pd, .MyEned, .rsqaWe").all()
                for el in review_els[:10]:
                    try:
                        text = el.inner_text(timeout=1000).strip()
                        if 20 < len(text) < 500:
                            result["texts"].append(text)
                    except Exception:
                        pass

                # Extract images from detail panel (googleusercontent.com photos)
                img_els = page.locator("img[src*='googleusercontent.com']").all()
                for el in img_els[:12]:
                    try:
                        src = el.get_attribute("src", timeout=500)
                        if src and "googleusercontent.com" in src:
                            # Upscale to 800x600
                            upscaled = re.sub(r"=w\d+-h\d+", "=w800-h600", src)
                            if upscaled not in result["images"]:
                                result["images"].append(upscaled)
                    except Exception:
                        pass

                # Try clicking "Photos" tab for more images
                try:
                    photos_tab = page.locator("button:has-text('Photos'), button:has-text('Fotografii'), button:has-text('Foto')")
                    if photos_tab.count() > 0:
                        photos_tab.first.click(timeout=2000)
                        page.wait_for_timeout(3000)
                        more_imgs = page.locator("img[src*='googleusercontent.com']").all()
                        for el in more_imgs[:12]:
                            try:
                                src = el.get_attribute("src", timeout=500)
                                if src and "googleusercontent.com" in src:
                                    upscaled = re.sub(r"=w\d+-h\d+", "=w800-h600", src)
                                    if upscaled not in result["images"]:
                                        result["images"].append(upscaled)
                            except Exception:
                                pass
                except Exception:
                    pass
        except Exception:
            pass

    except Exception as e:
        print(f"    Maps error: {e}")

    return result


def scrape_booking(page, hotel_name: str, region: str) -> dict:
    """Scrape Booking.com for hotel rating, reviews, and images using headless Playwright."""
    result = {"rating": 0.0, "count": 0, "texts": [], "images": [], "source": "booking"}

    query = f"{hotel_name} {region}"
    url = f"https://www.booking.com/searchresults.html?ss={query.replace(' ', '+')}&lang=en-us"

    try:
        page.goto(url, wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(3000)

        # Dismiss cookie banner
        try:
            page.click("button#onetrust-accept-btn-handler", timeout=3000)
            page.wait_for_timeout(1000)
        except Exception:
            pass

        visible_text = page.inner_text("body")

        # Booking shows scores like "8.7" and "1,234 reviews"
        # Pattern: "Scored 8.7" or standalone "8.7" near "reviews"
        score_matches = re.findall(r"(\d+\.?\d*)\s*(?:/\s*10|Scored|score)", visible_text, re.IGNORECASE)
        for m in score_matches:
            r = float(m)
            if 1.0 <= r <= 10.0 and r > result["rating"]:
                result["rating"] = round(r, 1)

        # Try Booking-specific selectors
        try:
            score_els = page.locator("[data-testid='review-score'] div").all()
            for el in score_els[:5]:
                try:
                    text = el.inner_text(timeout=500).strip()
                    r = float(text)
                    if 1.0 <= r <= 10.0 and r > result["rating"]:
                        result["rating"] = round(r, 1)
                except (ValueError, Exception):
                    pass
        except Exception:
            pass

        # Extract review count
        count_matches = re.findall(r"([\d,]+)\s+reviews?", visible_text, re.IGNORECASE)
        for m in count_matches:
            c = int(m.replace(",", ""))
            if c > result["count"]:
                result["count"] = c

        # JSON-LD structured data
        content = page.content()
        ld_ratings = re.findall(r'"ratingValue"\s*:\s*"?(\d+\.?\d*)"?', content)
        for m in ld_ratings:
            r = float(m)
            if r <= 5.0:
                r *= 2
            if 1.0 <= r <= 10.0 and r > result["rating"]:
                result["rating"] = round(r, 1)

        ld_counts = re.findall(r'"reviewCount"\s*:\s*"?(\d+)"?', content)
        for m in ld_counts:
            c = int(m)
            if c > result["count"]:
                result["count"] = c

        # Review text snippets
        try:
            review_els = page.locator(".c-review__body, .review_item_review_content, .db29ecfbe2").all()
            for el in review_els[:10]:
                try:
                    text = el.inner_text(timeout=500).strip()
                    if 20 < len(text) < 500:
                        result["texts"].append(text)
                except Exception:
                    pass
        except Exception:
            pass

        # Extract hotel images from Booking.com (bstatic.com CDN)
        img_els = page.locator("img[src*='bstatic.com']").all()
        for el in img_els[:20]:
            try:
                src = el.get_attribute("src", timeout=500)
                if src and "/images/hotel/" in src:
                    # Upscale by replacing /square\d+/ or /max\d+x\d+/ with /max1024x768/
                    upscaled = re.sub(r"/square\d+/", "/max1024x768/", src)
                    upscaled = re.sub(r"/max\d+x\d+/", "/max1024x768/", upscaled)
                    if upscaled not in result["images"]:
                        result["images"].append(upscaled)
            except Exception:
                pass

        # If few images from search, try clicking first hotel result
        if len(result["images"]) < 3:
            try:
                first_hotel = page.locator("[data-testid='property-card'] a").first
                if first_hotel.is_visible(timeout=2000):
                    first_hotel.click()
                    page.wait_for_timeout(3000)
                    detail_imgs = page.locator("img[src*='bstatic.com']").all()
                    for el in detail_imgs[:20]:
                        try:
                            src = el.get_attribute("src", timeout=500)
                            if src and "/images/hotel/" in src:
                                upscaled = re.sub(r"/square\d+/", "/max1024x768/", src)
                                upscaled = re.sub(r"/max\d+x\d+/", "/max1024x768/", upscaled)
                                if upscaled not in result["images"]:
                                    result["images"].append(upscaled)
                        except Exception:
                            pass
            except Exception:
                pass

    except Exception as e:
        print(f"    Booking error: {e}")

    return result


def scrape_google_search(page, hotel_name: str, region: str) -> dict:
    """Fallback: scrape Google search knowledge panel for rating data."""
    result = {"rating": 0.0, "count": 0, "texts": [], "source": "google_search"}

    query = f"{hotel_name} {region} hotel reviews"
    url = f"https://www.google.com/search?q={query.replace(' ', '+')}&hl=en"

    try:
        page.goto(url, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        accept_google_consent(page)
        page.wait_for_timeout(2000)

        visible_text = page.inner_text("body")

        # "Rated 4.3 out of 5" → 8.6/10
        for m in re.findall(r"[Rr]ated\s+(\d+\.?\d*)\s+out\s+of\s+5", visible_text):
            r = float(m) * 2
            if 2.0 <= r <= 10.0 and r > result["rating"]:
                result["rating"] = round(r, 1)

        # "8.7/10"
        for m in re.findall(r"(\d+\.?\d*)\s*/\s*10", visible_text):
            r = float(m)
            if 1.0 <= r <= 10.0 and r > result["rating"]:
                result["rating"] = round(r, 1)

        # "(1,234)" or "1,234 reviews"
        for m in re.findall(r"\((\d[\d,]*)\)", visible_text):
            c = int(m.replace(",", ""))
            if 10 < c and c > result["count"]:
                result["count"] = c

        for m in re.findall(r"([\d,]+)\s+reviews?", visible_text, re.IGNORECASE):
            c = int(m.replace(",", ""))
            if c > result["count"]:
                result["count"] = c

        # Snippets
        try:
            snippet_els = page.locator(".VwiC3b, .BNeawe, .lEBKkf").all()
            for el in snippet_els[:10]:
                try:
                    text = el.inner_text(timeout=500).strip()
                    if 30 < len(text) < 500:
                        result["texts"].append(text)
                except Exception:
                    pass
        except Exception:
            pass

    except Exception as e:
        print(f"    Google search error: {e}")

    return result


def main():
    out_path = Path(__file__).parent / "scraped_reviews.json"
    all_results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )

        # Pre-accept Google consent on Maps domain
        page = context.new_page()
        page.goto("https://www.google.com/maps", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        accept_google_consent(page)
        page.wait_for_timeout(1000)
        page.close()

        for i, hotel in enumerate(HOTELS):
            hid = hotel["id"]
            name = hotel["name"]
            region = hotel["region"]
            print(f"[{i+1}/{len(HOTELS)}] {name}")

            best_rating = 0.0
            best_count = 0
            all_texts = []
            sources = []

            all_images = []

            # Source 1: Google Maps
            page = context.new_page()
            gm = scrape_google_maps(page, name, region)
            page.close()
            if gm["rating"] > best_rating:
                best_rating = gm["rating"]
            if gm["count"] > best_count:
                best_count = gm["count"]
            if gm["texts"]:
                all_texts.extend(gm["texts"])
            if gm["rating"] > 0 or gm["count"] > 0:
                sources.append("google_maps")
            # Google Maps images first (higher quality)
            all_images.extend(gm.get("images", []))
            print(f"  Maps: rating={gm['rating']}, count={gm['count']}, texts={len(gm['texts'])}, images={len(gm.get('images', []))}")

            time.sleep(1)

            # Source 2: Booking.com
            page = context.new_page()
            bk = scrape_booking(page, name, region)
            page.close()
            if bk["rating"] > best_rating:
                best_rating = bk["rating"]
            if bk["count"] > best_count:
                best_count = bk["count"]
            if bk["texts"]:
                all_texts.extend(bk["texts"])
            if bk["rating"] > 0 or bk["count"] > 0:
                sources.append("booking")
            # Booking.com images after Google Maps
            all_images.extend(gm_img for gm_img in bk.get("images", []) if gm_img not in all_images)
            print(f"  Booking: rating={bk['rating']}, count={bk['count']}, texts={len(bk['texts'])}, images={len(bk.get('images', []))}")

            time.sleep(1)

            # Source 3: Google search fallback
            if best_rating == 0.0 and best_count == 0:
                page = context.new_page()
                gs = scrape_google_search(page, name, region)
                page.close()
                if gs["rating"] > best_rating:
                    best_rating = gs["rating"]
                if gs["count"] > best_count:
                    best_count = gs["count"]
                if gs["texts"]:
                    all_texts.extend(gs["texts"])
                if gs["rating"] > 0 or gs["count"] > 0:
                    sources.append("google_search")
                print(f"  Google: rating={gs['rating']}, count={gs['count']}, texts={len(gs['texts'])}")
                time.sleep(1)

            # Deduplicate texts
            seen = set()
            unique_texts = []
            for t in all_texts:
                key = t[:50].lower()
                if key not in seen:
                    seen.add(key)
                    unique_texts.append(t)

            # Deduplicate and limit images to 6
            gallery = list(dict.fromkeys(all_images))[:6]

            all_results[hid] = {
                "review_rating": best_rating,
                "review_count": best_count,
                "review_texts": unique_texts[:15],
                "gallery": gallery,
                "sources": sources,
            }

            status = "FOUND" if best_count > 0 or best_rating > 0 else "NONE"
            print(f"  => [{status}] rating={best_rating}, count={best_count}, texts={len(unique_texts)}, gallery={len(gallery)}")

        browser.close()

    with open(out_path, "w") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    found = sum(1 for v in all_results.values() if v["review_count"] > 0 or v["review_rating"] > 0)
    print(f"\nDone. {found}/{len(HOTELS)} hotels have real review data.")
    print(f"Output: {out_path}")


if __name__ == "__main__":
    main()
