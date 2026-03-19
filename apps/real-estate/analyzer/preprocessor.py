"""Multilingual text normalization for Romanian, Russian, and English real estate listings.

Zero-dependency module (pure regex + dictionaries). Normalizes terminology from
999.md (Russian/Romanian) and imobiliare.ro (Romanian) into consistent English
before the text reaches the DeepSeek extractor.
"""

import re
from typing import Literal

# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------

# Cyrillic character range used to detect Russian
_CYRILLIC_RE = re.compile(r"[\u0400-\u04FF]")

# Common Romanian words (with diacritics and without)
_RO_MARKERS = {
    "apartament", "cameră", "camere", "camera", "etaj", "suprafață", "suprafata",
    "bucătărie", "bucatarie", "balcon", "parcare", "stradă", "strada",
    "mobilat", "nemobilat", "renovat", "reparație", "reparatie",
    "preț", "pret", "bloc", "încălzire", "incalzire", "centrală", "centrala",
    "proprie", "vânzare", "vanzare", "închiriere", "inchiriere", "dormitor",
    "living", "baie", "garaj", "locuință", "locuinta", "imobil", "scară", "scara",
    "decomandat", "semidecomandat", "confort", "nivel", "mansardă", "mansarda",
    "subsol", "parter", "terasă", "terasa", "grădină", "gradina",
}

# Common Russian real-estate words
_RU_MARKERS = {
    "квартира", "комната", "комнат", "комнаты", "этаж", "площадь",
    "кухня", "балкон", "парковка", "улица", "мебель", "ремонт",
    "цена", "новострой", "новостройка", "продажа", "аренда",
    "отопление", "автономное", "спальня", "санузел", "гараж",
    "жилая", "общая", "дом", "блок", "подвал", "мансарда", "терраса",
}


def detect_language(text: str) -> Literal["ro", "ru", "en", "unknown"]:
    """Detect listing language using character-set and keyword heuristics.

    Returns "ro", "ru", "en", or "unknown". No external dependencies.
    """
    if not text or not text.strip():
        return "unknown"

    lower = text.lower()
    words = set(re.findall(r"[a-zA-Z\u00C0-\u024F\u0400-\u04FF]+", lower))

    # Count Cyrillic characters
    cyrillic_count = len(_CYRILLIC_RE.findall(text))
    total_alpha = sum(1 for ch in text if ch.isalpha())

    if total_alpha == 0:
        return "unknown"

    cyrillic_ratio = cyrillic_count / total_alpha

    # Strong Cyrillic presence -> Russian
    if cyrillic_ratio > 0.3:
        return "ru"

    # Check Russian keyword hits (even in mixed text)
    ru_hits = len(words & _RU_MARKERS)
    if ru_hits >= 3:
        return "ru"

    # Check Romanian keyword hits
    ro_hits = len(words & _RO_MARKERS)
    if ro_hits >= 2:
        return "ro"

    # Romanian diacritics: ă, â, î, ș, ț (and cedilla variants ş, ţ)
    ro_diacritics = len(re.findall(r"[ăâîșțşţ]", lower))
    if ro_diacritics >= 3:
        return "ro"

    # If mostly Latin and we have some Romanian hints
    if ro_hits >= 1 and cyrillic_ratio == 0:
        return "ro"

    # Default: if all Latin with no Romanian markers, assume English
    if cyrillic_ratio == 0 and total_alpha > 10:
        return "en"

    return "unknown"


# ---------------------------------------------------------------------------
# Terminology normalization dictionaries
# ---------------------------------------------------------------------------

