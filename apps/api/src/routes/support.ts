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

const KINDS = ['suggestion', 'issue', 'question'] as const;

/**
 * Guest tickets — BEFORE the auth gate. People blocked at the door (can't log
 * in, can't register, OAuth loops) are exactly the ones who need support and
 * exactly the ones who can't reach the in-app form. Contact is required here:
 * with no account there is no other way to answer them. Rate-limited per IP
 * in index.ts.
 */
const guestSchema = z.object({
  name: z.string().trim().max(80).optional(),
  contact: z.string().trim().min(5).max(120),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
});

supportRouter.post('/guest', async (req, res) => {
  const parsed = guestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Add your email/phone, a subject and at least a sentence of detail.' });
  }
  const { name, ...data } = parsed.data;
  const ticket = await prisma.supportTicket.create({
    data: {
      ...data,
      kind: 'question',
      subject: name ? `${data.subject} — ${name}` : data.subject,
      screen: 'guest:login',
    },
    select: { id: true, createdAt: true },
  });
  // Guests are usually locked-out users — the most urgent tickets of all.
  const { notifyUser } = await import('./push');
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, {
      title: 'Guest ticket 📩 (locked-out user?)',
      titleAr: 'رسالة من زائر 📩',
      body: parsed.data.subject,
      bodyAr: parsed.data.subject,
      url: '/admin/support',
      type: 'general',
    }).catch(() => {});
  }
  res.status(201).json(ticket);
});

supportRouter.use(requireAuth);

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
  // Pull-only inboxes rot: tell the admins a human is waiting.
  const { notifyUser } = await import('./push');
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, {
      title: 'New support ticket 📩',
      titleAr: 'تذكرة دعم جديدة 📩',
      body: ticket.subject,
      bodyAr: ticket.subject,
      url: '/admin/support',
      type: 'general',
    }).catch(() => {});
  }
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
