import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const musicRouter = Router();
musicRouter.use(requireAuth);

const musicDir = path.join(env.UPLOAD_DIR, 'music');
const tmpDir = path.join(env.UPLOAD_DIR, 'tmp');
fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir, limits: { fileSize: 30 * 1024 * 1024 } });

// A user's own tracks + all admin default tracks.
musicRouter.get('/', async (req: AuthedRequest, res) => {
  const tracks = await prisma.musicTrack.findMany({
    where: { OR: [{ userId: req.userId! }, { isDefault: true }] },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(tracks);
});

musicRouter.post('/', upload.single('file'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!/^audio\//.test(req.file.mimetype || '')) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Audio files only' });
  }
  // Extension from the validated mime, never the client's filename — the file is
  // later served by extension-inferred Content-Type.
  const ext = {
    'audio/mpeg': '.mp3', 'audio/mp3': '.mp3', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a',
    'audio/aac': '.aac', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/ogg': '.ogg', 'audio/webm': '.weba',
  }[req.file.mimetype] ?? '.mp3';
  const name = `${req.file.filename}${ext}`;
  fs.renameSync(req.file.path, path.join(musicDir, name));

  const title = (req.body?.title as string) || req.file.originalname.replace(/\.[^.]+$/, '') || 'Track';
  const wantsDefault = (req.body?.isDefault === 'true' || req.body?.isDefault === true) && req.role === 'ADMIN';

  const track = await prisma.musicTrack.create({
    data: {
      userId: wantsDefault ? null : req.userId!,
      title,
      filePath: `music/${name}`,
      isDefault: wantsDefault,
    },
  });
  res.status(201).json(track);
});

// Promote an existing track to the everyone-default (admin). Before this, a
// track uploaded without the "default" checkbox was stuck personal forever —
// the only fix was delete + re-upload.
musicRouter.patch('/:id/default', async (req: AuthedRequest, res) => {
  if (req.role !== 'ADMIN') return res.status(403).json({ error: 'Admins only' });
  const track = await prisma.musicTrack.findUnique({ where: { id: req.params.id } });
  if (!track) return res.status(404).json({ error: 'Not found' });
  const makeDefault = !track.isDefault;
  await prisma.musicTrack.update({
    where: { id: track.id },
    // Default tracks are global: detach from the uploader so they read as
    // app-owned (matches how default uploads are stored with userId null).
    data: makeDefault ? { isDefault: true, userId: null } : { isDefault: false, userId: req.userId! },
  });
  res.json({ ok: true, isDefault: makeDefault });
});

// Mark one of my tracks as the session favorite (only one at a time).
musicRouter.patch('/:id/favorite', async (req: AuthedRequest, res) => {
  const track = await prisma.musicTrack.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!track) return res.status(404).json({ error: 'Not found' });
  await prisma.musicTrack.updateMany({ where: { userId: req.userId! }, data: { favorite: false } });
  await prisma.musicTrack.update({ where: { id: track.id }, data: { favorite: true } });
  res.json({ ok: true });
});

musicRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const track = await prisma.musicTrack.findUnique({ where: { id: req.params.id } });
  if (!track) return res.json({ ok: true });
  const canDelete = track.userId === req.userId || (track.isDefault && req.role === 'ADMIN');
  if (!canDelete) return res.status(403).json({ error: 'Forbidden' });
  await prisma.musicTrack.delete({ where: { id: track.id } });
  res.json({ ok: true });
});
