/** Hand-translated Egyptian Arabic — programs, lessons, coaches. Matched by id (titles duplicate). Idempotent. */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const PROGRAMS: { id: string; titleAr: string; descriptionAr: string }[] = [
  { id: `cms6e299v0006c71g28d7lut9`, titleAr: `سلسلة يوجا للتجديد في 7 أيام`, descriptionAr: `رحلة لطيفة على مدار أسبوع معمولة عشان ترجّعلك طاقتك ومرونتك وصفا ذهنك يوم ورا يوم. كل حصة بتكمّل اللي قبلها، وبتنقلك من أساسات التثبيت لحد ما جسمك وعقلك يتجددوا بالكامل.` },
  { id: `cms6e29b8000mc71grd7ss21z`, titleAr: `يوجا الحمل`, descriptionAr: `سلسلة داعمة لفترة الحمل، معمولة عشان تفضلي قوية ومرتاحة ومتواصلة مع نفسك طول الحمل. في كل حصة فيه تعديلات تقدري تتمرني بيها بأمان في كل مرحلة من مراحل الحمل.` },
  { id: `cms6e29ci0010c71gz0zdgib4`, titleAr: `يين يوجا وشعر`, descriptionAr: `تمرين تأملي بيجمع بين وضعيات اليين الطويلة والهادية وبين كلام شعر بيهدّي دماغك. كل حصة بتدعوك للسكون والتأمل وراحة أعمق للأنسجة.` },
  { id: `cms6e29ej001fc71gyp9g2ci4`, titleAr: `البرنامج الأول`, descriptionAr: `مقدمة سهلة لتمارين المقاومة بتبنيلك أساس حركة قوي. مثالي لأي حد بيبدأ رحلته في اللياقة وبيتعلم أساسيات كل تمرين.` },
  { id: `cms6e29g3001rc71gm0fxeh8g`, titleAr: `البرنامج التاني`, descriptionAr: `زيادة في الحجم بتثبّت العادات الكويسة وبتضيف حركات جديدة. معمول عشان المبتدئين يفضلوا يتقدموا بثبات من غير ما يتحملوا فوق طاقتهم.` },
  { id: `cms6e29hi0023c71g9asjoccx`, titleAr: `البرنامج التالت`, descriptionAr: `آخر مرحلة للمبتدئين بتجمع كل حاجة مع بعض وبتجهّزك للتمرين المتوسط. استنى حصص لكل الجسم بتبنيلك ثقة ولياقة.` },
  { id: `cms6e29j5002fc71gyax0s9cr`, titleAr: `البرنامج الأول`, descriptionAr: `مرحلة متوسطة بتزوّد الشدة وبتقدّملك تقسيمات التمرين. معمولة للي خلّصوا الأساسيات وجاهزين يضغطوا أكتر.` },
  { id: `cms6e29kx002tc71gqt2e1yv5`, titleAr: `البرنامج التاني`, descriptionAr: `مرحلة متوسطة بحجم أعلى بتركز على بناء العضل وقدرة التحمل. الحصص بتبقى أطول وأكتر تركيزًا عشان تجيبلك نتايج حقيقية.` },
  { id: `cms6e29mm0035c71g47w8f2ns`, titleAr: `البرنامج التالت`, descriptionAr: `ذروة المرحلة المتوسطة اللي بتدمج القوة وتضخيم العضل واللياقة. هنا بتثبّت مكاسبك قبل ما تدخل التمرين المتقدم.` },
  { id: `cms6e29og003jc71gerd2uc5x`, titleAr: `البرنامج الأول`, descriptionAr: `مرحلة متقدمة معمولة للمتمرسين اللي بيدوّروا على أداء عالي. استنى شدة عالية وأوزان تقيلة وحصص صعبة.` },
  { id: `cms6e29pr003xc71gfz75xz8p`, titleAr: `البرنامج التاني`, descriptionAr: `مرحلة متقدمة مرهقة بتركز على أقصى قوة وعضل كثيف. الحجم والشدة بيعلوا عشان يجهزوك لأقصى أداء.` },
  { id: `cms6e29r30049c71gcx1cjih2`, titleAr: `البرنامج التالت`, descriptionAr: `المرحلة المتقدمة النهائية اللي بتوصل بأدائك لأقصى حد. المرحلة دي بتجمع أقصى قوة وتضخيم ولياقة عالية.` },
];

