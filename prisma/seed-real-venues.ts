/**
 * Real venues + real events (replaces the purged "(Demo)" partners and the
 * seed-board demo events — run prisma/clean-demo.ts first).
 *
 * Every gym and event below is a REAL business/event with publicly listed info,
 * researched Aug 2026; each entry carries a `source:` comment with the public
 * listing it was taken from. Only public directory info is used: name, area,
 * publicly listed phone, general facilities, published hours. No prices, deals,
 * products or lead forms are invented for real businesses — those stay empty
 * until the venue itself is onboarded.
 *
 * Coordinates marked "approx" are neighbourhood-level (from the published
 * address), good enough for distance sorting; refine when a venue is onboarded.
 *
 * Idempotent: matched on exact name/title — existing rows are SKIPPED, never
 * overwritten, so admin edits made after onboarding a venue survive re-runs.
 *
 * Run: node node_modules/tsx/dist/cli.mjs prisma/seed-real-venues.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const J = (v: unknown) => JSON.stringify(v);

/** Same weekly shape seed-venue-demo used (Saturday-first, matching the app). */
const daily = (h: string, fri?: string) => ({
  sat: h, sun: h, mon: h, tue: h, wed: h, thu: h, fri: fri ?? h,
});

type GymSeed = {
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  city: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  facilities: string[];
  hours?: Record<string, string>;
  ladiesOnly?: boolean;
  ladiesHours?: string;
  website?: string;
};

