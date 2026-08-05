/**
 * Curated reels — 29 YouTube videos from three vetted channels.
 *
 * WHY THESE THREE CHANNELS
 *
 * The brief was explicit: nothing adult, nothing revealing. Fitness video is full of
 * body-focused content, so the channel matters far more than the individual video.
 * These three were picked because their whole catalogue is instructional rather than
 * aspirational, and their presenters train in ordinary athletic clothing:
 *
 *   FitnessBlender    — deliberately plain, no music, no styling, technique only.
 *   Yoga With Adriene — gentle, fully clothed, the most-followed yoga channel there is.
 *   HASfit            — Coach Kozak; home workouts aimed at families, seniors, beginners.
 *
 * Promotional posts, giveaways and merch announcements were left out by hand — this
 * is not simply "the last 15 uploads".
 *
 * WHAT I CAN AND CANNOT VOUCH FOR
 *
 * Every id below was verified against YouTube's oEmbed endpoint: all 29 exist, are
 * public, are embeddable, and are not age-restricted (YouTube refuses to embed
 * age-restricted videos, so a pass is a real signal). The channel attribution is
 * YouTube's own, not a guess.
 *
 * I have not watched them. Titles and channel reputation are what these choices rest
 * on. Review them in Admin -> Reels -> Library before you tell anyone the app is
 * stocked, and remove anything you would not want on the screen.
 *
 * Idempotent. Run: npx tsx prisma/seed-reels.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

type Reel = {
  id: string;
  topic: 'workout' | 'yoga';
  title: string;
  titleAr: string;
  author: string;
  channel: string;
  /** Steers the related-reels strip on lessons, articles and recipes. */
  keyword: string;
};

const CH = {
  fb: 'https://www.youtube.com/channel/UCiP6wD_tYlYLYh3agzbByWQ',
  ywa: 'https://www.youtube.com/channel/UCFKE7WVJfvaHW5q283SxchA',
  has: 'https://www.youtube.com/channel/UCXIJ2-RSIGn53HA-x9RDevA',
};

const REELS: Reel[] = [
  /* ---------------------------- FitnessBlender ---------------------------- */
  {
    id: 'WKnwRffJ1p0', topic: 'workout', author: 'FitnessBlender', channel: CH.fb, keyword: 'core',
    title: 'Core Circuits with Push-Up Practice',
    titleAr: 'دوائر تمارين البطن مع تدريب الضغط',
  },
  {
    id: 'G6ZjB2n_p7Y', topic: 'workout', author: 'FitnessBlender', channel: CH.fb, keyword: 'legs',
    title: 'Inner Thigh Focus',
    titleAr: 'تمارين للفخذ من الداخل',
  },
  {
    id: 'sPA3OVv50EE', topic: 'workout', author: 'FitnessBlender', channel: CH.fb, keyword: 'hiit',
    title: 'Low-Impact Tabata HIIT — No Equipment',
    titleAr: 'تاباتا خفيفة على المفاصل — من غير أدوات',
  },
  {
    id: 'XMk3TtM6d2Y', topic: 'workout', author: 'FitnessBlender', channel: CH.fb, keyword: 'arms',
    title: 'Arms + Abs Strength Finisher',
    titleAr: 'ختام قوة للدراعات والبطن',
  },
  {
    id: 'NjyKDqUdBOs', topic: 'workout', author: 'FitnessBlender', channel: CH.fb, keyword: 'legs',
    title: 'Lower Body Supersets & Core',
    titleAr: 'سوبرسيت للجزء السفلي والبطن',
  },

  /* --------------------------- Yoga With Adriene --------------------------- */
  {
    id: 'q8N8jkmJP6o', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'sleep',
    title: 'Legs Up The Wall for Better Sleep',
    titleAr: 'رجلين على الحيطة لنوم أحسن',
  },
  {
    id: 'eHhPe_eiCiA', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'morning yoga',
    title: 'Start the Day Grounded — Morning Yoga',
    titleAr: 'ابدأ يومك بثبات — يوجا الصبح',
  },
  {
    id: '3OsBElyha7Y', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'sleep',
    title: 'Sleep Better Tonight — 10-Minute Flow',
    titleAr: 'نوم أهدى الليلة — ١٠ دقايق',
  },
  {
    id: 'R0__e0QTtQw', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'stress',
    title: 'Nervous System Reset — 10 Minutes',
    titleAr: 'تهدية الأعصاب — ١٠ دقايق',
  },
  {
    id: 'g6DdOHaAmSQ', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'morning yoga',
    title: 'Wake Up — Gentle 10 Minute Yoga',
    titleAr: 'صحصح — يوجا هادية ١٠ دقايق',
  },
  {
    id: 'nrqH_qyBMLk', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'hips',
    title: 'Gentle Yoga for Tight Hips',
    titleAr: 'يوجا هادية للحوض المشدود',
  },
  {
    id: 'a-sZbOfau6c', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'back',
    title: 'Yoga for People Who Sit All Day',
    titleAr: 'يوجا للي قاعد على المكتب طول اليوم',
  },
  {
    id: 'n1E8aTKJmVg', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'neck',
    title: 'Yoga for Posture and Upper Spine',
    titleAr: 'يوجا للقوام وأعلى الضهر',
  },
  {
    id: 'rPcBPTrPsgU', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'stress',
    title: 'Yoga for When You Are Overwhelmed',
    titleAr: 'يوجا لما تكون مخنوق',
  },
  {
    id: '2akHh5GgzvM', topic: 'yoga', author: 'Yoga With Adriene', channel: CH.ywa, keyword: 'stress',
    title: 'Yoga for Heavy Days',
    titleAr: 'يوجا للأيام التقيلة',
  },

  /* -------------------------------- HASfit -------------------------------- */
  {
    id: 'ZbRAk6NPfPg', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'beginner',
    title: '20 Min Full Body Beginner Workout with Dumbbells',
    titleAr: 'تمرين مبتدئين لكل الجسم ٢٠ دقيقة بالدمبل',
  },
  {
    id: 'JQ_coc-Umm8', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'full body',
    title: '20 Min Full Body Strength with Dumbbells',
    titleAr: 'قوة لكل الجسم ٢٠ دقيقة بالدمبل',
  },
  {
    id: 'PAh54rDsxvk', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'full body',
    title: '20 Min Full Body Dumbbell Workout',
    titleAr: 'تمرين دمبل لكل الجسم ٢٠ دقيقة',
  },
  {
    id: 'N6RPcb8dllU', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'full body',
    title: '30 Min Full Body Dumbbell Workout at Home',
    titleAr: 'تمرين دمبل لكل الجسم ٣٠ دقيقة في البيت',
  },
  {
    id: 'b8zs4iycw1k', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'strength',
    title: '30 Min Full Body Strength — No Repeat',
    titleAr: 'قوة لكل الجسم ٣٠ دقيقة — من غير تكرار',
  },
  {
    id: 'zrEGRZAXikQ', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'strength',
    title: '30 Min Weight Training at Home',
    titleAr: 'تمرين أوزان في البيت ٣٠ دقيقة',
  },
  {
    id: '6DFLBoh0pIY', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'full body',
    title: '40 Min Full Body Dumbbell Strength',
    titleAr: 'قوة لكل الجسم بالدمبل ٤٠ دقيقة',
  },
  {
    id: 'ZDcsWZt9OBY', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'legs',
    title: '25 Min Legs and Glutes with Dumbbells',
    titleAr: 'رجلين وجلوتس ٢٥ دقيقة بالدمبل',
  },
  {
    id: 'WAVpjTTS2S0', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'shoulders',
    title: '15 Min Dumbbell Shoulder Workout',
    titleAr: 'تمرين أكتاف بالدمبل ١٥ دقيقة',
  },
  {
    id: 'gDhF3ETkoqw', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'abs',
    title: '12 Minute Ab Workout at Home',
    titleAr: 'تمرين بطن ١٢ دقيقة في البيت',
  },
  {
    id: 'uK-O-pVIYW8', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'hiit',
    title: '25 Min Full Body Kettlebell Workout',
    titleAr: 'تمرين كيتل بيل لكل الجسم ٢٥ دقيقة',
  },
  {
    id: 'BQYDOcEhTSY', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'hiit',
    title: '30 Min Low Impact HIIT — No Jumping',
    titleAr: 'هيت خفيف على المفاصل ٣٠ دقيقة — من غير نطّ',
  },
  {
    id: 'Mw2I81ZWaOA', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'back',
    title: '18 Min Sciatica Relief Exercises',
    titleAr: 'تمارين لتخفيف عرق النسا ١٨ دقيقة',
  },
  {
    id: 'CwX8Zn3Hq0A', topic: 'workout', author: 'HASfit', channel: CH.has, keyword: 'seniors',
    title: '30 Min Seated Strength for Seniors',
    titleAr: 'تمارين قوة على الكرسي لكبار السن ٣٠ دقيقة',
  },
];