const LESSONS: { id: string; titleAr: string; descriptionAr: string }[] = [
  { id: `cms6e299z0008c71g9oz3jvpm`, titleAr: `اليوم 1: تدفق التثبيت`, descriptionAr: `استقر في جسمك بحركة بطيئة ومدروسة ونفس عميق عشان تثبّت تمرينك.` },
  { id: `cms6e29a6000ac71g3k2e5k8a`, titleAr: `اليوم 2: مرونة العمود الفقري بلطف`, descriptionAr: `فكّ التوتر على طول العمود الفقري بتمارين القطة-البقرة واللف والانحناءات الخلفية المدعومة.` },
  { id: `cms6e29ab000cc71ggqwikt97`, titleAr: `اليوم 3: تدفق فتح الورك`, descriptionAr: `خلّص الشدّ المخزّن في الورك بالطعنات ووضعيات الحمامة والثبات الواعي.` },
  { id: `cms6e29ah000ec71gdd8zrikt`, titleAr: `اليوم 4: فتح الصدر والنفس`, descriptionAr: `افتح صدرك وكتافك وانت بتظبط حركتك على نفس هادي وثابت.` },
  { id: `cms6e29ao000gc71gixtsbj04`, titleAr: `اليوم 5: توازن وتركيز`, descriptionAr: `ابني ثباتك وتركيزك من خلال وضعيات التوازن الواقفة ودماغ هادية.` },
  { id: `cms6e29av000ic71gmsr2jfd5`, titleAr: `اليوم 6: فينياسا لكل الجسم`, descriptionAr: `اتحرك في سلسلة كاملة بتربط القوة والمرونة والنفس المتدفق.` },
  { id: `cms6e29b1000kc71gj1fmldod`, titleAr: `اليوم 7: استعادة عميقة`, descriptionAr: `اقفل السلسلة بوضعيات استرخاء طويلة واسترخاء نهائي بإرشاد.` },
  { id: `cms6e29bd000oc71ga5piuvzw`, titleAr: `أساسيات ما قبل الولادة والنفس`, descriptionAr: `اتعلمي تقنيات تنفس آمنة وإحماء لطيف عشان تبدأي تمرينك في الحمل.` },
  { id: `cms6e29bl000qc71g7ut1cwdb`, titleAr: `تخفيف شدّ أسفل الظهر`, descriptionAr: `هدّي أسفل ظهرك وحوضك بتمارين إطالة مدعومة معمولة لجسم بيتغير.` },
  { id: `cms6e29bp000sc71grp2lce0h`, titleAr: `فتح الورك وقاع الحوض`, descriptionAr: `اعملي مساحة ومرونة في الورك وانتي بتشغّلي قاع الحوض بلطف.` },
  { id: `cms6e29bu000uc71gtxzswo24`, titleAr: `قوة لطيفة للأم`, descriptionAr: `حافظي على قوة وظيفية في رجليكي وذراعيكي بحركات خفيفة وآمنة للحمل.` },
  { id: `cms6e29bz000wc71gft9sf980`, titleAr: `هدوء وتواصل`, descriptionAr: `هدّي من نفسك واتواصلي مع بيبيكي من خلال حركة واعية ونفس هادي.` },
  { id: `cms6e29c5000yc71gs1w985je`, titleAr: `استرخاء مريح`, descriptionAr: `ادخلي في راحة عميقة بوضعيات على الجنب واسترخاء موجّه حنين.` },
  { id: `cms6e29cq0012c71gi80iomkq`, titleAr: `سكون وأول كلمات`, descriptionAr: `ادخل في وضعيات أرضية طويلة مع مقطع افتتاحي لطيف.` },
  { id: `cms6e29d10014c71gbk0yx28i`, titleAr: `إذابة الورك`, descriptionAr: `اغطس في تمارين فتح الورك العميقة والشعر التأملي بيرشد نفسك واسترخاءك.` },
  { id: `cms6e29da0016c71gdditftq6`, titleAr: `تليين العمود الفقري`, descriptionAr: `استكشف الانحناءات الأمامية المدعومة واللف مع كلام مهدّي.` },
  { id: `cms6e29dj0018c71gfly0n70h`, titleAr: `القلب الهادي`, descriptionAr: `افتح صدرك وكتافك في سكون والشعر بيهدّي دماغك.` },
  { id: `cms6e29dt001ac71gtk9yo4vq`, titleAr: `تثبيت الرجلين`, descriptionAr: `اثبت في تمارين إطالة مغذية وانت قاعد والشعر بيربطك باللحظة.` },
  { id: `cms6e29e0001cc71gebl0sj1c`, titleAr: `تأمل ختامي`, descriptionAr: `ارتاح في سكون كامل مع قصيدة أخيرة وتأمل طويل للاستعادة.` },
  { id: `cms6e29eu001hc71gm336eoe2`, titleAr: `أساسيات لكل الجسم`, descriptionAr: `اتقن أنماط الحركة الأساسية بمقاومة خفيفة وأداء نضيف.` },
  { id: `cms6e29f4001jc71g9myod515`, titleAr: `الصدر والترايسبس`, descriptionAr: `ابني قوة الدفع بتمارين بنش سهلة للمبتدئين وشغل ترايسبس.` },
  { id: `cms6e29fb001lc71gkx2ifswr`, titleAr: `الظهر والبايسبس`, descriptionAr: `طوّر ظهر علوي وذراعين قويين باستخدام السحب والكرل المتحكم فيه.` },
  { id: `cms6e29fl001nc71gz54yqic7`, titleAr: `يوم الرجل`, descriptionAr: `اتعلم السكوات والطعنات عشان تبني جزء سفلي ثابت وقوي.` },
  { id: `cms6e29fu001pc71g0fy8tbhv`, titleAr: `تفجير عضلات البطن`, descriptionAr: `قوّي وسطك بتمارين بطن بسيطة وفعّالة.` },
  { id: `cms6e29ge001tc71gqcgilzlz`, titleAr: `دفع الجزء العلوي`, descriptionAr: `اجمع حركات الدفع عشان تبني قوة متوازنة للجزء العلوي.` },
  { id: `cms6e29gl001vc71gk6ib0wf7`, titleAr: `سحب الجزء العلوي`, descriptionAr: `ركّز على السحب والبول داون عشان تنحت ظهر وذراعين أقوى.` },
  { id: `cms6e29gq001xc71gn8xjtg7t`, titleAr: `قوة الجزء السفلي`, descriptionAr: `طوّر السكوات والهينج عشان قوة وثبات أكبر للرجلين.` },
  { id: `cms6e29h0001zc71g8aa2tapn`, titleAr: `تفجير عضلات البطن`, descriptionAr: `تحدى بطنك وجوانبك بدائرة قصيرة ومركزة للكور.` },
  { id: `cms6e29ha0021c71goxh9l8cz`, titleAr: `مرونة الاستشفاء النشط`, descriptionAr: `فكّ العضلات المشدودة وحسّن مدى الحركة بتمارين مرونة لطيفة.` },
  { id: `cms6e29hv0025c71gc6jv0sa6`, titleAr: `يوم الدفع`, descriptionAr: `اجمع الصدر والكتاف والترايسبس في حصة واحدة متماسكة.` },
  { id: `cms6e29i30027c71gaym96qb6`, titleAr: `يوم السحب`, descriptionAr: `مرّن الظهر والبايسبس بتكرارات أتقل تدريجيًا ومتحكم فيها.` },
  { id: `cms6e29ib0029c71gliy8831j`, titleAr: `يوم الرجل`, descriptionAr: `اضغط على جزئك السفلي بتمارين مركبة ومعدلات تكرار أعلى.` },
  { id: `cms6e29ik002bc71gqspz5bbr`, titleAr: `لياقة لكل الجسم`, descriptionAr: `اجمع القوة والكارديو في تمرين ختامي متكامل.` },
  { id: `cms6e29iu002dc71gr02xu2x6`, titleAr: `تفجير عضلات البطن`, descriptionAr: `اقفل البرنامج بتمرين ختامي صعب مركّز على الكور.` },
  { id: `cms6e29jf002hc71g35ry79ba`, titleAr: `الصدر والترايسبس`, descriptionAr: `زوّد حجم الدفع بسوبر ستس بتستهدف الصدر والترايسبس.` },
  { id: `cms6e29jq002jc71gozqm279k`, titleAr: `الظهر والبايسبس`, descriptionAr: `كبّر ظهرك وذراعيك بسحب أتقل وشغل كرل مركّز.` },
  { id: `cms6e29k0002lc71gk5dv0c6h`, titleAr: `الكتاف والترابيس`, descriptionAr: `ابني كتاف زي الصخر بتمارين ضغط ورفرفة وشغل للترابيس.` },
  { id: `cms6e29k7002nc71g1f96b2ht`, titleAr: `يوم الرجل`, descriptionAr: `اتصدى لسكوات وهينج صعبة وشغل مساعد لتطوير كامل للرجلين.` },
  { id: `cms6e29kh002pc71gnl3uz8ev`, titleAr: `تفجير عضلات البطن`, descriptionAr: `اضرب كل زوايا الكور بدائرة بأوزان صعبة.` },
  { id: `cms6e29ko002rc71gb75gzmfj`, titleAr: `ختام لياقة`, descriptionAr: `ارفع نبضك بحصة لياقة أيضية سريعة الإيقاع.` },
  { id: `cms6e29l8002vc71gl32cq1i4`, titleAr: `قوة الدفع`, descriptionAr: `طوّر قوة دفع انفجارية في الصدر والكتاف والترايسبس.` },
  { id: `cms6e29lj002xc71gg964xkav`, titleAr: `قوة السحب`, descriptionAr: `ابني ظهر أسمك وأقوى بسحب تقيل وأنواع رو مختلفة.` },
  { id: `cms6e29lu002zc71gto88kbzg`, titleAr: `يوم الرجل`, descriptionAr: `اطحن حصة رجل بحجم عالي للتضخيم والقوة.` },
  { id: `cms6e29m50031c71g63g4z5uk`, titleAr: `الذراعين والكتاف`, descriptionAr: `اعزل الذراعين والكتاف لجسم متكامل ومنحوت.` },
  { id: `cms6e29me0033c71gvfjw86la`, titleAr: `تفجير عضلات البطن`, descriptionAr: `عمّق قوة وثبات الكور بدائرة بطن متدرجة.` },
  { id: `cms6e29my0037c71gag64449r`, titleAr: `الصدر والترايسبس`, descriptionAr: `طلّع أقصى أداء دفع بتقنيات شدة ودروب ستس.` },
  { id: `cms6e29na0039c71g6byihduj`, titleAr: `الظهر والبايسبس`, descriptionAr: `زوّد حجم جامد لظهرك وذراعيك بشغل تقيل ومجهود عالي.` },
  { id: `cms6e29nm003bc71ge22yowo0`, titleAr: `يوم الرجل`, descriptionAr: `تحدى جزئك السفلي بتمارين مركبة ومساعدة قاسية.` },
  { id: `cms6e29nu003dc71g5fedqm9i`, titleAr: `قوة كل الجسم`, descriptionAr: `اختبر قوة الجسم كله في حصة مبنية حوالين التمارين المركبة الكبيرة.` },
  { id: `cms6e29o2003fc71g464wytre`, titleAr: `تفجير عضلات البطن`, descriptionAr: `اقفل بقوة بتمرين كور وثبات لا يرحم.` },
  { id: `cms6e29o8003hc71grqnqazsx`, titleAr: `ختام أيضي`, descriptionAr: `احرق سعرات بدائرة لياقة بأقصى مجهود عشان تقفل المرحلة.` },
  { id: `cms6e29ol003lc71gxevvn1js`, titleAr: `دفع تقيل`, descriptionAr: `حرّك أوزان جامدة في تمارين الصدر والكتف والترايسبس المركبة.` },
  { id: `cms6e29or003nc71g42o9c1kn`, titleAr: `سحب تقيل`, descriptionAr: `هاجم الظهر والبايسبس بحركات سحب بأقصى مجهود.` },
  { id: `cms6e29p1003pc71gmitxucef`, titleAr: `يوم الرجل`, descriptionAr: `اصمد في حصة رجل قاسية معمولة للحجم والقوة والعزيمة.` },
  { id: `cms6e29p7003rc71gj4rawoza`, titleAr: `الكتاف والذراعين`, descriptionAr: `انحت كتاف وذراعين بتفاصيل بشغل شدة وحجم عالي.` },
  { id: `cms6e29pf003tc71gbieo41kk`, titleAr: `تفجير عضلات البطن`, descriptionAr: `حصّن وسطك بتمارين مقاومة دوران متقدمة بأوزان.` },
  { id: `cms6e29pk003vc71g7czw5lw5`, titleAr: `تحدي اللياقة`, descriptionAr: `اطلّع أقصى حدودك بختام لياقة عالي الشدة وقاسي.` },
  { id: `cms6e29pw003zc71g7ztbinlf`, titleAr: `الصدر والترايسبس`, descriptionAr: `حمّل عضلات الدفع بمجموعات تقيلة وتقنيات متقدمة.` },
  { id: `cms6e29q50041c71gx3ufx1uc`, titleAr: `الظهر والبايسبس`, descriptionAr: `ابني ظهر قوي ومفصّل بأقصى سحب وعقلة.` },
  { id: `cms6e29qd0043c71gvpifyf89`, titleAr: `يوم الرجل`, descriptionAr: `اتحمّل أصعب حصة رجل في البرنامج لقوة كاملة للجزء السفلي.` },
  { id: `cms6e29qk0045c71g3mpieghg`, titleAr: `الكتاف والترابيس`, descriptionAr: `طوّر كتاف وترابيس مهيبة بضغط تقيل وشرغ.` },
  { id: `cms6e29qu0047c71gw8f1i1j0`, titleAr: `تفجير عضلات البطن`, descriptionAr: `اختبر الكور تحت الحمل بشغل ثبات وقوة صعب.` },
  { id: `cms6e29rc004bc71gv3i37z8e`, titleAr: `دفع بأقصى مجهود`, descriptionAr: `طارد أرقام قياسية جديدة في الدفع بمجموعات علوية تقيلة.` },
  { id: `cms6e29rk004dc71gne5d3wi6`, titleAr: `سحب بأقصى مجهود`, descriptionAr: `ابني قوة سحب عالية بأتقل رو وأنواع الرفعة الميتة.` },
  { id: `cms6e29rw004fc71gtxqfzmxk`, titleAr: `يوم الرجل`, descriptionAr: `اقهر أصعب تمرين رجل في البرنامج لأقصى قوة وحجم.` },
  { id: `cms6e29s5004hc71gxeak3wbx`, titleAr: `الذراعين والكتاف`, descriptionAr: `اقفل جزئك العلوي بحصة ضخّ وحشية للذراعين والكتاف.` },
  { id: `cms6e29sg004jc71g4z96d7yq`, titleAr: `تفجير عضلات البطن`, descriptionAr: `ثبّت قوة كور صلبة كالصخر بدائرة متقدمة بأوزان.` },
  { id: `cms6e29sq004lc71gcjho59ha`, titleAr: `ذروة اللياقة`, descriptionAr: `اقفل البرنامج بتحدي لياقة بأقصى مجهود يثبت تقدمك.` },
];

