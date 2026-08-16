import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { markSpot } from '../lib/spotlight';

/**
 * A one-time "did you know" chip, rendered inline right next to the feature it
 * points at. Dismissing (or acting on the tip — callers mark the spot on use)
 * retires it forever.
 */
export default function SpotlightBubble({
  spotKey,
  text,
  onDismiss,
  className = '',
}: {
  spotKey: string;
  text: string;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-white shadow-md ${className}`}
      role="note"
    >
      <span className="text-base" aria-hidden>💡</span>
      <p className="min-w-0 flex-1 text-xs font-semibold leading-snug">{text}</p>
      <button
        onClick={() => { markSpot(spotKey); onDismiss(); }}
        aria-label="dismiss"
        className="shrink-0 rounded-full p-1 text-white/70 hover:text-white"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}
