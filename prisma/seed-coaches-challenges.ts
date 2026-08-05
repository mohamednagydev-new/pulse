/** More PULSE coaches + more challenges (EN + Egyptian Arabic). Idempotent.
 *  Run: npx tsx prisma/seed-coaches-challenges.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const COACHES = [
  {
    name: 'Youssef Kamal', nameAr: 'يوسف كمال', type: 'WORKOUT',
    headline: 'Strength & muscle building', headlineAr: 'قوة وبناء عضلات',
    bio: 'Certified strength coach with 10 years in the gym. Specialises in progressive overload and getting beginners to their first real strength milestones — safely.',
    bioAr: 'مدرب قوة معتمد وخبرة ١٠ سنين في الجيم. متخصص في زيادة الأوزان التدريجية وتوصيل المبتدئين لأول إنجاز حقيقي في القوة — بأمان.',
    order: 2,
  },
  {
    name: 'Mona Adel', nameAr: 'منى عادل', type: 'WORKOUT',
    headline: 'Women\'s fitness & fat loss', headlineAr: 'لياقة السيدات وحرق الدهون',
    bio: 'Helping women build strength and confidence without spending hours in the gym. Home-friendly programs that fit around family and work.',
    bioAr: 'بساعد الستات يبنوا قوة وثقة من غير ما يقضوا ساعات في الجيم. برامج تنفع في البيت وتناسب البيت والشغل.',
    order: 3,
  },
  {
    name: 'Karim Hassan', nameAr: 'كريم حسن', type: 'WORKOUT',
    headline: 'HIIT & conditioning', headlineAr: 'هيت ولياقة',
    bio: 'Short, intense sessions for people with no time. Fifteen focused minutes beats an hour of scrolling between sets.',
    bioAr: 'حصص قصيرة وقوية للي مش فاضي. ربع ساعة تركيز أحسن من ساعة بتتفرج في الموبايل بين المجموعات.',
    order: 4,
  },
  {
    name: 'Salma Ibrahim', nameAr: 'سلمى إبراهيم', type: 'YOGA',
    headline: 'Vinyasa flow & mobility', headlineAr: 'فينياسا ومرونة',
    bio: 'Breath-led flows that undo desk posture and bring movement back to stiff bodies. Every pose has an easier option.',
    bioAr: 'تمارين متدفقة بالنفس بتصلّح آثار القعدة الطويلة وترجّع الحركة للجسم المتيبس. كل وضعية ليها بديل أسهل.',
    order: 5,
  },
  {
    name: 'Nour El Sayed', nameAr: 'نور السيد', type: 'YOGA',
    headline: 'Restorative yoga & sleep', headlineAr: 'يوجا الاسترخاء والنوم',
    bio: 'Slow, calming practice for stress and better sleep. No flexibility required — just a mat and ten quiet minutes.',
    bioAr: 'تمرين بطيء ومهدّي للتوتر ونوم أحسن. مش محتاج مرونة — بس مرتبة وعشر دقايق هدوء.',
    order: 6,
  },
  {
    name: 'Tarek Mostafa', nameAr: 'طارق مصطفى', type: 'WORKOUT',
    headline: 'Home workouts, no equipment', headlineAr: 'تمارين البيت من غير أدوات',
    bio: 'Everything you need is your own bodyweight and a bit of floor space. Perfect if the gym is not an option right now.',
    bioAr: 'كل اللي محتاجه وزن جسمك وشوية مساحة على الأرض. مثالي لو الجيم مش متاح دلوقتي.',
    order: 7,
  },
];

function dstr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const CHALLENGES = [
  { title: 'First Step: 3 Workouts', titleAr: 'أول خطوة: ٣ تمارين', description: 'Brand new? Three workouts is all it takes to start.', goalType: 'lessons', goalValue: 3, startsOn: dstr(0), endsOn: dstr(14) },
  { title: 'Morning Movers', titleAr: 'صحاب الصبح', description: 'Seven early workouts — own your mornings.', goalType: 'lessons', goalValue: 7, startsOn: dstr(0), endsOn: dstr(21) },
  { title: '50 Workouts Club', titleAr: 'نادي الـ ٥٠ تمرينة', description: 'Fifty sessions. Long game, real results.', goalType: 'lessons', goalValue: 50, startsOn: dstr(0), endsOn: dstr(90) },
  { title: 'Hydration & Nutrition 15k', titleAr: 'تغذية وترطيب ١٥ ألف', description: 'Track 15,000 kcal of mindful eating.', goalType: 'calories', goalValue: 15000, startsOn: dstr(0), endsOn: dstr(30) },
  { title: '7-Day Kickstart Streak', titleAr: 'سلسلة البداية ٧ أيام', description: 'One week, no gaps. The hardest and most important week.', goalType: 'streak', goalValue: 7, startsOn: dstr(0), endsOn: dstr(14) },
  { title: '21-Day Habit Builder', titleAr: 'باني العادة ٢١ يوم', description: 'Three weeks straight — this is where it becomes automatic.', goalType: 'streak', goalValue: 21, startsOn: dstr(0), endsOn: dstr(30) },
  { title: '60-Day Iron Will', titleAr: 'إرادة حديد ٦٠ يوم', description: 'Two full months of showing up. Legend status.', goalType: 'streak', goalValue: 60, startsOn: dstr(0), endsOn: dstr(75) },
  { title: 'Ramadan Ready', titleAr: 'جاهز لرمضان', description: 'Fifteen sessions to go in strong and stay consistent.', goalType: 'lessons', goalValue: 15, startsOn: dstr(0), endsOn: dstr(45) },
  { title: 'Weekend Double', titleAr: 'دوبل الويك إند', description: 'Two workouts every weekend for a month.', goalType: 'lessons', goalValue: 8, startsOn: dstr(0), endsOn: dstr(30) },
  { title: 'Clean Eating 30k', titleAr: 'أكل نضيف ٣٠ ألف', description: 'Thirty thousand tracked calories of eating with intention.', goalType: 'calories', goalValue: 30000, startsOn: dstr(0), endsOn: dstr(45) },
];

async function run() {
  let c = 0, ch = 0;
  for (const coach of COACHES) {
    const exists = await prisma.coach.findFirst({ where: { name: coach.name } });
    if (!exists) { await prisma.coach.create({ data: coach }); c++; }
  }
  for (const challenge of CHALLENGES) {
    const exists = await prisma.challenge.findFirst({ where: { title: challenge.title } });
    if (!exists) { await prisma.challenge.create({ data: challenge }); ch++; }
  }
  const totals = { coaches: await prisma.coach.count(), challenges: await prisma.challenge.count() };
  console.log(`+${c} coaches, +${ch} challenges → totals: ${totals.coaches} coaches, ${totals.challenges} challenges`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
