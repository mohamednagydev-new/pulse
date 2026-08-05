import { toast } from './toast';

interface CardOpts {
  title: string;
  subtitle: string;
  emoji: string;
  footer?: string;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line + w + ' ';
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, yy);
      line = w + ' ';
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, yy);
}

async function renderCard(opts: CardOpts): Promise<Blob | null> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#E01E8B');
  g.addColorStop(1, '#6d28d9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = 'italic 800 86px Poppins, Arial, sans-serif';
  ctx.fillText('PULSE', size / 2, 190);

  ctx.font = '260px Arial';
  ctx.fillText(opts.emoji, size / 2, size / 2 + 40);

  ctx.fillStyle = '#fff';
  ctx.font = '800 92px Poppins, Arial, sans-serif';
  wrapText(ctx, opts.title, size / 2, size / 2 + 230, size - 160, 104);

  ctx.font = '500 54px Poppins, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(opts.subtitle, size / 2, size / 2 + 380);

  ctx.font = '500 40px Poppins, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(opts.footer ?? 'A Fresh Start To Get Healthy', size / 2, size - 80);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Render an achievement card to PNG and share (or download as fallback). */
export async function shareImageCard(opts: CardOpts): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await renderCard(opts);
  if (!blob) return 'failed';
  const file = new File([blob], 'fitit-achievement.png', { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: opts.title, text: `${opts.title} — PULSE` });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fitit-achievement.png';
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

// ─── Milestone cards (1080×1350 branded share images) ────────────────────────

const FONTS = "'Sora','Tajawal',system-ui,sans-serif";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Pick the largest font size ≤ max that fits `text` within maxWidth. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, max: number, min: number, maxWidth: number): number {
  let size = max;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${FONTS}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 6;
  }
  return size;
}

export interface MilestoneOpts {
  kind: 'pr' | 'workout' | 'streak' | 'badge';
  title: string;
  value: string;
  subtitle?: string;
  userName?: string;
  emoji?: string;
  /** Localized toast shown after the download fallback (callers pass t('share.saved')). */
  savedMsg?: string;
}

function renderMilestone(opts: MilestoneOpts): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  // Layered dark gradient background (fitness-hero style)
  ctx.fillStyle = '#14100c';
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.2, H * 0.18, 720, '249,115,22', 0.35); // orange, top-left
  glow(ctx, W * 0.85, H * 0.12, 520, '37,99,235', 0.18); // blue accent
  glow(ctx, W * 0.78, H * 0.9, 560, '22,163,74', 0.14); // green accent

  // Rounded border glow accent
  ctx.save();
  ctx.shadowColor = 'rgba(249,115,22,0.55)';
  ctx.shadowBlur = 44;
  ctx.strokeStyle = 'rgba(249,115,22,0.6)';
  ctx.lineWidth = 6;
  roundedRect(ctx, 40, 40, W - 80, H - 80, 56);
  ctx.stroke();
  ctx.restore();

  const cx = W / 2;
  const safe = W - 200; // safe text width
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Small user line at top — name only (no possessive) so it reads naturally
  // in any language; the kind label comes from the caller-provided title.
  if (opts.userName) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `600 40px ${FONTS}`;
    ctx.fillText(opts.userName, cx, 170);
  }

  // Emoji
  if (opts.emoji) {
    ctx.font = `180px ${FONTS}`;
    ctx.fillText(opts.emoji, cx, 470);
  }

  // Huge value — shrink to fit
  const valueSize = fitFont(ctx, opts.value, '800', 140, 64, safe);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${valueSize}px ${FONTS}`;
  ctx.fillText(opts.value, cx, 690);

  // Title
  const titleSize = fitFont(ctx, opts.title, '700', 64, 40, safe);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 ${titleSize}px ${FONTS}`;
  ctx.fillText(opts.title, cx, 810);

  // Subtitle
  if (opts.subtitle) {
    const subSize = fitFont(ctx, opts.subtitle, '500', 44, 30, safe);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `500 ${subSize}px ${FONTS}`;
    ctx.fillText(opts.subtitle, cx, 880);
  }

  // Footer wordmark
  ctx.fillStyle = '#f97316';
  ctx.font = `italic 800 72px ${FONTS}`;
  ctx.fillText('PULSE', cx, H - 170);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `500 34px ${FONTS}`;
  ctx.fillText('pulse.geddo.online', cx, H - 105);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Render a branded milestone card and share it (or download as fallback). Never throws. */
export async function shareMilestone(opts: MilestoneOpts): Promise<void> {
  try {
    await document.fonts.ready;
    const blob = await renderMilestone(opts);
    if (!blob) return;
    const file = new File([blob], 'pulse-milestone.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: opts.title, text: `${opts.title} — PULSE` });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pulse-milestone.png';
    a.click();
    URL.revokeObjectURL(url);
    toast(opts.savedMsg ?? 'Image saved — share it anywhere!', 'success');
  } catch {
    // AbortError = user cancelled the share sheet; anything else is
    // best-effort — never break the celebration flow.
  }
}
