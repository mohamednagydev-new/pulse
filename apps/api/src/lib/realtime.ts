import { Server } from 'socket.io';
import type http from 'http';
import { verifyAccessToken } from './auth';
import { prisma } from './prisma';
import { signMedia } from './mediaSign';

let io: Server | null = null;
const online = new Map<string, number>(); // userId -> socket count
const groupMembers = new Map<string, Set<string>>(); // groupId -> userIds currently in the live room
// Live room state so LATE JOINERS land mid-class, not in a blank room: the
// running timer and the video transport survive until the room empties.
type GroupTimer = { id: string; action: 'start'; durationSec: number; startedAt: number; by: string };
type GroupVideo = { id: string; action: 'play' | 'pause'; positionSec: number; at: number; by: string };
const groupState = new Map<string, { hostId: string; timer?: GroupTimer; video?: GroupVideo }>();

async function groupHost(id: string): Promise<string | null> {
  const cached = groupState.get(id);
  if (cached) return cached.hostId;
  const s = await prisma.groupSession.findUnique({ where: { id }, select: { coachUserId: true } }).catch(() => null);
  if (!s) return null;
  groupState.set(id, { hostId: s.coachUserId });
  return s.coachUserId;
}

function addGroupMember(id: string, userId: string) {
  if (!groupMembers.has(id)) groupMembers.set(id, new Set());
  groupMembers.get(id)!.add(userId);
}
function removeGroupMember(id: string, userId: string) {
  const s = groupMembers.get(id);
  if (!s) return;
  s.delete(userId);
  if (s.size === 0) {
    groupMembers.delete(id);
    groupState.delete(id); // empty room: drop the timer/video state too
  }
}

