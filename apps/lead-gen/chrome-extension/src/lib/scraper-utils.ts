/**
 * Shared utilities for content-script-based scrapers.
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitForTabComplete(
  tabId: number,
  timeoutMs = 25000,
): Promise<void> {
  const start = Date.now();

  const t = await chrome.tabs.get(tabId);
  if (t.status === "complete") return;

  await new Promise<void>((resolve, reject) => {
    const onUpdated = (updatedTabId: number, info: { status?: string }) => {
      if (updatedTabId !== tabId) return;
      if (info.status === "complete") {
        cleanup();
        resolve();
      }
    };

    const timer = setInterval(async () => {
      if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error("Timeout waiting for tab to finish loading"));
        return;
      }
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === "complete") {
          cleanup();
          resolve();
        }
      } catch {
        // ignore
      }
    }, 250);

    function cleanup() {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearInterval(timer);
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

export async function ensureContentScriptInjected(
  tabId: number,
  label = "Scraper",
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
  } catch {
    console.log(`[${label}] Content script not found, injecting...`);
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/pages/content/index.tsx"],
      });
      await sleep(1000);
    } catch (injectErr) {
      console.error(`[${label}] Failed to inject content script:`, injectErr);
      throw new Error(
        "Failed to inject content script. Please refresh the page.",
      );
    }
  }
}
