/**
 * Renders ready-to-post marketing cards (1080x1350 PNG) from HTML templates —
 * brand fonts/colors, Arabic-first, some with real app screenshots. Output:
 * marketing-cards/*.png. Pair each card with its caption from the post packs.
 *
 * Run: node tools/make-cards.mjs   (needs internet for Google Fonts)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'marketing-cards');
fs.mkdirSync(OUT, { recursive: true });

const shot = (name) => {
  // landing/*.jpg first, else a walkthrough screenshot from tools/e2e-shots/*.png
  const landing = path.join(__dirname, '..', 'apps', 'web', 'public', 'landing', name);
  const e2e = path.join(__dirname, 'e2e-shots', name);
  const p = fs.existsSync(landing) ? landing : e2e;
  const mime = p.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
};
const logo = () => {
  const p = path.join(__dirname, '..', 'apps', 'web', 'public', 'pwa-192.png');
  return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
};

const G = {
  ink: 'linear-gradient(160deg,#1c1917 0%,#292018 55%,#3b2410 100%)',
  orange: 'linear-gradient(150deg,#f97316 0%,#be123c 100%)',
  blue: 'linear-gradient(150deg,#2563eb 0%,#312e81 100%)',
  green: 'linear-gradient(150deg,#16a34a 0%,#115e59 100%)',
  violet: 'linear-gradient(150deg,#7c3aed 0%,#6d28d9 100%)',
};

/** kind: 'big' (statement) | 'qa' (question) | 'feature' (screenshot + text) */
const CARDS = [
  // ---- Not-a-gym / identity ----
  { file: '01-fara3na-fi-betak', kind: 'big', bg: G.ink, emoji: '🏠', title: 'فرعنا في بيتك', sub: 'إحنا تطبيق، مش جيم — تفتح اللينك وتتمرن في أوضتك', badge: 'مجاني ١٠٠٪' },
  { file: '02-msh-mehtag-gym', kind: 'big', bg: G.orange, emoji: '📱', title: 'جيم كامل في موبايلك', sub: 'تمارين بالفيديو لكل مستوى — من غير أجهزة ومن غير اشتراك', badge: 'ببلاش' },
  { file: '03-faq', kind: 'qa', bg: G.ink, title: 'أسئلة بتوصلنا كتير 😄', rows: ['«فين الفرع؟» — مفيش فرع، تطبيق في موبايلك ✅', '«بكام الاشتراك؟» — مفيش اشتراك، مجاني ١٠٠٪ ✅', '«محتاج أجهزة؟» — فيه برامج بيت كاملة من غيرها ✅'] },
  // ---- Feature spotlights (real screenshots) ----
  { file: '04-voice-logging', kind: 'feature', bg: G.orange, img: 'tracker.jpg', emoji: '🎤', title: 'قول أكلت إيه… وإحنا نحسب', sub: 'كشري، فول، طعمية — سجّل بالصوت والسعرات تتحسب لوحدها' },
  { file: '05-muscle-map', kind: 'feature', bg: G.blue, img: 'session.jpg', emoji: '💪', title: 'دوس على العضلة وابدأ', sub: 'فيديو لكل تمرينة + سجّل أوزانك واكسر أرقامك' },
  { file: '06-kitchen', kind: 'feature', bg: G.green, img: 'kitchen.jpg', emoji: '🍽', title: '٩٠+ وصفة صحية', sub: 'مطبخ كامل بالعربي — وخطة وجبات بتشرح نفسها' },
  { file: '07-challenges', kind: 'feature', bg: G.violet, img: 'challenge.jpg', emoji: '🏆', title: 'اتحدى أصحابك', sub: 'تحديات ببادجات، دوري أسبوعي، وتحدي ١ ضد ١' },
  { file: '08-app-home', kind: 'feature', bg: G.ink, img: 'home.jpg', emoji: '🇪🇬', title: 'كوتشك المصري في بيتك', sub: 'تمارين وسعرات وتحديات — كله في مكان… في موبايلك 😄' },
  // ---- Engagement / questions ----
  { file: '09-fetarak-eh', kind: 'big', bg: G.green, emoji: '🍳', title: 'فطارك إيه النهارده؟', sub: 'اكتبه في الكومنتات وهنقولك كام سعرة فيه 👇', badge: 'جاوب وشوف' },
  { file: '10-beit-wala-gym', kind: 'big', bg: G.blue, emoji: '🏠🏋️', title: 'بيت ولا جيم؟', sub: 'إنت من أنهي فريق؟ اكتب فريقك تحت 👇', badge: 'سؤال اليوم' },
  { file: '11-koshari', kind: 'big', bg: G.orange, emoji: '🍛', title: 'الكشري مش العدو', sub: 'طبق وسط في البيت ≈ ٥٥٠ سعرة وفيه بروتين نباتي — المشكلة في الكمية مش الأكلة', badge: 'معلومة النهارده' },
  { file: '12-men-bokra', kind: 'big', bg: G.ink, emoji: '😂', title: '«هبدأ من بكرة»', sub: 'اعمل منشن لصاحبك اللي بيقولها كل أسبوع 👇', badge: 'تاج لصاحبك' },
  { file: '13-squat-dare', kind: 'big', bg: G.violet, emoji: '🔥', title: 'تقدر على ٢٠ سكوات؟', sub: 'صورها وحطها ستوري ومنشن صاحبك يكملها — يلا نشوف مين جد', badge: 'تحدي' },
  { file: '14-guest', kind: 'big', bg: G.green, emoji: '👀', title: 'مش مصدق؟ اتفرج بنفسك', sub: 'ادخل شوف كل حاجة من غير ما تعمل حساب أصلاً — pulse.geddo.online', badge: 'من غير حساب' },
  // ---- Wave 2: more screens, more features ----
  { file: '15-meal-plan', kind: 'feature', bg: G.green, img: '16-mealplan.png', emoji: '🥗', title: 'خطة أكل بتشرح نفسها', sub: 'مش بس بتقولك تاكل إيه — بتقولك ليه، ومبنية على هدفك وسعراتك' },
  { file: '16-grocery', kind: 'feature', bg: G.orange, img: '17-grocery.png', emoji: '🛒', title: 'قايمة المشتريات جاهزة', sub: 'من خطة أكلك على طول — تروح السوبر ماركت وإنت عارف هتجيب إيه' },
  { file: '17-leagues', kind: 'feature', bg: G.violet, img: '37-leagues.png', emoji: '🏅', title: 'دوري كل أسبوع', sub: 'اجمع نقط، اصعد للدرجة الأعلى، أو اهبط 😅 — المنافسة بتخليك تكمّل' },
  { file: '18-group-live', kind: 'feature', bg: G.blue, img: '33-group-sessions.png', emoji: '🔴', title: 'حصص لايف جماعية', sub: 'السبت جسم كامل ٧م · الثلاثاء حرق ٨م · الخميس يوجا ٨م — بتايمر مشترك مع الناس' },
  { file: '19-progress', kind: 'feature', bg: G.ink, img: '36-progress.png', emoji: '📈', title: 'شوف تقدمك بالأرقام', sub: 'أسابيعك، أوزانك، أرقامك القياسية — كله متسجل ومرسوم قدامك' },
  { file: '20-muscle-map', kind: 'feature', bg: G.blue, img: '45-muscle-map.png', emoji: '🎯', title: 'اختار العضلة من الخريطة', sub: 'صدر؟ ضهر؟ رجل؟ — دوس عليها وخد جلسة كاملة بالفيديو' },
  { file: '21-badges', kind: 'feature', bg: G.violet, img: '18-achievements.png', emoji: '🎖', title: 'بادجات وإنجازات', sub: 'كل تحدي بتخلصه بادج بيفضل معاك — وريهم إنت عملت إيه' },
  { file: '22-reels', kind: 'feature', bg: G.orange, img: '35-reels.png', emoji: '🎬', title: 'ريلز تمارين سريعة', sub: 'مقاطع قصيرة تتحمس بيها وتتعلم منها — جوه التطبيق' },
  { file: '23-arabic-first', kind: 'feature', bg: G.green, img: '50-AR-home.png', emoji: '🇪🇬', title: 'بالعربي… وبالمصري', sub: 'مش ترجمة آلية — التطبيق كله مكتوب بالمصري عشان يبقى ليك' },
  { file: '24-recipes', kind: 'feature', bg: G.orange, img: '25-recipe-detail.png', emoji: '👨‍🍳', title: 'وصفات بالفيديو والسعرات', sub: 'المقادير والخطوات والماكروز — وفيديو الطريقة كمان' },
  { file: '25-articles', kind: 'feature', bg: G.blue, img: '26-article-detail.png', emoji: '📖', title: '١٢٠+ مقال صحي بالعربي', sub: 'نوم، ضغط، سكر، مفاصل — معلومة تثق فيها من غير كلام كبير' },
  { file: '26-week-zero', kind: 'feature', bg: G.green, img: '19-weekzero.png', emoji: '🌱', title: 'مبتدئ خالص؟ عادي', sub: 'الأسبوع صفر: ٧ أيام هادية تدخلك التمرين من غير ما تكره حياتك 😄' },
  { file: '27-streak', kind: 'big', bg: G.orange, emoji: '🔥', title: 'السلسلة بتاعتك كام يوم؟', sub: 'سلسلة أيام + مهام يومية + عجلة حظ — التطبيق بيحارب عشان متقطعش', badge: 'اكتب رقمك تحت 👇' },
  { file: '28-chat-voice', kind: 'big', bg: G.blue, emoji: '🎙', title: 'شات ورسائل صوتية', sub: 'إنت وأصحابك جوه التطبيق — شجعوا بعض، اتحدوا بعض، وابعتوا فويسات', badge: 'مع أصحابك' },
  { file: '29-water', kind: 'big', bg: G.green, emoji: '💧', title: 'شربت مية النهارده؟', sub: 'عدّاد المية جوه التطبيق بيفكرك — جسمك محتاج أكتر مما فاكر', badge: 'اشرب دلوقتي 😄' },
  { file: '30-hall-of-fame', kind: 'big', bg: G.violet, emoji: '👑', title: 'لوحة الأبطال', sub: 'كل أسبوع أعلى ناس في النقط والسلاسل بيتعرضوا قدام الكل — اسمك ممكن يبقى هناك', badge: 'مين أبطال الأسبوع؟' },
  { file: '31-how-to-start', kind: 'qa', bg: G.ink, title: 'ابدأ رحلتك في ٣ دقايق 🚀', rows: [
    '1️⃣ افتح pulse.geddo.online — مفيش تحميل',
    '2️⃣ اعمل حساب مجاني (نص دقيقة)',
    '3️⃣ جاوب ٩ أسئلة وخد خطتك على قدك',
    '4️⃣ ابدأ أول تمرين النهارده 💪',
    '5️⃣ سجّل أكلك بالصوت 🎤 وادخل تحدي PULSE14',
  ] },

  // ---- Aug 2026 feature wave: AI coach, barcode, recipes, meal photo ----
  { file: '32-ai-coach', kind: 'big', bg: G.ink, emoji: '🤖', title: 'اسأل كوتشك أي حاجة', sub: 'تمرين، أكل، ثبات وزن، شد عضلي — كوتش الـAI يجاوبك بالمصري في ثانيتين', badge: 'جديد وببلاش' },
  { file: '33-barcode', kind: 'big', bg: G.orange, emoji: '📷', title: 'امسح الباركود قبل ما تشتري', sub: 'أي منتج من السوبرماركت — القيم الغذائية كاملة + تقييم من ١٠ على حسب هدفك', badge: 'ميزة جديدة' },
  { file: '34-my-recipes', kind: 'big', bg: G.green, emoji: '🍳', title: 'وصفتك… بحسابها', sub: 'اعمل وصفتك بمكوناتها مرة واحدة — السعرات والبروتين محسوبين للحصة، وتسجلها بضغطة', badge: 'جديد' },
  { file: '35-meal-photo', kind: 'big', bg: G.violet, emoji: '✨', title: 'صوّر طبقك… وخلاص', sub: 'التطبيق يقدّر السعرات من الصورة — من غير كتابة ولا حساب', badge: 'ذكاء بيشتغل لك' },
  { file: '36-enable-notifications', kind: 'qa', bg: G.ink, title: 'إزاي تفعّل الإشعارات؟ 🔔', rows: [
    '1️⃣ افتح pulse.geddo.online وسجّل دخولك',
    '2️⃣ آيفون؟ دوس زرار المشاركة ⬆️ → «إضافة إلى الشاشة الرئيسية» 📲',
    '3️⃣ افتح التطبيق من الأيقونة الجديدة (مش من سفاري)',
    '4️⃣ هيظهرلك كارت «فعّل الإشعارات 🔔» — دوس فعّل واسمح ✅ وخلاص، تفكيرة تمرينك هتوصلك 💪',
  ] },

  // ---- Positioning wave: not just muscles — weight loss is a first-class goal ----
  { file: '37-msh-bas-adalat', kind: 'big', bg: G.orange, emoji: '⚖️💪', title: 'مش بس عضلات', sub: 'عايز تخس؟ تبني عضل؟ الاتنين مع بعض؟ — برامج تمرين وأكل مصري لكل هدف، وإنت اللي تختار', badge: 'لكل الأهداف' },
  { file: '38-diet-journey', kind: 'qa', bg: G.green, title: 'رحلة الدايت الجديدة 🎯', rows: [
    '1️⃣ سجّل وزنك وحدد وزنك المستهدف',
    '2️⃣ شريط تقدم بيتحرك مع كل وزنة — وبيقولك ماشي صح ولا متأخر',
    '3️⃣ تفكيرة أكل لو نسيت تسجل + وزنة كل جمعة ⚖️',
    '4️⃣ يوم التمرين؟ سعرات وبروتين أكتر أوتوماتيك 💪',
    '5️⃣ وصلت لهدفك؟ احتفال و+٣٠٠ نقطة 🏆',
  ] },
  { file: '39-tekhes-maa-sohabak', kind: 'big', bg: G.violet, emoji: '🤝', title: 'بتخس لوحدك؟ صعب', sub: 'مع صحابك؟ لعبة 😄 — سجّلوا أكلكم، اتحدوا بعض، ودوري كل أسبوع يخليكم مكملين', badge: 'ادعُ صاحبك' },

  // ---- Animated move figures: show the app teaches the movement itself ----
  { file: '41-move-figures', kind: 'feature', bg: G.blue, img: 'human-moves.png', emoji: '🤸', title: 'التطبيق بيوريك الحركة', sub: 'شخصية متحركة بتأدي التمرينة قدامك — والعضلة اللي بتشتغل مضيّة باللون — في كل تمرينة' },

  // ---- Redesign announcement: calmer screens, user decides what shows ----
  { file: '42-new-look', kind: 'feature', bg: G.violet, img: 'new-home.png', emoji: '🧘', title: 'الشكل الجديد أهدى', sub: 'خط أكبر وشاشة مرتبة — وكل حاجة لسه موجودة: دوس على أي كارت تحت وثبّته 📌 وخلّي شاشتك على مزاجك' },

  // ---- Carrefour prize challenge (Sept 1-14, 2026) ----
  { file: '43-carrefour-challenge', kind: 'qa', bg: G.orange, title: 'تحدي كارفور — جوايز ٩٠٠ جنيه 🛒', rows: [
    '1️⃣ من ١ لـ١٤ سبتمبر: اعمل ١٠ تمرينات من جوه التطبيق 💪',
    '2️⃣ 🥇 الأول: قسيمة كارفور ٥٠٠ جنيه 🔥',
    '3️⃣ 🥈🥉 التاني والتالت: قسيمة ٢٠٠ جنيه لكل واحد',
    '4️⃣ 📸 انشر إثبات تمرينك في غرفة التحدي — النتايج بتتراجع قبل تسليم الجوايز',
  ] },

  // ---- Install how-to: the #1 support question — no store, add from the browser ----
  { file: '40-how-to-install', kind: 'qa', bg: G.blue, title: 'إزاي تنزّل التطبيق؟ 📲', rows: [
    '1️⃣ افتح pulse.geddo.online من متصفح موبايلك — من غير متجر ومن غير تحميل',
    '2️⃣ أندرويد؟ من كروم دوس النقط ⋮ → «إضافة إلى الشاشة الرئيسية» ✅',
    '3️⃣ آيفون؟ من سفاري دوس زرار المشاركة ⬆️ → «إضافة إلى الشاشة الرئيسية»',
    '4️⃣ خلاص! افتح من أيقونة PULSE على شاشتك — وشغال أوفلاين كمان 💪',
  ] },
];

