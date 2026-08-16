import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import HumanMove, { patternFor } from './HumanMove';

/**
 * What an exercise looks like.
 *
 * Every exercise with a video gets the honest visual: a frame from it. YouTube
 * serves those from its own CDN, which is the same link-don't-copy arrangement
 * as the embed — no file is stored here.
 *
 * Everything else gets HumanMove: a jointed person performing the movement with
 * the working muscles filled in — the fallback for anything without a video and
 * for when the image can't load (offline, blocked, or the video was pulled).
 */

/** Video id from a watch URL, youtu.be link, Shorts link or embed URL. */
function youTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

export function exercisePoster(videoUrl?: string | null): string | null {
  const id = youTubeId(videoUrl);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export default function ExerciseVisual({
  name,
  videoUrl,
  className = '',
  animClassName = '',
  showPlayHint = false,
}: {
  name?: string;
  videoUrl?: string | null;
  className?: string;
  /** Size of the fallback animation. */
  animClassName?: string;
  showPlayHint?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const poster = exercisePoster(videoUrl);

  if (poster && !failed) {
    return (
      <span className={`relative block overflow-hidden ${className}`}>
        <img
          src={poster}
          alt={name ?? ''}
          loading="lazy"
          // hqdefault is letterboxed 4:3; scaling up and cropping gives a clean fill.
          className="h-full w-full scale-[1.35] object-cover"
          onError={() => setFailed(true)}
        />
        {showPlayHint && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircle size={26} className="text-white/90 drop-shadow" />
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`flex items-center justify-center ${className}`}>
      <HumanMove pattern={patternFor(name)} className={animClassName || 'h-full w-full'} />
    </span>
  );
}
