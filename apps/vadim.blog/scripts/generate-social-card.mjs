/**
 * Generate social-card.png from social-card.svg using Playwright.
 * Usage: node scripts/generate-social-card.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, "../static/img/social-card.svg");
const outPath = resolve(__dirname, "../static/img/social-card.png");

const svgContent = readFileSync(svgPath, "utf-8");

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; }
    body { width: 1200px; height: 630px; overflow: hidden; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "networkidle" });
// Extra wait for font loading
await page.waitForTimeout(1000);
await page.screenshot({ path: outPath, type: "png" });
await browser.close();

console.log(`Generated ${outPath}`);
