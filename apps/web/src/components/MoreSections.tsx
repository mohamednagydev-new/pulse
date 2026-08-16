import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { track } from '../lib/track';

/**
 * Progressive disclosure for crowded screens (the pattern Home established):
 * optional sections collapse behind one-tap chips; expanding shows the section
 * inline; «📌 ثبّت» pins it permanently for THAT user (localStorage per screen).
 * Core content stays outside — this only hosts what the user can live without.
 */

export interface MoreSection {
  key: string;
  emoji: string;
  label: string;
  node: React.ReactNode;
}

export default function MoreSections({ storageKey, sections }: { storageKey: string; sections: MoreSection[] }) {
  const { t } = useTranslation();
  const [pins, setPins] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  // Scroll affordance: chips rows overflow, but nothing says so — a pulsing
  // chevron + edge fade do, until the user scrolls once.
  const [scrolled, setScrolled] = useState(false);

  const togglePin = (key: string) => {
    setPins((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* fine */ }
      track(`chip/${key}/${next.includes(key) ? 'pin' : 'unpin'}`, storageKey);
      return next;
    });
  };

  const pinned = sections.filter((s) => pins.includes(s.key));
  const unpinned = sections.filter((s) => !pins.includes(s.key));
  const open = unpinned.find((s) => s.key === expanded) ?? null;

  return (
    <>
      {pinned.map((s) => (
        <div key={s.key}>
          <div className="mx-5 mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{s.emoji} {s.label}</span>
            <button onClick={() => togglePin(s.key)} className="text-xs font-bold text-gray-300">{t('homeSlim.unpin')}</button>
          </div>
          <div className="-mt-2">{s.node}</div>
        </div>
      ))}

      {unpinned.length > 0 && (
        <div className="mt-5 px-4">
          <p className="px-1 text-xs font-bold uppercase tracking-wide text-gray-400">{t('homeSlim.more')}</p>
          <div className="relative">
            <div
              onScroll={() => !scrolled && setScrolled(true)}
              className="chip-row mt-1 flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar"
            >
              {unpinned.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (expanded !== s.key) track(`chip/${s.key}/open`, storageKey);
                    setExpanded(expanded === s.key ? null : s.key);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition ${
                    expanded === s.key ? 'bg-ink text-white' : 'bg-white text-gray-600 shadow-sm'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
            {!scrolled && unpinned.length > 3 && <span className="chip-hint" aria-hidden />}
          </div>
        </div>
      )}

      {open && (
        <div>
          <div className="mx-5 mt-3 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">{open.emoji} {open.label}</span>
            <button onClick={() => { togglePin(open.key); setExpanded(null); }} className="text-xs font-bold text-brand-blue">📌 {t('homeSlim.pin')}</button>
          </div>
          <div className="-mt-2">{open.node}</div>
        </div>
      )}
    </>
  );
}
