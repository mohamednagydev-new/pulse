/**
 * Generate the 12 PULSE avatar characters with OpenAI image generation:
 * cute 3D-mascot style (the PNGTree look the owner asked for), transparent
 * background, composed onto the same gradient discs as before — filenames
 * stay a1..a12.svg so the picker/defaults/validation need zero changes.
 *
 *   node tools/gen-avatars.mjs            # all 12
 *   node tools/gen-avatars.mjs 3          # regenerate just #3
 *
 * Reads OPENAI_API_KEY from the repo .env. Tries gpt-image-1 (supports
 * transparency); falls back to dall-e-3 (opaque → clipped full-bleed).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
const KEY = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) {
  console.error('OPENAI_API_KEY missing in .env');
  process.exit(1);
}

const OUT = path.join(root, 'apps/web/public/avatars');

const STYLE =
  'Cute stylized 3D render mascot character, Pixar-toy style, smooth glossy surfaces, ' +
  'big friendly eyes, athletic build, vibrant sporty outfit, soft studio lighting, ' +
  'centered full body, no text, no watermark';

const CHARACTERS = [
  ['young man lifting a barbell overhead, orange tank top', '#f97316,#db2777'],
  ['young woman lifting a pink dumbbell, ponytail, purple sportswear', '#ec4899,#8b5cf6'],
  ['young man meditating in lotus yoga pose, calm smile, green outfit', '#10b981,#0d9488'],
  ['young woman in lotus yoga pose with hijab-free ponytail, teal outfit', '#14b8a6,#0ea5e9'],
  ['young man running mid-stride, blue running gear and sneakers', '#3b82f6,#6366f1'],
  ['young woman running mid-stride, violet leggings and top', '#8b5cf6,#d946ef'],
  ['young man riding a bicycle with helmet, amber jersey', '#f59e0b,#ef4444'],
  ['young woman riding a bicycle with helmet, cyan jersey', '#06b6d4,#3b82f6'],
  ['young man boxing with red gloves, focused grin', '#ef4444,#b91c1c'],
  ['young woman boxing with pink gloves, confident smile', '#f97316,#f59e0b'],
  ['young man dribbling a basketball, magenta jersey', '#d946ef,#ec4899'],
  ['young woman jumping joyfully with a skipping rope, yellow outfit', '#eab308,#f97316'],
  // Second wave: more sports, more representation (football is Egypt's game;
  // hijabi athletes so more of the audience sees themselves).
  ['young man kicking a football soccer ball, red and white kit', '#ef4444,#f97316'],
  ['young woman footballer dribbling a soccer ball, green kit', '#22c55e,#0d9488'],
  ['young man swimming with goggles, splashing water, blue', '#0ea5e9,#2563eb'],
  ['young woman in a karate gi mid high-kick, orange belt', '#f97316,#dc2626'],
  ['young hijabi woman running mid-stride, modest purple sportswear with hijab', '#8b5cf6,#6366f1'],
  ['young hijabi woman lifting a dumbbell, modest teal sportswear with hijab', '#14b8a6,#0891b2'],
  ['young man doing a plank exercise, focused, grey and lime outfit', '#84cc16,#16a34a'],
  ['young woman dancing zumba joyfully, colorful outfit', '#ec4899,#f43f5e'],
  ['young man hiking with a backpack and walking stick, khaki outfit', '#a16207,#ca8a04'],
  ['young woman doing a stretching pose on a mat, calm, mint outfit', '#34d399,#14b8a6'],
  ['young man walking fast with headphones on, casual sporty navy look', '#3b82f6,#1d4ed8'],
  ['young woman celebrating with both arms raised holding a small trophy, gold outfit', '#f59e0b,#eab308'],
];

async function generate(prompt) {
  // gpt-image-1 first: real transparency, best quality for stylized 3D.
  let r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'medium', background: 'transparent' }),
  });
  if (r.ok) {
    const j = await r.json();
    return { b64: j.data[0].b64_json, transparent: true };
  }
  const errText = (await r.text()).slice(0, 200);
  console.warn(`  gpt-image-1 unavailable (${r.status}) — trying dall-e-3. ${errText}`);
  r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt: prompt + ', plain solid pastel background', size: '1024x1024', response_format: 'b64_json' }),
  });
  if (!r.ok) throw new Error(`dall-e-3 failed too: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return { b64: j.data[0].b64_json, transparent: false };
}

function wrap(b64, grad, transparent) {
  const [c1, c2] = grad.split(',');
  // Transparent sprite floats on the gradient disc; opaque images fill the
  // whole disc through a circular clip instead.
  const image = transparent
    ? `<circle cx="60" cy="60" r="46" fill="rgba(255,255,255,0.16)"/><image x="14" y="12" width="92" height="92" xlink:href="data:image/png;base64,${b64}"/>`
    : `<clipPath id="c"><circle cx="60" cy="60" r="58"/></clipPath><image x="2" y="2" width="116" height="116" clip-path="url(#c)" xlink:href="data:image/png;base64,${b64}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 120 120">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="120" height="120" rx="60" fill="url(#g)"/>${image}</svg>`
  );
}

const only = process.argv[2] ? Number(process.argv[2]) : null;
for (let i = 0; i < CHARACTERS.length; i++) {
  const n = i + 1;
  if (only && n !== only) continue;
  const [desc, grad] = CHARACTERS[i];
  console.log(`[${n}/12] ${desc.split(',')[0]} …`);
  try {
    const { b64, transparent } = await generate(`${STYLE}. Character: ${desc}.`);
    fs.writeFileSync(path.join(OUT, `a${n}.svg`), wrap(b64, grad, transparent));
    console.log(`  saved a${n}.svg`);
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
  }
}
console.log('done.');
