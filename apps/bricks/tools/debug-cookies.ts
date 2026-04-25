import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  const page = await ctx.newPage();
  await page.goto(
    "https://www.brickeconomy.com/set/10323-1/lego-pac-man-arcade",
    { waitUntil: "domcontentloaded", timeout: 25_000 },
  );

  console.log("Cookies after set page load:");
  console.log(await ctx.cookies());

  const html = await page.content();
  const dollarMatches = html.match(/[\$£€]\s*[0-9.,]+/g);
  console.log("\nCurrency tokens in HTML:", dollarMatches?.slice(0, 30));

  // Look for currency switcher - common patterns on .NET sites
  const candidates = [
    "a[href*='currency']",
    "a[href*='Currency']",
    "a[href*='setlocale']",
    "a[href*='SetCulture']",
    "a[href*='setcurrency']",
    "select[id*=Currency]",
    "select[id*=currency]",
    ".currency-switch",
    "[onclick*='currency']",
    "[onclick*='Currency']",
  ];
  for (const sel of candidates) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`\n  ${sel}: ${count} matches`);
      for (let i = 0; i < Math.min(3, count); i++) {
        const html = await page.locator(sel).nth(i).evaluate((el) => el.outerHTML).catch(() => null);
        if (html) console.log(`    [${i}]: ${html.slice(0, 300)}`);
      }
    }
  }

  // Search HTML for hints
  const usdMatches = html.match(/[^\s"'<>]{0,40}(USD|EUR|GBP)[^\s"'<>]{0,40}/g);
  console.log("\nCurrency code references:", usdMatches?.slice(0, 20));

  // Check for hidden currency/locale info
  const localeMatches = html.match(/data-currency="[^"]+"|data-locale="[^"]+"/g);
  console.log("\nData attrs:", localeMatches?.slice(0, 10));

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
