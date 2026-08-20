import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const adminAuditRouter = Router();
adminAuditRouter.use(requireAuth, requireAdmin);

const PAGE_SIZE = 50;

/** GET /api/admin-audit/actions — distinct action slugs for the filter select. */
adminAuditRouter.get('/actions', async (_req, res) => {
  const rows = await prisma.adminAction.findMany({
    distinct: ['action'],
    select: { action: true },
    orderBy: { action: 'asc' },
  });
  res.json(rows.map((r) => r.action));
});

/** GET /api/admin-audit?page&action&q → { rows, total, page }
 *  Each row carries admin: {firstName,lastName,email} (batch-joined in JS —
 *  AdminAction has no relation to User in the schema). */
adminAuditRouter.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const action = String(req.query.action ?? '').trim();
  const q = String(req.query.q ?? '').trim();

  const and: any[] = [];
  if (action) and.push({ action });
  if (q) and.push({ OR: [{ targetId: { contains: q } }, { detail: { contains: q } }] });
  const where = and.length ? { AND: and } : {};

  const [total, entries] = await Promise.all([
    prisma.adminAction.count({ where }),
    prisma.adminAction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const adminIds = [...new Set(entries.map((e) => e.adminId))];
  const admins = adminIds.length
    ? await prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const byId = new Map(admins.map((a) => [a.id, a]));

  const rows = entries.map((e) => {
    const admin = byId.get(e.adminId);
    return {
      ...e,
      admin: admin
        ? { firstName: admin.firstName, lastName: admin.lastName, email: admin.email }
        : null, // admin account deleted since the action was logged
    };
  });

  res.json({ rows, total, page });
});
