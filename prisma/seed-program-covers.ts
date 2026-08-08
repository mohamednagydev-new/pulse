import { PrismaClient } from '@prisma/client';

/**
 * Program covers for the 9 programs that shipped without one. The images are
 * static app assets (apps/web/public/covers/*, bundled with every deploy), so
 * no admin upload is needed — this just points each program at its file.
 *
 * Idempotent and admin-respecting: only fills programs whose coverImage is
 * still empty; anything an admin has set by hand is never overwritten.
 * Matched by title so it works on any environment regardless of row IDs.
 */

const prisma = new PrismaClient();
const BASE = (process.env.WEB_ORIGIN || 'https://pulse.geddo.online').replace(/\/$/, '');

const COVERS: [title: string, file: string][] = [
  ['Peak 1 — Heavy Compounds', 'peak-1-heavy-compounds.jpg'],
  ['Peak 2 — Max Effort', 'peak-2-max-effort.jpg'],
  ['Peak 3 — Strength & Conditioning', 'peak-3-strength-conditioning.jpg'],
  ['Foundations of Strength', 'foundations-of-strength.jpg'],
  ['4-Week Fat Loss Circuit', '4-week-fat-loss-circuit.jpg'],
  ['Home Body — No Equipment', 'home-body-no-equipment.jpg'],
  ['7 Days of Calm', '7-days-of-calm.jpg'],
  ['Sleep & Stress Reset', 'sleep-stress-reset.jpg'],
  ['Strength Foundations — Barbell Basics', 'strength-foundations-barbell.jpg'],
];

async function main() {
  let set = 0;
  for (const [title, file] of COVERS) {
    const res = await prisma.program.updateMany({
      where: { title, OR: [{ coverImage: null }, { coverImage: '' }] },
      data: { coverImage: `${BASE}/covers/${file}` },
    });
    if (res.count > 0) {
      set += res.count;
      console.log(`  cover set: ${title}`);
    }
  }
  console.log(`[program-covers] ${set} cover(s) assigned (already-covered programs untouched).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
