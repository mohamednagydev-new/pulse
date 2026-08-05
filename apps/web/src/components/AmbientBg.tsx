/** Soft blurred color-blob backdrop for light screens — the "pro max" ambient
 *  depth treatment. Absolutely positioned behind content; pointer-transparent.
 *  Tones: warm (orange-led), cool (blue/teal), green (wellness). */
export default function AmbientBg({ tone = 'warm' }: { tone?: 'warm' | 'cool' | 'green' }) {
  const blobs =
    tone === 'cool'
      ? ['rgba(37,99,235,0.16)', 'rgba(13,148,136,0.13)', 'rgba(249,115,22,0.08)']
      : tone === 'green'
        ? ['rgba(16,163,74,0.15)', 'rgba(13,148,136,0.12)', 'rgba(249,115,22,0.08)']
        : ['rgba(249,115,22,0.16)', 'rgba(37,99,235,0.10)', 'rgba(225,29,72,0.08)'];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <span
        className="animate-float absolute -start-16 top-10 h-64 w-64 rounded-full"
        style={{ background: blobs[0], filter: 'blur(60px)' }}
      />
      <span
        className="animate-float absolute -end-20 top-64 h-72 w-72 rounded-full"
        style={{ background: blobs[1], filter: 'blur(70px)', animationDelay: '1.4s' }}
      />
      <span
        className="absolute -bottom-24 start-1/4 h-80 w-80 rounded-full"
        style={{ background: blobs[2], filter: 'blur(80px)' }}
      />
    </div>
  );
}
