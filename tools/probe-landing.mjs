import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));

await page.goto(`${BASE}/welcome`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/e2e-shots/landing-1-hero.png' });
await page.mouse.wheel(0, 900);
await page.waitForTimeout(900);
await page.screenshot({ path: 'tools/e2e-shots/landing-2-features.png' });
await page.mouse.wheel(0, 1100);
await page.waitForTimeout(900);
await page.screenshot({ path: 'tools/e2e-shots/landing-3-more.png' });
await page.mouse.wheel(0, 1600);
await page.waitForTimeout(900);
await page.screenshot({ path: 'tools/e2e-shots/landing-4-cta.png' });

// Arabic
await page.evaluate(() => localStorage.setItem('fitit_lang', 'ar'));
await page.goto(`${BASE}/welcome`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
await page.screenshot({ path: 'tools/e2e-shots/landing-5-ar.png' });
console.log('done');
await browser.close();