# Romanian -> English (keys are lowercase; some include diacritic variants)
_RO_TERMS: list[tuple[re.Pattern, str]] = [
    # Rooms (plural patterns first to avoid singular consuming them)
    (re.compile(r"\bcamere\b", re.IGNORECASE), "rooms"),
    (re.compile(r"\bcamer[aă]\b", re.IGNORECASE), "room"),
    (re.compile(r"\bodăi\b", re.IGNORECASE), "rooms"),
    (re.compile(r"\bodaie\b", re.IGNORECASE), "room"),
    (re.compile(r"\bdormitor\b", re.IGNORECASE), "bedroom"),
    (re.compile(r"\bdormitoare\b", re.IGNORECASE), "bedrooms"),
    # Floor
    (re.compile(r"\betaj\b", re.IGNORECASE), "floor"),
    (re.compile(r"\betaje\b", re.IGNORECASE), "floors"),
    (re.compile(r"\bnivel\b", re.IGNORECASE), "level"),
    (re.compile(r"\bparter\b", re.IGNORECASE), "ground floor"),
    # Area
    (re.compile(r"\bsuprafa[tț][aă]?\b", re.IGNORECASE), "area"),
    (re.compile(r"\bsuprafa[tț]a\b", re.IGNORECASE), "area"),
    # Kitchen
    (re.compile(r"\bbuc[aă]t[aă]rie\b", re.IGNORECASE), "kitchen"),
    # Balcony
    (re.compile(r"\bbalcon\b", re.IGNORECASE), "balcony"),
    (re.compile(r"\bbalcoane\b", re.IGNORECASE), "balconies"),
    (re.compile(r"\bloggie\b", re.IGNORECASE), "loggia"),
    # Parking
    (re.compile(r"\bparcare\b", re.IGNORECASE), "parking"),
    (re.compile(r"\bgaraj\b", re.IGNORECASE), "garage"),
    # Condition
    (re.compile(r"\brenovat[aă]?\b", re.IGNORECASE), "renovated"),
    (re.compile(r"\brepara[tț]ie\s+euro\b", re.IGNORECASE), "euro renovation"),
    (re.compile(r"\brepara[tț]ie\s+cosmetic[aă]\b", re.IGNORECASE), "cosmetic renovation"),
    (re.compile(r"\brepara[tț]ie\b", re.IGNORECASE), "renovation"),
    (re.compile(r"\bvariant[aă]\s+alb[aă]\b", re.IGNORECASE), "shell finish"),
    (re.compile(r"\bstare\s+bun[aă]\b", re.IGNORECASE), "good condition"),
    (re.compile(r"\bnecesit[aă]\s+repara[tț]ie\b", re.IGNORECASE), "needs renovation"),
    # Furnished
    (re.compile(r"\bnemobilat[aă]?\b", re.IGNORECASE), "unfurnished"),
    (re.compile(r"\bmobilat[aă]?\b", re.IGNORECASE), "furnished"),
    (re.compile(r"\bmobilier\b", re.IGNORECASE), "furniture"),
    # Heating
    (re.compile(r"\bcentral[aă]\s+proprie\b", re.IGNORECASE), "own heating"),
    (re.compile(r"\b[iî]nc[aă]lzire\s+autonom[aă]\b", re.IGNORECASE), "own heating"),
    (re.compile(r"\b[iî]nc[aă]lzire\s+central[aă]\b", re.IGNORECASE), "central heating"),
    (re.compile(r"\bcentral[aă]\s+termic[aă]\b", re.IGNORECASE), "central heating"),
    # Building
    (re.compile(r"\bbloc\s+nou\b", re.IGNORECASE), "new building"),
    (re.compile(r"\bbloc\b", re.IGNORECASE), "building"),
    (re.compile(r"\bcas[aă]\b", re.IGNORECASE), "house"),
    # Layout
    (re.compile(r"\bdecomandat\b", re.IGNORECASE), "separate layout"),
    (re.compile(r"\bsemidecomandat\b", re.IGNORECASE), "semi-separate layout"),
    # Transaction
    (re.compile(r"\bv[aâ]nzare\b", re.IGNORECASE), "sale"),
    (re.compile(r"\b[iî]nchiriere\b", re.IGNORECASE), "rent"),
    # Bathroom
    (re.compile(r"\bbaie\b", re.IGNORECASE), "bathroom"),
    (re.compile(r"\bb[aă]i\b", re.IGNORECASE), "bathrooms"),
    (re.compile(r"\bsanitar\b", re.IGNORECASE), "sanitary"),
    # Terrace / garden
    (re.compile(r"\bteras[aă]\b", re.IGNORECASE), "terrace"),
    (re.compile(r"\bgr[aă]din[aă]\b", re.IGNORECASE), "garden"),
]

