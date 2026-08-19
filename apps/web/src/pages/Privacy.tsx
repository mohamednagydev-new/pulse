import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * Privacy policy — required by Google Play (and simply owed to users).
 * Static, guest-readable, bilingual. Legal-plain, not legal-heavy: it states
 * exactly what the app actually does with data, nothing aspirational.
 */
export default function Privacy() {
  const { i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const L = (en: string, ar: string) => (isAr ? ar : en);

  const S = ({ t, children }: { t: string; children: React.ReactNode }) => (
    <section className="mt-5">
      <h2 className="text-base font-extrabold">{t}</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{children}</p>
    </section>
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-gray-400">
        <ChevronLeft size={16} className="rtl:rotate-180" /> {L('Home', 'الرئيسية')}
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold">{L('Privacy Policy', 'سياسة الخصوصية')}</h1>
      <p className="mt-1 text-xs text-gray-400">{L('Last updated: August 2026', 'آخر تحديث: أغسطس ٢٠٢٦')}</p>

      <S t={L('What we collect', 'إيه اللي بنجمعه')}>
        {L(
          'Your account details (name, email, optional phone), your fitness profile (goal, level, height/weight if you enter them), and what you log in the app: workouts, sets, food entries, weight, water, and your posts and messages in the community.',
          'بيانات حسابك (الاسم، الإيميل، رقم الموبايل اختياري)، وبروفايلك الرياضي (هدفك، مستواك، طولك ووزنك لو دخلتهم)، واللي بتسجله في التطبيق: تمارينك ومجموعاتك، أكلك، وزنك، مياهك، وبوستاتك ورسايلك في المجتمع.',
        )}
      </S>
      <S t={L('What we use it for', 'بنستخدمها في إيه')}>
        {L(
          'To run the app for you: build your plan, compute your calorie targets, show your progress, and power the social features you choose to use (leaderboards show your first name, level and points to other members). We do not sell your data to anyone.',
          'عشان التطبيق يشتغل ليك: نبني خطتك، نحسب سعراتك، نعرض تقدمك، ونشغّل المميزات الاجتماعية اللي انت بتختارها (لوحات الصدارة بتعرض اسمك الأول ومستواك ونقطك لباقي الأعضاء). احنا مش بنبيع بياناتك لأي حد.',
        )}
      </S>
      <S t={L('AI features', 'مميزات الذكاء الاصطناعي')}>
        {L(
          'If you use the AI coach, meal photo, or food-description features, the text or photo you submit is sent to our AI provider (OpenAI) to generate the answer, then the answer is stored in your log. Photos are not used to train models.',
          'لو استخدمت كوتش الـAI أو صورة الأكل أو وصف الأكل، النص أو الصورة بتتبعت لمزوّد الذكاء الاصطناعي (OpenAI) عشان يطلع الإجابة، وبعدها الإجابة بتتسجل في سجلك. الصور مش بتستخدم في تدريب النماذج.',
        )}
      </S>
      <S t={L('Health data is yours', 'بياناتك الصحية ملكك')}>
        {L(
          'Your food diary, weight history, body measurements and progress photos are private to your account. Coaches you explicitly connect with can see your workout activity and weight trend — never your food diary.',
          'سجل أكلك وتاريخ وزنك وقياساتك وصور تقدمك خاصة بحسابك انت بس. المدرب اللي انت بنفسك تتوصل بيه يقدر يشوف نشاط تمرينك ومنحنى وزنك — إنما سجل أكلك لأ، أبدًا.',
        )}
      </S>
      <S t={L('Notifications & cookies', 'الإشعارات والكوكيز')}>
        {L(
          'Push notifications are opt-in and can be turned off any time in Settings. We use a session cookie to keep you signed in, and anonymous usage counters to understand which screens are used.',
          'الإشعارات باختيارك وتقدر تقفلها في أي وقت من الإعدادات. بنستخدم كوكي للجلسة عشان تفضل مسجّل دخول، وعدادات استخدام مجهولة عشان نفهم الشاشات اللي بتتستخدم.',
        )}
      </S>
      <S t={L('Delete your data', 'امسح بياناتك')}>
        {L(
          'You can delete your account from Settings; this removes your profile and personal logs. For any privacy question or a manual deletion request, contact us in-app via Support or at the address below.',
          'تقدر تمسح حسابك من الإعدادات؛ ده بيشيل بروفايلك وسجلاتك الشخصية. لأي سؤال عن الخصوصية أو طلب مسح يدوي، كلمنا من الدعم جوه التطبيق أو على العنوان اللي تحت.',
        )}
      </S>
      <S t={L('Contact', 'تواصل')}>
        mohamed.nagy.dev@gmail.com · pulse.geddo.online
      </S>
    </div>
  );
}
