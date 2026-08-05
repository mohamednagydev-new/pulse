import { useState } from 'react';
import LeadForms from '../components/LeadForm';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, Globe, MapPin, Instagram, ShoppingBag, Info } from 'lucide-react';
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
