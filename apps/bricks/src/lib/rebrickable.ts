const REBRICKABLE_API_KEY = process.env.REBRICKABLE_API_KEY;
const BASE_URL = "https://rebrickable.com/api/v3/lego/parts";

interface KeyPart {
  name: string;
  part_number: string;
  role: string;
  image_url?: string;
}

async function fetchPartImage(partNumber: string): Promise<string | null> {
  if (!REBRICKABLE_API_KEY) return null;
  try {
    const resp = await fetch(`${BASE_URL}/${partNumber}/`, {
      headers: { Authorization: `key ${REBRICKABLE_API_KEY}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.part_img_url ?? null;
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
