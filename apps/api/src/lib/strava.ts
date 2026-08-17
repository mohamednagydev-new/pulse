import { prisma } from './prisma';
import { awardXp, createFeedPost, bumpChallenges } from './social';
import { bumpWalkChallenges } from './walks';
import { touchStreak } from './gamify';
import { dayString, startOfDayTz } from './time';

/**
 * Strava — the aggregator hub for wearables (Garmin/Amazfit/Samsung/Huawei/
 * Polar and Zepp-synced Xiaomi bands can all auto-push to it). Env-gated like
 * every other integration: no keys → /api/wearables/status says disabled and
 * the client hides the section.
 *
 * Guardrails (see WEARABLES.md): only aggregates are stored, imports credit XP
 * at most CREDIT_CAP_PER_DAY times a day, and only recent activities credit at
 * all — old bulk history counts for the record, not the leaderboard.
 */

const XP_PER_IMPORT = 40;
const CREDIT_CAP_PER_DAY = 2;
const CREDIT_WINDOW_DAYS = 3;

export function stravaEnabled() {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export function stravaAuthorizeUrl(state: string, redirectUri: string) {
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id', process.env.STRAVA_CLIENT_ID!);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope', 'activity:read');
  url.searchParams.set('state', state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete?: { id: number };
};

export async function stravaExchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`strava token exchange failed: ${res.status}`);
  return res.json() as Promise<TokenResponse>;
}

/** Returns a fresh access token, refreshing (and persisting) when close to expiry. */
export async function freshToken(connId: string): Promise<string> {
  const conn = await prisma.deviceConnection.findUnique({ where: { id: connId } });
  if (!conn) throw new Error('connection gone');
  if (conn.expiresAt.getTime() - Date.now() > 5 * 60_000) return conn.accessToken;

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: conn.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`strava refresh failed: ${res.status}`);
  const tok = (await res.json()) as TokenResponse;
  await prisma.deviceConnection.update({
    where: { id: conn.id },
    data: { accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresAt: new Date(tok.expires_at * 1000) },
  });
  return tok.access_token;
}

type StravaActivity = {
  id: number;
  name?: string;
  type?: string;
  sport_type?: string;
  start_date?: string;
  moving_time?: number;
  elapsed_time?: number;
  distance?: number;
  calories?: number;
  average_heartrate?: number;
};

export async function fetchRecentActivities(connId: string, days = 7): Promise<StravaActivity[]> {
  const token = await freshToken(connId);
  const after = Math.floor((Date.now() - days * 86_400_000) / 1000);
  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`strava activities failed: ${res.status}`);
  return res.json() as Promise<StravaActivity[]>;
}

export async function fetchActivity(connId: string, activityId: string): Promise<StravaActivity> {
  const token = await freshToken(connId);
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`strava activity failed: ${res.status}`);
  return res.json() as Promise<StravaActivity>;
}

/** Import one activity: store aggregates, dedupe by external id, and credit
 *  XP/streak within the caps. Returns whether it was new. */
export async function importActivity(userId: string, a: StravaActivity): Promise<boolean> {
  const externalId = String(a.id);
  const startedAt = a.start_date ? new Date(a.start_date) : new Date();
  const durationSec = a.moving_time ?? a.elapsed_time ?? 0;
  if (durationSec < 300) return false; // under 5 minutes: not a workout

  const existing = await prisma.importedActivity.findUnique({
    where: { provider_externalId: { provider: 'strava', externalId } },
  });
  if (existing) return false;

  // Credit rules: recent activities only, and at most N credited per day.
  const recent = Date.now() - startedAt.getTime() < CREDIT_WINDOW_DAYS * 86_400_000;
  const creditedToday = await prisma.importedActivity.count({
    where: { userId, credited: true, createdAt: { gte: startOfDayTz(dayString()) } },
  });
  const credit = recent && creditedToday < CREDIT_CAP_PER_DAY;

  await prisma.importedActivity.create({
    data: {
      userId,
      provider: 'strava',
      externalId,
      type: a.sport_type ?? a.type ?? 'Workout',
      name: a.name,
      startedAt,
      durationSec,
      distanceM: a.distance ?? null,
      calories: a.calories ?? null,
      avgHr: a.average_heartrate ?? null,
      credited: credit,
    },
  });

  if (credit) {
    await touchStreak(userId);
    await awardXp(userId, XP_PER_IMPORT, 'wearable_import').catch(() => {});
    await bumpChallenges(userId, 'workout').catch(() => {});
    // Walk-type imports also advance 'walk' challenges — a wearable walk counts
    // the same as a manually-logged one.
    if (/walk|hike/i.test(a.sport_type ?? a.type ?? '')) {
      await bumpWalkChallenges(userId).catch(() => {});
    }
    const km = a.distance ? ` · ${(a.distance / 1000).toFixed(1)}km` : '';
    const mins = Math.round(durationSec / 60);
    await createFeedPost(userId, 'completion', `⌚ ${a.sport_type ?? a.type ?? 'Workout'} — ${mins} min${km}`, undefined, undefined, {
      textAr: `⌚ ${a.sport_type ?? a.type ?? 'نشاط'} — ${mins} دقيقة${km}`,
    }).catch(() => {});
  }
  return true;
}
