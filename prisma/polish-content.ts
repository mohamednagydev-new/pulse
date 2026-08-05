/**
 * Content polish pass — the audited launch fixes, in one idempotent script.
 *
 *  1. FeaturedItem: Egyptian-Arabic titles + working tap targets (url) for the
 *     12 seeded Home cards. Rows an admin already gave a titleAr keep it.
 *  2. Challenge overload: keep PULSE14 + the current month's season challenges +
 *     the 7 most distinct global challenges live; every other live global
 *     challenge is staged into future 2-week waves (duration preserved, nothing
 *     deleted, personal/group untouched). "Ramadan Ready" parks at Ramadan 2027.
 *  3. Recipe Arabic text: strip ounces/Fahrenheit from ingredientsAr/stepsAr/
 *     aboutAr (the جم and مئوية halves stay; lone Fahrenheit converts to Celsius).
 *  4. Arabic-Indic digits → Western digits in Challenge/Lesson titles+descriptions
 *     and Article.bodyAr, for one consistent numeral style.
 *  5. Food.aliases: Franco-Arabic/English search aliases for the recognizable
 *     foods that had none. Rows with aliases keep them.
 *  6. MembershipPlan: deactivate the USD-priced plans that contradict the free
 *     positioning.
 *
 * Idempotent and prod-safe: only fills what is empty, only stages what is live,
 * never deletes, never overwrites admin edits.
 * Run: node node_modules/tsx/dist/cli.mjs prisma/polish-content.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ------------------------------ date helpers ------------------------------
function todayYMD(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

// --------------------------- FIX 1: FeaturedItem ---------------------------
const SECTION_URL: Record<string, string> = {
  fit_for_life: '/workout',
  meal_prep: '/wellness/kitchen',
  challenge: '/achievements',
};

/** Hand-written Egyptian عامية titles, keyed by the English title. */
const FEATURED_AR: Record<string, string> = {
  '14-Day Kickstart Challenge': 'تحدي الانطلاقة في 14 يوم',
  '30-Day Strength Challenge': 'تحدي القوة في 30 يوم',
  'Full Body Home Workout': 'تمرين لكل الجسم من البيت',
  '15-Minute Morning Energizer': 'شحنة نشاط الصبح في 15 دقيقة',
  'Low-Impact Cardio Burn': 'كارديو خفيف على المفاصل وحرق جامد',
  'Desk Break Stretch Routine': 'تمارين فك العضلات في بريك الشغل',
  'Bedtime Wind-Down Mobility': 'تمارين تهدئة واسترخاء قبل النوم',
  'Flavourmag: The Benefits of Meal Prep': 'فوايد تجهيز الأكل من بدري',
  'High-Protein Meal Prep for the Week': 'تجهيز أكل الأسبوع عالي البروتين',
  'Budget-Friendly Healthy Eating': 'أكل صحي على قد الإيد',
  'Quick Overnight Oats Three Ways': 'شوفان بايت في التلاجة بـ3 طرق',
  'Balanced Lunch Bowls Made Easy': 'أطباق غدا متوازنة من غير تعب',
};

async function fixFeaturedItems() {
  const rows = await prisma.featuredItem.findMany();
  let titles = 0;
  let urls = 0;
  for (const r of rows) {
    const data: { titleAr?: string; url?: string } = {};
    // Respect admin edits: only fill empty fields.
    if ((!r.titleAr || !r.titleAr.trim()) && FEATURED_AR[r.title]) {
      data.titleAr = FEATURED_AR[r.title];
      titles++;
    }
    if ((!r.url || !r.url.trim()) && SECTION_URL[r.section]) {
      data.url = SECTION_URL[r.section];
      urls++;
    }
    if (Object.keys(data).length) await prisma.featuredItem.update({ where: { id: r.id }, data });
  }
  console.log(`FIX 1 FeaturedItem: ${titles} titleAr filled, ${urls} url filled (${rows.length} rows)`);
}

// ------------------------ FIX 2: Challenge staging -------------------------
/** One live challenge per goal type — the launch shelf. Preferred by title
 *  (the audited picks); if a title is missing (prod drift) fall back to the
 *  shortest-duration live global challenge of that goal type. */
