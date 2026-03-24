// LinkedIn job helper — salary extraction + Block Company button

function isGoogleAshbySearch(): boolean {
  if (
    !window.location.hostname.includes("google.com") ||
    !window.location.pathname.includes("/search")
  ) return false;
  // Check URL first (cheap), fall back to page content (expensive) only if needed
  return (
    window.location.search.includes("ashbyhq.com") ||
    !!document.body.textContent?.includes("jobs.ashbyhq.com")
  );
}

// ── Blocked Companies Cache ───────────────────────────────────────────

const blockedCompaniesSet = new Set<string>();

let blockedCompaniesLoaded = false;

function loadBlockedCompanies(onDone?: () => void) {
  chrome.runtime.sendMessage(
    { action: "getBlockedCompanies" },
    (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        blockedCompaniesLoaded = true;
        onDone?.();
        return;
      }
      for (const c of response.companies) {
        blockedCompaniesSet.add(c.name.toLowerCase());
      }
      blockedCompaniesLoaded = true;
      onDone?.();
    },
  );
}

function isCompanyBlocked(name: string): boolean {
  return blockedCompaniesSet.has(name.toLowerCase());
}

// ── Block Company Button ──────────────────────────────────────────────

const BLOCK_BTN_ATTR = "data-nomad-block-btn";

function createBlockButton(companyName: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.setAttribute(BLOCK_BTN_ATTR, "true");

  const alreadyBlocked = isCompanyBlocked(companyName);

  btn.textContent = alreadyBlocked ? "Blocked" : "Block Company";
  btn.title = alreadyBlocked ? `${companyName} is blocked` : `Block ${companyName}`;
  btn.disabled = alreadyBlocked;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.textContent = "Blocking...";
    btn.disabled = true;

    chrome.runtime.sendMessage(
      { action: "blockCompany", companyName },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Nomad] Message error:", chrome.runtime.lastError.message);
          btn.textContent = "Error";
          btn.style.backgroundColor = "#ef4444";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Block Company";
            btn.style.backgroundColor = "#dc2626";
          }, 2000);
          return;
        }
        if (response?.success) {
          blockedCompaniesSet.add(companyName.toLowerCase());
          markAllButtonsBlocked(companyName);
          dismissJobCard(btn);
        } else {
          console.error("[Nomad] Block failed:", response?.error);
          btn.textContent = "Failed";
          btn.style.backgroundColor = "#ef4444";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Block Company";
            btn.style.backgroundColor = "#dc2626";
          }, 2000);
        }
      },
    );
  });
  return btn;
}

function markAllButtonsBlocked(companyName: string) {
  document.querySelectorAll(`[${BLOCK_BTN_ATTR}]`).forEach((el) => {
    const btn = el as HTMLButtonElement;
    if (btn.title.toLowerCase().includes(companyName.toLowerCase())) {
      btn.textContent = "Blocked";
      btn.disabled = true;
    }
  });
}

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

function dismissJobCard(btn: HTMLElement) {
  const card = btn.closest(".job-card-container, .base-card");
  if (!card || card.getAttribute("data-nomad-dismissed")) return;
  card.setAttribute("data-nomad-dismissed", "true");
  const dismissBtn = findDismissButton(card);
  if (dismissBtn) {
    setTimeout(() => {
      if (dismissBtn.isConnected) clickDismiss(dismissBtn);
    }, 500);
  }
}

// ── Auto-Dismiss Non-EU Location Jobs ───────────────────────────────

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

function queueDismiss(card: Element, btn: HTMLButtonElement) {
  if (queuedButtons.has(btn)) return;
  if (dismissQueue.length >= MAX_DISMISS_QUEUE) return;
  card.setAttribute("data-nomad-dismissed", "true");
  queuedButtons.add(btn);
  dismissQueue.push(btn);
  if (!dismissTimer) {
    processQueue();
  }
}

