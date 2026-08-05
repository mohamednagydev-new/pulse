import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { verifyMedia } from '../lib/mediaSign';

export const mediaRouter = Router();

/**
 * Range-aware video streaming. Responds 206 Partial Content so the browser
 * can seek/scrub. All paid-content gating will hook in here later (Phase 4)
 * — the client never touches raw /uploads URLs.
 */
mediaRouter.get('/video/:id', async (req, res) => {
  if (!verifyMedia('video', req.params.id, Number(req.query.exp), String(req.query.sig || ''))) {
    return res.status(403).json({ error: 'Invalid or expired media link' });
  }
  const video = await prisma.video.findUnique({ where: { id: req.params.id } });
  if (!video) return res.status(404).json({ error: 'Not found' });

  const absPath = path.isAbsolute(video.filePath)
    ? video.filePath
    : path.join(env.UPLOAD_DIR, video.filePath);

  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File missing' });

  const stat = fs.statSync(absPath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    return fs.createReadStream(absPath).pipe(res);
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match && match[1] ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;

  if (start >= stat.size || end >= stat.size) {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    return res.end();
  }

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': 'video/mp4',
  });
  fs.createReadStream(absPath, { start, end }).pipe(res);
});

// Audio streaming (music tracks) — sendFile honors Range for seeking.
mediaRouter.get('/audio/:id', async (req, res) => {
  if (!verifyMedia('audio', req.params.id, Number(req.query.exp), String(req.query.sig || ''))) {
    return res.status(403).json({ error: 'Invalid or expired media link' });
  }
  const track = await prisma.musicTrack.findUnique({ where: { id: req.params.id } });
  if (!track) return res.status(404).json({ error: 'Not found' });
  const abs = path.isAbsolute(track.filePath) ? track.filePath : path.join(env.UPLOAD_DIR, track.filePath);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File missing' });
  res.sendFile(abs);
});

// Static image passthrough for uploaded thumbnails/covers.
mediaRouter.get('/image/*', (req, res) => {
  const rel = (req.params as any)[0] as string;
  const abs = path.join(env.UPLOAD_DIR, 'images', rel);
  if (!abs.startsWith(path.join(env.UPLOAD_DIR, 'images'))) {
    return res.status(400).json({ error: 'Bad path' });
  }
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(abs);
});
