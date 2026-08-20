import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { signMedia } from '../lib/mediaSign';

/** Time-limited URL for a private/ photo (same scheme as daily.ts body photos). */
function signedUrl(photo: string): string {
  if (!photo.startsWith('private/')) return photo; // legacy public-dir rows
  const { exp, sig } = signMedia('image', photo);
  return `/media/image/${photo}?exp=${exp}&sig=${sig}`;
}

// ---------------------------------------------------------------------------
// Private progress-photos vault.
//
// PRIVACY GUARANTEE: rows created here are NEVER exposed by any other
// endpoint — no feed, no profile, no admin listing serves them. The ONLY way
// a ProgressPhoto leaves the database is the owner's own GET '/' below, which
// is hard-filtered to req.userId. Keep it that way: never join or select
// ProgressPhoto anywhere else.
// ---------------------------------------------------------------------------

export const photosRouter = Router();
photosRouter.use(requireAuth);

// ---- My photos, newest first ----
photosRouter.get('/', async (req: AuthedRequest, res) => {
  const rows = await prisma.progressPhoto.findMany({
    where: { userId: req.userId! },
    orderBy: { takenOn: 'desc' },
    take: 200,
    select: { id: true, imagePath: true, weightKg: true, note: true, takenOn: true },
  });
  // Signed URLs: the files live in uploads/private/<userId>/ — unauthenticated
  // image URLs would betray the "only you can see these" promise.
  res.json(rows.map((r) => ({ ...r, url: signedUrl(r.imagePath) })));
});

// ---- Add a photo ----
// The client uploads the file through /api/daily/body-photo (the PRIVATE
// pipeline: uploads/private/<userId>/, served only via signed URLs) and passes
// the returned path here. The caller-folder check below stops a free string
// from pointing the row at another user's photo.
const createSchema = z.object({
  imagePath: z.string().regex(/^private\/[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+\.(jpe?g|png|webp|gif)$/i),
  weightKg: z.number().min(20).max(400).optional(),
  note: z.string().max(200).optional(),
  takenOn: z.coerce.date().optional(),
});

photosRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid photo' });
  // A private path must be inside the CALLER'S own folder — never someone else's.
  if (!parsed.data.imagePath.startsWith(`private/${req.userId}/`)) {
    return res.status(400).json({ error: 'Invalid photo' });
  }
  const takenOn = parsed.data.takenOn ?? new Date();

  // Auto-fill the weight from the tracker: the latest WeightLog within ±2 days
  // of the shot — a photo without its number is half the story.
  let weightKg = parsed.data.weightKg ?? null;
  if (weightKg === null) {
    const day = (d: Date) => d.toISOString().slice(0, 10); // WeightLog.date is YYYY-MM-DD
    const wl = await prisma.weightLog.findFirst({
      where: {
        userId: req.userId!,
        date: {
          gte: day(new Date(takenOn.getTime() - 2 * 86400000)),
          lte: day(new Date(takenOn.getTime() + 2 * 86400000)),
        },
      },
      orderBy: { date: 'desc' },
      select: { weightKg: true },
    });
    weightKg = wl?.weightKg ?? null;
  }

  const row = await prisma.progressPhoto.create({
    data: {
      userId: req.userId!,
      imagePath: parsed.data.imagePath,
      weightKg,
      note: parsed.data.note?.trim() || null,
      takenOn,
    },
    select: { id: true, imagePath: true, weightKg: true, note: true, takenOn: true },
  });
  res.status(201).json(row);
});

// ---- Delete my photo ----
photosRouter.delete('/:id', async (req: AuthedRequest, res) => {
  // deleteMany with the userId guard: someone else's id is a silent 404,
  // never a cross-user delete.
  const r = await prisma.progressPhoto.deleteMany({ where: { id: req.params.id, userId: req.userId! } });
  if (!r.count) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});
