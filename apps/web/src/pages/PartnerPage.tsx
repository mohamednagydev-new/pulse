import { useState } from 'react';
import LeadForms from '../components/LeadForm';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, Globe, MapPin, Instagram, ShoppingBag, Info, Trophy, Flame, Tv, Check, Clock3, Dumbbell } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, MediaImage, EmptyState } from '../components/ui';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { ProductCard, ProductSheet, trackStore, type StoreProduct, type StorePartner } from './Store';

const tap = { scale: 0.96 } as const;

export default function PartnerPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [active, setActive] = useState<StoreProduct | null>(null);

  const { data: partner, isLoading } = useQuery({
    queryKey: ['partner', id],
    queryFn: () => api.get(`/api/store/partners/${id}`),
  });

  if (isLoading) return <Loader />;
  if (!partner) return null;

  const p = partner as StorePartner & { description?: string | null; address?: string | null; products: Omit<StoreProduct, 'partner'>[] };
  const products: StoreProduct[] = (p.products ?? []).map((prod) => ({ ...prod, partner: p }));

  const contact = (url: string) => {
    trackStore(`partners/${p.id}/contact`);
    window.open(url, '_blank', 'noopener');
  };

  const actions = [
    p.whatsapp && { icon: MessageCircle, label: t('store.whatsapp'), url: `https://wa.me/${p.whatsapp}`, primary: true },
    p.phone && { icon: Phone, label: t('store.call'), url: `tel:${p.phone}` },
    p.website && { icon: Globe, label: t('store.website'), url: p.website },
    p.mapUrl && { icon: MapPin, label: t('store.map'), url: p.mapUrl },
    p.instagram && { icon: Instagram, label: t('store.instagram'), url: p.instagram },
  ].filter(Boolean) as { icon: any; label: string; url: string; primary?: boolean }[];

  return (
    <div className="relative min-h-screen pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={p.name} color="fitness-hero" textColor="text-white" />

      {/* Cover + logo */}
      <div className="px-4">
        <div className="relative">
          <MediaImage path={p.cover} label={p.name} className="h-36 w-full rounded-2xl" />
          <div className="absolute -bottom-6 start-4">
            <MediaImage path={p.logo} label={p.name} className="h-16 w-16 rounded-2xl ring-4 ring-white" />
          </div>
        </div>

        <div className="mt-8">
          <h1 className="break-words text-xl font-extrabold leading-tight">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 font-bold text-brand-blue">{p.type}</span>
            {p.city && <span>{p.city}</span>}
            {p.address && <span className="truncate">· {p.address}</span>}
          </div>
          {p.tagline && <p className="mt-2 text-sm font-semibold text-gray-600">{p.tagline}</p>}
          {p.description && <p className="mt-2 text-sm leading-relaxed text-gray-500">{p.description}</p>}
        </div>

        {/* Contact actions — everything happens off-platform */}
        {actions.length > 0 && (
          <div className="mt-4 space-y-2">
            {actions[0].primary && (
              <motion.button whileTap={tap} onClick={() => contact(actions[0].url)} className="btn-pill btn-green w-full">
                <MessageCircle size={16} /> {actions[0].label}
              </motion.button>
            )}
            <div className="flex flex-wrap gap-2">
              {actions.filter((a) => !a.primary).map((a) => (
                <motion.button key={a.label} whileTap={tap} onClick={() => contact(a.url)} className="btn-pill btn-ghost flex-1 whitespace-nowrap px-4 py-2 text-sm">
                  <a.icon size={15} /> {a.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-gray-200 bg-white/70 p-3 text-[11px] leading-relaxed text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-blue" />
          <span>{t('store.offlineNote')}</span>
        </div>

        {/* Gyms only: join the gym community + this week's board */}
        {p.type === 'gym' && <GymCommunity gymId={p.id} />}
      </div>

      {/* Ask them to call you back — the partner pays us per lead */}
      <section className="mt-5 px-4">
        <LeadForms partnerId={p.id} />
      </section>

      {/* Their catalog */}
      <section className="mt-6 px-4">
        {products.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={40} />} title={t('store.empty')} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((prod, i) => (
              <ProductCard
                key={prod.id}
                product={prod}
                index={i}
                onOpen={() => { setActive(prod); trackStore(`products/${prod.id}/view`); }}
              />
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {active && <ProductSheet product={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </div>
  );
}

/**
 * The gym's living side, on its public page: join the community (a REQUEST the
 * manager approves — the QR path skips this because holding the front-desk code
 * is proof enough) and this week's champions, with a link to the full TV view.
 */
function GymCommunity({ gymId }: { gymId: string }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const qc = useQueryClient();

  const { data: membership } = useQuery({
    queryKey: ['gym-membership', gymId],
    queryFn: () => api.get(`/api/org/gym/${gymId}/membership`),
  });
  const { data: board } = useQuery({
    queryKey: ['gym-board', gymId],
    queryFn: () => api.get(`/api/org/gym/${gymId}/board`),
    staleTime: 60_000,
  });
  const join = useMutation({
    mutationFn: () => api.post(`/api/org/gym/${gymId}/join-request`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gym-membership', gymId] }),
  });

  const status = membership?.status ?? 'none';

  return (
    <div className="mt-4 space-y-3">
      {/* Membership CTA / state */}
      {status === 'member' ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-600">
          <Check size={16} /> {L("You're a member — your workouts count on the board 💪", 'انت عضو هنا — تمارينك بتتحسب في اللوحة 💪')}
        </div>
      ) : status === 'pending' ? (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-600">
          <Clock3 size={16} /> {L('Request sent — waiting for the gym to approve', 'طلبك اتبعت — مستنيين الجيم يعتمدك')}
        </div>
      ) : (
        <motion.button
          whileTap={tap}
          disabled={join.isPending}
          onClick={() => join.mutate()}
          className="scene-tex flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500/90 to-cyan-700/80 px-4 py-3.5 text-sm font-extrabold text-white shadow-md"
        >
          <Dumbbell size={16} /> {L('I train here — join the gym community', 'أنا بتمرن هنا — ضمّني لمجتمع الجيم')}
        </motion.button>
      )}

      {/* This week's champions (same data the TV shows) */}
      {board && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-extrabold text-gray-700">
              <Trophy size={15} className="text-amber-500" /> {L('Champions of the week', 'أبطال الأسبوع')}
            </p>
            <Link to={`/tv/${gymId}`} className="flex items-center gap-1 text-xs font-bold text-brand-blue">
              <Tv size={13} /> {L('TV view', 'شاشة العرض')}
            </Link>
          </div>
          {board.top10?.length ? (
            <div className="mt-3 space-y-1.5">
              {board.top10.slice(0, 5).map((m: any, i: number) => (
                <div key={`${m.firstName}-${i}`} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${i === 0 ? 'bg-amber-50' : ''}`}>
                  <span className="w-5 text-center text-sm font-black text-gray-400">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                  <MediaImage path={m.avatarUrl} label={m.firstName} className="h-8 w-8 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">{m.firstName}</span>
                  {m.currentStreak > 1 && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-orange-500"><Flame size={11} /> {m.currentStreak}</span>
                  )}
                  <span className="shrink-0 text-sm font-extrabold tabular-nums text-emerald-600" dir="ltr">{m.xp}</span>
                </div>
              ))}
              <p className="pt-1 text-center text-[11px] text-gray-400">
                {L(`${board.memberCount} members on PULSE`, `${board.memberCount} عضو على PULSE`)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-center text-sm text-gray-400">
              {L('No champions yet — join and be the first 🏆', 'لسه مفيش أبطال — انضم وكن الأول 🏆')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
