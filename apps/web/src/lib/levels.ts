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

/** Index into RANKS for a level — the single place the 3-levels-per-rank rule lives. */
function rankIndex(level: number): number {
  return Math.min(RANKS.length - 1, Math.floor(Math.max(1, level - 1) / 3));
}

export function levelTitle(level: number): LevelTitle {
  return RANKS[rankIndex(level)];
}

/** Avatar ring cosmetics per rank tier — one entry per RANKS index, escalating
 *  from a quiet gray ring to full glow. Classes only; safe in dark mode. */
const RANK_RINGS: string[] = [
  'ring-2 ring-gray-300',                                    // Rookie
  'ring-2 ring-amber-600',                                   // Mover — bronze
  'ring-2 ring-slate-300',                                   // Grinder — silver
  'ring-[3px] ring-amber-400',                               // Athlete — gold
  'ring-[3px] ring-emerald-400',                             // Warrior
  'ring-[3px] ring-orange-400 shadow-md shadow-orange-400/40',  // Beast
  'ring-[3px] ring-red-400 shadow-md shadow-red-400/40',        // Machine
  'ring-[3px] ring-rose-500 shadow-lg shadow-rose-500/40',      // Titan
  'ring-[3px] ring-purple-400 shadow-lg shadow-purple-400/40',  // Legend
  'ring-[3px] ring-fuchsia-400 shadow-lg shadow-fuchsia-400/40', // Immortal
];

/** Tailwind ring classes for the avatar at this level's rank tier. */
export function rankRing(level: number): string {
  return RANK_RINGS[rankIndex(level)];
}

/** Label in the active language. */
export function levelLabel(level: number, lang = 'en'): string {
  const r = levelTitle(level);
  return lang.startsWith('ar') ? r.titleAr : r.title;
}

/** XP still needed to reach the next rank name (not just the next level). */
export function nextRank(level: number): { level: number; rank: LevelTitle } | null {
  const idx = rankIndex(level);
  if (idx >= RANKS.length - 1) return null;
  return { level: (idx + 1) * 3 + 1, rank: RANKS[idx + 1] };
}
