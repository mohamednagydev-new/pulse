import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('fitit_onboarded', '1'));

// Light
await page.evaluate(() => localStorage.setItem('pulse_theme', 'light'));
await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/e2e-shots/texture-light-programs.png' });

// Dark
await page.evaluate(() => localStorage.setItem('pulse_theme', 'dark'));
await page.goto(`${BASE}/programs`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/e2e-shots/texture-dark-programs.png' });
console.log('done');
await browser.close();
