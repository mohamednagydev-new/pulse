import { api } from './api';

/** Fire-and-forget ad metrics. */
export function trackAd(id: string, type: 'impression' | 'click') {
  api.post(`/api/banners/${id}/${type}`).catch(() => {});
}

/** One sponsor per screen, rotating daily. Every active banner in the section
 *  gets whole days in the slot (fair share, stable within a day — no flicker
 *  between visits), instead of banner[0] hogging it forever. */
export function pickAd<T>(list: T[] | undefined): T | undefined {
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  return list[dayNumber % list.length];
}
