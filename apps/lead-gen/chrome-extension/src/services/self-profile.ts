// ── Self-profile slug detection ──────────────────────────────────────
//
// Detects the LinkedIn slug of the active session (the user running the
// extension) so the recruiter pipeline can exclude it from candidate lists,
// the visit tracker, and browsemap captures.
//
// Content-script side: detect from DOM (3-tier selector cascade), cache in
// chrome.storage.local. Background side: cache-only read (service worker has
// no DOM access).

const STORAGE_KEY = "selfProfileSlug";

export interface SelfDetection {
  slug: string;
  selector: string;
}

/**
 * Page-context detection. Runs synchronously against `document` — must be
 * called from a content script or via chrome.scripting.executeScript.
 */
export function detectSelfSlugFromDom(): SelfDetection | null {
  // 1. Feed left-rail identity card — cleanest signal on /feed/
  const feedLink = document.querySelector<HTMLAnchorElement>(
    '.feed-identity-module a[href^="/in/"]',
  );
  if (feedLink) {
    const m = feedLink.getAttribute("href")?.match(/^\/in\/([^/?]+)/);
    if (m) return { slug: m[1], selector: "feed-identity-module" };
  }

  // 2. Top-nav Me-menu trigger — present in some layouts as an anchor with href
  const navAnchor = document.querySelector<HTMLAnchorElement>(
    'a.global-nav__primary-link-me-menu-trigger[href^="/in/"]',
  );
  if (navAnchor) {
    const m = navAnchor.getAttribute("href")?.match(/^\/in\/([^/?]+)/);
    if (m) return { slug: m[1], selector: "global-nav-me-trigger" };
  }

  // 3. JSON state — LinkedIn embeds Voyager state in <code id="bpr-guid-…">.
  // The session user's publicIdentifier is the first one referenced as a
  // "Me" entity. We pick the first publicIdentifier we encounter as a
  // fallback heuristic — wrong only if the page renders another profile's
  // state ahead of self, which is rare for nav/feed/search pages.
  const codes = document.querySelectorAll<HTMLElement>('code[id^="bpr-guid"]');
  for (const code of codes) {
    const text = code.textContent || "";
    const m = text.match(/"publicIdentifier"\s*:\s*"([^"]+)"/);
    if (m) return { slug: m[1], selector: "json-state" };
  }

  return null;
}

/**
 * Content-script side. Reads cached slug, falls back to DOM detection,
 * persists on success. Returns null if nothing detectable on this page.
 */
export async function getSelfProfileSlug(): Promise<string | null> {
  const cached = await readCache();
  if (cached) return cached;

  const detected = detectSelfSlugFromDom();
  if (!detected) return null;

  console.log(
    `[SelfProfile] Detected: ${detected.slug} (selector: ${detected.selector})`,
  );
  await writeCache(detected.slug);
  return detected.slug;
}

/**
 * Background-side. Cache-only — service workers have no DOM access. Returns
 * null until a content script has populated the cache via getSelfProfileSlug.
 */
export async function getCachedSelfProfileSlug(): Promise<string | null> {
  return readCache();
}

async function readCache(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const v = result[STORAGE_KEY];
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function writeCache(slug: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: slug });
  } catch { /* ignore */ }
}

export function slugFromLinkedInUrl(url: string): string | null {
  const m = url.match(/\/in\/([^/?#]+)/);
  return m ? m[1] : null;
}
