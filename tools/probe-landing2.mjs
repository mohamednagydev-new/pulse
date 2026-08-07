import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));

await page.evaluate(() => localStorage.setItem('fitit_lang', 'ar')).catch(() => {});
await page.goto(`${BASE}/welcome`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('fitit_lang', 'ar'));
await page.goto(`${BASE}/welcome`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
await page.screenshot({ path: 'tools/e2e-shots/landing-v2-hero-ar.png' });
// scroll to the feature groups
await page.mouse.wheel(0, 3400);
await page.waitForTimeout(1000);
await page.screenshot({ path: 'tools/e2e-shots/landing-v2-groups-ar.png' });
await page.mouse.wheel(0, 900);
await page.waitForTimeout(900);
await page.screenshot({ path: 'tools/e2e-shots/landing-v2-groups2-ar.png' });
console.log('done');
await browser.close();
