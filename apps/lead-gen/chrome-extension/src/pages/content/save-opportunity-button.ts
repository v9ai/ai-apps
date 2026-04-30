// ── Save as Opportunity floating button ─────────────────────────────
//
// Injects a fixed-position button on LinkedIn /feed/update/urn:li:activity:*
// pages. Extracts post data from the DOM and saves it as an opportunity via
// the existing importOpportunityFromPage background handler.

import {
  _observers,
  _intervals,
  isExtensionAlive,
  teardownIfDead,
  safeSendMessage,
  showErrorToast,
} from "./lifecycle";
import { registerInStack, unregisterFromStack } from "./floating-stack";

const BTN_ATTR = "data-lg-save-opportunity-btn";
const STACK_PRIORITY = 10;
const ACTIVITY_PATH_RE = /^\/feed\/update\/urn:li:activity:/;

let saveOpportunityBtn: HTMLButtonElement | null = null;
let lastUrl = "";

function isOnActivityPage(): boolean {
  if (!window.location.hostname.includes("linkedin.com")) return false;
  return ACTIVITY_PATH_RE.test(window.location.pathname);
}

// ── Data extraction ─────────────────────────────────────────────────

function parseSubtitle(subtitle: string): { position: string; company: string } {
  for (const sep of [" at ", " @ ", " | "]) {
    const idx = subtitle.toLowerCase().indexOf(sep);
    if (idx > 0) {
      return {
        position: subtitle.slice(0, idx).trim(),
        company: subtitle.slice(idx + sep.length).trim(),
      };
    }
  }
  return { position: subtitle, company: "" };
}

function deriveTitle(postText: string, authorName: string): string {
  if (postText) {
    const firstSentence = postText.split(/[.\n!?]/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length <= 80) {
      return firstSentence;
    }
    if (firstSentence.length > 80) {
      const truncated = firstSentence.slice(0, 80).replace(/\s+\S*$/, "");
      return truncated + "...";
    }
  }
  return authorName ? `${authorName}'s post` : "LinkedIn post";
}

function extractPostOpportunityData() {
  const postTextEl = document.querySelector(
    ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text__text-view",
  );
  const postText = postTextEl?.textContent?.trim() || "";

  const authorEl = document.querySelector(
    ".update-components-actor__name .visually-hidden, .update-components-actor__title .visually-hidden",
  );
  let authorName = authorEl?.textContent?.trim() || "";
  if (authorName.includes("•")) authorName = authorName.split("•")[0].trim();

  const subtitleEl = document.querySelector(
    ".update-components-actor__description .visually-hidden, .update-components-actor__subtitle .visually-hidden",
  );
  const authorSubtitle = subtitleEl?.textContent?.trim() || "";

  // Author profile URL
  let authorProfileUrl = "";
  const authorLink = document.querySelector<HTMLAnchorElement>(
    '.update-components-actor__container a[href*="/in/"], .update-components-actor__title a[href*="/in/"]',
  );
  if (authorLink?.href) {
    try {
      const u = new URL(authorLink.href, window.location.origin);
      const m = u.pathname.match(/^\/in\/([^/]+)/);
      if (m) authorProfileUrl = `https://www.linkedin.com/in/${m[1]}/`;
    } catch { /* skip */ }
  }

  // Company LinkedIn URL (if author is a company page or has a company link)
  let companyLinkedinUrl = "";
  const companyLink = document.querySelector<HTMLAnchorElement>(
    '.update-components-actor__container a[href*="/company/"], .update-components-actor__title a[href*="/company/"]',
  );
  if (companyLink?.href) {
    try {
      const u = new URL(companyLink.href, window.location.origin);
      const m = u.pathname.match(/^\/company\/([^/]+)/);
      if (m) companyLinkedinUrl = `https://www.linkedin.com/company/${m[1]}/`;
    } catch { /* skip */ }
  }

  const { position, company: companyName } = parseSubtitle(authorSubtitle);

  // If the actor link points to /company/ and we didn't parse a company from subtitle,
  // treat authorName as the company name.
  const effectiveCompanyName = companyName || (companyLinkedinUrl ? authorName : "");

  const canonicalUrl = window.location.href.split("?")[0];
  const title = deriveTitle(postText, authorName);

  return {
    title,
    companyName: effectiveCompanyName,
    companyLinkedinUrl,
    salary: "",
    location: "",
    remoteType: "",
    employmentType: "",
    appliedStatus: "",
    jobUrl: canonicalUrl,
    description: postText,
    hiringContact: authorName
      ? { name: authorName, linkedinUrl: authorProfileUrl, position }
      : null,
  };
}

