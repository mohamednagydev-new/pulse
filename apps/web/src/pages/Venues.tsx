import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronRight, Clock, MapPin, Navigation, Phone, Star, X } from 'lucide-react';
import { api } from '../lib/api';
import { priceLabel } from '../lib/money';
import { Loader, ErrorMsg, EmptyState, MediaImage } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

/**
 * Find a gym.
 *
 * Location is asked for, never demanded: plenty of people decline the prompt, and a
 * directory that only works with GPS is a directory that works for half its users.
 * Without a fix we fall back to filtering by city, which is how people describe where
 * they are anyway.
 *
 * Design notes: venues rarely have photos, so the card leans on MediaImage — its
 * generated CoverArt fallback keeps every card visual instead of a wall of text.
 * Filter pills follow the app's section-tone pattern (blue here), with a live
 * result count and a single Clear affordance instead of hunting per-chip.
 */

type Venue = {
  id: string;
  name: string;
  tagline: string | null;
  logo: string | null;
  cover: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  mapUrl: string | null;
  facilities: string[];
  ladiesOnly: boolean;
  currency: string | null;
  priceFromAmount: number | null;
  priceFrom: string | null;
  openNow: boolean | null;
  distanceKm: number | null;
  featured: boolean;
};

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

const FACILITY_LABEL: Record<string, { en: string; ar: string; icon: string }> = {
  weights: { en: 'Weights', ar: 'أوزان', icon: '🏋️' },
  cardio: { en: 'Cardio', ar: 'كارديو', icon: '🏃' },
  classes: { en: 'Classes', ar: 'حصص', icon: '🗓️' },
  pool: { en: 'Pool', ar: 'حمام سباحة', icon: '🏊' },
  sauna: { en: 'Sauna', ar: 'ساونا', icon: '🧖' },
  parking: { en: 'Parking', ar: 'باركينج', icon: '🅿️' },
  showers: { en: 'Showers', ar: 'دُش', icon: '🚿' },
  lockers: { en: 'Lockers', ar: 'لوكرز', icon: '🔒' },
  pt: { en: 'Personal training', ar: 'تدريب شخصي', icon: '🤝' },
  crossfit: { en: 'CrossFit', ar: 'كروسفت', icon: '⚡' },
  boxing: { en: 'Boxing', ar: 'ملاكمة', icon: '🥊' },
  kids: { en: 'Kids area', ar: 'ركن أطفال', icon: '🧒' },
};

