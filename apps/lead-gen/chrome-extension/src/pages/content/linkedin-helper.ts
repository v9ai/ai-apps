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

function clickDismiss(el: HTMLElement) {
  el.click();
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
  if (titleEl) parts.push(titleEl.textContent?.trim() || "");

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
    bottom: 24px;
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

  document.body.appendChild(createConnectAllButton());
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

function createBrowseProfilesButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BROWSE_PROFILES_BTN_ATTR, "true");
  btn.textContent = "Browse Profiles";
  btn.title = "Open each profile sequentially, extract & save contact info";
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
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

    const profiles = getProfileLinks();
    if (profiles.length === 0) {
      btn.textContent = "No profiles found";
      setTimeout(() => { btn.textContent = "Browse Profiles"; }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = `Starting (${profiles.length})...`;
    btn.style.backgroundColor = "#5b21b6";

    safeSendMessage({
      action: "startProfileBrowsing",
      profiles,
      returnUrl: window.location.href,
    }, (response) => {
      if (!response?.success) {
        btn.textContent = "Error";
        btn.style.backgroundColor = "#dc2626";
        setTimeout(() => {
          btn.textContent = "Browse Profiles";
          btn.style.backgroundColor = "#7c3aed";
          btn.disabled = false;
        }, 2000);
      }
    });
  });

  browseProfilesBtn = btn;
  return btn;
}

function injectBrowseProfilesButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!window.location.pathname.startsWith("/search/results/people")) return;
  if (document.querySelector(`[${BROWSE_PROFILES_BTN_ATTR}]`)) return;

  document.body.appendChild(createBrowseProfilesButton());
}

