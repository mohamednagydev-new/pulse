import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { countryFilter, countryForRequest } from '../lib/geo';
import { requireAuth, optionalAuth, AuthedRequest } from '../middleware/auth';
import { dayString } from '../lib/time';

/** Events board + partner lead forms.
 *  Same shop-window rule as the store: we never take a booking or a payment.
 *  Events link out; lead forms hand the partner a name and a phone number.
 *  Both are paid placements — that's the revenue, not a cut of the sale. */
export const boardRouter = Router();

const partnerSelect = {
  id: true, name: true, nameAr: true, logo: true, city: true,
  phone: true, whatsapp: true, website: true,
} as const;

/* --------------------------------- Events --------------------------------- */

// Upcoming events, sponsored/featured first. `city` and `kind` narrow the list.
boardRouter.get('/events', optionalAuth, async (req: AuthedRequest, res) => {
  const city = String(req.query.city || '').trim();
  const kind = String(req.query.kind || '').trim();
  const today = dayString();

  // Events are the most local thing in the app — you have to physically be there.
  const country = await countryForRequest(req as any, prisma);

  const events = await prisma.fitEvent.findMany({
    where: {
      active: true,
      date: { gte: today },
      ...countryFilter(country),
      ...(city ? { city } : {}),
      ...(kind ? { kind } : {}),
    },
    orderBy: [{ featured: 'desc' }, { date: 'asc' }],
    take: 40,
    include: {
      partner: { select: partnerSelect },
      _count: { select: { rsvps: true } },
    },
  });

  const mine = req.userId
    ? await prisma.eventRsvp.findMany({
        where: { userId: req.userId, eventId: { in: events.map((e) => e.id) } },
        select: { eventId: true, status: true },
      })
    : [];
  const mineMap = new Map(mine.map((r) => [r.eventId, r.status]));

  const cities = await prisma.fitEvent.groupBy({
    by: ['city'],
    where: { active: true, date: { gte: today }, ...countryFilter(country), city: { not: null } },
    _count: true,
  });

  res.json({
    country,
    events: events.map(({ _count, ...e }) => ({ ...e, going: _count.rsvps, myRsvp: mineMap.get(e.id) ?? null })),
    cities: cities.map((c) => ({ city: c.city, count: c._count })).filter((c) => c.city),
  });
});

boardRouter.get('/events/:id', optionalAuth, async (req: AuthedRequest, res) => {
  const event = await prisma.fitEvent.findFirst({
    where: { id: req.params.id, active: true },
    include: { partner: { select: partnerSelect }, _count: { select: { rsvps: true } } },
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  await prisma.fitEvent.update({ where: { id: event.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const myRsvp = req.userId
    ? await prisma.eventRsvp.findUnique({ where: { eventId_userId: { eventId: event.id, userId: req.userId } } })
    : null;

  const { _count, ...rest } = event;
  res.json({ ...rest, going: _count.rsvps, myRsvp: myRsvp?.status ?? null });
});

// Toggle RSVP. Posting the status you already have clears it.
boardRouter.post('/events/:id/rsvp', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ status: z.enum(['going', 'interested']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const event = await prisma.fitEvent.findFirst({ where: { id: req.params.id, active: true }, select: { id: true } });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const key = { eventId_userId: { eventId: event.id, userId: req.userId! } };
  const existing = await prisma.eventRsvp.findUnique({ where: key });

  if (existing?.status === parsed.data.status) {
    await prisma.eventRsvp.delete({ where: key }).catch(() => {});
    const going = await prisma.eventRsvp.count({ where: { eventId: event.id } });
    return res.json({ status: null, going });
  }

  await prisma.eventRsvp.upsert({
    where: key,
    create: { eventId: event.id, userId: req.userId!, status: parsed.data.status },
    update: { status: parsed.data.status },
  });
  const going = await prisma.eventRsvp.count({ where: { eventId: event.id } });
  res.json({ status: parsed.data.status, going });
});

// A tap on the partner's booking link or WhatsApp — this is what the partner pays for.
boardRouter.post('/events/:id/contact', async (req, res) => {
  await prisma.fitEvent.update({ where: { id: req.params.id }, data: { contacts: { increment: 1 } } }).catch(() => {});
  res.json({ ok: true });
});

/* -------------------------------- Lead forms -------------------------------- */

boardRouter.get('/lead-forms', async (req, res) => {
  const partnerId = String(req.query.partnerId || '').trim();
  const forms = await prisma.partnerLeadForm.findMany({
    where: { active: true, partner: { active: true }, ...(partnerId ? { partnerId } : {}) },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: 30,
    include: { partner: { select: partnerSelect } },
  });
  res.json(forms);
});

boardRouter.get('/lead-forms/:id', async (req, res) => {
  const form = await prisma.partnerLeadForm.findFirst({
    where: { id: req.params.id, active: true, partner: { active: true } },
    include: { partner: { select: partnerSelect } },
  });
  if (!form) return res.status(404).json({ error: 'Not found' });
  await prisma.partnerLeadForm.update({ where: { id: form.id }, data: { views: { increment: 1 } } }).catch(() => {});
  res.json(form);
});

const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(6).max(20),
  city: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
});

/** One lead per form per day per user — stops a double-tap billing the partner twice. */
boardRouter.post('/lead-forms/:id/submit', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check your name and phone number' });

  const form = await prisma.partnerLeadForm.findFirst({
    where: { id: req.params.id, active: true, partner: { active: true } },
    select: { id: true },
  });
  if (!form) return res.status(404).json({ error: 'Not found' });

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const recent = await prisma.lead.findFirst({
    where: { formId: form.id, userId: req.userId!, createdAt: { gte: since } },
    select: { id: true },
  });
  if (recent) return res.status(409).json({ error: 'We already have your request — they will call you soon' });

  await prisma.lead.create({
    data: {
      formId: form.id,
      userId: req.userId!,
      name: parsed.data.name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      note: parsed.data.note,
    },
  });
  // A lead is the billable artefact — the admins should hear about it the
  // second it lands, not whenever they next open the dashboard.
  const { notifyUser } = await import('./push');
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, {
      title: 'New partner lead 💰',
      titleAr: 'عميل جديد للشريك 💰',
      body: `${parsed.data.name} (${parsed.data.city ?? '—'}) → ${form.id}`,
      bodyAr: `${parsed.data.name} (${parsed.data.city ?? '—'})`,
      url: '/admin/leads',
      type: 'general',
    }).catch(() => {});
  }
  res.status(201).json({ ok: true });
});
