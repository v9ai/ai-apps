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
import { registerInStack, unregisterFromStack } from "./floating-stack";

const BTN_ATTR = "data-lg-import-all-btn";
const STACK_PRIORITY = 20;

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
      const inserted = msg.inserted ?? msg.totals?.inserted ?? 0;
      const skipped = msg.skipped ?? msg.totals?.skipped ?? 0;
      const errs = Array.isArray(msg.errors) ? msg.errors.length : 0;
      const pagesScraped = msg.pagesScraped ?? 0;
      const pagesTotal = msg.pagesTotal ?? pagesScraped;
      const pagesFailed = msg.pagesFailed ?? 0;
      const voyEnriched = msg.totals?.voyagerEnriched ?? 0;
      const voyFailed = msg.totals?.voyagerFailed ?? 0;
      const voyTotal = voyEnriched + voyFailed;
      const voySuffix = voyTotal > 0 ? `, Voy ${voyEnriched}/${voyTotal}` : "";
      const fullyRemote = msg.totals?.fullyRemote ?? 0;
      const archivedNonRemote = msg.totals?.archivedNonRemote ?? 0;
      const remoteSuffix =
        fullyRemote > 0 || archivedNonRemote > 0
          ? `, Remote ${fullyRemote} (${archivedNonRemote} archived)`
          : "";
      const summary =
        errs > 0 || pagesFailed > 0
          ? `Pages ${pagesScraped}/${pagesTotal} (${pagesFailed} failed) — Ins ${inserted}, Skp ${skipped}${voySuffix}${remoteSuffix}, Err ${errs}`
          : `✓ Pages ${pagesScraped}/${pagesTotal} — Ins ${inserted}, Skp ${skipped}${voySuffix}${remoteSuffix}`;
      btn.textContent = summary.slice(0, 80);
      btn.style.backgroundColor = errs > 0 || pagesFailed > 0 ? COLOR_ERROR : COLOR_DONE;
      btn.disabled = false;
      setTimeout(() => resetIdle(btn), 10000);
      return;
    }
    if (msg.status) {
      btn.textContent = String(msg.status).slice(0, 80);
    }
  });
}

// ── Sync / lifecycle ───────────────────────────────────────────────

function removeButton() {
  document.querySelectorAll<HTMLElement>(`[${BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
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
  registerInStack(btn, STACK_PRIORITY);
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
