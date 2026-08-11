/**
 * Re-transcode stored videos that aren't mobile-safe H.264 MP4s.
 *
 * Background (Aug 2026): the upload pipeline transcodes via ffmpeg, but when
 * ffmpeg is missing it silently stores the ORIGINAL file. iPhone recordings
 * are HEVC — they play on laptops with hardware decode and fail on most
 * Android phones ("video won't play on mobile"). This walks every video row,
 * probes the actual codec, and converts anything that isn't h264-in-mp4,
 * updating filePath/thumbnail/duration in place.
 *
 * Prerequisite on the server: ffmpeg + ffprobe installed and on PATH
 * (winget install Gyan.FFmpeg — then open a NEW shell), or set
 * FFMPEG_PATH / FFPROBE_PATH in .env.
 *
 * Idempotent: already-h264 mp4 files are skipped.
 * Run:  node node_modules\tsx\dist\cli.mjs prisma\retranscode-videos.ts
 */
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const UPLOAD_DIR = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

function run(cmd: string, args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args);
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (err += d.toString()));
    p.on('error', () => resolve({ code: -1, out, err: err || 'spawn-error' }));
    p.on('close', (code) => resolve({ code: code ?? -1, out, err }));
  });
}

async function codecOf(file: string): Promise<string | null> {
  const r = await run(FFPROBE, [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  return r.code === 0 ? r.out.trim() || null : null;
}

async function main() {
  // Fail fast if the tools are missing — that's the root cause we're fixing.
  if ((await run(FFPROBE, ['-version'])).code !== 0) {
    console.error(`ffprobe not found (${FFPROBE}). Install ffmpeg first: winget install Gyan.FFmpeg`);
    process.exit(1);
  }

  const videos = await prisma.video.findMany({ select: { id: true, filePath: true } });
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of videos) {
    const abs = path.isAbsolute(v.filePath) ? v.filePath : path.join(UPLOAD_DIR, v.filePath);
    if (!fs.existsSync(abs)) {
      console.warn(`missing file, skipping: ${v.filePath}`);
      failed++;
      continue;
    }
    const codec = await codecOf(abs);
    const isMp4 = /\.mp4$/i.test(abs);
    if (codec === 'h264' && isMp4) {
      skipped++;
      continue;
    }

    const outAbs = path.join(path.dirname(abs), `${path.basename(abs, path.extname(abs))}_h264.mp4`);
    console.log(`converting ${path.basename(abs)} (codec: ${codec ?? 'unknown'}) …`);
    const t = await run(FFMPEG, [
      '-y', '-i', abs,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      outAbs,
    ]);
    if (t.code !== 0) {
      console.error(`  FAILED: ${t.err.slice(-200)}`);
      failed++;
      continue;
    }

    // Poster thumbnail if the row never got one.
    const thumbDir = path.join(UPLOAD_DIR, 'thumbnails');
    fs.mkdirSync(thumbDir, { recursive: true });
    const thumbAbs = path.join(thumbDir, `${path.basename(outAbs, '.mp4')}.jpg`);
    await run(FFMPEG, ['-y', '-ss', '00:00:02', '-i', outAbs, '-frames:v', '1', '-q:v', '3', thumbAbs]);

    await prisma.video.update({
      where: { id: v.id },
      data: {
        filePath: path.relative(UPLOAD_DIR, outAbs),
        ...(fs.existsSync(thumbAbs) ? { thumbnailPath: path.relative(UPLOAD_DIR, thumbAbs) } : {}),
      },
    });
    fs.unlinkSync(abs); // the unplayable original
    converted++;
  }

  console.log(`done: ${converted} converted, ${skipped} already fine, ${failed} failed/missing.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
