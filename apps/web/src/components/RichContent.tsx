import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Quote } from 'lucide-react';

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function splitParas(body: string): string[] {
  return String(body ?? '')
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Detect an inline "list-ish" paragraph (semicolon or bullet enumerations). */
function asBullets(p: string): string[] | null {
  if (/^[-•*]\s/m.test(p)) {
    return p.split(/\n/).map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  }
  const parts = p.split(/;\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3 && p.length < 320) return parts;
  return null;
}

/** Pick a short, punchy sentence from the body for a pull-quote. */
function pickQuote(paras: string[]): string | null {
  const sentences = paras.slice(1).join(' ').match(/[^.!?؟]+[.!?؟]/g) || [];
  const good = sentences.map((s) => s.trim()).filter((s) => s.length >= 45 && s.length <= 130);
  return good.length ? good[Math.floor(good.length / 2)] : null;
}

/** Turns a plain prose body into an interactive, animated, card-driven reading experience. */
export default function RichContent({ body }: { body: string }) {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || '').startsWith('ar');
  const paras = splitParas(body);
  if (!paras.length) return null;

  const [intro, ...rest] = paras;
  const quote = pickQuote(paras);
  const quoteAt = rest.length >= 3 ? Math.floor(rest.length / 2) : -1;

  return (
    <div className="mt-5 space-y-5">
      {/* Key takeaway */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-40px' }}
        variants={reveal}
        transition={{ duration: 0.45 }}
        className="rounded-2xl border border-brand-pink/30 bg-brand-pink/10 p-4"
      >
        <div className="mb-1.5 flex items-center gap-2 text-brand-pink">
          <Lightbulb size={16} />
          <span className="text-xs font-bold uppercase tracking-wide">{isAr ? 'الخلاصة' : 'Key takeaway'}</span>
        </div>
        <p className="text-[15px] font-medium leading-relaxed text-white/90">{intro}</p>
      </motion.div>

      {rest.map((p, i) => {
        const bullets = asBullets(p);
        return (
          <div key={i}>
            {i === quoteAt && quote && (
              <motion.blockquote
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-40px' }}
                variants={reveal}
                transition={{ duration: 0.5 }}
                className="my-6 border-s-4 border-brand-pink ps-4"
              >
                <Quote size={20} className="mb-1 text-brand-pink/70" />
                <p className="text-lg font-semibold leading-snug text-white">{quote}</p>
              </motion.blockquote>
            )}

            {bullets ? (
              <motion.ul
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-30px' }}
                variants={reveal}
                transition={{ duration: 0.4 }}
                className="space-y-2 rounded-2xl bg-white/5 p-4"
              >
                {bullets.map((b, k) => (
                  <li key={k} className="flex gap-2.5 text-[15px] leading-relaxed text-gray-200">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-pink" />
                    <span>{b}</span>
                  </li>
                ))}
              </motion.ul>
            ) : (
              <motion.p
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-30px' }}
                variants={reveal}
                transition={{ duration: 0.4 }}
                className="text-[15px] leading-relaxed text-gray-300"
              >
                {p}
              </motion.p>
            )}

            {/* Animated section rhythm — movement is the brand */}
            {i < rest.length - 1 && (i + 1) % 3 === 0 && (
              <div className="my-6 flex justify-center" aria-hidden>
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-brand-pink/60"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
