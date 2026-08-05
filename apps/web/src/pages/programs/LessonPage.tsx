import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader, ErrorMsg } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { useState } from 'react';
import ContentVideo from '../../components/ContentVideo';
import CoverArt from '../../components/CoverArt';
import BookmarkButton from '../../components/BookmarkButton';
import Confetti from '../../components/Confetti';
import RelatedReels from '../../components/RelatedReels';

export default function LessonPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [celebrate, setCelebrate] = useState(false);
  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api.get(`/api/lessons/${id}`),
  });

  const complete = useMutation({
    mutationFn: () => api.post('/api/me/completions', { lessonId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['completions'] });
      setCelebrate(true);
    },
  });

  // Loading/error keep the section shell + a back affordance — no bare screen, never stranded.
  if (isLoading || error) {
    return (
      <div className="min-h-screen pb-10">
        <TopBar color="fitness-hero" textColor="text-white" curved />
        {isLoading ? <Loader /> : <ErrorMsg error={error} />}
      </div>
    );
  }

  const reelKeyword =
    lesson.reelKeyword ||
    `${String(lesson.title ?? '').replace(/^Day\s*\d+\s*:\s*/i, '')}${lesson.program?.coach?.type === 'YOGA' ? ' yoga' : ' workout'}`;

  return (
    <div className="min-h-screen pb-10">
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}
      <TopBar title={lesson.program?.coach?.name} color="fitness-hero" textColor="text-white" curved />
      <div className="mt-4 px-4">
        {/* Self-hosted upload, else a YouTube/MP4 link, else the still, else generated
            art. Never a play button that can't play. */}
        {lesson.videoId || lesson.videoUrl || lesson.thumbnail ? (
          <ContentVideo
            videoId={lesson.videoId}
            videoUrl={lesson.videoUrl}
            poster={lesson.thumbnail}
            label={lesson.title}
          />
        ) : (
          <CoverArt label={lesson.title} className="aspect-video w-full rounded-2xl" />
        )}
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold leading-tight">{lesson.title}</h1>
            <p className="text-sm text-gray-400">{lesson.program?.title}</p>
          </div>
          <div className="shrink-0"><BookmarkButton type="lesson" id={lesson.id} /></div>
        </div>
        {lesson.description && <p className="mt-3 text-gray-600">{lesson.description}</p>}

        <button
          onClick={() => complete.mutate()}
          disabled={complete.isPending || complete.isSuccess}
          className="btn-pill btn-green mt-6 w-full gap-2 disabled:opacity-70"
        >
          <Check size={18} /> {complete.isSuccess ? t('programs.markedDone') : t('programs.markComplete')}
        </button>

        <RelatedReels keyword={reelKeyword} className="mt-8" />
      </div>
    </div>
  );
}
