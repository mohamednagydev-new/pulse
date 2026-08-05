/** Level titles — a rank means more than a number. Mirrors levelForXp on the API (500 XP per level). */

export type LevelTitle = { title: string; titleAr: string; icon: string; color: string };

/** Ranks unlock every 3 levels, so there's always a next name in sight. */
const RANKS: LevelTitle[] = [
  { title: 'Rookie', titleAr: 'مبتدئ', icon: '🌱', color: '#94A3B8' },
  { title: 'Mover', titleAr: 'متحرك', icon: '👟', color: '#60A5FA' },
  { title: 'Grinder', titleAr: 'مجتهد', icon: '⚙️', color: '#38BDF8' },
  { title: 'Athlete', titleAr: 'رياضي', icon: '🏃', color: '#22C55E' },
  { title: 'Warrior', titleAr: 'محارب', icon: '⚔️', color: '#16A34A' },
  { title: 'Beast', titleAr: 'وحش', icon: '🔥', color: '#F97316' },
  { title: 'Machine', titleAr: 'ماكينة', icon: '🤖', color: '#EA580C' },
  { title: 'Titan', titleAr: 'جبار', icon: '🗿', color: '#DC2626' },
  { title: 'Legend', titleAr: 'أسطورة', icon: '👑', color: '#A855F7' },
  { title: 'Immortal', titleAr: 'خالد', icon: '💎', color: '#7C3AED' },
];

export function levelForXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / 500);
}

export function levelTitle(level: number): LevelTitle {
  return RANKS[Math.min(RANKS.length - 1, Math.floor(Math.max(1, level - 1) / 3))];
}

/** Label in the active language. */
export function levelLabel(level: number, lang = 'en'): string {
  const r = levelTitle(level);
  return lang.startsWith('ar') ? r.titleAr : r.title;
}

/** XP still needed to reach the next rank name (not just the next level). */
export function nextRank(level: number): { level: number; rank: LevelTitle } | null {
  const idx = Math.floor(Math.max(1, level - 1) / 3);
  if (idx >= RANKS.length - 1) return null;
  return { level: (idx + 1) * 3 + 1, rank: RANKS[idx + 1] };
}