# Russian -> English
_RU_TERMS: list[tuple[re.Pattern, str]] = [
    # Rooms
    (re.compile(r"\bкомнат[аы]?\b", re.IGNORECASE), "rooms"),
    (re.compile(r"\bспальн[яией]+\b", re.IGNORECASE), "bedroom"),
    # Floor
    (re.compile(r"\bэтаж[аеи]?\b", re.IGNORECASE), "floor"),
    # Area
    (re.compile(r"\bплощад[ьи]\b", re.IGNORECASE), "area"),
    (re.compile(r"\bжила[яй]\b", re.IGNORECASE), "living"),
    (re.compile(r"\bобща[яй]\b", re.IGNORECASE), "total"),
    # Kitchen
    (re.compile(r"\bкухн[яией]+\b", re.IGNORECASE), "kitchen"),
    # Balcony
    (re.compile(r"\bбалкон[аы]?\b", re.IGNORECASE), "balcony"),
    (re.compile(r"\bлоджи[яией]+\b", re.IGNORECASE), "loggia"),
    # Parking
    (re.compile(r"\bпарковк[аиу]\b", re.IGNORECASE), "parking"),
    (re.compile(r"\bгараж[аеи]?\b", re.IGNORECASE), "garage"),
    # Condition
    (re.compile(r"\bевроремонт\b", re.IGNORECASE), "euro renovation"),
    (re.compile(r"\bкосметическ\w*\s*ремонт\b", re.IGNORECASE), "cosmetic renovation"),
    (re.compile(r"\bремонт\w*\b", re.IGNORECASE), "renovated"),
    (re.compile(r"\bбез\s+ремонт[аа]\b", re.IGNORECASE), "needs renovation"),
    (re.compile(r"\bбел(?:ый|ая)\s+вариант\b", re.IGNORECASE), "shell finish"),
    (re.compile(r"\bхорош\w+\s+состояни\w+\b", re.IGNORECASE), "good condition"),
    # Furnished
    (re.compile(r"\bбез\s+мебел[ьи]\b", re.IGNORECASE), "unfurnished"),
    (re.compile(r"\bмебел[ьи]\w*\b", re.IGNORECASE), "furnished"),
    (re.compile(r"\bмеблирован\w*\b", re.IGNORECASE), "furnished"),
    # Heating
    (re.compile(r"\bавтономн\w+\s+отоплени\w+\b", re.IGNORECASE), "own heating"),
    (re.compile(r"\bцентральн\w+\s+отоплени\w+\b", re.IGNORECASE), "central heating"),
    (re.compile(r"\bотоплени[ее]\b", re.IGNORECASE), "heating"),
    # Building
    (re.compile(r"\bновостро[йк]\w*\b", re.IGNORECASE), "new building"),
    (re.compile(r"\bнов(?:ый|ая|ое)\s+до[мм]\b", re.IGNORECASE), "new building"),
    (re.compile(r"\bдо[мм]\b", re.IGNORECASE), "building"),
    # Layout
    (re.compile(r"\bраздельн\w+\s+планировк\w+\b", re.IGNORECASE), "separate layout"),
    (re.compile(r"\bсмежн\w+\s+планировк\w+\b", re.IGNORECASE), "adjacent layout"),
    # Transaction
    (re.compile(r"\bпродаж[аи]\b", re.IGNORECASE), "sale"),
    (re.compile(r"\bаренд[аы]\b", re.IGNORECASE), "rent"),
    # Bathroom
    (re.compile(r"\bсанузел\b", re.IGNORECASE), "bathroom"),
    (re.compile(r"\bванна[яй]\b", re.IGNORECASE), "bathroom"),
    # Terrace
    (re.compile(r"\bтеррас[аы]\b", re.IGNORECASE), "terrace"),
]


