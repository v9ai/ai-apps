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
let lastAutoImportedUrl = "";
let autoImportTimer: ReturnType<typeof setTimeout> | null = null;

function isOnJobsSearchPage(): boolean {
  if (!window.location.hostname.includes("linkedin.com")) return false;
  const p = window.location.pathname;
  return p === "/jobs/search/" || p === "/jobs/search" || p.startsWith("/jobs/search/");
}

// ── Button states ──────────────────────────────────────────────────

const COLOR_IDLE = "#2563eb";    // blue
const COLOR_HOVER = "#1d4ed8";
const COLOR_BUSY = "#1e3a8a";
const COLOR_ERROR = "#dc2626";
const COLOR_DONE = "#16a34a";

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
    bottom: 80px;
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

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "importAllProgress") return;
    if (!document.body.contains(btn)) return;

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

  return btn;
}

// ── Sync / lifecycle ───────────────────────────────────────────────

function removeButton() {
  document.querySelectorAll(`[${BTN_ATTR}]`).forEach((el) => el.remove());
  importAllBtn = null;
}

function sync() {
  if (!document.body) return;

  if (!isOnJobsSearchPage()) {
    if (importAllBtn || document.querySelector(`[${BTN_ATTR}]`)) {
      removeButton();
    }
    return;
  }

  if (document.querySelector(`[${BTN_ATTR}]`)) {
    importAllBtn = document.querySelector<HTMLButtonElement>(`[${BTN_ATTR}]`);
    return;
  }

  const btn = createButton();
  document.body.appendChild(btn);
  importAllBtn = btn;
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

// ── Auto-import on each jobs-search navigation ─────────────────────
//
// Each time the URL changes to a new jobs-search query/page, wait for
// the cards to settle, then scrape just the current page and POST it
// to D1. Tracks `lastAutoImportedUrl` to avoid re-running on the same
// URL (e.g. SPA re-renders that don't change the search).

function scheduleAutoImport() {
  if (!isOnJobsSearchPage()) return;
  const url = window.location.href;
  if (url === lastAutoImportedUrl) return;
  if (autoImportTimer) clearTimeout(autoImportTimer);
  autoImportTimer = setTimeout(() => {
    if (teardownIfDead()) return;
    if (!isOnJobsSearchPage()) return;
    if (window.location.href !== url) return; // URL changed mid-debounce
    lastAutoImportedUrl = url;

    const btn = importAllBtn;
    if (btn && !btn.disabled) {
      btn.disabled = true;
      btn.textContent = "Auto-importing this page...";
      btn.style.backgroundColor = COLOR_BUSY;
    }

    safeSendMessage(
      { action: "importAllOpportunitiesFromJobsSearch", singlePage: true },
      (response) => {
        if (!response?.success) {
          // Reset URL gate so the next nav retries this same query.
          lastAutoImportedUrl = "";
          if (btn) {
            btn.textContent = response?.error || "Auto-import failed";
            btn.style.backgroundColor = COLOR_ERROR;
            setTimeout(() => resetIdle(btn), 4000);
          }
        }
      },
    );
  }, 2500);
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

  if (!document.body) {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
    return;
  }

  syncWithRetries();
  scheduleAutoImport();

  const obs = makeLeadingEdgeObserver();
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  window.addEventListener("lg:locationchange", () => {
    if (teardownIfDead()) return;
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    syncWithRetries();
    scheduleAutoImport();
  });

  const urlPoll = setInterval(() => {
    if (teardownIfDead()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      syncWithRetries();
      scheduleAutoImport();
    }
  }, 500);
  _intervals.push(urlPoll);
}

init();