const GYMS: GymSeed[] = [
  // ---------------- Cairo / Giza ----------------
  {
    // source: https://yellowpages.com.eg/en/profile/gold's-gym-egypt/7298 (address + phone)
    // Egypt's first Gold's Gym branch (open since 1997).
    name: "Gold's Gym Maadi",
    nameAr: 'جولدز جيم — المعادي',
    tagline: 'International chain, full-service branch',
    taglineAr: 'سلسلة عالمية وفرع متكامل',
    city: 'Cairo',
    address: '1 El Mahatta Square, Maadi, Cairo',
    phone: '+20223803601',
    lat: 29.9603, // approx — El Mahatta Sq, Maadi
    lng: 31.2503,
    facilities: ['weights', 'cardio', 'classes', 'pt', 'lockers', 'showers'],
    website: 'https://goldsgymegypt.com',
  },
  {
    // source: https://cairogyms.com/golds-gym-new-cairo/ (address, phone, hours, facilities incl. pool + ladies floor)
    name: "Gold's Gym Katameya (New Cairo)",
    nameAr: 'جولدز جيم — القطامية (التجمع)',
    tagline: 'Pool, classes and a ladies-only floor',
    taglineAr: 'حمام سباحة وحصص وطابق مخصص للسيدات',
    city: 'Cairo',
    address: 'Concord Plaza Mall, Road 90, New Cairo',
    phone: '+201099199013',
    lat: 30.0064, // approx — Road 90, New Cairo
    lng: 31.4432,
    facilities: ['weights', 'cardio', 'classes', 'pool', 'sauna', 'pt', 'kids', 'lockers', 'showers'],
    hours: daily('05:00-00:00'),
    ladiesHours: 'طابق منفصل مخصص للسيدات طوال ساعات العمل — separate ladies-only workout floor',
    website: 'https://goldsgymegypt.com',
  },
  {
    // source: https://eg.aqaraman.com/en/gyms-in-cairo/ (listed among Maadi's popular full-service gyms)
    name: 'Oxygen Gym Maadi',
    nameAr: 'أوكسجين جيم — المعادي',
    tagline: 'Popular Maadi all-levels gym',
    taglineAr: 'جيم شعبي في المعادي لكل المستويات',
    city: 'Cairo',
    facilities: ['weights', 'cardio', 'classes', 'pt'],
  },
  {
    // source: https://eg.aqaraman.com/en/gyms-in-cairo/ (mixed 24-hour gym in Maadi, certified trainers)
    name: 'Transformers Gym Maadi',
    nameAr: 'ترانسفورمرز جيم — المعادي',
    tagline: 'Mixed gym, open around the clock',
    taglineAr: 'جيم مختلط شغال ٢٤ ساعة',
    city: 'Cairo',
    facilities: ['weights', 'cardio', 'pt'],
    hours: daily('00:00-24:00'),
  },
  {
    // source: https://www.propertyfinder.eg/blog/en/gyms-in-cairo/ (prominent Zamalek fitness centre)
    name: 'Inshape Fitness Zamalek',
    nameAr: 'إن شيب فيتنس — الزمالك',
    tagline: 'Zamalek health & fitness club',
    taglineAr: 'نادي صحة ولياقة في الزمالك',
    city: 'Cairo',
    lat: 30.0609, // approx — Zamalek
    lng: 31.2197,
    facilities: ['weights', 'cardio', 'classes'],
  },
  {
    // source: https://welpstar.com/biz/samia-allouba-gym-dance-fitness-centers/branches (ladies-only Maadi branch + phone)
    // also: https://www.cairo360.com/article/health-fitness/5-fitness-centres-with-ladies-only-options/
    name: 'Samia Allouba Ladies Only — Maadi',
    nameAr: 'سامية علوبة للسيدات — المعادي',
    tagline: 'Ladies-only gym, dance & fitness centre',
    taglineAr: 'جيم ورقص ولياقة للسيدات فقط',
    city: 'Cairo',
    phone: '+201227480201',
    facilities: ['weights', 'cardio', 'classes'],
    ladiesOnly: true,
  },
  {
    // source: https://cairogyms.com/top-13-ladies-only-gyms-with-kids-area/ (Hers — The District, Sheraton; phone; spa/sauna)
    name: 'Hers Ladies Gym — Sheraton',
    nameAr: 'هيرز جيم للسيدات — شيراتون',
    tagline: 'Ladies-only gym with spa and sauna',
    taglineAr: 'جيم للسيدات فقط بسبا وساونا',
    city: 'Cairo',
    address: 'The District, Sheraton, Cairo',
    phone: '+201060022213',
    lat: 30.1063, // approx — Sheraton district
    lng: 31.3707,
    facilities: ['weights', 'cardio', 'classes', 'sauna'],
    ladiesOnly: true,
  },
  {
    // source: https://www.nawy.com/blog/120092-best-gyms-in-egypt-east-west-cairo-north-coast-more (premium New Cairo gym, certified trainers)
    name: 'Be Fit 360 — New Cairo',
    nameAr: 'بي فيت ٣٦٠ — التجمع الخامس',
    tagline: 'Premium training, certified coaches',
    taglineAr: 'تدريب بريميوم مع مدربين معتمدين',
    city: 'Cairo',
    facilities: ['weights', 'cardio', 'classes', 'pt'],
  },
  // ---------------- Alexandria ----------------
  {
    // source: https://ptpeople.com/africa-gyms/egypt-gyms/alexandria-gyms/ (Smouha branch, daily 6am-11pm)
    name: "Gold's Gym Smouha",
    nameAr: 'جولدز جيم — سموحة',
    tagline: 'International chain in Smouha',
    taglineAr: 'سلسلة عالمية في سموحة',
    city: 'Alexandria',
    lat: 31.2135, // approx — Smouha
    lng: 29.9426,
    facilities: ['weights', 'cardio', 'classes', 'pt'],
    hours: daily('06:00-23:00'),
    website: 'https://goldsgymegypt.com',
  },
  {
    // source: https://www.localgymsandfitness.com/EG/Alexandria/67406/genre/184405378265823/Gym%2FPhysical+Fitness+Center (address + phone)
    // also: https://www.facebook.com/ReformGym/
    name: 'Reform Gym Smouha',
    nameAr: 'ريفورم جيم — سموحة',
    tagline: 'Neighbourhood strength & fitness gym',
    taglineAr: 'جيم قوة ولياقة في قلب سموحة',
    city: 'Alexandria',
    address: 'Building E, Nakl & Handasa St, Smouha, Alexandria',
    phone: '+201021919195',
    lat: 31.2110, // approx — Smouha
    lng: 29.9440,
    facilities: ['weights', 'cardio', 'pt'],
  },
  {
    // source: https://www.hammamgym.com/smouha (address + published hours)
    name: 'Hammam Gym Smouha',
    nameAr: 'همام جيم — سموحة',
    tagline: 'Fitness & wellness in Valore Antoniades',
    taglineAr: 'لياقة وصحة في فالوري أنطونيادس',
    city: 'Alexandria',
    address: 'Valore Antoniades, El Mahmoudeya Rd, Smouha, Alexandria',
    lat: 31.2010, // approx — Antoniades, Smouha
    lng: 29.9430,
    facilities: ['weights', 'cardio', 'classes'],
    hours: { ...daily('06:00-21:00'), thu: '06:00-22:00', fri: '06:00-22:00' },
    website: 'https://www.hammamgym.com/smouha',
  },
];

