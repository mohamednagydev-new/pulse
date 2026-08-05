import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { localizeResponse } from '../lib/localize';
import { dayString, localDow, localMinutes } from '../lib/time';
import { countryFilter, countryForRequest } from '../lib/geo';

/**
 * The venue directory — gyms, studios and clinics.
 *
 * PULSE never touches the transaction here either: we list the place, count the
 * intro, and the user walks in and pays them directly. What makes this worth a
 * partner's money is not the listing, it is that `views` and `contacts` give them a
 * number they can check against their own front desk.
 *
 * Distance is computed in the API rather than the client so an old phone is not
 * doing trigonometry on every scroll, and so a venue with no coordinates simply
 * sorts last instead of crashing the sort.
 */
export const venuesRouter = Router();
venuesRouter.use(localizeResponse);

const SELECT = {
  id: true, type: true, name: true, nameAr: true, tagline: true, taglineAr: true,
  description: true, descriptionAr: true, logo: true, cover: true, gallery: true,
  city: true, address: true, phone: true, whatsapp: true, website: true, instagram: true,
  mapUrl: true, lat: true, lng: true, facilities: true, hours: true,
  ladiesOnly: true, ladiesHours: true,
  country: true, currency: true, priceFromAmount: true, priceFrom: true, priceFromAr: true,
  featured: true, views: true, contacts: true,
} as const;

function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** Great-circle distance in km. Good to a few metres at city scale, which is far
 *  more precision than "which gym is closest" needs. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

/** Weekday keys in the order the app-timezone week runs (Saturday first). */
const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

/** Is it open right now, from the free-text hours object? Deliberately conservative:
 *  anything we cannot parse returns null ("we don't know") rather than a confident
 *  wrong answer, because sending someone to a closed gym is worse than saying nothing. */
function openNow(hours: string | null): boolean | null {
  if (!hours) return null;
  let map: Record<string, string>;
  try {
    map = JSON.parse(hours);
  } catch {
    return null;
  }

  // App timezone, not the server's. A box running UTC would otherwise report a Cairo
  // gym as shut for the two hours it is actually busiest.
  const today = DAYS[(localDow() + 1) % 7]; // 0=Sun -> our list starts Saturday
  const span = map[today];
  if (!span || span === 'closed') return span === 'closed' ? false : null;

  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(span.trim());
  if (!m) return null;

  const mins = localMinutes();
  const from = Number(m[1]) * 60 + Number(m[2]);
  let to = Number(m[3]) * 60 + Number(m[4]);
  if (to <= from) to += 24 * 60; // closes after midnight

  // The second test catches the small hours: at 01:00 on a "18:00-02:00" span, `mins`
  // is 60, which is below `from` until you add a day to it.
  return (mins >= from && mins < to) || (mins + 24 * 60 >= from && mins + 24 * 60 < to);
}

function parseObject(json: string | null): Record<string, string> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// The directory. ?lat&lng sorts by distance, ?city / ?facility / ?ladies filter.
venuesRouter.get('/', async (req, res) => {
  const type = String(req.query.type || 'gym').trim();
  const city = String(req.query.city || '').trim();
  const facility = String(req.query.facility || '').trim();
  const ladies = String(req.query.ladies || '') === '1';
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  // Only the LOCAL half of the app is scoped. A gym in another country is noise.
  const country = await countryForRequest(req as any, prisma);

  const rows = await prisma.partner.findMany({
    where: {
      active: true,
      ...countryFilter(country),
      ...(type && type !== 'all' ? { type } : {}),
      ...(city ? { city } : {}),
      ...(ladies ? { ladiesOnly: true } : {}),
    },
    select: SELECT,
    orderBy: [{ featured: 'desc' }, { order: 'asc' }],
    take: 100,
  });

  // Facility filtering happens here because the list is stored as JSON — a LIKE on
  // the raw string would match "pool" inside "poolside" and similar nonsense.
  const filtered = facility
    ? rows.filter((r) => parseList(r.facilities).includes(facility))
    : rows;

  const withMeta = filtered.map((r) => ({
    ...r,
    facilities: parseList(r.facilities),
    gallery: parseList(r.gallery),
    openNow: openNow(r.hours),
    distanceKm: hasPoint && r.lat != null && r.lng != null ? distanceKm(lat, lng, r.lat, r.lng) : null,
  }));

  // Nearest first when we know where they are; venues without coordinates keep their
  // curated order at the end rather than being hidden.
  if (hasPoint) {
    withMeta.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  const cities = await prisma.partner.groupBy({
    by: ['city'],
    where: {
      active: true,
      ...countryFilter(country),
      ...(type && type !== 'all' ? { type } : {}),
      city: { not: null },
    },
    _count: true,
  });

  // Only offer filters that would actually return something.
  const facilityCounts = new Map<string, number>();
  for (const r of rows) for (const f of parseList(r.facilities)) facilityCounts.set(f, (facilityCounts.get(f) ?? 0) + 1);

  res.json({
    country,
    venues: withMeta,
    cities: cities.map((c) => ({ city: c.city, count: c._count })).filter((c) => c.city),
    facilities: [...facilityCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
  });
});

venuesRouter.get('/:id', async (req, res) => {
  const v = await prisma.partner.findFirst({
    where: { id: req.params.id, active: true },
    select: {
      ...SELECT,
      deals: { where: { active: true }, orderBy: { order: 'asc' } },
      leadForms: { where: { active: true }, orderBy: { order: 'asc' } },
      events: {
        where: { active: true, date: { gte: dayString() } },
        orderBy: { date: 'asc' },
        take: 6,
      },
    },
  });
  if (!v) return res.status(404).json({ error: 'Not found' });

  prisma.partner.update({ where: { id: v.id }, data: { views: { increment: 1 } } }).catch(() => {});

  res.json({
    ...v,
    facilities: parseList(v.facilities),
    gallery: parseList(v.gallery),
    openNow: openNow(v.hours),
    hours: parseObject(v.hours),
  });
});
