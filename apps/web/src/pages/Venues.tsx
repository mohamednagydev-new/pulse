import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Clock, MapPin, Navigation, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { priceLabel } from '../lib/money';
import { Loader, ErrorMsg } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

/**
 * Find a gym.
 *
 * Location is asked for, never demanded: plenty of people decline the prompt, and a
 * directory that only works with GPS is a directory that works for half its users.
 * Without a fix we fall back to filtering by city, which is how people describe where
 * they are anyway.
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

const FACILITY_LABEL: Record<string, { en: string; ar: string }> = {
  weights: { en: 'Weights', ar: 'أوزان' },
  cardio: { en: 'Cardio', ar: 'كارديو' },
  classes: { en: 'Classes', ar: 'حصص' },
  pool: { en: 'Pool', ar: 'حمام سباحة' },
  sauna: { en: 'Sauna', ar: 'ساونا' },
  parking: { en: 'Parking', ar: 'باركينج' },
  showers: { en: 'Showers', ar: 'دُش' },
  lockers: { en: 'Lockers', ar: 'لوكرز' },
  pt: { en: 'Personal training', ar: 'تدريب شخصي' },
  crossfit: { en: 'CrossFit', ar: 'كروسفت' },
  boxing: { en: 'Boxing', ar: 'ملاكمة' },
  kids: { en: 'Kids area', ar: 'ركن أطفال' },
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

  useEffect(() => {
    document.title = 'PULSE';
  }, []);

  const venues: Venue[] = data?.venues ?? [];
  const label = (key: string) => (isAr ? FACILITY_LABEL[key]?.ar : FACILITY_LABEL[key]?.en) ?? key;

  return (
    <div className="relative min-h-screen pb-16">
      <AmbientBg tone="cool" />
      <TopBar title={t('venues.title')} color="bg-gradient-to-b from-brand-blue to-blue-700" textColor="text-white" />

      {!point && (
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
        </motion.button>
      )}

      {/* Filters. Only rendered when there is something to filter by. */}
      {(data?.cities ?? []).length > 1 && (
        <div className="mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          <Chip active={!city} onClick={() => setCity('')} label={t('venues.allCities')} />
          {(data?.cities ?? []).map((c: { city: string; count: number }) => (
            <Chip key={c.city} active={city === c.city} onClick={() => setCity(c.city)} label={`${c.city} (${c.count})`} />
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <Chip active={ladies} onClick={() => setLadies((v) => !v)} label={t('venues.ladiesOnly')} />
        {(data?.facilities ?? []).map((f: { key: string; count: number }) => (
          <Chip
            key={f.key}
            active={facility === f.key}
            onClick={() => setFacility(facility === f.key ? '' : f.key)}
            label={label(f.key)}
          />
        ))}
      </div>

      {isLoading && <Loader />}

      {isError && <ErrorMsg error={error} onRetry={() => refetch()} />}

      {!isLoading && !isError && venues.length === 0 && (
        <div className="mx-4 mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
          <Building2 size={28} className="mx-auto text-gray-300" />
          <p className="mt-3 text-sm font-semibold">{t('venues.empty')}</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">{t('venues.emptySub')}</p>
        </div>
      )}

      <div className="mt-3 space-y-3 px-4">
        {venues.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: Math.min(i, 6) * 0.04 }}
          >
            <Link to={`/partner/${v.id}`} className="block overflow-hidden rounded-2xl bg-white shadow-sm">
              {v.cover && <img src={v.cover} alt="" className="h-28 w-full object-cover" loading="lazy" />}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{v.name}</p>
                    {v.tagline && <p className="truncate text-xs text-gray-400">{v.tagline}</p>}
                  </div>
                  {v.distanceKm != null && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-brand-blue" dir="ltr">
                      {v.distanceKm} km
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  {v.city && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {v.city}
                    </span>
                  )}
                  {v.openNow !== null && (
                    <span className={`flex items-center gap-1 font-semibold ${v.openNow ? 'text-brand-green' : 'text-gray-400'}`}>
                      <Clock size={11} /> {v.openNow ? t('venues.open') : t('venues.closed')}
                    </span>
                  )}
                  {priceLabel(
                    { amount: v.priceFromAmount, display: v.priceFrom, currency: v.currency },
                    i18n.language,
                  ) && (
                    <span className="font-semibold text-gray-600">
                      {priceLabel(
                        { amount: v.priceFromAmount, display: v.priceFrom, currency: v.currency },
                        i18n.language,
                      )}
                    </span>
                  )}
                  {v.ladiesOnly && (
                    <span className="rounded-full bg-pink-50 px-2 py-0.5 font-bold text-brand-pink">
                      {t('venues.ladiesOnly')}
                    </span>
                  )}
                </div>

                {v.facilities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.facilities.slice(0, 5).map((f) => (
                      <span key={f} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                        {label(f)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>

            {(v.whatsapp || v.phone) && (
              <div className="mt-1.5 flex gap-2">
                {v.whatsapp && (
                  <a
                    href={`https://wa.me/${v.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => api.post(`/api/store/partners/${v.id}/contact`).catch(() => {})}
                    className="btn-pill flex min-h-[38px] flex-1 items-center justify-center gap-1.5 bg-emerald-500 py-2 text-sm font-semibold text-white"
                  >
                    <Phone size={14} /> {t('venues.contact')}
                  </a>
                )}
                {v.mapUrl && (
                  <a
                    href={v.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pill flex min-h-[38px] items-center justify-center gap-1.5 border border-gray-200 bg-white px-4 py-2 text-sm font-semibold"
                  >
                    <MapPin size={14} /> {t('venues.directions')}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
        active ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-500'
      }`}
    >
      {label}
    </button>
  );
}
