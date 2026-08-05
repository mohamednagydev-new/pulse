import { useEffect, useState } from 'react';
import { api } from './api';

/** Fetch a short-lived signed URL for protected video/audio. */
export async function signedMediaUrl(type: 'video' | 'audio', id: string): Promise<string> {
  const { url } = await api.get(`/api/me/media-sign?type=${type}&id=${encodeURIComponent(id)}`);
  return url as string;
}

export function useSignedMedia(type: 'video' | 'audio', id?: string | null): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let ok = true;
    if (!id) {
      setUrl(undefined);
      return;
    }
    signedMediaUrl(type, id).then((u) => ok && setUrl(u)).catch(() => ok && setUrl(undefined));
    return () => {
      ok = false;
    };
  }, [type, id]);
  return url;
}
