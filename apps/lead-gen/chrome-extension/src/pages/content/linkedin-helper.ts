// LinkedIn job helper — salary extraction + Block Company button

import {
  _observers,
  _intervals,
  isExtensionAlive,
  teardownIfDead as _teardownIfDead,
  onTeardown,
  safeSendMessage,
  showErrorToast,
} from "./lifecycle";
import { getSelfProfileSlug } from "../../services/self-profile";
import { registerInStack, unregisterFromStack } from "./floating-stack";

function clickDismiss(el: HTMLElement) {
  el.click();
}

// Strip LinkedIn's "Verified job" badge text that bleeds into scraped
// titles via textContent / aria-label fallbacks. Anchored to end-of-string
// so legitimate title words like "Verified Voice ..." are preserved.
function stripVerifiedBadge(s: string): string {
  return s
    .replace(/\s*\(\s*Verified(?:\s+job(?:\s+posting)?)?\s*\)\s*$/i, "")
    .replace(/\s+(?:with\s+verification|Verified\s+job(?:\s+posting)?|Verified)\s*$/i, "")
    .trim();
}

function findDismissButton(card: Element): HTMLButtonElement | null {
  // Primary: aria-label based (most reliable)
  const byLabel = card.querySelector(
    'button[aria-label*="Dismiss"]',
  ) as HTMLButtonElement | null;
  if (byLabel) return byLabel;

  // Fallback: the X icon button in the actions container
  const actionsContainer = card.querySelector(".job-card-list__actions-container");
  if (actionsContainer) {
    const btn = actionsContainer.querySelector("button") as HTMLButtonElement | null;
    if (btn) return btn;
  }

  return null;
}



// ── Auto-Dismiss Excluded-Location Jobs ─────────────────────────────

const DISMISS_LOCATION_PATTERNS = /\b(india|bengaluru|bangalore|mumbai|navi mumbai|hyderabad|new delhi|delhi|ncr|chennai|pune|gurugram|gurgaon|noida|greater noida|kolkata|ahmedabad|jaipur|lucknow|thiruvananthapuram|kochi|coimbatore|indore|nagpur|chandigarh|bhubaneswar|visakhapatnam|vizag|mysore|mysuru|mangalore|mangaluru|trivandrum|secunderabad|thane|vadodara|surat|rajkot|tiruchirappalli|trichy|madurai|vijayawada|warangal|guntur|nellore|kurnool|rajahmundry|kakinada|tirupati|anantapur|karimnagar|nizamabad|khammam|sri\s*lanka|colombo|kandy|galle|negombo|jaffna|pakistan|karachi|lahore|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|sialkot|gujranwala)\b/i;

function isDismissLocation(text: string): boolean {
  return DISMISS_LOCATION_PATTERNS.test(text);
}

function getCardLocationText(card: Element): string {
  const parts: string[] = [];

  // Logged-in view: metadata ULs (first is location)
  const metadataUls = card.querySelectorAll("ul.job-card-container__metadata-wrapper");
  if (metadataUls[0]) parts.push(metadataUls[0].textContent?.trim() || "");

  // Logged-in view: caption element
  const caption = card.querySelector(".artdeco-entity-lockup__caption");
  if (caption) parts.push(caption.textContent?.trim() || "");

  // Logged-in view: metadata items (individual li)
  card.querySelectorAll(".job-card-container__metadata-item").forEach((el) => {
    parts.push(el.textContent?.trim() || "");
  });

  // Public/logged-out view: location span
  const publicLoc = card.querySelector(".job-search-card__location");
  if (publicLoc) parts.push(publicLoc.textContent?.trim() || "");

  // Job title — some titles include "(India)" or "- Mumbai"
  const titleEl = card.querySelector(
    ".job-card-list__title--link, .base-search-card__title",
  );
  if (titleEl) parts.push(stripVerifiedBadge(titleEl.textContent?.trim() || ""));

  return parts.join(" ");
}

// Stagger dismiss clicks to avoid automation detection
const MAX_DISMISS_QUEUE = 20;
let dismissQueue: HTMLButtonElement[] = [];
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
const queuedButtons = new WeakSet<HTMLButtonElement>();

// ── Extension context lifecycle ────────────────────────────────────
// Shared primitives imported from ./lifecycle (see top of file).

// Register this module's dismiss-queue cleanup once, to run at teardown.
onTeardown(() => {
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = null;
  dismissQueue = [];
});

/** Thin alias so existing call sites below don't need to change. */
function teardownIfDead(): boolean {
  return _teardownIfDead();
}

function queueDismiss(card: Element, btn: HTMLButtonElement) {
  if (queuedButtons.has(btn)) return;
  if (dismissQueue.length >= MAX_DISMISS_QUEUE) return;
  card.setAttribute("data-lg-dismissed", "true");
  queuedButtons.add(btn);
  dismissQueue.push(btn);
  if (!dismissTimer) {
    processQueue();
  }
}

function processQueue() {
  if (teardownIfDead()) return;
  if (dismissQueue.length === 0) {
    dismissTimer = null;
    return;
  }
  const btn = dismissQueue.shift()!;
  if (btn.isConnected) {
    clickDismiss(btn);
  }
  dismissTimer = setTimeout(processQueue, 300 + Math.random() * 200);
}

window.addEventListener("beforeunload", () => {
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissQueue = [];
});

function autoDismissLocationCards() {
  let queued = 0;

  // Logged-in view cards
  document.querySelectorAll(".job-card-container").forEach((card) => {
    if (card.getAttribute("data-lg-dismissed")) return;
    const locText = getCardLocationText(card);
    if (!locText.trim() || !isDismissLocation(locText)) return;
    const dismissBtn = findDismissButton(card);
    if (!dismissBtn) return;
    queueDismiss(card, dismissBtn);
    queued++;
  });

  // Public/logged-out view cards
  document.querySelectorAll(".base-card.job-search-card").forEach((card) => {
    if (card.getAttribute("data-lg-dismissed")) return;
    const locText = getCardLocationText(card);
    if (!locText.trim() || !isDismissLocation(locText)) return;
    card.setAttribute("data-lg-dismissed", "true");
    (card as HTMLElement).style.display = "none";
    queued++;
  });

  if (queued > 0) {
    console.log(`[LG] Dismissing ${queued} excluded-location job(s)`);
  }
}

function injectLinkedInHelpers() {
  autoDismissLocationCards();
  clickSalaryMetadata();
}

function observeLinkedInHelpers() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  injectLinkedInHelpers();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectLinkedInHelpers, 500);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);
}

observeLinkedInHelpers();

// ── Send Email Button (LinkedIn Post/Activity Pages) ─────────────────

const SEND_EMAIL_BTN_ATTR = "data-lg-send-email-btn";

function extractPostData() {
  // Post text content
  const postTextEl = document.querySelector(
    ".feed-shared-update-v2__description, .update-components-text, .feed-shared-text__text-view",
  );
  const postText = postTextEl?.textContent?.trim() || "";

  // Extract emails from mailto links (immune to textContent whitespace stripping)
  const mailtoLinks = document.querySelectorAll(
    ".update-components-text a[href^='mailto:'], .feed-shared-text__text-view a[href^='mailto:']",
  );
  const emails: string[] = [];
  mailtoLinks.forEach((a) => {
    const href = (a as HTMLAnchorElement).href.replace("mailto:", "").trim();
    if (href && !emails.includes(href)) emails.push(href);
  });

  // Author name
  const authorEl = document.querySelector(
    ".update-components-actor__name .visually-hidden, .update-components-actor__title .visually-hidden",
  );
  let authorName = authorEl?.textContent?.trim() || "";
  if (authorName.includes("•")) authorName = authorName.split("•")[0].trim();

  // Author subtitle (role/company)
  const subtitleEl = document.querySelector(
    ".update-components-actor__description .visually-hidden, .update-components-actor__subtitle .visually-hidden",
  );
  const authorSubtitle = subtitleEl?.textContent?.trim() || "";

  return {
    authorName,
    authorSubtitle,
    postText,
    postUrl: window.location.href,
    emails,
  };
}

function createSendEmailButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(SEND_EMAIL_BTN_ATTR, "true");
  btn.textContent = "Send Email";
  btn.title = "Send email via CRM";
  btn.style.cssText = `
    background-color: #0a66c2;
    color: white;
    border: none;
    border-radius: 16px;
    padding: 6px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-left: 8px;
  `;

  btn.addEventListener("mouseenter", () => {
    btn.style.backgroundColor = "#004182";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.backgroundColor = "#0a66c2";
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const postData = extractPostData();

    btn.textContent = "Sending...";
    btn.disabled = true;

    safeSendMessage(
      { action: "sendEmailFromPost", postData },
      (response) => {
        if (!response) {
          btn.textContent = "Send Email";
          btn.style.backgroundColor = "#0a66c2";
          btn.disabled = false;
          return;
        }
        if (response?.success) {
          btn.textContent = "Sent!";
          btn.style.backgroundColor = "#16a34a";
          setTimeout(() => {
            btn.textContent = "Send Email";
            btn.style.backgroundColor = "#0a66c2";
            btn.disabled = false;
          }, 3000);
        } else {
          console.error("[LG] Send email failed:", response?.error);
          btn.textContent = response?.error || "Failed";
          btn.style.backgroundColor = "#ef4444";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Send Email";
            btn.style.backgroundColor = "#0a66c2";
          }, 2000);
        }
      },
    );
  });

  return btn;
}

function injectSendEmailButton() {
  if (!window.location.pathname.startsWith("/feed/update/")) return;
  if (document.querySelector(`[${SEND_EMAIL_BTN_ATTR}]`)) return;

  // Find the action bar on the post (like/comment/repost/send row)
  const actionBar = document.querySelector(
    ".social-details-social-actions, .feed-shared-social-actions",
  );
  if (actionBar) {
    actionBar.appendChild(createSendEmailButton());
    return;
  }

  // Fallback: inject near the post author area
  const actorContainer = document.querySelector(
    ".update-components-actor__container, .feed-shared-actor__container",
  );
  if (actorContainer) {
    actorContainer.appendChild(createSendEmailButton());
  }
}

function observeSendEmailButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!window.location.pathname.startsWith("/feed/update/")) return;

  injectSendEmailButton();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectSendEmailButton, 500);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);
}

observeSendEmailButton();

// ── Connect All Button (LinkedIn People Search) ─────────────────────

const CONNECT_ALL_BTN_ATTR = "data-lg-connect-all-btn";

// Click element in page's main world via background script (bypasses CSP + content script isolation)
function mainWorldClick(selector: string): Promise<boolean> {
  return new Promise((resolve) => {
    safeSendMessage(
      { action: "clickInMainWorld", selector },
      (response) => {
        if (!response) { resolve(false); return; }
        console.log("[ConnectAll] mainWorldClick result:", selector, response);
        resolve(response?.clicked ?? false);
      },
    );
  });
}

function getConnectButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      'button[aria-label^="Invite "][aria-label$=" to connect"]',
    ),
  ).filter((b) => b.isConnected && b.getAttribute("aria-disabled") !== "true");
}

function createConnectAllButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(CONNECT_ALL_BTN_ATTR, "true");
  btn.textContent = "Connect All";
  btn.title = "Send connect request to all people on this page";
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

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const connectBtns = getConnectButtons();
    if (connectBtns.length === 0) {
      btn.textContent = "No connects found";
      setTimeout(() => { btn.textContent = "Connect All"; }, 2000);
      return;
    }

    btn.disabled = true;
    let sent = 0;
    const total = connectBtns.length;

    for (const connectBtn of connectBtns) {
      if (!connectBtn.isConnected) continue;

      const name = connectBtn.getAttribute("aria-label") || "unknown";
      console.log(`[ConnectAll] Clicking connect: ${name}`);
      btn.textContent = `${sent + 1}/${total} connecting...`;

      // Tag + click via main world
      connectBtn.setAttribute('data-lg-connect-target', 'true');
      await mainWorldClick('[data-lg-connect-target="true"]');
      connectBtn.removeAttribute('data-lg-connect-target');

      // Wait for modal to render
      await new Promise((r) => setTimeout(r, 1500));

      // Poll for the send/modal buttons (up to 5s)
      let sendClicked = false;
      for (let i = 0; i < 20; i++) {
        // Try multiple modal selectors — LinkedIn changes these periodically
        const modal =
          document.querySelector('[role="dialog"]') ||
          document.querySelector('.artdeco-modal') ||
          document.querySelector('.send-invite') ||
          document.querySelector('.artdeco-modal-overlay [role="dialog"]') ||
          document.querySelector('.ip-fuse-limit-alert') ||
          document.querySelector('[data-test-modal]');

        // Log what we find on first and every 5th attempt
        if (i === 0 || i % 5 === 0) {
          const allBtns = modal ? Array.from(modal.querySelectorAll('button, a[role="button"]')).map(
            (b) => `[aria-label="${b.getAttribute('aria-label') || ''}" text="${b.textContent?.trim().slice(0, 40)}"]`,
          ) : [];
          console.log(`[ConnectAll] Poll #${i}: modal=${!!modal} class="${(modal as HTMLElement)?.className?.slice(0,60)}", buttons=${JSON.stringify(allBtns)}`);
        }

        // Strategy: find the send button by aria-label first, then by text content (includes for resilience)
        const findSendBtn = (root: Element | Document) =>
          root.querySelector<HTMLButtonElement>('button[aria-label="Send without a note"]') ||
          root.querySelector<HTMLButtonElement>('button[aria-label="Send now"]') ||
          root.querySelector<HTMLButtonElement>('button[aria-label="Send invitation"]') ||
          Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => {
            const text = b.textContent?.trim().toLowerCase() || '';
            return (
              text.includes('send without a note') ||
              text.includes('send now') ||
              text === 'send' ||
              text.includes('send invitation')
            );
          });

        const sendBtn = modal ? findSendBtn(modal) : findSendBtn(document);

        if (sendBtn) {
          const label = sendBtn.getAttribute('aria-label') || sendBtn.textContent?.trim() || '?';
          console.log(`[ConnectAll] Found send button: "${label}", clicking via main world`);
          btn.textContent = `${sent + 1}/${total} sending...`;
          // Tag the button so mainWorldClick can find it reliably
          sendBtn.setAttribute('data-lg-send-target', 'true');
          const clickResult = await mainWorldClick('[data-lg-send-target="true"]');
          sendBtn.removeAttribute('data-lg-send-target');
          console.log(`[ConnectAll] mainWorldClick result for "${label}":`, clickResult);
          // Check if modal disappeared
          await new Promise((r) => setTimeout(r, 500));
          const modalStillOpen = !!document.querySelector('[role="dialog"], .artdeco-modal');
          console.log("[ConnectAll] Modal still open after click:", modalStillOpen);
          sendClicked = true;
          await new Promise((r) => setTimeout(r, 500));
          break;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!sendClicked) {
        console.log("[ConnectAll] No send button found after polling, trying dismiss");
        await new Promise((r) => setTimeout(r, 500));
      }

      // Dismiss any remaining modal
      const dismissEl = document.querySelector('button[aria-label="Dismiss"]') ||
        document.querySelector('.artdeco-modal__dismiss') ||
        document.querySelector('[role="dialog"] button[aria-label="Close"]');
      if (dismissEl) {
        console.log("[ConnectAll] Dismissing modal");
        dismissEl.setAttribute('data-lg-dismiss-target', 'true');
        await mainWorldClick('[data-lg-dismiss-target="true"]');
        dismissEl.removeAttribute('data-lg-dismiss-target');
        await new Promise((r) => setTimeout(r, 300));
      }

      sent++;
      btn.textContent = `Connecting ${sent}/${total}...`;

      // Random delay between requests (2-4s) to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
    }

    btn.textContent = `Done! ${sent} sent`;
    btn.style.backgroundColor = "#16a34a";
    setTimeout(() => {
      btn.textContent = "Connect All";
      btn.style.backgroundColor = "#0a66c2";
      btn.disabled = false;
    }, 3000);
  });

  return btn;
}

function injectConnectAllButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!window.location.pathname.startsWith("/search/results/people")) return;
  if (document.querySelector(`[${CONNECT_ALL_BTN_ATTR}]`)) return;

  const btn = createConnectAllButton();
  document.body.appendChild(btn);
  registerInStack(btn, 10);
}

function observeConnectAllButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!window.location.pathname.startsWith("/search/results/people")) return;

  // Wait for page to load then inject
  setTimeout(injectConnectAllButton, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectConnectAllButton, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);
}

observeConnectAllButton();

// ── Browse Profiles Button (LinkedIn People Search) ─────────────────

const BROWSE_PROFILES_BTN_ATTR = "data-lg-browse-profiles-btn";
let browseProfilesBtn: HTMLButtonElement | null = null;

function getProfileLinks(): string[] {
  const seen = new Set<string>();
  const links: string[] = [];
  document.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]').forEach((a) => {
    const href = a.href;
    try {
      const url = new URL(href);
      // Normalize to /in/username path only
      const match = url.pathname.match(/^\/in\/([^/]+)/);
      if (!match) return;
      const profilePath = `/in/${match[1]}`;
      if (seen.has(profilePath)) return;
      seen.add(profilePath);
      links.push(`https://www.linkedin.com${profilePath}/`);
    } catch { /* skip malformed */ }
  });
  return links;
}

// ── Recruitment-only profile filter ──────────────────────────────────
//
// Aligned with backend/leadgen_agent/classify_recruitment_graph.py:
// recruitment agencies, staffing agencies, executive search / headhunting,
// RPO, talent marketplaces. Excludes in-house TA, generic HR, ATS vendors.

const RECRUITMENT_PATTERNS: RegExp[] = [
  /\brecruit(?:er|ers|ing|ment)?\b/i,
  /\btalent\s+(?:acquisition|partner|sourcer|sourcing|specialist|advisor|consultant|manager|lead|scout|operator|agent)\b/i,
  /\bhead[\s-]?hunt(?:er|ing)?\b/i,
  /\bexec(?:utive)?\s+search\b/i,
  /\bsourcer\b/i,
  /\bstaffing\b/i,
  /\bplacement\s+(?:agency|consultant)\b/i,
  /\brpo\b/i, // recruitment process outsourcing
  /\btalent\s+(?:marketplace|network|pool|agency)\b/i,
  /\b(?:agency|external|contract|contingent)\s+recruiter\b/i,
];

const CARD_SELECTORS = [
  // Current LinkedIn SDUI markup (people-search SRP renders rows as
  // `[componentkey^="entity-collection-item-"]` inside `li.artdeco-list__item`).
  '[componentkey^="entity-collection-item-"]',
  "li.artdeco-list__item",
  // Legacy / alternate markups still seen in some surfaces.
  ".entity-result",
  ".reusable-search__result-container",
  ".feed-shared-update-v2",
  ".update-components-actor",
  ".artdeco-entity-lockup",
  "[data-chameleon-result-urn]",
  "li[data-urn]",
];

function findCardContainer(anchor: HTMLAnchorElement): Element | null {
  for (const sel of CARD_SELECTORS) {
    const card = anchor.closest(sel);
    if (card) return card;
  }
  // Fallback: walk up to 8 ancestors looking for a sizeable text block.
  let cur: Element | null = anchor.parentElement;
  for (let depth = 0; depth < 8 && cur; depth++) {
    const text = (cur.textContent || "").trim();
    if (text.length > 60) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function matchedRecruitmentPattern(text: string): RegExp | null {
  for (const re of RECRUITMENT_PATTERNS) {
    if (re.test(text)) return re;
  }
  return null;
}

function looksLikeRecruitmentCard(card: Element): boolean {
  const text = (card.textContent || "").slice(0, 1500);
  return matchedRecruitmentPattern(text) !== null;
}

async function getRecruitmentProfileLinks(): Promise<{ links: string[]; scanned: number }> {
  const selfSlug = await getSelfProfileSlug();
  const seen = new Set<string>();
  const links: string[] = [];
  const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]');
  let scanned = 0;
  let rejectedNoCard = 0;
  let rejectedNoMatch = 0;
  let rejectedSelf = 0;
  const matchedSamples: { url: string; pattern: string; snippet: string }[] = [];
  const rejectedSamples: string[] = [];
  // When nothing matches we want the FULL rejected list to diagnose; cap at 50
  // so we don't blow the console up on a 100+ anchor page.
  const REJECTED_SAMPLE_CAP_DEFAULT = 3;
  const REJECTED_SAMPLE_CAP_VERBOSE = 50;

  console.log(
    `[RecruitFilter] Scanning ${anchors.length} /in/ anchors on ${window.location.pathname}` +
      (selfSlug ? ` (excluding self: ${selfSlug})` : " (self slug not detected)"),
  );

  anchors.forEach((a) => {
    let url: URL;
    try {
      url = new URL(a.href);
    } catch {
      return;
    }
    const match = url.pathname.match(/^\/in\/([^/]+)/);
    if (!match) return;
    const slug = match[1];
    if (selfSlug && slug === selfSlug) {
      rejectedSelf++;
      return;
    }
    const profilePath = `/in/${slug}`;
    if (seen.has(profilePath)) return;

    const card = findCardContainer(a);
    if (!card) {
      rejectedNoCard++;
      return;
    }
    scanned++;
    const text = (card.textContent || "").slice(0, 1500);
    const hit = matchedRecruitmentPattern(text);
    if (!hit) {
      rejectedNoMatch++;
      // Always collect up to the verbose cap; we'll decide which slice to log
      // once we know whether the run produced any links.
      if (rejectedSamples.length < REJECTED_SAMPLE_CAP_VERBOSE) {
        rejectedSamples.push(`${profilePath} → ${text.slice(0, 200).trim()}`);
      }
      return;
    }

    seen.add(profilePath);
    const finalUrl = `https://www.linkedin.com${profilePath}/`;
    links.push(finalUrl);
    if (matchedSamples.length < 10) {
      matchedSamples.push({
        url: finalUrl,
        pattern: hit.toString(),
        snippet: text.slice(0, 120).trim(),
      });
    }
  });

  console.log(
    `[RecruitFilter] Result: kept ${links.length}, rejected ${rejectedNoMatch} (no recruiter signal), ${rejectedNoCard} skipped (no card container), ${rejectedSelf} excluded (self).`,
  );
  if (matchedSamples.length > 0) {
    console.log("[RecruitFilter] Matched samples:", matchedSamples);
  }
  if (rejectedSamples.length > 0) {
    // Dump the full rejected list when we scanned cards but kept nothing —
    // this is the case the user is debugging ("only 2 profiles per run").
    const verbose = scanned > 0 && links.length === 0;
    const sample = verbose
      ? rejectedSamples
      : rejectedSamples.slice(0, REJECTED_SAMPLE_CAP_DEFAULT);
    console.log(
      `[RecruitFilter] Rejected samples${verbose ? " (verbose, no matches)" : ""}:`,
      sample,
    );
  }

  return { links, scanned };
}

const REFRESH_BATCH_SIZE_DEFAULT = 20;

function createBrowseProfilesButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BROWSE_PROFILES_BTN_ATTR, "true");
  btn.textContent = "Browse Recruiters";
  btn.title = `Visit ${REFRESH_BATCH_SIZE_DEFAULT} recruiters from Neon (least-recently-visited first), refresh post + browsemap data, and re-score fit. Order is driven by the D1 contact_visits log so each click advances the cycle.`;
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: #7c3aed;
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
    if (!btn.disabled) btn.style.backgroundColor = "#5b21b6";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.backgroundColor = "#7c3aed";
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    btn.disabled = true;
    btn.textContent = `Fetching from Neon…`;
    btn.style.backgroundColor = "#5b21b6";

    safeSendMessage(
      {
        action: "refreshCrmRecruiters",
        returnUrl: window.location.href,
        batchSize: REFRESH_BATCH_SIZE_DEFAULT,
      },
      (response) => {
        if (!response?.success) {
          btn.textContent = "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Browse Recruiters";
            btn.style.backgroundColor = "#7c3aed";
            btn.disabled = false;
          }, 2000);
        }
      },
    );
  });

  browseProfilesBtn = btn;
  return btn;
}

// Browse-All-Pages is search-context-bound (needs Voyager pagination from a
// people-search URL). Refresh-CRM is not — it pulls URLs from Neon, so it's
// useful from any LinkedIn page.
function isOnBrowsableLinkedInPath(): boolean {
  if (!window.location.hostname.includes("linkedin.com")) return false;
  const p = window.location.pathname;
  return p.startsWith("/search/results/people") || p.startsWith("/feed");
}
function isOnAnyLinkedInPath(): boolean {
  return window.location.hostname.includes("linkedin.com");
}

function syncBrowseButtonForPath() {
  if (!document.body) return;
  if (isOnAnyLinkedInPath()) {
    if (!document.querySelector(`[${BROWSE_PROFILES_BTN_ATTR}]`)) {
      const btn = createBrowseProfilesButton();
      document.body.appendChild(btn);
      registerInStack(btn, 20);
    }
  } else {
    document.querySelectorAll<HTMLElement>(`[${BROWSE_PROFILES_BTN_ATTR}]`).forEach((el) => {
      unregisterFromStack(el);
      el.remove();
    });
    browseProfilesBtn = null;
  }
}

function injectBrowseProfilesButton() {
  syncBrowseButtonForPath();
}

function observeBrowseProfilesButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  // Warm the self-slug cache so background guards have a value to read
  // before the user clicks Browse Recruiters.
  void getSelfProfileSlug();

  setTimeout(syncBrowseButtonForPath, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncBrowseButtonForPath, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  // SPA nav: import-people-button.ts patches history.pushState and dispatches
  // 'lg:locationchange' globally — listen so we re-sync when LinkedIn moves
  // us between /feed/ and /search/results/people/ without a full reload.
  window.addEventListener("lg:locationchange", () => {
    if (teardownIfDead()) return;
    syncBrowseButtonForPath();
  });
}

observeBrowseProfilesButton();

// ── Browse All Pages Button (Voyager pagination) ────────────────────
//
// Sits next to "Browse Profiles". Triggers cross-page traversal via the
// Voyager search-clusters endpoint (capped at LinkedIn's ~1000 results)
// instead of just the visible page. Refuses to run unless the search
// URL has a remote-keyword signal — see people-search-traversal.ts.

const BROWSE_ALL_BTN_ATTR = "data-lg-browse-all-pages-btn";
let browseAllBtn: HTMLButtonElement | null = null;

function createBrowseAllButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BROWSE_ALL_BTN_ATTR, "true");
  btn.textContent = "Browse All Pages";
  btn.title = "Paginate every search page via Voyager API and visit each remote profile";
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: #0f766e;
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
    if (!btn.disabled) btn.style.backgroundColor = "#115e59";
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) btn.style.backgroundColor = "#0f766e";
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // On /feed/ there is no search context to paginate — prompt for
    // keywords (must include 'remote') and navigate to the search URL.
    // The user clicks the button again on the search results page to
    // actually trigger Voyager pagination.
    if (window.location.pathname.startsWith("/feed")) {
      const kw = window.prompt(
        "Search keywords (must include 'remote' / 'fully remote' / 'wfh'):",
        "remote engineer",
      );
      if (!kw) return;
      const target = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(kw)}&origin=GLOBAL_SEARCH_HEADER`;
      window.location.href = target;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Paginating…";
    btn.style.backgroundColor = "#115e59";
    safeSendMessage(
      {
        action: "startProfileBrowsingAllPages",
        searchUrl: window.location.href,
      },
      (response) => {
        if (!response?.success) {
          btn.textContent = "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Browse All Pages";
            btn.style.backgroundColor = "#0f766e";
            btn.disabled = false;
          }, 2000);
        }
      },
    );
  });

  browseAllBtn = btn;
  return btn;
}

function syncBrowseAllButtonForPath() {
  if (!document.body) return;
  if (isOnBrowsableLinkedInPath()) {
    if (!document.querySelector(`[${BROWSE_ALL_BTN_ATTR}]`)) {
      const btn = createBrowseAllButton();
      document.body.appendChild(btn);
      registerInStack(btn, 30);
    }
  } else {
    document.querySelectorAll<HTMLElement>(`[${BROWSE_ALL_BTN_ATTR}]`).forEach((el) => {
      unregisterFromStack(el);
      el.remove();
    });
    browseAllBtn = null;
  }
}

function injectBrowseAllButton() {
  syncBrowseAllButtonForPath();
}

function observeBrowseAllButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  setTimeout(syncBrowseAllButtonForPath, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncBrowseAllButtonForPath, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  window.addEventListener("lg:locationchange", () => {
    if (teardownIfDead()) return;
    syncBrowseAllButtonForPath();
  });
}

observeBrowseAllButton();

// ── Score All DB Contacts Button ────────────────────────────────────
//
// Stacks above "Browse All Pages". Triggers the scoreAllDbContacts
// background handler which paginates the entire contacts table and
// runs the same browseProfiles engine (visit → save no-op → scrape
// posts → score_recruiter_fit → upsert recruiter_fit_scores).
// Only injected on /feed/ — this is a global op, not page-scoped.

const SCORE_ALL_BTN_ATTR = "data-lg-score-all-btn";
let scoreAllBtn: HTMLButtonElement | null = null;

function createScoreAllButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(SCORE_ALL_BTN_ATTR, "true");
  btn.textContent = "Score All Contacts";
  btn.title = "Re-score every saved contact with a LinkedIn URL via score_recruiter_fit (Shift-click: ignore 24h dedup)";
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
    e.preventDefault();
    e.stopPropagation();

    const ignoreDedup = e.shiftKey;
    const proceed = window.confirm(
      "Score every saved contact with a LinkedIn URL?\n\n" +
        "This visits each profile (≈5s/contact) and may take hours.\n" +
        (ignoreDedup ? "Ignoring 24h re-visit dedup (shift-click).\n" : "") +
        "Continue?",
    );
    if (!proceed) return;

    btn.disabled = true;
    btn.textContent = ignoreDedup ? "Starting (no dedup)…" : "Starting…";
    btn.style.backgroundColor = "#92400e";

    safeSendMessage(
      {
        action: "scoreAllDbContacts",
        returnUrl: window.location.href,
        ignoreDedup,
      },
      (response) => {
        if (!response?.success) {
          btn.textContent = "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Score All Contacts";
            btn.style.backgroundColor = "#d97706";
            btn.disabled = false;
          }, 2000);
        }
      },
    );
  });

  scoreAllBtn = btn;
  return btn;
}

function syncScoreAllButtonForPath() {
  if (!document.body) return;
  // Only on /feed/ — search-page traversal has its own scoped buttons.
  const onFeed = window.location.pathname.startsWith("/feed");
  if (onFeed) {
    if (!document.querySelector(`[${SCORE_ALL_BTN_ATTR}]`)) {
      const btn = createScoreAllButton();
      document.body.appendChild(btn);
      registerInStack(btn, 40);
    }
  } else {
    document.querySelectorAll<HTMLElement>(`[${SCORE_ALL_BTN_ATTR}]`).forEach((el) => {
      unregisterFromStack(el);
      el.remove();
    });
    scoreAllBtn = null;
  }
}

function observeScoreAllButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  setTimeout(syncScoreAllButtonForPath, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncScoreAllButtonForPath, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  window.addEventListener("lg:locationchange", () => {
    if (teardownIfDead()) return;
    syncScoreAllButtonForPath();
  });
}

observeScoreAllButton();

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (!isExtensionAlive()) return;
  if (message.action === "browseProgress") {
    const text = `${message.current}/${message.total} ${message.name || ""}`.trim();
    if (browseProfilesBtn) browseProfilesBtn.textContent = text;
    if (browseAllBtn) browseAllBtn.textContent = text;
  }
  if (message.action === "scoreAllProgress" && scoreAllBtn) {
    scoreAllBtn.textContent =
      `${message.current}/${message.total} ${message.name || ""}`.trim();
  }
  if (message.action === "scoreAllDone" && scoreAllBtn) {
    scoreAllBtn.textContent = message.error
      ? message.error.slice(0, 40)
      : `Done! ${message.saved} scored`;
    scoreAllBtn.style.backgroundColor = message.error ? "#dc2626" : "#16a34a";
    setTimeout(() => {
      if (scoreAllBtn) {
        scoreAllBtn.textContent = "Score All Contacts";
        scoreAllBtn.style.backgroundColor = "#d97706";
        scoreAllBtn.disabled = false;
      }
    }, 4000);
  }
  if (message.action === "browseDone") {
    if (browseProfilesBtn) {
      browseProfilesBtn.textContent = message.error
        ? message.error.slice(0, 40)
        : `Done! ${message.saved} saved`;
      browseProfilesBtn.style.backgroundColor = message.error ? "#dc2626" : "#16a34a";
      setTimeout(() => {
        browseProfilesBtn!.textContent = "Browse Recruiters";
        browseProfilesBtn!.style.backgroundColor = "#7c3aed";
        browseProfilesBtn!.disabled = false;
      }, 4000);
    }
    if (browseAllBtn) {
      browseAllBtn.textContent = message.error
        ? message.error.slice(0, 40)
        : `Done! ${message.saved} saved`;
      browseAllBtn.style.backgroundColor = message.error ? "#dc2626" : "#16a34a";
      setTimeout(() => {
        browseAllBtn!.textContent = "Browse All Pages";
        browseAllBtn!.style.backgroundColor = "#0f766e";
        browseAllBtn!.disabled = false;
      }, 4000);
    }
  }

  // Import People progress messages are handled by ./import-people-button.

  // Scrape People Posts progress
  if (message.action === "scrapePeoplePostsProgress" && scrapePeoplePostsBtn) {
    scrapePeoplePostsBtn.textContent = message.message || "Scraping...";
  }
  if (message.action === "scrapePeoplePostsDone" && scrapePeoplePostsBtn) {
    const skippedText = message.skipped ? `, ${message.skipped} skipped` : "";
    scrapePeoplePostsBtn.textContent = `Done! ${message.people} scraped, ${message.posts} posts${skippedText}`;
    scrapePeoplePostsBtn.style.backgroundColor = "#16a34a";
    scrapePeoplePostsRunning = false;
    setTimeout(() => {
      if (scrapePeoplePostsBtn) {
        scrapePeoplePostsBtn.textContent = "Scrape People Posts";
        scrapePeoplePostsBtn.style.backgroundColor = "#7c3aed";
        scrapePeoplePostsBtn.disabled = false;
      }
    }, 3000);
  }
  if (message.action === "scrapePeoplePostsError" && scrapePeoplePostsBtn) {
    scrapePeoplePostsBtn.textContent = message.error?.slice(0, 35) || "Error";
    scrapePeoplePostsBtn.style.backgroundColor = "#dc2626";
    scrapePeoplePostsRunning = false;
    setTimeout(() => {
      if (scrapePeoplePostsBtn) {
        scrapePeoplePostsBtn.textContent = "Scrape People Posts";
        scrapePeoplePostsBtn.style.backgroundColor = "#7c3aed";
        scrapePeoplePostsBtn.disabled = false;
      }
    }, 3000);
  }

  // Find Related progress
  if (message.action === "findRelatedProgress" && findRelatedBtn) {
    const dupes = message.skipped || 0;
    const queued = message.queued ?? "?";
    const name = (message.name || "").slice(0, 25);
    const tgt = message.targets ? ` (${message.targets} \u{1F3AF})` : "";
    const filt = message.filtered ? `, ${message.filtered} filt` : "";
    findRelatedBtn.textContent = `${message.current} saved${tgt}, ${dupes} dup${filt} (${queued}q) ${name}`;
    findRelatedBtn.title = `Click to stop | ${message.current} saved, ${dupes} dupes, ${message.filtered || 0} filtered, ${queued} queued — ${message.name || ""}`;
  }
  if (message.action === "findRelatedDone" && findRelatedBtn) {
    findRelatedRunning = false;
    const dupes = message.skipped || 0;
    const tgt = message.targets ? ` (${message.targets} \u{1F3AF})` : "";
    const filt = message.filtered ? `, ${message.filtered} filt` : "";
    const label = message.cancelled ? "Stopped!" : "Done!";
    findRelatedBtn.textContent = `${label} ${message.saved} new${tgt}, ${dupes} dup${filt}`;
    findRelatedBtn.style.backgroundColor = message.cancelled ? "#d97706" : "#16a34a";
    findRelatedBtn.title = "Find and save similar/related companies from LinkedIn";
    setTimeout(() => {
      if (findRelatedBtn) {
        findRelatedBtn.textContent = "Find Related";
        findRelatedBtn.style.backgroundColor = "#0d9488";
        findRelatedBtn.disabled = false;
      }
    }, 3000);
  }
  if (message.action === "findRelatedError" && findRelatedBtn) {
    findRelatedRunning = false;
    findRelatedBtn.textContent = message.error?.slice(0, 30) || "Error";
    findRelatedBtn.style.backgroundColor = "#dc2626";
    findRelatedBtn.title = "Find and save similar/related companies from LinkedIn";
    setTimeout(() => {
      if (findRelatedBtn) {
        findRelatedBtn.textContent = "Find Related";
        findRelatedBtn.style.backgroundColor = "#0d9488";
        findRelatedBtn.disabled = false;
      }
    }, 3000);
  }
});

// ── Company Page Floating Buttons (Import People + Find Related) ────
//
// LinkedIn uses pushState for SPA navigation (e.g. /company/foo -> /company/bar
// or /company/foo -> /feed/). A single MutationObserver + URL polling handles:
//   1. Injecting buttons when arriving on a company page
//   2. Removing buttons when navigating away
//   3. Cleaning up stale buttons when navigating between company pages
//   4. Disconnecting the observer if the hostname changes (unlikely but safe)

// NOTE: The "Import People" button (formerly data-lg-import-people-btn) lives
// in ./import-people-button — it's URL-scoped to /company/{slug}/people/ only.
const FIND_RELATED_BTN_ATTR = "data-lg-find-related-btn";
const SCRAPE_PEOPLE_POSTS_BTN_ATTR = "data-lg-scrape-people-posts-btn";
let findRelatedBtn: HTMLButtonElement | null = null;
let scrapePeoplePostsBtn: HTMLButtonElement | null = null;
let scrapePeoplePostsRunning = false;
let companyButtonsObserver: MutationObserver | null = null;
let lastKnownCompanySlug: string | null = null;

function extractCompanyInfoFromPage(): { name: string; linkedinUrl: string } {
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

/** Get the company slug from current URL, or null if not on a company page */
function getCompanySlug(): string | null {
  const match = window.location.pathname.match(/^\/company\/([^/]+)/);
  return match ? match[1] : null;
}

function removeCompanyButtons() {
  // Remove all buttons from DOM (handles duplicates too)
  document.querySelectorAll<HTMLElement>(`[${FIND_RELATED_BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  document.querySelectorAll<HTMLElement>(`[${SCRAPE_PEOPLE_POSTS_BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  findRelatedBtn = null;
  scrapePeoplePostsBtn = null;
  scrapePeoplePostsRunning = false;
}

let findRelatedRunning = false;

function createFindRelatedButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(FIND_RELATED_BTN_ATTR, "true");
  btn.textContent = "Find Related";
  btn.title = "Find and save similar/related companies from LinkedIn";
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: #0d9488;
    color: white;
    border: none;
    border-radius: 24px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: background-color 0.2s;
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  btn.addEventListener("mouseenter", () => {
    if (!btn.disabled) {
      btn.style.backgroundColor = findRelatedRunning ? "#991b1b" : "#0f766e";
    }
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) {
      btn.style.backgroundColor = findRelatedRunning ? "#dc2626" : "#0d9488";
    }
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (findRelatedRunning) {
      // Stop the crawl
      btn.textContent = "Stopping...";
      btn.disabled = true;
      safeSendMessage(
        { action: "stopFindRelated" },
        (response) => {
          if (!response?.success) {
            btn.textContent = "Stop failed";
            setTimeout(() => {
              btn.textContent = "Find Related";
              btn.style.backgroundColor = "#0d9488";
              btn.disabled = false;
              findRelatedRunning = false;
            }, 2000);
          }
        },
      );
      return;
    }

    // Start the crawl
    findRelatedRunning = true;
    btn.textContent = "Searching...";
    btn.style.backgroundColor = "#dc2626";
    btn.title = "Click to stop the crawl";

    console.log("[FindRelated:CS] Button clicked, sending findRelatedCompanies...", window.location.href);
    safeSendMessage(
      { action: "findRelatedCompanies" },
      (response) => {
        if (!response?.success) {
          console.warn("[FindRelated:CS] No response or error:", response);
          btn.textContent = "Error";
          btn.style.backgroundColor = "#dc2626";
          findRelatedRunning = false;
          setTimeout(() => {
            btn.textContent = "Find Related";
            btn.style.backgroundColor = "#0d9488";
            btn.disabled = false;
          }, 2000);
        } else {
          console.log("[FindRelated:CS] Background response:", response);
        }
      },
    );
  });

  return btn;
}

function createScrapePeoplePostsButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(SCRAPE_PEOPLE_POSTS_BTN_ATTR, "true");
  btn.textContent = "Scrape People Posts";
  btn.title = "Navigate to each person's activity page and save their posts";
  btn.style.cssText = `
    position: fixed;
    right: 24px;
    z-index: 9999;
    background-color: #7c3aed;
    color: white;
    border: none;
    border-radius: 24px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: background-color 0.2s;
    max-width: 420px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  btn.addEventListener("mouseenter", () => {
    if (!btn.disabled) {
      btn.style.backgroundColor = scrapePeoplePostsRunning ? "#991b1b" : "#6d28d9";
    }
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn.disabled) {
      btn.style.backgroundColor = scrapePeoplePostsRunning ? "#dc2626" : "#7c3aed";
    }
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (scrapePeoplePostsRunning) {
      // Stop
      safeSendMessage({ action: "stopPeoplePostsScraping" });
      btn.textContent = "Stopping...";
      btn.disabled = true;
      scrapePeoplePostsRunning = false;
      setTimeout(() => {
        btn.textContent = "Scrape People Posts";
        btn.style.backgroundColor = "#7c3aed";
        btn.disabled = false;
      }, 2000);
      return;
    }

    const companyInfo = extractCompanyInfoFromPage();
    if (!companyInfo.name) {
      btn.textContent = "No company found";
      setTimeout(() => { btn.textContent = "Scrape People Posts"; }, 2000);
      return;
    }

    scrapePeoplePostsRunning = true;
    btn.textContent = "Starting...";
    btn.style.backgroundColor = "#dc2626";

    safeSendMessage(
      {
        action: "scrapePeoplePostsFromCompanyPage",
        companyName: companyInfo.name,
        companyLinkedinUrl: companyInfo.linkedinUrl,
      },
      (response) => {
        if (!response?.success) {
          btn.textContent = "Error";
          btn.style.backgroundColor = "#dc2626";
          scrapePeoplePostsRunning = false;
          setTimeout(() => {
            btn.textContent = "Scrape People Posts";
            btn.style.backgroundColor = "#7c3aed";
            btn.disabled = false;
          }, 2000);
        }
      },
    );
  });

  return btn;
}

/**
 * Synchronize floating buttons with current URL state.
 * - On company pages: inject buttons if missing, or replace if slug changed
 * - On non-company pages: remove any stale buttons
 */
function syncCompanyButtons() {
  if (!window.location.hostname.includes("linkedin.com")) {
    removeCompanyButtons();
    return;
  }

  const slug = getCompanySlug();

  if (!slug) {
    // Not on a company page — remove buttons if they exist
    if (findRelatedBtn || scrapePeoplePostsBtn) {
      removeCompanyButtons();
      lastKnownCompanySlug = null;
    }
    return;
  }

  // On a company page — check if we need to (re)inject
  if (slug !== lastKnownCompanySlug) {
    // Company changed (SPA navigation between companies) — remove old buttons
    removeCompanyButtons();
    lastKnownCompanySlug = slug;
  }

  // Inject buttons if not present (Import People is owned by ./import-people-button)
  if (!document.querySelector(`[${FIND_RELATED_BTN_ATTR}]`)) {
    const frBtn = createFindRelatedButton();
    document.body.appendChild(frBtn);
    findRelatedBtn = frBtn;
    registerInStack(frBtn, 20);
  }

  if (!document.querySelector(`[${SCRAPE_PEOPLE_POSTS_BTN_ATTR}]`)) {
    const sppBtn = createScrapePeoplePostsButton();
    document.body.appendChild(sppBtn);
    scrapePeoplePostsBtn = sppBtn;
    registerInStack(sppBtn, 30);
  }
}

function observeCompanyButtons() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  // Initial injection after a short delay for page hydration
  setTimeout(syncCompanyButtons, 1500);

  // Single MutationObserver for both buttons (avoids duplicate observers)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  companyButtonsObserver = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncCompanyButtons, 1000);
  });
  companyButtonsObserver.observe(document.body, { childList: true, subtree: true });
  _observers.push(companyButtonsObserver);

  // LinkedIn SPA navigation uses pushState/replaceState — listen for URL changes
  // to detect navigation between company pages or away from company pages.
  let lastUrl = window.location.href;
  const urlCheckInterval = setInterval(() => {
    if (teardownIfDead()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      syncCompanyButtons();
    }
    // Disconnect observer if we're no longer on LinkedIn (shouldn't happen, but safe)
    if (!window.location.hostname.includes("linkedin.com")) {
      clearInterval(urlCheckInterval);
      if (companyButtonsObserver) {
        companyButtonsObserver.disconnect();
        companyButtonsObserver = null;
      }
    }
  }, 1000);
  _intervals.push(urlCheckInterval);
}

