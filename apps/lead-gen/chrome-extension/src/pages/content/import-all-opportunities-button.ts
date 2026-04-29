// ── Import All Opportunities floating button ───────────────────────
//
// Injects a fixed-position button on LinkedIn /jobs/search* pages.
// Click → background scrapes every page (extractJobsWithPagination)
// and bulk-inserts each card into Cloudflare D1 via the
// /api/jobs/d1/import edge-worker route.
//
// Renders live progress while pagination runs and a final
// "Imported X / skipped Y" summary.

import {
  _observers,
  _intervals,
  isExtensionAlive,
  teardownIfDead,
  safeSendMessage,
} from "./lifecycle";

const BTN_ATTR = "data-lg-import-all-btn";

let importAllBtn: HTMLButtonElement | null = null;
let lastUrl = "";

function isOnJobsSearchPage(): boolean {
  if (!window.location.hostname.includes("linkedin.com")) return false;
  const p = window.location.pathname;
  return (
    p === "/jobs/search/" ||
    p === "/jobs/search" ||
    p.startsWith("/jobs/search/") ||
    p.startsWith("/jobs/view/") ||
    p.startsWith("/jobs/collections/")
  );
}

// ── Button states ──────────────────────────────────────────────────

const COLOR_IDLE = "#2563eb";    // blue
const COLOR_HOVER = "#1d4ed8";
const COLOR_BUSY = "#1e3a8a";
const COLOR_ERROR = "#dc2626";
const COLOR_DONE = "#16a34a";

const BASE_BOTTOM = 24;
const STACK_GAP = 16;

// Stack above the single-job "Import Opportunity" button when it's present
// (both render together on /jobs/view/{id}). Measure its actual height instead
// of hardcoding an offset — text wraps and state changes can resize it.
function computeBottomOffset(): number {
  const lower = document.querySelector<HTMLElement>(
    "[data-lg-import-opportunity-btn]",
  );
  if (!lower) return BASE_BOTTOM;
  const h = lower.getBoundingClientRect().height;
  if (!h) return BASE_BOTTOM;
  return BASE_BOTTOM + h + STACK_GAP;
}

function resetIdle(btn: HTMLButtonElement) {
  btn.disabled = false;
  btn.textContent = "Import all opportunities";
  btn.style.backgroundColor = COLOR_IDLE;
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BTN_ATTR, "true");
  btn.textContent = "Import all opportunities";
  btn.title = "Scrape every page of this LinkedIn job-search and save to D1";
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: ${COLOR_IDLE};
    color: white;
    border: none;
    border-radius: 24px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: background-color 0.2s;
    max-width: 360px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  btn.style.bottom = `${computeBottomOffset()}px`;

  btn.addEventListener("mouseenter", () => {
    if (!btn.disabled) btn.style.backgroundColor = COLOR_HOVER;
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.backgroundColor = COLOR_IDLE;
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = "Starting...";
    btn.style.backgroundColor = COLOR_BUSY;

    safeSendMessage(
      { action: "importAllOpportunitiesFromJobsSearch" },
      (response) => {
        if (!response?.success) {
          btn.textContent = response?.error || "Failed to start";
          btn.style.backgroundColor = COLOR_ERROR;
          setTimeout(() => resetIdle(btn), 4000);
        }
      },
    );
  });

  return btn;
}

// ── Single, module-level progress listener ─────────────────────────
// Registered once in init() so a leaking listener-per-button is impossible.
let progressListenerInstalled = false;
function installProgressListener() {
  if (progressListenerInstalled) return;
  progressListenerInstalled = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "importAllProgress") return;
    console.log("[CS] importAllProgress", msg);

    const btn = importAllBtn;
    if (!btn || !document.body.contains(btn)) return;

    if (msg.error) {
      btn.textContent = String(msg.error).slice(0, 80);
      btn.style.backgroundColor = COLOR_ERROR;
      setTimeout(() => resetIdle(btn), 5000);
      return;
    }
    if (msg.done) {
      const summary = `✓ Imported ${msg.inserted ?? 0} / skipped ${msg.skipped ?? 0}`;
      btn.textContent = summary;
      btn.style.backgroundColor = COLOR_DONE;
      btn.disabled = false;
      setTimeout(() => resetIdle(btn), 8000);
      return;
    }
    if (msg.status) {
      btn.textContent = String(msg.status).slice(0, 80);
    }
  });
}

