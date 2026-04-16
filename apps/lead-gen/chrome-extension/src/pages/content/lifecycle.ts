// ── Extension context lifecycle ─────────────────────────────────────
// Shared primitives used by every content-script module so that a single
// extension reload drains all observers/intervals across modules.

/** Returns false once the extension has been reloaded/updated. */
export function isExtensionAlive(): boolean {
  return !!chrome.runtime?.id;
}

/** Registry of active MutationObservers for bulk teardown. */
export const _observers: MutationObserver[] = [];

/** Registry of interval IDs for bulk teardown. */
export const _intervals: ReturnType<typeof setInterval>[] = [];

/** One-shot teardown: disconnect observers, clear intervals. Modules add
 *  their own cleanup via `onTeardown` — we call each callback once. */
const _teardownCallbacks: Array<() => void> = [];

export function onTeardown(cb: () => void): void {
  _teardownCallbacks.push(cb);
}

export function teardownIfDead(): boolean {
  if (isExtensionAlive()) return false;

  console.warn("[LG] Extension context invalidated — tearing down content script.");

  for (const obs of _observers) obs.disconnect();
  _observers.length = 0;

  for (const id of _intervals) clearInterval(id);
  _intervals.length = 0;

  for (const cb of _teardownCallbacks) {
    try { cb(); } catch { /* best-effort */ }
  }
  _teardownCallbacks.length = 0;

  return true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Safe wrapper: only calls chrome.runtime.sendMessage when context is alive. */
export function safeSendMessage(
  message: unknown,
  callback?: (response: any) => void,
): void {
  const action = (message as Record<string, unknown>)?.action ?? "unknown";
  console.log(`[CS] sendMessage → ${action}`);
  if (teardownIfDead()) {
    console.warn(`[CS] sendMessage → ${action} — extension context dead, skipping`);
    callback?.(undefined);
    return;
  }
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      const msg = chrome.runtime.lastError.message || "";
      console.warn(`[CS] sendMessage ← ${action} error:`, msg);
      if (msg.includes("Extension context invalidated")) {
        teardownIfDead();
        callback?.(undefined);
        return;
      }
    }
    callback?.(response);
  });
}
