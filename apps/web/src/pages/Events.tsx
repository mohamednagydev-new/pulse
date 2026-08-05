import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, ExternalLink, MapPin, Star, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, MediaImage, ErrorMsg } from '../components/ui';
import TopBar from '../components/TopBar';
import CoverArt from '../components/CoverArt';
import AmbientBg from '../components/AmbientBg';
import { toast } from '../lib/toast';
import { tapFeedback } from '../lib/haptics';

interface FitEvent {
  id: string;
  kind: string;
  title: string; titleAr?: string | null;
  description?: string | null; descriptionAr?: string | null;
  image?: string | null;
  city?: string | null;
  venue?: string | null; venueAr?: string | null;
  mapUrl?: string | null;
  date: string;
  time?: string | null;
  price?: string | null;
  url?: string | null;
  whatsapp?: string | null;
  sponsored: boolean;
  featured: boolean;
  going: number;
  myRsvp: 'going' | 'interested' | null;
  partner?: { id: string; name: string; nameAr?: string | null; logo?: string | null } | null;
}

const KIND_ICON: Record<string, string> = {
  class: '🧘', bootcamp: '🔥', race: '🏃', workshop: '🍳', open_day: '🌅',
};

export default function Events() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language.startsWith('ar');
  const [city, setCity] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<{ events: FitEvent[]; cities: { city: string; count: number }[] }>({
    queryKey: ['events-board', city],
    queryFn: () => api.get(`/api/board/events${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  });

  const rsvp = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'going' | 'interested' }) =>
      api.post(`/api/board/events/${id}/rsvp`, { status }),
    onSuccess: (res: any) => {
      tapFeedback();
      toast(res?.status ? t('events.rsvpSaved') : t('events.rsvpRemoved'), 'success');
      qc.invalidateQueries({ queryKey: ['events-board'] });
    },
    onError: (e: any) => toast(e?.message ?? 'Something went wrong', 'error'),
  });

  const events = data?.events ?? [];

  // Group by month so a long list still reads as a calendar.
  const months = useMemo(() => {
    const out: { key: string; label: string; items: FitEvent[] }[] = [];
    for (const e of events) {
      const key = e.date.slice(0, 7);
      const label = new Date(`${e.date}T00:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        month: 'long', year: 'numeric',
      });
      const bucket = out.find((m) => m.key === key);
      if (bucket) bucket.items.push(e);
      else out.push({ key, label, items: [e] });
    }
    return out;
  }, [events, isAr]);

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-24">
      <AmbientBg tone="cool" />
      <TopBar title={t('events.title')} color="fitness-hero" textColor="text-white" />

      <p className="px-4 text-sm text-gray-500">{t('events.sub')}</p>

      {(data?.cities?.length ?? 0) > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
          {[{ city: '', count: events.length }, ...(data?.cities ?? [])].map((c) => (
            <button
              key={c.city || 'all'}
              onClick={() => setCity(c.city)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                city === c.city ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 shadow-sm'
              }`}
            >
              {c.city || t('events.allCities')}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorMsg error={error} onRetry={() => refetch()} />
      ) : events.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <CalendarDays size={40} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-400">{t('events.empty')}</p>
        </div>
      ) : (
        months.map((m) => (
          <section key={m.key} className="mt-5">
            <h2 className="px-4 text-[11px] font-bold uppercase tracking-wide text-gray-400">{m.label}</h2>
            <div className="mt-2 space-y-3 px-4">
              {m.items.map((e, i) => (
                <EventCard
                  key={e.id}
                  event={e}
                  index={i}
                  isAr={isAr}
                  t={t}
                  onRsvp={(status) => rsvp.mutate({ id: e.id, status })}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function EventCard({
  event: e, index, isAr, t, onRsvp,
}: {
  event: FitEvent;
  index: number;
  isAr: boolean;
  t: (k: string, o?: any) => string;
  onRsvp: (status: 'going' | 'interested') => void;
}) {
  const d = new Date(`${e.date}T00:00:00`);
  const day = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric' });
  const weekday = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'short' });
  const title = (isAr && e.titleAr) || e.title;
  const venue = (isAr && e.venueAr) || e.venue;

  const contact = () => {
    api.post(`/api/board/events/${e.id}/contact`).catch(() => {});
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(index, 5) * 0.04 }}
      className="overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <div className="relative h-32">
        {e.image ? (
          <MediaImage path={e.image} className="h-full w-full object-cover" />
        ) : (
          <CoverArt label={title} className="h-full w-full" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />

        {/* Date chip reads at a glance — the one thing people scan a board for */}
        <div className="absolute start-3 top-3 flex h-14 w-12 flex-col items-center justify-center rounded-xl bg-white/95 shadow">
          <span className="text-lg font-extrabold leading-none">{day}</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase text-orange-500">{weekday}</span>
        </div>

        {e.sponsored && (
          <span className="absolute end-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
            {t('events.sponsored')}
          </span>
        )}
        {e.featured && !e.sponsored && (
          <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-[#2C1A3D]">
            <Star size={10} fill="currentColor" /> {t('events.featured')}
          </span>
        )}

        <span className="absolute bottom-2 start-3 text-2xl" aria-hidden>{KIND_ICON[e.kind] ?? '📅'}</span>
      </div>

      <div className="p-4">
        <h3 className="text-base font-bold leading-snug">{title}</h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {e.time && <span className="font-semibold text-orange-500">{e.time}</span>}
          {venue && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={12} className="shrink-0" /> <span className="truncate">{venue}</span>
            </span>
          )}
          {e.going > 0 && (
            <span className="flex items-center gap-1"><Users size={12} /> {t('events.going', { n: e.going })}</span>
          )}
        </div>

        {(e.descriptionAr || e.description) && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
            {(isAr && e.descriptionAr) || e.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onRsvp('going')}
            className={`min-h-[38px] flex-1 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
              e.myRsvp === 'going' ? 'bg-brand-green text-white' : 'bg-orange-500 text-white'
            }`}
          >
            {e.myRsvp === 'going' ? t('events.youreGoing') : t('events.imGoing')}
          </button>
          <button
            onClick={() => onRsvp('interested')}
            className={`min-h-[38px] rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
              e.myRsvp === 'interested' ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {t('events.interested')}
          </button>
          {e.url && (
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              onClick={contact}
              aria-label={t('events.book')}
              className="flex min-h-[38px] items-center justify-center rounded-xl bg-gray-100 px-3 text-gray-500 active:scale-95"
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>

        {e.partner && (
          <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
            {e.partner.logo && <MediaImage path={e.partner.logo} className="h-6 w-6 rounded-full" />}
            <span className="truncate text-[11px] text-gray-400">
              {t('events.hostedBy')} <span className="font-semibold text-gray-600">{(isAr && e.partner.nameAr) || e.partner.name}</span>
            </span>
          </div>
        )}
      </div>
    </motion.article>
  );
}

/** Price is display-only everywhere — PULSE never takes a payment. */
