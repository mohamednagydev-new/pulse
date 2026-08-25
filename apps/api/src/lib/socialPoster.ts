import fs from 'fs';
import path from 'path';
import { env } from '../env';
import { prisma } from './prisma';
import { openai } from './openai';

/**
 * The auto-poster: publishes the daily posting plan to the platforms whose
 * official APIs allow it (per MARKETING-RESEARCH-2026.md):
 *   Facebook Page  — Graph API, FB_PAGE_ID + FB_PAGE_TOKEN (already used by the league poster)
 *   Instagram      — Graph API, same token WHEN it carries instagram_content_publish
 *   Telegram       — Bot API, TELEGRAM_BOT_TOKEN + TELEGRAM_CHANNEL
 * Groups & WhatsApp stay human — no API exists that doesn't risk the account.
 *
 * Master switch: AUTO_POST_SOCIAL=off disables the daily job entirely (manual
 * Publish-now in the dashboard still works).
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

type PlanItem = { platform: string; text: string };

export function socialConfigured(): { facebook: boolean; telegram: boolean; instagram: boolean } {
  return {
    facebook: Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL),
    instagram: Boolean(igToken()),
  };
}

// ---- Instagram (API with Instagram Login) ----------------------------------
// Tokens last 60 days and refresh to a NEW value, so the live token persists
// in a file (env is only the seed); the weekly ig-refresh job keeps it alive.
const IG_TOKEN_FILE = path.join(env.UPLOAD_DIR, 'ig-token.json');

export function igToken(): string | null {
  try {
    const j = JSON.parse(fs.readFileSync(IG_TOKEN_FILE, 'utf8'));
    if (typeof j.token === 'string' && j.token) return j.token;
  } catch { /* no file yet — fall back to the env seed */ }
  return process.env.IG_ACCESS_TOKEN || null;
}

function saveIgToken(token: string) {
  try { fs.writeFileSync(IG_TOKEN_FILE, JSON.stringify({ token, savedAt: new Date().toISOString() })); } catch { /* keep env */ }
}

