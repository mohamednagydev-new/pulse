/** Debug why the Meta pixel sends nothing: log fb-related requests,
 *  console errors, and window.fbq state on the live site. */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'https://pulse.geddo.online';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
});

page.on('request', (req) => {
  const u = req.url();
  if (/facebook|fbevents|fbcdn/i.test(u)) console.log('REQ:', u.slice(0, 140));
});
page.on('requestfailed', (req) => {
  const u = req.url();
  if (/facebook|fbevents/i.test(u)) console.log('FAILED:', u.slice(0, 100), '--', req.failure()?.errorText);
});
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text().slice(0, 200));
});

await page.goto(`${BASE}/welcome`, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);

const state = await page.evaluate(() => ({
  fbqType: typeof window.fbq,
  fbqLoaded: window.fbq && window.fbq.loaded,
  queueLen: window.fbq && window.fbq.queue ? window.fbq.queue.length : null,
  scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src).filter((s) => /facebook|fbevents/i.test(s)),
}));
console.log('fbq state:', JSON.stringify(state));
await browser.close();
