const REBRICKABLE_API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE_URL = "https://rebrickable.com/api/v3/lego/parts";

/** Common Rebrickable variant suffixes — many parts like 3040 exist only as 3040a/3040b. */
const VARIANT_SUFFIXES = ["b", "a", "c", "d"];

interface KeyPart {
  name: string;
  part_number: string;
  role: string;
  image_url?: string;
}

async function tryFetchPartImage(partNumber: string): Promise<string | null> {
  const resp = await fetch(`${BASE_URL}/${partNumber}/`, {
    headers: { Authorization: `key ${REBRICKABLE_API_KEY}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.part_img_url ?? null;
}

export async function fetchPartImage(partNumber: string): Promise<string | null> {
  if (!REBRICKABLE_API_KEY) return null;
  try {
    const img = await tryFetchPartImage(partNumber);
    if (img) return img;
    // Try variant suffixes for numeric-only part numbers (3040 → 3040b)
    if (/^\d+$/.test(partNumber)) {
      for (const suffix of VARIANT_SUFFIXES) {
        const variantImg = await tryFetchPartImage(`${partNumber}${suffix}`);
        if (variantImg) return variantImg;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function enrichPartsWithImages(parts: KeyPart[]): Promise<KeyPart[]> {
  const enriched: KeyPart[] = [];
  for (const part of parts) {
    if (!part.part_number) {
      enriched.push(part);
      continue;
    }
    const imageUrl = await fetchPartImage(part.part_number);
    enriched.push({ ...part, ...(imageUrl ? { image_url: imageUrl } : {}) });
  }
  return enriched;
}
