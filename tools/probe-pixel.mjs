/**
 * Fires the Meta pixel events on the LIVE site by doing a real test signup,
 * and proves delivery by capturing the browser's requests to facebook.com/tr.
 * Run once to make CompleteRegistration selectable in Ads Manager.
 *
 *   node tools/probe-pixel.mjs
 *
 * Creates pixeltest_<n>@test.local — delete it afterwards in Admin → Users.
 */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'https://pulse.geddo.online';
const EMAIL = `pixeltest_${Math.floor(Date.now() / 1000)}@test.local`;
const PASS = 'Pixel!Test1234';

const browser = await chromium.launch();
// Phone viewport — otherwise the DesktopGate overlay blocks the form.
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
});

const fired = [];
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('facebook.com/tr')) {
    const ev = new URL(url).searchParams.get('ev');
    if (ev) fired.push(ev);
  }
});

// Landing → PageView
await page.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

// Register → CompleteRegistration
await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
// The boot splash (fixed z-[100] overlay) swallows clicks until bootstrap ends.
await page.locator('div.z-\\[100\\]').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
const inputs = page.locator('input[type="text"]');
await inputs.nth(0).fill('Pixel');
await inputs.nth(1).fill('Test');
await page.locator('input[autocomplete="email"]').fill(EMAIL);
await page.locator('input[autocomplete="new-password"]').fill(PASS);
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(6000); // let the pixel request leave

console.log('account:', EMAIL);
console.log('pixel events sent to facebook.com/tr:', fired.length ? fired.join(', ') : 'NONE');
console.log(fired.includes('CompleteRegistration') ? 'OK — CompleteRegistration delivered.' : 'PROBLEM — CompleteRegistration did not fire.');
await browser.close();