export function initRealtime(server: http.Server, origin: string) {
  io = new Server(server, { cors: { origin, credentials: true } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string;
      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId as string;
    socket.join(`user:${userId}`);
    online.set(userId, (online.get(userId) ?? 0) + 1);
    io?.emit('presence', { online: online.size });

    // Room joins are authorized: without these checks any authenticated socket
    // could join any DM/challenge room by id and eavesdrop on its live messages.
    socket.on('dm:open', async (threadId: string) => {
      if (typeof threadId !== 'string' || !threadId) return;
      const thread = await prisma.dMThread
        .findFirst({ where: { id: threadId, OR: [{ userAId: userId }, { userBId: userId }] }, select: { id: true } })
        .catch(() => null);
      if (thread) socket.join(`dm:${threadId}`);
    });
    socket.on('dm:close', (threadId: string) => socket.leave(`dm:${threadId}`));
    socket.on('challenge:open', async (id: string) => {
      if (typeof id !== 'string' || !id) return;
      // Same visibility rule as the HTTP routes: global rooms are open to any
      // signed-in user; personal/group rooms only to owner and participants.
      const challenge = await prisma.challenge
        .findUnique({ where: { id }, select: { kind: true, ownerId: true } })
        .catch(() => null);
      if (!challenge) return;
      if (challenge.kind !== 'global' && challenge.ownerId !== userId) {
        const member = await prisma.challengeParticipant
          .findUnique({ where: { challengeId_userId: { challengeId: id, userId } }, select: { id: true } })
          .catch(() => null);
        if (!member) return;
      }
      socket.join(`challenge:${id}`);
    });
    socket.on('challenge:close', (id: string) => socket.leave(`challenge:${id}`));

    // ---- Live group-training rooms: presence + shared timer + reactions ----
    socket.on('group:open', async (id: string) => {
      if (typeof id !== 'string' || !id) return;
      const session = await prisma.groupSession.findUnique({ where: { id }, select: { id: true } }).catch(() => null);
      if (!session) return;
      socket.join(`group:${id}`);
      addGroupMember(id, userId);
      io?.to(`group:${id}`).emit('group:members', { id, members: [...(groupMembers.get(id) ?? [])] });
      // Replay live state to the joiner only — everyone else already has it.
      const st = groupState.get(id);
      if (st?.timer) socket.emit('group:timer', st.timer);
      if (st?.video) socket.emit('group:video', st.video);
    });
    socket.on('group:close', (id: string) => {
      if (typeof id !== 'string' || !id) return;
      socket.leave(`group:${id}`);
      removeGroupMember(id, userId);
      io?.to(`group:${id}`).emit('group:members', { id, members: [...(groupMembers.get(id) ?? [])] });
    });
    // Shared timer — clients sync off startedAt so late joiners see the same countdown.
    socket.on('group:timer', (p: { id: string; action: 'start' | 'stop'; durationSec?: number }) => {
      if (!p || typeof p.id !== 'string') return;
      const payload =
        p.action === 'start'
          ? { id: p.id, action: 'start' as const, durationSec: Math.min(Math.max(Number(p.durationSec) || 60, 10), 3600), startedAt: Date.now(), by: userId }
          : { id: p.id, action: 'stop', by: userId };
      const st = groupState.get(p.id);
      if (st) st.timer = p.action === 'start' ? (payload as GroupTimer) : undefined;
      io?.to(`group:${p.id}`).emit('group:timer', payload);
    });
    // Host-synced video transport: the coach's play/pause/seek drives every
    // member's player. Host-only — a participant scrubbing would scrub the class.
    socket.on('group:video', async (p: { id: string; action: 'play' | 'pause'; positionSec?: number }) => {
      if (!p || typeof p.id !== 'string' || (p.action !== 'play' && p.action !== 'pause')) return;
      if ((await groupHost(p.id)) !== userId) return;
      const payload: GroupVideo = {
        id: p.id,
        action: p.action,
        positionSec: Math.max(0, Number(p.positionSec) || 0),
        at: Date.now(),
        by: userId,
      };
      const st = groupState.get(p.id);
      if (st) st.video = payload;
      io?.to(`group:${p.id}`).emit('group:video', payload);
    });
    // Room text chat: live relay, members only, nothing persisted — class talk
    // («جاهزين؟», «تقيل عليا 😅») belongs to the moment, like speech in a gym.
    socket.on('group:chat', (p: { id: string; text: string }) => {
      if (!p || typeof p.id !== 'string' || typeof p.text !== 'string') return;
      const text = p.text.trim().slice(0, 300);
      if (!text) return;
      if (!groupMembers.get(p.id)?.has(userId)) return;
      io?.to(`group:${p.id}`).emit('group:chat', { id: p.id, text, by: userId, at: Date.now() });
    });
    // Voice notes: relay of an already-uploaded voice path (same store as DM
    // voice notes). Signed here so every member gets a playable URL — the coach
    // cues the room («آخر ١٠ ثواني!») without live-audio infrastructure.
    socket.on('group:note', (p: { id: string; audio: string }) => {
      if (!p || typeof p.id !== 'string' || typeof p.audio !== 'string' || !/^dm\/[\w.-]+$/.test(p.audio)) return;
      if (!groupMembers.get(p.id)?.has(userId)) return;
      const { exp, sig } = signMedia('voice', p.audio);
      io?.to(`group:${p.id}`).emit('group:note', {
        id: p.id,
        audio: `/media/voice/${p.audio}?exp=${exp}&sig=${sig}`,
        by: userId,
        at: Date.now(),
      });
    });
    // Live emoji reactions — pure relay, bursts on every member's screen.
    socket.on('group:react', (p: { id: string; emoji: string }) => {
      if (!p || typeof p.id !== 'string' || typeof p.emoji !== 'string') return;
      io?.to(`group:${p.id}`).emit('group:react', { id: p.id, emoji: p.emoji.slice(0, 8), by: userId });
    });

    socket.on('disconnect', () => {
      for (const [gid, members] of groupMembers) {
        if (members.delete(userId)) io?.to(`group:${gid}`).emit('group:members', { id: gid, members: [...members] });
        if (members.size === 0) {
          groupMembers.delete(gid);
          groupState.delete(gid);
        }
      }
      const n = (online.get(userId) ?? 1) - 1;
      if (n <= 0) online.delete(userId);
      else online.set(userId, n);
      io?.emit('presence', { online: online.size });
    });
  });
}

export function onlineCount() {
  return online.size;
}
export function isOnline(userId: string) {
  return online.has(userId);
}
/** Everyone with a live socket right now — for the admin presence panel. */
export function onlineIds(): string[] {
  return Array.from(online.keys());
}

export function emitToChallenge(id: string, event: string, data: unknown) {
  io?.to(`challenge:${id}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToThread(threadId: string, event: string, data: unknown) {
  io?.to(`dm:${threadId}`).emit(event, data);
}

/** Emit a feed event to the author and all their followers. */
export async function emitFeed(userId: string, event: string, data: unknown) {
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
  });
  const ids = new Set([userId, ...followers.map((f) => f.followerId)]);
  ids.forEach((id) => io?.to(`user:${id}`).emit(event, data));
}
