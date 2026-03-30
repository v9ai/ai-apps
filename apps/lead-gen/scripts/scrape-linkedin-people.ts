/**
 * Scrape employees from LinkedIn company people pages and upsert as contacts.
 *
 * Auth: First run opens a visible browser for manual LinkedIn login and saves
 * session cookies to ~/.cache/lead-gen/linkedin-cookies.json. Subsequent runs
 * reuse the saved cookies (re-prompts only if the session has expired).
 *
 * Usage:
 *   pnpm linkedin:people                    # scrape all companies with linkedin_url
 *   pnpm linkedin:people --company-id=42    # single company
 *   pnpm linkedin:people --dry-run          # log only, no DB writes
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";
import type { BrowserContext, Page } from "playwright";
import { join, dirname } from "path";
import { homedir } from "os";
import { readFile, writeFile, mkdir } from "fs/promises";
import { isNotNull, eq } from "drizzle-orm";

// ── Config ────────────────────────────────────────────────────

const COOKIE_PATH = join(homedir(), ".cache/lead-gen/linkedin-cookies.json");
const DELAY_BETWEEN_COMPANIES_MS = 4000;
const MAX_SCROLLS = 40;
const SCROLL_PAUSE_MS = 1800;
const STABLE_READS_NEEDED = 3;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// ── Types ─────────────────────────────────────────────────────

interface LinkedInPerson {
  profileUrl: string;
  name: string;
  headline: string | null;
}

// ── Auth helpers ──────────────────────────────────────────────

async function loadCookies(context: BrowserContext): Promise<boolean> {
  try {
    const raw = await readFile(COOKIE_PATH, "utf-8");
    const cookies = JSON.parse(raw);
    await context.addCookies(cookies);
    return true;
  } catch {
    return false;
  }
}

async function saveCookies(context: BrowserContext): Promise<void> {
  await mkdir(dirname(COOKIE_PATH), { recursive: true });
  await writeFile(COOKIE_PATH, JSON.stringify(await context.cookies(), null, 2));
  console.log(`Cookies saved → ${COOKIE_PATH}`);
}

async function isSessionValid(page: Page): Promise<boolean> {
  try {
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    const url = page.url();
    return (
      !url.includes("/login") &&
      !url.includes("/signup") &&
      !url.includes("/checkpoint")
    );
  } catch {
    return false;
  }
}

async function waitForManualLogin(page: Page): Promise<void> {
  console.log(
    "\n=> Browser opened. Please log in to LinkedIn and wait for the feed to load.\n" +
      "   The script will continue automatically.\n",
  );
  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForURL("**/feed/**", { timeout: 180_000 });
  console.log("=> Logged in successfully.\n");
}

// ── Extraction ────────────────────────────────────────────────

async function scrollAndExtract(page: Page): Promise<LinkedInPerson[]> {
  // Wait for initial people cards to appear
  await page.waitForTimeout(2500);

  let stableCount = 0;
  let lastCount = 0;

  for (let i = 0; i < MAX_SCROLLS; i++) {
    const count: number = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.querySelectorAll('a[href*="/in/"]').length;
    });

    if (count === lastCount) {
      stableCount++;
      if (stableCount >= STABLE_READS_NEEDED) break;
    } else {
      stableCount = 0;
      lastCount = count;
    }

    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }

  const people = await page.evaluate<LinkedInPerson[]>(() => {
    const seen = new Set<string>();
    const result: LinkedInPerson[] = [];

    document.querySelectorAll<HTMLAnchorElement>('a[href*="/in/"]').forEach(
      (a) => {
        const href = a.href ?? "";
        // Normalize: strip query params and trailing slash
        const profileUrl = href.split("?")[0].replace(/\/$/, "");

        // Only accept /in/{username} shaped URLs
        if (!/\/in\/[^/]+$/.test(profileUrl)) return;
        if (seen.has(profileUrl)) return;
        seen.add(profileUrl);

        // Name: prefer aria-hidden span inside the link
        const nameEl =
          a.querySelector('span[aria-hidden="true"]') ??
          a.querySelector("span");
        const name = nameEl?.textContent?.trim() ?? a.textContent?.trim() ?? "";
        if (!name) return;

        // Headline: look in the card container for subtitle/caption text
        const card =
          a.closest("li") ??
          a.closest('[class*="card"]') ??
          a.parentElement?.parentElement;
        const headlineEl = card?.querySelector<HTMLElement>(
          '[class*="subtitle"] span[aria-hidden="true"], ' +
            '[class*="caption"] span[aria-hidden="true"], ' +
            '[class*="subtitle"] span:first-child, ' +
            '[class*="caption"] span:first-child',
        );
        const headline = headlineEl?.textContent?.trim() || null;

        result.push({ profileUrl, name, headline });
      },
    );

    return result;
  });

  return people;
}

// ── DB upsert ─────────────────────────────────────────────────

async function upsertContacts(
  people: LinkedInPerson[],
  companyId: number,
  dryRun: boolean,
): Promise<number> {
  if (people.length === 0) return 0;

  if (dryRun) {
    console.log(`  [dry-run] Would upsert ${people.length} contacts`);
    for (const p of people.slice(0, 5)) {
      console.log(`    ${p.name} — ${p.headline ?? "(no headline)"} — ${p.profileUrl}`);
    }
    if (people.length > 5)
      console.log(`    … and ${people.length - 5} more`);
    return people.length;
  }

  const { db } = await import("@/db");
  const { contacts } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  let count = 0;
  for (const p of people) {
    const parts = p.name.split(" ");
    const firstName = parts[0] ?? "";
    const lastName = parts.slice(1).join(" ");

    try {
      // Check for existing contact by linkedin_url to avoid duplicates
      const existing = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.linkedin_url, p.profileUrl))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(contacts)
          .set({
            first_name: firstName,
            last_name: lastName,
            ...(p.headline != null && { position: p.headline }),
            company_id: companyId,
          })
          .where(eq(contacts.id, existing[0]!.id));
      } else {
        await db.insert(contacts).values({
          first_name: firstName,
          last_name: lastName,
          linkedin_url: p.profileUrl,
          position: p.headline ?? undefined,
          company_id: companyId,
          emails: "[]",
          tags: "[]",
          nb_flags: "[]",
        });
      }
      count++;
    } catch (err) {
      console.error(`  Error upserting ${p.profileUrl}:`, err);
    }
  }
  return count;
}

// ── Main ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const companyIdArg = args
  .find((a) => a.startsWith("--company-id="))
  ?.split("=")[1];
const singleCompanyId = companyIdArg ? parseInt(companyIdArg, 10) : undefined;

(async () => {
  // Load company list from DB
  const { db } = await import("@/db");
  const { companies } = await import("@/db/schema");

  const rows = singleCompanyId
    ? await db
        .select({
          id: companies.id,
          name: companies.name,
          linkedin_url: companies.linkedin_url,
        })
        .from(companies)
        .where(eq(companies.id, singleCompanyId))
    : await db
        .select({
          id: companies.id,
          name: companies.name,
          linkedin_url: companies.linkedin_url,
        })
        .from(companies)
        .where(isNotNull(companies.linkedin_url));

  if (rows.length === 0) {
    console.log("No companies found.");
    process.exit(0);
  }

  console.log(
    `Found ${rows.length} compan${rows.length === 1 ? "y" : "ies"} to scrape${dryRun ? " (dry-run)" : ""}.\n`,
  );

  // Launch browser (headful for better LinkedIn compatibility)
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();

  // Auth: try saved cookies first
  const cookiesLoaded = await loadCookies(context);
  let sessionOk = cookiesLoaded ? await isSessionValid(page) : false;

  if (!sessionOk) {
    await waitForManualLogin(page);
    await saveCookies(context);
  } else {
    console.log("Session valid, proceeding headlessly.\n");
  }

  let totalImported = 0;

  for (let i = 0; i < rows.length; i++) {
    const company = rows[i]!;
    const base = company.linkedin_url!.replace(/\/$/, "");
    const peopleUrl = `${base}/people/`;

    console.log(`[${i + 1}/${rows.length}] ${company.name}`);
    console.log(`  URL: ${peopleUrl}`);

    try {
      const response = await page.goto(peopleUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const currentUrl = page.url();

      if (
        currentUrl.includes("/login") ||
        currentUrl.includes("/signup") ||
        currentUrl.includes("/checkpoint")
      ) {
        console.log("  Session expired — saving cookies and stopping.");
        await saveCookies(context);
        break;
      }

      if (
        response?.status() === 404 ||
        currentUrl.includes("/unavailable") ||
        currentUrl.includes("/404")
      ) {
        console.log("  People page unavailable, skipping.");
        continue;
      }

      const people = await scrollAndExtract(page);
      console.log(`  Found: ${people.length} people`);

      const upserted = await upsertContacts(people, company.id, dryRun);
      totalImported += upserted;
      if (!dryRun) console.log(`  Upserted: ${upserted}`);
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : err}`);
    }

    // Polite delay between companies (skip after last)
    if (i < rows.length - 1) {
      await page.waitForTimeout(DELAY_BETWEEN_COMPANIES_MS);
    }
  }

  await saveCookies(context);
  await browser.close();

  console.log(`\nDone. Total contacts ${dryRun ? "found" : "imported"}: ${totalImported}`);
  process.exit(0);
})();
