import { PrismaClient } from '@prisma/client';

/**
 * Ramadan fitness guide pack — a wellness "initiative" category with five
 * bilingual articles covering training and eating through the fasting month.
 * Conservative, mainstream guidance only (timing, hydration, recovery) — no
 * medical claims. Idempotent: upserts by title inside the category.
 */

const prisma = new PrismaClient();

const CATEGORY = {
  kind: 'initiative',
  title: 'Ramadan Fitness',
  titleAr: 'لياقتك في رمضان',
  icon: '🌙',
};

type Guide = {
  title: string;
  titleAr: string;
  excerpt: string;
  excerptAr: string;
  readTimeMin: number;
  body: string;
  bodyAr: string;
};

const GUIDES: Guide[] = [
  {
    title: 'When to train in Ramadan (and when not to)',
    titleAr: 'تتمرن إمتى في رمضان (وإمتى لأ)',
    excerpt: 'The best training windows around iftar and suhoor — and the one time of day to avoid.',
    excerptAr: 'أحسن أوقات التمرين حوالين الفطار والسحور — والوقت الوحيد اللي تتجنبه.',
    readTimeMin: 4,
    body: `The question every lifter asks in Ramadan is the same: when? The honest answer is that the best time is the one you can repeat for thirty days — but some windows are clearly better than others.

The strongest window is 1.5 to 2 hours AFTER iftar. You have eaten, you have rehydrated, and your energy is back. This is the time for your normal sessions: strength work, progressive overload, anything intense. If your program has heavy days, put them here.

The second window is 30 to 60 minutes BEFORE iftar. Training fasted at low-to-moderate intensity is fine for most healthy people, and you break your fast right after — perfect timing for recovery. Keep it short (30–40 minutes), keep the weights moderate, and stop a set early rather than grinding. This window suits lighter days: technique work, machines, moderate cardio.

After suhoor works for some people: you are fed and hydrated, but you will not eat again all day, so keep it easy — mobility, a walk, light cardio. Nothing that leaves you sore and drained by 3pm.

The window to avoid is midday to late afternoon. You are hours from your last meal and hours from your next one, usually in the heat. Hard training here means poor performance now and a miserable afternoon after. If your schedule forces it, drop the intensity hard and treat it as movement, not training.

One more honest rule: expect to hold, not to peak. Ramadan is a month for maintaining strength and habit, not for personal records. If you keep your sessions and your protein, you will come out the other side having lost nothing — and that is the win.`,
    bodyAr: `السؤال اللي كل متمرن بيسأله في رمضان واحد: أتمرن إمتى؟ الإجابة الصريحة إن أحسن وقت هو اللي تقدر تكرره ٣٠ يوم — بس في أوقات أحسن من غيرها بوضوح.

أقوى وقت هو بعد الفطار بساعة ونص لساعتين. انت أكلت، وشربت مية، وطاقتك رجعت. ده وقت تمرينك العادي: حديد، أوزان تقيلة، أي حاجة شديدة. لو برنامجك فيه أيام تقيلة، حطها هنا.

تاني أحسن وقت هو قبل الفطار بنص ساعة لساعة. التمرين صايم بشدة خفيفة لمتوسطة عادي لمعظم الناس الأصحاء، وانت بتفطر على طول بعده — توقيت مثالي للاستشفاء. خليه قصير (٣٠–٤٠ دقيقة)، والأوزان متوسطة، ولو حسيت بإرهاق وقّف المجموعة بدري.

بعد السحور بينفع مع ناس: انت واكل وشارب، بس مش هتاكل تاني طول اليوم، فخليه خفيف — إطالات، مشي، كارديو هادي. مفيش حاجة تسيبك مكسّر الساعة ٣ العصر.

الوقت اللي تتجنبه: من الضهر للعصر. انت بعيد ساعات عن آخر وجبة وساعات عن الجاية، وغالباً في الحر. تمرين شديد هنا معناه أداء ضعيف دلوقتي وبقية يوم تعبان.

وقاعدة أخيرة بصراحة: رمضان شهر تحافظ فيه، مش تكسر أرقام. لو حافظت على حصصك وبروتينك، هتخرج من الشهر من غير ما تخسر حاجة — وده المكسب الحقيقي.`,
  },
  {
    title: 'Hydration: winning the iftar-to-suhoor window',
    titleAr: 'المية: اكسب الوقت من الفطار للسحور',
    excerpt: 'You have a few hours to drink a whole day of water. Here is how to actually do it.',
    excerptAr: 'قدامك كام ساعة تشرب فيها مية يوم كامل. كده تعملها صح.',
    readTimeMin: 3,
    body: `In Ramadan you compress a full day of drinking into the hours between iftar and suhoor. Most people drink a lot at iftar, forget until suhoor, and spend the next day dehydrated. The fix is spacing, not volume.

A simple pattern that works: two glasses at iftar, then one glass every 45–60 minutes through the evening, then two glasses at suhoor. That lands around 8–10 glasses without ever feeling forced. Set the water tracker in PULSE and let it count — that is exactly what it is for.

Go easy on the things that pull water out of you: very salty food at suhoor makes the next day harder, and heavy caffeine late at night costs you both water and sleep. One coffee or tea after iftar is fine; a fourth glass of strong tea at 2am is not helping.

Watery food counts too. Soup at iftar, watermelon, cucumber, yogurt at suhoor — they all add up quietly.

The test is simple: if your afternoon headache disappears, your evening spacing is working. If you are still dizzy by asr, drink earlier in the night, not more at once.`,
    bodyAr: `في رمضان بتضغط مية يوم كامل في الساعات اللي بين الفطار والسحور. معظم الناس بيشربوا كتير على الفطار، ينسوا لحد السحور، ويقضوا اليوم اللي بعده ناشفين. الحل في التوزيع مش في الكمية.

نظام بسيط بيشتغل: كوبايتين على الفطار، وبعدين كوباية كل ٤٥–٦٠ دقيقة طول السهرة، وكوبايتين على السحور. كده توصل ٨–١٠ كوبايات من غير ما تحس إنك بتجبر نفسك. ظبّط عداد المية في PULSE وسيبه يحسب — ده هو شغله أصلاً.

خفف الحاجات اللي بتسحب المية منك: الأكل المملّح أوي على السحور بيصعّب اليوم اللي بعده، والكافيين الكتير آخر الليل بياخد منك مية ونوم. قهوة أو شاي بعد الفطار عادي؛ كوباية شاي تقيلة رابعة الساعة ٢ الصبح مش بتساعدك.

الأكل اللي فيه مية بيتحسب برضه: شوربة على الفطار، بطيخ، خيار، زبادي على السحور — كلها بتتجمع في صمت.

والاختبار بسيط: لو صداع العصر اختفى، يبقى توزيعك مظبوط. لو لسه بتدوخ قبل العصر، اشرب بدري في الليل — مش أكتر في مرة واحدة.`,
  },
  {
    title: 'Suhoor that carries you: protein and slow fuel',
    titleAr: 'سحور يسندك: بروتين ووقود بطيء',
    excerpt: 'The last meal before a long fast decides your whole day. Build it right.',
    excerptAr: 'آخر وجبة قبل صيام طويل بتحدد شكل يومك كله. اعملها صح.',
    readTimeMin: 4,
    body: `Suhoor is the most important meal of your training month. It is the last protein your muscles see for 14+ hours and the fuel your morning runs on. Two rules build a good one: slow carbs, real protein.

Protein first. Eggs, foul (fava beans), yogurt, cheese, or a scoop of whey in milk — aim for 25–40g at suhoor. Foul is genuinely excellent here: slow to digest, high in protein and fiber, and it keeps you full for hours. Your grandmother was right.

Slow carbs second. Oats, whole-grain bread, foul again — things that release energy over hours. Skip the white-bread-and-jam suhoor: it spikes, crashes, and leaves you hungry by 10am.

Add water-rich and filling extras: yogurt, a banana, cucumber, a spoon of tahini for healthy fat. Fat slows digestion — in suhoor that is a feature, not a bug.

What to avoid: very salty food (thirst all day), sugary pastries (hunger by mid-morning), and skipping suhoor entirely. Training in the evening on a skipped suhoor is running on fumes.

A solid template: foul with tahini and a boiled egg, one piece of whole-grain bread, a bowl of yogurt, a banana, two glasses of water. Log it in the tracker so your protein target keeps getting hit even in Ramadan.`,
    bodyAr: `السحور هو أهم وجبة في شهر تمرينك. ده آخر بروتين عضلاتك هتشوفه لأكتر من ١٤ ساعة، والوقود اللي صبحك كله ماشي عليه. قاعدتين يبنوا سحور صح: كارب بطيء، وبروتين حقيقي.

البروتين الأول. بيض، فول، زبادي، جبنة، أو سكوب واي في لبن — استهدف ٢٥–٤٠ جرام في السحور. والفول هنا ممتاز بجد: هضمه بطيء، وبروتينه وأليافه عالية، وبيشبعك ساعات. جدتك كانت عندها حق.

الكارب البطيء بعده. شوفان، عيش بلدي أو سن، والفول تاني — حاجات بتطلّع طاقة على مدار ساعات. سيبك من سحور العيش الأبيض والمربى: بيرفع سكرك وينزل بيه، وتلاقي نفسك جعان الساعة ١٠ الصبح.

زوّد حاجات مشبعة وفيها مية: زبادي، موزة، خيار، معلقة طحينة للدهون الصحية. الدهون بتبطّئ الهضم — وفي السحور دي ميزة مش عيب.

اللي تتجنبه: الأكل المملّح أوي (عطش طول اليوم)، الحلويات (جوع من نص الصبح)، وإنك تفوّت السحور خالص. تمرين بالليل من غير سحور معناه إنك شغال على الفاضي.

قالب جاهز: فول بالطحينة وبيضة مسلوقة، رغيف سن، طبق زبادي، موزة، وكوبايتين مية. سجّله في العداد عشان هدف البروتين يفضل بيتحقق حتى في رمضان.`,
  },
  {
    title: 'Keeping your muscle through the fast',
    titleAr: 'حافظ على عضلاتك وانت صايم',
    excerpt: "Fasting doesn't eat your muscle — but a month of low protein and no training does.",
    excerptAr: 'الصيام مش بياكل عضلاتك — بس شهر من غير بروتين ولا تمرين بياكلها.',
    readTimeMin: 4,
    body: `Let's kill the fear first: a healthy person does not lose meaningful muscle from fasting hours. What actually costs you muscle in Ramadan is a month of low protein, no resistance training, and terrible sleep. All three are fixable.

Protein: your target does not change — roughly 1.6–2g per kg of body weight. What changes is the schedule. You now have three realistic slots: iftar, a post-training snack or meal, and suhoor. Hit protein in all three and the day adds up fine: chicken or meat at iftar, yogurt or whey after training, eggs and foul at suhoor.

Lifting: two to four sessions a week is enough to hold everything. Keep the weights in your normal range but drop a set from each exercise if you need to. Intensity preserves muscle; endless volume just deepens the recovery hole. The PULSE plan already spaces your days — let it.

Expect the scale to drop 1–2kg in week one. That is water and stomach content, not muscle. Do not chase it with extra food, and do not panic. Judge the month by your lifts: if your numbers in week four are within reach of week one, you kept your muscle.

Sleep is the quiet killer. Between late prayers and early suhoor the nights get short — grab a 20–40 minute nap in the afternoon when you can. Recovery is when the muscle is actually kept.`,
    bodyAr: `نقتل الخوف الأول: الشخص الصحيح مش بيخسر عضل حقيقي من ساعات الصيام. اللي بياكل عضلك في رمضان فعلاً هو شهر من بروتين قليل، ومن غير حديد، ونوم بايظ. والتلاتة ليهم حل.

البروتين: هدفك زي ما هو — حوالي ١.٦–٢ جرام لكل كيلو من وزنك. اللي بيتغير هو التوقيت. قدامك ٣ فرص حقيقية: الفطار، وجبة أو سناك بعد التمرين، والسحور. حط بروتين في التلاتة واليوم هيتجمع صح: فراخ أو لحمة على الفطار، زبادي أو واي بعد التمرين، بيض وفول على السحور.

الحديد: من حصتين لأربعة في الأسبوع كفاية تحافظ على كل حاجة. خلّي الأوزان في مداك الطبيعي، ولو محتاج قلّل مجموعة من كل تمرين. الشدة هي اللي بتحافظ على العضل؛ الحجم الزيادة بيعمّق حفرة الاستشفاء وبس. خطة PULSE موزعة أيامك أصلاً — سيبها تشتغل.

اتوقع الميزان ينزل كيلو أو اتنين أول أسبوع. دي مية ومحتوى معدة، مش عضل. متجريش وراها بأكل زيادة، ومتتخضش. احكم على الشهر بأوزانك: لو أرقامك في الأسبوع الرابع قريبة من الأول، يبقى عضلك زي ما هو.

والنوم هو القاتل الصامت. بين صلاة متأخرة وسحور بدري، الليل بيقصر — خد قيلولة ٢٠–٤٠ دقيقة العصر لما تقدر. الاستشفاء هو اللحظة اللي العضل بيتحفظ فيها فعلاً.`,
  },
  {
    title: 'A simple Ramadan week: the 3+1 split',
    titleAr: 'أسبوع رمضان ببساطة: نظام ٣+١',
    excerpt: 'Three lifting sessions, one easy movement day — a week you can actually repeat four times.',
    excerptAr: 'تلات حصص حديد ويوم حركة خفيفة — أسبوع تقدر تكرره ٤ مرات بجد.',
    readTimeMin: 3,
    body: `Forget the six-day split for a month. The Ramadan week that survives contact with reality is 3+1: three lifting sessions after iftar, one easy movement day, and honest rest for the rest.

Session 1 — Push (after iftar, e.g. Sunday): chest, shoulders, triceps. Your normal weights, one set less per exercise.

Session 2 — Pull (e.g. Tuesday): back, biceps, rear delts. Same rule.

Session 3 — Legs (e.g. Thursday): squat pattern, hinge pattern, calves. Legs take the most out of you, so this one gets the biggest meal after.

The +1 — easy movement (e.g. Saturday, before iftar): a 30-minute walk, mobility work, or the 2-minute resets in PULSE stacked into a session. It keeps the habit alive without costing recovery.

Two honest add-ons if you feel strong: light cardio before iftar once a week, and an extra core finisher after any session. Nothing else. The goal of this month is to walk out with your strength, your streak, and your habit intact — and 3+1 does exactly that.

Set these days in your PULSE schedule and the app will nudge you at your reminder hour with the right session. Consistency in Ramadan is not about heroics; it is about a plan small enough to keep.`,
    bodyAr: `انسى نظام الستة أيام لمدة شهر. أسبوع رمضان اللي بيستحمل الواقع هو ٣+١: تلات حصص حديد بعد الفطار، ويوم حركة خفيفة، وراحة من غير إحساس بالذنب في الباقي.

الحصة ١ — دفع (بعد الفطار، مثلاً الحد): صدر، كتف، تراي. أوزانك العادية، ناقص مجموعة من كل تمرين.

الحصة ٢ — سحب (مثلاً التلات): ضهر، باي، كتف خلفي. نفس القاعدة.

الحصة ٣ — رجل (مثلاً الخميس): سكوات، هينج (ديدليفت رومانية)، سمانة. الرجل بتاخد منك أكتر حاجة، فدي اللي بعدها أكبر وجبة.

الـ+١ — حركة خفيفة (مثلاً السبت، قبل الفطار): مشي ٣٠ دقيقة، إطالات، أو كام «ريست دقيقتين» من PULSE ورا بعض. بتحافظ على العادة من غير ما تدفع تمن استشفاء.

إضافتين بصراحة لو حاسس إنك قوي: كارديو خفيف قبل الفطار مرة في الأسبوع، وتمرين بطن قصير في آخر أي حصة. خلاص كده. هدف الشهر إنك تخرج منه بقوتك وسلسلتك وعادتك زي ما هما — و٣+١ بيعمل ده بالظبط.

ظبّط الأيام دي في جدول PULSE والتطبيق هيفكرك في معادك بالحصة الصح. الاستمرارية في رمضان مش بطولات؛ هي خطة صغيرة تقدر تحافظ عليها.`,
  },
];

async function main() {
  let category = await prisma.category.findFirst({ where: { kind: CATEGORY.kind, title: CATEGORY.title } });
  if (!category) {
    const maxOrder = await prisma.category.aggregate({ where: { kind: CATEGORY.kind }, _max: { order: true } });
    category = await prisma.category.create({
      data: { ...CATEGORY, order: (maxOrder._max.order ?? 0) + 1 },
    });
    console.log(`[ramadan] created category "${CATEGORY.title}"`);
  }

  let created = 0;
  let updated = 0;
  for (const g of GUIDES) {
    const existing = await prisma.article.findFirst({ where: { categoryId: category.id, title: g.title } });
    if (existing) {
      await prisma.article.update({ where: { id: existing.id }, data: g });
      updated++;
    } else {
      await prisma.article.create({ data: { ...g, categoryId: category.id } });
      created++;
    }
  }
  console.log(`[ramadan] guides: ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
