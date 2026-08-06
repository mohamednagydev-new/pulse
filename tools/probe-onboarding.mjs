import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE || 'https://pulse.geddo.online';
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${(e && e.stack ? e.stack : String(e)).slice(0, 2000)}`));
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 800)}`));

// Fresh visitor → onboarding
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
console.log('url:', page.url());

// Walk slides with the Next button
for (let i = 0; i < 4; i++) {
  const next = page.getByText(/^(Next|Get started|التالي|يلا نبدأ)/).last();
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(900);
  } else {
    console.log(`slide ${i}: Next button NOT visible`);
    break;
  }
}
console.log('after next-walk url:', page.url());

// Fresh session again — this time swipe through slides (touch drag)
await ctx.clearCookies();
const page2 = await ctx.newPage();
page2.on('pageerror', (e) => errors.push(`PAGEERROR(swipe): ${(e && e.stack ? e.stack : String(e)).slice(0, 2000)}`));
page2.on('console', (m) => m.type() === 'error' && errors.push(`console(swipe): ${m.text().slice(0, 800)}`));
await page2.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded' });
await page2.waitForTimeout(2500);
for (let i = 0; i < 3; i++) {
  await page2.touchscreen.tap(195, 400); // ensure page interactive
  // swipe left (forward)
  await page2.mouse.move(320, 420);
  await page2.mouse.down();
  await page2.mouse.move(60, 420, { steps: 8 });
  await page2.mouse.up();
  await page2.waitForTimeout(800);
}
await page2.screenshot({ path: 'tools/e2e-shots/probe-onboarding-swipe.png' });
console.log('after swipe url:', page2.url());

console.log('\nerrors:', errors.length);
errors.forEach((e) => console.log('  ', e, '\n'));
await browser.close();
