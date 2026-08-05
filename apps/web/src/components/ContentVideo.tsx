import VideoPlayer from './VideoPlayer';

/** Accepts a watch URL, a youtu.be short link, a Shorts link or an embed URL. */
function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

/**
 * The one video renderer for content screens. Resolution order:
 *   1. `videoId`  — self-hosted, range-streamed via /media/video/:id
 *   2. `videoUrl` — YouTube/Shorts embed, or a direct MP4
 *   3. `poster`   — the still image, when there is no video at all
 *   4. nothing    — so the caller's section collapses instead of showing a dead frame
 *
 * `videoId` wins when both are set, so a lesson can start as a YouTube link and be
 * replaced by your own upload later without touching the link.
 */
export default function ContentVideo({
  videoId,
  videoUrl,
  poster,
  label,
  className = '',
}: {
  videoId?: string | null;
  videoUrl?: string | null;
  poster?: string | null;
  /** Alt text for the poster fallback. */
  label?: string;
  className?: string;
}) {
  if (videoId) {
    return (
      <div className={className}>
        <VideoPlayer videoId={videoId} poster={poster} label={label} />
      </div>
    );
  }

  if (videoUrl) {
    const yt = youTubeId(videoUrl);
    if (yt) {
      return (
        <div className={`overflow-hidden rounded-2xl bg-black ${className}`}>
          <iframe
            src={`https://www.youtube.com/embed/${yt}?playsinline=1&rel=0&modestbranding=1`}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            title={label ?? 'Video'}
          />
        </div>
      );
    }
    return (
      <video
        controls
        playsInline
        poster={poster ?? undefined}
        src={videoUrl}
        className={`aspect-video w-full rounded-2xl bg-black ${className}`}
      />
    );
  }

  // No video — VideoPlayer renders the poster, or nothing when there isn't one.
  return <VideoPlayer poster={poster} label={label} className={className} />;
}
