/** Soft blurred color-blob backdrop for light screens — the "pro max" ambient
 *  depth treatment. Absolutely positioned behind content; pointer-transparent.
 *  Tones: warm (orange-led), cool (blue/teal), green (wellness). */
export default function AmbientBg({ tone = 'warm' }: { tone?: 'warm' | 'cool' | 'green' }) {
  // Half the old alphas, and blobs live INSIDE the viewport: hugging the screen
  // edges meant the blur got clipped by overflow-hidden into hard-edged grey
  // smudges down both sides — "cloudy shadows", not ambience.
  const blobs =
    tone === 'cool'
      ? ['rgba(37,99,235,0.08)', 'rgba(13,148,136,0.06)']
      : tone === 'green'
        ? ['rgba(16,163,74,0.08)', 'rgba(13,148,136,0.06)']
        : ['rgba(249,115,22,0.08)', 'rgba(37,99,235,0.05)'];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <span
        className="absolute start-1/4 top-8 h-72 w-72 rounded-full"
        style={{ background: blobs[0], filter: 'blur(90px)' }}
      />
      <span
        className="absolute end-1/4 top-[420px] h-80 w-80 rounded-full"
        style={{ background: blobs[1], filter: 'blur(100px)' }}
      />
    </div>
  );
}
