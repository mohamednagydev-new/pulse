import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

/**
 * Support inbox — the user-facing half.
 *
 * Anything a user wants to tell us: a suggestion, something broken, a question.
 * They can see what they sent and any reply; `adminNote` is never returned here.
 */
export const supportRouter = Router();
supportRouter.use(requireAuth);

const KINDS = ['suggestion', 'issue', 'question'] as const;

/** Rate limit by hand: cheap, and stops a frustrated user filing forty tickets. */
const MAX_OPEN_PER_USER = 10;
const MIN_GAP_MS = 30_000;

const schema = z.object({
  kind: z.enum(KINDS).default('suggestion'),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
  contact: z.string().trim().max(120).optional(),
  screen: z.string().trim().max(120).optional(),
});

supportRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Add a short subject and at least a sentence of detail.' });
  }

  const [open, last] = await Promise.all([
    prisma.supportTicket.count({ where: { userId: req.userId!, status: { in: ['open', 'in_progress'] } } }),
    prisma.supportTicket.findFirst({ where: { userId: req.userId! }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);
  if (open >= MAX_OPEN_PER_USER) {
    return res.status(429).json({ error: 'You have a few open already — we will get back to those first.' });
  }
  if (last && Date.now() - last.createdAt.getTime() < MIN_GAP_MS) {
    return res.status(429).json({ error: 'Give it a moment before sending another.' });
  }

  const ticket = await prisma.supportTicket.create({
    data: { ...parsed.data, userId: req.userId! },
    select: { id: true, kind: true, subject: true, status: true, createdAt: true },
  });
  res.status(201).json(ticket);
});

/** Everything this user has sent, newest first, with any reply. */
supportRouter.get('/mine', async (req: AuthedRequest, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 50,
    // adminNote is deliberately absent.
    select: {
      id: true, kind: true, subject: true, body: true, status: true,
      reply: true, repliedAt: true, createdAt: true,
    },
  });
  res.json(tickets);
});
