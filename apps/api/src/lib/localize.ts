import { Request, Response, NextFunction } from 'express';

/**
 * Walks any API payload and resolves bilingual fields.
 * - Always strips `*Ar` companion keys from the output.
 * - When lang==='ar', overlays each non-empty `*Ar` value onto its base key.
 */
export function localize<T>(data: T, lang: string): T {
  return walk(data, lang) as T;
}

function walk(node: any, lang: string): any {
  if (Array.isArray(node)) return node.map((n) => walk(n, lang));
  if (node && typeof node === 'object' && !(node instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      if (k.endsWith('Ar')) continue;
      out[k] = walk(v, lang);
    }
    if (lang === 'ar') {
      for (const [k, v] of Object.entries(node)) {
        if (k.endsWith('Ar') && v != null && v !== '') {
          out[k.slice(0, -2)] = walk(v, lang);
        }
      }
    }
    return out;
  }
  return node;
}

export function pickLang(req: Request): 'en' | 'ar' {
  const q = (req.query.lang as string) || (req.headers['x-lang'] as string) || '';
  return q === 'ar' ? 'ar' : 'en';
}

/**
 * Express middleware: auto-localizes every res.json() body for the request locale.
 *
 * NOTE: this is mounted on `/api`, so it patches res.json for every route mounted
 * after it — including the admin API. Admin editors must receive the RAW row with
 * its `*Ar` fields intact (otherwise every Arabic input renders empty and saving
 * would wipe the translations), so admin requests are explicitly skipped.
 */
export function localizeResponse(req: Request, res: Response, next: NextFunction) {
  if ((req.originalUrl || req.url).startsWith('/api/admin')) return next();
  const lang = pickLang(req);
  const original = res.json.bind(res);
  res.json = (body: any) => original(localize(body, lang));
  next();
}