// ── Button ──────────────────────────────────────────────────────────

function showExistingLink(
  btn: HTMLButtonElement,
  opportunity: { id?: string; title?: string },
) {
  btn.dataset.existingOpportunity = "true";
  btn.style.backgroundColor = "#16a34a";
  btn.style.padding = "0";
  btn.disabled = false;
  btn.innerHTML = "";
  const link = document.createElement("a");
  link.href = opportunity.id
    ? `https://agenticleadgen.xyz/opportunities/${opportunity.id}`
    : "https://agenticleadgen.xyz/opportunities";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = opportunity.title ? `View: ${opportunity.title}` : "View Opportunity";
  link.style.cssText = `
    color: white;
    text-decoration: none;
    display: block;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;
  btn.appendChild(link);
  btn.onmouseenter = null;
  btn.onmouseleave = null;
}

function createButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BTN_ATTR, "true");
  btn.textContent = "Save as Opportunity";
  btn.title = "Save this LinkedIn post as an opportunity";
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: #d97706;
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
    if (!btn.disabled) btn.style.backgroundColor = "#b45309";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.backgroundColor = "#d97706";
  });

  btn.addEventListener("click", (e) => {
    if (btn.dataset.existingOpportunity) return;

    e.preventDefault();
    e.stopPropagation();

    const oppData = extractPostOpportunityData();
    if (!oppData.title || oppData.title === "LinkedIn post") {
      btn.textContent = "No post data found";
      setTimeout(() => { btn.textContent = "Save as Opportunity"; }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Saving...";
    btn.style.backgroundColor = "#92400e";

    safeSendMessage(
      { action: "importOpportunityFromPage", opportunityData: oppData },
      (response) => {
        if (!response?.success) {
          btn.textContent = response?.error || "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Save as Opportunity";
            btn.style.backgroundColor = "#d97706";
            btn.disabled = false;
          }, 3000);
        }
      },
    );
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action !== "importOpportunityPageProgress") return;
    if (msg.error) {
      btn.textContent = msg.error;
      btn.style.backgroundColor = "#dc2626";
      btn.disabled = false;
      setTimeout(() => {
        btn.textContent = "Save as Opportunity";
        btn.style.backgroundColor = "#d97706";
      }, 3000);
      return;
    }
    if (msg.done) {
      showExistingLink(btn, { id: msg.opportunityId, title: msg.title });
      return;
    }
    if (msg.status) {
      btn.textContent = msg.status;
    }
  });

  return btn;
}

// ── Sync / Lifecycle ────────────────────────────────────────────────

function removeButton() {
  document.querySelectorAll<HTMLElement>(`[${BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  saveOpportunityBtn = null;
}

function sync() {
  if (!document.body) return;

  if (!isOnActivityPage()) {
    if (saveOpportunityBtn || document.querySelector(`[${BTN_ATTR}]`)) {
      removeButton();
    }
    return;
  }

  if (document.querySelector(`[${BTN_ATTR}]`)) {
    saveOpportunityBtn = document.querySelector<HTMLButtonElement>(`[${BTN_ATTR}]`);
    return;
  }

  const btn = createButton();
  btn.textContent = "Checking...";
  btn.disabled = true;
  btn.style.backgroundColor = "#6b7280";
  document.body.appendChild(btn);
  saveOpportunityBtn = btn;
  registerInStack(btn, STACK_PRIORITY);

  const canonicalUrl = window.location.href.split("?")[0];
  safeSendMessage(
    { action: "checkOpportunityByUrl", url: canonicalUrl },
    (response) => {
      if (!document.querySelector(`[${BTN_ATTR}]`)) return;
      if (response && response.success === false && response.error) {
        showErrorToast(`CheckOpportunityByUrl failed: ${response.error}`);
        btn.textContent = "Check failed — retry";
        btn.disabled = false;
        btn.style.backgroundColor = "#dc2626";
        return;
      }
      if (response?.success && response.opportunity) {
        showExistingLink(btn, response.opportunity);
      } else {
        btn.textContent = "Save as Opportunity";
        btn.disabled = false;
        btn.style.backgroundColor = "#d97706";
      }
    },
  );

  console.log(`[SaveOpportunityBtn] injected on ${window.location.pathname}`);
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

// ── History patch (shared flag — won't double-patch if import-people-button already installed it) ──

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

// ── Module entry point ──────────────────────────────────────────────

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