function processQueue() {
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
    if (card.getAttribute("data-nomad-dismissed")) return;
    const locText = getCardLocationText(card);
    if (!locText.trim() || !isDismissLocation(locText)) return;
    const dismissBtn = findDismissButton(card);
    if (!dismissBtn) return;
    queueDismiss(card, dismissBtn);
    queued++;
  });

  // Public/logged-out view cards
  document.querySelectorAll(".base-card.job-search-card").forEach((card) => {
    if (card.getAttribute("data-nomad-dismissed")) return;
    const locText = getCardLocationText(card);
    if (!locText.trim() || !isDismissLocation(locText)) return;
    card.setAttribute("data-nomad-dismissed", "true");
    (card as HTMLElement).style.display = "none";
    queued++;
  });

  if (queued > 0) {
    console.log(`[Nomad] Dismissing ${queued} excluded-location job(s)`);
  }
}

function autoDismissBlockedCards() {
  // Skip if blocked companies haven't loaded yet — will retry via MutationObserver
  if (!blockedCompaniesLoaded) return;

  let queued = 0;
  document.querySelectorAll(".job-card-container").forEach((card) => {
    if (card.getAttribute("data-nomad-dismissed")) return;
    const companyEl = card.querySelector(
      ".artdeco-entity-lockup__subtitle, .job-card-container__primary-description",
    );
    if (!companyEl) return;
    const companyName = companyEl.textContent?.trim() || "";
    if (!isCompanyBlocked(companyName)) return;
    const dismissBtn = findDismissButton(card);
    if (!dismissBtn) return;
    queueDismiss(card, dismissBtn);
    queued++;
  });
  if (queued > 0) {
    console.log(`[Nomad] Dismissing ${queued} blocked company job(s)`);
  }
}

function injectBlockButtons() {
  // Auto-dismiss blocked company cards and South Asia location jobs
  autoDismissBlockedCards();
  autoDismissLocationCards();
  clickSalaryMetadata();

  // ── Logged-in view: job cards ──
  document.querySelectorAll(".job-card-container").forEach((card) => {
    if (card.querySelector(`[${BLOCK_BTN_ATTR}]`)) return;
    const companyEl = card.querySelector(
      ".artdeco-entity-lockup__subtitle, .job-card-container__primary-description",
    );
    if (!companyEl) return;
    const companyName = companyEl.textContent?.trim() || "Unknown";
    companyEl.appendChild(createBlockButton(companyName));
  });

  // ── Logged-in view: detail panel top card ──
  const detailCompany = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name",
  );
  if (detailCompany && !detailCompany.querySelector(`[${BLOCK_BTN_ATTR}]`)) {
    const name = detailCompany.textContent?.trim() || "Unknown";
    detailCompany.appendChild(createBlockButton(name));
  }

  // ── Public view: job cards ──
  document.querySelectorAll(".base-card.job-search-card").forEach((card) => {
    if (card.querySelector(`[${BLOCK_BTN_ATTR}]`)) return;
    const companyEl = card.querySelector(
      "h4.base-search-card__subtitle",
    );
    if (!companyEl) return;
    const companyName = companyEl.textContent?.trim() || "Unknown";
    companyEl.appendChild(createBlockButton(companyName));
  });
}

function observeBlockButtons() {
  if (!window.location.hostname.includes("linkedin.com")) return;

  // Fetch blocked companies, then inject buttons once loaded
  loadBlockedCompanies(() => injectBlockButtons());
  // Fallback: inject after 3s even if fetch hasn't returned
  setTimeout(() => { if (!blockedCompaniesLoaded) injectBlockButtons(); }, 3000);

  // Re-inject on DOM changes (debounced to prevent excessive calls)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const obs = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectBlockButtons, 500);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

observeBlockButtons();

// ── Send Email Button (LinkedIn Post/Activity Pages) ─────────────────

const SEND_EMAIL_BTN_ATTR = "data-nomad-send-email-btn";

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
  btn.title = "Send email via Nomad CRM";
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

    chrome.runtime.sendMessage(
      { action: "sendEmailFromPost", postData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[Nomad] Send email error:", chrome.runtime.lastError.message);
          btn.textContent = "Error";
          btn.style.backgroundColor = "#ef4444";
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Send Email";
            btn.style.backgroundColor = "#0a66c2";
          }, 2000);
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
          console.error("[Nomad] Send email failed:", response?.error);
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
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectSendEmailButton, 500);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

observeSendEmailButton();

// ── Connect All Button (LinkedIn People Search) ─────────────────────

