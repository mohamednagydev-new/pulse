/** Reproduce: open a chat room, press TopBar back — user reports blank screen. */
import { chromium } from 'playwright';

const B = 'http://localhost:5173';
const browser = await chromium.launch({ args: ['--disable-http2'] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true,
  hasTouch: true,
});
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE ERR:', m.text().slice(0, 800)));
page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 800)));

// Login
await page.goto(`${B}/login`, { waitUntil: 'domcontentloaded' });
await page.locator('div.z-\\[100\\]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);
await page.locator('input[autocomplete="email"], input[type="email"]').first().fill('loc_a_1786454958@test.local');
await page.locator('input[type="password"]').first().fill('Probe!1234x');
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(4000);
console.log('after login url:', page.url());

// Chat list → open room
await page.goto(`${B}/chat`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/e2e-shots/chatback-1-list.png' });
await page.goto(`${B}/chat/cmsop5pb00014c7fg63ot8vgm`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/e2e-shots/chatback-2-room.png' });

// TopBar back button (ChevronLeft in header)
await page.locator('header button').first().click();
await page.waitForTimeout(2000);
console.log('after back url:', page.url());
await page.screenshot({ path: 'tools/e2e-shots/chatback-3-back.png' });

const bodyText = (await page.locator('body').innerText().catch(() => '')).trim();
console.log('body text length after back:', bodyText.length, bodyText.slice(0, 80).replace(/\n/g, ' | '));
await browser.close();
