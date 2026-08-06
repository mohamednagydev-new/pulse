import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'https://pulse.geddo.online';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));

// Guest browse straight to wellness
await page.goto(`${BASE}/wellness`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
console.log('url:', page.url());
await page.screenshot({ path: 'tools/e2e-shots/probe-wellness-home.png' });

// List every link on the screen with its href
const links = await page.evaluate(() =>
  [...document.querySelectorAll('a[href]')].map((a) => `${a.getAttribute('href')} :: ${(a.textContent || '').trim().slice(0, 40)}`),
);
console.log('links on /wellness:');
links.forEach((l) => console.log('  ', l));

// Tap the Kitchen quick tile
const kitchen = page.locator('a[href="/wellness/kitchen"]').first();
if (await kitchen.count()) {
  await kitchen.click();
  await page.waitForTimeout(2500);
  console.log('after kitchen tap, url:', page.url());
  await page.screenshot({ path: 'tools/e2e-shots/probe-wellness-kitchen.png' });
} else {
  console.log('NO /wellness/kitchen link found!');
}

await browser.close();
