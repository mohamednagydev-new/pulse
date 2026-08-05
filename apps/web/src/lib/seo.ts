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

    // Canonical URL for the current page. There is no static canonical in
    // index.html (a site-wide "/" canonical would tell Google every page is
    // the homepage), so pages that set a title claim their own.
    let canonical: HTMLLinkElement | null = null;
    let createdCanonical = false;
    let prevCanonicalHref: string | null = null;
    if (opts.title) {
      canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canonical) {
        prevCanonicalHref = canonical.getAttribute('href');
      } else {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
        createdCanonical = true;
      }
      canonical.href = `https://pulse.geddo.online${window.location.pathname}`;
    }

    return () => {
      document.title = prevTitle;
      if (meta && prevDesc !== undefined) meta.content = prevDesc;
      script?.remove();
      if (canonical) {
        if (createdCanonical) canonical.remove();
        else if (prevCanonicalHref !== null) canonical.setAttribute('href', prevCanonicalHref);
      }
    };
    // Stringified deps: callers pass fresh objects every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.title, opts.description, JSON.stringify(opts.jsonLd ?? null)]);
}
