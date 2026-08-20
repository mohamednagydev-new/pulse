import { prisma } from './prisma';
import { createFeedPost } from './social';

/**
 * Community pulse: scheduled official posts so the feed never reads as
 * "only auto-nudges". Rotates through a mixed pool — training facts, nutrition
 * tips, how-to-use guides, motivation, and questions that invite replies.
 *
 * Cadence: every AUTO_POST_HOURS (default 2) between 09:00–23:00 local, driven
 * by the reminder scheduler. Posts go out as the first ADMIN account (admin
 * posts already reach every feed without a follow). Rotation index persists as
 * the count of previous auto-posts, so restarts never repeat or skip.
 */

type Pulse = { en: string; ar: string };

const POOL: Pulse[] = [
  // ---- How to use the app (each teaches ONE real feature) ----
  { en: '💡 Did you know? Snap a photo of your meal in Food → the AI counts the calories for you. Try it with your next plate!', ar: '💡 عارف إنك تقدر تصوّر أكلك من قسم الأكل والذكاء الاصطناعي يحسبلك السعرات؟ جرّبها في وجبتك الجاية!' },
  { en: '💡 Long day? Open Train and log sets one by one — the rest timer counts your break automatically.', ar: '💡 جوه أي تمرينة: سجّل مجموعاتك واحدة واحدة وتايمر الراحة هيعد لك أوتوماتيك بين كل مجموعة.' },
  { en: '💡 Add a workout buddy from Community → People. People who train with a friend stick to it 3× longer.', ar: '💡 ضيف زميل تمرين من المجتمع → الناس. اللي بيتمرنوا مع صاحب بيكملوا ٣ أضعاف أكتر.' },
  { en: '💡 Your weekly schedule is editable — Me → Schedule. Make the plan fit your life, not the other way around.', ar: '💡 جدولك الأسبوعي بتتحكم فيه — من حسابي → الجدول. خلّي الخطة على مقاس يومك، مش العكس.' },
  { en: '💡 Live group sessions run every week — shared timer, one coach, everyone together. Check the Group Live button above!', ar: '💡 في جلسات تمرين جماعية لايف كل أسبوع — تايمر مشترك وكوتش والكل مع بعض. دوس زرار «لايف جماعي» فوق!' },
  { en: '💡 Feeling advanced? Three new pro programs just landed: Powerlifting Peaking, Hypertrophy Block, and Engine Builder.', ar: '💡 لو وصلت لمستوى متقدم: ٣ برامج احترافية جديدة نزلوا — Powerlifting Peaking و Hypertrophy Block و Engine Builder.' },
  { en: '💡 Weigh in every Friday — the progress chart only moves when you feed it. Me → Progress.', ar: '💡 اوزن نفسك كل جمعة — منحنى التقدم مش هيتحرك غير لما تسجّل. من حسابي → التقدم.' },
  { en: '💡 Duel a friend! Challenge them to a week of workouts head-to-head from their profile.', ar: '💡 اعمل «دويل» مع صاحبك — تحدي أسبوع تمرين واحد لواحد من صفحته. مين فيكم هيكسب؟' },
  // ---- Training facts ----
  { en: '🧠 Fact: muscle grows during rest, not during the workout. Sleep is a training day.', ar: '🧠 معلومة: العضلات بتكبر وقت الراحة مش وقت التمرين. النوم يوم تمرين بمعنى الكلمة.' },
  { en: '🧠 Fact: form beats weight. A clean set at 60% builds more than a sloppy set at 90%.', ar: '🧠 معلومة: الأداء الصح أهم من الوزن التقيل. مجموعة نضيفة بـ٦٠٪ أحسن من مجموعة مكسّرة بـ٩٠٪.' },
  { en: '🧠 Fact: you can’t out-train a bad diet — but you CAN out-eat any workout. Calories decide the scale.', ar: '🧠 معلومة: مفيش تمرين يغلب أكل غلط — السعرات هي اللي بتحرك الميزان في الآخر.' },
  { en: '🧠 Fact: soreness is not the goal. Progress is measured in reps and weight, not in pain.', ar: '🧠 معلومة: التقل مش هو الهدف. التقدم بيتقاس بالعدات والأوزان مش بالوجع.' },
  { en: '🧠 Fact: walking 8,000 steps burns roughly an extra meal per day. The invisible cardio.', ar: '🧠 معلومة: ٨٠٠٠ خطوة في اليوم بتحرق تقريباً وجبة كاملة زيادة. الكارديو الخفي.' },
  { en: '🧠 Fact: strength training raises your resting burn — muscle spends calories even on the couch.', ar: '🧠 معلومة: تمرين الحديد بيرفع حرقك وانت مرتاح — العضلات بتصرف سعرات حتى وانت قاعد.' },
  // ---- Nutrition ----
  { en: '🥗 Protein rule of thumb: your weight in kg × 1.6g daily. 70kg → ~112g. Track one day and see where you stand.', ar: '🥗 قاعدة البروتين: وزنك بالكيلو × ١.٦ جرام يومياً. يعني ٧٠ كيلو → حوالي ١١٢ جرام. سجّل يوم واحد وشوف انت فين.' },
  { en: '🥗 Drink a glass of water before every meal — the cheapest appetite control there is.', ar: '🥗 كوباية مية قبل كل وجبة — أرخص وأسهل تحكم في الشهية موجود.' },
  { en: '🥗 Foul + eggs = a complete Egyptian breakfast: protein, fiber, and it keeps you full till lunch.', ar: '🥗 فول + بيض = فطار مصري متكامل: بروتين وألياف وشبع حقيقي لحد الغدا.' },
  { en: '🥗 The 80/20 rule: eat well 80% of the time and nothing is forbidden the other 20%. Consistency beats perfection.', ar: '🥗 قاعدة ٨٠/٢٠: كل صح ٨٠٪ من الوقت ومفيش حاجة ممنوعة في الـ٢٠٪ الباقيين. الاستمرارية تغلب المثالية.' },
  // ---- Motivation ----
  { en: '🔥 The workout you skip never gets easier. The one you do makes the next one lighter.', ar: '🔥 التمرينة اللي بتفوتها عمرها ما بتبقى أسهل. اللي بتعملها هي اللي بتخفف اللي بعدها.' },
  { en: '🔥 Nobody regrets a finished workout. Start with 10 minutes — the rest follows.', ar: '🔥 محدش ندم على تمرينة خلصها. ابدأ بـ١٠ دقايق بس — الباقي بييجي لوحده.' },
  { en: '🔥 Your streak doesn’t care about motivation. It cares about showing up. One day at a time.', ar: '🔥 السلسلة بتاعتك مش عايزة حماس — عايزة حضور. يوم ورا يوم وبس.' },
  { en: '🔥 Six months from now you’ll wish you started today. So start today.', ar: '🔥 بعد ٦ شهور هتتمنى لو كنت بدأت النهارده. يبقى ابدأ النهارده.' },
  // ---- Questions (invite replies) ----
  { en: '💬 Question of the day: what time do you actually train — morning, after work, or late night?', ar: '💬 سؤال اليوم: بتتمرن امتى بجد — الصبح، بعد الشغل، ولا بليل متأخر؟' },
  { en: '💬 What’s the one exercise you secretly hate but do anyway? (Burpees, we see you.)', ar: '💬 إيه التمرين اللي بتكرهه بس بتعمله برضه؟ (البيربي احنا شايفينك.)' },
  { en: '💬 Your best post-workout meal? Drop it below — someone here needs the idea.', ar: '💬 أحلى وجبة بعد التمرين عندك إيه؟ اكتبها تحت — حد هنا محتاج الفكرة.' },
  { en: '💬 Team home workouts or team gym? Defend your side 👇', ar: '💬 فريق تمرين البيت ولا فريق الجيم؟ دافع عن فريقك 👇' },
];

export async function postCommunityPulse(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!admin) return 'skipped — no admin account';
  // Rotation index survives restarts: it is simply how many we've posted before.
  const posted = await prisma.feedPost.count({ where: { refType: 'autopost' } });
  const item = POOL[posted % POOL.length];
  await createFeedPost(admin.id, 'post', item.en, 'autopost', String(posted % POOL.length), { textAr: item.ar });
  return `posted #${posted % POOL.length} (${posted + 1} total)`;
}
