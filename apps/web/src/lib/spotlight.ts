/**
 * Contextual feature spotlights: one-time "did you know" bubbles that fire on
 * BEHAVIOR (typed food three days running, opened the picker thrice without
 * touching the barcode tab), not on a schedule. Everything lives in
 * localStorage — losing it merely means a tip may show once more.
 */

const KEY = 'pulse-spotlights';

function load(): Record<string, number | string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(m: Record<string, number | string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage full/blocked — spotlights just stay quiet */
  }
}

/** Has this spotlight (or milestone) been recorded? */
export function spotSeen(key: string): boolean {
  return load()[key] !== undefined;
}

/** Record a spotlight as shown (or a feature as used) — it never fires again. */
export function markSpot(key: string) {
  const m = load();
  if (m[key] !== undefined) return;
  m[key] = Date.now();
  save(m);
}

/** Increment a counter at most once per calendar day; returns the new count. */
export function bumpDaily(key: string): number {
  const m = load();
  const today = new Date().toISOString().slice(0, 10);
  if (m[`${key}:day`] === today) return Number(m[`${key}:n`] ?? 0);
  m[`${key}:day`] = today;
  const n = Number(m[`${key}:n`] ?? 0) + 1;
  m[`${key}:n`] = n;
  save(m);
  return n;
}

/** Increment a plain counter; returns the new count. */
export function bump(key: string): number {
  const m = load();
  const n = Number(m[`${key}:n`] ?? 0) + 1;
  m[`${key}:n`] = n;
  save(m);
  return n;
}
