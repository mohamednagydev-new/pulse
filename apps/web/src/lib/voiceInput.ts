/**
 * One-shot speech-to-text over the browser's built-in recognition
 * (Chrome/Android, desktop Chrome/Edge, iOS Safari 14.5+). No API keys, no
 * audio leaves through our servers — this is the free counter to
 * dialect-voice logging apps: the user says "طبق كشري" and the transcript
 * feeds the existing Arabic-normalised food search.
 */

export function voiceSupported(): boolean {
  return typeof window !== 'undefined'
    && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function listenOnce(
  lang: string,
  onInterim?: (text: string) => void,
): { promise: Promise<string>; cancel: () => void } {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  let settled = false;
  let finalText = '';
  const promise = new Promise<string>((resolve, reject) => {
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (e.results[e.results.length - 1]?.isFinal) finalText = text;
      onInterim?.(text.trim());
    };
    rec.onerror = (e: any) => {
      if (!settled) {
        settled = true;
        reject(new Error(e?.error || 'speech-failed'));
      }
    };
    // onend fires after silence or stop() — resolve with whatever was final.
    rec.onend = () => {
      if (!settled) {
        settled = true;
        resolve(finalText.trim());
      }
    };
    rec.start();
  });

  return {
    promise,
    cancel: () => { try { rec.stop(); } catch { /* already stopped */ } },
  };
}
