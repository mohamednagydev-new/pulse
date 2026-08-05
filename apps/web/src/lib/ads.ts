import { api } from './api';

/** Fire-and-forget ad metrics. */
export function trackAd(id: string, type: 'impression' | 'click') {
  api.post(`/api/banners/${id}/${type}`).catch(() => {});
}
