import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import CoverArt from './CoverArt';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Content-shaped loading placeholder — feels faster than a spinner. */
export function Loader({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label={label ?? t('common.loading')}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorMsg({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const msg = error instanceof Error ? error.message : t('common.somethingWrong');
  return (
    <div className="m-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
      {msg}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 block min-h-11 rounded-full bg-gray-100 px-6 font-semibold text-gray-700"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

/** One-stop gate for query-backed screens: skeleton while loading, retryable
 *  error when the request failed, an optional empty state, else the content. */
export function QueryGate({
  isLoading,
  isError,
  onRetry,
  empty,
  emptyState,
  children,
}: {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  empty?: boolean;
  emptyState?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) return <Loader />;
  if (isError) return <ErrorMsg onRetry={onRetry} />;
  if (empty) return <>{emptyState ?? null}</>;
  return <>{children}</>;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-8 py-20 text-center">
      {icon && (
        <div className="mb-1 text-gray-300">
          <span className="inline-block animate-float">{icon}</span>
        </div>
      )}
      <p className="font-semibold text-gray-600">{title}</p>
      {hint && <p className="text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-screen ${className}`}>{children}</div>;
}

export function formatDuration(sec?: number | null): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')} min`;
}

/** Renders an uploaded image, or auto-generated topic-themed cover art when none exists.
 *  `seed` is accepted for backward compatibility with existing call sites (unused). */
export function MediaImage({
  path,
  className = '',
  label,
}: {
  path?: string | null;
  seed?: number;
  className?: string;
  label?: string;
}) {
  if (path) {
    const src = path.startsWith('http') || path.startsWith('/') ? path : `/media/image/${path.replace(/^images\//, '')}`;
    return <img src={src} alt={label ?? ''} className={`object-cover ${className}`} loading="lazy" />;
  }
  // Round images are people: no photo → a deterministic fitness avatar (stable
  // per name), so nobody in the feed or Hall of Fame is a blank initial.
  if (className.includes('rounded-full')) {
    let h = 0;
    for (const ch of label ?? '') h = (h * 31 + ch.charCodeAt(0)) % 997;
    return <img src={`/avatars/a${(h % 24) + 1}.svg`} alt={label ?? ''} className={`object-cover ${className}`} loading="lazy" />;
  }
  // No uploaded image → auto-generated, topic-themed animated cover art (no uploads needed).
  return <CoverArt label={label} className={className} />;
}

/** Horizontal carousel that scrolls by touch swipe, mouse drag, AND mouse wheel. */
export function HScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, scroll: 0 });

  const onDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, scroll: el.scrollLeft };
  };
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || !drag.current.down) return;
    el.scrollLeft = drag.current.scroll - (e.pageX - drag.current.startX);
  };
  const stop = () => (drag.current.down = false);
  const onWheel = (e: React.WheelEvent) => {
    const el = ref.current;
    if (!el || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    el.scrollLeft += e.deltaY;
  };

  return (
    <div
      ref={ref}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={stop}
      onMouseLeave={stop}
      onWheel={onWheel}
      className="no-scrollbar flex cursor-grab gap-3 overflow-x-auto px-4 pb-1 active:cursor-grabbing"
      style={{ scrollSnapType: 'x proximity' }}
    >
      {children}
    </div>
  );
}
