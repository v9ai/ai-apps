/**
 * Pure function injected via chrome.scripting.executeScript into LinkedIn activity pages.
 * Extracts posts from the DOM and returns structured data.
 *
 * Runs in MAIN world on: linkedin.com/in/username/recent-activity/all/
 */
export function extractLinkedInPosts(): Array<{
  postUrl: string | null;
  postText: string;
  postedDate: string | null;
  reactionsCount: number;
  commentsCount: number;
  repostsCount: number;
  mediaType: string;
  isRepost: boolean;
  originalAuthor: string | null;
  authorName: string | null;
  authorUrl: string | null;
  authorSubtitle: string | null;
}> {
  const posts: ReturnType<typeof extractLinkedInPosts> = [];

  const postElements = document.querySelectorAll(
    ".feed-shared-update-v2, .occludable-update",
  );

  for (const postEl of postElements) {
    // Skip ads
    if (postEl.querySelector(".feed-shared-update-v2__ad-badge")) continue;
    // Skip "Suggested" content
    if (postEl.querySelector('[data-test-id="feed-shared-update-v2__sponsored"]'))
      continue;

    // ── Post text ──
    const textEl = postEl.querySelector(
      ".feed-shared-update-v2__description, " +
        ".update-components-text, " +
        ".feed-shared-text__text-view, " +
        ".feed-shared-inline-show-more-text",
    );
    const postText = textEl?.textContent?.trim() || "";

    // ── Date ──
    const timeEl = postEl.querySelector("time");
    const postedDate =
      timeEl?.getAttribute("datetime") ||
      postEl
        .querySelector(".update-components-actor__sub-description")
        ?.textContent?.trim() ||
      null;

    // ── Reactions count ──
    const reactionsEl = postEl.querySelector(
      '.social-details-social-counts__reactions-count, [data-test-id="social-actions__reaction-count"]',
    );
    const reactionsCount =
      parseInt((reactionsEl?.textContent || "0").replace(/[^0-9]/g, "")) || 0;

    // ── Comments count ──
    const commentsBtn = Array.from(postEl.querySelectorAll("button, a")).find(
      (b) =>
        /comment/i.test(b.textContent || "") &&
        /\d/.test(b.textContent || ""),
    );
    const commentsCount =
      parseInt((commentsBtn?.textContent || "0").replace(/[^0-9]/g, "")) || 0;

    // ── Reposts count ──
    const repostsBtn = Array.from(postEl.querySelectorAll("button, a")).find(
      (b) =>
        /repost/i.test(b.textContent || "") &&
        /\d/.test(b.textContent || ""),
    );
    const repostsCount =
      parseInt((repostsBtn?.textContent || "0").replace(/[^0-9]/g, "")) || 0;

    // ── Media type ──
    let mediaType = "none";
    if (postEl.querySelector("video, .update-components-linkedin-video"))
      mediaType = "video";
    else if (postEl.querySelector(".update-components-article"))
      mediaType = "article";
    else if (postEl.querySelector(".update-components-document"))
      mediaType = "document";
    else if (postEl.querySelector(".update-components-poll"))
      mediaType = "poll";
    else if (
      postEl.querySelector(
        ".feed-shared-image, .update-components-image, .ivm-image-view-model",
      )
    )
      mediaType = "image";

    // ── Repost detection ──
    const headerEl = postEl.querySelector(
      ".update-components-header__text-view, .update-components-header",
    );
    const isRepost = /reposted/i.test(headerEl?.textContent || "");
    const originalAuthor = isRepost
      ? (postEl
          .querySelector(".update-components-actor__name")
          ?.textContent?.trim() || null)
      : null;

    // ── Author info ──
    const authorNameEl = postEl.querySelector(".update-components-actor__name");
    const authorName = authorNameEl?.textContent?.trim() || null;
    const authorLinkEl = postEl.querySelector<HTMLAnchorElement>(
      ".update-components-actor__container-link, .update-components-actor__meta-link",
    );
    const authorUrl = authorLinkEl?.href?.split("?")[0] || null;
    const authorSubEl = postEl.querySelector(
      ".update-components-actor__description, .update-components-actor__subtitle",
    );
    const authorSubtitle = authorSubEl?.textContent?.trim() || null;

    // ── Post URL from data-urn ──
    const urn =
      postEl.getAttribute("data-urn") ||
      postEl.querySelector("[data-urn]")?.getAttribute("data-urn");
    let postUrl: string | null = null;
    if (urn) {
      postUrl = `https://www.linkedin.com/feed/update/${urn}/`;
    }

    posts.push({
      postUrl,
      postText,
      postedDate,
      reactionsCount,
      commentsCount,
      repostsCount,
      mediaType,
      isRepost,
      originalAuthor,
      authorName,
      authorUrl,
      authorSubtitle,
    });
  }

  return posts;
}

/**
 * Clicks all "see more" buttons to expand truncated post text.
 * Returns the number of buttons clicked.
 */
export function clickAllSeeMore(): number {
  let clicked = 0;
  const buttons = document.querySelectorAll<HTMLElement>("button, a");
  buttons.forEach((el) => {
    const text = el.textContent?.trim().toLowerCase() || "";
    if (
      (text === "see more" ||
        text === "…see more" ||
        text === "...see more") &&
      el.offsetParent !== null
    ) {
      el.click();
      clicked++;
    }
  });
  return clicked;
}

/**
 * Scrolls to bottom and returns current document height.
 */
export function scrollToBottom(): number {
  window.scrollTo(0, document.body.scrollHeight);
  return document.body.scrollHeight;
}

/**
 * Returns the number of post elements currently in the DOM.
 */
export function countPostElements(): number {
  return document.querySelectorAll(
    ".feed-shared-update-v2, .occludable-update",
  ).length;
}