const COACHES: { id: string; nameAr: string; headlineAr: string; bioAr: string }[] = [
  { id: `cms6e299o0004c71gya0efq6k`, nameAr: `كول تشانس`, headlineAr: `مدرّبة يوجا معتمدة`, bioAr: `كول تشانس مدرّبة يوجا معتمدة بخبرة أكتر من عشر سنين في تعليم الطلبة من المبتدئين لحد المحترفين. أسلوبها بيجمع بين المحاذاة السليمة والتركيز على النفس والمرونة والهدوء. بتؤمن إن اليوجا لازم تبقى سهلة ومريحة وممتعة بجد.` },
  { id: `cms6e29e9001dc71gq4zr94cg`, nameAr: `أبو النجا`, headlineAr: `مدرب النجوم — مدرب شخصي لأشهر الممثلين`, bioAr: `أبو النجا مدرب شخصي للمشاهير معروف إنه بيحوّل شكل الممثلين قبل الأدوار الصعبة. بخلفيته في القوة والتكييف البدني، بيعمل برامج بتوازن بين الشدة والتقدم المستمر. أسلوبه اللي مفيهوش أعذار خلاه من أكتر المدربين المطلوبين في المجال.` },
];

/**
 * These rows are matched by id, and `prisma/seed.ts` regenerates ids on every reset —
 * which used to make this Arabic unrecoverable. So: try the id, and if the ids no
 * longer exist, fall back to position.
 *
 * Position is safe here because seed.ts creates programs and lessons in a fixed order
 * from static JSON, so the Nth row by ascending id is always the Nth entry below. The
 * count guard refuses to guess when the shapes don't line up.
 */
