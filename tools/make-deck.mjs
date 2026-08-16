/**
 * Builds the PULSE feature presentation decks (AR + EN) from the same
 * current-UI screenshots the landing page uses. Output: presentations/*.pptx.
 *
 * Run: node tools/make-deck.mjs
 */
import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, '..', 'apps', 'web', 'public', 'landing', 'shots');
const OUT = path.join(__dirname, '..', 'presentations');
fs.mkdirSync(OUT, { recursive: true });

const INK = '1C1917';
const ORANGE = 'F97316';
const WHITE = 'FFFFFF';
const GRAY = 'A8A29E';

const SLIDES = [
  {
    img: 's-home.jpg',
    en: { title: 'Your day, one calm screen', bullets: ['Today\'s workout, one tap to start', 'Daily quests with XP rewards', 'Streaks, freezes and a lucky wheel', 'The user chooses what shows — pin anything'] },
    ar: { title: 'يومك في شاشة واحدة هادية', bullets: ['تمرين النهارده — زرار واحد يبدأ', 'مهام يومية بنقط ومكافآت', 'سلسلة أيام وفريز وعجلة حظ', 'المستخدم يختار اللي يبان — ثبّت اللي يعجبك'] },
  },
  {
    img: 's-muscles.jpg',
    en: { title: 'Tap a muscle, get a session', bullets: ['Interactive body map, front & back', 'Video form guide for every exercise', 'Animated figures show the movement', 'Log sets — PR celebrations'] },
    ar: { title: 'دوس على العضلة وخد جلسة', bullets: ['خريطة جسم تفاعلية — قدام ووراء', 'فيديو شرح لكل تمرينة', 'شخصية متحركة بتوريك الحركة', 'سجّل أوزانك — واحتفال بالأرقام الجديدة'] },
  },
  {
    img: 's-tracker.jpg',
    en: { title: 'Calories with Egyptian food', bullets: ['154 Egyptian foods with real macros', 'Log by VOICE — "I ate koshari"', 'Scan any barcode: score for your goal', 'Snap a meal photo — AI estimates it'] },
    ar: { title: 'سعرات بالأكل المصري', bullets: ['١٥٤ أكلة مصرية بقيمها الحقيقية', 'سجّل بصوتك — «أكلت كشري»', 'امسح الباركود وخد تقييم لهدفك', 'صوّر طبقك والذكاء يقدّر السعرات'] },
  },
  {
    img: 's-meals.jpg',
    en: { title: 'A meal plan that explains itself', bullets: ['Built from the user\'s goal and body', 'Every plate says WHY it\'s there', 'Training days get +200 kcal automatically', 'Swap any dish, grocery list included'] },
    ar: { title: 'خطة أكل بتشرح نفسها', bullets: ['مبنية على هدف وجسم المستخدم', 'كل طبق معاه السبب', 'يوم التمرين ياخد ٢٠٠+ سعرة أوتوماتيك', 'بدّل أي طبق — وقايمة مشتريات جاهزة'] },
  },
  {
    img: 's-progress.jpg',
    en: { title: 'Progress & the Diet Journey', bullets: ['Set a target weight — progress bar to it', 'On-track / behind vs a healthy pace', 'Smart nudges: log food, Friday weigh-in', 'Reach the goal: celebration + 300 XP'] },
    ar: { title: 'التقدم ورحلة الدايت', bullets: ['حدد وزنك المستهدف — وشريط تقدم ليه', 'ماشي صح ولا متأخر — بسرعة صحية', 'تفكيرات ذكية: سجّل أكلك ووزن الجمعة', 'وصلت لهدفك؟ احتفال و٣٠٠ نقطة'] },
  },
  {
    img: 's-group.jpg',
    en: { title: 'Live classes, together', bullets: ['Coach-hosted rooms with synced video', 'Shared countdown timer for everyone', 'Live reactions, text chat & voice notes', 'Weekly schedule: full-body, burn, yoga'] },
    ar: { title: 'حصص لايف مع بعض', bullets: ['غرف بفيديو متزامن يتحكم فيه الكوتش', 'تايمر مشترك للكل في نفس اللحظة', 'تفاعلات لايف وشات وملاحظات صوتية', 'جدول أسبوعي: جسم كامل وحرق ويوجا'] },
  },
  {
    img: 's-wellness.jpg',
    en: { title: 'Wellness library in Arabic', bullets: ['120+ health articles, hand-written Arabic', '90+ healthy recipes with macros', 'Sleep, stress, sugar, joints', 'Curated short videos'] },
    ar: { title: 'مكتبة صحية بالعربي', bullets: ['١٢٠+ مقال صحي مكتوب بالمصري', '٩٠+ وصفة صحية بالسعرات', 'نوم وضغط وسكر ومفاصل', 'فيديوهات قصيرة مختارة'] },
  },
  {
    img: 's-features.jpg',
    en: { title: 'And a whole treasure chest more', bullets: ['AI coach answering in Egyptian Arabic', 'Weekly leagues, 1v1 duels, challenges', 'Community feed, buddies and cheering', 'Web push + email re-engagement'] },
    ar: { title: 'وكنوز تانية كتير', bullets: ['كوتش AI بيرد بالمصري', 'دوري أسبوعي وتحديات ١ ضد ١', 'مجتمع وأصحاب وتشجيع', 'إشعارات ذكية وإيميلات متابعة'] },
  },
];

