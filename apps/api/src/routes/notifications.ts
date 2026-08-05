import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: AuthedRequest, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  res.json(items);
});

notificationsRouter.get('/unread', async (req: AuthedRequest, res) => {
  const unread = await prisma.notification.count({ where: { userId: req.userId!, readAt: null } });
  res.json({ unread });
});

notificationsRouter.post('/read-all', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId!, readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

notificationsRouter.post('/:id/read', async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.userId! },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});