async function applyPositional<T>(
  label: string,
  entries: T[],
  rows: { id: string }[],
  patch: (e: T) => Record<string, unknown>,
  update: (id: string, data: Record<string, unknown>) => Promise<unknown>,
): Promise<number> {
  if (rows.length !== entries.length) {
    console.warn(`  ! ${label}: ${rows.length} in the database but ${entries.length} translations — skipping the positional fallback`);
    return 0;
  }
  let n = 0;
  for (let i = 0; i < entries.length; i++) {
    await update(rows[i].id, patch(entries[i]));
    n++;
  }
  console.log(`  ~ ${label}: ids had changed, matched ${n} by position instead`);
  return n;
}

async function run() {
  let n = 0;

  for (const p of PROGRAMS) n += (await prisma.program.updateMany({ where: { id: p.id, titleAr: null }, data: { titleAr: p.titleAr, descriptionAr: p.descriptionAr } })).count;
  for (const l of LESSONS) n += (await prisma.lesson.updateMany({ where: { id: l.id, titleAr: null }, data: { titleAr: l.titleAr, descriptionAr: l.descriptionAr } })).count;
  for (const c of COACHES) n += (await prisma.coach.updateMany({ where: { id: c.id, nameAr: null }, data: { nameAr: c.nameAr, headlineAr: c.headlineAr, bioAr: c.bioAr } })).count;

  // Nothing matched by id but rows are still missing Arabic → the database was reset.
  const [progGap, lessonGap] = await Promise.all([
    prisma.program.count({ where: { titleAr: null } }),
    prisma.lesson.count({ where: { titleAr: null } }),
  ]);

  if (progGap > 0) {
    n += await applyPositional(
      'programs',
      PROGRAMS,
      await prisma.program.findMany({ orderBy: { id: 'asc' }, select: { id: true } }),
      (e) => ({ titleAr: e.titleAr, descriptionAr: e.descriptionAr }),
      (id, data) => prisma.program.update({ where: { id }, data }),
    );
  }

  if (lessonGap > 0) {
    n += await applyPositional(
      'lessons',
      LESSONS,
      await prisma.lesson.findMany({ orderBy: { id: 'asc' }, select: { id: true } }),
      (e) => ({ titleAr: e.titleAr, descriptionAr: e.descriptionAr }),
      (id, data) => prisma.lesson.update({ where: { id }, data }),
    );
  }

  // Coaches are matched by name instead: other seeds add coaches, so position is
  // not stable for this table.
  const COACH_BY_NAME: Record<string, (typeof COACHES)[number]> = {
    'Cole Chance': COACHES[0],
    'Abou El Naga': COACHES[1],
  };
  for (const [name, c] of Object.entries(COACH_BY_NAME)) {
    if (!c) continue;
    n += (await prisma.coach.updateMany({
      where: { name, nameAr: null },
      data: { nameAr: c.nameAr, headlineAr: c.headlineAr, bioAr: c.bioAr },
    })).count;
  }

  console.log(`base applied: ${n} (programs + lessons + coaches)`);
  await prisma.$disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
