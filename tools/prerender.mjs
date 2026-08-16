/**
 * SEO prerender: writes real, static, crawlable HTML for the public content —
 * every article and recipe, plus a /blog hub — into the built web dist.
 *
 * Why build-time files and not server rendering: IIS serves the dist directly
 * and its SPA-fallback rule only fires when no physical file exists, so
 * `dist/article/<id>/index.html` wins for direct/bot hits with zero config.
 * In-app navigation stays client-side and never touches these pages.
 *
 * Run (from repo root, after `vite build`):  node tools/prerender.mjs
 * install.ps1 runs this automatically on every deploy — content freshness
 * follows the deploy cadence.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'apps', 'web', 'dist');
const BASE = 'https://pulse.geddo.online';

const prisma = new PrismaClient();

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const img = (p) => {
  if (!p) return `${BASE}/pwa-512.png`;
  if (p.startsWith('http')) return p;
  if (p.startsWith('/')) return `${BASE}${p}`;
  return `${BASE}/media/image/${p.replace(/^images\//, '')}`;
};

/** Plain prose -> paragraphs + simple bullet lists (mirrors RichContent's rules). */
function prose(body) {
  return String(body ?? '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const lines = p.split(/\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length > 1 && lines.every((l) => /^[-•*]/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${esc(l.replace(/^[-•*]\s*/, ''))}</li>`).join('')}</ul>`;
      }
      return `<p>${esc(p)}</p>`;
    })
    .join('\n');
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Tajawal','Segoe UI',system-ui,sans-serif;background:#faf9f7;color:#1c1917;line-height:1.9}
.top{background:#1c1917;color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:900;font-size:20px;font-style:italic}
.brand img{width:34px;height:34px;border-radius:9px}
.top a.cta{background:#f97316;color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:9px 18px;border-radius:999px;white-space:nowrap}
.wrap{max-width:720px;margin:0 auto;padding:24px 20px 90px}
.cover{width:100%;max-height:340px;object-fit:cover;border-radius:18px;margin-bottom:18px}
h1{font-size:30px;line-height:1.4;margin-bottom:8px}
.meta{color:#a8a29e;font-size:13px;margin-bottom:18px}
.excerpt{font-size:17px;color:#57534e;border-inline-start:4px solid #f97316;padding-inline-start:14px;margin-bottom:20px}
article p{margin-bottom:14px;font-size:16.5px}
article ul{margin:0 0 14px;padding-inline-start:22px}
article li{margin-bottom:6px}
h2{font-size:20px;margin:26px 0 10px;color:#c2410c}
.facts{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.facts span{background:#ffedd5;color:#c2410c;font-weight:800;font-size:13px;padding:7px 14px;border-radius:999px}
.related{margin-top:36px;border-top:1px solid #e7e5e4;padding-top:18px}
.related h3{font-size:16px;margin-bottom:12px;color:#78716c}
.related a{display:block;color:#1c1917;text-decoration:none;font-weight:700;font-size:15px;padding:10px 14px;background:#fff;border-radius:12px;margin-bottom:8px;box-shadow:0 1px 3px rgb(0 0 0 / .06)}
.bar{position:fixed;bottom:0;left:0;right:0;background:linear-gradient(135deg,#f97316,#ea580c);padding:12px 20px;text-align:center}
.bar a{color:#fff;text-decoration:none;font-weight:900;font-size:16px}
footer{margin-top:30px;color:#a8a29e;font-size:13px;text-align:center}
footer a{color:#78716c}
.grid a{display:block;background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;color:#1c1917;text-decoration:none;font-weight:700;box-shadow:0 1px 3px rgb(0 0 0 / .06)}
.grid .sub{display:block;color:#a8a29e;font-weight:500;font-size:13px;margin-top:3px}
`;

function page({ url, title, description, image, ld, bodyHtml, campaign }) {
  const cta = `${BASE}/welcome?utm_source=seo&utm_medium=organic&utm_campaign=${campaign}`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | PULSE</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/pwa-192.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="PULSE">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="${BASE}/blog/"><img src="/pwa-192.png" alt="PULSE">PULSE</a>
  <a class="cta" href="${cta}">جرّب التطبيق مجانًا 💪</a>
</header>
<div class="wrap">
${bodyHtml}
<footer>
  <p>PULSE — كوتشك المصري في بيتك. تمارين، سعرات بالأكل المصري، تحديات — مجاني ١٠٠٪.</p>
  <p><a href="${BASE}/blog/">كل المقالات والوصفات</a> · <a href="${BASE}/welcome">عن التطبيق</a></p>
</footer>
</div>
<div class="bar"><a href="${cta}">افتح PULSE — مجاني من المتصفح، من غير تحميل ⚡</a></div>
</body>
</html>`;
}

const relatedHtml = (items, kind) =>
  items.length
    ? `<div class="related"><h3>${kind === 'article' ? 'اقرا كمان' : 'جرّب كمان'}</h3>${items
        .map((r) => `<a href="${BASE}/${kind}/${r.id}/">${esc(r.titleAr ?? r.title)}</a>`)
        .join('')}</div>`
    : '';

async function main() {
  if (!fs.existsSync(DIST)) throw new Error(`dist not found at ${DIST} — build the web app first`);

  const [articles, recipes] = await Promise.all([
    prisma.article.findMany({ include: { category: true } }),
    prisma.recipe.findMany({ include: { category: true } }),
  ]);

  let n = 0;

  for (const a of articles) {
    const title = a.titleAr ?? a.title;
    const excerpt = a.excerptAr ?? a.excerpt ?? '';
    const body = a.bodyAr ?? a.body ?? '';
    const url = `${BASE}/article/${a.id}`;
    const related = articles.filter((x) => x.categoryId === a.categoryId && x.id !== a.id).slice(0, 5);
    const html = page({
      url,
      title,
      description: excerpt || body.slice(0, 160),
      image: img(a.coverImage),
      campaign: 'article',
      ld: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: excerpt,
        image: img(a.coverImage),
        inLanguage: 'ar',
        publisher: { '@type': 'Organization', name: 'PULSE', logo: { '@type': 'ImageObject', url: `${BASE}/pwa-512.png` } },
        mainEntityOfPage: url,
      },
      bodyHtml: `
${a.coverImage ? `<img class="cover" src="${img(a.coverImage)}" alt="${esc(title)}">` : ''}
<h1>${esc(title)}</h1>
<p class="meta">${esc(a.category?.titleAr ?? a.category?.title ?? '')} · مكتبة PULSE الصحية</p>
${excerpt ? `<p class="excerpt">${esc(excerpt)}</p>` : ''}
<article>${prose(body)}</article>
${relatedHtml(related, 'article')}`,
    });
    const dir = path.join(DIST, 'article', a.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    n++;
  }

  for (const r of recipes) {
    const title = r.titleAr ?? r.title;
    const about = r.aboutAr ?? r.about ?? '';
    const ingredients = (() => { try { return JSON.parse(r.ingredientsAr ?? r.ingredients ?? '[]'); } catch { return []; } })();
    const steps = (() => { try { return JSON.parse(r.stepsAr ?? r.steps ?? '[]'); } catch { return []; } })();
    const url = `${BASE}/recipe/${r.id}`;
    const related = recipes.filter((x) => x.categoryId === r.categoryId && x.id !== r.id).slice(0, 5);
    const html = page({
      url,
      title,
      description: about || `${title} — وصفة صحية بالسعرات والماكروز من PULSE`,
      image: img(r.coverImage),
      campaign: 'recipe',
      ld: {
        '@context': 'https://schema.org',
        '@type': 'Recipe',
        name: title,
        description: about,
        image: img(r.coverImage),
        inLanguage: 'ar',
        recipeIngredient: ingredients,
        recipeInstructions: steps.map((s) => ({ '@type': 'HowToStep', text: s })),
        nutrition: r.calories ? { '@type': 'NutritionInformation', calories: `${r.calories} calories`, proteinContent: r.protein ? `${r.protein} g` : undefined } : undefined,
        totalTime: r.prepTimeMin ? `PT${r.prepTimeMin}M` : undefined,
      },
      bodyHtml: `
${r.coverImage ? `<img class="cover" src="${img(r.coverImage)}" alt="${esc(title)}">` : ''}
<h1>${esc(title)}</h1>
<p class="meta">${esc(r.category?.titleAr ?? r.category?.title ?? '')} · مطبخ PULSE</p>
<div class="facts">
${r.calories ? `<span>🔥 ${r.calories} سعرة</span>` : ''}
${r.protein ? `<span>💪 ${r.protein} جم بروتين</span>` : ''}
${r.prepTimeMin ? `<span>⏱ ${r.prepTimeMin} دقيقة</span>` : ''}
</div>
${about ? `<p class="excerpt">${esc(about)}</p>` : ''}
${ingredients.length ? `<h2>المقادير</h2><article><ul>${ingredients.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></article>` : ''}
${steps.length ? `<h2>الطريقة</h2><article><ul>${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></article>` : ''}
${relatedHtml(related, 'recipe')}`,
    });
    const dir = path.join(DIST, 'recipe', r.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    n++;
  }

  // ---- The hub: /blog — the crawl entry that links to EVERYTHING ----
  const cats = new Map();
  for (const a of articles) {
    const key = a.category?.titleAr ?? a.category?.title ?? 'مقالات';
    if (!cats.has(key)) cats.set(key, []);
    cats.get(key).push(`<a href="${BASE}/article/${a.id}/">${esc(a.titleAr ?? a.title)}<span class="sub">${esc((a.excerptAr ?? a.excerpt ?? '').slice(0, 90))}</span></a>`);
  }
  const recipeLinks = recipes.map((r) => `<a href="${BASE}/recipe/${r.id}/">${esc(r.titleAr ?? r.title)}<span class="sub">${r.calories ? `${r.calories} سعرة` : ''}${r.prepTimeMin ? ` · ${r.prepTimeMin} دقيقة` : ''}</span></a>`);

  const hub = page({
    url: `${BASE}/blog`,
    title: 'مكتبة PULSE — مقالات صحية ووصفات بالعربي',
    description: `${articles.length} مقال صحي و${recipes.length} وصفة بالسعرات — نوم، تخسيس، تمارين، أكل صحي مصري. مجاني بالكامل.`,
    image: `${BASE}/pwa-512.png`,
    campaign: 'blog-hub',
    ld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'مكتبة PULSE الصحية', inLanguage: 'ar' },
    bodyHtml: `
<h1>مكتبة PULSE الصحية 📚</h1>
<p class="excerpt">${articles.length} مقال و${recipes.length} وصفة — مكتوبين بالعربي، ببساطة، ومن غير كلام كبير.</p>
${[...cats.entries()].map(([cat, links]) => `<h2>${esc(cat)}</h2><div class="grid">${links.join('')}</div>`).join('')}
<h2>🍽 وصفات المطبخ الصحي</h2><div class="grid">${recipeLinks.join('')}</div>`,
  });
  fs.mkdirSync(path.join(DIST, 'blog'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'blog', 'index.html'), hub);
  n++;

  console.log(`[prerender] wrote ${n} static pages into ${DIST}`);
}

main()
  .catch((e) => { console.error('[prerender] FAILED:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
