import { prisma } from './prisma';

/**
 * Job execution log for the admin System panel. Every scheduled or manual run
 * of a background job writes one JobLog row: name, ok/failed, a short human
 * note, and whether it was triggered by hand. (Distinct from JobRun, which is
 * the once-per-slot claim lock — that table answers "may I run?", this one
 * answers "what happened when I did?".)
 */

const MAX_NOTE = 1000;
const KEEP_ROWS = 1000;

/**
 * Run `fn` and record the outcome. Never throws — the caller (usually the
 * hourly scheduler) must not die because a job did; the failure lands in the
 * log where an admin can see it instead.
 */
export async function runLogged(
  name: string,
  manual: boolean,
  fn: () => Promise<string | void>,
): Promise<{ ok: boolean; note: string }> {
  let ok = true;
  let note = '';
  try {
    const out = await fn();
    note = typeof out === 'string' && out ? out : 'ok';
  } catch (e: any) {
    ok = false;
    note = e?.message ? String(e.message) : String(e);
  }
  note = note.slice(0, MAX_NOTE);
  await prisma.jobLog.create({ data: { name, ok, note, manual } }).catch(() => {});
  await pruneOccasionally();
  return { ok, note };
}

/**
 * Failure-only logging for the hourly idempotent ensure* jobs — logging every
 * silent hourly no-op would drown the panel in noise, but a failure must show.
 */
export function logJobFailure(name: string, err: unknown): void {
  const note = String((err as any)?.message ?? err).slice(0, MAX_NOTE);
  void prisma.jobLog.create({ data: { name, ok: false, note, manual: false } }).catch(() => {});
}

/** Keep the newest KEEP_ROWS rows; runs on ~1 in 20 writes to stay cheap. */
async function pruneOccasionally(): Promise<void> {
  if (Math.random() >= 0.05) return;
  try {
    const beyond = await prisma.jobLog.findMany({
      orderBy: { ranAt: 'desc' },
      skip: KEEP_ROWS,
      take: 500,
      select: { id: true },
    });
    if (beyond.length) {
      await prisma.jobLog.deleteMany({ where: { id: { in: beyond.map((r) => r.id) } } });
    }
  } catch {
    /* pruning is best-effort */
  }
}