async function buildDeck(lang) {
  const isAr = lang === 'ar';
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
  pptx.layout = 'W';
  if (isAr) pptx.rtlMode = true;
  const align = isAr ? 'right' : 'left';

  // ---- Title slide ----
  let s = pptx.addSlide();
  s.background = { color: INK };
  s.addText('PULSE', { x: 0.8, y: 2.3, w: 11.7, h: 1.3, align: 'center', fontSize: 66, bold: true, italic: true, color: ORANGE, fontFace: 'Arial' });
  s.addText(isAr ? 'كوتشك المصري في بيتك — مجاني ١٠٠٪' : 'Your Egyptian coach at home — 100% free', {
    x: 0.8, y: 3.6, w: 11.7, h: 0.8, align: 'center', fontSize: 26, color: WHITE, fontFace: 'Arial',
  });
  s.addText('pulse.geddo.online', { x: 0.8, y: 6.5, w: 11.7, h: 0.5, align: 'center', fontSize: 18, color: GRAY, fontFace: 'Arial' });

  // ---- Feature slides: screenshot on one side, copy on the other ----
  for (const [i, sl] of SLIDES.entries()) {
    const c = isAr ? sl.ar : sl.en;
    const slide = pptx.addSlide();
    slide.background = { color: INK };
    // Screenshot (390x780 → keep ratio at 3.2in wide, 6.4in tall)
    const imgX = isAr ? 0.9 : 13.33 - 0.9 - 3.2;
    slide.addImage({ path: path.join(SHOTS, sl.img), x: imgX, y: 0.55, w: 3.2, h: 6.4, rounding: true });
    const textX = isAr ? 4.7 : 0.9;
    slide.addText(`${i + 1} / ${SLIDES.length}`, { x: textX, y: 0.55, w: 7.6, h: 0.4, align, fontSize: 14, color: GRAY, fontFace: 'Arial' });
    slide.addText(c.title, { x: textX, y: 1.15, w: 7.6, h: 1.2, align, fontSize: 34, bold: true, color: ORANGE, fontFace: 'Arial' });
    slide.addText(
      c.bullets.map((b) => ({ text: b, options: { bullet: { code: '2022' }, breakLine: true } })),
      { x: textX, y: 2.6, w: 7.6, h: 3.6, align, fontSize: 20, color: WHITE, fontFace: 'Arial', lineSpacing: 34 },
    );
    slide.addText('pulse.geddo.online', { x: textX, y: 6.7, w: 7.6, h: 0.4, align, fontSize: 12, color: GRAY, fontFace: 'Arial' });
  }

  // ---- Closing slide ----
  s = pptx.addSlide();
  s.background = { color: ORANGE };
  s.addText(isAr ? 'كل ده مجاني. كله.' : 'All of it. Free.', {
    x: 0.8, y: 2.5, w: 11.7, h: 1.2, align: 'center', fontSize: 48, bold: true, color: WHITE, fontFace: 'Arial',
  });
  s.addText(isAr ? 'من غير فيزا ولا اشتراك — يشتغل من المتصفح كتطبيق' : 'No card, no subscription — installs from the browser as an app', {
    x: 0.8, y: 3.8, w: 11.7, h: 0.6, align: 'center', fontSize: 22, color: WHITE, fontFace: 'Arial',
  });
  s.addText('pulse.geddo.online', { x: 0.8, y: 5.0, w: 11.7, h: 0.7, align: 'center', fontSize: 30, bold: true, color: INK, fontFace: 'Arial' });

  const file = path.join(OUT, `PULSE-Features-${lang.toUpperCase()}.pptx`);
  await pptx.writeFile({ fileName: file });
  console.log('wrote', file);
}

await buildDeck('ar');
await buildDeck('en');
