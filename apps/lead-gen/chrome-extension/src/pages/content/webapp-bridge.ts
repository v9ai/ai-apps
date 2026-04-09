// Bridge between the lead-gen web app (postMessage) and the extension background service worker

function isExtensionAlive(): boolean {
  return !!chrome.runtime?.id;
}

// Relay messages from the web app → background
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "lead-gen-ext") return;
  if (!isExtensionAlive()) return;
  chrome.runtime.sendMessage(e.data, (response) => {
    if (chrome.runtime.lastError) return;
    window.postMessage({ source: "lead-gen-ext-reply", ...response }, "*");
  });
});

// Relay progress/result messages from background → web app
chrome.runtime.onMessage.addListener((msg) => {
  if (!isExtensionAlive()) return;
  if (msg.source === "lead-gen-bg") {
    window.postMessage(msg, "*");
  }
});

export {};
