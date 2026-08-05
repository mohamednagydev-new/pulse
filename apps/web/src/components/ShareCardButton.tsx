import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { shareImageCard } from '../lib/shareCard';

export default function ShareCardButton({
  title,
  subtitle,
  emoji,
  className = '',
  label = 'Share card',
}: {
  title: string;
  subtitle: string;
  emoji: string;
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await shareImageCard({ title, subtitle, emoji });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={onClick} disabled={busy} className={`flex items-center gap-1 text-sm font-semibold text-brand-pink disabled:opacity-60 ${className}`}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />} {label}
    </button>
  );
}
