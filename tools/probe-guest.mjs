import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'https://pulse.geddo.online';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

let unauthorized = 0;
page.on('response', (r) => {
  if (r.status() === 401 && r.url().includes('/api/') && !r.url().includes('/api/auth/refresh')) {
    console.log('   401:', r.url().replace(BASE, ''));
    unauthorized += 1;
  }
});
page.on('pageerror', (e) => console.log('   PAGEERROR:', String(e).slice(0, 200)));

// Skip onboarding
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('fitit_onboarded', '1'));

const routes = ['/programs', '/wellness', '/wellness/kitchen', '/exercises', '/search', '/gyms', '/help'];
for (const route of routes) {
  console.log(`\n== ${route} ==`);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  console.log('   landed at:', page.url().replace(BASE, '') || '/');
  const redBoxes = await page.locator('.bg-red-50').allInnerTexts().catch(() => []);
  redBoxes.forEach((t) => console.log('   RED ERROR BOX:', t.replace(/\s+/g, ' ').slice(0, 120)));
  const toasts = await page.locator('[class*="toast"], [role="alert"]').allInnerTexts().catch(() => []);
  toasts.forEach((t) => t.trim() && console.log('   TOAST:', t.replace(/\s+/g, ' ').slice(0, 120)));
}

// Depth: program detail + recipe + article as guest
console.log('\n== depth ==');
const programs = await page.evaluate(async () => (await fetch('/api/programs')).json());
if (programs?.[0]) {
  await page.goto(`${BASE}/programs/${programs[0].id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  console.log('   program detail landed at:', page.url().replace(BASE, ''));
  const red = await page.locator('.bg-red-50').allInnerTexts().catch(() => []);
  red.forEach((t) => console.log('   RED ERROR BOX:', t.replace(/\s+/g, ' ').slice(0, 120)));
}
const cats = await page.evaluate(async () => (await fetch('/api/categories?kind=recipe')).json());
if (cats?.[0]) {
  const cat = await page.evaluate(async (id) => (await fetch(`/api/categories/${id}`)).json(), cats[0].id);
  if (cat.recipes?.[0]) {
    await page.goto(`${BASE}/recipe/${cat.recipes[0].id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    console.log('   recipe landed at:', page.url().replace(BASE, ''));
    const red = await page.locator('.bg-red-50').allInnerTexts().catch(() => []);
    red.forEach((t) => console.log('   RED ERROR BOX:', t.replace(/\s+/g, ' ').slice(0, 120)));
  }
}

console.log(`\ntotal 401s: ${unauthorized}`);
await browser.close();