observeCompanyButtons();

// ── Profile Page Floating Button (Import Profile) ────────────────────

const IMPORT_PROFILE_BTN_ATTR = "data-lg-import-profile-btn";
let importProfileBtn: HTMLButtonElement | null = null;
let lastKnownProfileSlug: string | null = null;

function getProfileSlug(): string | null {
  const match = window.location.pathname.match(/^\/in\/([^/]+)/);
  return match ? match[1] : null;
}

function removeProfileButton() {
  document.querySelectorAll<HTMLElement>(`[${IMPORT_PROFILE_BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  importProfileBtn = null;
}

/**
 * Trigger lazy-rendered sections by scrolling through the page, then return
 * to the top. Awaits the Experience section to be present in the DOM.
 *
 * Why: LinkedIn's profile page uses IntersectionObserver to mount sections
 * (Experience, Education, Skills, …) only when scrolled into view. The
 * Import Profile button is fixed bottom-right, so the user can click it
 * without ever bringing those sections into view, and our DOM scrape sees
 * an empty page. Force-scroll fixes that without changing the click UX.
 */
async function walkSectionsAndCapture(): Promise<{
  initialY: number;
  experience: { companyName: string; companyLinkedinUrl: string; position: string } | null;
  emails: string[];
}> {
  const initialY = window.scrollY;
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // Pass 1: step top → bottom in 80%-viewport hops so every IntersectionObserver
  // fires. Repeat until the page height stabilizes — LinkedIn lazy-loads sections
  // (Education, Licenses, Skills, Recommendations…) below Experience, and each
  // one mounting extends document.scrollHeight. A single top-to-bottom pass
  // would stop short of the new bottom and miss late-mounting sections.
  const docHeight = () =>
    Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );
  const viewport = window.innerHeight;
  const stepDown = async (target: number) => {
    for (let y = window.scrollY; y < target; y += Math.floor(viewport * 0.8)) {
      window.scrollTo({ top: y, behavior: "auto" });
      await sleep(150);
    }
    window.scrollTo({ top: target, behavior: "auto" });
    await sleep(300);
  };
  let prevHeight = 0;
  let stableCount = 0;
  let passes = 0;
  for (; passes < 6 && stableCount < 2; passes++) {
    window.scrollTo({ top: 0, behavior: "auto" });
    await sleep(80);
    await stepDown(docHeight());
    const dh = docHeight();
    if (dh === prevHeight) stableCount++;
    else { prevHeight = dh; stableCount = 0; }
  }
  console.log(`[LG ImportProfile] lazy-load[scroll]: ${passes} passes, final docHeight=${prevHeight}`);

  // Pass 2: wait up to 4s for Experience entries to mount, then EXTRACT WHILE
  // PARKED on the section. LinkedIn's profile DOM is virtualized — scrolling
  // away unmounts sections shortly after they leave the viewport. If we tried
  // to extract after returning to the top, the entries we just mounted would
  // already be gone.
  let expDiag = "";
  let expSection: HTMLElement | null = null;
  for (let i = 0; i < 40; i++) {
    const sec = document.querySelector<HTMLElement>(
      '[componentkey*="ExperienceTopLevelSection"], #experience',
    );
    if (!sec) {
      expDiag = "no section yet";
    } else {
      const root = sec.id === "experience" ? sec.closest("section") ?? sec : sec;
      const entries = root.querySelectorAll(
        '[componentkey^="entity-collection-item-"], li.artdeco-list__item',
      );
      if (entries.length > 0) {
        expDiag = `ready: ${entries.length} entries after ${i * 100}ms`;
        expSection = sec;
        break;
      }
      expDiag = `section mounted, awaiting entries (poll ${i})`;
      if (i === 10 || i === 25) {
        sec.scrollIntoView({ block: "center" });
      }
    }
    await sleep(100);
  }
  console.log(`[LG ImportProfile] lazy-load[experience]: ${expDiag}`);
  let experience: ReturnType<typeof extractCurrentRoleFromExperience> = null;
  if (expSection) {
    expSection.scrollIntoView({ block: "center" });
    await sleep(150);
    experience = extractCurrentRoleFromExperience();
  }

  // Pass 3: scroll the About section into view and extract emails. Without
  // this step the About section can already be unmounted by the time the
  // sync extractor reads its `[data-testid="expandable-text-box"]`.
  const aboutSection = document.querySelector<HTMLElement>(
    '[componentkey*="profile.card."][componentkey$="About"], #about',
  );
  if (aboutSection) {
    aboutSection.scrollIntoView({ block: "center" });
    await sleep(200);
    console.log("[LG ImportProfile] lazy-load[about]: ready");
  } else {
    console.log("[LG ImportProfile] lazy-load[about]: section not found");
  }
  const emails = extractEmailsFromAbout();

  return { initialY, experience, emails };
}

/**
 * Scan the About section for email addresses. Recruiters routinely paste
 * their work email into the About text ("…feel free to email me at
 * jane@acme.com"); this is the highest-yield place to find a contact email.
 */
function extractEmailsFromAbout(): string[] {
  const aboutSection = document.querySelector(
    '[componentkey*="profile.card."][componentkey$="About"], #about',
  );
  if (!aboutSection) {
    console.log("[LG ImportProfile] about: section not found in DOM");
    return [];
  }
  const textBox =
    aboutSection.querySelector('[data-testid="expandable-text-box"]') ??
    aboutSection;
  // De-obfuscate "name (at) domain (dot) com" / "name [at] domain [dot] com".
  const raw = (textBox.textContent || "")
    .replace(/\s*[\(\[]\s*at\s*[\)\]]\s*/gi, "@")
    .replace(/\s*[\(\[]\s*dot\s*[\)\]]\s*/gi, ".");
  const matches = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches) return [];
  // Dedup, lowercase, strip trailing punctuation.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const cleaned = m.toLowerCase().replace(/[.,;:!?)]+$/, "");
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      out.push(cleaned);
    }
  }
  return out;
}

/**
 * Parse LinkedIn's SDUI Experience section and return the entry that's
 * marked "- Present", or the most recent entry if none is current.
 *
 * Why: LinkedIn now renders the profile via SDUI (componentkey="..." divs);
 * the legacy `#experience` anchor and `data-field="experience_company_logo"`
 * selectors no longer match, so the prior fallback chain silently picked
 * a wrong company from the page-level DOM or the headline.
 */
function extractCurrentRoleFromExperience(): {
  companyName: string;
  companyLinkedinUrl: string;
  position: string;
} | null {
  const sectionMatch = document.querySelector(
    '[componentkey*="ExperienceTopLevelSection"], #experience',
  );
  if (!sectionMatch) {
    console.log("[LG ImportProfile] experience: section not found in DOM (lazy-loaded? scroll the page first)");
    return null;
  }
  const section: Element =
    sectionMatch.id === "experience"
      ? sectionMatch.closest("section") ?? sectionMatch
      : sectionMatch;

  const entries = section.querySelectorAll<HTMLElement>(
    '[componentkey^="entity-collection-item-"], li.artdeco-list__item',
  );
  console.log("[LG ImportProfile] experience: section found, entries:", entries.length);
  if (entries.length === 0) return null;

  type Parsed = {
    companyName: string;
    companyLinkedinUrl: string;
    position: string;
    dateRange: string;
  };

  const parseEntry = (entry: HTMLElement): Parsed | null => {
    const companyLink = entry.querySelector<HTMLAnchorElement>(
      'a[href*="/company/"]',
    );
    if (!companyLink) return null;

    const companyLinkedinUrl = companyLink.href.split("?")[0].replace(/\/$/, "");

    const ps = Array.from(entry.querySelectorAll<HTMLParagraphElement>("p"))
      .map((p) => p.textContent?.trim() || "")
      .filter(Boolean);

    const position = ps[0] || "";

    // Company line is the first `<p>` after position that contains `·` or matches
    // the company link's aria-label. Strip employment type ("· Full-time").
    let companyName = "";
    for (let i = 1; i < ps.length; i++) {
      if (ps[i].includes("·") && !/\b(Present|\d{4})\b/.test(ps[i])) {
        companyName = ps[i].split("·")[0].trim();
        break;
      }
    }
    if (!companyName) {
      const ariaLabel =
        companyLink.getAttribute("aria-label") ||
        companyLink.querySelector("figure")?.getAttribute("aria-label") ||
        companyLink.querySelector("img")?.getAttribute("alt") ||
        "";
      companyName = ariaLabel.replace(/\s+logo$/i, "").trim();
    }
    if (!companyName) {
      companyName = companyLink.textContent?.trim() || "";
    }

    const dateRange =
      ps.find(
        (t) => /[-–]/.test(t) && /\b(Present|\d{4})\b/.test(t),
      ) || "";

    return { companyName, companyLinkedinUrl, position, dateRange };
  };

  const parsed: Parsed[] = [];
  entries.forEach((entry) => {
    const p = parseEntry(entry);
    if (p) parsed.push(p);
  });
  console.log("[LG ImportProfile] experience: parsed", parsed.length, "of", entries.length, "entries:", parsed.map((p) => `${p.position} @ ${p.companyName} [${p.dateRange}]`));
  if (parsed.length === 0) return null;

  const current =
    parsed.find((p) => /[-–]\s*Present\b/i.test(p.dateRange)) ?? parsed[0];

  return {
    companyName: current.companyName,
    companyLinkedinUrl: current.companyLinkedinUrl,
    position: current.position,
  };
}

/** Extract profile data directly from the DOM (runs in content script context). */
function extractProfileFromDOM(captured?: {
  experience?: { companyName: string; companyLinkedinUrl: string; position: string } | null;
  emails?: string[];
}): {
  name: string;
  headline: string;
  location: string;
  linkedinUrl: string;
  currentCompany: string;
  currentCompanyLinkedinUrl: string;
  currentPosition: string;
  currentEmails: string[];
} {
  // Debug: log all h1 elements to console
  const allH1 = document.querySelectorAll("h1");
  console.log("[LG ImportProfile] h1 elements:", allH1.length, Array.from(allH1).map(h => `"${h.textContent?.trim()}" class="${h.className}"`));

  // Name — try multiple selectors, broadest last
  const nameEl =
    document.querySelector("h1.text-heading-xlarge") ||
    document.querySelector("h1.break-words") ||
    document.querySelector(".pv-top-card--list h1") ||
    document.querySelector(".artdeco-entity-lockup__title h1") ||
    document.querySelector("[data-anonymize='person-name']") ||
    document.querySelector("h1");
  let name = nameEl?.textContent?.trim() || "";

  // Fallback: parse from document title ("FirstName LastName - Title | LinkedIn")
  if (!name && document.title) {
    const titleMatch = document.title.match(/^(.+?)\s*[-–—|]/);
    if (titleMatch) name = titleMatch[1].trim();
  }

  console.log("[LG ImportProfile] name:", JSON.stringify(name), "from:", nameEl?.tagName, nameEl?.className);

  // Headline — try multiple selectors
  const headlineEl =
    document.querySelector(".text-body-medium.break-words") ||
    document.querySelector(".pv-top-card--list .text-body-medium") ||
    document.querySelector("[data-anonymize='headline']") ||
    document.querySelector(".pv-text-details__left-panel div.text-body-medium");
  const headline = headlineEl?.textContent?.trim() || "";

  console.log("[LG ImportProfile] headline:", JSON.stringify(headline));

  // Location
  const locationEl =
    document.querySelector("span.text-body-small.inline.t-black--light.break-words") ||
    document.querySelector(".pv-top-card--list-bullet .text-body-small") ||
    document.querySelector("[data-anonymize='location']");
  const location = locationEl?.textContent?.trim() || "";

  // Current company — try various selectors
  let currentCompany = "";
  let currentCompanyLinkedinUrl = "";
  let currentPosition = "";

  // Strategy 0: use the pre-captured experience data from walkSectionsAndCapture
  // (so we read while Experience was in view). Fall back to a synchronous read
  // for legacy / non-orchestrated callers.
  const fromExperience = captured?.experience !== undefined
    ? captured.experience
    : extractCurrentRoleFromExperience();
  if (fromExperience?.companyName) {
    currentCompany = fromExperience.companyName;
    currentCompanyLinkedinUrl = fromExperience.companyLinkedinUrl;
    currentPosition = fromExperience.position;
  }

  // Strategy 1: company link in the top card area
  const companySelectors = [
    'a[href*="/company/"][data-field="experience_company_logo"]',
    'div.pv-text-details__right-panel a[href*="/company/"]',
    '.pv-top-card--experience-list-item a[href*="/company/"]',
    '.pv-top-card .experience-item a[href*="/company/"]',
  ];
  for (const sel of companySelectors) {
    const link = document.querySelector<HTMLAnchorElement>(sel);
    if (link) {
      currentCompany = link.textContent?.trim() || "";
      currentCompanyLinkedinUrl = link.href.split("?")[0].replace(/\/$/, "");
      break;
    }
  }

  // Strategy 2: experience section
  if (!currentCompany) {
    const expSection = document.querySelector("#experience")?.closest("section");
    if (expSection) {
      const firstLink = expSection.querySelector<HTMLAnchorElement>('a[href*="/company/"]');
      if (firstLink) {
        const nameSpan = firstLink.querySelector("span.visually-hidden") ||
          firstLink.querySelector("span");
        currentCompany = nameSpan?.textContent?.trim() || firstLink.textContent?.trim() || "";
        currentCompanyLinkedinUrl = firstLink.href.split("?")[0].replace(/\/$/, "");
      }
    }
  }

  // Strategy 3: parse company from headline ("Title at Company")
  if (!currentCompany && headline) {
    for (const sep of [" at ", " @ ", " | "]) {
      const idx = headline.toLowerCase().indexOf(sep);
      if (idx > 0) {
        currentCompany = headline.slice(idx + sep.length).trim();
        break;
      }
    }
  }

  console.log("[LG ImportProfile] company:", JSON.stringify(currentCompany), "url:", currentCompanyLinkedinUrl, "position:", JSON.stringify(currentPosition));

  const currentEmails = captured?.emails ?? extractEmailsFromAbout();
  console.log("[LG ImportProfile] emails:", currentEmails);

  return {
    name,
    headline,
    location,
    linkedinUrl: window.location.href.split("?")[0],
    currentCompany,
    currentCompanyLinkedinUrl,
    currentPosition,
    currentEmails,
  };
}

function createImportProfileButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(IMPORT_PROFILE_BTN_ATTR, "true");
  btn.textContent = "Import Profile";
  btn.title = "Import this LinkedIn profile into the CRM";
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

  btn.addEventListener("click", async (e) => {
    // If showing an existing contact link, let the <a> navigate normally
    if (btn.dataset.existingContact) return;

    e.preventDefault();
    e.stopPropagation();

    btn.disabled = true;
    btn.textContent = "Loading sections…";

    // LinkedIn lazy-renders profile sections (Experience, Education, etc.) as
    // they enter the viewport. The Import Profile button is fixed bottom-right,
    // so users typically click it from the top of the page — at which point
    // the Experience section's DOM nodes don't exist and SDUI parsing returns
    // nothing. Force a full-page scroll to trigger every IntersectionObserver,
    // wait for the renders to settle, then extract.
    // Walk down the page, mounting and EXTRACTING from each lazy section while
    // it's still in view. LinkedIn's profile DOM is virtualized — sections far
    // off-screen get unmounted shortly after they leave the viewport, so we
    // can't simply load everything then read at the end.
    const { initialY, experience, emails } = await walkSectionsAndCapture();

    btn.textContent = "Importing...";

    const profileData = extractProfileFromDOM({ experience, emails });

    // Restore the user's scroll position only AFTER all DOM reads finished.
    window.scrollTo({ top: initialY, behavior: "auto" });

    if (!profileData.name) {
      btn.textContent = "No profile data found";
      btn.disabled = false;
      setTimeout(() => { btn.textContent = "Import Profile"; }, 2000);
      return;
    }

    safeSendMessage(
      {
        action: "importProfileFromPage",
        profileData,
      },
      (response) => {
        if (!response?.success) {
          btn.textContent = response?.error || "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Import Profile";
            btn.style.backgroundColor = "#0a66c2";
            btn.disabled = false;
          }, 3000);
        }
      },
    );
  });

  // Listen for progress from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action !== "importProfilePageProgress") return;
    if (msg.error) {
      btn.textContent = msg.error;
      btn.style.backgroundColor = "#dc2626";
      btn.disabled = false;
      setTimeout(() => {
        btn.textContent = "Import Profile";
        btn.style.backgroundColor = "#0a66c2";
      }, 3000);
      return;
    }
    if (msg.done) {
      btn.style.backgroundColor = "#16a34a";
      btn.style.padding = "0";
      btn.disabled = false;
      btn.innerHTML = "";
      const link = document.createElement("a");
      link.href = msg.slug
        ? `https://agenticleadgen.xyz/contacts/${msg.slug}`
        : "https://agenticleadgen.xyz/contacts";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = msg.status || "Imported!";
      link.style.cssText = `
        color: white;
        text-decoration: none;
        display: block;
        padding: 12px 24px;
        font-size: 15px;
        font-weight: 600;
      `;
      btn.appendChild(link);
      return;
    }
    if (msg.status) {
      btn.textContent = msg.status;
    }
  });

  return btn;
}