/** Weekly: extend the IG token's 60-day life (refresh needs it >=24h old). */
export async function refreshIgToken(): Promise<string> {
  const tok = igToken();
  if (!tok) return 'skipped — no IG token configured';
  const r: any = await (
    await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${tok}`)
  ).json();
  if (r.error) return `refresh failed: ${r.error.message ?? 'unknown'} (token still valid until its original expiry)`;
  saveIgToken(r.access_token);
  return `refreshed — valid ${Math.round((r.expires_in ?? 0) / 86400)} more days`;
}

export async function postToFacebook(text: string, videoUrl?: string | null): Promise<string> {
  const id = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  if (!id || !token) throw new Error('FB_PAGE_ID/FB_PAGE_TOKEN not configured');
  // With a reel attached, publish a VIDEO post (text becomes the caption) —
  // a text-only feed post wastes the asset. Graph fetches the video itself
  // from the public signed URL. Any video failure degrades to the text post.
  if (videoUrl) {
    try {
      const res = await fetch(`${GRAPH}/${id}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: text, file_url: videoUrl, access_token: token }),
      });
      const j: any = await res.json();
      if (res.ok && !j.error) return `fb:video:${j.id}`;
      console.warn('[social] fb video post failed, falling back to text:', j.error?.message ?? res.status);
    } catch (e: any) {
      console.warn('[social] fb video post failed, falling back to text:', e?.message);
    }
  }
  const res = await fetch(`${GRAPH}/${id}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, access_token: token }),
  });
  const j: any = await res.json();
  if (!res.ok || j.error) throw new Error(`facebook: ${j.error?.message ?? res.status}`);
  return `fb:${j.id}`;
}

/** IG needs a PUBLIC media URL; we publish the reel via its signed asset URL.
 *  Preferred path: Instagram-Login token (graph.instagram.com, no Page link
 *  needed). Fallback: the classic FB-Page-linked flow. */
export async function postToInstagram(caption: string, videoUrl: string | null): Promise<string> {
  const ig = igToken();
  if (ig) {
    if (!videoUrl) throw new Error('instagram: reels need a video asset');
    const me: any = await (await fetch(`https://graph.instagram.com/v21.0/me?fields=id&access_token=${ig}`)).json();
    if (me.error) throw new Error(`instagram: ${me.error.message}`);
    const container: any = await (
      await fetch(`https://graph.instagram.com/v21.0/${me.id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption, access_token: ig }),
      })
    ).json();
    if (container.error) throw new Error(`instagram: ${container.error.message}`);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      const st: any = await (
        await fetch(`https://graph.instagram.com/v21.0/${container.id}?fields=status_code&access_token=${ig}`)
      ).json();
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error('instagram: media processing failed');
    }
    const pub: any = await (
      await fetch(`https://graph.instagram.com/v21.0/${me.id}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token: ig }),
      })
    ).json();
    if (pub.error) throw new Error(`instagram publish: ${pub.error.message}`);
    return `ig:${pub.id}`;
  }
  const token = process.env.FB_PAGE_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token || !pageId) throw new Error('FB token not configured');
  const acc: any = await (await fetch(`${GRAPH}/${pageId}?fields=instagram_business_account&access_token=${token}`)).json();
  const igId = acc?.instagram_business_account?.id;
  if (!igId) throw new Error('instagram: no linked IG business account (or token lacks instagram scopes)');
  if (!videoUrl) throw new Error('instagram: reels need a video asset');
  const container: any = await (
    await fetch(`${GRAPH}/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption, access_token: token }),
    })
  ).json();
  if (container.error) throw new Error(`instagram: ${container.error.message}`);
  // Video containers process async — poll briefly, then publish.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 6000));
    const st: any = await (await fetch(`${GRAPH}/${container.id}?fields=status_code&access_token=${token}`)).json();
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('instagram: media processing failed');
  }
  const pub: any = await (
    await fetch(`${GRAPH}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    })
  ).json();
  if (pub.error) throw new Error(`instagram publish: ${pub.error.message}`);
  return `ig:${pub.id}`;
}

export async function postToTelegram(text: string, videoPath?: string | null): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channel = process.env.TELEGRAM_CHANNEL;
  if (!token || !channel) throw new Error('TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL not configured');
  const base = `https://api.telegram.org/bot${token}`;
  // Telegram bots can upload files directly (≤50MB) — no public URL needed.
  if (videoPath && fs.existsSync(videoPath) && fs.statSync(videoPath).size < 49 * 1024 * 1024) {
    const form = new FormData();
    form.append('chat_id', channel);
    form.append('caption', text.slice(0, 1024));
    form.append('video', new Blob([fs.readFileSync(videoPath)]), 'reel.mp4');
    const res = await fetch(`${base}/sendVideo`, { method: 'POST', body: form });
    const j: any = await res.json();
    if (!j.ok) throw new Error(`telegram video: ${j.description}`);
    return `tg:${j.result.message_id}`;
  }
  const res = await fetch(`${base}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: channel, text }),
  });
  const j: any = await res.json();
  if (!j.ok) throw new Error(`telegram: ${j.description}`);
  return `tg:${j.result.message_id}`;
}

/** Publish a generated plan: FB text, Telegram text+reel, IG reel (when able). */
export async function publishPlan(
  items: PlanItem[],
  asset: { id: string; filePath: string; fileUrl?: string } | null,
  origin: string,
): Promise<string> {
  const results: string[] = [];
  const byPlatform = new Map(items.map((i) => [i.platform, i.text]));

  const mediaUrl = asset?.fileUrl ? `${origin}${asset.fileUrl}` : null;
  const fb = byPlatform.get('facebook');
  if (fb) {
    try { results.push(await postToFacebook(fb, mediaUrl)); } catch (e: any) { results.push(`fb:FAIL ${e.message?.slice(0, 60)}`); }
  }
  const tg = byPlatform.get('whatsapp-channel') ?? byPlatform.get('facebook');
  if (tg && process.env.TELEGRAM_BOT_TOKEN) {
    try { results.push(await postToTelegram(tg, asset?.filePath)); } catch (e: any) { results.push(`tg:FAIL ${e.message?.slice(0, 60)}`); }
  }
  const ig = byPlatform.get('instagram');
  if (ig && asset?.fileUrl) {
    try { results.push(await postToInstagram(ig, `${origin}${asset.fileUrl}`)); } catch (e: any) { results.push(`ig:FAIL ${e.message?.slice(0, 60)}`); }
  }
  return results.join(' · ') || 'nothing configured';
}

/** The daily job: generate today's plan (reusing the growth generator) and publish. */
export async function runDailySocialPost(): Promise<string> {
  if ((process.env.AUTO_POST_SOCIAL ?? 'on') === 'off') return 'skipped — AUTO_POST_SOCIAL=off';
  const conf = socialConfigured();
  if (!conf.facebook && !conf.telegram) return 'skipped — no platform tokens configured';
  if (!openai) return 'skipped — OPENAI_API_KEY missing (plan generation needs it)';
  const { generatePostingPlan } = await import('./growth');
  const plan = await generatePostingPlan();
  const origin = process.env.WEB_ORIGIN?.replace(/\/$/, '') ?? '';
  const summary = await publishPlan(plan.items, plan.asset, origin);
  if (plan.asset) {
    await prisma.marketingAsset.update({
      where: { id: plan.asset.id },
      data: { usedCount: { increment: 0 } }, // already incremented by the generator
    }).catch(() => {});
  }
  return summary;
}
