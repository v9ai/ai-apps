console.log("background script loaded");

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
