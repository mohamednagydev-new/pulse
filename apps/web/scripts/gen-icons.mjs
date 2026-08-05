/**
 * Generates the PULSE app icons (no image libraries required — raw PNG encoding).
 * Design: orange brand gradient + a white heartbeat/pulse waveform (the app's name,
 * literally drawn). Rendered at 4× and downsampled for clean anti-aliasing.
 *
 * Run:  node apps/web/scripts/gen-icons.mjs
 * Writes into apps/web/public/.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const SS = 4; // supersample factor

// ---------- brand ----------
const C1 = [0xfb, 0x92, 0x3c]; // #FB923C
const C2 = [0xea, 0x58, 0x0c]; // #EA580C
const C3 = [0xc2, 0x41, 0x0c]; // #C2410C (deep corner)

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/** Distance from point to a line segment. */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy || 1;
  let t = (wx * vx + wy * vy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

/** Signed distance to a rounded rectangle (negative inside). */
function roundRectDist(px, py, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  const d = Math.hypot(px - cx, py - cy) - r;
  const inside = px >= x0 && px <= x1 && py >= y0 && py <= y1;
  return inside && px > x0 + r === false && false ? d : d;
}

/**
 * Heartbeat polyline in a 0..1 unit box (x, y with y down).
 * Flat → small dip → tall spike → deep valley → recover → flat.
 */
const PULSE_PTS = [
  [0.06, 0.50],
  [0.26, 0.50],
  [0.33, 0.40],
  [0.42, 0.68],
  [0.52, 0.16],
  [0.62, 0.80],
  [0.70, 0.50],
  [0.94, 0.50],
];

function renderIcon(size, { rounded = true, padding = 0 } = {}) {
  const S = size * SS;
  const buf = new Float32Array(S * S * 4);

  const radius = rounded ? S * 0.225 : 0;
  const inset = 0; // full bleed background

  // Waveform geometry (inside the safe padding area)
  const pad = padding * S;
  const boxX = pad, boxY = pad, boxW = S - pad * 2, boxH = S - pad * 2;
  const pts = PULSE_PTS.map(([x, y]) => [boxX + x * boxW, boxY + y * boxH]);
  const stroke = boxW * 0.075; // line half-width comes from this

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const px = x + 0.5, py = y + 0.5;

      // --- background shape mask (rounded square) ---
      let bgA = 1;
      if (rounded) {
        const d = roundRectDist(px, py, inset, inset, S - inset, S - inset, radius);
        bgA = 1 - smooth(-1.5, 1.5, d);
      }
      if (bgA <= 0) continue;

      // --- gradient: diagonal C1 → C2, deepening toward bottom-right ---
      const t = clamp01((px / S) * 0.5 + (py / S) * 0.5);
      const t2 = clamp01(((px + py) / (2 * S) - 0.55) / 0.45);
      let r = lerp(C1[0], C2[0], t), g = lerp(C1[1], C2[1], t), b = lerp(C1[2], C2[2], t);
      r = lerp(r, C3[0], t2 * 0.7); g = lerp(g, C3[1], t2 * 0.7); b = lerp(b, C3[2], t2 * 0.7);

      // soft highlight top-left for depth
      const hl = 1 - clamp01(Math.hypot(px - S * 0.28, py - S * 0.24) / (S * 0.62));
      r = lerp(r, 255, hl * 0.14); g = lerp(g, 255, hl * 0.14); b = lerp(b, 255, hl * 0.14);

      // --- pulse waveform (white, round joins) ---
      let dMin = Infinity;
      for (let k = 0; k < pts.length - 1; k++) {
        const d = segDist(px, py, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
        if (d < dMin) dMin = d;
      }
      // subtle glow under the line, then the crisp stroke
      const glow = 1 - smooth(stroke * 0.5, stroke * 2.6, dMin);
      r = lerp(r, 255, glow * 0.16); g = lerp(g, 255, glow * 0.16); b = lerp(b, 255, glow * 0.16);
      const line = 1 - smooth(stroke * 0.5 - 1.2, stroke * 0.5 + 1.2, dMin);
      r = lerp(r, 255, line); g = lerp(g, 255, line); b = lerp(b, 255, line);

      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = bgA * 255;
    }
  }

  // --- downsample (box filter) ---
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = (((y * SS + sy) * S) + (x * SS + sx)) * 4;
          const al = buf[i + 3] / 255;
          r += buf[i] * al; g += buf[i + 1] * al; b += buf[i + 2] * al; a += al;
        }
      }
      const n = SS * SS;
      const o = (y * size + x) * 4;
      const aa = a / n;
      out[o] = aa > 0 ? Math.round(r / a) : 0;
      out[o + 1] = aa > 0 ? Math.round(g / a) : 0;
      out[o + 2] = aa > 0 ? Math.round(b / a) : 0;
      out[o + 3] = Math.round(aa * 255);
    }
  }
  return out;
}

// ---------- minimal PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** rgba: Buffer of w*h*4. opaque=true writes RGB (no alpha channel) — required for iOS. */
function encodePNG(w, h, rgba, opaque = false) {
  const ch = opaque ? 3 : 4;
  const raw = Buffer.alloc(h * (1 + w * ch));
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (opaque) {
        // composite onto the brand orange so there is never a black fringe
        const a = rgba[i + 3] / 255;
        raw[p++] = Math.round(rgba[i] * a + C2[0] * (1 - a));
        raw[p++] = Math.round(rgba[i + 1] * a + C2[1] * (1 - a));
        raw[p++] = Math.round(rgba[i + 2] * a + C2[2] * (1 - a));
      } else {
        raw[p++] = rgba[i]; raw[p++] = rgba[i + 1]; raw[p++] = rgba[i + 2]; raw[p++] = rgba[i + 3];
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;                 // bit depth
  ihdr[9] = opaque ? 2 : 6;    // color type: RGB | RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- outputs ----------
const jobs = [
  // Manifest icons — rounded with transparent corners.
  { file: 'pwa-192.png', size: 192, opts: { rounded: true, padding: 0.16 }, opaque: false },
  { file: 'pwa-512.png', size: 512, opts: { rounded: true, padding: 0.16 }, opaque: false },
  // Maskable — full bleed, content inside the safe zone (launchers crop the edges).
  { file: 'pwa-maskable-512.png', size: 512, opts: { rounded: false, padding: 0.26 }, opaque: true },
  // iOS home screen — must be an opaque square (iOS applies its own mask).
  { file: 'apple-touch-icon.png', size: 180, opts: { rounded: false, padding: 0.18 }, opaque: true },
];

for (const j of jobs) {
  const rgba = renderIcon(j.size, j.opts);
  const png = encodePNG(j.size, j.size, rgba, j.opaque);
  writeFileSync(join(OUT, j.file), png);
  console.log(`✓ ${j.file}  ${j.size}×${j.size}  ${(png.length / 1024).toFixed(1)} KB  ${j.opaque ? 'opaque' : 'alpha'}`);
}

// Matching favicon (vector) — replaces the old pink "FI" mark.
const d = PULSE_PTS.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * 64).toFixed(1)} ${(y * 64).toFixed(1)}`).join(' ');
writeFileSync(
  join(OUT, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FB923C"/><stop offset="1" stop-color="#C2410C"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="${d}" fill="none" stroke="#fff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
);
console.log('✓ favicon.svg (PULSE mark)');
