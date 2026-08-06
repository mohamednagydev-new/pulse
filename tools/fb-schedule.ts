import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Schedule the pre-written launch series onto the Facebook Page.
 *
 * Reads the Arabic post bodies straight out of MARKETING-POSTS.md (the single
 * source of truth — edit posts there, not here), maps them onto a day plan,
 * and creates SCHEDULED page posts via the Graph API.
 *
 * Usage (from F:\FIT_IT):
 *   node node_modules/tsx/dist/cli.mjs tools/fb-schedule.ts 2026-08-10          # DRY RUN — prints the plan
 *   node node_modules/tsx/dist/cli.mjs tools/fb-schedule.ts 2026-08-10 --go    # actually schedules
 *
 * Engagement-calendar mode — schedules every "## Day N — ..." post from a pack
 * (e.g. ENGAGEMENT-POSTS.md) at 20:00 Cairo, day 1 = the given date:
 *   node node_modules/tsx/dist/cli.mjs tools/fb-schedule.ts 2026-08-10 --file=ENGAGEMENT-POSTS.md [--go]
 * Days whose heading mentions "auto-post" are skipped (the API posts those
 * itself on Saturdays). Facebook only accepts 10 minutes – 75 days out.
 *
 * Env (gitignored .env): FB_PAGE_ID, FB_PAGE_TOKEN (page token with
 * pages_manage_posts). Facebook allows scheduling 10 minutes to 75 days out.
 */

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_TOKEN;
const APP_URL = 'https://pulse.geddo.online';

// day offset from launch date → post heading (matched loosely) + hour (Cairo≈UTC+3 in Aug)
const PLAN: { day: number; hourLocal: number; heading: RegExp; label: string }[] = [
  { day: 0, hourLocal: 19, heading: /POST 1 — Announcement/, label: 'Announcement' },
  { day: 1, hourLocal: 19, heading: /POST 2 — The real problem/, label: 'The real problem' },
  { day: 2, hourLocal: 19, heading: /POST 7 — Challenge kickoff/, label: 'PULSE14 challenge kickoff' },
  { day: 3, hourLocal: 19, heading: /FEATURE POST — The meal plan that explains itself/, label: 'Meal plan explains itself' },
  { day: 4, hourLocal: 19, heading: /POST 3 — Muscle map/, label: 'Muscle map' },
  { day: 5, hourLocal: 19, heading: /POST 5 — The kitchen/, label: 'The kitchen' },
  { day: 6, hourLocal: 19, heading: /POST 4 — Reels/, label: 'Reels' },
];

/** First fenced block after a heading = the Arabic caption (file convention). */
function extractArabic(md: string, heading: RegExp): string | null {
  const headIdx = md.search(heading);
  if (headIdx < 0) return null;
  const after = md.slice(headIdx);
  const m = after.match(/```\r?\n([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

/** Engagement pack: every "## Day N — ..." heading + its fenced caption. */
function extractCalendar(md: string): { day: number; hourLocal: number; label: string; body: string | null }[] {
  const out: { day: number; hourLocal: number; label: string; body: string | null }[] = [];
  const re = /^## Day (\d+)\s*[—-]\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  const marks: { day: number; label: string; idx: number }[] = [];
  while ((m = re.exec(md))) marks.push({ day: Number(m[1]), label: m[2].trim(), idx: m.index });
  for (let k = 0; k < marks.length; k++) {
    const chunk = md.slice(marks[k].idx, marks[k + 1]?.idx ?? md.length);
    const fence = chunk.match(/```\r?\n([\s\S]*?)```/);
    out.push({ day: marks[k].day - 1, hourLocal: 20, label: marks[k].label, body: fence ? fence[1].trim() : null });
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='))?.slice(7);
  const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  if (!dateArg) {
    console.error('Usage: fb-schedule.ts YYYY-MM-DD [--file=ENGAGEMENT-POSTS.md] [--go]');
    process.exit(1);
  }
  const go = args.includes('--go');
  if (go && (!PAGE_ID || !TOKEN)) {
    console.error('FB_PAGE_ID / FB_PAGE_TOKEN missing from .env');
    process.exit(1);
  }

  const md = fs.readFileSync(path.resolve(__dirname, `../${fileArg || 'MARKETING-POSTS.md'}`), 'utf8');
  const plan = fileArg
    ? extractCalendar(md).filter((p) => {
        if (/auto-?post/i.test(p.label)) {
          console.log(`  [skip] day ${p.day} — Saturday auto-post day (the API posts league results itself)`);
          return false;
        }
        return true;
      })
    : PLAN.map((p) => ({ ...p, body: extractArabic(md, p.heading) }));

  const pageName = go || TOKEN
    ? await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}?fields=name&access_token=${TOKEN}`)
        .then((r) => r.json()).then((j: any) => j.name ?? '?').catch(() => '?')
    : '?';
  console.log(`${go ? 'SCHEDULING' : 'DRY RUN'} → page: ${pageName} (${PAGE_ID}) · day 1 = ${dateArg} · ${plan.length} post(s)\n`);

  for (const p of plan) {
    const body = p.body;
    if (!body) {
      console.log(`  [skip] day ${p.day} — no caption found: ${p.label}`);
      continue;
    }
    // Cairo evening = hourLocal; Cairo is UTC+3 in August (DST).
    const when = new Date(`${dateArg}T00:00:00Z`);
    when.setUTCDate(when.getUTCDate() + p.day);
    when.setUTCHours(p.hourLocal - 3, 0, 0, 0);
    const unix = Math.floor(when.getTime() / 1000);

    const message = `${body}\n\n${APP_URL}`;
    console.log(`  day ${p.day} · ${when.toISOString()} · ${p.label} · ${message.length} chars`);

    if (!go) continue;
    if (unix < Date.now() / 1000 + 660) {
      console.log('    !! under 10 minutes away — Facebook rejects; posting skipped, publish manually');
      continue;
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        message,
        link: APP_URL,
        published: 'false',
        scheduled_publish_time: String(unix),
        access_token: TOKEN!,
      }),
    });
    const json: any = await res.json();
    console.log(json.id ? `    ✓ scheduled (${json.id})` : `    ✗ FAILED: ${JSON.stringify(json.error ?? json)}`);
  }

  if (!go) console.log('\nDry run only. Re-run with --go to schedule for real.');
  else console.log('\nDone — review them under Page → Publishing tools → Scheduled.');
}

main().catch((e) => { console.error(e); process.exit(1); });
