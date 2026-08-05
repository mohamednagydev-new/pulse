import { prisma } from './prisma';

/**
 * Gender-aware video selection.
 *
 * Content carries an optional `videoUrlFemale` — the same movement or class taught
 * by a woman. Users who set their gender to female get that version when it exists;
 * everyone else gets `videoUrl`. Nobody is ever left without a video: a missing
 * alternative just falls through to the default.
 *
 * The swap happens on the server so the client never has to know a user's gender to
 * render a lesson, and `videoUrlFemale` is stripped from the response afterwards —
 * there is no reason to ship the other variant to the browser.
 */

export type WithVideo = { videoUrl?: string | null; videoUrlFemale?: string | null };

export async function preferredGender(userId?: string): Promise<string | null> {
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { gender: true } }).catch(() => null);
  return u?.gender ?? null;
}

/** Apply the choice to one record, dropping the unused variant. */
export function pickVideo<T extends WithVideo>(row: T, gender: string | null): Omit<T, 'videoUrlFemale'> {
  const { videoUrlFemale, ...rest } = row;
  const useFemale = gender === 'female' && !!videoUrlFemale;
  return { ...rest, videoUrl: useFemale ? videoUrlFemale! : rest.videoUrl ?? null } as Omit<T, 'videoUrlFemale'>;
}

export function pickVideos<T extends WithVideo>(rows: T[], gender: string | null): Omit<T, 'videoUrlFemale'>[] {
  return rows.map((r) => pickVideo(r, gender));
}
