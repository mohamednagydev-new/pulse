import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { env } from '../env';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { emitToThread, emitToUser, isOnline } from '../lib/realtime';
import { areConnected } from '../lib/social';
import { signMedia } from '../lib/mediaSign';
import { pushToUser, notifyUser } from './push';

export const chatRouter = Router();
chatRouter.use(requireAuth);

const userSelect = { id: true, firstName: true, lastName: true, avatarUrl: true, level: true } as const;

/** Voice notes are private — attach a signed, expiring URL instead of the raw path. */
function shapeMessage<T extends { audio?: string | null }>(m: T) {
  if (!m.audio) return { ...m, audioUrl: null };
  const { exp, sig } = signMedia('voice', m.audio);
  return { ...m, audioUrl: `/media/voice/${m.audio}?exp=${exp}&sig=${sig}` };
}

async function getOrCreateThread(a: string, b: string) {
  const [userAId, userBId] = [a, b].sort();
  return prisma.dMThread.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });
}

async function otherUser(thread: { userAId: string; userBId: string }, me: string) {
  const otherId = thread.userAId === me ? thread.userBId : thread.userAId;
  return prisma.user.findUnique({ where: { id: otherId }, select: userSelect });
}

// ---- List my threads ----
chatRouter.get('/threads', async (req: AuthedRequest, res) => {
  const threads = await prisma.dMThread.findMany({
    where: { OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
    orderBy: { lastMessageAt: 'desc' },
  });
  const result = await Promise.all(
    threads.map(async (t) => {
      const [other, last, unread] = await Promise.all([
        otherUser(t, req.userId!),
        prisma.dMMessage.findFirst({ where: { threadId: t.id }, orderBy: { createdAt: 'desc' } }),
        prisma.dMMessage.count({ where: { threadId: t.id, senderId: { not: req.userId! }, readAt: null } }),
      ]);
      return { id: t.id, other, lastMessage: last ? (last.audio ? '🎤' : last.text) : null, lastMessageAt: t.lastMessageAt, unread };
    }),
  );
  res.json(result);
});

// ---- Total unread (for nav badge) ----
chatRouter.get('/unread', async (req: AuthedRequest, res) => {
  const threads = await prisma.dMThread.findMany({
    where: { OR: [{ userAId: req.userId! }, { userBId: req.userId! }] },
    select: { id: true },
  });
  const unread = await prisma.dMMessage.count({
    where: { threadId: { in: threads.map((t) => t.id) }, senderId: { not: req.userId! }, readAt: null },
  });
  res.json({ unread });
});

// ---- Open/create a thread with a user ----
chatRouter.post('/threads', async (req: AuthedRequest, res) => {
  const parsed = z.object({ userId: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  if (!(await areConnected(req.userId!, parsed.data.userId))) {
    return res.status(403).json({ error: 'Connect with this person to chat' });
  }
  const { isBlockedEither } = await import('./social');
  if (await isBlockedEither(req.userId!, parsed.data.userId)) {
    return res.status(403).json({ error: 'This conversation is unavailable' });
  }
  const thread = await getOrCreateThread(req.userId!, parsed.data.userId);
  const other = await otherUser(thread, req.userId!);
  res.json({ id: thread.id, other });
});

// ---- Messages in a thread (marks incoming as read) ----
chatRouter.get('/threads/:id/messages', async (req: AuthedRequest, res) => {
  const thread = await prisma.dMThread.findUnique({ where: { id: req.params.id } });
  if (!thread || (thread.userAId !== req.userId && thread.userBId !== req.userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  await prisma.dMMessage.updateMany({
    where: { threadId: thread.id, senderId: { not: req.userId! }, readAt: null },
    data: { readAt: new Date() },
  });
  const messages = await prisma.dMMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: 'asc' }, take: 200 });
  const other = await otherUser(thread, req.userId!);
  res.json({ other, messages: messages.map(shapeMessage) });
});

// ---- Report a conversation (opens its content to admin review) ----
chatRouter.post('/threads/:id/report', async (req: AuthedRequest, res) => {
  const thread = await prisma.dMThread.findUnique({ where: { id: req.params.id } });
  if (!thread || (thread.userAId !== req.userId && thread.userBId !== req.userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 300) : null;
  await prisma.chatReport.create({ data: { threadId: thread.id, reporterId: req.userId!, reason } });
  const reporter = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true, lastName: true } });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  for (const a of admins) {
    notifyUser(a.id, {
      title: 'Chat reported 🚩',
      titleAr: 'محادثة اتبلغ عنها 🚩',
      body: `${reporter?.firstName ?? 'A user'} reported a conversation — review it in Moderation.`,
      bodyAr: `${reporter?.firstName ?? 'مستخدم'} بلّغ عن محادثة — راجعها من صفحة الإشراف.`,
      url: '/admin/moderation',
      type: 'general',
    }).catch(() => {});
  }
  res.status(201).json({ ok: true });
});

