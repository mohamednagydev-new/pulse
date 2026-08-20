import { prisma } from './prisma';

/** Append-only admin action trail. Fire-and-forget — logging must never break
 *  the action itself, so failures are swallowed. */
export function audit(
  adminId: string,
  action: string,
  opts: { targetType?: string; targetId?: string; detail?: string } = {},
): void {
  void prisma.adminAction
    .create({ data: { adminId, action, targetType: opts.targetType, targetId: opts.targetId, detail: opts.detail } })
    .catch(() => {});
}
