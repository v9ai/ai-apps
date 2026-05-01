// ── Browse Companies floating button (product search) ─────────────
//
// Injects a fixed-position button on LinkedIn /search/results/products/*
// pages. Click → background paginates the product results, extracts the
// parent company of each product card, and bulk-upserts them into Neon
// via the importCompanies GraphQL mutation.
//
// Mirrors import-all-opportunities-button.ts but routes to GraphQL/Neon
// instead of D1 and targets product-search DOM instead of job cards.

import {
  _observers,
  _intervals,
  isExtensionAlive,
  teardownIfDead,
  safeSendMessage,
} from "./lifecycle";
import { registerInStack, unregisterFromStack } from "./floating-stack";

const BTN_ATTR = "data-lg-browse-products-btn";
const STACK_PRIORITY = 21;

let browseBtn: HTMLButtonElement | null = null;
let lastUrl = "";

function isOnProductSearchPage(): boolean {
  if (!window.location.hostname.includes("linkedin.com")) return false;
  const p = window.location.pathname;
  return (
    p === "/search/results/products/" ||
    p === "/search/results/products" ||
    p.startsWith("/search/results/products/")
  );
}

const COLOR_IDLE = "#7c3aed";   // purple — distinguishes from the blue jobs button
const COLOR_HOVER = "#6d28d9";
const COLOR_BUSY = "#5b21b6";
const COLOR_ERROR = "#dc2626";
const COLOR_DONE = "#16a34a";

function resetIdle(btn: HTMLButtonElement) {
  btn.disabled = false;
  btn.textContent = "Browse companies";
  btn.style.backgroundColor = COLOR_IDLE;
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BTN_ATTR, "true");
  btn.textContent = "Browse companies";
  btn.title = "Scrape every page of this LinkedIn product search and save companies to Neon";
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
      { action: "browseProductCompanies" },
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

let progressListenerInstalled = false;
function installProgressListener() {
  if (progressListenerInstalled) return;
  progressListenerInstalled = true;

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "browseProductCompaniesProgress") return;
    console.log("[CS] browseProductCompaniesProgress", msg);

    const btn = browseBtn;
    if (!btn || !document.body.contains(btn)) return;

    if (msg.error) {
      btn.textContent = String(msg.error).slice(0, 80);
      btn.style.backgroundColor = COLOR_ERROR;
      setTimeout(() => resetIdle(btn), 5000);
      return;
    }
    if (msg.done) {
      const inserted = msg.inserted ?? 0;
      const enriched = msg.deepEnriched ?? 0;
      const deepScraped = msg.deepScraped ?? 0;
      const errs = Array.isArray(msg.errors) ? msg.errors.length : 0;
      const pagesScraped = msg.pagesScraped ?? 0;
      const pagesTotal = msg.pagesTotal ?? pagesScraped;
      const pagesFailed = msg.pagesFailed ?? 0;
      const summary =
        errs > 0 || pagesFailed > 0
          ? `Pages ${pagesScraped}/${pagesTotal} — Imported ${inserted}, Enriched ${enriched}/${deepScraped}, Errors ${errs}`
          : `✓ ${pagesScraped} pages — ${inserted} imported, ${enriched}/${deepScraped} enriched`;
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

function removeButton() {
  document.querySelectorAll<HTMLElement>(`[${BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  browseBtn = null;
}

function sync() {
  if (!document.body) return;

  if (!isOnProductSearchPage()) {
    if (browseBtn || document.querySelector(`[${BTN_ATTR}]`)) {
      removeButton();
    }
    return;
  }

  if (document.querySelector(`[${BTN_ATTR}]`)) {
    browseBtn = document.querySelector<HTMLButtonElement>(`[${BTN_ATTR}]`);
    return;
  }

  const btn = createButton();
  document.body.appendChild(btn);
  browseBtn = btn;
  registerInStack(btn, STACK_PRIORITY);
  console.log(`[BrowseProductsCompaniesBtn] injected on ${window.location.pathname}`);
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
