import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Info, MessageCircle, Phone, Globe, ChevronRight, ShoppingBag, X, Ticket } from 'lucide-react';
import { api } from '../lib/api';
import { priceLabel } from '../lib/money';
import { Loader, MediaImage, HScroll, EmptyState } from '../components/ui';
import Sheet from '../components/Sheet';
import TopBar from '../components/TopBar';
import AmbientBg from '../components/AmbientBg';

export interface StorePartner {
  id: string;
  type: string;
  name: string;
  tagline?: string | null;
  logo?: string | null;
  cover?: string | null;
  city?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  instagram?: string | null;
  mapUrl?: string | null;
  featured?: boolean;
  country?: string | null;
  currency?: string | null;
}
export interface StoreProduct {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  image?: string | null;
  priceAmount?: number | null;
  oldPriceAmount?: number | null;
  price?: string | null;
  oldPrice?: string | null;
  badge?: string | null;
  url?: string | null;
  partner: StorePartner;
}

const tap = { scale: 0.97 } as const;

/** A product is priced in its partner's currency — that is what you would actually
 *  hand over at the counter. No conversion: see lib/money.ts. */
const priceOf = (p: StoreProduct, lang: string) =>
  priceLabel({ amount: p.priceAmount, display: p.price, currency: p.partner?.currency }, lang);

const wasPriceOf = (p: StoreProduct, lang: string) =>
  priceLabel({ amount: p.oldPriceAmount, display: p.oldPrice, currency: p.partner?.currency }, lang);

/** Fire-and-forget contact/view tracking so partners get real reporting. */
export const trackStore = (path: string) => { api.post(`/api/store/${path}`).catch(() => {}); };

/** Product detail sheet with the offline contact actions (WhatsApp / call / link). */
export function ProductSheet({ product, onClose }: { product: StoreProduct; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const p = product.partner;

  const open = (url: string) => {
    trackStore(`products/${product.id}/contact`);
    window.open(url, '_blank', 'noopener');
  };
  const waText = encodeURIComponent(`${product.title} — PULSE`);

  return (
    <Sheet open onClose={onClose} label={product.title}>
      <div className="pb-8">
        <div className="relative">
          <MediaImage path={product.image} label={product.title} className="h-52 w-full" />
          <button onClick={onClose} aria-label={t('common.close')} className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
            <X size={18} />
          </button>
          {product.badge && (
            <span className="absolute start-3 top-3 rounded-full bg-brand-pink px-2.5 py-1 text-xs font-bold text-white">{product.badge}</span>
          )}
        </div>

        <div className="space-y-3 p-5">
          <h2 className="text-lg font-extrabold leading-snug">{product.title}</h2>
          {(priceOf(product, lang) || wasPriceOf(product, lang)) && (
            <div className="flex items-baseline gap-2">
              {priceOf(product, lang) && (
                <span className="text-xl font-extrabold text-brand-pink">{priceOf(product, lang)}</span>
              )}
              {wasPriceOf(product, lang) && (
                <span className="text-sm text-gray-400 line-through">{wasPriceOf(product, lang)}</span>
              )}
            </div>
          )}
          {product.description && <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>}

          <button onClick={() => navigate(`/partner/${p.id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 p-3 text-start">
            <MediaImage path={p.logo} label={p.name} className="h-10 w-10 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{p.name}</span>
              <span className="block truncate text-xs text-gray-400">{p.city || t('store.partnerOf')}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-gray-300 rtl:rotate-180" />
          </button>

          <div className="space-y-2 pt-1">
            {p.whatsapp && (
              <motion.button whileTap={tap} onClick={() => open(`https://wa.me/${p.whatsapp}?text=${waText}`)} className="btn-pill btn-green w-full">
                <MessageCircle size={16} /> {t('store.whatsapp')}
              </motion.button>
            )}
            <div className="flex gap-2">
              {p.phone && (
                <motion.button whileTap={tap} onClick={() => open(`tel:${p.phone}`)} className="btn-pill btn-ghost flex-1">
                  <Phone size={16} /> {t('store.call')}
                </motion.button>
              )}
              {(product.url || p.website) && (
                <motion.button whileTap={tap} onClick={() => open((product.url || p.website)!)} className="btn-pill btn-ghost flex-1">
                  <Globe size={16} /> {t('store.website')}
                </motion.button>
              )}
            </div>
          </div>

          <p className="pt-1 text-center text-[11px] leading-relaxed text-gray-400">{t('store.offlineNote')}</p>
        </div>
      </div>
    </Sheet>
  );
}

/** Grid card used by the store and partner pages. */
export function ProductCard({ product, onOpen, index = 0 }: { product: StoreProduct; onOpen: () => void; index?: number }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.24) }}
      whileTap={tap}
      onClick={onOpen}
      className="card-hover overflow-hidden rounded-2xl bg-white text-start shadow-sm"
    >
      <div className="relative">
        <MediaImage path={product.image} label={product.title} className="h-32 w-full" />
        {product.badge && (
          <span className="absolute start-2 top-2 rounded-full bg-brand-pink px-2 py-0.5 text-[10px] font-bold text-white">{product.badge}</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</p>
        {(priceOf(product, lang) || wasPriceOf(product, lang)) && (
          <p className="mt-1 flex items-baseline gap-1.5">
            {priceOf(product, lang) && (
              <span className="text-sm font-extrabold text-brand-pink">{priceOf(product, lang)}</span>
            )}
            {wasPriceOf(product, lang) && (
              <span className="text-[11px] text-gray-400 line-through">{wasPriceOf(product, lang)}</span>
            )}
          </p>
        )}
        <p className="mt-0.5 truncate text-[11px] text-gray-400">{product.partner?.name}</p>
      </div>
    </motion.button>
  );
}

