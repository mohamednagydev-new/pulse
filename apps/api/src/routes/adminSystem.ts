import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import { audit } from '../lib/audit';
import { runLogged } from '../lib/jobslog';
import { ensureCurrentSeason } from '../lib/seasons';
import { ensureWeeklyChallenge } from '../lib/weekly';
import { ensureGroupSessions, backupDatabase } from '../lib/reminders';
import { dayString } from '../lib/time';

/**
 * Jobs & system health: the latest outcome of every scheduled job, recent run
 * history, database/backup/process vitals, and a manual "run now" trigger.
 */
export const adminSystemRouter = Router();
adminSystemRouter.use(requireAuth, requireAdmin);

const JOB_NAMES = [
  'weekly-challenge',
  'season',
  'group-sessions',
  'daily-prompts',
  'reels-pull',
  'backup',
  'digest',
  'video-sweep',
  'broadcast',
] as const;

/** DATABASE_URL is file:<path> relative to prisma/ — which lives at the REPO
 *  root here (<repo>/prisma/schema.prisma), four levels up from src/routes. */
function dbFilePath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const raw = url.replace(/^file:/, '').split('?')[0];
  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, '../../../../prisma', raw);
}

/** Same resolution as backupDatabase in lib/reminders.ts. */
function backupDir(): string {
  return process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.resolve(__dirname, '../../../../backups');
}

adminSystemRouter.get('/', async (_req: AuthedRequest, res: Response) => {
  const recent = await prisma.jobLog.findMany({ orderBy: { ranAt: 'desc' }, take: 30 });

  const jobs: Record<string, (typeof recent)[number] | null> = {};
  for (const name of JOB_NAMES) {
    jobs[name] = await prisma.jobLog.findFirst({ where: { name }, orderBy: { ranAt: 'desc' } });
  }

  let db: { path: string; sizeBytes: number } | null = null;
  try {
    const p = dbFilePath();
    db = { path: p, sizeBytes: fs.statSync(p).size };
  } catch {
    /* unreadable/missing — the panel shows the gap */
  }

  let backup: { file: string; mtime: string; sizeBytes: number } | null = null;
  try {
    const dir = backupDir();
    const candidates = fs
      .readdirSync(dir)
      .filter((f) => /-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .map((f) => {
        const st = fs.statSync(path.join(dir, f));
        return { file: f, mtime: st.mtime, sizeBytes: st.size };
      })
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    if (candidates.length) {
      backup = { file: candidates[0].file, mtime: candidates[0].mtime.toISOString(), sizeBytes: candidates[0].sizeBytes };
    }
  } catch {
    /* no backup dir yet — reported as null (missing) */
  }

  const mem = process.memoryUsage();
  res.json({
    jobs,
    recent,
    db,
    backup,
    process: {
      uptimeSec: Math.round(process.uptime()),
      rssMb: Math.round(mem.rss / 1048576),
      nodeVersion: process.version,
    },
  });
});

adminSystemRouter.post('/run/:name', async (req: AuthedRequest, res: Response) => {
  const name = req.params.name;

  const runners: Record<string, () => Promise<string | void>> = {
    'weekly-challenge': async () => {
      await ensureWeeklyChallenge();
    },
    season: async () => {
      await ensureCurrentSeason();
    },
    'group-sessions': async () => {
      await ensureGroupSessions();
    },
    'reels-pull': async () => {
      const { pullReels } = await import('../lib/reelsPull');
      const r = await pullReels();
      return `added ${r.added}, skipped ${r.skipped}`;
    },
    backup: () => backupDatabase(dayString(new Date())),
    'video-sweep': async () => {
      const { sweepVideos } = await import('../lib/videoHealth');
      return sweepVideos();
    },
  };

  const fn = runners[name];
  if (!fn) return res.status(404).json({ error: `Unknown or non-runnable job: ${name}` });

  if (name === 'reels-pull' && !(process.env.REELS_CHANNELS ?? '').trim()) {
    return res.status(400).json({
      error: 'REELS_CHANNELS is not configured — set it in the API .env (comma-separated channel links) to enable the reels pull.',
    });
  }

  audit(req.userId!, 'job.run', { targetType: 'job', targetId: name });
  const result = await runLogged(name, true, fn);
  res.json(result);
});
