import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('pulse_theme', 'dark');
  localStorage.setItem('fitit_onboarded', '1');
});

for (const [route, name] of [['/programs', 'dark-programs'], ['/wellness', 'dark-wellness'], ['/wellness/kitchen', 'dark-kitchen'], ['/help', 'dark-help']]) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `tools/e2e-shots/${name}.png` });
}
console.log('done');
await browser.close();