export default function Venues() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [city, setCity] = useState('');
  const [facility, setFacility] = useState('');
  const [ladies, setLadies] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  // Only ask once the user is actually looking at the list — a permission prompt on
  // page load, before anyone has seen what it is for, gets denied almost every time.
  const findMe = () => {
    if (!navigator.geolocation) return setDenied(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setDenied(true);
        setLocating(false);
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['venues', city, facility, ladies, point],
    queryFn: () => {
      const qs = new URLSearchParams({ type: 'gym' });
      if (city) qs.set('city', city);
      if (facility) qs.set('facility', facility);
      if (ladies) qs.set('ladies', '1');
      if (point) {
        qs.set('lat', String(point.lat));
        qs.set('lng', String(point.lng));
      }
      return api.get(`/api/venues?${qs}`);
    },
  });

  const venues: Venue[] = data?.venues ?? [];
  const label = (key: string) => (isAr ? FACILITY_LABEL[key]?.ar : FACILITY_LABEL[key]?.en) ?? key;
  const hasFilters = Boolean(city || facility || ladies);
  const clearFilters = () => {
    setCity('');
    setFacility('');
    setLadies(false);
  };

  return (
    <div className="relative min-h-screen pb-16">
      <AmbientBg tone="cool" />
      <TopBar title={t('venues.title')} color="bg-gradient-to-b from-brand-blue to-blue-700" textColor="text-white" />

      {/* Locate: one row that flips into a "sorted by distance" state. */}
      {point ? (
        <div className="mx-4 flex min-h-11 items-center justify-between gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-brand-blue">
          <span className="flex items-center gap-2"><Navigation size={15} /> {t('venues.nearActive')}</span>
          <button onClick={() => setPoint(null)} aria-label={t('common.close')} className="flex h-8 w-8 items-center justify-center rounded-full">
            <X size={15} />
          </button>
        </div>
      ) : (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          onClick={findMe}
          disabled={locating}
          className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm disabled:opacity-60"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
            <Navigation size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t('venues.near')}</span>
            <span className="block text-xs text-gray-400">
              {denied ? t('venues.denied') : t('venues.nearSub')}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
        </motion.button>
      )}

      {/* Filters: cities (where), then facilities + ladies (what). Same pill
          language as the rest of the app — section blue for active. */}
      {(data?.cities ?? []).length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <Chip active={!city} onClick={() => setCity('')} label={t('venues.allCities')} />
          {(data?.cities ?? []).map((c: { city: string; count: number }) => (
            <Chip key={c.city} active={city === c.city} onClick={() => setCity(city === c.city ? '' : c.city)} label={c.city} count={c.count} />
          ))}
        </div>
      )}

      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip tone="pink" active={ladies} onClick={() => setLadies((v) => !v)} label={`♀ ${t('venues.ladiesOnly')}`} />
        {(data?.facilities ?? []).map((f: { key: string; count: number }) => (
          <Chip
            key={f.key}
            active={facility === f.key}
            onClick={() => setFacility(facility === f.key ? '' : f.key)}
            label={`${FACILITY_LABEL[f.key]?.icon ?? ''} ${label(f.key)}`.trim()}
          />
        ))}
      </div>

      {/* Result count + one-tap reset — the answer to "why is this list short?" */}
      {!isLoading && !isError && (
        <div className="mt-2 flex min-h-8 items-center justify-between px-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
            {t('venues.results', { count: venues.length })}
          </p>
          <AnimatePresence>
            {hasFilters && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-bold text-brand-blue"
              >
                <X size={12} /> {t('venues.clear')}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {isLoading && <Loader />}

      {isError && <ErrorMsg error={error} onRetry={() => refetch()} />}

      {!isLoading && !isError && venues.length === 0 && (
        <EmptyState
          icon={<Building2 size={28} />}
          title={t('venues.empty')}
          hint={t('venues.emptySub')}
          action={hasFilters ? <button onClick={clearFilters} className="btn-pill btn-blue min-h-10 px-6 text-sm">{t('venues.clear')}</button> : undefined}
        />
      )}

      <div className="mt-1 space-y-3 px-4">
        {venues.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: Math.min(i, 6) * 0.04 }}
            className={`overflow-hidden rounded-2xl bg-white shadow-sm ${v.featured ? 'ring-1 ring-amber-200' : ''}`}
          >
            <Link to={`/partner/${v.id}`} className="flex items-stretch gap-3 p-3">
              {/* MediaImage falls back to generated cover art, so a gym without
                  photos still gets a face instead of a bare text block. */}
              <MediaImage
                path={v.cover ?? v.logo}
                label={v.name}
                seed={i + 2}
                className="h-24 w-24 shrink-0 rounded-xl"
              />

              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-bold leading-snug">
                      {v.featured && <Star size={12} className="mb-0.5 me-1 inline text-amber-400" fill="currentColor" />}
                      {v.name}
                    </p>
                    {v.distanceKm != null && (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-brand-blue" dir="ltr">
                        {v.distanceKm} km
                      </span>
                    )}
                  </div>
                  {v.tagline && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{v.tagline}</p>}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    {v.city && (
                      <span className="flex items-center gap-1"><MapPin size={11} /> {v.city}</span>
                    )}
                    {v.openNow !== null && (
                      <span className={`flex items-center gap-1 font-semibold ${v.openNow ? 'text-brand-green' : 'text-gray-400'}`}>
                        <Clock size={11} /> {v.openNow ? t('venues.open') : t('venues.closed')}
                      </span>
                    )}
                    {priceLabel({ amount: v.priceFromAmount, display: v.priceFrom, currency: v.currency }, i18n.language) && (
                      <span className="font-semibold text-gray-600" dir="ltr">
                        {priceLabel({ amount: v.priceFromAmount, display: v.priceFrom, currency: v.currency }, i18n.language)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {v.ladiesOnly && (
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-brand-pink">
                      ♀ {t('venues.ladiesOnly')}
                    </span>
                  )}
                  {v.facilities.slice(0, 3).map((f) => (
                    <span key={f} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {label(f)}
                    </span>
                  ))}
                  {v.facilities.length > 3 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400" dir="ltr">
                      +{v.facilities.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Action row inside the card — the same border-t pattern as the
                rest of the app's cards, not floating buttons under it. */}
            <div className="flex divide-x divide-gray-100 border-t border-gray-100 rtl:divide-x-reverse">
              {v.whatsapp && (
                <a
                  href={`https://wa.me/${v.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => api.post(`/api/store/partners/${v.id}/contact`).catch(() => {})}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-sm font-bold text-emerald-600 transition active:bg-emerald-50"
                >
                  <Phone size={14} /> {t('venues.contact')}
                </a>
              )}
              {v.mapUrl && (
                <a
                  href={v.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 text-sm font-bold text-brand-blue transition active:bg-blue-50"
                >
                  <MapPin size={14} /> {t('venues.directions')}
                </a>
              )}
              <Link
                to={`/partner/${v.id}`}
                className="flex min-h-11 flex-1 items-center justify-center gap-1 text-sm font-bold text-gray-500 transition active:bg-gray-50"
              >
                {t('venues.programs')} <ChevronRight size={14} className="rtl:rotate-180" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  count,
  tone = 'blue',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  tone?: 'blue' | 'pink';
}) {
  const activeCls = tone === 'pink' ? 'bg-brand-pink text-white shadow-sm' : 'bg-brand-blue text-white shadow-sm';
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition active:scale-95 ${
        active ? activeCls : 'border border-gray-200 bg-white text-gray-500'
      }`}
    >
      {label}
      {count != null && (
        <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`} dir="ltr">
          {count}
        </span>
      )}
    </button>
  );
}
