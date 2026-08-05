import { prisma } from './prisma';
import { pickVideo } from './genderMedia';

/**
 * Enrich free-text exercises with what the library knows.
 *
 * Coach-built workouts store their exercises as plain JSON — `{name, sets, reps}` —
 * with no link to the Exercise table. That is fine for authoring (a coach should not
 * have to pick from a dropdown), but it meant a coach's session showed a generic
 * animation, no form demo, and none of the injury flags a muscle-group session gets.
 * A user with a bad knee was warned about Bulgarian split squats everywhere except
 * inside their coach's workout.
 *
 * So we match by name at serve time and attach the demo, the cautions and the safer
 * swap. Anything that doesn't match is passed through untouched — a coach inventing
 * "Nordic curl into a wall sit" still shows exactly what they typed.
 */

const norm = (s: string) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Tokens that carry no identity — matching on these alone would be noise. */
const STOP = new Set(['the', 'a', 'with', 'and', 'to', 'of', 'for', 'on', 'in', 'up', 'down']);
const tokens = (s: string) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

/**
 * Best library match for a free-text name.
 * Exact first, then containment ("Bench Press" -> "Barbell Bench Press"), then token
 * overlap. The overlap floor is deliberately high: attaching the wrong demo is worse
 * than attaching none, because the wrong demo teaches the wrong movement.
 */
function bestMatch<T extends { name: string }>(input: string, library: T[]): T | null {
  const n = norm(input);
  if (!n) return null;

  const exact = library.find((e) => norm(e.name) === n);
  if (exact) return exact;

  const contained = library
    .filter((e) => norm(e.name).includes(n) || n.includes(norm(e.name)))
    .sort((a, b) => Math.abs(norm(a.name).length - n.length) - Math.abs(norm(b.name).length - n.length))[0];
  if (contained) return contained;

  const inTokens = tokens(input);
  if (inTokens.length === 0) return null;

  // Weight each word by how rare it is across the library. Counting words equally
  // matched "Dumbbell Bench Press" to "Dumbbell Overhead Press" — they share
  // "dumbbell" and "press", which say almost nothing, while the words that actually
  // identify the lift ("bench" vs "overhead") were worth the same as the filler.
  const freq = new Map<string, number>();
  for (const e of library) for (const t of new Set(tokens(e.name))) freq.set(t, (freq.get(t) ?? 0) + 1);
  const weight = (t: string) => 1 / (1 + (freq.get(t) ?? 0));

  const inWeight = inTokens.reduce((sum, t) => sum + weight(t), 0);
  if (inWeight === 0) return null;

  let best: { e: T; score: number } | null = null;
  for (const e of library) {
    const libTokens = tokens(e.name);
    if (libTokens.length === 0) continue;
    const shared = inTokens.filter((t) => libTokens.includes(t));
    const sharedWeight = shared.reduce((sum, t) => sum + weight(t), 0);
    const libWeight = libTokens.reduce((sum, t) => sum + weight(t), 0);
    // Both directions must agree, so a short library name can't win by being a
    // subset of a longer typed one.
    const score = Math.min(sharedWeight / inWeight, sharedWeight / libWeight);
    if (!best || score > best.score) best = { e, score };
  }
  return best && best.score >= 0.6 ? best.e : null;
}

const parseJson = (v: string | null): string[] => {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};

/**
 * Attach demo video, contraindications and the safer swap to each entry.
 * `gender` picks the woman-led demo where one exists; `limitations` is what the
 * user's assessment said hurts, so the flags shown are only ever theirs.
 */
export async function enrichExercises(
  entries: any[],
  gender: string | null,
  limitations: string[],
): Promise<any[]> {
  if (!Array.isArray(entries) || entries.length === 0) return entries ?? [];

  const library = await prisma.exercise.findMany({
    select: {
      name: true, videoId: true, videoUrl: true, videoUrlFemale: true,
      contraindications: true, saferAlternative: true, level: true,
    },
  });

  return entries.map((raw) => {
    const entry = raw && typeof raw === 'object' ? raw : { name: String(raw ?? '') };
    const match = bestMatch(entry.name ?? '', library);
    if (!match) return entry;

    // Same gender-aware selection the muscle-group route uses, and the unused
    // variant is dropped rather than shipped to the browser.
    const picked = pickVideo(match, gender);
    const areas = parseJson(match.contraindications);
    const flaggedFor = areas.filter((a) => limitations.includes(a));

    return {
      ...entry,
      videoId: entry.videoId ?? picked.videoId ?? null,
      videoUrl: entry.videoUrl ?? picked.videoUrl ?? null,
      contraindications: areas,
      flaggedFor,
      caution: flaggedFor.length > 0,
      saferAlternative: match.saferAlternative ?? null,
      matchedExercise: match.name,
    };
  });
}

/** Body areas the user's latest assessment said to work around. */
export async function userLimitations(userId?: string): Promise<string[]> {
  if (!userId) return [];
  const a = await prisma.assessment
    .findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { limitations: true } })
    .catch(() => null);
  return parseJson(a?.limitations ?? null);
}
