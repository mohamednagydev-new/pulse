/** Voice coaching via the browser's speech synthesis — a real coach in the session.
 *  Best-effort: silently no-ops where unsupported, respects the user's toggle,
 *  and speaks Arabic when the app is in Arabic. */

const KEY = 'pulse_voice_on';

export function voiceEnabled(): boolean {
  return localStorage.getItem(KEY) === '1';
}
export function setVoiceEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? '1' : '0');
  if (!on) cancel();
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function cancel() {
  try { if (supported()) window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

/** Speak a line. `lang` should be the app language ('en' | 'ar'). */
export function say(text: string, lang = 'en') {
  if (!supported() || !voiceEnabled() || !text) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang.startsWith('ar') ? 'ar-EG' : 'en-US';
    u.rate = 1.02;
    u.pitch = 1;
    u.volume = 1;
    // Prefer a matching installed voice when one exists.
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)));
    if (match) u.voice = match;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

/** Coaching lines, bilingual. Kept here so the session screen stays clean. */
export const COACH_LINES = {
  start: { en: 'Let’s go!', ar: 'يلا بينا!' },
  exercise: { en: (name: string) => `Next: ${name}`, ar: (name: string) => `الجاي: ${name}` },
  halfway: { en: 'Halfway there', ar: 'نصف الطريق' },
  lastSet: { en: 'Last set — push!', ar: 'آخر مجموعة — اضغط!' },
  rest: { en: 'Rest', ar: 'راحة' },
  restOver: { en: 'Time — let’s move', ar: 'خلاص — يلا نكمل' },
  countdown: { en: (n: number) => String(n), ar: (n: number) => String(n) },
  pr: { en: 'New personal record!', ar: 'رقم قياسي جديد!' },
  done: { en: 'Workout complete. Great job!', ar: 'التمرين خلص. تحفة!' },
};

export function coach(key: keyof typeof COACH_LINES, lang = 'en', arg?: any) {
  const line = COACH_LINES[key] as any;
  const isAr = lang.startsWith('ar');
  const v = isAr ? line.ar : line.en;
  say(typeof v === 'function' ? v(arg) : v, lang);
}
