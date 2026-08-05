/**
 * Fill in the venue details on the demo partners.
 *
 * The gym directory was built after these were seeded, so the demo gym has no
 * coordinates, no hours and no facilities — which means the Find-a-gym screen shows
 * a card with no distance, no "open now" and no filters, and looks broken rather
 * than empty.
 *
 * This is also the worked example an admin copies when adding a real gym: it shows
 * exactly what shape `facilities`, `hours` and `gallery` expect.
 *
 * Coordinates are real points in Cairo/Giza/Alexandria so distance sorting can be
 * checked against a phone that is actually in the city.
 *
 * Idempotent — matched on name, and it only fills fields that are still empty so it
 * can never overwrite a real venue someone has since edited.
 *
 * Run: npx tsx prisma/seed-venue-demo.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** Saturday-first, matching the app's week. "closed" is understood; anything the
 *  parser cannot read simply hides the open/closed badge rather than guessing. */
const GYM_HOURS = {
  sat: '06:00-00:00',
  sun: '06:00-00:00',
  mon: '06:00-00:00',
  tue: '06:00-00:00',
  wed: '06:00-00:00',
  thu: '06:00-00:00',
  fri: '14:00-00:00',
};

const SHOP_HOURS = {
  sat: '10:00-23:00',
  sun: '10:00-23:00',
  mon: '10:00-23:00',
  tue: '10:00-23:00',
  wed: '10:00-23:00',
  thu: '10:00-23:00',
  fri: '16:00-23:00',
};

type Fill = {
  name: string;
  lat: number;
  lng: number;
  address: string;
  facilities: string[];
  hours: Record<string, string>;
  ladiesOnly?: boolean;
  ladiesHours?: string;
  /** A number, not a string. The app formats it in the viewer's locale using the
   *  partner's own currency — never converted. */
  priceFromAmount?: number;
};

const FILLS: Fill[] = [
  {
    name: 'IronHouse Gym (Demo)',
    lat: 30.0131, // Dokki, Giza
    lng: 31.2089,
    address: '12 Tahrir St, Dokki, Giza',
    facilities: ['weights', 'cardio', 'classes', 'showers', 'lockers', 'pt', 'parking'],
    hours: GYM_HOURS,
    ladiesHours: 'يومياً من ١٠ص لـ ٢م — قسم مخصص للسيدات',
    priceFromAmount: 600,
  },
  {
    name: 'NutriPower (Demo)',
    lat: 30.0626, // Zamalek, Cairo
    lng: 31.2197,
    address: '8 Brazil St, Zamalek, Cairo',
    facilities: [],
    hours: SHOP_HOURS,
  },
  {
    name: 'FitGear Store (Demo)',
    lat: 31.2156, // Smouha, Alexandria
    lng: 29.9553,
    address: '45 Victor Emanuel Sq, Smouha, Alexandria',
    facilities: [],
    hours: SHOP_HOURS,
  },
];

/**
 * One venue outside Egypt, so country scoping can actually be seen working.
 *
 * With every demo partner in EG the filter looks like a no-op and nobody notices it
 * is wrong until a real Saudi user does. This gives the Find-a-gym screen something
 * to hide when the viewer's country is EG, and something to show when it is SA.
 */
async function seedSecondCountry() {
  const name = 'Riyadh Fit (Demo)';
  if (await prisma.partner.findFirst({ where: { name } })) return 0;
  await prisma.partner.create({
    data: {
      type: 'gym',
      name,
      nameAr: 'رياض فِت (تجريبي)',
      tagline: 'Strength and conditioning',
      taglineAr: 'قوة ولياقة',
      city: 'Riyadh',
      country: 'SA',
      currency: 'SAR',
      address: 'King Fahd Rd, Al Olaya, Riyadh',
      lat: 24.7136,
      lng: 46.6753,
      phone: '+966500000001',
      whatsapp: '966500000001',
      facilities: JSON.stringify(['weights', 'cardio', 'pt', 'showers']),
      hours: JSON.stringify({
        sat: '06:00-23:00', sun: '06:00-23:00', mon: '06:00-23:00', tue: '06:00-23:00',
        wed: '06:00-23:00', thu: '06:00-23:00', fri: '14:00-23:00',
      }),
      priceFromAmount: 350,
      active: true,
      order: 50,
    },
  });
  console.log('  + Riyadh Fit (Demo) — SA/SAR, so country scoping is visible');
  return 1;
}

async function main() {
  await seedSecondCountry();
  let filled = 0;
  const missing: string[] = [];

  for (const f of FILLS) {
    const p = await prisma.partner.findFirst({ where: { name: f.name } });
    if (!p) {
      missing.push(f.name);
      continue;
    }

    // Only fill blanks. If someone has already put a real address or real hours on
    // this row, a re-run must not stamp the demo values back over them.
    const data: Record<string, unknown> = {};
    if (p.lat == null) data.lat = f.lat;
    if (p.lng == null) data.lng = f.lng;
    if (!p.address) data.address = f.address;
    if (!p.facilities && f.facilities.length) data.facilities = JSON.stringify(f.facilities);
    if (!p.hours) data.hours = JSON.stringify(f.hours);
    if (!p.ladiesHours && f.ladiesHours) data.ladiesHours = f.ladiesHours;
    if (p.priceFromAmount == null && f.priceFromAmount != null) data.priceFromAmount = f.priceFromAmount;
    if (f.ladiesOnly && !p.ladiesOnly) data.ladiesOnly = true;

    if (Object.keys(data).length === 0) continue;
    await prisma.partner.update({ where: { id: p.id }, data });
    filled++;
    console.log(`  · ${f.name}: ${Object.keys(data).join(', ')}`);
  }

  const gyms = await prisma.partner.count({ where: { type: 'gym', active: true } });
  const mapped = await prisma.partner.count({ where: { type: 'gym', active: true, lat: { not: null } } });

  console.log(`\nVenue details: ${filled} partners updated`);
  console.log(`Gyms: ${gyms} listed · ${mapped} with coordinates (only these can be sorted by distance)`);
  if (missing.length) console.log(`  demo partners not present (fine on a live DB): ${missing.join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
