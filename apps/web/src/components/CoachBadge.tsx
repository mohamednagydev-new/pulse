import { BadgeCheck, Dumbbell } from 'lucide-react';

export default function CoachBadge({ verified, size = 13 }: { verified?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-blue">
      {verified ? <BadgeCheck size={size} /> : <Dumbbell size={size} />} Coach
    </span>
  );
}