/** Next occurrence of a weekday (0=Sun..5=Fri,6=Sat), as YYYY-MM-DD — for the
 *  weekly community runs, so the board never shows a past date. */
function nextWeekday(weekday: number): string {
  const d = new Date();
  const diff = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

type EventSeed = {
  kind: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  city: string;
  venue: string;
  venueAr: string;
  date: string;
  time?: string;
  price?: string;
  url?: string;
  featured?: boolean;
};

const EVENTS: EventSeed[] = [
  {
    // source: https://www.cairorunners.com/our-runs/ (weekly Friday-morning community run since 2012)
    kind: 'race',
    title: 'Cairo Runners — Friday Morning Run',
    titleAr: 'كايرو رانرز — جري الجمعة الصبح',
    description: 'Egypt\'s biggest running community meets every Friday morning for a group run open to all levels. Route and meeting point are announced weekly on Cairo Runners\' pages.',
    descriptionAr: 'أكبر مجتمع جري في مصر بيتقابل كل جمعة الصبح لجري جماعي لكل المستويات. المكان والمسار بيتعلنوا كل أسبوع على صفحات كايرو رانرز.',
    city: 'Cairo',
    venue: 'Meeting point announced weekly',
    venueAr: 'مكان التجمع بيتعلن أسبوعياً',
    date: nextWeekday(5), // next Friday
    time: '7:00 AM',
    price: 'Free',
    url: 'https://www.cairorunners.com/our-runs/',
    featured: true,
  },
  {
    // source: https://www.facebook.com/AlexRunners1/ (weekly runs Fri & Sun 7:00 AM, Latino Gleem parking)
    kind: 'race',
    title: 'Alex Runners — Friday Morning Run',
    titleAr: 'أليكس رانرز — جري الجمعة الصبح',
    description: 'Alexandria\'s running community meets Friday mornings by the sea. All ages and paces welcome — walk it or run it.',
    descriptionAr: 'مجتمع الجري في إسكندرية بيتقابل كل جمعة الصبح على البحر. كل الأعمار والمستويات مرحب بيها — امشيها أو اجريها.',
    city: 'Alexandria',
    venue: 'Latino Beach parking, Gleem',
    venueAr: 'موقف شاطئ لاتينو، جليم',
    date: nextWeekday(5), // next Friday
    time: '7:00 AM',
    price: 'Free',
    url: 'https://www.facebook.com/AlexRunners1/',
  },
  {
    // source: https://www.ahotu.com/event/alexandria-marathon (6 Nov 2026, start/finish at Bibliotheca Alexandrina)
    // also: https://alexandriamarathon.com/
    kind: 'race',
    title: 'Alexandria Marathon 2026',
    titleAr: 'ماراثون إسكندرية ٢٠٢٦',
    description: 'Full marathon, 21K, 10K, 5K and family races along the Mediterranean Corniche, starting and finishing at the Bibliotheca Alexandrina.',
    descriptionAr: 'ماراثون كامل و٢١ و١٠ و٥ كيلو وسباقات عائلية على كورنيش البحر، البداية والنهاية عند مكتبة الإسكندرية.',
    city: 'Alexandria',
    venue: 'Bibliotheca Alexandrina',
    venueAr: 'مكتبة الإسكندرية',
    date: '2026-11-06',
    time: 'Early morning start',
    url: 'https://alexandriamarathon.com/',
    featured: true,
  },
  {
    // source: https://www.thetrifactory.com/MarakezPyramidsHalfMarathon2026 (11-12 Dec 2026, 5K Fri; 10K + 21K Sat, Giza Plateau)
    kind: 'race',
    title: 'Marakez Pyramids Half Marathon 2026',
    titleAr: 'نص ماراثون الأهرامات (ماراكز) ٢٠٢٦',
    description: 'Run beside the Great Pyramids of Giza: 5K on Friday Dec 11, 10K and AIMS-certified 21K on Saturday Dec 12. Organised by TriFactory.',
    descriptionAr: 'اجري جنب أهرامات الجيزة: ٥ كيلو الجمعة ١١ ديسمبر، و١٠ و٢١ كيلو (معتمد دولياً) السبت ١٢ ديسمبر. تنظيم تراي فاكتوري.',
    city: 'Giza',
    venue: 'Giza Plateau — Great Pyramids',
    venueAr: 'هضبة الأهرامات — الجيزة',
    date: '2026-12-11',
    time: '5K Fri · 10K & 21K Sat',
    url: 'https://www.thetrifactory.com/MarakezPyramidsHalfMarathon2026',
    featured: true,
  },
];

async function run() {
  let gymsAdded = 0;
  const gymsSkipped: string[] = [];
  for (const [i, g] of GYMS.entries()) {
    const exists = await prisma.partner.findFirst({ where: { name: g.name } });
    if (exists) {
      gymsSkipped.push(g.name);
      continue;
    }
    await prisma.partner.create({
      data: {
        type: 'gym',
        name: g.name,
        nameAr: g.nameAr,
        tagline: g.tagline,
        taglineAr: g.taglineAr,
        city: g.city,
        address: g.address,
        phone: g.phone,
        website: g.website,
        lat: g.lat,
        lng: g.lng,
        facilities: g.facilities.length ? J(g.facilities) : null,
        hours: g.hours ? J(g.hours) : null,
        ladiesOnly: g.ladiesOnly ?? false,
        ladiesHours: g.ladiesHours,
        country: 'EG',
        currency: 'EGP',
        active: true,
        order: i,
      },
    });
    gymsAdded++;
  }

  let eventsAdded = 0;
  const eventsSkipped: string[] = [];
  for (const e of EVENTS) {
    const exists = await prisma.fitEvent.findFirst({ where: { title: e.title } });
    if (exists) {
      // Weekly runs: keep the date rolling forward so the board never goes stale.
      if (e.title.includes('Friday Morning Run') && exists.date < e.date) {
        await prisma.fitEvent.update({ where: { id: exists.id }, data: { date: e.date } });
      }
      eventsSkipped.push(e.title);
      continue;
    }
    await prisma.fitEvent.create({
      data: {
        kind: e.kind,
        title: e.title,
        titleAr: e.titleAr,
        description: e.description,
        descriptionAr: e.descriptionAr,
        city: e.city,
        venue: e.venue,
        venueAr: e.venueAr,
        date: e.date,
        time: e.time,
        price: e.price, // null -> app shows "see the organiser"
        url: e.url,
        country: 'EG',
        currency: 'EGP',
        sponsored: false,
        featured: e.featured ?? false,
        active: true,
      },
    });
    eventsAdded++;
  }

  console.log(`Real venues: +${gymsAdded} gyms${gymsSkipped.length ? ` (${gymsSkipped.length} already present, skipped)` : ''}`);
  console.log(`Real events: +${eventsAdded} events${eventsSkipped.length ? ` (${eventsSkipped.length} already present, skipped)` : ''}`);
  const gyms = await prisma.partner.count({ where: { type: 'gym', active: true } });
  const mapped = await prisma.partner.count({ where: { type: 'gym', active: true, lat: { not: null } } });
  console.log(`Gyms now listed: ${gyms} (${mapped} with coordinates for distance sorting)`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
