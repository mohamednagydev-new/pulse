// App Store screenshots, captured from production as the reviewer account.
//   default    → 6.9" iPhone (1320x2868) = 440x956 logical @3x
//   --ipad     → 13"  iPad  (2064x2752) = 1032x1376 logical @2x
import { chromium } from 'playwright';
import fs from 'fs';

const IPAD = process.argv.includes('--ipad');
// --iphone65: 6.5" size class (1284x2778) = 428x926 logical @3x — what App
// Store Connect demands when the app record uses the older size slots.
const P65 = process.argv.includes('--iphone65');
const OUT = IPAD ? 'F:/FIT_IT/deploy/appstore-screens-ipad' : P65 ? 'F:/FIT_IT/deploy/appstore-screens-65' : 'F:/FIT_IT/deploy/appstore-screens';
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
  viewport: IPAD ? { width: 1032, height: 1376 } : P65 ? { width: 428, height: 926 } : { width: 440, height: 956 },
  deviceScaleFactor: IPAD ? 2 : 3,
  isMobile: true,
  hasTouch: true,
  userAgent: IPAD
    ? 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});

await page.goto('https://pulse.geddo.online/login', { waitUntil: 'networkidle', timeout: 60000 });
// Clean frames: snooze the install + push nudges before anything renders.
await page.evaluate(() => {
  localStorage.setItem('pulse_install_snooze', String(Date.now()));
  localStorage.setItem('pulse_push_nudge_snooze', String(Date.now()));
  localStorage.setItem('pulse_installed', '1'); // hides the install FAB too
});
await page.fill('input[type="email"]', 'playreview@geddo.online');
await page.fill('input[type="password"]', 'PulseReview#2026');
await page.click('button[type="submit"]');
await page.waitForTimeout(6000);
console.log('after login:', page.url());

for (const s of SHOTS) {
  try {
    await page.goto(`https://pulse.geddo.online${s.path}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    // At iPad width the desktop backdrop text clips behind the phone column.
    // For store shots, shrink it to FIT instead of hiding: a branded surround
    // reads as a designed tablet layout, not letterboxing (Apple 2.3.3).
    if (IPAD) await page.addStyleTag({ content: `
      .pointer-events-none.fixed.inset-0.z-0{display:flex!important;padding-left:1.75rem;padding-right:1.75rem}
      .pointer-events-none.fixed.inset-0.z-0 .max-w-sm{max-width:15rem}
      .pointer-events-none.fixed.inset-0.z-0 .text-6xl{font-size:2.4rem}
      .pointer-events-none.fixed.inset-0.z-0 .text-xl{font-size:0.9rem;margin-top:0.5rem}
      .pointer-events-none.fixed.inset-0.z-0 .text-2xl{font-size:1.05rem}
      .pointer-events-none.fixed.inset-0.z-0 .space-y-3{margin-top:1.5rem}
      .pointer-events-none.fixed.inset-0.z-0 .space-y-3 p{font-size:0.78rem}
      .pointer-events-none.fixed.inset-0.z-0 .text-\\[9rem\\]{font-size:4.2rem;line-height:0.9}
    ` });
    await page.waitForTimeout(s.wait);
    await page.screenshot({ path: `${OUT}/${s.name}.png` });
    console.log('shot', s.name);
  } catch (e) {
    console.log('FAIL', s.name, String(e).slice(0, 80));
  }
}
await browser.close();
console.log('done →', OUT);
