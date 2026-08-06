/**
 * End-user walkthrough in real Chrome (Playwright).
 * Registers a fresh user, taps through every core journey on a phone viewport,
 * screenshots every screen (EN + AR), and records console errors, page crashes
 * and failed network requests. Findings > assertions: a step that can't complete
 * is logged and the walk continues.
 *
 * Prereq: API on :4000 and Vite dev on :5173 already running.
 * Run: node tools/e2e.mjs
 * Output: tools/e2e-shots/*.png + tools/e2e-report.json + console summary.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, 'e2e-shots');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });

// Point at any deployment: E2E_BASE=https://pulse.geddo.online node tools/e2e.mjs
const BASE = process.env.E2E_BASE || 'http://localhost:5173';
const findings = [];
const consoleErrors = [];
const netFailures = [];
let shotN = 0;

const note = (sev, step, msg) => findings.push({ sev, step, msg });

async function shot(page, name) {
  shotN += 1;
  const file = path.join(SHOTS, `${String(shotN).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
}

async function step(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    note('FAIL', name, String(e?.message ?? e).slice(0, 300));
    console.log(`  FAIL ${name}: ${String(e?.message ?? e).slice(0, 160)}`);
  }
}

const ts = Date.now();
const EMAIL = `e2e_${ts}@test.local`;
const PASS = 'E2e-test-1234';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'en',
});
const page = await ctx.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 250));
});
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${String(e).slice(0, 250)}`));
page.on('response', (r) => {
  const url = r.url();
  if (r.status() >= 400 && url.includes('/api/') && !url.includes('/api/auth/refresh')) {
    netFailures.push(`${r.status()} ${r.request().method()} ${url.replace(BASE, '')}`);
  }
});

const settle = (ms = 1200) => page.waitForTimeout(ms);
const clickText = async (text, exact = false) => {
  const el = page.getByText(text, { exact }).first();
  await el.waitFor({ state: 'visible', timeout: 5000 });
  await el.click();
};

console.log(`E2E as ${EMAIL}`);

await step('onboarding', async () => {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await settle(2500);
  await shot(page, 'onboarding');
});

await step('register', async () => {
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  await settle(1500);
  await shot(page, 'register');
  const inputs = page.locator('input');
  await inputs.nth(0).fill('E2E');
  await inputs.nth(1).fill('Tester');
  // fill by autocomplete attrs to survive field order changes
  await page.locator('input[autocomplete="email"]').fill(EMAIL);
  await page.locator('input[autocomplete="new-password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });
});

await step('home', async () => {
  await settle(3500);
  await shot(page, 'home-top');
  await page.mouse.wheel(0, 1200);
  await settle(800);
  await shot(page, 'home-mid');
  await page.mouse.wheel(0, 1600);
  await settle(800);
  await shot(page, 'home-bottom');
  await page.mouse.wheel(0, -5000);
});

await step('tabs', async () => {
  for (const [route, name] of [['/programs', 'programs'], ['/wellness', 'wellness'], ['/community', 'community'], ['/profile', 'profile']]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(2200);
    await shot(page, name);
  }
});

await step('quick session', async () => {
  // find a muscle group id via the app's own API (authed via cookie? use page fetch)
  const groups = await page.evaluate(async () => {
    const r = await fetch('/api/muscle-groups');
    return r.json();
  });
  if (!Array.isArray(groups) || !groups.length) throw new Error('no muscle groups from API');
  await page.goto(`${BASE}/session/${groups[0].id}`, { waitUntil: 'domcontentloaded' });
  await settle(2500);
  await shot(page, 'session');
  // try logging a set
  const kg = page.locator('input').first();
  if (await kg.isVisible().catch(() => false)) {
    // best effort only
  }
  // complete first exercise via the big check button if present
  const done = page.locator('button:has(svg)').filter({ hasText: /^$/ }).first();
  await shot(page, 'session-2');
});

await step('tracker + food log', async () => {
  await page.goto(`${BASE}/tracker`, { waitUntil: 'domcontentloaded' });
  await settle(2000);
  await shot(page, 'tracker');
  // open food picker via the "add food" button (first button containing the search icon text key)
  const addBtn = page.getByText(/add food|أضف/i).first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await settle(1200);
    await page.locator('input').last().fill('koshari');
    await settle(1500);
    await shot(page, 'foodpicker-search');
    const first = page.locator('button:has-text("kcal"), button:has-text("سعر")').first();
    const row = page.locator('div >> text=/koshari|كشري/i').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await settle(600);
      await shot(page, 'foodpicker-picked');
      const add = page.getByText(/^add$|^أضف$|add to log/i).last();
      if (await add.isVisible().catch(() => false)) await add.click();
      await settle(1500);
      await shot(page, 'tracker-after-log');
    } else {
      note('WARN', 'food search', 'no koshari row appeared for query "koshari"');
      await shot(page, 'foodpicker-empty');
    }
  } else {
    note('WARN', 'tracker', 'add-food button not found');
  }
});

await step('meal plan + grocery', async () => {
  await page.goto(`${BASE}/meals`, { waitUntil: 'domcontentloaded' });
  await settle(2500);
  await shot(page, 'mealplan');
  const grocery = page.getByText(/shopping list|قايمة|🛒/i).first();
  if (await grocery.isVisible().catch(() => false)) {
    await grocery.click();
    await settle(2000);
    await shot(page, 'grocery');
    await page.keyboard.press('Escape');
  } else note('WARN', 'grocery', 'shopping list button not found');
});

await step('challenge join PULSE14', async () => {
  await page.goto(`${BASE}/achievements`, { waitUntil: 'domcontentloaded' });
  await settle(2200);
  await shot(page, 'achievements');
  const res = await page.evaluate(async () => {
    // token lives in memory; use the app's fetch path via a visible join isn't
    // reliable — call the API directly through the page session
    const r = await fetch('/api/gamification/challenges/join-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${window.__pulseToken ?? ''}` },
      body: JSON.stringify({ code: 'PULSE14' }),
      credentials: 'include',
    });
    return { status: r.status, body: await r.text() };
  });
  if (res.status >= 400 && res.status !== 401) note('WARN', 'PULSE14 join API', `${res.status} ${res.body.slice(0, 120)}`);
  // UI path: find join-by-code input
  const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="كود"]').first();
  if (await codeInput.isVisible().catch(() => false)) {
    await codeInput.fill('PULSE14');
    await shot(page, 'join-code-filled');
    const joinBtn = page.getByText(/join|انضم|ادخل/i).first();
    if (await joinBtn.isVisible().catch(() => false)) {
      await joinBtn.click();
      await settle(1500);
      await shot(page, 'join-code-result');
    }
  } else note('WARN', 'join-by-code', 'code input not found on Achievements');
});

await step('week zero', async () => {
  await page.goto(`${BASE}/week-zero`, { waitUntil: 'domcontentloaded' });
  await settle(2000);
  await shot(page, 'weekzero');
});

await step('settings + gyms + help', async () => {
  for (const [route, name] of [['/info', 'settings'], ['/gyms', 'gyms'], ['/help', 'help']]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(2000);
    await shot(page, name);
  }
});

// ---- Full-app sweep: every remaining destination, screenshot + error capture ----

await step('wellness kitchen depth', async () => {
  await page.goto(`${BASE}/wellness/kitchen`, { waitUntil: 'domcontentloaded' });
  await settle(2200);
  await shot(page, 'kitchen-categories');
  const cats = await page.evaluate(async () => (await fetch('/api/categories?kind=recipe')).json());
  if (Array.isArray(cats) && cats[0]) {
    const cat = await page.evaluate(async (id) => (await fetch(`/api/categories/${id}`)).json(), cats[0].id);
    await page.goto(`${BASE}/category/${cats[0].id}`, { waitUntil: 'domcontentloaded' });
    await settle(2000);
    await shot(page, 'kitchen-category');
    if (cat.recipes?.[0]) {
      await page.goto(`${BASE}/recipe/${cat.recipes[0].id}`, { waitUntil: 'domcontentloaded' });
      await settle(2000);
      await shot(page, 'recipe-detail');
    } else note('WARN', 'kitchen', `recipe category "${cat.title}" has no recipes`);
  }
});

await step('article read', async () => {
  const cats = await page.evaluate(async () => (await fetch('/api/categories?kind=article')).json());
  if (Array.isArray(cats) && cats[0]) {
    const cat = await page.evaluate(async (id) => (await fetch(`/api/categories/${id}`)).json(), cats[0].id);
    if (cat.articles?.[0]) {
      await page.goto(`${BASE}/article/${cat.articles[0].id}`, { waitUntil: 'domcontentloaded' });
      await settle(2000);
      await shot(page, 'article-detail');
    } else note('WARN', 'articles', `article category "${cat.title}" has no articles`);
  }
});

await step('program -> lesson', async () => {
  const programs = await page.evaluate(async () => (await fetch('/api/programs')).json());
  if (Array.isArray(programs) && programs[0]) {
    await page.goto(`${BASE}/programs/${programs[0].id}`, { waitUntil: 'domcontentloaded' });
    await settle(2200);
    await shot(page, 'program-detail');
  } else note('WARN', 'programs', 'no programs from API');
});

await step('social sweep', async () => {
  for (const [route, name] of [['/community', 'community-feed'], ['/people', 'people'], ['/buddies', 'buddies'], ['/chat', 'chat-list'], ['/coaches', 'coaches-dir'], ['/group', 'group-sessions'], ['/duels', 'duels']]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(2000);
    await shot(page, name);
  }
});

await step('reels', async () => {
  await page.goto(`${BASE}/reels`, { waitUntil: 'domcontentloaded' });
  await settle(3000);
  await shot(page, 'reels');
});

await step('progress + leagues + notifications', async () => {
  for (const [route, name] of [['/progress', 'progress'], ['/leagues', 'leagues'], ['/notifications', 'notifications'], ['/bookmarks', 'bookmarks'], ['/schedule', 'schedule']]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(2000);
    await shot(page, name);
  }
});

await step('discovery + commerce', async () => {
  for (const [route, name] of [['/search', 'search'], ['/store', 'store'], ['/deals', 'deals'], ['/events', 'events'], ['/exercises', 'muscle-map'], ['/music', 'music'], ['/yoga', 'yoga']]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(2000);
    await shot(page, name);
  }
});

await step('search interaction', async () => {
  await page.goto(`${BASE}/search`, { waitUntil: 'domcontentloaded' });
  await settle(1200);
  const input = page.locator('input').first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill('yoga');
    await settle(1800);
    await shot(page, 'search-results');
  } else note('WARN', 'search', 'search input not found');
});

await step('guest contact page (logged-out surface)', async () => {
  await page.goto(`${BASE}/contact`, { waitUntil: 'domcontentloaded' });
  await settle(1800);
  await shot(page, 'contact');
  const hasForm = await page.locator('form').first().isVisible().catch(() => false);
  if (!hasForm) note('WARN', 'contact', 'no form at /contact (old deploy or route missing)');
});

await step('switch to Arabic', async () => {
  await page.evaluate(() => localStorage.setItem('fitit_lang', 'ar'));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await settle(3000);
  await shot(page, 'AR-home');
  const dir = await page.evaluate(() => document.documentElement.dir);
  if (dir !== 'rtl') note('FAIL', 'AR dir', `documentElement.dir is "${dir}", expected rtl`);
  for (const [route, name] of [['/programs', 'AR-programs'], ['/wellness', 'AR-wellness'], ['/profile', 'AR-profile'], ['/info', 'AR-settings'], ['/help', 'AR-help'], ['/meals', 'AR-mealplan'], ['/tracker', 'AR-tracker'], ['/achievements', 'AR-achievements']]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await settle(2200);
    await shot(page, name);
  }
});

await step('wellness article (SEO + dark shell)', async () => {
  const arts = await page.evaluate(async () => (await fetch('/api/categories?kind=article')).json());
  if (Array.isArray(arts) && arts[0]) {
    await page.goto(`${BASE}/category/${arts[0].id}`, { waitUntil: 'domcontentloaded' });
    await settle(2000);
    await shot(page, 'AR-category');
  }
});

const report = { email: EMAIL, findings, consoleErrors: [...new Set(consoleErrors)], netFailures: [...new Set(netFailures)] };
fs.writeFileSync(path.join(__dirname, 'e2e-report.json'), JSON.stringify(report, null, 2));

console.log('\n===== E2E SUMMARY =====');
console.log(`findings: ${findings.length}`);
findings.forEach((f) => console.log(`  [${f.sev}] ${f.step}: ${f.msg}`));
console.log(`console errors (${report.consoleErrors.length}):`);
report.consoleErrors.slice(0, 15).forEach((e) => console.log(`  ${e}`));
console.log(`network failures (${report.netFailures.length}):`);
report.netFailures.slice(0, 15).forEach((e) => console.log(`  ${e}`));
console.log(`screenshots: ${shotN} in tools/e2e-shots`);

await browser.close();
