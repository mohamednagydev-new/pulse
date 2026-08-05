import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export default function ShareButton({ title, text, className = '' }: { title: string; text: string; className?: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      } catch { /* ignore */ }
    }
  };
  return (
    <button onClick={share} className={`flex items-center gap-1 text-sm font-semibold text-brand-pink ${className}`}>
      {done ? <Check size={16} /> : <Share2 size={16} />} Share
    </button>
  );
}
