import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'https://pulse.geddo.online';
const ts = Date.now();
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${(e && e.stack ? e.stack : String(e)).slice(0, 3000)}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 1500)}`));
page.on('requestfailed', (r) => errors.push(`REQFAIL: ${r.failure()?.errorText} ${r.url().slice(-80)}`));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`HTTP${r.status()}: ${r.url().slice(-90)}`);
  if (/Challenge|challenge/.test(r.url())) console.log('  net:', r.status(), r.url().slice(-95));
});

// register
await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const inputs = page.locator('input');
await inputs.nth(0).fill('Probe');
await inputs.nth(1).fill('Chal');
await page.locator('input[autocomplete="email"]').fill(`probe_chal_${ts}@test.local`);
await page.locator('input[autocomplete="new-password"]').fill('Probe-1234');
await page.locator('button[type="submit"]').click();
await page.waitForURL(`${BASE}/`, { timeout: 15000 });
await page.waitForTimeout(3000);

// find a challenge card on Home
const link = page.locator('a[href^="/challenge/"]').first();
const found = await link.count();
console.log('challenge links on home:', found);
if (found) {
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForTimeout(7000);
  console.log('after open, url:', page.url());
  await page.screenshot({ path: 'tools/e2e-shots/probe-challenge-open.png' });
  console.log('body text:', (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400));

  // click Leaderboard tab
  const lb = page.getByText(/leaderboard/i).first();
  if (await lb.isVisible().catch(() => false)) {
    await lb.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tools/e2e-shots/probe-challenge-board.png' });
    console.log('board url:', page.url());
  } else console.log('leaderboard tab not visible');

  // browser back
  await page.goBack();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tools/e2e-shots/probe-challenge-back.png' });
  console.log('after back, url:', page.url());
  // second back (user may back twice)
  await page.goBack();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tools/e2e-shots/probe-challenge-back2.png' });
  console.log('after back2, url:', page.url());
}

console.log('\nerrors:', errors.length);
errors.forEach((e) => console.log(' ', e));
await browser.close();
