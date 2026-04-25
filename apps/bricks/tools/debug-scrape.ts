import { chromium } from "playwright";

const SET_NUM = process.argv[2] ?? "10323-1";
const BASE = "https://www.brickeconomy.com";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await ctx.addCookies([
    { name: "BeCurrency", value: "USD", domain: ".brickeconomy.com", path: "/" },
    { name: "BeCountry", value: "US", domain: ".brickeconomy.com", path: "/" },
  ]);
  const page = await ctx.newPage();

  console.log(`# Search for ${SET_NUM}`);
  await page.goto(`${BASE}/search?query=${encodeURIComponent(SET_NUM)}`, {
    waitUntil: "domcontentloaded",
    timeout: 25_000,
  });
  console.log("URL after search:", page.url());

  const link = await page
    .locator(`a[href*="/set/${SET_NUM}/"]`)
    .first()
    .getAttribute("href")
    .catch(() => null);
  console.log("First /set/ link:", link);

  if (link) {
    const target = link.startsWith("http") ? link : `${BASE}${link}`;
    console.log(`# Navigate to ${target}`);
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 25_000 });
    console.log("URL after navigation:", page.url());
    console.log("Title:", await page.title());

    const text = await page.locator("body").innerText();
    console.log("---- BODY TEXT (first 8000 chars) ----");
    console.log(text.slice(0, 8000));
    console.log("---- END ----");

    // Try to find the structured Set Information / Pricing section.
    const html = await page.content();
    const pricingMatch = html.match(/Set pricing[\s\S]{0,3000}/i);
    console.log("---- PRICING SECTION RAW (first 2000 chars) ----");
    console.log(pricingMatch ? pricingMatch[0].slice(0, 2000) : "(not found)");
    console.log("---- END ----");

    // Look for price-shaped substrings
    const priceMatches = text.match(/[A-Z][a-z]+\s*(?:\([A-Z]{2}\))?\s*[$£€][0-9.,]+/g);
    console.log("Price-ish matches:", priceMatches?.slice(0, 30));
  }

  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