const KEEP_PREFERRED: { goalType: string; title: string }[] = [
  { goalType: 'streak', title: '7-Day Streak Sprint' },
  { goalType: 'water', title: 'Hydration Week' },
  { goalType: 'lessons', title: 'First Step: 3 Workouts' }, // the beginner on-ramp
  { goalType: 'lifts', title: '40 Sets in 14 Days' },
  { goalType: 'reels', title: 'Learn From Reels' },
  { goalType: 'xp', title: '500 XP Week' },
  { goalType: 'calories', title: 'Clean Fuel Week' },
];
const WAVE_SIZE = 4; // challenges opening together per future 2-week wave

async function fixChallenges() {
  const today = todayYMD();
  const monthKey = today.slice(0, 7); // e.g. "2026-08"

  // Ramadan Ready → park at Ramadan 2027 (whatever its current dates).
  const ramadan = await prisma.challenge.findMany({
    where: { kind: 'global', OR: [{ title: { contains: 'Ramadan' } }, { titleAr: { contains: 'رمضان' } }] },
  });
  let ramadanMoved = 0;
  for (const c of ramadan) {
    if (c.startsOn !== '2027-02-01' || c.endsOn !== '2027-03-20') {
      await prisma.challenge.update({ where: { id: c.id }, data: { startsOn: '2027-02-01', endsOn: '2027-03-20' } });
      ramadanMoved++;
    }
  }
  const ramadanIds = new Set(ramadan.map((c) => c.id));

  const globals = await prisma.challenge.findMany({ where: { kind: 'global' } });
  // Never staged: PULSE14, the current month's season challenges, Ramadan (handled).
  const exempt = (c: (typeof globals)[number]) =>
    c.inviteCode === 'PULSE14' || c.seasonKey === monthKey || ramadanIds.has(c.id);
  // Only challenges that are currently open for staging decisions (idempotency:
  // anything already pushed to the future is left exactly where it is).
  const live = globals.filter((c) => !exempt(c) && c.startsOn <= today);

  // Pick the keep set: one per goal type, preferred title first, else shortest.
  const keepIds = new Set<string>();
  for (const pick of KEEP_PREFERRED) {
    const byTitle = live.find((c) => c.title === pick.title);
    if (byTitle) {
      keepIds.add(byTitle.id);
      continue;
    }
    const candidates = live
      .filter((c) => c.goalType === pick.goalType && !keepIds.has(c.id))
      .sort((a, b) => daysBetween(a.startsOn, a.endsOn) - daysBetween(b.startsOn, b.endsOn) || a.id.localeCompare(b.id));
    if (candidates[0]) keepIds.add(candidates[0].id);
  }

  // Everything else live gets staged into consecutive future 2-week waves.
  const toStage = live
    .filter((c) => !keepIds.has(c.id))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.title.localeCompare(b.title));
  let staged = 0;
  for (const [i, c] of toStage.entries()) {
    const wave = Math.floor(i / WAVE_SIZE) + 1; // wave1 opens today+14d, wave2 +28d, ...
    const duration = Math.max(1, daysBetween(c.startsOn, c.endsOn));
    const startsOn = addDays(today, wave * 14);
    const endsOn = addDays(startsOn, duration);
    await prisma.challenge.update({ where: { id: c.id }, data: { startsOn, endsOn } });
    staged++;
  }

  const nowLive = await prisma.challenge.count({
    where: { kind: 'global', startsOn: { lte: today }, endsOn: { gte: today } },
  });
  console.log(
    `FIX 2 Challenges: kept ${keepIds.size} + PULSE14 + season(${monthKey}), staged ${staged} into ${Math.ceil(
      toStage.length / WAVE_SIZE,
    )} future waves, Ramadan moved: ${ramadanMoved}. Live global challenges now: ${nowLive}`,
  );
}

