import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

/** Local-date key (no UTC shift) — matches the API's 'YYYY-MM-DD'. */
function key(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

type Cell = { date: Date; k: string; count: number; inRange: boolean };

const CELL = 11;
const GAP = 3;
const COL = CELL + GAP;

/** 0 = subtle gray, 1–3 = increasing brand-orange, 4+ = full brand orange. */
function fill(count: number): string {
  if (count <= 0) return '#EEEFF1';
  if (count === 1) return 'rgba(249,115,22,0.28)';
  if (count === 2) return 'rgba(249,115,22,0.50)';
  if (count === 3) return 'rgba(249,115,22,0.74)';
  return '#F97316';
}

/**
 * GitHub-style contribution grid: columns = weeks, rows = Sun..Sat.
 * The full range is built client-side so missing days render as empty cells.
 */
export default function StreakCalendar({
  activity,
  days = 119,
}: {
  activity: { date: string; count: number }[];
  days?: number;
}) {
  const { i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const weeks = useMemo<Cell[][]>(() => {
    const counts = new Map<string, number>();
    for (const a of activity ?? []) counts.set(a.date, a.count ?? 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - (Math.max(1, days) - 1));

    // Pad back to the Sunday of the first week so rows line up.
    const gridStart = new Date(start);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const out: Cell[][] = [];
    const cursor = new Date(gridStart);
    while (cursor <= today) {
      const week: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        const k = key(d);
        week.push({ date: d, k, count: counts.get(k) ?? 0, inRange: d >= start && d <= today });
        cursor.setDate(cursor.getDate() + 1);
      }
      out.push(week);
    }
    return out;
  }, [activity, days]);

  // Most recent weeks first in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks.length]);

  const todayKey = key(new Date());

  // Month label above a column when its month differs from the previous column.
  const monthLabels = weeks.map((w, i) => {
    const first = w[0].date;
    if (i > 0 && weeks[i - 1][0].date.getMonth() === first.getMonth()) return null;
    return first.toLocaleDateString(i18n.language, { month: 'short' });
  });

  return (
    // Calendars read left-to-right in every language — keep the grid LTR.
    <div ref={scrollRef} dir="ltr" className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
      <div className="inline-block min-w-full">
        <div className="mb-1 flex h-3" style={{ gap: GAP }}>
          {monthLabels.map((label, i) => (
            <div key={i} className="relative shrink-0" style={{ width: CELL }}>
              {label && (
                <span className="absolute start-0 top-0 whitespace-nowrap text-[9px] font-medium leading-3 text-gray-400">
                  {label}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex shrink-0 flex-col" style={{ gap: GAP }}>
              {week.map((cell, di) => {
                if (!cell.inRange) return <div key={cell.k} style={{ width: CELL, height: CELL }} />;
                const isToday = cell.k === todayKey;
                return (
                  <motion.div
                    key={cell.k}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22, delay: Math.min((wi * 7 + di) * 0.0035, 0.45) }}
                    title={`${cell.count} ${cell.count === 1 ? 'activity' : 'activities'} · ${cell.k}`}
                    className={`rounded-[3px] ${isToday ? 'ring-2 ring-brand-pink ring-offset-1 ring-offset-white' : ''}`}
                    style={{ width: CELL, height: CELL, backgroundColor: fill(cell.count) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
