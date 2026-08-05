import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, BadgeCheck, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader } from '../../components/ui';
import { toast } from '../../lib/toast';

export default function AdminUsers() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api.get('/api/admin/users') });

  const verify = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/verify-coach/${id}`, { verified: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast('Coach verified ✓', 'success'); },
  });
  const feature = useMutation({
    mutationFn: (id: string) => api.post(`/api/admin/feature-coach/${id}`, { featured: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast('Coach featured ⭐', 'success'); },
  });

  return (
    <div className="min-h-screen pb-10">
      <header className="flex items-center gap-2 bg-ink px-4 py-4 text-white">
        <Link to="/admin"><ChevronLeft /></Link>
        <h1 className="text-lg font-bold">Users</h1>
      </header>
      {isLoading ? (
        <Loader />
      ) : (
        <div className="divide-y">
          {(users ?? []).map((u: any) => (
            <div key={u.id} className="flex items-center gap-2 bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.firstName} {u.lastName}</p>
                <p className="truncate text-xs text-gray-400">{u.email}</p>
              </div>
              <button onClick={() => verify.mutate(u.id)} title="Verify as coach" className={`flex h-8 w-8 items-center justify-center rounded-full ${u.coachVerified ? 'bg-brand-blue/10 text-brand-blue' : 'bg-gray-100 text-gray-400'}`}>
                <BadgeCheck size={16} />
              </button>
              <button onClick={() => feature.mutate(u.id)} title="Feature coach" className={`flex h-8 w-8 items-center justify-center rounded-full ${u.coachFeatured ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-400'}`}>
                <Star size={16} className={u.coachFeatured ? 'fill-amber-500' : ''} />
              </button>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${u.role === 'ADMIN' ? 'bg-brand-pink/10 text-brand-pink' : 'bg-gray-100 text-gray-500'}`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