// ---- Upload a voice note (returns the path to send with the message) ----
const voiceDir = path.join(env.UPLOAD_DIR, 'audio', 'dm');
fs.mkdirSync(voiceDir, { recursive: true });
const voiceUpload = multer({ dest: voiceDir, limits: { fileSize: 15 * 1024 * 1024 } });
const VOICE_EXT: Record<string, string> = {
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/aac': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
};

chatRouter.post('/voice', voiceUpload.single('file'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  // MediaRecorder mimetypes carry codec suffixes ("audio/webm;codecs=opus").
  const base = (req.file.mimetype || '').split(';')[0].trim();
  const ext = VOICE_EXT[base];
  if (!ext) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Unsupported audio format' });
  }
  const name = `${req.file.filename}${ext}`;
  fs.renameSync(req.file.path, path.join(voiceDir, name));
  res.json({ audio: `dm/${name}` });
});

// ---- Send a message (text and/or voice note) ----
chatRouter.post('/threads/:id/messages', async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      text: z.string().max(2000).optional(),
      // Path shape from our own /voice endpoint only — never a free string that
      // could point the signed media URL at an arbitrary file.
      audio: z.string().regex(/^dm\/[A-Za-z0-9_-]+\.(webm|m4a|mp3|ogg|wav)$/).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success || (!parsed.data.text?.trim() && !parsed.data.audio)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const thread = await prisma.dMThread.findUnique({ where: { id: req.params.id } });
  if (!thread || (thread.userAId !== req.userId && thread.userBId !== req.userId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const otherIdForGate = thread.userAId === req.userId ? thread.userBId : thread.userAId;
  if (!(await areConnected(req.userId!, otherIdForGate))) {
    return res.status(403).json({ error: 'Connect with this person to chat' });
  }
  const { isBlockedEither } = await import('./social');
  if (await isBlockedEither(req.userId!, otherIdForGate)) {
    return res.status(403).json({ error: 'This conversation is unavailable' });
  }
  if (parsed.data.audio && !fs.existsSync(path.join(voiceDir, path.basename(parsed.data.audio)))) {
    return res.status(400).json({ error: 'Invalid audio' });
  }
  const message = await prisma.dMMessage.create({
    data: { threadId: thread.id, senderId: req.userId!, text: parsed.data.text?.trim() || null, audio: parsed.data.audio ?? null },
  });
  await prisma.dMThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });

  const shaped = shapeMessage(message);
  emitToThread(thread.id, 'dm:new', shaped);
  const otherId = thread.userAId === req.userId ? thread.userBId : thread.userAId;
  emitToUser(otherId, 'dm:inbox', { threadId: thread.id, text: message.audio ? '🎤' : message.text });

  // App closed/backgrounded → web push (no in-app row; the chat badge covers
  // that). Online recipients get the socket events above instead of a buzz.
  if (!isOnline(otherId)) {
    const sender = await prisma.user.findUnique({ where: { id: req.userId! }, select: { firstName: true } });
    const preview = message.audio ? '🎤 Voice note' : (message.text ?? '').slice(0, 90);
    pushToUser(otherId, {
      title: sender?.firstName ?? 'New message',
      body: preview,
      bodyAr: message.audio ? '🎤 رسالة صوتية' : undefined,
      url: `/chat/${thread.id}`,
    }).catch(() => {});
  }

  res.status(201).json(shaped);
});
