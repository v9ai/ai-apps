// ── Tab Safety & Timing Utilities ─────────────────────────────────────

// ── Service worker keepAlive ─────────────────────────────────────────
// MV3 service workers can be terminated after ~30s of inactivity.
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => { /* no-op to reset idle timer */ });
  }, 25_000);
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// ── Randomised delay to avoid bot detection ────────────────────────
// LinkedIn fingerprints automation by detecting constant timing.
// Always jitter delays by +/-30% to mimic human variance.
export function randomDelay(baseMs: number): Promise<void> {
  const jitter = baseMs * 0.3;
  const ms = baseMs + Math.floor(Math.random() * jitter * 2 - jitter);
  return new Promise((r) => setTimeout(r, Math.max(200, ms)));
}

export async function isTabAlive(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

export async function safeTabUpdate(tabId: number, props: chrome.tabs.UpdateProperties): Promise<void> {
  if (!(await isTabAlive(tabId))) {
    throw new Error(`Tab ${tabId} was closed`);
  }
  await chrome.tabs.update(tabId, props);
}

export async function safeSendMessage(tabId: number, message: Record<string, unknown>): Promise<void> {
  try {
    if (await isTabAlive(tabId)) {
      await chrome.tabs.sendMessage(tabId, message);
    }
  } catch {
    // Content script not available (tab navigated, closed, or script not injected)
  }
}

export function waitForTabLoad(tabId: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.tabs.onRemoved.removeListener(removedListener);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };

    const settle = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        settle();
      }
    };

    const removedListener = (removedTabId: number) => {
      if (removedTabId === tabId) {
        settle(new Error(`Tab ${tabId} was closed during navigation`));
      }
    };

    // Check if tab is already complete before attaching listener (race condition fix)
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        settle();
      } else {
        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.onRemoved.addListener(removedListener);
        // Timeout in case page never fully loads
        timeoutId = setTimeout(() => {
          console.warn(`[waitForTabLoad] Timeout after ${timeoutMs}ms for tab ${tabId}`);
          settle();
        }, timeoutMs);
      }
    }).catch(() => {
      settle(new Error(`Tab ${tabId} does not exist`));
    });
  });
}

export function clickSeeMore(tabId: number): Promise<number> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        let clicked = 0;
        const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window };
        const clickEl = (el: HTMLElement) => {
          el.dispatchEvent(new PointerEvent("pointerdown", opts));
          el.dispatchEvent(new MouseEvent("mousedown", opts));
          el.dispatchEvent(new PointerEvent("pointerup", opts));
          el.dispatchEvent(new MouseEvent("mouseup", opts));
          el.click();
          clicked++;
        };

        // LinkedIn's "see more" class
        document.querySelectorAll<HTMLElement>("a.lt-line-clamp__more, button.lt-line-clamp__more").forEach(clickEl);

        // Text-based fallback: buttons/links containing "see more"
        document.querySelectorAll<HTMLElement>("button, a").forEach((el) => {
          const text = el.textContent?.trim().toLowerCase() || "";
          if ((text === "see more" || text === "…see more" || text === "...see more") && el.offsetParent !== null) {
            clickEl(el);
          }
        });

        return clicked;
      },
    })
    .then((results) => results?.[0]?.result ?? 0)
    .catch(() => 0);
}