/** Confirm the video is still public and embeddable before it goes in. A reel that
 *  404s in the feed is worse than a shorter library. */
async function stillEmbeddable(id: string): Promise<boolean> {
  const url = `https://www.youtube.com/watch?v=${id}`;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return r.ok;
  } catch {
    return false;
  }
}

async function main() {
  const skipVerify = process.argv.includes('--no-verify');
  let created = 0;
  let updated = 0;
  let refused = 0;

  for (const [i, r] of REELS.entries()) {
    if (!skipVerify && !(await stillEmbeddable(r.id))) {
      console.log(`  ✗ refused ${r.id} — no longer embeddable (${r.title})`);
      refused++;
      continue;
    }

    // A creator the admin has since blocked must not be reintroduced by a re-run.
    const blocked = await prisma.blockedSource.findFirst({
      where: { provider: 'youtube', handle: { contains: r.author } },
    });
    if (blocked) {
      console.log(`  ✗ skipped ${r.id} — ${r.author} is blocked`);
      refused++;
      continue;
    }

    const data = {
      source: 'youtube',
      provider: 'youtube',
      externalId: r.id,
      sourceUrl: `https://www.youtube.com/watch?v=${r.id}`,
      authorName: r.author,
      authorUrl: r.channel,
      topic: r.topic,
      title: r.title,
      titleAr: r.titleAr,
      keyword: r.keyword,
      coverUrl: `https://img.youtube.com/vi/${r.id}/hqdefault.jpg`,
      active: true,
      order: i,
    };

    const existing = await prisma.curatedReel.findFirst({
      where: { provider: 'youtube', externalId: r.id },
    });
    if (existing) {
      await prisma.curatedReel.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.curatedReel.create({ data });
      created++;
    }
  }

  const total = await prisma.curatedReel.count({ where: { active: true } });
  const workout = await prisma.curatedReel.count({ where: { active: true, topic: 'workout' } });
  const yoga = await prisma.curatedReel.count({ where: { active: true, topic: 'yoga' } });

  console.log(`\nReels: ${created} created · ${updated} updated · ${refused} refused`);
  console.log(`Library: ${total} active (${workout} workout · ${yoga} yoga)`);
  console.log('Review them in Admin -> Reels -> Library before launch.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