function observeBrowseProfilesButton() {
  if (!window.location.hostname.includes("linkedin.com")) return;
  if (!window.location.pathname.startsWith("/search/results/people")) return;

  setTimeout(injectBrowseProfilesButton, 1500);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (teardownIfDead()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectBrowseProfilesButton, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  _observers.push(obs);
}

observeBrowseProfilesButton();

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (!isExtensionAlive()) return;
  if (message.action === "browseProgress" && browseProfilesBtn) {
    browseProfilesBtn.textContent = `${message.current}/${message.total} ${message.name || ""}`.trim();
  }
  if (message.action === "browseDone" && browseProfilesBtn) {
    browseProfilesBtn.textContent = `Done! ${message.saved} saved`;
    browseProfilesBtn.style.backgroundColor = "#16a34a";
    setTimeout(() => {
      browseProfilesBtn!.textContent = "Browse Profiles";
      browseProfilesBtn!.style.backgroundColor = "#7c3aed";
      browseProfilesBtn!.disabled = false;
    }, 3000);
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
  document.querySelectorAll(`[${FIND_RELATED_BTN_ATTR}]`).forEach((el) => el.remove());
  document.querySelectorAll(`[${SCRAPE_PEOPLE_POSTS_BTN_ATTR}]`).forEach((el) => el.remove());
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
    bottom: 80px;
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
    bottom: 136px;
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
  }

  if (!document.querySelector(`[${SCRAPE_PEOPLE_POSTS_BTN_ATTR}]`)) {
    const sppBtn = createScrapePeoplePostsButton();
    document.body.appendChild(sppBtn);
    scrapePeoplePostsBtn = sppBtn;
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
  document.querySelectorAll(`[${IMPORT_PROFILE_BTN_ATTR}]`).forEach((el) => el.remove());
  importProfileBtn = null;
}

/** Extract profile data directly from the DOM (runs in content script context). */
function extractProfileFromDOM(): {
  name: string;
  headline: string;
  location: string;
  linkedinUrl: string;
  currentCompany: string;
  currentCompanyLinkedinUrl: string;
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

  console.log("[LG ImportProfile] company:", JSON.stringify(currentCompany), "url:", currentCompanyLinkedinUrl);

  return {
    name,
    headline,
    location,
    linkedinUrl: window.location.href.split("?")[0],
    currentCompany,
    currentCompanyLinkedinUrl,
  };
}

function createImportProfileButton(): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(IMPORT_PROFILE_BTN_ATTR, "true");
  btn.textContent = "Import Profile";
  btn.title = "Import this LinkedIn profile into the CRM";
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
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
    // If showing an existing contact link, let the <a> navigate normally
    if (btn.dataset.existingContact) return;

    e.preventDefault();
    e.stopPropagation();

    // Extract data directly from the DOM (no chrome.scripting.executeScript needed)
    const profileData = extractProfileFromDOM();
    if (!profileData.name) {
      btn.textContent = "No profile data found";
      setTimeout(() => { btn.textContent = "Import Profile"; }, 2000);
      return;
    }

    btn.disabled = true;
    btn.textContent = "Importing...";

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
  contact: { slug?: string; firstName?: string; lastName?: string },
) {
  btn.dataset.existingContact = "true";
  btn.style.backgroundColor = "#16a34a";
  btn.style.padding = "0";
  btn.disabled = false;
  btn.innerHTML = "";
  const link = document.createElement("a");
  link.href = contact.slug
    ? `https://agenticleadgen.xyz/contacts/${contact.slug}`
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
  document.querySelectorAll(`[${IMPORT_OPPORTUNITY_BTN_ATTR}]`).forEach((el) => el.remove());
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
  // Title
  const titleEl =
    document.querySelector("h1.t-24.t-bold.inline") ||
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1") ||
    document.querySelector(".jobs-details h1");
  const title = titleEl?.textContent?.trim() || "";

  // Company
  const companyLinkEl = document.querySelector<HTMLAnchorElement>(
    ".job-details-jobs-unified-top-card__company-name a",
  );
  const companyName = companyLinkEl?.textContent?.trim() || "";
  let companyLinkedinUrl = "";
  if (companyLinkEl?.href) {
    try {
      const u = new URL(companyLinkEl.href, window.location.origin);
      const m = u.pathname.match(/^\/company\/([^/]+)/);
      if (m) companyLinkedinUrl = `https://www.linkedin.com/company/${m[1]}/`;
    } catch { /* skip */ }
  }

  // Salary, remote, employment type from fit-level buttons
  let salary = "";
  let remoteType = "";
  let employmentType = "";
  const fitButtons = document.querySelectorAll(".job-details-fit-level-preferences button");
  for (const btn of fitButtons) {
    const text = btn.textContent?.trim() || "";
    if (/[\$\£\€]|\/yr|\/hr|\/mo/i.test(text)) {
      salary = text.replace(/^\s*✓\s*/, "").trim();
    } else if (/\b(remote|hybrid|on-?\s?site)\b/i.test(text)) {
      remoteType = text.replace(/^\s*✓\s*/, "").trim();
    } else if (/\b(full-?\s?time|part-?\s?time|contract|temporary|internship|volunteer)\b/i.test(text)) {
      employmentType = text.replace(/^\s*✓\s*/, "").trim();
    }
  }

  // Location from tertiary description
  let location = "";
  const tertiaryDesc = document.querySelector(
    ".job-details-jobs-unified-top-card__tertiary-description-container",
  );
  if (tertiaryDesc) {
    const firstSpan = tertiaryDesc.querySelector(".tvm__text--low-emphasis");
    if (firstSpan) location = firstSpan.textContent?.trim() || "";
  }

  // Applied status
  let appliedStatus = "";
  const appliedEl = document.querySelector(
    ".artdeco-inline-feedback--success .artdeco-inline-feedback__message",
  );
  if (appliedEl) appliedStatus = appliedEl.textContent?.trim() || "";

  // Canonical job URL
  const jobId = getJobId();
  const jobUrl = jobId
    ? `https://www.linkedin.com/jobs/view/${jobId}/`
    : window.location.href.split("?")[0];

  // Job description
  const descEl = document.querySelector("#job-details");
  const description = descEl?.textContent?.trim() || "";

  // Hiring team contact — use .hirer-card__hirer-information directly because
  // .job-details-people-who-can-help__section--two-pane matches both the
  // connections card AND the hiring team card; querySelector returns the wrong one.
  let hiringContact: { name: string; linkedinUrl: string; position: string } | null = null;
  const hirerCard = document.querySelector(".hirer-card__hirer-information");
  if (hirerCard) {
    const nameEl = hirerCard.querySelector(".jobs-poster__name strong");
    const contactName = nameEl?.textContent?.trim() || "";
    if (contactName) {
      let contactLinkedinUrl = "";
      const profileLink = hirerCard.querySelector<HTMLAnchorElement>(
        'a[href*="/in/"]',
      );
      if (profileLink?.href) {
        try {
          const u = new URL(profileLink.href, window.location.origin);
          const m = u.pathname.match(/^\/in\/([^/]+)/);
          if (m) contactLinkedinUrl = `https://www.linkedin.com/in/${m[1]}/`;
        } catch { /* skip */ }
      }

      const positionEl = hirerCard.querySelector(
        ".text-body-small.t-black",
      );
      const position = positionEl?.textContent?.trim() || "";

      hiringContact = { name: contactName, linkedinUrl: contactLinkedinUrl, position };
    }
  }

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
    bottom: 24px;
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

  document.querySelectorAll(".job-card-container").forEach((card) => {
    const subtitleEl = card.querySelector(".artdeco-entity-lockup__subtitle");
    if (!subtitleEl) return;

    const raw = subtitleEl.textContent?.trim() ?? "";
    const name = raw.split(/\s*·\s*/)[0].trim();
    if (!name) return;

    const companyLink = subtitleEl.querySelector('a[href*="/company/"]') as HTMLAnchorElement | null;
    let linkedin_url = "";

    if (companyLink) {
      try {
        const url = new URL(companyLink.href);
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
    return extractLinkedInJobData();
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

// Extract LinkedIn job data
function extractLinkedInJobData() {
  const jobCards = document.querySelectorAll(".job-card-container");
  const jobs: any[] = [];

  jobCards.forEach((jobCard) => {
    const titleElement = jobCard.querySelector(".job-card-list__title--link");
    const companyElement = jobCard.querySelector(
      ".artdeco-entity-lockup__subtitle",
    );
    const metadataUls = jobCard.querySelectorAll(
      "ul.job-card-container__metadata-wrapper",
    );

    // Check if job is closed/archived (indicated by specific classes or text)
    const isArchived =
      jobCard.querySelector(".job-card-container__footer-item--closed") !==
        null ||
      jobCard.querySelector('[data-control-name*="closed"]') !== null ||
      jobCard.textContent?.includes("No longer accepting applications") ||
      jobCard.classList.contains("job-card-container--closed");

    const jobData: any = {
      title: titleElement?.textContent?.trim(),
      company: companyElement?.textContent?.trim(),
      url: (titleElement as HTMLAnchorElement)?.href,
      archived: isArchived,
    };

    // First UL - location
    if (metadataUls[0]) {
      jobData.location = metadataUls[0].textContent?.trim();
    }

    // Second UL - salary
    if (metadataUls[1]) {
      jobData.salary = metadataUls[1].textContent?.trim();
    }

    if (jobData.title) {
      jobs.push(jobData);
    }
  });
  return jobs;
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

// Function to click specific page number on LinkedIn
async function clickLinkedInPageNumber(pageNumber: number): Promise<boolean> {

  // Find the button with the specific page number
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
    // Fallback to Next button
    const nextButton = document.querySelector(
      'button[aria-label="View next page"]',
    ) as HTMLButtonElement;

    if (!nextButton || nextButton.disabled) {
      return false;
    }

    targetButton = nextButton;
  }

  targetButton.click();

  // Wait for new jobs to load (check for changes in job cards)
  let attempts = 0;
  const maxAttempts = 15; // 15 seconds max

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const paginationInfo = getLinkedInPaginationInfo();
    if (paginationInfo && paginationInfo.currentPage === pageNumber) {
      // Wait a bit more for all content to load
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return true;
    }

    attempts++;
  }

  return true; // Continue anyway
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
        // LinkedIn pagination handling
        const allJobs: any[] = [];
        const companyMap = new Map<string, { name: string; linkedin_url: string }>();
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
        let actualPagesScraped = 1; // current page is always scraped

        // Extract jobs + companies from current page
        const currentJobs = extractLinkedInJobData();
        const currentCompanies = extractCompaniesFromJobCards();
        allJobs.push(...currentJobs);
        currentCompanies.forEach((c) => {
          const key = c.linkedin_url || c.name.toLowerCase();
          if (!companyMap.has(key)) companyMap.set(key, c);
        });

        // Flush this page to the background as soon as it's scraped — the
        // background POSTs to D1 right away so partial progress survives if
        // the user closes the tab or LinkedIn rate-limits mid-scrape.
        safeSendMessage({
          action: "savePageBatch",
          pageNumber: startPage,
          totalPages,
          jobs: currentJobs,
          companies: currentCompanies,
        });

        // Send progress update
        safeSendMessage({
          action: "paginationProgress",
          currentPage: startPage,
          totalPages,
          jobsCollected: allJobs.length,
        });

        // Navigate through remaining pages
        for (let page = startPage + 1; page <= totalPages; page++) {
          const success = await clickLinkedInPageNumber(page);

          if (!success) {
            break;
          }

          // Wait a bit for content to fully render
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Extract jobs + companies from new page
          const pageJobs = extractLinkedInJobData();
          const pageCompanies = extractCompaniesFromJobCards();
          allJobs.push(...pageJobs);
          pageCompanies.forEach((c) => {
            const key = c.linkedin_url || c.name.toLowerCase();
            if (!companyMap.has(key)) companyMap.set(key, c);
          });

          actualPagesScraped++;

          // Flush this page to background.
          safeSendMessage({
            action: "savePageBatch",
            pageNumber: page,
            totalPages,
            jobs: pageJobs,
            companies: pageCompanies,
          });

          // Send progress update
          safeSendMessage({
            action: "paginationProgress",
            currentPage: page,
            totalPages,
            jobsCollected: allJobs.length,
          });
        }

        sendResponse({
          success: true,
          jobs: allJobs,
          companies: Array.from(companyMap.values()),
          totalPages,
          pagesScraped: actualPagesScraped,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.action === "getPaginationInfo") {
    const paginationInfo = getLinkedInPaginationInfo();
    sendResponse({ paginationInfo });
    return true;
  }

  if (message.action === "goToNextPage") {
    {
      const info = getLinkedInPaginationInfo();
      if (info) {
        clickLinkedInPageNumber(info.currentPage + 1)
          .then((ok) => sendResponse({ success: ok }))
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
