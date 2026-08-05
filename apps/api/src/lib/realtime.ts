import { Server } from 'socket.io';
import type http from 'http';
import { verifyAccessToken } from './auth';
import { prisma } from './prisma';

let io: Server | null = null;
const online = new Map<string, number>(); // userId -> socket count
const groupMembers = new Map<string, Set<string>>(); // groupId -> userIds currently in the live room

function addGroupMember(id: string, userId: string) {
  if (!groupMembers.has(id)) groupMembers.set(id, new Set());
  groupMembers.get(id)!.add(userId);
}
function removeGroupMember(id: string, userId: string) {
  const s = groupMembers.get(id);
  if (!s) return;
  s.delete(userId);
  if (s.size === 0) groupMembers.delete(id);
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
          ? { id: p.id, action: 'start', durationSec: Math.min(Math.max(Number(p.durationSec) || 60, 10), 3600), startedAt: Date.now(), by: userId }
          : { id: p.id, action: 'stop', by: userId };
      io?.to(`group:${p.id}`).emit('group:timer', payload);
    });
    // Live emoji reactions — pure relay, bursts on every member's screen.
    socket.on('group:react', (p: { id: string; emoji: string }) => {
      if (!p || typeof p.id !== 'string' || typeof p.emoji !== 'string') return;
      io?.to(`group:${p.id}`).emit('group:react', { id: p.id, emoji: p.emoji.slice(0, 8), by: userId });
    });

    socket.on('disconnect', () => {
      for (const [gid, members] of groupMembers) {
        if (members.delete(userId)) io?.to(`group:${gid}`).emit('group:members', { id: gid, members: [...members] });
        if (members.size === 0) groupMembers.delete(gid);
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