export default function Store() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [active, setActive] = useState<StoreProduct | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['store', category],
    queryFn: () => api.get(`/api/store${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  });

  const partners: StorePartner[] = data?.partners ?? [];
  const products: StoreProduct[] = data?.products ?? [];
  const categories: { key: string; count: number }[] = data?.categories ?? [];

  const openProduct = (p: StoreProduct) => {
    setActive(p);
    trackStore(`products/${p.id}/view`);
  };

  return (
    <div className="relative min-h-screen pb-10">
      <AmbientBg tone="warm" />
      <TopBar title={t('store.title')} color="fitness-hero" textColor="text-white" />

      <div className="px-4">
        <p className="text-sm text-gray-500">{t('store.subtitle')}</p>
        <div className="mt-2 flex items-start gap-2 rounded-2xl border border-gray-200 bg-white/70 p-3 text-[11px] leading-relaxed text-gray-500">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-blue" />
          <span>{t('store.offlineNote')}</span>
        </div>
      </div>

      {/* Deals entry */}
      <motion.button
        whileTap={tap}
        onClick={() => navigate('/deals')}
        className="card-hover mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-pink to-orange-500 p-4 text-start text-white shadow-lg"
      >
        <span className="animate-float flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
          <Ticket size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold">{t('deals.title')}</span>
          <span className="block truncate text-xs text-white/80">{t('deals.subtitle')}</span>
        </span>
        <ChevronRight className="shrink-0 opacity-80 rtl:rotate-180" />
      </motion.button>

      {/* Category chips */}
      {categories.length > 0 && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
          <button
            onClick={() => setCategory('')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${!category ? 'btn-primary text-white' : 'bg-white text-gray-600 shadow-sm'}`}
          >
            {t('store.all')}
          </button>
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${category === c.key ? 'btn-primary text-white' : 'bg-white text-gray-600 shadow-sm'}`}
            >
              {t(`store.${c.key}`)} · {c.count}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Loader />
      ) : (
        <>
          {/* Partners rail */}
          {partners.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 px-4 text-lg font-bold">{t('store.partners')}</h2>
              <HScroll>
                {partners.map((p) => (
                  <motion.button
                    key={p.id}
                    whileTap={tap}
                    onClick={() => navigate(`/partner/${p.id}`)}
                    className="w-40 shrink-0 rounded-2xl bg-white p-3 text-start shadow-sm"
                  >
                    <MediaImage path={p.logo} label={p.name} className="h-14 w-14 rounded-xl" />
                    <p className="mt-2 truncate text-sm font-bold">{p.name}</p>
                    {p.tagline && <p className="line-clamp-2 text-[11px] leading-tight text-gray-400">{p.tagline}</p>}
                    {p.city && <p className="mt-1 truncate text-[11px] text-gray-300">{p.city}</p>}
                  </motion.button>
                ))}
              </HScroll>
            </section>
          )}

          {/* Products */}
          <section className="mt-6 px-4">
            {products.length === 0 ? (
              <EmptyState icon={<ShoppingBag size={40} />} title={t('store.empty')} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} onOpen={() => openProduct(p)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {active && <ProductSheet product={active} onClose={() => setActive(null)} />}
    </div>
  );
}
