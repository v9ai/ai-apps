// Bridge between the lead-gen web app (postMessage) and the extension background service worker

// Relay messages from the web app → background
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.source !== "lead-gen-ext") return;
  chrome.runtime.sendMessage(e.data, (response) => {
    if (chrome.runtime.lastError) return; // popup/background not available
    window.postMessage({ source: "lead-gen-ext-reply", ...response }, "*");
  });
});

// Relay progress/result messages from background → web app
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.source === "lead-gen-bg") {
    window.postMessage(msg, "*");
  }
});

export {};
