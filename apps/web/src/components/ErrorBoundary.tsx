import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Last-resort catch for render-time throws. Without it a single component error
 * blanks the entire app with no way back except a manual URL edit. Kept
 * deliberately dependency-free (no router, no i18n) so it cannot itself throw.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
    // Screen path in the report: "n is not a function" alone is unactionable —
    // "@/challenge/xyz" tells us WHERE real devices crashed.
    const where = window.location.pathname.slice(0, 60);
    // Lazy import keeps this file dependency-free unless a crash actually happens.
    import('../lib/track').then(({ track }) => track('client-error', `boundary@${where}: ${error.message}`.slice(0, 200))).catch(() => {});

    // Self-heal the deploy-seam crash: right after an update the service worker
    // can serve a stale chunk next to new code — hook counts mismatch (React
    // #300/#310) or a dynamic import 404s, and ONE hard reload fixes it. Reload
    // automatically, at most once per 5 minutes so a genuine bug can't loop.
    const msg = error.message || '';
    const deploySeam = /#3[01]0|Loading chunk|dynamically imported module|Importing a module script failed/i.test(msg);
    const last = Number(sessionStorage.getItem('eb_reload_at') || 0);
    if (deploySeam && Date.now() - last > 5 * 60 * 1000) {
      sessionStorage.setItem('eb_reload_at', String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const ar = (localStorage.getItem('fitit_lang') || 'en') === 'ar';
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-5xl">😵</p>
        <p className="text-lg font-bold text-gray-900">
          {ar ? 'حصلت مشكلة غير متوقعة' : 'Something went wrong'}
        </p>
        <p className="text-sm text-gray-500">
          {ar ? 'جرّب ترجع للرئيسية — بياناتك متأثرتش.' : 'Try going back home — your data is safe.'}
        </p>
        <button
          onClick={() => {
            this.setState({ error: null });
            window.location.href = '/';
          }}
          className="btn-pill btn-primary min-h-11 px-8"
        >
          {ar ? 'الرئيسية' : 'Go home'}
        </button>
      </div>
    );
  }
}
