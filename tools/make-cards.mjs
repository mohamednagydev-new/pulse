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
  const p = path.join(__dirname, '..', 'apps', 'web', 'public', 'landing', name);
  return `data:image/jpeg;base64,${fs.readFileSync(p).toString('base64')}`;
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
      ? `<div class="wrap"><h1 style="font-size:82px">${c.title}</h1><div class="rows">${c.rows.map((r) => `<div class="row">${r}</div>`).join('')}</div></div>`
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
