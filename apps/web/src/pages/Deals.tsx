import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Copy, Check, X, MessageCircle, Phone, ChevronRight, Info, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { Loader, MediaImage, EmptyState } from '../components/ui';
import Sheet from '../components/Sheet';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';
import { toast } from '../lib/toast';
import { tapFeedback } from '../lib/haptics';
import type { StorePartner } from './Store';

interface Deal {
  id: string;
  title: string;
  description?: string | null;
  code?: string | null;
  discount?: string | null;
  image?: string | null;
  validUntil?: string | null;
  partner: StorePartner;
}

const tap = { scale: 0.97 } as const;
const track = (path: string) => { api.post(`/api/store/${path}`).catch(() => {}); };

/** Deal detail sheet — reveals the coupon code (the partner's lead metric). */
function DealSheet({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const p = deal.partner;

  const reveal = () => {
    tapFeedback();
    setRevealed(true);
    track(`deals/${deal.id}/redeem`);
  };

  const copy = async () => {
    if (!deal.code) return;
    try {
      await navigator.clipboard.writeText(deal.code);
      setCopied(true);
      toast(t('deals.copied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const contact = (url: string) => {
    track(`partners/${p.id}/contact`);
    window.open(url, '_blank', 'noopener');
  };

  const validDate = deal.validUntil
    ? new Date(deal.validUntil).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' })
    : null;

  return (
    <Sheet open onClose={onClose} label={deal.title}>
      <div className="pb-8">
        <div className="relative">
          <MediaImage path={deal.image} label={deal.title} className="h-44 w-full" />
          <button onClick={onClose} aria-label={t('common.close')} className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
            <X size={18} />
          </button>
          {deal.discount && (
            <span className="absolute start-3 top-3 rounded-full bg-brand-pink px-3 py-1 text-sm font-extrabold text-white shadow-lg">
              {deal.discount}
            </span>
          )}
        </div>

        <div className="space-y-3 p-5">
          <h2 className="text-lg font-extrabold leading-snug">{deal.title}</h2>
          {deal.description && <p className="text-sm leading-relaxed text-gray-600">{deal.description}</p>}
          {validDate && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <Clock size={13} /> {t('deals.validUntil', { date: validDate })}
            </p>
          )}

          {/* Coupon code */}
          {deal.code && (
            <div className="pt-1">
              <AnimatePresence mode="wait">
                {!revealed ? (
                  <motion.button
                    key="hidden"
                    whileTap={tap}
                    onClick={reveal}
                    exit={{ opacity: 0 }}
                    className="btn-pill btn-primary w-full text-base"
                  >
                    <Ticket size={18} /> {t('deals.showCode')}
                  </motion.button>
                ) : (
                  <motion.div
                    key="shown"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="rounded-2xl border-2 border-dashed border-brand-pink/50 bg-brand-pink/5 p-4 text-center"
                  >
                    <p className="text-2xl font-extrabold tracking-[0.2em] text-brand-pink" dir="ltr">{deal.code}</p>
                    <button onClick={copy} className="mx-auto mt-2 flex items-center gap-1.5 text-xs font-bold text-gray-500">
                      {copied ? <Check size={13} className="text-brand-green" /> : <Copy size={13} />}
                      {copied ? t('deals.copied') : t('invite.copy')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-400">{t('deals.redeemNote')}</p>
            </div>
          )}

          {/* Partner */}
          <button onClick={() => navigate(`/partner/${p.id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 p-3 text-start">
            <MediaImage path={p.logo} label={p.name} className="h-10 w-10 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{p.name}</span>
              <span className="block truncate text-xs text-gray-400">{p.city || t('store.partnerOf')}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
          </button>

          <div className="flex gap-2">
            {p.whatsapp && (
              <motion.button whileTap={tap} onClick={() => contact(`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(`${deal.title} — PULSE`)}`)} className="btn-pill btn-green flex-1">
                <MessageCircle size={16} /> {t('store.whatsapp')}
              </motion.button>
            )}
            {p.phone && (
              <motion.button whileTap={tap} onClick={() => contact(`tel:${p.phone}`)} className="btn-pill btn-ghost flex-1">
                <Phone size={16} /> {t('store.call')}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export default function Deals() {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<Deal | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['deals'], queryFn: () => api.get('/api/store/deals') });
  const deals: Deal[] = data?.deals ?? [];

  const open = (d: Deal) => {
    setActive(d);
    track(`deals/${d.id}/view`);
  };

  const fmt = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short' }) : null;

  return (
    <div className="relative min-h-screen pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={t('deals.title')} color="fitness-hero" textColor="text-white" />

      <div className="px-4">
        <p className="text-sm text-gray-500">{t('deals.subtitle')}</p>
        <div className="mt-2 flex items-start gap-2 rounded-2xl border border-gray-200 bg-white/70 p-3 text-[11px] leading-relaxed text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-blue" />
          <span>{t('deals.redeemNote')}</span>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : deals.length === 0 ? (
        <EmptyState icon={<Ticket size={40} />} title={t('deals.empty')} />
      ) : (
        <div className="mt-4 space-y-3 px-4">
          {deals.map((d, i) => (
            <motion.button
              key={d.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
              whileTap={tap}
              onClick={() => open(d)}
              className="card-hover flex w-full gap-3 overflow-hidden rounded-2xl bg-white p-3 text-start shadow-sm"
            >
              <div className="relative shrink-0">
                <MediaImage path={d.image} label={d.title} className="h-20 w-20 rounded-xl" />
                {d.discount && (
                  <span className="absolute -top-1 -start-1 rounded-full bg-brand-pink px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                    {d.discount}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold leading-snug">{d.title}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <MediaImage path={d.partner?.logo} label={d.partner?.name} className="h-4 w-4 shrink-0 rounded" />
                  <span className="truncate text-xs text-gray-400">{d.partner?.name}</span>
                </div>
                {d.validUntil && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                    <Clock size={11} /> {t('deals.validUntil', { date: fmt(d.validUntil) })}
                  </p>
                )}
                {d.code && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-pink/10 px-2 py-0.5 text-[10px] font-bold text-brand-pink">
                    <Ticket size={10} /> {t('deals.showCode')}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {active && <DealSheet deal={active} onClose={() => setActive(null)} />}
    </div>
  );
}
