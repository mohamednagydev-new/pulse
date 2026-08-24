import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/auth';

/** Public page — Google Play's Data safety form requires a web URL where users
 *  can learn how to delete their account. The deletion itself stays in-app
 *  (Settings → Delete my account, password-confirmed). */
export default function DeleteAccount() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);
  const authed = useAuth((s) => s.status) === 'authed';

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 py-10 text-ink">
      <div className="flex items-center gap-2">
        <img src="/pwa-192.png" alt="PULSE" className="h-9 w-9 rounded-xl" />
        <span className="text-xl font-extrabold italic">PULSE</span>
      </div>
      <h1 className="mt-6 text-2xl font-extrabold">{L('Delete your account', 'حذف حسابك')}</h1>
      <p className="mt-3 text-sm text-gray-600">
        {L(
          'Deleting your PULSE account removes your profile, workout history, food logs, photos and community posts. This cannot be undone.',
          'حذف حسابك من PULSE بيمسح بروفايلك وسجل تمارينك وأكلك وصورك وبوستاتك في المجتمع. الخطوة دي مش بترجع تاني.',
        )}
      </p>
      <ol className="mt-5 list-decimal space-y-2 ps-5 text-sm text-gray-700">
        <li>{L('Sign in to PULSE (app or browser).', 'ادخل على حسابك في PULSE (من التطبيق أو المتصفح).')}</li>
        <li>{L('Open Settings.', 'افتح الإعدادات.')}</li>
        <li>{L('Scroll down and tap “Delete my account”, then confirm with your password.', 'انزل تحت ودوس «احذف حسابي» وأكّد بكلمة السر.')}</li>
      </ol>
      {authed ? (
        <Link to="/info" className="btn-pill btn-primary mt-6 inline-block px-6 py-2.5 text-sm">
          {L('Open Settings', 'افتح الإعدادات')}
        </Link>
      ) : (
        <Link to="/login" className="btn-pill btn-primary mt-6 inline-block px-6 py-2.5 text-sm">
          {L('Sign in', 'دخول')}
        </Link>
      )}
      <p className="mt-8 text-xs text-gray-500">
        {L(
          'Can’t sign in? Email us from your registered address and we will delete the account manually: ',
          'مش قادر تدخل؟ ابعتلنا إيميل من عنوانك المسجّل وهنحذف الحساب يدوياً: ',
        )}
        <a href="mailto:pulse.growth.eg@gmail.com" className="font-semibold underline">pulse.growth.eg@gmail.com</a>
      </p>
      <p className="mt-2 text-xs text-gray-400">
        <Link to="/privacy" className="underline">{L('Privacy policy', 'سياسة الخصوصية')}</Link>
      </p>
    </div>
  );
}