const CONNECT_ALL_BTN_ATTR = "data-nomad-connect-all-btn";

// Click element in page's main world via background script (bypasses CSP + content script isolation)
function mainWorldClick(selector: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "clickInMainWorld", selector },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log("[ConnectAll] mainWorldClick error:", chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
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
      connectBtn.setAttribute('data-nomad-connect-target', 'true');
      await mainWorldClick('[data-nomad-connect-target="true"]');
      connectBtn.removeAttribute('data-nomad-connect-target');

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
          sendBtn.setAttribute('data-nomad-send-target', 'true');
          const clickResult = await mainWorldClick('[data-nomad-send-target="true"]');
          sendBtn.removeAttribute('data-nomad-send-target');
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
        dismissEl.setAttribute('data-nomad-dismiss-target', 'true');
        await mainWorldClick('[data-nomad-dismiss-target="true"]');
        dismissEl.removeAttribute('data-nomad-dismiss-target');
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
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectConnectAllButton, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

observeConnectAllButton();

// ── Browse Profiles Button (LinkedIn People Search) ─────────────────

const BROWSE_PROFILES_BTN_ATTR = "data-nomad-browse-profiles-btn";
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

    chrome.runtime.sendMessage({
      action: "startProfileBrowsing",
      profiles,
      returnUrl: window.location.href,
    }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
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
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(injectBrowseProfilesButton, 1000);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

observeBrowseProfilesButton();

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((message) => {
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
});

function clickSalaryMetadata() {
  document.querySelectorAll(".job-card-container").forEach((jobCard) => {
    const metadataUls = jobCard.querySelectorAll(
      "ul.job-card-container__metadata-wrapper",
    );
    if (metadataUls.length < 2) return;
    const salaryUl = metadataUls[1] as HTMLElement;
    if (salaryUl.hasAttribute("data-nomad-salary-highlight")) return;
    salaryUl.setAttribute("data-nomad-salary-highlight", "true");
  });
}

// Function to extract job data including salary
function extractJobData() {
  // Detect the page type
  const isLinkedIn = window.location.hostname.includes("linkedin.com");

  // Check if we're on Google search results
  const isGoogleSearch =
    window.location.hostname.includes("google.com") &&
    window.location.pathname.includes("/search");

  // Check if we're on Founderio
  const isFounderio =
    window.location.hostname.includes("founderio.com") &&
    (window.location.pathname === "/jobs" ||
      window.location.pathname.startsWith("/job/"));

  const isAshby =
    isGoogleAshbySearch() ||
    window.location.hostname.includes("ashbyhq.com") ||
    window.location.hostname.includes(".ashbyhq.com");

  const genericJobsCount = document.querySelectorAll(
    '[data-provides="search-result"]',
  ).length;

  if (isGoogleSearch) return [];

  if (isFounderio) {
    const founderioExtractor = (window as any).extractFounderioJobData;
    return founderioExtractor ? founderioExtractor() : [];
  } else if (isAshby && !isGoogleSearch) {
    const ashbyExtractor = (window as any).extractAshbyJobData;
    return ashbyExtractor ? ashbyExtractor() : [];
  } else if (genericJobsCount > 0) {
    return extractGenericJobData();
  } else if (isLinkedIn) {
    return extractLinkedInJobData();
  }

  return [];
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
  if (message.action === "ping") {
    sendResponse({ ok: true });
    return true;
  }

  // Guard: only handle job-related messages on supported sites
  const hostname = window.location.hostname;
  const isSupportedSite =
    hostname.includes("linkedin.com") ||
    hostname.includes("google.com") ||
    hostname.includes("ashbyhq.com") ||
    hostname.includes("greenhouse.io") ||
    hostname.includes("lever.co") ||
    hostname.includes("founderio.com") ||
    hostname.includes("workable.com");

  if (!isSupportedSite) return false;

  if (message.action === "navigateToPage") {
    // Handle Google Ashby pagination navigation
    const { pageNumber } = message;
    const ashbyPageNavigator = (window as any).clickAshbyPageNumber;

    if (ashbyPageNavigator) {
      ashbyPageNavigator(pageNumber);
      sendResponse({ success: true });
    } else {
      sendResponse({
        success: false,
        error: "Ashby navigation function not loaded",
      });
    }
    return true;
  }

  if (message.action === "extractJobs") {
    // Check if this is a Google search - let Google Search Helper (ashby-helper.ts) handle it
    const isGoogleSearch =
      window.location.hostname.includes("google.com") &&
      window.location.pathname.includes("/search");

    if (isGoogleSearch) {
      // Don't respond - let Google Search Helper (ashby-helper.ts) handle this
      return false;
    }

    const jobs = extractJobData();
    sendResponse({ jobs });
    return true;
  }

  if (message.action === "extractJobsWithPagination") {
    (async () => {
      try {
        if (isGoogleAshbySearch()) {
          const ashbyPaginationGetter = (window as any).getAshbyPaginationInfo;
          const ashbyExtractor = (window as any).extractAshbyJobData;
          const ashbyPageClicker = (window as any).clickAshbyPageNumber;

          if (!ashbyPaginationGetter || !ashbyExtractor || !ashbyPageClicker) {
            sendResponse({
              success: false,
              error: "Ashby helper functions not loaded",
            });
            return;
          }

          const allJobs: any[] = [];
          const paginationInfo = ashbyPaginationGetter();

          if (!paginationInfo) {
            sendResponse({
              success: false,
              error: "No pagination found on Google search results",
            });
            return;
          }

          const { currentPage, totalPages } = paginationInfo;
          const startPage = currentPage;

          // Extract jobs from current page
          const currentJobs = ashbyExtractor();
          allJobs.push(...currentJobs);

          // Send progress update
          chrome.runtime.sendMessage({
            action: "paginationProgress",
            currentPage: startPage,
            totalPages,
            jobsCollected: allJobs.length,
          });

          // Navigate through remaining pages (limit to avoid too many pages)
          const maxPagesToScrape = Math.min(totalPages, startPage + 4); // Scrape up to 5 pages
          for (let page = startPage + 1; page <= maxPagesToScrape; page++) {

            const success = await ashbyPageClicker(page);

            if (!success) {
              break;
            }

            // Wait longer for Google to fully load the new page
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Extract jobs from new page
            const pageJobs = ashbyExtractor();
            allJobs.push(...pageJobs);

            // Send progress update
            chrome.runtime.sendMessage({
              action: "paginationProgress",
              currentPage: page,
              totalPages,
              jobsCollected: allJobs.length,
            });
          }

          sendResponse({
            success: true,
            jobs: allJobs,
            totalPages,
            pagesScraped: maxPagesToScrape - startPage + 1,
          });
          return;
        }

        // LinkedIn pagination handling
        const allJobs: any[] = [];
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

        // Extract jobs from current page
        const currentJobs = extractLinkedInJobData();
        allJobs.push(...currentJobs);

        // Send progress update
        chrome.runtime.sendMessage({
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

          // Extract jobs from new page
          const pageJobs = extractLinkedInJobData();
          allJobs.push(...pageJobs);

          // Send progress update
          chrome.runtime.sendMessage({
            action: "paginationProgress",
            currentPage: page,
            totalPages,
            jobsCollected: allJobs.length,
          });
        }

        sendResponse({
          success: true,
          jobs: allJobs,
          totalPages,
          pagesScraped: totalPages - startPage + 1,
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
    if (isGoogleAshbySearch()) {
      const ashbyPaginationGetter = (window as any).getAshbyPaginationInfo;
      if (ashbyPaginationGetter) {
        const paginationInfo = ashbyPaginationGetter();
        sendResponse({ paginationInfo });
      } else {
        sendResponse({ paginationInfo: null });
      }
    } else {
      const paginationInfo = getLinkedInPaginationInfo();
      sendResponse({ paginationInfo });
    }
    return true;
  }

  if (message.action === "goToNextPage") {
    if (isGoogleAshbySearch()) {
      const ashbyNextPageClicker = (window as any).clickAshbyNextPage;
      if (ashbyNextPageClicker) {
        ashbyNextPageClicker()
          .then(() => sendResponse({ success: true }))
          .catch((err: Error) =>
            sendResponse({ success: false, error: err.message }),
          );
      } else {
        sendResponse({
          success: false,
          error: "Ashby next page function not found",
        });
      }
    } else {
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

  return false;
});

export {};
