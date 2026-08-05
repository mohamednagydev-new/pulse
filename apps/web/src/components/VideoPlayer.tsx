import { useSignedMedia } from '../lib/media';
import { MediaImage } from './ui';

/**
 * Plays a self-hosted, range-streamed video via /media/video/:id.
 *
 * With no video it never fakes one. It falls back to the poster image, and with
 * no poster either it renders nothing so the caller's section collapses — a play
 * button that cannot play is worse than no player at all.
 */
export default function VideoPlayer({
  videoId,
  poster,
  label,
  className = '',
}: {
  videoId?: string | null;
  poster?: string | null;
  /** Alt text for the poster fallback. */
  label?: string;
  className?: string;
}) {
  const src = useSignedMedia('video', videoId);

  if (videoId) {
    return (
      <video
        controls
        playsInline
        poster={poster ?? undefined}
        className={`aspect-video w-full rounded-2xl bg-black ${className}`}
        src={src}
      />
    );
  }

  if (poster) {
    return <MediaImage path={poster} label={label} className={`aspect-video w-full rounded-2xl ${className}`} />;
  }

  return null;
}
