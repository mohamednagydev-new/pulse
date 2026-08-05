import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, PhoneCall, X } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import { successFeedback, tapFeedback } from '../lib/haptics';

interface Form {
  id: string;
  kind: string;
  title: string; titleAr?: string | null;
  description?: string | null; descriptionAr?: string | null;
  question?: string | null; questionAr?: string | null;
  cta?: string | null; ctaAr?: string | null;
  partner?: { id: string; name: string; nameAr?: string | null } | null;
}

const KIND_ICON: Record<string, string> = {
  trial: '🎟️', consult: '💬', quote: '🧾', membership: '🏋️', tour: '🚪',
};

/** Partner call-back requests. We collect a name and a phone number and hand them
 *  over — the partner takes it from there, off the platform. */
export default function LeadForms({ partnerId }: { partnerId?: string }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const [active, setActive] = useState<Form | null>(null);

  const { data } = useQuery<Form[]>({
    queryKey: ['lead-forms', partnerId ?? 'all'],
    queryFn: () => api.get(`/api/board/lead-forms${partnerId ? `?partnerId=${partnerId}` : ''}`),
    staleTime: 5 * 60_000,
  });

  const forms = data ?? [];
  if (forms.length === 0) return null;

  return (
    <>
      <div className="space-y-2.5">
        {forms.map((f, i) => (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 * i }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { tapFeedback(); setActive(f); }}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-start shadow-sm"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl" aria-hidden>
              {KIND_ICON[f.kind] ?? '📩'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{(isAr && f.titleAr) || f.title}</span>
              <span className="block truncate text-xs text-gray-400">
                {(isAr && f.descriptionAr) || f.description}
              </span>
            </span>
            <PhoneCall size={16} className="shrink-0 text-orange-500" />
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {active && <LeadSheet form={active} isAr={isAr} t={t} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </>
  );
}

function LeadSheet({
  form, isAr, t, onClose,
}: { form: Form; isAr: boolean; t: (k: string, o?: any) => string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: () => api.post(`/api/board/lead-forms/${form.id}/submit`, { name, phone, city, note }),
    onSuccess: () => { successFeedback(); setSent(true); },
    onError: (e: any) => toast(e?.message ?? t('lead.failed'), 'error'),
  });

  const valid = name.trim().length >= 2 && phone.trim().length >= 6;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        {sent ? (
          <div className="py-8 text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <CheckCircle2 size={52} className="mx-auto text-brand-green" />
            </motion.div>
            <h3 className="mt-3 text-lg font-extrabold">{t('lead.sentTitle')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('lead.sentBody', { partner: (isAr && form.partner?.nameAr) || form.partner?.name || '' })}
            </p>
            <button onClick={onClose} className="mt-5 min-h-[44px] w-full rounded-xl bg-gray-100 text-sm font-bold text-gray-600 active:scale-95">
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold leading-snug">{(isAr && form.titleAr) || form.title}</h3>
                {form.partner && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {(isAr && form.partner.nameAr) || form.partner.name}
                  </p>
                )}
              </div>
              <button onClick={onClose} aria-label={t('common.close')} className="shrink-0 rounded-full p-1 text-gray-400 active:scale-90">
                <X size={20} />
              </button>
            </div>

            {(form.descriptionAr || form.description) && (
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {(isAr && form.descriptionAr) || form.description}
              </p>
            )}

            <div className="mt-4 space-y-3">
              <Field label={t('lead.name')} value={name} onChange={setName} placeholder={t('lead.namePh')} />
              <Field label={t('lead.phone')} value={phone} onChange={setPhone} placeholder={t('lead.phonePh')} type="tel" dir="ltr" />
              <Field label={t('lead.city')} value={city} onChange={setCity} placeholder={t('lead.cityPh')} />

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-500">
                  {(isAr && form.questionAr) || form.question || t('lead.note')}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={t('lead.notePh')}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
                />
              </label>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-gray-400">{t('lead.privacy')}</p>

            <button
              onClick={() => submit.mutate()}
              disabled={!valid || submit.isPending}
              className="mt-3 min-h-[48px] w-full rounded-xl bg-orange-500 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50"
            >
              {submit.isPending ? t('lead.sending') : (isAr && form.ctaAr) || form.cta || t('lead.send')}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', dir,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; dir?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-500">{label}</span>
      <input
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
      />
    </label>
  );
}
