import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { dayString } from '../lib/time';
import { countryFilter, countryForRequest } from '../lib/geo';

/** Public partner directory + product catalog.
 *  PULSE is a shop window only — there is no cart, no checkout, no orders.
 *  Users contact partners directly (WhatsApp / phone / website) and everything
 *  after that happens offline between them. We only count the intro. */
export const storeRouter = Router();

const partnerSelect = {
  id: true, type: true, name: true, nameAr: true, tagline: true, taglineAr: true,
  logo: true, cover: true, city: true, phone: true, whatsapp: true, website: true,
  instagram: true, mapUrl: true, featured: true, country: true, currency: true,
} as const;

// Storefront: featured partners + products (optionally filtered by category).
storeRouter.get('/', async (req, res) => {
  const category = String(req.query.category || '').trim();
  // Shops are local. A supplement store that only delivers inside Egypt is not a
  // useful listing in Riyadh, and a product page you cannot buy from is a dead end.
  const country = await countryForRequest(req as any, prisma);
  const local = countryFilter(country);

  const [partners, products] = await Promise.all([
    prisma.partner.findMany({
      where: { active: true, ...local },
      select: partnerSelect,
      orderBy: [{ featured: 'desc' }, { order: 'asc' }],
      take: 30,
    }),
    prisma.partnerProduct.findMany({
      where: { active: true, partner: { active: true, ...local }, ...(category ? { category } : {}) },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      take: 60,
      include: { partner: { select: partnerSelect } },
    }),
  ]);

  const categories = await prisma.partnerProduct.groupBy({
    by: ['category'],
    where: { active: true, partner: { active: true, ...local } },
    _count: true,
  });

  res.json({
    country,
    partners,
    products,
    categories: categories.map((c) => ({ key: c.category, count: c._count })).sort((a, b) => b.count - a.count),
  });
});

// Deals & coupons — shown in-app, redeemed offline at the partner.
storeRouter.get('/deals', async (req, res) => {
  const today = dayString();
  // A coupon you cannot redeem is worse than no coupon — it reads as a broken promise.
  const country = await countryForRequest(req as any, prisma);
  const deals = await prisma.partnerDeal.findMany({
    where: {
      active: true,
      partner: { active: true, ...countryFilter(country) },
      OR: [{ validUntil: null }, { validUntil: { gte: today } }],
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: 40,
    include: { partner: { select: partnerSelect } },
  });
  res.json({ deals });
});

// Count a code reveal — this is the partner's lead metric.
storeRouter.post('/deals/:id/redeem', async (req, res) => {
  const deal = await prisma.partnerDeal.findUnique({ where: { id: req.params.id }, select: { partnerId: true } });
  if (!deal) return res.status(404).json({ error: 'Not found' });
  await Promise.all([
    prisma.partnerDeal.update({ where: { id: req.params.id }, data: { redeems: { increment: 1 } } }),
    prisma.partner.update({ where: { id: deal.partnerId }, data: { contacts: { increment: 1 } } }),
  ]);
  res.json({ ok: true });
});

storeRouter.post('/deals/:id/view', async (req, res) => {
  await prisma.partnerDeal.updateMany({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
  res.json({ ok: true });
});

// One partner + their catalog.
storeRouter.get('/partners/:id', async (req, res) => {
  const partner = await prisma.partner.findFirst({
    where: { id: req.params.id, active: true },
    include: {
      products: { where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] },
      deals: { where: { active: true }, orderBy: { order: 'asc' } },
    },
  });
  if (!partner) return res.status(404).json({ error: 'Not found' });
  prisma.partner.update({ where: { id: partner.id }, data: { views: { increment: 1 } } }).catch(() => {});
  res.json(partner);
});

// Count a contact intent (whatsapp / call / website / product link) for partner reporting.
storeRouter.post('/partners/:id/contact', async (req, res) => {
  await prisma.partner.updateMany({ where: { id: req.params.id }, data: { contacts: { increment: 1 } } });
  res.json({ ok: true });
});

storeRouter.post('/products/:id/contact', async (req, res) => {
  const product = await prisma.partnerProduct.findUnique({ where: { id: req.params.id }, select: { partnerId: true } });
  if (!product) return res.status(404).json({ error: 'Not found' });
  await Promise.all([
    prisma.partnerProduct.update({ where: { id: req.params.id }, data: { contacts: { increment: 1 } } }),
    prisma.partner.update({ where: { id: product.partnerId }, data: { contacts: { increment: 1 } } }),
  ]);
  res.json({ ok: true });
});

storeRouter.post('/products/:id/view', async (req, res) => {
  await prisma.partnerProduct.updateMany({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
  res.json({ ok: true });
});