// ── Sync / lifecycle ───────────────────────────────────────────────

function removeButton() {
  document.querySelectorAll(`[${BTN_ATTR}]`).forEach((el) => el.remove());
  importAllBtn = null;
}

function reposition() {
  if (!importAllBtn) return;
  importAllBtn.style.bottom = `${computeBottomOffset()}px`;
}

// Track the lower "Import Opportunity" button so we reposition the instant
// its size or presence changes — `sync()`'s 800ms cooldown is too coarse to
// catch state transitions ("Checking…" → "Import Opportunity" → "View: …").
let observedLower: HTMLElement | null = null;
const lowerResizeObserver =
  typeof ResizeObserver !== "undefined" ? new ResizeObserver(reposition) : null;

function trackLowerButton() {
  const lower = document.querySelector<HTMLElement>(
    "[data-lg-import-opportunity-btn]",
  );
  if (lower === observedLower) return;
  if (observedLower && lowerResizeObserver) lowerResizeObserver.unobserve(observedLower);
  observedLower = lower;
  if (lower && lowerResizeObserver) lowerResizeObserver.observe(lower);
  reposition();
}

function sync() {
  if (!document.body) return;

  if (!isOnJobsSearchPage()) {
    if (importAllBtn || document.querySelector(`[${BTN_ATTR}]`)) {
      removeButton();
    }
    trackLowerButton();
    return;
  }

  if (document.querySelector(`[${BTN_ATTR}]`)) {
    importAllBtn = document.querySelector<HTMLButtonElement>(`[${BTN_ATTR}]`);
    trackLowerButton();
    return;
  }

  const btn = createButton();
  document.body.appendChild(btn);
  importAllBtn = btn;
  trackLowerButton();
  console.log(`[ImportAllOpportunitiesBtn] injected on ${window.location.pathname}`);
}

function syncWithRetries() {
  sync();
  [400, 1200, 2500, 5000].forEach((delay) => {
    setTimeout(() => {
      if (teardownIfDead()) return;
      sync();
    }, delay);
  });
}

// ── History patch (shared flag — won't double-patch) ───────────────

const HISTORY_PATCH_FLAG = "__lgHistoryPatched";
function installHistoryPatch() {
  const w = window as unknown as Record<string, unknown>;
  if (w[HISTORY_PATCH_FLAG]) return;
  w[HISTORY_PATCH_FLAG] = true;

  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);
  const fire = () => window.dispatchEvent(new Event("lg:locationchange"));

  history.pushState = function (...args: Parameters<typeof origPush>) {
    const ret = origPush(...args);
    fire();
    return ret;
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    const ret = origReplace(...args);
    fire();
    return ret;
  };
  window.addEventListener("popstate", fire);
}

function makeLeadingEdgeObserver() {
  let cooldownUntil = 0;
  return new MutationObserver(() => {
    if (teardownIfDead()) return;
    // Always re-track the lower button so a freshly-mounted "Import Opportunity"
    // is observed before sync's cooldown elapses.
    trackLowerButton();
    const now = Date.now();
    if (now < cooldownUntil) return;
    cooldownUntil = now + 800;
    sync();
  });
}

// ── Module entry ───────────────────────────────────────────────────

function init() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!isExtensionAlive()) return;

  lastUrl = window.location.href;
  installHistoryPatch();
  installProgressListener();

  if (!document.body) {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
    return;
  }

  syncWithRetries();

  const obs = makeLeadingEdgeObserver();
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  window.addEventListener("lg:locationchange", () => {
    if (teardownIfDead()) return;
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    syncWithRetries();
  });

  window.addEventListener("resize", () => {
    if (teardownIfDead()) return;
    reposition();
  });

  const urlPoll = setInterval(() => {
    if (teardownIfDead()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      syncWithRetries();
    }
  }, 500);
  _intervals.push(urlPoll);
}

init();
