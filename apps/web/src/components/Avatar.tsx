import { MediaImage } from './ui';

/**
 * People avatar. A real photo when the user uploaded one; otherwise bold
 * initials on a deterministic gradient — the convention every social app uses,
 * so a photo-less user still reads as a person, not a placeholder.
 * (CoverArt stays for CONTENT; this is for HUMANS.)
 */

const GRADIENTS = [
  ['#f97316', '#ea580c'],
  ['#2563eb', '#4f46e5'],
  ['#0d9488', '#0e7490'],
  ['#16a34a', '#15803d'],
  ['#7c3aed', '#a21caf'],
  ['#e11d48', '#be185d'],
  ['#d97706', '#b45309'],
  ['#0284c7', '#1d4ed8'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function Avatar({
  path,
  name,
  className = 'h-10 w-10',
  textClass = 'text-sm',
}: {
  path?: string | null;
  name?: string | null;
  className?: string;
  textClass?: string;
}) {
  if (path) return <MediaImage path={path} label={name ?? ''} className={`rounded-full ${className}`} />;
  const clean = (name ?? '').trim();
  const initials = clean
    ? clean.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : '؟';
  const [from, to] = GRADIENTS[hash(clean || 'x') % GRADIENTS.length];
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-extrabold text-white ${className} ${textClass}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