// --------------------- FIX 3: Recipe Arabic unit cleanup --------------------
const D = '[0-9٠-٩][0-9٠-٩.,]*'; // a number, Western or Arabic-Indic digits
const RE_OZ_AFTER_SLASH = new RegExp(`\\s*\\/\\s*${D}\\s*أونصة`, 'g'); // "(400 جم / 14 أونصة)" → "(400 جم)"
const RE_OZ_BEFORE_SLASH = new RegExp(`${D}\\s*أونصة\\s*\\/\\s*`, 'g'); // "14 أونصة / 400 جم" → "400 جم"
const RE_F_AFTER_SLASH = new RegExp(`\\s*\\/\\s*${D}\\s*(?:درجة\\s*)?فهرنهايت`, 'g'); // "220 مئوية / 425 فهرنهايت" → "220 مئوية"
const RE_F_BEFORE_SLASH = new RegExp(`${D}\\s*(?:درجة\\s*)?فهرنهايت\\s*\\/\\s*`, 'g'); // "425 فهرنهايت / 220 مئوية" → "220 مئوية"
const RE_F_STANDALONE = new RegExp(`(${D})\\s*(?:درجة\\s*)?فهرنهايت`, 'g'); // lone "425 فهرنهايت" → converted

const INDIC = '٠١٢٣٤٥٦٧٨٩';
function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (ch) => String(INDIC.indexOf(ch)));
}

function cleanArUnits(text: string): string {
  let t = text;
  t = t.replace(RE_OZ_AFTER_SLASH, '');
  t = t.replace(RE_OZ_BEFORE_SLASH, '');
  t = t.replace(RE_F_AFTER_SLASH, '');
  t = t.replace(RE_F_BEFORE_SLASH, '');
  t = t.replace(RE_F_STANDALONE, (_m, num: string) => {
    const f = parseFloat(toWesternDigits(num).replace(/,/g, ''));
    if (!isFinite(f)) return _m;
    const c = Math.round(((f - 32) * 5) / 9 / 5) * 5; // Celsius, nearest 5
    return `${c} مئوية`;
  });
  return t;
}

function cleanJsonArray(raw: string | null): { changed: boolean; value: string | null } {
  if (!raw) return { changed: false, value: raw };
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return { changed: false, value: raw };
    let changed = false;
    const out = arr.map((item) => {
      if (typeof item !== 'string') return item;
      const cleaned = cleanArUnits(item);
      if (cleaned !== item) changed = true;
      return cleaned;
    });
    return { changed, value: changed ? JSON.stringify(out) : raw };
  } catch {
    return { changed: false, value: raw }; // unparseable — leave alone
  }
}

async function fixRecipeUnits() {
  const recipes = await prisma.recipe.findMany();
  let changed = 0;
  for (const r of recipes) {
    const ing = cleanJsonArray(r.ingredientsAr);
    const steps = cleanJsonArray(r.stepsAr);
    const about = r.aboutAr ? cleanArUnits(r.aboutAr) : r.aboutAr;
    const aboutChanged = about !== r.aboutAr;
    if (ing.changed || steps.changed || aboutChanged) {
      await prisma.recipe.update({
        where: { id: r.id },
        data: {
          ...(ing.changed ? { ingredientsAr: ing.value } : {}),
          ...(steps.changed ? { stepsAr: steps.value } : {}),
          ...(aboutChanged ? { aboutAr: about } : {}),
        },
      });
      changed++;
    }
  }
  console.log(`FIX 3 Recipe Arabic units: ${changed} of ${recipes.length} recipes cleaned`);
}

// ---------------------- FIX 4: numeral consistency -------------------------
async function fixNumerals() {
  let challenges = 0;
  for (const c of await prisma.challenge.findMany()) {
    const data: Record<string, string> = {};
    for (const f of ['title', 'titleAr', 'description', 'descriptionAr'] as const) {
      const v = c[f];
      if (v && /[٠-٩]/.test(v)) data[f] = toWesternDigits(v);
    }
    if (Object.keys(data).length) {
      await prisma.challenge.update({ where: { id: c.id }, data });
      challenges++;
    }
  }
  let lessons = 0;
  for (const l of await prisma.lesson.findMany()) {
    const data: Record<string, string> = {};
    for (const f of ['title', 'titleAr'] as const) {
      const v = l[f];
      if (v && /[٠-٩]/.test(v)) data[f] = toWesternDigits(v);
    }
    if (Object.keys(data).length) {
      await prisma.lesson.update({ where: { id: l.id }, data });
      lessons++;
    }
  }
  let articles = 0;
  for (const a of await prisma.article.findMany()) {
    if (a.bodyAr && /[٠-٩]/.test(a.bodyAr)) {
      await prisma.article.update({ where: { id: a.id }, data: { bodyAr: toWesternDigits(a.bodyAr) } });
      articles++;
    }
  }
  console.log(`FIX 4 Numerals → Western: ${challenges} challenges, ${lessons} lessons, ${articles} article bodies`);
}

