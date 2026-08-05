import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// Batched, fire-and-forget product analytics. Never blocks the app.
eventsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      events: z
        .array(z.object({ name: z.string().min(1).max(48), meta: z.string().max(200).optional() }))
        .min(1)
        .max(20),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid events' });
  await prisma.event.createMany({
    data: parsed.data.events.map((e) => ({ userId: req.userId!, name: e.name, meta: e.meta })),
  });
  res.json({ ok: true });
});
