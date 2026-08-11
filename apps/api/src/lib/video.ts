import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { env } from '../env';

const VIDEO_DIR = path.join(env.UPLOAD_DIR, 'videos');
const THUMB_DIR = path.join(env.UPLOAD_DIR, 'thumbnails');

function ensureDirs() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

function run(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args);
    let stderr = '';
    p.stderr.on('data', (d) => (stderr += d.toString()));
    p.on('error', () => resolve({ code: -1, stderr: 'spawn-error' }));
    p.on('close', (code) => resolve({ code: code ?? -1, stderr }));
  });
}

async function probeDuration(file: string): Promise<number | null> {
  return new Promise((resolve) => {
    const p = spawn(env.FFPROBE_PATH, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('error', () => resolve(null));
    p.on('close', () => {
      const n = parseFloat(out.trim());
      resolve(Number.isFinite(n) ? Math.round(n) : null);
    });
  });
}

/**
 * One transcode at a time. ffmpeg happily eats every core it can see, so two
 * parallel 300 MB uploads used to starve the API (and SQLite) of CPU. Requests
 * still wait for their own result — they just queue behind each other.
 */
let transcodeChain: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = transcodeChain.then(job, job);
  transcodeChain = next.catch(() => {}); // one failed job must not poison the chain
  return next;
}

/**
 * Transcode an uploaded file to a web-friendly, seekable MP4 (H.264/AAC,
 * +faststart) and extract a poster thumbnail + duration. If ffmpeg is not
 * installed, we keep the original file so the flow still works in dev.
 * Serialized through a queue — see enqueue above.
 */
export function processVideo(inputPath: string): ReturnType<typeof processVideoNow> {
  return enqueue(() => processVideoNow(inputPath));
}

async function processVideoNow(inputPath: string): Promise<{
  filePath: string;
  thumbnailPath: string | null;
  durationSec: number | null;
  status: string;
}> {
  ensureDirs();
  const base = path.basename(inputPath, path.extname(inputPath));
  const outName = `${base}.mp4`;
  const outPath = path.join(VIDEO_DIR, outName);
  const thumbName = `${base}.jpg`;
  const thumbPath = path.join(THUMB_DIR, thumbName);

  const transcode = await run(env.FFMPEG_PATH, [
    '-y', '-i', inputPath,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outPath,
  ]);

  if (transcode.code !== 0) {
    // ffmpeg unavailable — fall back to storing the original as-is.
    // LOUD on purpose: an original iPhone HEVC/.mov "plays on my laptop" but
    // not on most Android phones. If this line shows in the logs, install
    // ffmpeg (winget install Gyan.FFmpeg) and run prisma/retranscode-videos.ts.
    console.error(
      `[video] TRANSCODE FAILED (${env.FFMPEG_PATH}): storing original as-is — mobile playback NOT guaranteed. ${transcode.stderr.slice(0, 160)}`,
    );
    const fallback = path.join(VIDEO_DIR, path.basename(inputPath));
    if (inputPath !== fallback) fs.copyFileSync(inputPath, fallback);
    const durationSec = await probeDuration(fallback);
    return {
      filePath: path.relative(env.UPLOAD_DIR, fallback),
      thumbnailPath: null,
      durationSec,
      status: 'ready',
    };
  }

  await run(env.FFMPEG_PATH, ['-y', '-ss', '00:00:02', '-i', outPath, '-frames:v', '1', '-q:v', '3', thumbPath]);
  const durationSec = await probeDuration(outPath);

  // clean up the raw upload
  if (fs.existsSync(inputPath) && inputPath !== outPath) fs.unlinkSync(inputPath);

  return {
    filePath: path.relative(env.UPLOAD_DIR, outPath),
    thumbnailPath: fs.existsSync(thumbPath) ? path.relative(env.UPLOAD_DIR, thumbPath) : null,
    durationSec,
    status: 'ready',
  };
}
