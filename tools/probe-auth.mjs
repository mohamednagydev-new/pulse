import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));

// Default language (should be Arabic now — fresh storage)
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
console.log('default lang:', await page.evaluate(() => document.documentElement.lang + ' / ' + document.documentElement.dir));
await page.screenshot({ path: 'tools/e2e-shots/auth-login-ar.png' });

await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
await page.screenshot({ path: 'tools/e2e-shots/auth-register-ar.png' });
console.log('done');
await browser.close();
