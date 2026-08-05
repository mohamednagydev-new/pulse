/** Haptics + tiny synth sounds for milestone moments. All best-effort:
 *  vibration is Android-only (iOS ignores it), audio needs a prior user gesture.
 *  Respects prefers-reduced-motion for vibration patterns. */

function reduced() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function vibrate(pattern: number | number[]) {
  try {
    if (!reduced() && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      ctx = new Ctx();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Play a short tone sequence: [freqHz, durMs, delayMs][] */
function tones(seq: [number, number, number][], volume = 0.08) {
  const c = audio();
  if (!c) return;
  for (const [freq, dur, delay] of seq) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = c.currentTime + delay / 1000;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(volume, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / 1000);
    o.start(t0);
    o.stop(t0 + dur / 1000 + 0.05);
  }
}

/** Light tick — button-level feedback (cheer, favorite, check-off). */
export function tapFeedback() {
  vibrate(12);
}

/** Exercise done / step complete. */
export function successFeedback() {
  vibrate([18, 40, 24]);
  tones([[660, 120, 0], [880, 160, 110]]);
}

/** Big moment: PR, level-up, session complete, badge. */
export function celebrateFeedback() {
  vibrate([30, 60, 30, 60, 60]);
  tones([[523, 130, 0], [659, 130, 120], [784, 130, 240], [1047, 260, 360]], 0.09);
}

/** Streak milestone (kept subtler than celebrate). */
export function streakFeedback() {
  vibrate([20, 50, 20]);
  tones([[587, 140, 0], [880, 200, 130]]);
}
