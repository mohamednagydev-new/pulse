/**
 * Auto-translation helper.
 *
 * Translates English content into SIMPLE, EVERYDAY SPOKEN EGYPTIAN ARABIC using
 * OpenAI (same model/env as the rest of the app). Designed to be safe for use in
 * request handlers: `translateFields` NEVER throws — if the API key is missing or
 * the call fails, it logs a warning and returns the original strings unchanged.
 */
import { openai, CHAT_MODEL } from './openai';

/** The Egyptian-dialect instruction, shared with prisma/translate.ts. */
export const EGYPTIAN_SYSTEM_PROMPT =
  'You translate content for a fitness & wellness app into SIMPLE, EVERYDAY SPOKEN EGYPTIAN ARABIC (اللهجة المصرية العامية البسيطة). Use the natural, friendly, easy words an ordinary Egyptian would actually say in daily life — like you are talking to a friend. Do NOT use formal Modern Standard Arabic (فصحى) and do NOT be stiff, bookish, or literary. Keep it warm, casual, and clear. Keep numbers, units and measurements as they are. Translate each English string in order. Return JSON: {"items": string[]} in the SAME order and length as the input.';

/**
 * Translate a batch of strings to simple spoken Egyptian Arabic, preserving order.
 * NEVER throws: on any problem (no API key, network/parse error, length mismatch)
 * it logs a warning and returns the original input strings.
 */
export async function translateFields(texts: string[]): Promise<string[]> {
  if (!texts.length) return [];
  if (!openai) {
    console.warn('[translate] OPENAI_API_KEY not configured — skipping auto-translation.');
    return texts;
  }
  try {
    const res = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EGYPTIAN_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ items: texts }) },
      ],
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    const items = parsed.items;
    if (Array.isArray(items) && items.length === texts.length) {
      return items.map((v, i) => (typeof v === 'string' && v.trim() ? v : texts[i]));
    }
    console.warn('[translate] Unexpected response shape — keeping original strings.');
  } catch (err) {
    console.warn('[translate] Translation failed — keeping original strings:', (err as Error).message);
  }
  return texts;
}

/** One translatable field: English source column -> Arabic target column. */
export interface TranslatableField {
  /** English source column name. */
  src: string;
  /** Arabic target column name (the *Ar field). */
  ar: string;
  /** true when the value is a JSON-stringified string[] (translate each element). */
  json?: boolean;
}

/**
 * Which English field maps to which *Ar field, keyed by the Prisma model name
 * as used in admin.ts (crud(..., name)).
 */
export const FIELD_MAP: Record<string, TranslatableField[]> = {
  Coach: [
    { src: 'name', ar: 'nameAr' },
    { src: 'headline', ar: 'headlineAr' },
    { src: 'bio', ar: 'bioAr' },
  ],
  Program: [
    { src: 'title', ar: 'titleAr' },
    { src: 'description', ar: 'descriptionAr' },
  ],
  Lesson: [
    { src: 'title', ar: 'titleAr' },
    { src: 'description', ar: 'descriptionAr' },
  ],
  MuscleGroup: [{ src: 'name', ar: 'nameAr' }],
  Exercise: [
    { src: 'name', ar: 'nameAr' },
    { src: 'description', ar: 'descriptionAr' },
    { src: 'instructions', ar: 'instructionsAr', json: true },
  ],
  Category: [{ src: 'title', ar: 'titleAr' }],
  Article: [
    { src: 'title', ar: 'titleAr' },
    { src: 'excerpt', ar: 'excerptAr' },
    { src: 'body', ar: 'bodyAr' },
  ],
  Recipe: [
    { src: 'title', ar: 'titleAr' },
    { src: 'about', ar: 'aboutAr' },
    { src: 'ingredients', ar: 'ingredientsAr', json: true },
    { src: 'steps', ar: 'stepsAr', json: true },
  ],
  Banner: [
    { src: 'title', ar: 'titleAr' },
    { src: 'subtitle', ar: 'subtitleAr' },
  ],
  FeaturedItem: [
    { src: 'title', ar: 'titleAr' },
    { src: 'description', ar: 'descriptionAr' },
  ],
  MembershipPlan: [
    { src: 'name', ar: 'nameAr' },
    { src: 'features', ar: 'featuresAr', json: true },
  ],
  Badge: [
    { src: 'title', ar: 'titleAr' },
    { src: 'description', ar: 'descriptionAr' },
  ],
  Challenge: [
    { src: 'title', ar: 'titleAr' },
    { src: 'description', ar: 'descriptionAr' },
  ],
};

/** Returns the translatable field mapping for a given Prisma model name. */
export function fieldsFor(model: string): TranslatableField[] {
  return FIELD_MAP[model] ?? [];
}

function safeParseArray(text: unknown): string[] {
  if (typeof text !== 'string' || !text.trim()) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

/**
 * Given a Prisma model name and a freshly written record, build a data patch that
 * fills any empty *Ar fields with Egyptian-Arabic translations of their English
 * source. Returns null when there is nothing to translate. NEVER throws.
 *
 * Only fills *Ar fields that are currently empty (idempotent). Handles JSON-array
 * fields by translating each element and re-stringifying.
 */
export async function buildTranslationPatch(
  model: string,
  record: Record<string, any>,
): Promise<Record<string, string> | null> {
  const fields = fieldsFor(model);
  if (!fields.length) return null;

  // Collect every string that needs translating, remembering where it goes.
  const texts: string[] = [];
  const slots: { field: TranslatableField; count: number; start: number }[] = [];

  for (const f of fields) {
    const existingAr = record[f.ar];
    const hasAr = f.json
      ? safeParseArray(existingAr).length > 0
      : typeof existingAr === 'string' && existingAr.trim().length > 0;
    if (hasAr) continue; // already translated — leave it (idempotent)

    if (f.json) {
      const items = safeParseArray(record[f.src]);
      if (!items.length) continue;
      slots.push({ field: f, count: items.length, start: texts.length });
      texts.push(...items);
    } else {
      const src = record[f.src];
      if (typeof src !== 'string' || !src.trim()) continue;
      slots.push({ field: f, count: 1, start: texts.length });
      texts.push(src);
    }
  }

  if (!texts.length) return null;

  const translated = await translateFields(texts);

  const patch: Record<string, string> = {};
  for (const s of slots) {
    const chunk = translated.slice(s.start, s.start + s.count);
    patch[s.field.ar] = s.field.json ? JSON.stringify(chunk) : chunk[0];
  }
  return Object.keys(patch).length ? patch : null;
}
