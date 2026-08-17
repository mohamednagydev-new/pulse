import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Copy, Gift, QrCode, Award, Building2, Check } from 'lucide-react';
import { api } from '../lib/api';
import { Loader } from '../components/ui';
import ScreenHeader from '../components/ScreenHeader';
import MenuDrawer from '../components/MenuDrawer';

const spring = { type: 'spring', stiffness: 260, damping: 24 } as const;

/**
 * One place for every link that brings people in — reachable from the burger
 * menu. Friends (referral) for everyone; the coach invite link for coaches;
 * the gym code for gym managers. Each card: link, copy, WhatsApp, QR.
 */
export default function MyInvite() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/api/me') });
  const { data: referral, isLoading } = useQuery({
    queryKey: ['referral'],
    queryFn: () => api.get('/api/me/referral'),
  });
  // Coaches: get-or-create the coach invite code (idempotent POST).
  const { data: coachCode } = useQuery({
    queryKey: ['coach-invite-code'],
    queryFn: () => api.post('/api/org/coach/code', {}),
    enabled: !!me?.isCoach,
    staleTime: Infinity,
  });
  // Gym managers: the endpoint 403s for everyone else — treat that as "hide".
  const { data: gymCode } = useQuery({
    queryKey: ['gym-invite-code'],
    queryFn: () => api.post('/api/org/gym/code', {}).catch(() => null),
    staleTime: Infinity,
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden pb-10">
      <ScreenHeader tone="pink" padBottom="pb-7">
        <div className="flex items-center gap-3">
          <MenuDrawer />
          <h1 className="min-w-0 truncate text-2xl font-extrabold">{L('Invite people', 'اعزم ناس')}</h1>
        </div>
      </ScreenHeader>

      <div className="space-y-4 px-4 pt-4">
        {isLoading && <Loader />}

        {referral?.link && (
          <InviteCard
            grad="from-emerald-500/90 to-teal-700/80"
            icon={<Gift size={20} />}
            title={L('Invite a friend', 'اعزم صاحبك')}
            sub={L(
              'They start with a gift streak-freeze — and you level up when they train.',
              'صاحبك يبدأ ومعاه فريز سلسلة هدية — وانت بتكسب لما يتمرن.',
            )}
            link={referral.link}
            waText={L(
              `Training with PULSE — free, in Egyptian Arabic, and it counts Egyptian food. Join me: ${referral.link}`,
              `أنا بتمرن على PULSE — مجاني وبالمصري وبيحسب أكلنا. انضملي من هنا: ${referral.link}`,
            )}
            isAr={isAr}
            footer={
              typeof referral?.invited === 'number' && referral.invited > 0
                ? L(`${referral.invited} joined from your link 🎉`, `${referral.invited} انضموا من لينكك 🎉`)
                : undefined
            }
          />
        )}

        {me?.isCoach && coachCode?.url && (
          <InviteCard
            grad="from-blue-500/90 to-indigo-700/80"
            icon={<Award size={20} />}
            title={L('Your coach link', 'لينك المدرب بتاعك')}
            sub={L(
              'A trainee who registers through it lands already connected to you as a client.',
              'أي متدرب يسجّل منه يوصل متوصّل بيك كعميل على طول.',
            )}
            link={coachCode.url}
            waText={L(
              `I coach on PULSE now — register from my link and you land connected to me directly: ${coachCode.url}`,
              `أنا بدرّب على PULSE — سجّل من اللينك ده وهتلاقي نفسك متوصّل بيا على طول: ${coachCode.url}`,
            )}
            isAr={isAr}
          />
        )}

        {gymCode?.url && (
          <InviteCard
            grad="from-teal-500/90 to-cyan-700/80"
            icon={<Building2 size={20} />}
            title={L('Your gym code', 'كود الجيم بتاعك')}
            sub={L(
              'Members who join through it appear on your gym leaderboard and TV board.',
              'الأعضاء اللي ينضموا منه يظهروا في لوحة صدارة الجيم وشاشة العرض.',
            )}
            link={gymCode.url}
            waText={L(
              `Join our gym on PULSE — every workout counts and your name goes on the gym screen: ${gymCode.url}`,
              `انضم لجيمنا على PULSE — كل تمرينة بتتحسب واسمك يطلع على شاشة الجيم: ${gymCode.url}`,
            )}
            isAr={isAr}
          />
        )}
      </div>
    </div>
  );
}

function InviteCard({
  grad, icon, title, sub, link, waText, isAr, footer,
}: {
  grad: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  link: string;
  waText: string;
  isAr: boolean;
  footer?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={spring}
      className={`scene-tex rounded-2xl bg-gradient-to-br ${grad} p-4 text-white shadow-md`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">{icon}</span>
        <div className="min-w-0">
          <p className="font-extrabold">{title}</p>
          <p className="text-[12px] leading-snug text-white/85">{sub}</p>
        </div>
      </div>

      <p dir="ltr" className="mt-3 truncate rounded-xl bg-black/25 px-3 py-2 text-center text-xs font-semibold">
        {link}
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={copy}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-white/20 text-xs font-bold"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? L('Copied', 'اتنسخ') : L('Copy', 'انسخ')}
        </motion.button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-white text-xs font-extrabold text-emerald-700"
        >
          واتساب
        </a>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowQr((v) => !v)}
          className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-full bg-white/20 text-xs font-bold"
        >
          <QrCode size={14} /> QR
        </motion.button>
      </div>

      {showQr && (
        <div className="mt-3 flex justify-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`}
            alt="QR"
            className="h-44 w-44 rounded-2xl bg-white p-2"
          />
        </div>
      )}

      {footer && <p className="mt-2.5 text-center text-xs font-bold text-white/90">{footer}</p>}
    </motion.section>
  );
}