# ---------------------------------------------------------------------------
# Number and currency normalization
# ---------------------------------------------------------------------------

def _normalize_numbers(text: str) -> str:
    """Normalize number formats to plain integers/decimals.

    - "1 000" or "1 000 000" (space-separated thousands) -> "1000" / "1000000"
    - "50,5" (European decimal comma) -> "50.5"
    """
    # Space-separated thousands: "72 500", "1 000 000"
    # Match sequences of digit groups separated by single spaces where each
    # group after the first is exactly 3 digits. Must not be surrounded by letters.
    def _collapse_thousands(m: re.Match) -> str:
        return m.group(0).replace(" ", "")

    text = re.sub(
        r"(?<!\w)(\d{1,3})((?:\s\d{3})+)(?!\w)",
        _collapse_thousands,
        text,
    )

    # European decimal comma: "50,5" -> "50.5" (only when followed by 1-2 digits, not 3)
    text = re.sub(r"(\d+),(\d{1,2})(?!\d)", r"\1.\2", text)

    return text


# Currency normalization patterns
_CURRENCY_PATTERNS: list[tuple[re.Pattern, str]] = [
    # MDL variants
    (re.compile(r"\bлей\b", re.IGNORECASE), "MDL"),
    (re.compile(r"\bлеев\b", re.IGNORECASE), "MDL"),
    (re.compile(r"\blei\b", re.IGNORECASE), "MDL"),
    (re.compile(r"\bMDL\b"), "MDL"),
    (re.compile(r"\bmdl\b", re.IGNORECASE), "MDL"),
    # EUR variants
    (re.compile(r"\bевро\b", re.IGNORECASE), "EUR"),
    (re.compile(r"\beuro\b", re.IGNORECASE), "EUR"),
    (re.compile(r"\bEUR\b"), "EUR"),
    (re.compile(r"\beur\b", re.IGNORECASE), "EUR"),
    # RON variants
    (re.compile(r"\bRON\b"), "RON"),
    (re.compile(r"\bron\b", re.IGNORECASE), "RON"),
    # USD variants
    (re.compile(r"\bдолл\w*\b", re.IGNORECASE), "USD"),
    (re.compile(r"\bUSD\b"), "USD"),
    (re.compile(r"\busd\b", re.IGNORECASE), "USD"),
]


def _normalize_currencies(text: str) -> str:
    """Replace currency name variants with canonical codes."""
    for pattern, replacement in _CURRENCY_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


# ---------------------------------------------------------------------------
# Main normalization function
# ---------------------------------------------------------------------------

def normalize_listing_text(text: str) -> str:
    """Normalize multilingual real estate listing text into English.

    Pipeline:
      1. Detect language
      2. Normalize number formats (space thousands, decimal commas)
      3. Normalize currency names to canonical codes
      4. Translate domain-specific terminology to English

    Returns the normalized text string.
    """
    if not text or not text.strip():
        return text

    lang = detect_language(text)

    # Always normalize numbers and currencies regardless of language
    text = _normalize_numbers(text)
    text = _normalize_currencies(text)

    # Apply language-specific terminology normalization
    if lang == "ro":
        for pattern, replacement in _RO_TERMS:
            text = pattern.sub(replacement, text)
    elif lang == "ru":
        for pattern, replacement in _RU_TERMS:
            text = pattern.sub(replacement, text)
    # For "en" or "unknown", no terminology translation needed

    return text


