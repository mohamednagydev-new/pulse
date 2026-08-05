import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg, MediaImage } from '../../components/ui';
import TopBar from '../../components/TopBar';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

export default function CoachPage() {
  const { id } = useParams();
  const { data: coach, isLoading, error } = useQuery({
    queryKey: ['coach', id],
    queryFn: () => api.get(`/api/coaches/${id}`),
  });

  // Loading/error keep the section shell + a back affordance — no bare screen, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen pb-8">
        <TopBar color="bg-gradient-to-b from-brand-blue to-blue-500" textColor="text-white" curved />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  const isYoga = coach.type === 'YOGA';
  const accent = isYoga ? 'from-brand-pink to-pink-500' : 'from-brand-blue to-blue-500';
  const programs: any[] = coach.programs ?? [];
  const hasLevels = programs.some((p) => p.level);

  return (
    <div className="min-h-screen pb-8">
      <TopBar title={coach.name} color={`bg-gradient-to-b ${accent}`} textColor="text-white" curved />
      <div className="-mt-4 px-4">
        <MediaImage path={coach.avatarUrl} label={coach.name} className="mx-auto h-40 w-40 rounded-full ring-4 ring-white" seed={1} />
        {coach.headline && <p className="mt-3 text-center font-semibold text-gray-600">{coach.headline}</p>}
        {coach.bio && <p className="mt-2 text-center text-sm text-gray-500">{coach.bio}</p>}
      </div>

      {hasLevels ? (
        LEVELS.map((lvl) => {
          const items = programs.filter((p) => p.level === lvl);
          if (!items.length) return null;
          return (
            <section key={lvl} className="mt-6 px-4">
              <h2 className="mb-2 font-bold capitalize text-brand-blue">{lvl.toLowerCase()}</h2>
              <ProgramList programs={items} />
            </section>
          );
        })
      ) : (
        <section className="mt-6 px-4">
          <ProgramList programs={programs} />
        </section>
      )}
    </div>
  );
}

function ProgramList({ programs }: { programs: any[] }) {
  return (
    <div className="space-y-3">
      {programs.map((p) => (
        <Link key={p.id} to={`/programs/${p.id}`} className="flex items-center justify-between gap-2 rounded-full bg-gray-100 px-6 py-4 font-bold text-ink">
          <span className="min-w-0 flex-1 truncate">{p.title}</span>
          <ChevronRight className="shrink-0 text-brand-pink rtl:rotate-180" />
        </Link>
      ))}
    </div>
  );
}
