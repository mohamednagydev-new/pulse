import { prisma } from './prisma';

/** Anti-cheat signal: a pace guard tripped or an anomaly was detected.
 *  Fire-and-forget — recording must never affect the user-facing response. */
export function flagIntegrity(userId: string, kind: string, detail?: string): void {
  void prisma.integrityEvent.create({ data: { userId, kind, detail } }).catch(() => {});
}
