console.log("background script loaded");

// ── Dev hot-reload via WebSocket ──────────────────────────────────────
if (import.meta.env.DEV) {
  const connect = () => {
    const ws = new WebSocket("ws://localhost:35729");
    ws.onmessage = (event) => {
      if (event.data === "reload") {
        console.log("[dev-reload] Reloading extension…");
        chrome.runtime.reload();
      }
    };
    ws.onclose = () => {
      // Reconnect after 2s if server restarts
      setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
  };
  connect();
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  // Handle pagination progress updates
  if (message.action === "paginationProgress") {
    console.log(
      `Pagination progress: Page ${message.currentPage}/${message.totalPages}, Jobs: ${message.jobsCollected}`,
    );
    // No response needed for progress updates
    return false;
  }

  // Return false to indicate we're not sending a response
  return false;
});
