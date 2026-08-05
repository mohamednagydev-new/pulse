import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { emitToThread, emitToUser } from '../lib/realtime';
import { areConnected } from '../lib/social';

export const chatRouter = Router();
chatRouter.use(requireAuth);

const userSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } as const;

async function getOrCreateThread(a: string, b: string) {
  const [userAId, userBId] = [a, b].sort();
  return prisma.dMThread.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });
}

async function otherUser(thread: { userAId: string; userBId: string }, me: string) {
  const otherId = thread.userAId === me ? thread.userBId : thread.userAId;
  return prisma.user.findUnique({ where: { id: otherId }, select: userSelect });
}

// ---- List my threads ----
chatRouter.get('/threads', async (req: AuthedRequest, res) => {
  const threads = await prisma.dMThread.findMany({
    where: { OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
    orderBy: { lastMessageAt: 'desc' },
  });
  const result = await Promise.all(
    threads.map(async (t) => {
      const [other, last, unread] = await Promise.all([
        otherUser(t, req.userId!),
        prisma.dMMessage.findFirst({ where: { threadId: t.id }, orderBy: { createdAt: 'desc' } }),
        prisma.dMMessage.count({ where: { threadId: t.id, senderId: { not: req.userId! }, readAt: null } }),
      ]);
      return { id: t.id, other, lastMessage: last?.text ?? null, lastMessageAt: t.lastMessageAt, unread };
    }),
  );
  res.json(result);
});

// ---- Total unread (for nav badge) ----
chatRouter.get('/unread', async (req: AuthedRequest, res) => {
  const threads = await prisma.dMThread.findMany({
    where: { OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
    select: { id: true },
  });
  const unread = await prisma.dMMessage.count({
    where: { threadId: { in: threads.map((t) => t.id) }, senderId: { not: req.userId! }, readAt: null },
  });
  res.json({ unread });
});

// ---- Open/create a thread with a user ----
chatRouter.post('/threads', async (req: AuthedRequest, res) => {
  const parsed = z.object({ userId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  if (!(await areConnected(req.userId!, parsed.data.userId))) {
    return res.status(403).json({ error: 'Connect with this person to chat' });
  }
  const thread = await getOrCreateThread(req.userId!, parsed.data.userId);
  const other = await otherUser(thread, req.userId!);
  res.json({ id: thread.id, other });
});

// ---- Messages in a thread (marks incoming as read) ----
chatRouter.get('/threads/:id/messages', async (req: AuthedRequest, res) => {
  const thread = await prisma.dMThread.findUnique({ where: { id: req.params.id } });
  if (!thread || (thread.userAId !== req.userId && thread.userBId !== req.userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  await prisma.dMMessage.updateMany({
    where: { threadId: thread.id, senderId: { not: req.userId! }, readAt: null },
    data: { readAt: new Date() },
  });
  const messages = await prisma.dMMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'asc' }, take: 200 });
  const other = await otherUser(thread, req.userId!);
  res.json({ other, messages });
});

// ---- Send a message ----
chatRouter.post('/threads/:id/messages', async (req: AuthedRequest, res) => {
  const parsed = z.object({ text: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const thread = await prisma.dMThread.findUnique({ where: { id: req.params.id } });
  if (!thread || (thread.userAId !== req.userId && thread.userBId !== req.userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const otherIdForGate = thread.userAId === req.userId ? thread.userBId : thread.userAId;
  if (!(await areConnected(req.userId!, otherIdForGate))) {
    return res.status(403).json({ error: 'Connect with this person to chat' });
  }
  const message = await prisma.dMMessage.create({
    data: { threadId: thread.id, senderId: req.userId!, text: parsed.data.text },
  });
  await prisma.dMThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });

  emitToThread(thread.id, 'dm:new', message);
  const otherId = thread.userAId === req.userId ? thread.userBId : thread.userAId;
  emitToUser(otherId, 'dm:inbox', { threadId: thread.id, text: message.text });

  res.status(201).json(message);
});
