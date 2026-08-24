// App Store screenshots: 6.9" iPhone (1320x2868) = 440x956 logical @3x,
// captured from production as the reviewer account.
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'F:/FIT_IT/deploy/appstore-screens';
fs.mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { path: '/', name: '1-home', wait: 6000 },
  { path: '/programs', name: '2-train', wait: 5000 },
  { path: '/tracker', name: '3-food', wait: 5000 },
  { path: '/community', name: '4-community', wait: 6000 },
  { path: '/leagues', name: '5-league', wait: 5000 },
  { path: '/achievements', name: '6-challenges', wait: 5000 },
  { path: '/progress', name: '7-progress', wait: 5000 },
  { path: '/group', name: '8-live', wait: 5000 },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

await page.goto('https://pulse.geddo.online/login', { waitUntil: 'networkidle', timeout: 60000 });
// Clean frames: snooze the install + push nudges before anything renders.
await page.evaluate(() => {
  localStorage.setItem('pulse_install_snooze', String(Date.now()));
  localStorage.setItem('pulse_push_nudge_snooze', String(Date.now()));
});
await page.fill('input[type="email"]', 'playreview@geddo.online');
await page.fill('input[type="password"]', 'PulseReview#2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(6000);
console.log('after login:', page.url());

for (const s of SHOTS) {
  try {
    await page.goto(`https://pulse.geddo.online${s.path}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(s.wait);
    await page.screenshot({ path: `${OUT}/${s.name}.png` });
    console.log('shot', s.name);
  } catch (e) {
    console.log('FAIL', s.name, String(e).slice(0, 80));
  }
}
await browser.close();
console.log('done →', OUT);
