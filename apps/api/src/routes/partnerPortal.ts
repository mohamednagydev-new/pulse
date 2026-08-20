import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

/**
 * Partner self-service: the gym/clinic/store owner (a normal User the admin
 * linked via Partner.managerUserId) edits their own page and works their own
 * leads — instead of every text change and phone number going through you.
 */
export const partnerPortalRouter = Router();
partnerPortalRouter.use(requireAuth);

async function myPartner(userId: string) {
  return prisma.partner.findFirst({ where: { managerUserId: userId } });
}

partnerPortalRouter.get('/me', async (req: AuthedRequest, res) => {
  const partner = await myPartner(req.userId!);
  if (!partner) return res.json({ partner: null });
  const [newLeads, totalLeads, gymMembers] = await Promise.all([
    prisma.lead.count({ where: { form: { partnerId: partner.id }, status: 'new' } }),
    prisma.lead.count({ where: { form: { partnerId: partner.id } } }),
    // Gyms get a member count up front — the hub shows their gym toolkit.
    partner.type === 'gym' ? prisma.user.count({ where: { gymId: partner.id } }) : Promise.resolve(0),
  ]);
  res.json({ partner, newLeads, totalLeads, gymMembers });
});

// The manager edits presentation + contact — never type/active/city-scoping,
// which stay admin-controlled (they affect directory placement).
const patchSchema = z.object({
  tagline: z.string().max(120).optional(),
  taglineAr: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().regex(/^\d{8,15}$/).optional().or(z.literal('')),
  website: z.string().max(300).optional(),
  instagram: z.string().max(300).optional(),
  mapUrl: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  logo: z.string().regex(/^images\/[A-Za-z0-9_-]+\.(jpe?g|png|webp|gif)$/i).optional(),
  cover: z.string().regex(/^images\/[A-Za-z0-9_-]+\.(jpe?g|png|webp|gif)$/i).optional(),
});

partnerPortalRouter.patch('/me', async (req: AuthedRequest, res) => {
  const partner = await myPartner(req.userId!);
  if (!partner) return res.status(403).json({ error: 'No partner page linked to your account' });
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid fields' });
  const data = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  const updated = await prisma.partner.update({ where: { id: partner.id }, data });
  res.json(updated);
});

partnerPortalRouter.get('/leads', async (req: AuthedRequest, res) => {
  const partner = await myPartner(req.userId!);
  if (!partner) return res.status(403).json({ error: 'No partner page linked to your account' });
  const leads = await prisma.lead.findMany({
    where: { form: { partnerId: partner.id } },
    include: { form: { select: { title: true, titleAr: true, kind: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(leads);
});

partnerPortalRouter.patch('/leads/:id', async (req: AuthedRequest, res) => {
  const partner = await myPartner(req.userId!);
  if (!partner) return res.status(403).json({ error: 'No partner page linked to your account' });
  const parsed = z.object({ status: z.enum(['new', 'contacted', 'won', 'lost']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid status' });
  const updated = await prisma.lead.updateMany({
    where: { id: req.params.id, form: { partnerId: partner.id } },
    data: { status: parsed.data.status },
  });
  if (!updated.count) return res.status(404).json({ error: 'Lead not found' });
  res.json({ ok: true });
});

// ---- Monthly report (rate card §7, self-serve) ----
partnerPortalRouter.get('/report', async (req: AuthedRequest, res) => {
  const partner = await myPartner(req.userId!);
  if (!partner) return res.status(404).json({ error: 'No partner page linked to this account' });
  const { buildPartnerReport } = await import('../lib/partnerReport');
  const report = await buildPartnerReport(partner.id, String(req.query.month ?? '') || undefined);
  res.json(report);
});
