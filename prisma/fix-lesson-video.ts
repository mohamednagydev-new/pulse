/**
 * Lesson video repair.
 *
 * A lesson can carry both a `videoId` (self-hosted upload) and a `videoUrl` (YouTube
 * link), and the upload always wins. That is the right rule - until the upload is
 * gone. Then the player has nothing to play and the perfectly good link underneath
 * never gets a chance.
 *
 * This clears `videoId` so `videoUrl` takes over. It never deletes an upload and
 * never touches a lesson that has no link to fall back to.
 *
 * Run:
 *   npx tsx prisma/fix-lesson-video.ts            report only, changes nothing
 *   npx tsx prisma/fix-lesson-video.ts --broken   clear ids whose file is missing
 *   npx tsx prisma/fix-lesson-video.ts --all      clear every id that has a link
 */
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '..', 'uploads');

type Mode = 'report' | 'broken' | 'all';
const mode: Mode = process.argv.includes('--all') ? 'all' : process.argv.includes('--broken') ? 'broken' : 'report';

/** An upload counts as playable only if the Video row AND the file both exist. */
function playable(video: { filePath: string | null } | null): boolean {
  if (!video?.filePath) return false;
  try {
    return fs.existsSync(path.join(UPLOAD_DIR, video.filePath));
  } catch {
    return false;
  }
}

async function run() {
  const lessons = await prisma.lesson.findMany({
    where: { videoId: { not: null } },
    select: { id: true, title: true, videoId: true, videoUrl: true, video: { select: { filePath: true } } },
    orderBy: { title: 'asc' },
  });

  if (lessons.length === 0) {
    const withUrl = await prisma.lesson.count({ where: { videoUrl: { not: null } } });
    const total = await prisma.lesson.count();
    console.log(`No lesson has a videoId. ${withUrl}/${total} play from a link.`);
    return;
  }

  const ok = lessons.filter((l) => playable(l.video));
  const broken = lessons.filter((l) => !playable(l.video));
  const brokenWithLink = broken.filter((l) => l.videoUrl);
  const brokenNoLink = broken.filter((l) => !l.videoUrl);

  console.log(`${lessons.length} lesson(s) carry a videoId:`);
  console.log(`  ${ok.length} play fine (file present) - left alone`);
  console.log(`  ${brokenWithLink.length} have no playable file BUT do have a link - these are the broken players`);
  console.log(`  ${brokenNoLink.length} have no playable file and no link - clearing would leave them empty`);

  if (mode === 'report') {
    console.log('\nNothing changed. Re-run with --broken to fix the middle group, or --all to clear every id that has a link.');
    if (brokenWithLink.length) {
      console.log('\nWould fix:');
      brokenWithLink.slice(0, 10).forEach((l) => console.log(`  ${l.title}`));
      if (brokenWithLink.length > 10) console.log(`  ...and ${brokenWithLink.length - 10} more`);
    }
    return;
  }

  // --all also releases lessons whose upload works, when a link exists to fall back to.
  const targets = mode === 'all' ? lessons.filter((l) => l.videoUrl) : brokenWithLink;

  for (const l of targets) await prisma.lesson.update({ where: { id: l.id }, data: { videoId: null } });

  const total = await prisma.lesson.count();
  const playing = await prisma.lesson.count({
    where: { OR: [{ videoId: { not: null } }, { videoUrl: { not: null } }] },
  });
  console.log(`\nCleared videoId on ${targets.length} lesson(s); their links now play. Coverage: ${playing}/${total}.`);
  if (brokenNoLink.length) {
    console.log(`Left ${brokenNoLink.length} alone - no link to fall back to. Run prisma/seed-videos.ts to give them one.`);
  }
}

run()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