# ---------------------------------------------------------------------------
# Structured hints extraction
# ---------------------------------------------------------------------------

# Patterns for extracting key-value pairs from structured listing tables.
# These match the formats commonly found in 999.md and imobiliare.ro scraped text
# (the scraper outputs lines like "Key: Value" from table rows).

# Rooms: "Rooms: 3", "Nr. camere: 3", "Комнат: 3", "Кол-во комнат: 3"
_ROOMS_RE = re.compile(
    r"(?:rooms?|nr\.?\s*(?:de\s+)?camere|camer[aăe]|"
    r"комнат\w*|кол[\-\.]?\s*во\s+комнат|number\s+of\s+rooms)"
    r"\s*[:=]\s*(\d+)",
    re.IGNORECASE,
)

# Floor: "Floor: 5/9", "Etaj: 5 din 9", "Этаж: 5/9", "Этаж: 5 из 9"
_FLOOR_RE = re.compile(
    r"(?:floor|etaj|этаж\w*|nivel)"
    r"\s*[:=]\s*(\d+\s*(?:[/\\]\s*\d+|(?:din|из|of)\s+\d+)?)",
    re.IGNORECASE,
)

# Area: "Area: 75 m²", "Suprafata: 75", "Площадь: 75 м²", "Sup. totala: 75"
_AREA_RE = re.compile(
    r"(?:area|suprafa[tț][aă]?\s*(?:total[aă])?|sup\.?\s*(?:total[aă])?|"
    r"площад[ьи]\s*(?:обща[яй])?|total\s+area|living\s+area|size)"
    r"\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:m[²2]|кв\.?\s*м?|mp)?",
    re.IGNORECASE,
)

