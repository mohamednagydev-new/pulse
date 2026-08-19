import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
export const openai = apiKey ? new OpenAI({ apiKey }) : null;

export const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small';

export function aiEnabled() {
  return openai !== null;
}

export async function chatComplete(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { json?: boolean; temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');
  const res = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.6,
    // Hard output cap on EVERY call — no caller can accidentally buy an essay.
    max_tokens: opts.maxTokens ?? 400,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
  });
  return res.choices[0]?.message?.content ?? '';
}

/**
 * Same as chatComplete, but with an image attached to the user turn.
 *
 * The image is passed through as a data URL and never written to disk. A photo of
 * someone's dinner is not content we want to be storing, backing up, or explaining
 * in a data-safety form — and the estimate is the only part worth keeping.
 */
export async function visionComplete(
  system: string,
  prompt: string,
  imageDataUrl: string,
  opts: { json?: boolean; temperature?: number } = {},
): Promise<string> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');
  const res = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: opts.temperature ?? 0.2,
    // 500, not 300: a plate with 3-4 dishes emits a JSON array that a 300-token
    // cap truncated mid-string — the parse then failed as "could not read".
    max_tokens: 500,
    ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          // "auto" detail, not "low": low squeezes every photo to 512px before the
          // model sees it — mixed plates became unrecognizable and users got
          // "no food in this photo" for perfectly clear shots. The cost delta on
          // a 1024px food photo is a fraction of a cent.
          { type: 'image_url', image_url: { url: imageDataUrl, detail: 'auto' } },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content ?? '';
}

export async function embed(text: string): Promise<number[]> {
  if (!openai) throw new Error('OPENAI_API_KEY not configured');
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input: text.slice(0, 8000) });
  return res.data[0].embedding;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