/** Transform the import button into a green link to the existing contact's app page. */
function showExistingContactLink(
  btn: HTMLButtonElement,
  contact: { id?: number; slug?: string; firstName?: string; lastName?: string },
) {
  btn.dataset.existingContact = "true";
  btn.style.backgroundColor = "#16a34a";
  btn.style.padding = "0";
  btn.disabled = false;
  btn.innerHTML = "";
  const link = document.createElement("a");
  link.href = contact.slug
    ? `https://agenticleadgen.xyz/contacts/${contact.slug}`
    : contact.id
      ? `https://agenticleadgen.xyz/contacts/${contact.id}`
      : "https://agenticleadgen.xyz/contacts";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  link.textContent = name ? `View: ${name}` : "View Contact";
  link.style.cssText = `
    color: white;
    text-decoration: none;
    display: block;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
  `;
  btn.appendChild(link);
  btn.onmouseenter = null;
  btn.onmouseleave = null;
}

function syncProfileButton() {
  if (!window.location.hostname.includes("linkedin.com")) {
    removeProfileButton();
    return;
  }

  const slug = getProfileSlug();

  if (!slug) {
    if (importProfileBtn) {
      removeProfileButton();
      lastKnownProfileSlug = null;
    }
    return;
  }

  // Skip injecting profile button while post scraping is active —
  // the tab navigates through many /in/ pages and the button is noise.
  chrome.storage.session.get("postScrapingActive", (data) => {
    if (data?.postScrapingActive) {
      removeProfileButton();
      return;
    }
    _doSyncProfileButton(slug);
  });
}

function _doSyncProfileButton(slug: string) {
  if (slug !== lastKnownProfileSlug) {
    removeProfileButton();
    lastKnownProfileSlug = slug;
  }

  if (!document.querySelector(`[${IMPORT_PROFILE_BTN_ATTR}]`)) {
    const btn = createImportProfileButton();
    btn.textContent = "Checking...";
    btn.disabled = true;
    btn.style.backgroundColor = "#6b7280";
    document.body.appendChild(btn);
    importProfileBtn = btn;
    registerInStack(btn, 10);

    const linkedinUrl = window.location.href.split("?")[0];
    safeSendMessage(
      { action: "checkContactByLinkedinUrl", linkedinUrl },
      (response) => {
        if (!document.querySelector(`[${IMPORT_PROFILE_BTN_ATTR}]`)) return;
        if (response?.success && response.contact) {
          showExistingContactLink(btn, response.contact);
        } else {
          btn.textContent = "Import Profile";
          btn.disabled = false;
          btn.style.backgroundColor = "#0a66c2";
        }
      },
    );
  }
}

function observeProfileButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  setTimeout(syncProfileButton, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncProfileButton, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  let lastUrl = window.location.href;
  const urlCheckInterval = setInterval(() => {
    if (teardownIfDead()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      syncProfileButton();
    }
  }, 1000);
  _intervals.push(urlCheckInterval);
}

observeProfileButton();

// ── Job Detail Page Floating Button (Import Opportunity) ───────────

const IMPORT_OPPORTUNITY_BTN_ATTR = "data-lg-import-opportunity-btn";
let importOpportunityBtn: HTMLButtonElement | null = null;
let lastKnownJobId: string | null = null;

function getJobId(): string | null {
  const href = window.location.href;
  if (!href.includes("/jobs/")) return null;

  // Try URL param: ?currentJobId=NNNN
  try {
    const params = new URL(href).searchParams;
    const id = params.get("currentJobId");
    if (id) return id;
  } catch { /* ignore */ }

  // Try path: /jobs/view/NNNN/
  const pathMatch = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
  if (pathMatch) return pathMatch[1];

  return null;
}

function removeOpportunityButton() {
  document.querySelectorAll<HTMLElement>(`[${IMPORT_OPPORTUNITY_BTN_ATTR}]`).forEach((el) => {
    unregisterFromStack(el);
    el.remove();
  });
  importOpportunityBtn = null;
}

/** Extract opportunity data from the job detail pane DOM. */
function extractOpportunityFromDOM(): {
  title: string;
  companyName: string;
  companyLinkedinUrl: string;
  salary: string;
  location: string;
  remoteType: string;
  employmentType: string;
  appliedStatus: string;
  jobUrl: string;
  description: string;
  hiringContact: { name: string; linkedinUrl: string; position: string } | null;
} {
  const jobId = getJobId();
  const jobUrl = jobId
    ? `https://www.linkedin.com/jobs/view/${jobId}/`
    : window.location.href.split("?")[0];

  // ── Company: aria-label sits on a <div> inside the company <a> ──
  const companyDiv = document.querySelector('[aria-label^="Company, "]');
  const outerA =
    (companyDiv?.closest("a") as HTMLAnchorElement | null) ??
    (document.querySelector(
      'a[href*="/company/"][href*="/life/"]',
    ) as HTMLAnchorElement | null);
  let companyName = "";
  let companyLinkedinUrl = "";
  const aria = companyDiv?.getAttribute("aria-label") ?? "";
  const ariaName = aria.replace(/^Company,\s*/, "").replace(/\.$/, "").trim();
  if (ariaName) companyName = ariaName;
  if (!companyName && outerA) {
    const inner =
      outerA.querySelector("a")?.textContent?.trim() ??
      outerA.textContent?.trim() ??
      "";
    if (inner && inner.length < 120) companyName = inner;
  }
  if (outerA?.href) {
    try {
      const u = new URL(outerA.href, window.location.origin);
      const m = u.pathname.match(/^\/company\/([^/]+)/);
      if (m) companyLinkedinUrl = `https://www.linkedin.com/company/${m[1]}/`;
    } catch { /* skip */ }
  }

  // ── Title: DOM walk near the company anchor → document.title → stub ──
  let title = "";
  if (outerA) {
    const container = outerA.parentElement;
    let cursor: Element | null = container;
    for (let hops = 0; hops < 6 && cursor && !title; hops++) {
      const ps = cursor.querySelectorAll("p");
      for (const p of Array.from(ps)) {
        const txt = p.textContent?.trim() ?? "";
        if (txt.length < 5 || txt.length > 300) continue;
        if (txt.includes(" · ")) continue;
        if (/^application status$/i.test(txt)) continue;
        if (/^about the (job|company)$/i.test(txt)) continue;
        if (outerA.contains(p)) continue;
        title = stripVerifiedBadge(txt);
        break;
      }
      cursor = cursor.nextElementSibling ?? cursor.parentElement;
    }
  }
  if (!title && document.title) {
    let t = document.title
      .replace(/^\(\d+\+?\)\s*/, "")
      .replace(/\s*\|\s*LinkedIn\s*$/i, "")
      .trim();
    if (companyName && t.endsWith(` - ${companyName}`)) {
      t = t.slice(0, -(` - ${companyName}`).length).trim();
    }
    title = stripVerifiedBadge(t);
  }
  if (!title && jobId) title = `LinkedIn job ${jobId}`;

  // ── Description: stable componentkey + testid ──
  const aboutJobNode = document.querySelector(
    '[componentkey^="JobDetails_AboutTheJob_"]',
  );
  const descNode = aboutJobNode?.querySelector(
    '[data-testid="expandable-text-box"]',
  ) as HTMLElement | null;
  const description = descNode?.innerText?.trim() || "";

  // ── Location: first <p> with a " · " separator near the top ──
  let location = "";
  const allP = document.querySelectorAll("p");
  for (const p of Array.from(allP)) {
    const txt = p.textContent?.trim() ?? "";
    if (txt.length > 0 && txt.length < 200 && txt.split(/\s·\s/).length >= 2) {
      const first = txt.split(/\s·\s/)[0]?.trim();
      if (first && !/^promoted by hirer/i.test(first)) {
        location = first;
        break;
      }
    }
  }

  // ── Tag chips (Remote / Hybrid / Full-time / etc.) — find <a>s whose
  // href matches the current job and whose text is one of the known chip values.
  let remoteType = "";
  let employmentType = "";
  const chipAnchors = jobId
    ? document.querySelectorAll(`a[href*="/jobs/view/${jobId}"]`)
    : document.querySelectorAll('a[href*="/jobs/view/"]');
  for (const a of Array.from(chipAnchors)) {
    const txt = a.textContent?.trim() ?? "";
    if (!txt || txt.length > 40) continue;
    if (!remoteType && /^(remote|hybrid|on[-\s]?site)$/i.test(txt)) remoteType = txt;
    else if (
      !employmentType &&
      /^(full[-\s]?time|part[-\s]?time|contract|temporary|internship|volunteer)$/i.test(txt)
    )
      employmentType = txt;
    if (remoteType && employmentType) break;
  }

  // ── Salary: scan description for a currency range ──
  let salary = "";
  if (description) {
    const m = description.match(
      /[£€$]\s?\d{1,3}(?:[,\d]{3})*(?:\.\d+)?(?:\s?[kKmM])?\s*[-–—to]+\s*[£€$]?\s?\d{1,3}(?:[,\d]{3})*(?:\.\d+)?(?:\s?[kKmM])?/,
    );
    if (m) salary = m[0].trim();
  }

  // ── Applied status: look for a <p> that says "Application submitted" ──
  let appliedStatus = "";
  for (const p of Array.from(allP)) {
    const txt = p.textContent?.trim() ?? "";
    if (/^application (submitted|sent|received)$/i.test(txt)) {
      appliedStatus = txt;
      break;
    }
  }

  // ── Hiring contact: look inside the PeopleWhoCanHelp SDUI section ──
  let hiringContact: { name: string; linkedinUrl: string; position: string } | null = null;
  const peopleSection =
    document.querySelector(
      '[componentkey^="JobDetailsPeopleWhoCanHelpSlot_"]',
    ) ??
    document.querySelector(
      '[data-sdui-component*="peopleWhoCanHelp"]',
    );
  if (peopleSection) {
    const profileLink = peopleSection.querySelector<HTMLAnchorElement>(
      'a[href*="/in/"]',
    );
    if (profileLink?.href) {
      let contactLinkedinUrl = "";
      try {
        const u = new URL(profileLink.href, window.location.origin);
        const m = u.pathname.match(/^\/in\/([^/]+)/);
        if (m) contactLinkedinUrl = `https://www.linkedin.com/in/${m[1]}/`;
      } catch { /* skip */ }
      const aria = profileLink.getAttribute("aria-label")?.trim() || "";
      const text = profileLink.textContent?.trim() || "";
      const contactName = (aria || text).split("\n")[0].trim();
      if (contactName) {
        hiringContact = { name: contactName, linkedinUrl: contactLinkedinUrl, position: "" };
      }
    }
  }

  console.debug("[lg-import-opp]", {
    url: window.location.href,
    jobId,
    title,
    companyName,
    location,
    remoteType,
    employmentType,
    hasDesc: !!description,
  });

  return {
    title,
    companyName,
    companyLinkedinUrl,
    salary,
    location,
    remoteType,
    employmentType,
    appliedStatus,
    jobUrl,
    description,
    hiringContact,
  };
}