const html = (c) => `<!doctype html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; font-family:'Tajawal',sans-serif; }
html,body { background:#111; }
#card { width:1080px; height:1350px; background:${c.bg}; color:#fff; overflow:hidden; position:relative; direction:rtl; }
.blob { position:absolute; border-radius:50%; background:rgba(255,255,255,.07); }
.brand { position:absolute; top:56px; right:64px; display:flex; align-items:center; gap:20px; }
.brand img { width:84px; height:84px; border-radius:22px; box-shadow:0 12px 30px rgba(0,0,0,.35); }
.brand span { font-size:52px; font-weight:900; font-style:italic; letter-spacing:1px; }
.free { position:absolute; top:70px; left:64px; background:rgba(255,255,255,.18); padding:14px 30px; border-radius:999px; font-size:30px; font-weight:800; }
.wrap { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:120px 90px 140px; gap:34px; }
.emoji { font-size:150px; line-height:1; }
h1 { font-size:92px; font-weight:900; line-height:1.18; }
.sub { font-size:44px; font-weight:500; line-height:1.55; color:rgba(255,255,255,.88); max-width:850px; }
.badge { background:#fff; color:#1c1917; padding:18px 46px; border-radius:999px; font-size:38px; font-weight:900; }
.rows { display:flex; flex-direction:column; gap:30px; max-width:900px; width:100%; }
.row { background:rgba(255,255,255,.10); border:2px solid rgba(255,255,255,.18); border-radius:28px; padding:30px 38px; font-size:38px; font-weight:700; line-height:1.5; text-align:right; }
.featwrap { position:absolute; inset:0; display:flex; align-items:center; padding:180px 64px 150px; gap:46px; }
.phone { width:400px; border-radius:40px; box-shadow:0 30px 80px rgba(0,0,0,.5); border:6px solid rgba(255,255,255,.18); flex-shrink:0; }
.ftext { flex:1; min-width:0; display:flex; flex-direction:column; gap:28px; text-align:right; }
.ftext .emoji { font-size:105px; }
.ftext h1 { font-size:76px; }
.ftext .sub { font-size:40px; max-width:none; }
.site { position:absolute; bottom:56px; left:0; right:0; text-align:center; font-size:40px; font-weight:800; letter-spacing:.5px; color:rgba(255,255,255,.95); }
</style></head><body>
<div id="card">
<div class="blob" style="width:500px;height:500px;top:-140px;right:-160px"></div>
<div class="blob" style="width:420px;height:420px;bottom:-120px;left:-120px"></div>
<div class="brand"><img src="${logo()}"><span>PULSE</span></div>
${c.kind === 'feature' || !c.badge ? '<div class="free">مجاني ١٠٠٪</div>' : ''}
${
  c.kind === 'feature'
    ? `<div class="featwrap"><div class="ftext"><div class="emoji">${c.emoji}</div><h1>${c.title}</h1><div class="sub">${c.sub}</div></div><img class="phone" src="${shot(c.img)}"></div>`
    : c.kind === 'qa'
      ? `<div class="wrap" style="padding-top:200px;justify-content:flex-start"><h1 style="font-size:82px">${c.title}</h1><div class="rows">${c.rows.map((r) => `<div class="row">${r}</div>`).join('')}</div></div>`
      : `<div class="wrap"><div class="emoji">${c.emoji}</div><h1>${c.title}</h1><div class="sub">${c.sub}</div>${c.badge ? `<div class="badge">${c.badge}</div>` : ''}</div>`
}
<div class="site">pulse.geddo.online</div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
for (const c of CARDS) {
  await page.setContent(html(c), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400); // font settle
  await page.locator('#card').screenshot({ path: path.join(OUT, `${c.file}.png`) });
  console.log('made', c.file);
}
await browser.close();
console.log(`\n${CARDS.length} cards in marketing-cards/`);
