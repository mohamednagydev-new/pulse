import {
  HeartPulse, Bone, Brain, Moon, Apple, Salad, Fish, Cookie, Wheat, Soup,
  Droplets, Baby, Wind, CigaretteOff, Dumbbell, Activity, Flower2, Beef,
  Drumstick, Egg, Coffee, ShieldPlus, Utensils, Sparkles, type LucideIcon,
} from 'lucide-react';

type Theme = { re: RegExp; from: string; to: string; Icon: LucideIcon };

// Order matters: most specific first. Keyword-matched against the content title/label.
const THEMES: Theme[] = [
  { re: /heart|cardio|cholesterol|blood ?pressure|hypertension|قلب|ضغط|كوليسترول/i, from: '#ef4444', to: '#f97316', Icon: HeartPulse },
  { re: /arthritis|joint|osteo|bone|spine|back ?pain|musculoskeletal|posture|مفاصل|عظام|ظهر|فقري/i, from: '#f59e0b', to: '#fbbf24', Icon: Bone },
  { re: /depress|anxiet|mental|stress|mood|mindful|wellbeing|نفسي|توتر|اكتئاب|قلق/i, from: '#6366f1', to: '#818cf8', Icon: Brain },
  { re: /sleep|insomnia|jet ?lag|rest|نوم|أرق/i, from: '#334155', to: '#6366f1', Icon: Moon },
  { re: /diabet|blood ?sugar|glucose|سكر|سكري/i, from: '#8b5cf6', to: '#a78bfa', Icon: Droplets },
  { re: /pregnan|prenatal|maternal|mother|baby|child|kid|infant|حمل|أم|طفل|أطفال/i, from: '#f472b6', to: '#fb7185', Icon: Baby },
  { re: /smoking|smoke|nicotine|tobacco|تدخين|سجائر/i, from: '#64748b', to: '#94a3b8', Icon: CigaretteOff },
  { re: /lung|respirat|breath|رئة|تنفس/i, from: '#06b6d4', to: '#22d3ee', Icon: Wind },
  { re: /skin|derma|acne|بشرة|جلد/i, from: '#ec4899', to: '#f472b6', Icon: Sparkles },
  { re: /dental|teeth|tooth|oral|أسنان/i, from: '#0ea5e9', to: '#38bdf8', Icon: ShieldPlus },
  { re: /hydrat|water|drink|مياه|ترطيب/i, from: '#0ea5e9', to: '#38bdf8', Icon: Droplets },
  { re: /cancer|tumor|oncolog|سرطان/i, from: '#a855f7', to: '#c084fc', Icon: ShieldPlus },
  { re: /digest|gut|stomach|bowel|ibs|هضم|معدة/i, from: '#84cc16', to: '#a3e635', Icon: Apple },
  { re: /yoga|stretch|mobility|flexib|flow|pose|meditat|يوجا|مرونة|تأمل/i, from: '#0d9488', to: '#2dd4bf', Icon: Flower2 },
  { re: /ageing|aging|senior|older|شيخوخة|كبر/i, from: '#f59e0b', to: '#f97316', Icon: ShieldPlus },
  // Recipes / food
  { re: /salad|vegetable|veggie|legume|سلطة|خضار|بقول/i, from: '#16a34a', to: '#4ade80', Icon: Salad },
  { re: /soup|broth|شوربة/i, from: '#f97316', to: '#fb923c', Icon: Soup },
  { re: /salmon|fish|seafood|tuna|shrimp|سمك|بحرية|سلمون/i, from: '#0891b2', to: '#22d3ee', Icon: Fish },
  { re: /chicken|poultry|turkey|فراخ|دواجن/i, from: '#d97706', to: '#f59e0b', Icon: Drumstick },
  { re: /beef|meat|steak|lamb|pork|لحم|لحوم/i, from: '#b91c1c', to: '#ef4444', Icon: Beef },
  { re: /bread|loaf|bun|toast|grain|rice|oat|quinoa|خبز|حبوب|مخبوزات/i, from: '#ca8a04', to: '#eab308', Icon: Wheat },
  { re: /dessert|cake|cookie|sweet|chocolate|حلو|حلويات/i, from: '#db2777', to: '#f472b6', Icon: Cookie },
  { re: /egg|بيض/i, from: '#f59e0b', to: '#fcd34d', Icon: Egg },
  { re: /coffee|tea|smoothie|drink|قهوة|شاي/i, from: '#78350f', to: '#a16207', Icon: Coffee },
  { re: /sauce|dressing|condiment|dip|appetizer|hummus|snack|صوص|تتبيلة|مقبلات|حمص/i, from: '#0d9488', to: '#14b8a6', Icon: Utensils },
  { re: /nutrition|eat|diet|food|calorie|protein|weight|meal|أكل|رجيم|وزن|تغذية/i, from: '#16a34a', to: '#22c55e', Icon: Apple },
  { re: /workout|muscle|strength|exercise|fitness|active|travel|road|تمرين|عضل|قوة|لياقة|نشيط/i, from: '#f97316', to: '#fb923c', Icon: Dumbbell },
];

/**
 * Unmatched titles used to share ONE default (orange + Activity), so any list
 * of keyword-less content became a wall of identical cards. Now the title
 * hashes into a curated set of distinct looks — varied across a list, but
 * stable for the same title forever.
 */
const FALLBACKS: Omit<Theme, 're'>[] = [
  { from: '#f97316', to: '#fb923c', Icon: Dumbbell },
  { from: '#2563eb', to: '#60a5fa', Icon: Activity },
  { from: '#0d9488', to: '#2dd4bf', Icon: Flower2 },
  { from: '#16a34a', to: '#4ade80', Icon: HeartPulse },
  { from: '#7c3aed', to: '#a78bfa', Icon: Sparkles },
  { from: '#db2777', to: '#f472b6', Icon: Wind },
  { from: '#ca8a04', to: '#facc15', Icon: ShieldPlus },
  { from: '#0891b2', to: '#22d3ee', Icon: Droplets },
];

function hashLabel(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickTheme(label?: string): Theme | Omit<Theme, 're'> {
  const t = label || '';
  const matched = THEMES.find((th) => th.re.test(t));
  if (matched) return matched;
  return FALLBACKS[hashLabel(t) % FALLBACKS.length];
}

/**
 * Auto-generated, topic-themed cover art for any content with no uploaded image.
 * Zero uploads: picks a gradient + animated illustration from the title/label.
 */
export default function CoverArt({ label, className = '' }: { label?: string; className?: string }) {
  const { from, to, Icon } = pickTheme(label);
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {/* ambient floating accents */}
      <span className="animate-float absolute -left-3 top-3 h-10 w-10 rounded-full bg-white/10" />
      <span className="animate-float absolute -right-2 bottom-2 h-14 w-14 rounded-full bg-white/10" style={{ animationDelay: '1.2s' }} />
      <span className="absolute right-6 top-4 h-2 w-2 rounded-full bg-white/40" />

      <Icon className="animate-float relative h-2/5 max-h-20 w-2/5 text-white drop-shadow" strokeWidth={1.5} />

      {label && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/45 to-transparent px-3 pb-2 pt-6 text-center text-xs font-semibold text-white/95">
          {label}
        </span>
      )}
    </div>
  );
}