// ---------------------- FIX 5: Franco-Arabic aliases -----------------------
/** nameAr → aliases (JSON-array format, same as seed-foods.ts). Only applied to
 *  rows whose aliases are still null/empty. */
const FOOD_ALIASES: Record<string, string[]> = {
  'عيش بلدي سن': ['aish sen', 'brown baladi bread'],
  'عيش شامي': ['aish shami', 'shami'],
  'رز بالشعرية': ['roz bel sheareya', 'rice with vermicelli'],
  'رز بني': ['roz bonni', 'brown rice'],
  'مكرونة مسلوقة': ['makarona', 'pasta'],
  'فريك مطبوخ': ['freek', 'freekeh'],
  'برغل مطبوخ': ['borghol', 'bulgur'],
  'توست أبيض': ['toast', 'white toast'],
  'توست سن': ['toast sen', 'brown toast'],
  'فول بالزيت': ['ful bel zeit', 'foul'],
  'قرص طعمية مخبوز': ['tameya', 'baked falafel'],
  'طبق كشري صغير': ['koshary', 'kushari small'],
  'حمص مسلوق': ['homos', 'hummus'],
  'فاصوليا بيضا باللحمة': ['fasolia', 'white beans'],
  'لوبيا': ['lobia', 'black eyed peas'],
  'عدس أصفر مطبوخ': ['ads', 'lentils'],
  'صدور فراخ مشوية': ['ferakh', 'chicken breast', 'sodoor'],
  'ورك فراخ مشوي': ['werk ferakh', 'chicken thigh'],
  'قطعة فراخ مقلية': ['ferakh ma2leya', 'fried chicken'],
  'بلطي مقلي': ['bolti ma2li', 'fried tilapia', 'samak'],
  'دنيس مشوي': ['denis', 'sea bream', 'samak'],
  'جمبري مشوي': ['gambari', 'shrimp'],
  'كفتة مشوية': ['kofta', 'kofta meshweya'],
  'شيش كباب لحمة': ['kebab', 'shish kebab', 'lahma'],
  'لحمة بتلو مطبوخة': ['lahma', 'beef', 'betello'],
  'بيضة مقلية': ['beid', 'fried egg'],
  'أومليت بيضتين': ['beid', 'omelette'],
  'تونة بالزيت مصفاة': ['toona', 'tuna'],
  'تونة بالمياه': ['toona', 'tuna in water'],
  'سمان مشوي': ['seman', 'quail'],
  'حمام محشي': ['hamam', 'stuffed pigeon'],
  'ملوخية بالفراخ': ['molokhia', 'mulukhiyah', 'ferakh'],
  'ملوخية سادة': ['molokhia', 'mulukhiyah'],
  'محشي ورق عنب': ['mahshi', 'wara2 enab', 'vine leaves'],
  'بامية باللحمة': ['bamia', 'okra with beef'],
  'بامية بالصلصة': ['bamia', 'okra'],
  'طورلي خضار': ['torly', 'vegetable casserole'],
  'سبانخ مطبوخة': ['sabanekh', 'spinach'],
  'فتة باللحمة': ['fattah', 'fatta'],
  'لبن كامل الدسم': ['laban', 'milk'],
  'لبن خالي الدسم': ['laban khali', 'skimmed milk'],
  'زبادي يوناني': ['zabadi', 'greek yogurt'],
  'لبنة': ['labneh', 'labna'],
  'جبنة رومي': ['gebna roumi', 'roumy cheese'],
  'جبنة مثلثات': ['gebna', 'cheese triangles'],
  'مش': ['mesh', 'mish'],
  'لبن رايب': ['laban rayeb', 'rayeb'],
  'سلطة خضرا': ['salata', 'green salad'],
  'سلطة طحينة': ['tahina', 'salatet tahina'],
  'بابا غنوج': ['baba ghanoug', 'baba ghanoush'],
  'طماطم': ['tamatem', 'tomato'],
  'خيار': ['khiyar', 'cucumber'],
  'بطاطس محمرة': ['batates', 'fries'],
  'بطاطس مسلوقة': ['batates masloo2a', 'boiled potato'],
  'بطاطا مشوية': ['batata', 'sweet potato'],
  'تفاحة': ['tofaha', 'apple'],
  'برتقالة': ['borto2ana', 'orange'],
  'مانجة': ['manga', 'mango'],
  'عنب': ['enab', 'grapes'],
  'بطيخ': ['bateekh', 'watermelon'],
  'جوافة': ['gawafa', 'guava'],
  'تين': ['teen', 'figs'],
  'فراولة': ['farawla', 'strawberry'],
  'رمان': ['roman', 'pomegranate'],
  'سندوتش شاورما فراخ': ['shawarma', 'shawerma ferakh'],
  'سندوتش شاورما لحمة': ['shawarma', 'shawerma lahma'],
  'سندوتش طعمية': ['tameya', 'falafel sandwich'],
  'سندوتش فول': ['ful', 'foul sandwich'],
  'حواوشي': ['hawawshi', 'hawawshy'],
  'فطير مشلتت سادة': ['feteer', 'fiteer', 'feteer meshaltet'],
  'سندوتش شيش طاووق': ['shish tawook', 'tawoo2'],
  'سندوتش كبدة': ['kebda', 'liver sandwich'],
  'سندوتش سجق': ['sogo2', 'sausage sandwich'],
  'درة مشوية': ['dora', 'grilled corn'],
  'شاي بسكرتين': ['shai', 'tea'],
  'قهوة تركي بسكر': ['ahwa', 'turkish coffee'],
  'نسكافيه بلبن وسكر': ['nescafe'],
  'سوبيا': ['sobia', 'sobya'],
  'كركديه بسكر': ['karkade', 'hibiscus'],
  'سحلب': ['sahlab', 'salep'],
  'ينسون سادة': ['yansoon', 'anise'],
  'بسبوسة': ['basbousa', 'basbosa'],
  'كنافة': ['konafa', 'kunafa'],
  'أم علي': ['om ali', 'umm ali'],
  'رز بلبن': ['roz bel laban', 'rice pudding'],
  'مهلبية': ['mahalabeya', 'mehalabeya'],
  'بقلاوة': ['baklava', 'ba2lawa'],
  'زلابية': ['zalabya', 'lo2met el adi'],
  'قطايف': ['atayef', 'qatayef'],
  'غريبة': ['ghorayeba', 'ghoreyba'],
  'كحك': ['kahk', 'kahk el eid'],
  'حلاوة طحينية': ['halawa', 'halva'],
  'طحينة': ['tahina', 'tahini'],
  'عسل أسود بالطحينة': ['asal eswed', 'molasses with tahini'],
  'عسل نحل': ['asal', 'honey'],
  'زبدة فول سوداني': ['peanut butter', 'zebdet fool'],
  'سمنة': ['samna', 'ghee'],
  'زبدة': ['zebda', 'butter'],
  'زيت زيتون': ['zeit zatoon', 'olive oil'],
  'سوداني محمص': ['soodani', 'peanuts'],
  'بروتين واي': ['whey', 'protein powder'],
  'شيبسي كيس صغير': ['chipsy', 'chips'],
};

async function fixFoodAliases() {
  const foods = await prisma.food.findMany();
  let filled = 0;
  for (const f of foods) {
    if (f.aliases && f.aliases !== '[]' && f.aliases.trim()) continue; // keep existing
    const aliases = FOOD_ALIASES[f.nameAr.trim()];
    if (!aliases) continue;
    await prisma.food.update({ where: { id: f.id }, data: { aliases: JSON.stringify(aliases) } });
    filled++;
  }
  const withAliases = await prisma.food.count({ where: { NOT: { aliases: null } } });
  console.log(`FIX 5 Food aliases: ${filled} filled — ${withAliases}/${foods.length} foods now searchable in Franco`);
}

// ------------------------- FIX 6: MembershipPlan ---------------------------
async function fixMembershipPlans() {
  const res = await prisma.membershipPlan.updateMany({ where: { active: true }, data: { active: false } });
  console.log(`FIX 6 MembershipPlan: ${res.count} plans deactivated (app is free)`);
}

// --------------------------------- main ------------------------------------
async function main() {
  console.log('Content polish pass —', todayYMD());
  await fixFeaturedItems();
  await fixChallenges();
  await fixRecipeUnits();
  await fixNumerals();
  await fixFoodAliases();
  await fixMembershipPlans();
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