function showExistingOpportunityLink(
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

function createImportOpportunityButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(IMPORT_OPPORTUNITY_BTN_ATTR, "true");
  btn.textContent = "Import Opportunity";
  btn.title = "Import this job opportunity into the pipeline";
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
    if (btn.dataset.existingOpportunity) return;

    e.preventDefault();
    e.stopPropagation();

    const oppData = extractOpportunityFromDOM();
    if (!oppData.title) {
      btn.textContent = "No job data found";
      setTimeout(() => { btn.textContent = "Import Opportunity"; }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Importing...";

    safeSendMessage(
      { action: "importOpportunityFromPage", opportunityData: oppData },
      (response) => {
        if (!response?.success) {
          btn.textContent = response?.error || "Error";
          btn.style.backgroundColor = "#dc2626";
          setTimeout(() => {
            btn.textContent = "Import Opportunity";
            btn.style.backgroundColor = "#0a66c2";
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
        btn.textContent = "Import Opportunity";
        btn.style.backgroundColor = "#0a66c2";
      }, 3000);
      return;
    }
    if (msg.done) {
      showExistingOpportunityLink(btn, { id: msg.opportunityId, title: msg.title });
      return;
    }
    if (msg.status) {
      btn.textContent = msg.status;
    }
  });

  return btn;
}

function syncOpportunityButton() {
  if (!window.location.hostname.includes("linkedin.com")) {
    removeOpportunityButton();
    return;
  }

  const jobId = getJobId();

  if (!jobId) {
    if (importOpportunityBtn) {
      removeOpportunityButton();
      lastKnownJobId = null;
    }
    return;
  }

  if (jobId !== lastKnownJobId) {
    removeOpportunityButton();
    lastKnownJobId = jobId;
  }

  if (!document.querySelector(`[${IMPORT_OPPORTUNITY_BTN_ATTR}]`)) {
    const btn = createImportOpportunityButton();
    btn.textContent = "Checking...";
    btn.disabled = true;
    btn.style.backgroundColor = "#6b7280";
    document.body.appendChild(btn);
    importOpportunityBtn = btn;
    registerInStack(btn, 10);

    const canonicalUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;
    safeSendMessage(
      { action: "checkOpportunityByUrl", url: canonicalUrl },
      (response) => {
        if (!document.querySelector(`[${IMPORT_OPPORTUNITY_BTN_ATTR}]`)) return;
        // Surface backend errors instead of silently falling through.
        if (response && response.success === false && response.error) {
          showErrorToast(`CheckOpportunityByUrl failed: ${response.error}`);
          btn.textContent = "Check failed — retry";
          btn.disabled = false;
          btn.style.backgroundColor = "#dc2626";
          return;
        }
        if (response?.success && response.opportunity) {
          showExistingOpportunityLink(btn, response.opportunity);
        } else {
          btn.textContent = "Import Opportunity";
          btn.disabled = false;
          btn.style.backgroundColor = "#0a66c2";
        }
      },
    );
  }
}

function observeOpportunityButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  setTimeout(syncOpportunityButton, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncOpportunityButton, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);

  let lastUrl = window.location.href;
  const urlCheckInterval = setInterval(() => {
    if (teardownIfDead()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      syncOpportunityButton();
    }
  }, 1000);
  _intervals.push(urlCheckInterval);
}

observeOpportunityButton();

function clickSalaryMetadata() {
  document.querySelectorAll(".job-card-container").forEach((jobCard) => {
    const metadataUls = jobCard.querySelectorAll(
      "ul.job-card-container__metadata-wrapper",
    );
    if (metadataUls.length < 2) return;
    const salaryUl = metadataUls[1] as HTMLElement;
    if (salaryUl.hasAttribute("data-lg-salary-highlight")) return;
    salaryUl.setAttribute("data-lg-salary-highlight", "true");
  });
}

// Extract company data from job cards on the current page
function extractCompaniesFromJobCards(): Array<{ name: string; linkedin_url: string }> {
  const companyMap = new Map<string, { name: string; linkedin_url: string }>();

  const cardRoots = new Set<Element>();
  document
    .querySelectorAll(
      ".job-card-container, [data-occludable-job-id], li[data-job-id], div[data-job-id]",
    )
    .forEach((el) => {
      const root =
        el.closest(".job-card-container") ||
        el.closest("[data-occludable-job-id]") ||
        el.closest("[data-job-id]") ||
        el;
      cardRoots.add(root);
    });

  cardRoots.forEach((card) => {
    const subtitleEl = card.querySelector(
      ".artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .artdeco-entity-lockup__caption, .job-card-container__company-name",
    );
    // Fall back to any /company/ anchor anywhere in the card so we still
    // capture the company even when subtitle classes drift.
    const companyLink =
      (subtitleEl?.querySelector('a[href*="/company/"]') as HTMLAnchorElement | null) ||
      (card.querySelector('a[href*="/company/"]') as HTMLAnchorElement | null);

    const raw = subtitleEl?.textContent?.trim() ?? companyLink?.textContent?.trim() ?? "";
    const name = raw.split(/\s*·\s*/)[0].trim();
    if (!name) return;

    let linkedin_url = "";
    if (companyLink) {
      try {
        const url = new URL(companyLink.href, window.location.origin);
        const match = url.pathname.match(/^\/company\/([^/]+)/);
        if (match) {
          linkedin_url = `https://www.linkedin.com/company/${match[1]}/`;
        }
      } catch { /* skip malformed */ }
    }

    const key = linkedin_url || name.toLowerCase();
    if (!companyMap.has(key)) {
      companyMap.set(key, { name, linkedin_url });
    }
  });

  return Array.from(companyMap.values());
}

// Extract company authors from feed posts on the current page
function extractCompaniesFromFeedPosts(): Array<{ name: string; linkedin_url: string }> {
  const companyMap = new Map<string, { name: string; linkedin_url: string }>();

  document.querySelectorAll(".feed-shared-update-v2, .occludable-update").forEach((post) => {
    const actorLink = post.querySelector<HTMLAnchorElement>(
      '.update-components-actor__title a[href*="/company/"], .feed-shared-actor__title a[href*="/company/"]',
    );
    if (!actorLink) return;

    let linkedin_url = "";
    try {
      const url = new URL(actorLink.href);
      const match = url.pathname.match(/^\/company\/([^/]+)/);
      if (match) {
        linkedin_url = `https://www.linkedin.com/company/${match[1]}/`;
      }
    } catch { /* skip malformed */ }
    if (!linkedin_url) return;

    const nameEl = actorLink.querySelector("span[aria-hidden='true']");
    const name =
      nameEl?.textContent?.trim() ||
      (actorLink.textContent?.trim() ?? "").replace(/\s*\(opens[^)]*\)/i, "").trim() ||
      "";
    if (!name || companyMap.has(linkedin_url)) return;

    companyMap.set(linkedin_url, { name, linkedin_url });
  });

  return Array.from(companyMap.values());
}

// Extract parent companies from product cards on /search/results/products/*.
// LinkedIn's product search lists products grouped under the company that
// publishes them; we want the company, not the product.
export type ProductCardRow = {
  name: string;
  linkedin_url?: string;  // set when wrapper anchor is /company/<slug>
  product_url?: string;   // set when wrapper anchor is /products/<slug>
  company_name?: string;  // extracted from "By: <Company>" text on product cards
};

function extractCompaniesFromProductCards(): Array<ProductCardRow> {
  // Dedup by whichever URL we found — a row is uniquely identified by its
  // company URL OR its product URL.
  const byKey = new Map<string, ProductCardRow>();

  const emit = (row: ProductCardRow) => {
    const key = row.linkedin_url ?? row.product_url ?? "";
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, row);
  };

  // ── Primary: stable signals from the new product-search DOM ──
  // Each card is a wrapper <a componentkey="..." href="...">
  //   <div role="listitem" aria-label="View page <Name>">...</div>
  // </a>
  // The wrapper href is either /company/<slug>/ (host-direct) or
  // /products/<slug>/ (the dominant case; resolved to a company in Phase 2).
  const cards = document.querySelectorAll<HTMLElement>(
    'div[role="listitem"][aria-label^="View page "]',
  );

  cards.forEach((card) => {
    const aria = card.getAttribute("aria-label") ?? "";
    const name = aria.replace(/^View page\s+/, "").trim();
    if (!name) return;

    const wrapper = card.closest<HTMLAnchorElement>("a[href]");
    const href = wrapper?.getAttribute("href") ?? "";
    if (!href) return;

    let pathname = "";
    try {
      pathname = new URL(href, window.location.origin).pathname;
    } catch {
      return;
    }

    const companyMatch = pathname.match(/^\/company\/([^/]+)/);
    if (companyMatch) {
      emit({
        name,
        linkedin_url: `https://www.linkedin.com/company/${companyMatch[1]}/`,
      });
      return;
    }

    const productMatch = pathname.match(/^\/products\/([^/]+)/);
    if (productMatch) {
      // Also extract the "By: <Company>" name from the product card
      let company_name: string | undefined;
      const cardContainer = card.closest('[componentkey]');
      if (cardContainer) {
        const byTexts = cardContainer.querySelectorAll<HTMLElement>('p');
        for (const p of Array.from(byTexts)) {
          const txt = p.textContent?.trim() ?? '';
          const byMatch = txt.match(/^By:\s+(.+)/);
          if (byMatch) {
            company_name = byMatch[1].trim();
            break;
          }
        }
      }
      emit({
        name,
        product_url: `https://www.linkedin.com/products/${productMatch[1]}/`,
        company_name,
      });
    }
  });

  // ── Fallback: legacy DOM (classnames pre-rotation) ──
  // Only runs if the new selector found nothing — defense-in-depth for any
  // page variant LinkedIn might still serve. Captures /company/ links only;
  // legacy DOM didn't surface /products/ at this layer.
  if (byKey.size === 0) {
    const main = document.querySelector("main") ?? document.body;
    main
      .querySelectorAll<HTMLAnchorElement>('a[href*="/company/"]')
      .forEach((anchor) => {
        try {
          const url = new URL(anchor.href, window.location.origin);
          const m = url.pathname.match(/^\/company\/([^/]+)/);
          if (!m) return;
          const linkedin_url = `https://www.linkedin.com/company/${m[1]}/`;
          const aria = anchor.getAttribute("aria-label") ?? "";
          const raw =
            anchor.querySelector("span[aria-hidden='true']")?.textContent?.trim() ||
            anchor.textContent?.trim() ||
            aria.replace(/\s*\(opens[^)]*\)/i, "").trim() ||
            "";
          const name = raw.split(/\s*·\s*/)[0].trim();
          if (!name) return;
          emit({ name, linkedin_url });
        } catch {
          // skip
        }
      });
  }

  return Array.from(byKey.values());
}

// Pagination helpers for /search/results/products/* — LinkedIn's product
// search uses obfuscated classnames but stable testids:
//   ul[data-testid="pagination-controls-list"]
//   button[aria-label="Page N"] aria-current="true|false"
//   button[data-testid="pagination-controls-next-button-visible"|"-hidden"]
// There is no "Page X of Y" text, and only ~10 page buttons render at a time
// (the window slides as you advance), so totalPages is approximate.
function getProductSearchPaginationInfo(): {
  currentPage: number;
  maxVisiblePage: number;
  hasNext: boolean;
} | null {
  const list =
    document.querySelector('ul[data-testid="pagination-controls-list"]') ??
    document.querySelector(".artdeco-pagination__indicator")?.closest("ul") ??
    null;
  if (!list) return null;

  const buttons = list.querySelectorAll<HTMLButtonElement>(
    'button[aria-label^="Page "]',
  );
  if (buttons.length === 0) return null;

  let currentPage = 1;
  let maxVisiblePage = 1;
  buttons.forEach((b) => {
    const m = b.getAttribute("aria-label")?.match(/Page\s+(\d+)/i);
    if (!m) return;
    const n = parseInt(m[1], 10);
    if (n > maxVisiblePage) maxVisiblePage = n;
    if (b.getAttribute("aria-current") === "true") currentPage = n;
  });

  const nextVisible = document.querySelector<HTMLButtonElement>(
    'button[data-testid="pagination-controls-next-button-visible"]',
  );
  const hasNext =
    !!nextVisible && !nextVisible.disabled;

  return { currentPage, maxVisiblePage, hasNext };
}