# Condition: "Condition: renovated", "Stare: Reparatie euro", "Состояние: евроремонт"
_CONDITION_RE = re.compile(
    r"(?:condition|stare|condi[tț]ie|состояни[ее]|ремонт|tip\s+(?:de\s+)?repara[tț]ie)"
    r"\s*[:=]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)

# Building type: "Tip imobil: Bloc nou", "Тип дома: Новостройка"
_BUILDING_RE = re.compile(
    r"(?:building\s*type|tip\s+(?:de\s+)?(?:imobil|cladire|construc[tț]ie)|"
    r"тип\s+(?:дома|строения|здания)|material\w*\s*(?:pere[tț]i|стен))"
    r"\s*[:=]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)

# Year built: "Anul constructiei: 2020", "Год постройки: 2020"
_YEAR_RE = re.compile(
    r"(?:year\s*(?:built|of\s+construction)?|anul?\s+(?:construc[tț]iei|cl[aă]dirii)|"
    r"год\s+(?:постройки|строительства|сдачи))"
    r"\s*[:=]\s*(\d{4})",
    re.IGNORECASE,
)

# Heating: "Incalzire: centrala proprie", "Отопление: автономное"
_HEATING_RE = re.compile(
    r"(?:heating|[iî]nc[aă]lzire|central[aă]|отоплени[ее])"
    r"\s*[:=]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)

# Furnished: "Mobilat: Da", "Мебель: есть"
_FURNISHED_RE = re.compile(
    r"(?:furnished|mobil(?:at|ier)|мебел\w*|меблир\w*)"
    r"\s*[:=]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)

# Parking: "Parcare: subterană", "Парковка: подземная"
_PARKING_RE = re.compile(
    r"(?:parking|parcare|garaj|парковк\w*|гараж\w*)"
    r"\s*[:=]\s*(.+?)(?:\n|$)",
    re.IGNORECASE,
)

# Price per m2: "1421 €/м²", "1200 EUR/m2", "€/m²: 1421"
_PRICE_M2_RE = re.compile(
    r"(\d[\d\s]*\d)\s*(?:€|EUR|MDL|RON)\s*/\s*(?:м[²2]|m[²2]|mp)",
    re.IGNORECASE,
)


# Condition value normalization (map extracted text to canonical values)
_CONDITION_MAP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"variant[aă]\s+alb[aă]|shell|бел\w+\s+вариант", re.IGNORECASE), "shell_finish"),
    (re.compile(r"euro\s*r?e?n?o?v?|евроремонт|repara[tț]ie\s+euro", re.IGNORECASE), "euro_renovation"),
    (re.compile(r"cosmetic|косметическ", re.IGNORECASE), "cosmetic_renovation"),
    (re.compile(r"renovat|ремонт(?!.*без)|отремонтир", re.IGNORECASE), "renovated"),
    (re.compile(r"bun[aă]|хорош|good", re.IGNORECASE), "good"),
    (re.compile(r"necesit[aă]|без\s+ремонт|needs|требу", re.IGNORECASE), "needs_renovation"),
    (re.compile(r"nou[aă]?|нов\w+|new", re.IGNORECASE), "new"),
]


def _normalize_condition(raw: str) -> str:
    """Map a raw condition string to a canonical English value."""
    for pattern, value in _CONDITION_MAP:
        if pattern.search(raw):
            return value
    return raw.strip()


def _clean_numeric(val: str) -> str:
    """Strip spaces from a numeric value: '72 500' -> '72500'."""
    return re.sub(r"\s+", "", val).replace(",", ".")


def extract_structured_hints(text: str) -> dict:
    """Extract key-value pairs from structured listing tables.

    Parses common patterns from 999.md and imobiliare.ro scraped text
    (lines formatted as "Key: Value" from table rows).

    Returns a dict with normalized English keys and string values, e.g.:
        {"rooms": "3", "floor": "5/9", "area": "75", "condition": "renovated"}
    """
    hints: dict[str, str] = {}

    # Rooms
    m = _ROOMS_RE.search(text)
    if m:
        hints["rooms"] = m.group(1).strip()

    # Floor
    m = _FLOOR_RE.search(text)
    if m:
        raw_floor = m.group(1).strip()
        # Normalize "5 din 9" / "5 из 9" -> "5/9"
        raw_floor = re.sub(r"\s*(?:din|из|of)\s*", "/", raw_floor)
        raw_floor = re.sub(r"\s*[/\\]\s*", "/", raw_floor)
        hints["floor"] = raw_floor

    # Area
    m = _AREA_RE.search(text)
    if m:
        hints["area"] = _clean_numeric(m.group(1))

    # Condition
    m = _CONDITION_RE.search(text)
    if m:
        hints["condition"] = _normalize_condition(m.group(1))

    # Building type
    m = _BUILDING_RE.search(text)
    if m:
        hints["building_type"] = m.group(1).strip()

    # Year built
    m = _YEAR_RE.search(text)
    if m:
        hints["year_built"] = m.group(1)

    # Heating
    m = _HEATING_RE.search(text)
    if m:
        raw = m.group(1).strip()
        if re.search(r"proprie|autonom|автономн", raw, re.IGNORECASE):
            hints["heating"] = "own heating"
        elif re.search(r"central[aă]|центральн", raw, re.IGNORECASE):
            hints["heating"] = "central heating"
        else:
            hints["heating"] = raw

    # Furnished
    m = _FURNISHED_RE.search(text)
    if m:
        raw = m.group(1).strip().lower()
        if re.search(r"\bda\b|да|есть|yes|cu\b", raw):
            hints["furnished"] = "yes"
        elif re.search(r"\bnu\b|нет|без|no\b|fără|fara", raw):
            hints["furnished"] = "no"
        else:
            hints["furnished"] = raw

    # Parking
    m = _PARKING_RE.search(text)
    if m:
        hints["parking"] = m.group(1).strip()

    # Price per m2
    m = _PRICE_M2_RE.search(text)
    if m:
        hints["price_per_m2"] = _clean_numeric(m.group(1))

    return hints
