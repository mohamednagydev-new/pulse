import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, LifeBuoy, Send } from 'lucide-react';
import { api } from '../lib/api';

/** Contact form for people who are NOT signed in — stuck at login/register,
 *  OAuth trouble, or just a question before creating an account. Lands in the
 *  same admin support inbox as in-app tickets, marked Guest with their contact. */
export default function GuestContact() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const [form, setForm] = useState({ name: '', contact: '', subject: '', body: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post('/api/support/guest', form);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Could not send — try again.', 'ماقدرناش نبعت — جرّب تاني.'));
    } finally {
      setBusy(false);
    }
  };

  const FIELD = 'w-full rounded-2xl bg-gray-100 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-pink/40';

  return (
    <div className="fitness-hero relative flex min-h-screen flex-col text-white">
      <div className="flex items-center gap-2 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <Link to="/login" aria-label={L('Back', 'رجوع')}><ChevronLeft className="rtl:rotate-180" /></Link>
        <span className="text-xl font-extrabold italic">PULSE</span>
      </div>

      <div className="mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-white px-6 pb-10 pt-8 text-ink">
        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</span>
            <h1 className="mt-4 text-xl font-extrabold">{L('Message sent', 'رسالتك وصلت')}</h1>
            <p className="mt-2 max-w-xs text-sm text-gray-500">
              {L('Our team will get back to you on the contact you left. Thanks for reaching out!', 'فريقنا هيرد عليك على وسيلة التواصل اللي سيبتها. شكراً إنك كلمتنا!')}
            </p>
            <Link to="/login" className="btn-pill btn-primary mt-6 flex min-h-[44px] items-center justify-center px-8">
              {L('Back to login', 'ارجع لتسجيل الدخول')}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink"><LifeBuoy size={22} /></span>
              <div>
                <h1 className="text-xl font-extrabold">{L('Contact us', 'كلمنا')}</h1>
                <p className="text-xs text-gray-400">{L("Can't sign in? Have a question? We read everything.", 'مش عارف تسجّل؟ عندك سؤال؟ بنقرا كل حاجة.')}</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <input className={FIELD} placeholder={L('Your name (optional)', 'اسمك (اختياري)')} value={form.name} onChange={set('name')} />
              <input className={FIELD} placeholder={L('Email or phone — so we can reply', 'إيميل أو موبايل — عشان نرد عليك')} value={form.contact} onChange={set('contact')} required />
              <input className={FIELD} placeholder={L('Subject', 'الموضوع')} value={form.subject} onChange={set('subject')} required />
              <textarea className={`${FIELD} min-h-32 resize-none`} placeholder={L('Tell us what happened…', 'احكيلنا حصل إيه…')} value={form.body} onChange={set('body')} required />

              {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}

              <button type="submit" disabled={busy} className="btn-pill btn-primary flex min-h-[48px] w-full items-center justify-center gap-2 disabled:opacity-60">
                <Send size={16} /> {busy ? L('Sending…', 'بيتبعت…') : L('Send', 'ابعت')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
