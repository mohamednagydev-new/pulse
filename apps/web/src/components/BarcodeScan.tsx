import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Minus, Plus, ScanBarcode, Search } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

/**
 * Scan a supermarket barcode → nutrition per 100g + a 1–10 "fits your goal"
 * score (Open Food Facts, scored server-side against the user's fitnessGoal).
 * Live camera scanning uses the BarcodeDetector API (Android Chrome); iOS
 * Safari doesn't have it, so the typed-code fallback is always present.
 */

type Result = {
  code: string;
  name: string;
  brand: string | null;
  servingSize: string | null;
  per100g: { kcal: number; protein: number; carbs: number; fat: number; sugars: number };
  score: number;
  advice: { en: string; ar: string };
};

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function BarcodeScan({ onClose, date }: { onClose: () => void; date?: string }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const ar = i18n.language.startsWith('ar');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopped = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grams, setGrams] = useState(100);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>('snack');

  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const stopCamera = () => {
    stopped.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };
  useEffect(() => () => stopCamera(), []);

  const lookup = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.get(`/api/meals/barcode/${code}`);
      setResult(r);
      setGrams(100);
    } catch (e: any) {
      setError(e?.message === 'Product not found' ? t('barcode.notFound') : t('barcode.lookupFail'));
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      stopped.current = false;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      });
      const tick = async () => {
        if (stopped.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0 && /^\d{6,14}$/.test(codes[0].rawValue)) {
            stopCamera();
            void lookup(codes[0].rawValue);
            return;
          }
        } catch {
          /* keep trying */
        }
        setTimeout(tick, 220);
      };
      void tick();
    } catch {
      setError(t('barcode.cameraDenied'));
      stopCamera();
    }
  };

  const log = useMutation({
    mutationFn: () => {
      const f = grams / 100;
      const p = result!.per100g;
      return api.post('/api/tracker/calories', {
        name: result!.name,
        calories: Math.round(p.kcal * f),
        protein: Math.round(p.protein * f),
        carbs: Math.round(p.carbs * f),
        fat: Math.round(p.fat * f),
        mealType: slot,
        ...(date ? { date } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-day'] });
      qc.invalidateQueries({ queryKey: ['quests'] });
      toast(t('barcode.logged'), 'success');
      onClose();
    },
  });

  const scoreColor = (s: number) => (s >= 7 ? 'bg-emerald-500' : s >= 4 ? 'bg-amber-500' : 'bg-red-500');

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {/* Camera scan (Android) or the always-available typed code (iOS too) */}
      {!result && (
        <>
          {supported && !scanning && (
            <button onClick={startScan} className="btn-pill btn-primary flex min-h-[44px] w-full items-center justify-center gap-2">
              <ScanBarcode size={17} /> {t('barcode.scan')}
            </button>
          )}
          <video ref={videoRef} playsInline muted className={`mt-3 w-full rounded-2xl bg-black ${scanning ? 'block' : 'hidden'}`} style={{ maxHeight: 260 }} />
          {scanning && <p className="mt-2 animate-pulse text-center text-xs text-gray-400">{t('barcode.scanning')}</p>}

          <div className="mt-3 flex items-center gap-2">
            <input
              inputMode="numeric"
              pattern="\d*"
              className="min-w-0 flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-sm outline-none"
              placeholder={t('barcode.manualPh')}
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
            />
            <button
              onClick={() => manual.length >= 6 && lookup(manual)}
              disabled={busy || manual.length < 6}
              aria-label={t('common.search', { defaultValue: 'Search' })}
              className="btn-pill btn-primary flex h-[42px] w-[42px] shrink-0 items-center justify-center p-0 disabled:opacity-50"
            >
              <Search size={16} />
            </button>
          </div>
          {!supported && <p className="mt-2 text-center text-[11px] text-gray-400">{t('barcode.iosHint')}</p>}
          {busy && <p className="py-6 text-center text-sm text-gray-400">…</p>}
          {error && <p className="py-4 text-center text-sm text-red-500">{error}</p>}
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-3">
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white ${scoreColor(result.score)}`}>
              <span className="text-lg font-extrabold leading-none">{result.score}</span>
              <span className="text-[9px]">/10</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-bold">{result.name}</p>
              {result.brand && <p className="text-[11px] text-gray-400">{result.brand}</p>}
              <p className="mt-1 text-xs font-semibold">{ar ? result.advice.ar : result.advice.en}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-1 rounded-xl bg-gray-50 p-2.5 text-center">
            {([
              [result.per100g.kcal, 'kcal'],
              [result.per100g.protein, t('barcode.protein')],
              [result.per100g.carbs, t('barcode.carbs')],
              [result.per100g.fat, t('barcode.fat')],
              [result.per100g.sugars, t('barcode.sugar')],
            ] as const).map(([v, l]) => (
              <div key={l}>
                <p className="text-sm font-bold">{v}</p>
                <p className="text-[9px] text-gray-400">{l}</p>
              </div>
            ))}
          </div>
          <p className="mt-1 text-center text-[10px] text-gray-400">{t('barcode.per100')}{result.servingSize ? ` · ${t('barcode.serving')}: ${result.servingSize}` : ''}</p>

          {/* How much did you eat? */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span className="text-xs font-bold text-gray-500">{t('barcode.grams')}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setGrams((g) => Math.max(25, g - 25))} aria-label="-" className="rounded-full border border-gray-200 p-1.5"><Minus size={13} /></button>
              <span className="w-12 text-center text-sm font-bold" dir="ltr">{grams}g</span>
              <button onClick={() => setGrams((g) => Math.min(1000, g + 25))} aria-label="+" className="rounded-full border border-gray-200 p-1.5"><Plus size={13} /></button>
            </div>
          </div>

          <div className="mt-2 flex gap-1.5">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`min-h-9 flex-1 rounded-full px-1 text-[11px] font-bold ${slot === s ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-500'}`}
              >
                {t(`meals.${s}`)}
              </button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => log.mutate()}
            disabled={log.isPending}
            className="btn-pill btn-primary mt-3 min-h-[44px] w-full disabled:opacity-60"
          >
            {t('barcode.log', { kcal: Math.round((result.per100g.kcal * grams) / 100) })}
          </motion.button>
          <button onClick={() => { setResult(null); setManual(''); }} className="mt-2 w-full text-center text-xs font-bold text-gray-400">
            {t('barcode.again')}
          </button>
        </motion.div>
      )}
    </div>
  );
}