// Click the visible "next" button (preferred — works regardless of how many
// page numbers are currently rendered). Falls back to a numbered page button
// if the next-button isn't found, then to the legacy artdeco selectors.
async function clickProductSearchNext(
  expectedNextPage: number,
): Promise<{ ok: true } | { ok: false; reason: "no-button" | "timeout" }> {
  let target =
    document.querySelector<HTMLButtonElement>(
      'button[data-testid="pagination-controls-next-button-visible"]',
    ) ?? null;

  if (!target) {
    const list = document.querySelector(
      'ul[data-testid="pagination-controls-list"]',
    );
    target =
      list?.querySelector<HTMLButtonElement>(
        `button[aria-label="Page ${expectedNextPage}"]`,
      ) ?? null;
  }

  if (!target) {
    target = document.querySelector<HTMLButtonElement>(
      'button.artdeco-pagination__button--next, button[aria-label="Next"]',
    );
  }

  if (!target || target.disabled) return { ok: false, reason: "no-button" };

  target.scrollIntoView({ block: "center" });
  target.click();

  // Jittered polls — LinkedIn fingerprints constant timing.
  const jitter = (base: number) => base + Math.floor(Math.random() * base * 0.4);
  let attempts = 0;
  const maxAttempts = 15;
  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, jitter(900)));
    const info = getProductSearchPaginationInfo();
    if (info && info.currentPage === expectedNextPage) {
      await new Promise((r) => setTimeout(r, jitter(1100)));
      return { ok: true };
    }
    attempts++;
  }
  return { ok: false, reason: "timeout" };
}

// Function to extract job data including salary
async function extractJobData() {
  // Detect the page type
  const isLinkedIn = window.location.hostname.includes("linkedin.com");

  // Check if we're on Google search results
  const isGoogleSearch =
    window.location.hostname.includes("google.com") &&
    window.location.pathname.includes("/search");

  const genericJobsCount = document.querySelectorAll(
    '[data-provides="search-result"]',
  ).length;

  if (isGoogleSearch) return [];

  if (genericJobsCount > 0) {
    return extractGenericJobData();
  } else if (isLinkedIn) {
    // Single-job detail pages (URL rewritten when a search card is clicked).
    if (window.location.pathname.startsWith("/jobs/view/")) {
      const detail = await extractLinkedInJobDetailPage();
      if (detail.length > 0) return detail;
      // Fall through to card scraper if the detail panel isn't present
      // (e.g. search sidebar still mounted with cards).
    }
    const result = await extractLinkedInJobData();
    return result.jobs;
  }

  return [];
}

// Poll for the AboutTheJob component; LinkedIn's SPA renders the panel async.
async function waitForAboutJobNode(timeoutMs = 5000): Promise<Element | null> {
  const intervalMs = 250;
  const tries = Math.ceil(timeoutMs / intervalMs);
  for (let i = 0; i < tries; i++) {
    const node = document.querySelector('[componentkey^="JobDetails_AboutTheJob_"]');
    if (node) return node;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return document.querySelector('[componentkey^="JobDetails_AboutTheJob_"]');
}

// Walk from the company anchor's container to the next sibling <p> with
// substantial text and no " · " separators — that's the title.
function findTitleNearCompany(outerA: Element | null): string | null {
  if (!outerA) return null;
  const container = outerA.parentElement;
  if (!container) return null;
  // Search forward through siblings (and their descendants) for a candidate <p>.
  let cursor: Element | null = container;
  for (let hops = 0; hops < 6 && cursor; hops++) {
    const ps = cursor.querySelectorAll("p");
    for (const p of Array.from(ps)) {
      const txt = p.textContent?.trim() ?? "";
      if (txt.length < 5 || txt.length > 300) continue;
      if (txt.includes(" · ")) continue;
      if (/^application status$/i.test(txt)) continue;
      if (/^about the (job|company)$/i.test(txt)) continue;
      // Skip the company-name <p> which sits inside the company anchor block.
      if (outerA.contains(p)) continue;
      return txt;
    }
    cursor = cursor.nextElementSibling ?? cursor.parentElement;
  }
  return null;
}

// Extract a single job from the /jobs/view/{id} detail panel.
// LinkedIn's CSS classes are hashed; we anchor to stable hooks:
//   - componentkey="JobDetails_AboutTheJob_<jobId>"
//   - data-testid="expandable-text-box"
//   - aria-label="Company, <name>." (on a <div> inside the company <a>)
async function extractLinkedInJobDetailPage() {
  const idMatch = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
  if (!idMatch) return [];
  const jobId = idMatch[1];

  const aboutJobNode = await waitForAboutJobNode(5000);

  // Company: the aria-label sits on a <div> inside the company <a>.
  const companyDiv = document.querySelector('[aria-label^="Company, "]');
  const outerA =
    (companyDiv?.closest("a") as HTMLAnchorElement | null) ??
    (document.querySelector(
      'a[href*="/company/"][href*="/life/"]',
    ) as HTMLAnchorElement | null);
  const companyLinkedinUrl = outerA?.href || null;
  const aria = companyDiv?.getAttribute("aria-label") ?? "";
  let company = aria.replace(/^Company,\s*/, "").replace(/\.$/, "").trim() || null;
  if (!company && outerA) {
    const innerText =
      outerA.querySelector("a")?.textContent?.trim() ??
      outerA.textContent?.trim() ??
      "";
    if (innerText && innerText.length < 120) company = innerText;
  }

  // Title: prefer DOM walk near the company anchor, else document.title, else stub.
  let title: string | null = findTitleNearCompany(outerA);
  if (!title && document.title) {
    let t = document.title
      .replace(/^\(\d+\+?\)\s*/, "") // strip "(99+) " notification prefix
      .replace(/\s*\|\s*LinkedIn\s*$/i, "")
      .trim();
    if (company && t.endsWith(` - ${company}`)) {
      t = t.slice(0, -(` - ${company}`).length).trim();
    }
    title = t || null;
  }
  if (!title) title = `LinkedIn job ${jobId}`;

  // Description: stable componentkey + testid.
  const descNode = aboutJobNode?.querySelector(
    '[data-testid="expandable-text-box"]',
  ) as HTMLElement | null;
  const description = descNode?.innerText?.trim() || null;

  // Location: first <p> with two " · " separators near the top of the panel.
  let location: string | null = null;
  const allP = document.querySelectorAll("p");
  for (const p of Array.from(allP)) {
    const txt = p.textContent?.trim() ?? "";
    if (txt.length > 0 && txt.length < 200 && txt.split(/\s·\s/).length >= 2) {
      const first = txt.split(/\s·\s/)[0]?.trim();
      if (first && !/^promoted by hirer/i.test(first)) {
        location = first;
        break;
      }
    }
  }

  // Salary: scan description for a currency range.
  let salary: string | null = null;
  if (description) {
    const m = description.match(
      /[£€$]\s?\d{1,3}(?:[,\d]{3})*(?:\.\d+)?(?:\s?[kKmM])?\s*[-–—to]+\s*[£€$]?\s?\d{1,3}(?:[,\d]{3})*(?:\.\d+)?(?:\s?[kKmM])?/,
    );
    if (m) salary = m[0].trim();
  }

  console.debug("[lg-detail-scraper]", {
    url: window.location.href,
    jobId,
    title,
    company,
    location,
    hasDesc: !!description,
  });

  return [
    {
      title,
      company: company ?? "",
      url: `https://www.linkedin.com/jobs/view/${jobId}/`,
      companyLinkedinUrl,
      location,
      salary,
      description,
      archived: false,
    },
  ];
}

// Voyager enrichment shape returned by the background `getVoyagerJobDetail`
// handler. Mirrors the trimmed fields it dispatches; everything is nullable
// because LinkedIn omits some on closed/expired/archived postings.
interface VoyagerEnrichment {
  postedAt: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
  applicantCount: number | null;
  externalApplyUrl: string | null;
  voyagerUrn: string | null;
  state: string | null;
  easyApply: boolean | null;
  formattedSalary: string | null;
  fullDescription: string | null;
}

// Bridge: content scripts can't reach the JSESSIONID cookie via chrome.cookies,
// so we proxy the Voyager call through the background service worker. Returns
// null on any failure (no throws) so callers fall through to the DOM scrape.
function fetchVoyagerEnrichment(
  jobPostingId: string,
): Promise<VoyagerEnrichment | null> {
  return new Promise((resolve) => {
    safeSendMessage(
      { action: "getVoyagerJobDetail", jobPostingId },
      (response) => {
        if (response?.ok && response.enrichment) {
          resolve(response.enrichment as VoyagerEnrichment);
        } else {
          resolve(null);
        }
      },
    );
  });
}

// Extract LinkedIn job data
async function extractLinkedInJobData() {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // LinkedIn rotates class names; pin to stable hooks (`data-job-id` /
  // `data-occludable-job-id`) and the `/jobs/view/` URL pattern, with
  // class-based selectors as fast paths.
  const cardRoots = new Set<Element>();
  document
    .querySelectorAll(
      ".job-card-container, [data-occludable-job-id], li[data-job-id], div[data-job-id]",
    )
    .forEach((el) => {
      const root =
        el.closest(".job-card-container") ||
        el.closest("[data-occludable-job-id]") ||
        el.closest("[data-job-id]") ||
        el;
      cardRoots.add(root);
    });

  const jobs: any[] = [];
  let skippedNoTitle = 0;
  let skippedNoUrl = 0;
  let descriptionsCaptured = 0;
  let voyagerEnriched = 0;
  let voyagerFailed = 0;
  // Per-page circuit breaker: 3 consecutive failures and we stop calling
  // Voyager for the rest of this page (DOM-fallback only). Resets next page.
  let voyagerConsecutiveFails = 0;
  let voyagerDisabled = false;

  // Read the description from the right-hand detail pane. LinkedIn renders
  // it under a stable `[data-testid="expandable-text-box"]` selector — the
  // same one the single-post detail-page scraper uses (~L2776).
  const readDetailDescription = (): string | null => {
    const node = document.querySelector<HTMLElement>(
      '[data-testid="expandable-text-box"]',
    );
    const txt = node?.innerText?.trim() ?? "";
    return txt.length > 0 ? txt : null;
  };

  // Wait for the detail pane to reflect the clicked card. We can't reliably
  // bind a description back to a card from the DOM alone, so we detect a
  // change relative to the previous card's description text.
  const waitForDetailUpdate = async (
    previous: string | null,
    timeoutMs = 2500,
  ): Promise<string | null> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const current = readDetailDescription();
      if (current && current !== previous && current.length >= 40) {
        return current;
      }
      await sleep(120);
    }
    return readDetailDescription();
  };

  let lastDescription: string | null = readDetailDescription();

  for (const jobCard of cardRoots) {
    const titleAnchor = jobCard.querySelector<HTMLAnchorElement>(
      'a.job-card-list__title--link, a.job-card-container__link, a[href*="/jobs/view/"]',
    );
    if (!titleAnchor) {
      skippedNoTitle++;
      continue;
    }

    const rawTitle =
      titleAnchor
        .querySelector("span[aria-hidden='true']")
        ?.textContent?.trim() ||
      titleAnchor.textContent?.trim() ||
      titleAnchor.getAttribute("aria-label")?.trim() ||
      "";
    const title = stripVerifiedBadge(rawTitle);
    if (!title) {
      skippedNoTitle++;
      continue;
    }

    let url = "";
    try {
      const u = new URL(titleAnchor.href, window.location.origin);
      url = u.origin + u.pathname; // drop query/fragment so dedup works
    } catch {
      url = titleAnchor.href || "";
    }
    if (!url) {
      skippedNoUrl++;
      continue;
    }

    const jobPostingId = url.match(/\/jobs\/view\/(\d+)/)?.[1] ?? null;

    const companyEl = jobCard.querySelector(
      ".artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .artdeco-entity-lockup__caption, .job-card-container__company-name",
    );
    const companyRaw = companyEl?.textContent?.trim() ?? "";
    const company = companyRaw.split(/\s*·\s*/)[0].trim();

    const metadataUls = jobCard.querySelectorAll(
      "ul.job-card-container__metadata-wrapper",
    );

    const isArchived =
      jobCard.querySelector(".job-card-container__footer-item--closed") !==
        null ||
      jobCard.querySelector('[data-control-name*="closed"]') !== null ||
      jobCard.textContent?.includes("No longer accepting applications") ||
      jobCard.classList.contains("job-card-container--closed");

    // Voyager-first: fetch authoritative posting detail via the background
    // bridge. On success we get a richer fullDescription PLUS 10 typed fields
    // the DOM doesn't expose (posted_at, workplace_type, applicant_count, …).
    // On failure we fall through to clicking the card and reading the panel.
    let enrichment: VoyagerEnrichment | null = null;
    if (jobPostingId && !voyagerDisabled) {
      enrichment = await fetchVoyagerEnrichment(jobPostingId);
      if (enrichment) {
        voyagerEnriched++;
        voyagerConsecutiveFails = 0;
      } else {
        voyagerFailed++;
        voyagerConsecutiveFails++;
        if (voyagerConsecutiveFails >= 3) voyagerDisabled = true;
      }
    }

    let description: string | null = enrichment?.fullDescription ?? null;
    if (!description) {
      // Fallback path — click the card to swap the right-pane detail view,
      // then read its description. If the pane never updates (LinkedIn stall,
      // captcha, archived job with no body), keep moving with description=null.
      try {
        const clickable =
          jobCard.querySelector<HTMLElement>(
            'a.job-card-list__title--link, a.job-card-container__link',
          ) ?? titleAnchor;
        clickable.click();
        description = await waitForDetailUpdate(lastDescription);
      } catch (err) {
        console.debug("[CS] extractLinkedInJobData: click/desc failed", err);
      }
    }
    if (description) {
      lastDescription = description;
      descriptionsCaptured++;
    }

    const jobData: any = {
      title,
      company,
      url,
      archived: isArchived,
      description,
    };
    if (metadataUls[0]) jobData.location = metadataUls[0].textContent?.trim();
    // Voyager's formattedSalary is cleaner than the card's `Base salary` text;
    // prefer it when present, otherwise fall back to the DOM string.
    const domSalary = metadataUls[1]?.textContent?.trim() ?? null;
    jobData.salary = enrichment?.formattedSalary ?? domSalary ?? null;

    if (enrichment) {
      jobData.postedAt = enrichment.postedAt;
      jobData.workplaceType = enrichment.workplaceType;
      jobData.employmentType = enrichment.employmentType;
      jobData.experienceLevel = enrichment.experienceLevel;
      jobData.applicantCount = enrichment.applicantCount;
      jobData.externalApplyUrl = enrichment.externalApplyUrl;
      jobData.voyagerUrn = enrichment.voyagerUrn;
      jobData.state = enrichment.state;
      jobData.easyApply = enrichment.easyApply;
      jobData.formattedSalary = enrichment.formattedSalary;
    }

    jobs.push(jobData);

    // Voyager-served cards skipped the click; give LinkedIn more breathing
    // room (500ms ± 150ms jitter). DOM-fallback already paid the click-wait.
    await sleep(enrichment ? 500 + Math.floor(Math.random() * 150) : 250);
  }

  return {
    jobs,
    counters: {
      cardsSeen: cardRoots.size,
      extracted: jobs.length,
      skippedNoTitle,
      skippedNoUrl,
      descriptionsCaptured,
      voyagerEnriched,
      voyagerFailed,
    },
  };
}

