/**
 * PULSE's sound identity: a soft double heartbeat ("dum-dum") with a bright
 * ping — synthesized live via WebAudio, so no asset, no load, always crisp.
 * Played for in-app arrivals (notifications, chat). Background push sounds are
 * OS-controlled and can't be customized on the web platform.
 */

let ctx: AudioContext | null = null;

export function pulseChime(volume = 1) {
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    // resume() returns a promise that REJECTS on iOS when audio is unavailable
    // (NotSupportedError) — `void` let that rejection escape the try/catch and
    // land in analytics as an unhandled error on random pages.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const beat = (t: number, freq: number, dur: number, gain: number) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      const at = ctx!.currentTime + t;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain * volume, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(at);
      o.stop(at + dur + 0.03);
    };
    beat(0, 196, 0.11, 0.14); // dum
    beat(0.15, 196, 0.09, 0.11); // dum — the heartbeat pair
    beat(0.34, 784, 0.22, 0.05); // soft bright ping
  } catch {
    /* no audio context (old browser, autoplay policy) — silence is fine */
  }
}
