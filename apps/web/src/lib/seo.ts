import { useEffect } from 'react';

/**
 * Per-page SEO for content pages. Google renders JS, so a dynamic title,
 * description and JSON-LD are enough for indexing the 200+ article/recipe
 * pages — no SSR needed. (Social scrapers don't run JS; they get the static
 * site-level OG tags from index.html instead.)
 */
export function usePageMeta(opts: {
  title?: string;
  description?: string;
  /** schema.org JSON-LD object, e.g. Article or Recipe. */
  jsonLd?: Record<string, unknown>;
}) {
  useEffect(() => {
    const prevTitle = document.title;
    if (opts.title) document.title = `${opts.title} — PULSE`;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.content;
    if (opts.description && meta) meta.content = opts.description.slice(0, 300);

    let script: HTMLScriptElement | null = null;
    if (opts.jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(opts.jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== undefined) meta.content = prevDesc;
      script?.remove();
    };
    // Stringified deps: callers pass fresh objects every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.title, opts.description, JSON.stringify(opts.jsonLd ?? null)]);
}
