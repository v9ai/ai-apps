import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  const page = await ctx.newPage();
  await page.goto("https://www.brickeconomy.com/", { waitUntil: "domcontentloaded" });

  console.log("Cookies after homepage load:");
  console.log(await ctx.cookies());

  // Look for currency selector / dropdown
  console.log("\nLooking for currency UI...");
  const candidates = [
    "select[name*=currency]",
    "select[id*=currency]",
    "a[href*='currency']",
    "a[href*='setculture']",
    "a[href*='setculture.aspx']",
    ".currency",
    "#ddlCurrency",
    "[data-currency]",
  ];
  for (const sel of candidates) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`  ${sel}: ${count} matches`);
      const first = await page.locator(sel).first().evaluate((el) => el.outerHTML).catch(() => null);
      if (first) console.log(`    first: ${first.slice(0, 300)}`);
    }
  }

  // Search HTML for "USD" near href/option to find the right URL pattern
  const html = await page.content();
  const usdMatches = html.match(/[^\s"'<>]{0,80}USD[^\s"'<>]{0,80}/g);
  console.log("\nUSD-adjacent strings:", usdMatches?.slice(0, 15));

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
