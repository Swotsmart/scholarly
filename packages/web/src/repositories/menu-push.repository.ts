/**
 * Prisma-based Menu Push Repository
 *
 * Manages MenuPushRecord entries — institutional pushes that force
 * specific tasks into a role's menu. Used by the push-expiry cron
 * and the admin push UI.
 */

import { prisma } from '@scholarly/database';

export interface PushRecord {
  id: string;
  tenantId: string;
  taskRef: string;
  targetRole: string;
  reason: string;
  pushType: string;
  pushedBy: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePushData {
  tenantId: string;
  taskRef: string;
  targetRole: string;
  reason: string;
  pushType?: string;
  pushedBy: string;
  expiresAt?: Date | null;
}

export class PrismaMenuPushRepository {
  async getActivePushes(
    tenantId: string,
    role: string,
  ): Promise<PushRecord[]> {
    return prisma.menuPushRecord.findMany({
      where: {
        tenantId,
        targetRole: role,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPush(data: CreatePushData): Promise<PushRecord> {
    return prisma.menuPushRecord.create({
      data: {
        tenantId: data.tenantId,
        taskRef: data.taskRef,
        targetRole: data.targetRole,
        reason: data.reason,
        pushType: data.pushType ?? 'INSTITUTIONAL',
        pushedBy: data.pushedBy,
        expiresAt: data.expiresAt ?? null,
      },
    });
  }

  async revokePush(id: string, revokedBy: string): Promise<PushRecord> {
    return prisma.menuPushRecord.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        revokedBy,
      },
    });
  }

  async getExpiredPushes(): Promise<PushRecord[]> {
    return prisma.menuPushRecord.findMany({
      where: {
        revokedAt: null,
        expiresAt: { not: null, lte: new Date() },
      },
    });
  }

  async markExpired(ids: string[]): Promise<number> {
    const result = await prisma.menuPushRecord.updateMany({
      where: { id: { in: ids } },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}
