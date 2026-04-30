// ── Import People floating button ───────────────────────────────────
//
// Owns the full lifecycle for the "Import People" button on LinkedIn's
// company /people/ subpage. Fully isolated from Find Related / Scrape People
// Posts (which live in linkedin-helper.ts and inject on the company home).
//
// Why a dedicated module: the shared sync pipeline in linkedin-helper.ts used
// a trailing-edge 1000ms debounce that could starve on LinkedIn's /people/
// page (continuous body mutations reset the timer). This module uses a
// leading-edge observer + retry schedule + pushState patch so the button
// appears within ~400ms even during a noisy SPA hydration.

import {
  _observers,
  _intervals,
  isExtensionAlive,
  teardownIfDead,
  safeSendMessage,
} from "./lifecycle";
import { registerInStack, unregisterFromStack } from "./floating-stack";

const BTN_ATTR = "data-lg-import-people-btn";
const STACK_PRIORITY = 10;
// Match /company/{slug}/people, /company/{slug}/people/, and any deeper path
// under /people (e.g. filter sub-routes LinkedIn may add).
const PEOPLE_PATH_RE = /^\/company\/[^/]+\/people(\/|$)/;

let importPeopleBtn: HTMLButtonElement | null = null;
let lastUrl = "";

/** True on any `/company/{slug}/people[...]` path. */
function isOnPeoplePage(): boolean {
  if (!window.location.hostname.includes("linkedin.com")) return false;
  return PEOPLE_PATH_RE.test(window.location.pathname);
}

function extractCompanyInfo(): { name: string; linkedinUrl: string } {
  const nameEl =
    document.querySelector("h1.org-top-card-summary__title") ||
    document.querySelector("h1.top-card-layout__title") ||
    document.querySelector("h1");
  const name = nameEl?.textContent?.trim() || "";

  const match = window.location.pathname.match(/^\/company\/([^/]+)/);
  const linkedinUrl = match
    ? `https://www.linkedin.com/company/${match[1]}/`
    : window.location.href.split("?")[0];

  return { name, linkedinUrl };
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BTN_ATTR, "true");
  btn.textContent = "Import People";
  btn.title = "Scrape all people on this company page and save to CRM";
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: #0a66c2;
    color: white;
    border: none;
    border-radius: 24px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: background-color 0.2s;
  `;

  btn.addEventListener("mouseenter", () => {
    if (!btn.disabled) btn.style.backgroundColor = "#004182";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.backgroundColor = "#0a66c2";
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const info = extractCompanyInfo();
    if (!info.name) {
      btn.textContent = "No company found";
      setTimeout(() => { btn.textContent = "Import People"; }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Starting...";

    safeSendMessage(
      {
        action: "importPeopleFromCompanyPage",
        companyName: info.name,
        companyLinkedinUrl: info.linkedinUrl,
      },
      (response) => {
        if (!response?.success) {
          btn.textContent = "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Import People";
            btn.style.backgroundColor = "#0a66c2";
            btn.disabled = false;
          }, 2000);
        }
      },
    );
  });

  return btn;
}

function removeButton() {
  document.querySelectorAll<HTMLElement>(`[${BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  importPeopleBtn = null;
}

/** Inject the button if we're on /people/ and it isn't already present. */
function sync() {
  if (!document.body) return;

  if (!isOnPeoplePage()) {
    if (importPeopleBtn || document.querySelector(`[${BTN_ATTR}]`)) {
      removeButton();
    }
    return;
  }

  if (document.querySelector(`[${BTN_ATTR}]`)) {
    // Already injected — reacquire the reference in case body was re-rendered
    importPeopleBtn = document.querySelector<HTMLButtonElement>(`[${BTN_ATTR}]`);
    return;
  }

  const btn = createButton();
  document.body.appendChild(btn);
  importPeopleBtn = btn;
  registerInStack(btn, STACK_PRIORITY);
  console.log(`[ImportPeopleBtn] injected on ${window.location.pathname}`);
}

/** Fire sync() across a retry schedule so LinkedIn's hydration can't starve us. */
function syncWithRetries() {
  sync();
  [400, 1200, 2500, 5000].forEach((delay) => {
    setTimeout(() => {
      if (teardownIfDead()) return;
      sync();
    }, delay);
  });
}

// ── Install one pushState/replaceState patch so SPA nav fires an event ──

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

// ── Leading-edge observer: fire immediately, then cooldown ─────────────

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

// ── Module entry point ─────────────────────────────────────────────────

function init() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!isExtensionAlive()) return;

  console.log(`[ImportPeopleBtn] init on ${window.location.href} — onPeoplePage=${isOnPeoplePage()}`);

  lastUrl = window.location.href;
  installHistoryPatch();

  // If body isn't attached yet (rare at document_idle, but possible), defer.
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
    return;
  }

  // Initial retry burst to cover direct-load + React hydration
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

  // Fallback URL poll in case a LinkedIn codepath bypasses pushState
  const urlPoll = setInterval(() => {
    if (teardownIfDead()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      syncWithRetries();
    }
  }, 500);
  _intervals.push(urlPoll);
}

// ── Background → content-script progress messages ─────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (!isExtensionAlive()) return;
  if (!importPeopleBtn) return;

  if (message.action === "importPeopleProgress") {
    importPeopleBtn.textContent = message.message;
  }
  if (message.action === "importPeopleDone") {
    const href = message.companyKey
      ? `https://agenticleadgen.xyz/companies/${message.companyKey}`
      : "https://agenticleadgen.xyz/companies";
    importPeopleBtn.style.backgroundColor = "#16a34a";
    importPeopleBtn.style.padding = "0";
    importPeopleBtn.disabled = false;
    importPeopleBtn.innerHTML = "";
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `View: ${message.imported} imported`;
    link.style.cssText = `
      color: white;
      text-decoration: none;
      display: block;
      padding: 12px 24px;
      font-size: 15px;
      font-weight: 600;
    `;
    importPeopleBtn.appendChild(link);
  }
  if (message.action === "importPeopleError") {
    importPeopleBtn.textContent = message.error?.slice(0, 30) || "Error";
    importPeopleBtn.style.backgroundColor = "#dc2626";
    setTimeout(() => {
      if (importPeopleBtn) {
        importPeopleBtn.textContent = "Import People";
        importPeopleBtn.style.backgroundColor = "#0a66c2";
        importPeopleBtn.disabled = false;
      }
    }, 3000);
  }
});

init();
