import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) {
  process.stderr.write('Usage: node screenshot.mjs <url>\n');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
const buf = await page.screenshot({ fullPage: false, type: 'png' });
process.stdout.write(buf);
await browser.close();
