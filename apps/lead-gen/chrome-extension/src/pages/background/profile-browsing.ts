// ── Profile Browsing Engine ──────────────────────────────────────────

import { gqlRequest } from "../../services/graphql";
import { randomDelay, waitForTabLoad, clickSeeMore } from "./tab-utils";

let browseCancelled = false;

export function setBrowseCancelled(value: boolean) {
  browseCancelled = value;
}

function extractProfileData(tabId: number): Promise<{
  name: string;
  headline: string;
  location: string;
  linkedinUrl: string;
} | null> {
  return chrome.scripting
    .executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        const nameEl =
          document.querySelector("h1.text-heading-xlarge") ||
          document.querySelector("h1");
        const headlineEl = document.querySelector(
          ".text-body-medium.break-words",
        );
        const locationEl = document.querySelector(
          "span.text-body-small.inline.t-black--light.break-words",
        );

        return {
          name: nameEl?.textContent?.trim() || "",
          headline: headlineEl?.textContent?.trim() || "",
          location: locationEl?.textContent?.trim() || "",
          linkedinUrl: window.location.href.split("?")[0],
        };
      },
    })
    .then((results) => results?.[0]?.result ?? null)
    .catch(() => null);
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseHeadline(headline: string): {
  position: string;
  company: string;
} {
  // Try splitting on common separators: " at ", " @ ", " | "
  for (const sep of [" at ", " @ ", " | "]) {
    const idx = headline.toLowerCase().indexOf(sep);
    if (idx > 0) {
      return {
        position: headline.slice(0, idx).trim(),
        company: headline.slice(idx + sep.length).trim(),
      };
    }
  }
  return { position: headline, company: "" };
}

export async function browseProfiles(
  tabId: number,
  profiles: string[],
  returnUrl: string,
) {
  browseCancelled = false;
  let saved = 0;

  for (let i = 0; i < profiles.length; i++) {
    if (browseCancelled) break;

    const profileUrl = profiles[i];
    console.log(
      `[BrowseProfiles] ${i + 1}/${profiles.length}: ${profileUrl}`,
    );

    // Navigate to profile
    try {
      await chrome.tabs.update(tabId, { url: profileUrl });
    } catch {
      console.warn("[BrowseProfiles] Tab closed during navigation, aborting");
      break;
    }
    await waitForTabLoad(tabId);

    // Wait for LinkedIn SPA content to render
    await randomDelay(2500);

    // Expand "See more" sections
    const expanded = await clickSeeMore(tabId);
    if (expanded > 0) {
      console.log(`[BrowseProfiles] Clicked ${expanded} "See more" button(s)`);
      await randomDelay(800);
    }

    // Extract profile data
    const data = await extractProfileData(tabId);

    if (data && data.name) {
      const { firstName, lastName } = parseName(data.name);
      const { position, company } = parseHeadline(data.headline);

      // Send progress to content script (may fail if on profile page — that's fine)
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: "browseProgress",
          current: i + 1,
          total: profiles.length,
          name: firstName,
        });
      } catch { /* content script not on search page */ }

      // Save contact via GraphQL
      try {
        const result = await gqlRequest(
          `mutation CreateContact($input: CreateContactInput!) {
            createContact(input: $input) { id firstName lastName }
          }`,
          {
            input: {
              firstName,
              lastName: lastName || undefined,
              linkedinUrl: data.linkedinUrl,
              position: position || undefined,
              tags: ["linkedin-browse", "ai-recruiter"],
            },
          },
        );

        if (result.data?.createContact?.id) {
          saved++;
          console.log(
            `[BrowseProfiles] Saved: ${firstName} ${lastName} (${position} ${company ? "at " + company : ""})`,
          );
        } else if (result.errors) {
          console.warn(
            `[BrowseProfiles] GQL error for ${data.name}:`,
            result.errors[0].message,
          );
        }
      } catch (err) {
        console.error(`[BrowseProfiles] Save failed for ${data.name}:`, err);
      }
    }

    // Dwell — remaining time up to ~5s total (already spent ~2.5s waiting for render)
    await randomDelay(2500);
  }

  // Navigate back to search results
  await chrome.tabs.update(tabId, { url: returnUrl });
  await waitForTabLoad(tabId);

  // Wait for content script to re-inject, then send done message
  await randomDelay(2000);
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: "browseDone",
      saved,
    });
  } catch { /* content script may not be ready */ }

  console.log(
    `[BrowseProfiles] Complete. Saved ${saved}/${profiles.length} contacts.`,
  );
}