// Function to get LinkedIn pagination info
function getLinkedInPaginationInfo() {
  const paginationState = document.querySelector(
    ".jobs-search-pagination__page-state",
  );
  if (!paginationState) return null;

  const text = paginationState.textContent?.trim() || "";
  const match = text.match(/Page (\d+) of (\d+)/);

  if (!match) return null;

  return {
    currentPage: parseInt(match[1]),
    totalPages: parseInt(match[2]),
  };
}

type ClickPageResult =
  | { ok: true }
  | { ok: false; reason: "no-button" | "timeout" };

async function clickLinkedInPageNumber(pageNumber: number): Promise<ClickPageResult> {
  const pageButtons = document.querySelectorAll(
    ".jobs-search-pagination__indicator button",
  );

  let targetButton: HTMLButtonElement | null = null;

  for (const button of Array.from(pageButtons)) {
    const ariaLabel = button.getAttribute("aria-label");
    if (ariaLabel === `Page ${pageNumber}`) {
      targetButton = button as HTMLButtonElement;
      break;
    }
  }

  if (!targetButton) {
    const nextButton = document.querySelector(
      'button[aria-label="View next page"]',
    ) as HTMLButtonElement;

    if (!nextButton || nextButton.disabled) {
      return { ok: false, reason: "no-button" };
    }

    targetButton = nextButton;
  }

  targetButton.click();

  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const paginationInfo = getLinkedInPaginationInfo();
    if (paginationInfo && paginationInfo.currentPage === pageNumber) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { ok: true };
    }

    attempts++;
  }

  return { ok: false, reason: "timeout" };
}

// Extract generic job board data (Greenhouse, Wellfound, etc.)
function extractGenericJobData() {
  const jobCards = document.querySelectorAll('[data-provides="search-result"]');
  const jobs: any[] = [];

  jobCards.forEach((jobCard) => {
    const titleElement = jobCard.querySelector(".section-title");
    const companyElement = jobCard.querySelector(".company-logo + .flex .body");
    const locationTags = jobCard.querySelectorAll(".tag-text");
    const linkElement = jobCard.querySelector('a[href*="job"]');
    const dateElement = jobCard.querySelector(".body__secondary");

    // Check if job is archived/closed
    const isArchived =
      jobCard.querySelector('[data-archived="true"]') !== null ||
      jobCard.textContent?.includes("No longer accepting") ||
      jobCard.textContent?.includes("Position closed") ||
      jobCard.classList.contains("closed") ||
      jobCard.classList.contains("archived");

    const jobData: any = {
      title: titleElement?.textContent?.trim(),
      company: companyElement?.textContent?.trim(),
      url: (linkElement as HTMLAnchorElement)?.href,
      location: Array.from(locationTags)
        .map((tag) => tag.textContent?.trim())
        .filter(Boolean)
        .join(", "),
      postedDate: dateElement?.textContent?.trim(),
      archived: isArchived,
    };

    if (jobData.title) {
      jobs.push(jobData);
    }
  });
  return jobs;
}

// Function to click the second job post
function clickSecondJobPost() {
  const jobCards = document.querySelectorAll(".job-card-container");

  if (jobCards.length >= 2) {
    const secondJobCard = jobCards[1];
    const link = secondJobCard.querySelector(
      ".job-card-list__title--link",
    ) as HTMLElement;

    if (link) {
      link.click();
      return { success: true, title: link.textContent?.trim() };
    }
  }

  return { success: false, error: "Second job post not found" };
}

// Listen for messages from popup — only respond on relevant sites
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isExtensionAlive()) return false;
  if (message.action === "ping") {
    sendResponse({ ok: true });
    return true;
  }

  // Guard: only handle job-related messages on supported sites
  const hostname = window.location.hostname;
  const isSupportedSite =
    hostname.includes("linkedin.com") ||
    hostname.includes("google.com");

  if (!isSupportedSite) return false;

  if (message.action === "extractJobs") {
    extractJobData().then((jobs) => sendResponse({ jobs }));
    return true; // keep the message channel open for async sendResponse
  }

  if (message.action === "extractJobsWithPagination") {
    (async () => {
      try {
        const allJobs: any[] = [];
        const companyMap = new Map<string, { name: string; linkedin_url: string }>();
        const pageFailures: Array<{
          page: number;
          reason: "click-no-button" | "click-timeout" | "empty-extraction";
        }> = [];
        const paginationInfo = getLinkedInPaginationInfo();

        if (!paginationInfo) {
          sendResponse({
            success: false,
            error:
              "No pagination found. Are you on a LinkedIn jobs search page?",
          });
          return;
        }

        const { currentPage, totalPages } = paginationInfo;
        const startPage = currentPage;
        let actualPagesScraped = 0;

        // Re-extract once on empty result — LinkedIn occasionally renders the
        // pagination chrome before the cards mount.
        const extractWithRetry = async (page: number, attempt: number) => {
          let result = await extractLinkedInJobData();
          if (result.jobs.length === 0 && totalPages > 1) {
            console.warn(
              `[CS] page ${page} attempt ${attempt}: 0 jobs extracted, retrying after 1.5s`,
            );
            await new Promise((r) => setTimeout(r, 1500));
            result = await extractLinkedInJobData();
          }
          return result;
        };

        const flushPage = (
          pageNumber: number,
          jobs: any[],
          companies: ReturnType<typeof extractCompaniesFromJobCards>,
          counters: Awaited<ReturnType<typeof extractLinkedInJobData>>["counters"],
          attempt: number,
        ) => {
          safeSendMessage({
            action: "savePageBatch",
            pageNumber,
            totalPages,
            jobs,
            companies,
            counters,
            attempt,
          });
          safeSendMessage({
            action: "paginationProgress",
            currentPage: pageNumber,
            totalPages,
            jobsCollected: allJobs.length,
          });
        };

        const startResult = await extractWithRetry(startPage, 1);
        const currentCompanies = extractCompaniesFromJobCards();
        allJobs.push(...startResult.jobs);
        currentCompanies.forEach((c) => {
          const key = c.linkedin_url || c.name.toLowerCase();
          if (!companyMap.has(key)) companyMap.set(key, c);
        });
        actualPagesScraped++;
        if (startResult.jobs.length === 0 && totalPages > 1) {
          pageFailures.push({ page: startPage, reason: "empty-extraction" });
        }
        flushPage(
          startPage,
          startResult.jobs,
          currentCompanies,
          startResult.counters,
          1,
        );

        for (let page = startPage + 1; page <= totalPages; page++) {
          let click = await clickLinkedInPageNumber(page);
          if (!click.ok) {
            console.warn(
              `[CS] clickLinkedInPageNumber(${page}) failed: ${click.reason}, retrying once`,
            );
            await new Promise((r) => setTimeout(r, 1500));
            click = await clickLinkedInPageNumber(page);
          }
          if (!click.ok) {
            pageFailures.push({
              page,
              reason: click.reason === "no-button" ? "click-no-button" : "click-timeout",
            });
            // Pagination is broken — continuing wastes requests on the same DOM.
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));

          const pageResult = await extractWithRetry(page, 1);
          const pageCompanies = extractCompaniesFromJobCards();
          allJobs.push(...pageResult.jobs);
          pageCompanies.forEach((c) => {
            const key = c.linkedin_url || c.name.toLowerCase();
            if (!companyMap.has(key)) companyMap.set(key, c);
          });

          actualPagesScraped++;
          if (pageResult.jobs.length === 0) {
            pageFailures.push({ page, reason: "empty-extraction" });
          }
          flushPage(
            page,
            pageResult.jobs,
            pageCompanies,
            pageResult.counters,
            1,
          );
        }

        sendResponse({
          success: true,
          jobs: allJobs,
          companies: Array.from(companyMap.values()),
          totalPages,
          pagesScraped: actualPagesScraped,
          pageFailures,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
    return true;
  }

  if (message.action === "getPaginationInfo") {
    const paginationInfo = getLinkedInPaginationInfo();
    sendResponse({ paginationInfo });
    return true;
  }

  if (message.action === "getProductSearchPaginationInfo") {
    const info = getProductSearchPaginationInfo();
    const paginationInfo = info
      ? {
          currentPage: info.currentPage,
          totalPages: info.maxVisiblePage,
          hasNext: info.hasNext,
        }
      : null;
    sendResponse({ paginationInfo });
    return true;
  }

  if (message.action === "extractCompaniesFromProductsWithPagination") {
    (async () => {
      try {
        const seen = new Map<string, ProductCardRow>();
        const pageFailures: Array<{
          page: number;
          reason: "click-no-button" | "click-timeout" | "empty-extraction";
        }> = [];

        const SAFETY_CAP = 200;

        const extractWithRetry = async () => {
          // Scroll to bottom — product search lazy-mounts cards on view.
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise((r) => setTimeout(r, 1200));
          let companies = extractCompaniesFromProductCards();
          if (companies.length === 0) {
            await new Promise((r) => setTimeout(r, 1500));
            companies = extractCompaniesFromProductCards();
          }
          return companies;
        };

        const flushPage = (
          pageNumber: number,
          maxKnownPage: number,
          companies: Array<ProductCardRow>,
        ) => {
          safeSendMessage({
            action: "saveCompanyBatchFromProducts",
            pageNumber,
            totalPages: maxKnownPage,
            companies,
          });
          safeSendMessage({
            action: "productSearchPaginationProgress",
            currentPage: pageNumber,
            totalPages: maxKnownPage,
            collected: seen.size,
          });
        };

        let pagesScraped = 0;
        let info = getProductSearchPaginationInfo();
        let currentPage = info?.currentPage ?? 1;
        let maxKnownPage = info?.maxVisiblePage ?? currentPage;

        // First page (whatever the user starts on).
        const firstCompanies = await extractWithRetry();
        firstCompanies.forEach((c) => {
          const key = c.linkedin_url ?? c.product_url;
          if (key && !seen.has(key)) seen.set(key, c);
        });
        pagesScraped++;
        if (firstCompanies.length === 0) {
          pageFailures.push({ page: currentPage, reason: "empty-extraction" });
        }
        flushPage(currentPage, maxKnownPage, firstCompanies);

        // Walk forward via the next button until it's hidden/disabled.
        while (pagesScraped < SAFETY_CAP) {
          info = getProductSearchPaginationInfo();
          if (!info || !info.hasNext) break;

          const expectedNext = info.currentPage + 1;
          let click = await clickProductSearchNext(expectedNext);
          if (!click.ok) {
            await new Promise((r) => setTimeout(r, 1500));
            click = await clickProductSearchNext(expectedNext);
          }
          if (!click.ok) {
            pageFailures.push({
              page: expectedNext,
              reason:
                click.reason === "no-button" ? "click-no-button" : "click-timeout",
            });
            break;
          }

          currentPage = expectedNext;
          if (currentPage > maxKnownPage) maxKnownPage = currentPage;

          const pageCompanies = await extractWithRetry();
          pageCompanies.forEach((c) => {
            const key = c.linkedin_url ?? c.product_url;
          if (key && !seen.has(key)) seen.set(key, c);
          });
          pagesScraped++;
          if (pageCompanies.length === 0) {
            pageFailures.push({ page: currentPage, reason: "empty-extraction" });
          }

          // Refresh maxKnownPage from the freshly-rendered indicator window.
          const after = getProductSearchPaginationInfo();
          if (after && after.maxVisiblePage > maxKnownPage) {
            maxKnownPage = after.maxVisiblePage;
          }

          flushPage(currentPage, maxKnownPage, pageCompanies);
        }

        sendResponse({
          success: true,
          totalPages: maxKnownPage,
          pagesScraped,
          uniqueCompanies: seen.size,
          pageFailures,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
    return true;
  }

  if (message.action === "goToNextPage") {
    {
      const info = getLinkedInPaginationInfo();
      if (info) {
        clickLinkedInPageNumber(info.currentPage + 1)
          .then((res) =>
            sendResponse(
              res.ok
                ? { success: true }
                : { success: false, error: res.reason },
            ),
          )
          .catch((err: Error) =>
            sendResponse({ success: false, error: err.message }),
          );
      } else {
        sendResponse({ success: false, error: "No pagination info" });
      }
    }
    return true;
  }

  if (message.action === "highlightSalaries") {
    clickSalaryMetadata();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "clickSecondJob") {
    const result = clickSecondJobPost();
    sendResponse(result);
    return true;
  }

  if (message.action === "extractCompaniesFromJobs") {
    const companies = extractCompaniesFromJobCards();
    sendResponse({ companies });
    return true;
  }

  if (message.action === "extractCompaniesFromFeed") {
    const companies = extractCompaniesFromFeedPosts();
    sendResponse({ companies });
    return true;
  }

  return false;
});

export {};
