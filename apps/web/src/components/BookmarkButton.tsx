import { Bookmark } from 'lucide-react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';

type ContentType = 'lesson' | 'recipe' | 'article' | 'program';

export default function BookmarkButton({ type, id }: { type: ContentType; id: string }) {
  const qc = useQueryClient();
  const { data: bookmarks } = useQuery({ queryKey: ['bookmarks'], queryFn: () => api.get('/api/me/bookmarks') });
  const saved = Array.isArray(bookmarks) && bookmarks.some((b: any) => b.contentType === type && b.contentId === id);

  const toggle = useMutation({
    mutationFn: async () => {
      if (saved) await api.del('/api/me/bookmarks', { contentType: type, contentId: id });
      else await api.post('/api/me/bookmarks', { contentType: type, contentId: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  });

  return (
    <button
      onClick={() => toggle.mutate()}
      aria-label={saved ? 'Remove bookmark' : 'Add bookmark'}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow"
    >
      <Bookmark size={20} className="text-brand-teal" fill={saved ? '#00BCD4' : 'none'} />
    </button>
  );
}
