import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { optionalAuth, AuthedRequest } from '../middleware/auth';

export const eventsRouter = Router();
// Optional auth: the acquisition funnel (ad click → landing → onboarding →
// register) happens BEFORE login, which is exactly the part ads money needs
// visibility on. Guests may only write allowlisted funnel/error events.
eventsRouter.use(optionalAuth);

const GUEST_OK = /^(funnel-|client-error)/;

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
  const rows = parsed.data.events
    .filter((e) => req.userId || GUEST_OK.test(e.name))
    .map((e) => ({ userId: req.userId ?? null, name: e.name, meta: e.meta }));
  if (rows.length) await prisma.event.createMany({ data: rows });
  res.json({ ok: true });
});
