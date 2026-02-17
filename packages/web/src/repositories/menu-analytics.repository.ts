/**
 * Prisma-based Menu Analytics Repository
 *
 * Records usage events and daily aggregates for the self-composing
 * menu analytics dashboard. Used by the menu-analytics cron and
 * the analytics dashboard component.
 */

import { prisma } from '@scholarly/database';

export interface UsageEventRecord {
  id: string;
  userId: string;
  tenantId: string;
  taskRef: string;
  eventType: string;
  timestamp: Date;
}

export interface DailyAggregateRecord {
  id: string;
  tenantId: string;
  date: Date;
  totalEvents: number;
  promotions: number;
  decays: number;
  seedsAccepted: number;
  seedsDismissed: number;
  pushesCreated: number;
  pushesExpired: number;
  avgMenuSize: number;
  topItems: unknown; // JSON
  createdAt: Date;
}

export interface RecordEventData {
  userId: string;
  tenantId: string;
  taskRef: string;
  eventType: string;
}

export interface SaveDailyAggregateData {
  tenantId: string;
  date: Date;
  totalEvents: number;
  promotions: number;
  decays: number;
  seedsAccepted: number;
  seedsDismissed: number;
  pushesCreated: number;
  pushesExpired: number;
  avgMenuSize: number;
  topItems: unknown;
}

export class PrismaMenuAnalyticsRepository {
  async recordEvent(data: RecordEventData): Promise<UsageEventRecord> {
    return prisma.menuUsageEvent.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        taskRef: data.taskRef,
        eventType: data.eventType,
      },
    });
  }

  async getEventsSince(
    tenantId: string,
    since: Date,
  ): Promise<UsageEventRecord[]> {
    return prisma.menuUsageEvent.findMany({
      where: {
        tenantId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async saveDailyAggregate(
    data: SaveDailyAggregateData,
  ): Promise<DailyAggregateRecord> {
    return prisma.menuAnalyticsDaily.upsert({
      where: { tenantId_date: { tenantId: data.tenantId, date: data.date } },
      create: {
        tenantId: data.tenantId,
        date: data.date,
        totalEvents: data.totalEvents,
        promotions: data.promotions,
        decays: data.decays,
        seedsAccepted: data.seedsAccepted,
        seedsDismissed: data.seedsDismissed,
        pushesCreated: data.pushesCreated,
        pushesExpired: data.pushesExpired,
        avgMenuSize: data.avgMenuSize,
        topItems: data.topItems as any,
      },
      update: {
        totalEvents: data.totalEvents,
        promotions: data.promotions,
        decays: data.decays,
        seedsAccepted: data.seedsAccepted,
        seedsDismissed: data.seedsDismissed,
        pushesCreated: data.pushesCreated,
        pushesExpired: data.pushesExpired,
        avgMenuSize: data.avgMenuSize,
        topItems: data.topItems as any,
      },
    });
  }

  async getDailyAggregates(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<DailyAggregateRecord[]> {
    return prisma.menuAnalyticsDaily.findMany({
      where: {
        tenantId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });
  }
}
