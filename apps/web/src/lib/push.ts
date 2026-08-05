import { api } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'subscribed' | 'default';

export async function getPushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'unsupported';
  const { key } = await api.get('/api/push/key').catch(() => ({ key: null }));
  if (!key) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return 'unavailable'; // SW not active (e.g. dev mode)
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'subscribed' : 'default';
}

export async function enablePush(): Promise<boolean> {
  const { key } = await api.get('/api/push/key');
  if (!key) throw new Error('Push is not configured on the server.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  const json = sub.toJSON();
  await api.post('/api/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
  return true;
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await api.post('/api/push/unsubscribe', { endpoint });
}
