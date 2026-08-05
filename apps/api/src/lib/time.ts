/** App-timezone day math. The server may run UTC, but streaks/seasons/reminders
 *  must follow the audience's calendar (default Africa/Cairo; override with APP_TZ). */
const TZ = process.env.APP_TZ || 'Africa/Cairo';

/** YYYY-MM-DD in the app timezone. */
export function dayString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
}

/** Milliseconds the app timezone is ahead of UTC at the given instant. */
function tzOffsetMs(at: Date): number {
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(at.toLocaleString('en-US', { timeZone: TZ }));
  return local.getTime() - utc.getTime();
}

/** The UTC instant when the given app-timezone day (YYYY-MM-DD) begins.
 *  `new Date('...T00:00:00')` is server-local and silently wrong on a UTC host —
 *  every createdAt window built from a day string must go through here instead. */
export function startOfDayTz(day: string): Date {
  const guess = new Date(`${day}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(guess));
}

/** The last millisecond of the given app-timezone day. */
export function endOfDayTz(day: string): Date {
  return new Date(startOfDayTz(day).getTime() + 86400000 - 1);
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayString(d);
}

/** YYYY-MM in the app timezone. */
export function monthKey(d: Date = new Date()): string {
  return dayString(d).slice(0, 7);
}

/** 0-23 hour in the app timezone. */
export function localHour(d: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d));
}

/** Minutes since midnight in the app timezone. Opening hours need the minutes too —
 *  a gym that shuts at 23:30 is still open at 23:00, and localHour alone cannot tell. */
export function localMinutes(d: Date = new Date()): number {
  const s = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

/** 0=Sunday … 6=Saturday in the app timezone. */
export function localDow(d: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
}

/** Zero-based month index (0=Jan) in the app timezone. */
export function localMonthIndex(d: Date = new Date()): number {
  return Number(dayString(d).slice(5, 7)) - 1;
}

/** The Saturday that starts the current week, YYYY-MM-DD, app timezone.
 *  Saturday because that's where the Egyptian week starts — leagues reset then. */
export function weekStart(d: Date = new Date()): string {
  const dow = localDow(d); // 0=Sun … 6=Sat
  const backToSaturday = (dow + 1) % 7;
  return daysAgoStr(backToSaturday - daysBetweenTodayAnd(d));
}

/** Whole days between today and `d`, so weekStart works for past dates too. */
function daysBetweenTodayAnd(d: Date): number {
  const a = Date.parse(`${dayString()}T00:00:00Z`);
  const b = Date.parse(`${dayString(d)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** Stable key for the week a date falls in — the week's starting Saturday. */
export function weekKey(d: Date = new Date()): string {
  return weekStart(d);
}

/** Last day of the current month, YYYY-MM-DD, app timezone. */
export function lastDayOfMonth(d: Date = new Date()): string {
  const [y, m] = dayString(d).split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}
