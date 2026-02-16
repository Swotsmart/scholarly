/**
 * Prisma-based Menu State Repository
 *
 * Manages UserMenuState records — the persisted server-side menu
 * for each user+tenant+role combination. Used by the sync API
 * route to read/write menu state during session start.
 */

import { prisma } from '@scholarly/database';

export interface MenuStateRecord {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  items: unknown; // JSON — Array of ComposingMenuItem
  version: number;
  lastSyncAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaMenuStateRepository {
  async getMenuState(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<MenuStateRecord | null> {
    return prisma.userMenuState.findUnique({
      where: { userId_tenantId_role: { userId, tenantId, role } },
    });
  }

  async saveMenuState(
    userId: string,
    tenantId: string,
    role: string,
    items: unknown,
    version: number,
  ): Promise<MenuStateRecord> {
    return prisma.userMenuState.upsert({
      where: { userId_tenantId_role: { userId, tenantId, role } },
      create: {
        userId,
        tenantId,
        role,
        items: items as any,
        version,
        lastSyncAt: new Date(),
      },
      update: {
        items: items as any,
        version,
        lastSyncAt: new Date(),
      },
    });
  }

  async getVersion(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<number> {
    const state = await prisma.userMenuState.findUnique({
      where: { userId_tenantId_role: { userId, tenantId, role } },
      select: { version: true },
    });
    return state?.version ?? 0;
  }
}
